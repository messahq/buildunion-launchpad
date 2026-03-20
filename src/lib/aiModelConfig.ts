// AI Model Configuration - Centralized model selection logic
// Mirrors server-side tier routing for UI display and client-side decisions

import { SubscriptionTier } from "@/hooks/useSubscription";

// ============================================
// MODEL DEFINITIONS (sync with edge functions)
// ============================================

export const AI_MODELS = {
  // Gemini models (Visual/Multimodal) — cost: low → high
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite", // Free tier default
  GEMINI_FLASH: "google/gemini-2.5-flash",           // Pro tier default
  GEMINI_PRO: "google/gemini-2.5-pro",               // Premium visual
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",   // Fast text/validation

  // OpenAI models (Reasoning) — only Premium tier
  GPT5_2: "openai/gpt-5.2",     // The Engineer (high-stakes reasoning)
  GPT5_MINI: "openai/gpt-5-mini", // The Architect's Assistant
  GPT5_NANO: "openai/gpt-5-nano", // Cheapest OpenAI
} as const;

// AI Router task categories for frontend usage
export type AIRouterTaskType =
  | "gfa_calculation"
  | "obc_interpretation"
  | "financial_modeling"
  | "risk_analysis"
  | "trade_scope"
  | "line_item_generation"
  | "template_categorization"
  | "general";

// Token limits per tier (aligned with server-side edge functions)
export const TOKEN_LIMITS = {
  free:    { visual: 400,  estimation: 400,  obc: 200,  chat: 1024, report: 1500 },
  pro:     { visual: 800,  estimation: 600,  obc: 300,  chat: 2048, report: 3000 },
  premium: { visual: 1500, estimation: 1200, obc: 500,  chat: 4096, report: 4096 },
} as const;

// ============================================
// MODEL SELECTION LOGIC
// ============================================

export interface ModelConfig {
  visualModel: string;
  visualTokens: number;
  estimationModel: string;
  estimationTokens: number;
  obcModel: string | null;
  obcTokens: number;
  chatModel: string;
  chatTokens: number;
  runDualEngine: boolean;
  runOBCValidation: boolean;
}

export function selectModels(
  tier: SubscriptionTier,
  taskComplexity: "simple" | "standard" | "complex" = "standard"
): ModelConfig {
  const isPremium = tier === "premium" || tier === "enterprise";
  const isPro = tier === "pro" || isPremium;

  if (isPremium) {
    return {
      visualModel: AI_MODELS.GEMINI_PRO,
      visualTokens: TOKEN_LIMITS.premium.visual,
      estimationModel: AI_MODELS.GEMINI_FLASH,
      estimationTokens: TOKEN_LIMITS.premium.estimation,
      obcModel: AI_MODELS.GPT5_MINI,
      obcTokens: TOKEN_LIMITS.premium.obc,
      chatModel: AI_MODELS.GEMINI_FLASH,
      chatTokens: TOKEN_LIMITS.premium.chat,
      runDualEngine: true,
      runOBCValidation: true,
    };
  }

  if (isPro) {
    const useFlash = taskComplexity === "complex";
    return {
      visualModel: useFlash ? AI_MODELS.GEMINI_FLASH : AI_MODELS.GEMINI_FLASH_LITE,
      visualTokens: TOKEN_LIMITS.pro.visual,
      estimationModel: AI_MODELS.GEMINI_FLASH_LITE,
      estimationTokens: TOKEN_LIMITS.pro.estimation,
      obcModel: AI_MODELS.GEMINI_3_FLASH,
      obcTokens: TOKEN_LIMITS.pro.obc,
      chatModel: AI_MODELS.GEMINI_FLASH,
      chatTokens: TOKEN_LIMITS.pro.chat,
      runDualEngine: taskComplexity === "complex",
      runOBCValidation: taskComplexity === "complex",
    };
  }

  // Free tier: Flash-Lite only, single engine
  return {
    visualModel: AI_MODELS.GEMINI_FLASH_LITE,
    visualTokens: TOKEN_LIMITS.free.visual,
    estimationModel: AI_MODELS.GEMINI_FLASH_LITE,
    estimationTokens: TOKEN_LIMITS.free.estimation,
    obcModel: null,
    obcTokens: TOKEN_LIMITS.free.obc,
    chatModel: AI_MODELS.GEMINI_FLASH_LITE,
    chatTokens: TOKEN_LIMITS.free.chat,
    runDualEngine: false,
    runOBCValidation: false,
  };
}

// ============================================
// COMPLEXITY DETECTION
// ============================================

export function detectTaskComplexity(
  description: string,
  imageCount: number = 1,
  documentCount: number = 0
): "simple" | "standard" | "complex" {
  const descLower = (description || "").toLowerCase();

  const complexIndicators = [
    documentCount > 2,
    imageCount > 3,
    descLower.includes("blueprint"),
    descLower.includes("structural"),
    descLower.includes("renovation"),
    descLower.includes("permit"),
  ].filter(Boolean).length;

  const simpleIndicators = [
    descLower.includes("paint") || descLower.includes("festés"),
    descLower.includes("simple"),
    descLower.includes("small"),
    imageCount === 1 && documentCount === 0,
  ].filter(Boolean).length;

  if (complexIndicators >= 3) return "complex";
  if (simpleIndicators >= 3) return "simple";
  return "standard";
}

// ============================================
// UI HELPERS — Model display names for badges
// ============================================

export function getModelDisplayName(model: string): string {
  const names: Record<string, string> = {
    [AI_MODELS.GEMINI_FLASH_LITE]: "Gemini Flash-Lite",
    [AI_MODELS.GEMINI_FLASH]: "Gemini Flash",
    [AI_MODELS.GEMINI_PRO]: "Gemini Pro",
    [AI_MODELS.GEMINI_3_FLASH]: "Gemini 3 Flash",
    [AI_MODELS.GPT5_2]: "GPT-5.2 Engineer",
    [AI_MODELS.GPT5_MINI]: "GPT-5 Mini",
    [AI_MODELS.GPT5_NANO]: "GPT-5 Nano",
  };
  return names[model] || model.split("/").pop() || model;
}

export function getTierModelSummary(tier: SubscriptionTier): string {
  if (tier === "premium" || tier === "enterprise") {
    return "Gemini Pro + GPT-5.2 dual-engine";
  }
  if (tier === "pro") {
    return "Gemini Flash (escalates on complex tasks)";
  }
  return "Gemini Flash-Lite (single engine)";
}
