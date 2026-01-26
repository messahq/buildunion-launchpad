import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";
import { toast } from "sonner";

export interface AIAnalysisResult {
  estimate: {
    materials: Array<{
      item: string;
      quantity: number;
      unit: string;
      notes: string;
    }>;
    summary: string;
    recommendations: string[];
    area: number | null;
    areaUnit: string;
    areaConfidence: "high" | "medium" | "low";
    surfaceType: string;
    surfaceCondition: string;
    roomType: string;
    dualEngine?: {
      gemini: {
        role: string;
        model: string;
        findings: Record<string, unknown>;
      };
      gpt: {
        role: string;
        model: string;
        findings: Record<string, unknown>;
      };
    };
    conflicts?: Array<{
      field: string;
      geminiValue: string;
      gptValue: string;
      verified: boolean;
      severity: "high" | "medium" | "low";
    }>;
    verificationStatus?: string;
  };
  processingTime?: number;
  tier?: string;
}

interface AnalyzeProjectParams {
  projectId: string;
  images: File[];
  description: string;
  workType: string | null;
}

// Tier-based analysis depth
const getTierAnalysisConfig = (tier: SubscriptionTier) => {
  switch (tier) {
    case "premium":
    case "enterprise":
      return {
        isPremium: true,
        maxImages: 10,
        analysisDepth: "deep",
        features: ["dual_engine", "conflict_detection", "premium_insights"],
      };
    case "pro":
      return {
        isPremium: true,
        maxImages: 5,
        analysisDepth: "standard",
        features: ["dual_engine", "conflict_detection"],
      };
    default: // free
      return {
        isPremium: false,
        maxImages: 2,
        analysisDepth: "basic",
        features: ["basic_estimate"],
      };
  }
};

export const useProjectAIAnalysis = () => {
  const { session } = useAuth();
  const { subscription } = useSubscription();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeProject = async ({
    projectId,
    images,
    description,
    workType,
  }: AnalyzeProjectParams): Promise<AIAnalysisResult | null> => {
    if (!session?.access_token) {
      toast.error("Please sign in to use AI analysis");
      return null;
    }

    if (images.length === 0) {
      // No images to analyze, skip AI
      return null;
    }

    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setCurrentStep("Preparing images...");

    const tierConfig = getTierAnalysisConfig(subscription.tier);
    const startTime = Date.now();

    try {
      // Limit images based on tier
      const imagesToAnalyze = images.slice(0, tierConfig.maxImages);
      
      if (images.length > tierConfig.maxImages) {
        toast.info(`Analyzing first ${tierConfig.maxImages} images (${subscription.tier} tier limit)`);
      }

      setProgress(10);
      setCurrentStep("Converting images...");

      // Convert first image to base64 for AI analysis
      const firstImage = imagesToAnalyze[0];
      const base64Image = await fileToBase64(firstImage);

      setProgress(30);
      setCurrentStep(tierConfig.isPremium ? "Running deep AI analysis..." : "Running AI analysis...");

      // Build description with work type context
      const enhancedDescription = workType 
        ? `${workType} project: ${description || "No additional details"}`
        : description || "";

      // Call the quick-estimate edge function
      const { data, error: fnError } = await supabase.functions.invoke("quick-estimate", {
        body: {
          image: base64Image,
          description: enhancedDescription,
          isPremium: tierConfig.isPremium,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "AI analysis failed");
      }

      setProgress(80);
      setCurrentStep("Saving results...");

      const analysisResult: AIAnalysisResult = {
        estimate: data.estimate,
        processingTime: Date.now() - startTime,
        tier: subscription.tier,
      };

      // Save to project_summaries
      const photoEstimateData = {
        ...data.estimate,
        analyzedAt: new Date().toISOString(),
        tier: subscription.tier,
        imageCount: imagesToAnalyze.length,
      };

      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({
          photo_estimate: photoEstimateData,
          status: "analyzed",
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (updateError) {
        console.error("Error saving analysis:", updateError);
      }

      setProgress(100);
      setCurrentStep("Analysis complete!");
      setResult(analysisResult);

      return analysisResult;
    } catch (err) {
      console.error("AI analysis error:", err);
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      setError(errorMessage);
      
      // Handle rate limits
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        toast.error("AI rate limit reached. Please try again in a moment.");
      } else if (errorMessage.includes("402")) {
        toast.error("AI credits exhausted. Please add funds to continue.");
      } else {
        toast.error(`AI analysis failed: ${errorMessage}`);
      }
      
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setProgress(0);
    setCurrentStep("");
    setResult(null);
    setError(null);
  };

  return {
    analyzeProject,
    analyzing,
    progress,
    currentStep,
    result,
    error,
    reset,
    tierConfig: getTierAnalysisConfig(subscription.tier),
  };
};

// Helper: Convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
