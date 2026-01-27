// AI Model Configuration - Centralized model selection logic
// Implements tiered model usage for cost optimization

import { SubscriptionTier } from "@/hooks/useSubscription";
import { FilterAnswers, AITriggers } from "@/components/projects2/FilterQuestions";

// ============================================
// MODEL DEFINITIONS
// ============================================

export const AI_MODELS = {
  // Gemini models (Visual/Multimodal)
  GEMINI_PRO: "google/gemini-2.5-pro",           // Highest quality, expensive
  GEMINI_FLASH: "google/gemini-2.5-flash",       // Balanced quality/cost
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite", // Cheapest, fastest
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",   // Latest flash
  
  // OpenAI models (Text/Reasoning)
  GPT5: "openai/gpt-5",                          // Highest quality
  GPT5_MINI: "openai/gpt-5-mini",                // Balanced
  GPT5_NANO: "openai/gpt-5-nano",                // Cheapest
} as const;

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
  filterAnswers?: FilterAnswers | null,
  aiTriggers?: AITriggers | null,
  taskComplexity: "simple" | "standard" | "complex" = "standard"
): ModelConfig {
  const isPremium = tier === "premium" || tier === "enterprise";
  const isPro = tier === "pro" || isPremium;
  const isFree = !isPro;
  
  // Determine if work is complex (structural/mechanical)
  const hasComplexWork = 
    filterAnswers?.technicalFilter?.affectsStructure ||
    filterAnswers?.technicalFilter?.affectsMechanical ||
    filterAnswers?.technicalFilter?.affectsFacade;
  
  // Determine if dual engine should run
  // Premium: always available
  // Pro: only if conflicts detected or complex work
  // Free: never
  let runDualEngine = false;
  if (isPremium) {
    runDualEngine = true; // Premium has full control
  } else if (isPro && hasComplexWork) {
    runDualEngine = true; // Pro gets dual engine for complex work
  }
  
  // Determine if OBC validation should run
  // Only for Pro+ with structural/mechanical work
  const runOBCValidation = isPro && (
    aiTriggers?.obcSearch ||
    filterAnswers?.technicalFilter?.affectsStructure ||
    filterAnswers?.technicalFilter?.affectsMechanical
  );
  
  // Select models based on tier and complexity
  let visualModel: string;
  let estimationModel: string;
  let obcModel: string | null = null;
  let tokenTier: keyof typeof TOKEN_LIMITS;
  
  if (isPremium) {
    // Premium: Best models
    visualModel = AI_MODELS.GEMINI_FLASH; // Pro for deep analysis
    estimationModel = AI_MODELS.GEMINI_FLASH;
    obcModel = runOBCValidation ? AI_MODELS.GPT5_MINI : null;
    tokenTier = "premium";
  } else if (isPro) {
    // Pro: Balanced models
    visualModel = taskComplexity === "complex" 
      ? AI_MODELS.GEMINI_FLASH 
      : AI_MODELS.GEMINI_FLASH_LITE;
    estimationModel = AI_MODELS.GEMINI_FLASH_LITE;
    obcModel = runOBCValidation ? AI_MODELS.GPT5_NANO : null;
    tokenTier = "standard";
  } else {
    // Free: Cheapest models, single engine only
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
  filterAnswers?: FilterAnswers | null,
  imageCount: number = 1,
  documentCount: number = 0
): "simple" | "standard" | "complex" {
  const descLower = (description || "").toLowerCase();
  
  // Complex indicators
  const complexIndicators = [
    filterAnswers?.technicalFilter?.affectsStructure,
    filterAnswers?.technicalFilter?.affectsMechanical,
    filterAnswers?.technicalFilter?.affectsFacade,
    documentCount > 2,
    imageCount > 3,
    descLower.includes("blueprint"),
    descLower.includes("structural"),
    descLower.includes("renovation"),
    descLower.includes("permit"),
    filterAnswers?.workflowFilter?.subcontractorCount === "6+",
  ].filter(Boolean).length;
  
  // Simple indicators
  const simpleIndicators = [
    descLower.includes("paint") || descLower.includes("festés"),
    descLower.includes("simple"),
    descLower.includes("small"),
    imageCount === 1 && documentCount === 0,
    !filterAnswers?.technicalFilter?.affectsStructure,
    !filterAnswers?.technicalFilter?.affectsMechanical,
  ].filter(Boolean).length;
  
  if (complexIndicators >= 3) return "complex";
  if (simpleIndicators >= 4) return "simple";
  return "standard";
}

// ============================================
// SHOULD RUN ANALYSIS
// ============================================

export function shouldRunSecondEngine(
  tier: SubscriptionTier,
  firstEngineResult: {
    hasConflicts?: boolean;
    confidence?: "high" | "medium" | "low";
    area?: number | null;
  },
  filterAnswers?: FilterAnswers | null
): boolean {
  const isPremium = tier === "premium" || tier === "enterprise";
  const isPro = tier === "pro" || isPremium;
  
  // Premium always has the option
  if (isPremium) return true;
  
  // Pro: run if conflicts detected or low confidence or complex work
  if (isPro) {
    if (firstEngineResult.hasConflicts) return true;
    if (firstEngineResult.confidence === "low") return true;
    if (filterAnswers?.technicalFilter?.affectsStructure) return true;
    if (filterAnswers?.technicalFilter?.affectsMechanical) return true;
  }
  
  // Free: never run second engine
  return false;
}
