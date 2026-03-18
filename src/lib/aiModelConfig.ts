// AI Model Configuration - Centralized model selection logic
// Implements tiered model usage for cost optimization

import { SubscriptionTier } from "@/hooks/useSubscription";

// ============================================
// MODEL DEFINITIONS
// ============================================

export const AI_MODELS = {
  // Gemini models (Visual/Multimodal)
  GEMINI_PRO: "google/gemini-2.5-pro",           // Highest quality, expensive
  GEMINI_FLASH: "google/gemini-2.5-flash",       // Balanced quality/cost
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite", // Cheapest, fastest
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",   // Latest flash
  
  // OpenAI models (Text/Reasoning) — AI Router assigns these
  GPT5: "openai/gpt-5",                          // Highest quality
  GPT5_2: "openai/gpt-5.2",                      // The Engineer (high-stakes reasoning)
  GPT5_MINI: "openai/gpt-5-mini",                // The Architect's Assistant (structured gen)
  GPT5_NANO: "openai/gpt-5-nano",                // Cheapest
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

// Token limits per model tier
export const TOKEN_LIMITS = {
  lite: { visual: 400, estimation: 500, obc: 600 },
  standard: { visual: 800, estimation: 800, obc: 1000 },
  premium: { visual: 1500, estimation: 1500, obc: 1500 },
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
  runDualEngine: boolean;
  runOBCValidation: boolean;
}

export function selectModels(
  tier: SubscriptionTier,
  taskComplexity: "simple" | "standard" | "complex" = "standard"
): ModelConfig {
  const isPremium = tier === "premium" || tier === "enterprise";
  const isPro = tier === "pro" || isPremium;
  const isFree = !isPro;
  
  // Determine if dual engine should run
  let runDualEngine = false;
  if (isPremium) {
    runDualEngine = true;
  }
  
  // Determine if OBC validation should run
  const runOBCValidation = isPro;
  
  // Select models based on tier and complexity
  let visualModel: string;
  let estimationModel: string;
  let obcModel: string | null = null;
  let tokenTier: keyof typeof TOKEN_LIMITS;
  
  if (isPremium) {
    visualModel = AI_MODELS.GEMINI_FLASH;
    estimationModel = AI_MODELS.GEMINI_FLASH;
    obcModel = runOBCValidation ? AI_MODELS.GPT5_MINI : null;
    tokenTier = "premium";
  } else if (isPro) {
    visualModel = taskComplexity === "complex" 
      ? AI_MODELS.GEMINI_FLASH 
      : AI_MODELS.GEMINI_FLASH_LITE;
    estimationModel = AI_MODELS.GEMINI_FLASH_LITE;
    obcModel = runOBCValidation ? AI_MODELS.GPT5_NANO : null;
    tokenTier = "standard";
  } else {
    visualModel = AI_MODELS.GEMINI_FLASH_LITE;
    estimationModel = AI_MODELS.GEMINI_FLASH_LITE;
    obcModel = null;
    tokenTier = "lite";
  }
  
  return {
    visualModel,
    visualTokens: TOKEN_LIMITS[tokenTier].visual,
    estimationModel,
    estimationTokens: TOKEN_LIMITS[tokenTier].estimation,
    obcModel,
    obcTokens: TOKEN_LIMITS[tokenTier].obc,
    runDualEngine,
    runOBCValidation,
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
  
  // Complex indicators
  const complexIndicators = [
    documentCount > 2,
    imageCount > 3,
    descLower.includes("blueprint"),
    descLower.includes("structural"),
    descLower.includes("renovation"),
    descLower.includes("permit"),
  ].filter(Boolean).length;
  
  // Simple indicators
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
