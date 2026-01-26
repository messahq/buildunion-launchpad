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
  blueprintAnalysis?: {
    extractedText: string;
    detectedArea: number | null;
    areaUnit: string;
    dimensions: Array<{
      label: string;
      value: string;
    }>;
    documentCount: number;
  };
  processingTime?: number;
  tier?: string;
}

interface AnalyzeProjectParams {
  projectId: string;
  images: File[];
  documents?: File[]; // PDF files
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
    documents = [],
    description,
    workType,
  }: AnalyzeProjectParams): Promise<AIAnalysisResult | null> => {
    if (!session?.access_token) {
      toast.error("Please sign in to use AI analysis");
      return null;
    }

    const hasContent = images.length > 0 || documents.length > 0;
    if (!hasContent) {
      // No content to analyze
      return null;
    }

    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setCurrentStep("Preparing files...");

    const tierConfig = getTierAnalysisConfig(subscription.tier);
    const startTime = Date.now();

    try {
      let imageAnalysisResult: any = null;
      let blueprintAnalysis: AIAnalysisResult["blueprintAnalysis"] = undefined;

      // Limit images based on tier
      const imagesToAnalyze = images.slice(0, tierConfig.maxImages);
      
      if (images.length > tierConfig.maxImages) {
        toast.info(`Analyzing first ${tierConfig.maxImages} images (${subscription.tier} tier limit)`);
      }

      // Step 1: Analyze images if present
      if (imagesToAnalyze.length > 0) {
        setProgress(10);
        setCurrentStep("Converting images...");

        const firstImage = imagesToAnalyze[0];
        const base64Image = await fileToBase64(firstImage);

        setProgress(25);
        setCurrentStep(tierConfig.isPremium ? "Running deep AI analysis on photos..." : "Running AI analysis on photos...");

        const enhancedDescription = workType 
          ? `${workType} project: ${description || "No additional details"}`
          : description || "";

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
          throw new Error(fnError.message || "Photo AI analysis failed");
        }

        imageAnalysisResult = data.estimate;
      }

      // Step 2: Analyze PDFs/blueprints if present
      if (documents.length > 0) {
        setProgress(50);
        setCurrentStep("Uploading blueprints for analysis...");

        // First, upload PDFs to storage so extract-pdf-text can access them
        const uploadedPaths: string[] = [];
        for (const doc of documents) {
          const fileId = crypto.randomUUID();
          const safeFileName = doc.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${session.user.id}/${projectId}/${fileId}-${safeFileName}`;

          const { error: uploadError } = await supabase.storage
            .from("project-documents")
            .upload(filePath, doc, { 
              upsert: true,
              contentType: doc.type || 'application/pdf'
            });

          if (uploadError) {
            console.error("PDF upload error:", uploadError);
            continue;
          }

          // Create document record
          await supabase
            .from("project_documents")
            .insert({
              project_id: projectId,
              file_name: doc.name,
              file_path: filePath,
              file_size: doc.size,
            });

          uploadedPaths.push(filePath);
        }

        if (uploadedPaths.length > 0) {
          setProgress(65);
          setCurrentStep("Extracting area data from blueprints...");

          // Call extract-pdf-text edge function
          const { data: pdfData, error: pdfError } = await supabase.functions.invoke("extract-pdf-text", {
            body: { projectId },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (pdfError) {
            console.error("PDF extraction error:", pdfError);
          } else if (pdfData?.totalText) {
            // Parse extracted text for area/dimensions
            const extractedArea = parseAreaFromText(pdfData.totalText);
            
            blueprintAnalysis = {
              extractedText: pdfData.totalText.substring(0, 2000), // First 2000 chars
              detectedArea: extractedArea.area,
              areaUnit: extractedArea.unit,
              dimensions: extractedArea.dimensions,
              documentCount: documents.length,
            };

            // If no image analysis but we have PDF area, use it
            if (!imageAnalysisResult && extractedArea.area) {
              imageAnalysisResult = {
                materials: [],
                summary: `Blueprint analysis detected ${extractedArea.area} ${extractedArea.unit} of area.`,
                recommendations: ["Upload site photos for material estimation"],
                area: extractedArea.area,
                areaUnit: extractedArea.unit,
                areaConfidence: "medium",
                surfaceType: "unknown",
                surfaceCondition: "unknown",
                roomType: "from blueprint",
              };
            }
            // If we have both, merge the area data (prefer blueprint for measurements)
            else if (imageAnalysisResult && extractedArea.area) {
              imageAnalysisResult.area = extractedArea.area;
              imageAnalysisResult.areaUnit = extractedArea.unit;
              imageAnalysisResult.areaConfidence = "high";
              imageAnalysisResult.summary += ` Blueprint confirms ${extractedArea.area} ${extractedArea.unit}.`;
            }
          }
        }
      }

      setProgress(85);
      setCurrentStep("Saving results...");

      const analysisResult: AIAnalysisResult = {
        estimate: imageAnalysisResult || {
          materials: [],
          summary: "No analysis data available",
          recommendations: [],
          area: null,
          areaUnit: "sq ft",
          areaConfidence: "low",
          surfaceType: "unknown",
          surfaceCondition: "unknown",
          roomType: "unknown",
        },
        blueprintAnalysis,
        processingTime: Date.now() - startTime,
        tier: subscription.tier,
      };

      // Save to project_summaries - convert to JSON-safe format
      const photoEstimateData = JSON.parse(JSON.stringify({
        materials: analysisResult.estimate.materials,
        summary: analysisResult.estimate.summary,
        recommendations: analysisResult.estimate.recommendations,
        area: analysisResult.estimate.area,
        areaUnit: analysisResult.estimate.areaUnit,
        areaConfidence: analysisResult.estimate.areaConfidence,
        surfaceType: analysisResult.estimate.surfaceType,
        surfaceCondition: analysisResult.estimate.surfaceCondition,
        roomType: analysisResult.estimate.roomType,
        blueprintAnalysis: blueprintAnalysis || null,
        analyzedAt: new Date().toISOString(),
        tier: subscription.tier,
        imageCount: imagesToAnalyze.length,
        documentCount: documents.length,
      }));

      const blueprintData = blueprintAnalysis ? JSON.parse(JSON.stringify(blueprintAnalysis)) : null;

      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({
          photo_estimate: photoEstimateData,
          blueprint_analysis: blueprintData,
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

// Helper: Parse area and dimensions from extracted PDF text
function parseAreaFromText(text: string): {
  area: number | null;
  unit: string;
  dimensions: Array<{ label: string; value: string }>;
} {
  const result = {
    area: null as number | null,
    unit: "sq ft",
    dimensions: [] as Array<{ label: string; value: string }>,
  };

  // Look for area patterns
  const areaPatterns = [
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet|SF)/gi,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*m|square\s*meters?|m²)/gi,
    /area[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
    /total[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq|m)/gi,
  ];

  for (const pattern of areaPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (value > 0 && value < 1000000) {
        result.area = value;
        if (match[0].toLowerCase().includes("m²") || match[0].toLowerCase().includes("meter")) {
          result.unit = "m²";
        }
        break;
      }
    }
    if (result.area) break;
  }

  // Look for dimension patterns (e.g., "12' x 15'" or "3.5m x 4m")
  const dimensionPatterns = [
    /(\d+(?:\.\d+)?)\s*[''′]\s*[x×]\s*(\d+(?:\.\d+)?)\s*[''′]/gi,
    /(\d+(?:\.\d+)?)\s*(?:ft|feet)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet)/gi,
    /(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/gi,
    /width[:\s]+(\d+(?:\.\d+)?)/gi,
    /length[:\s]+(\d+(?:\.\d+)?)/gi,
    /height[:\s]+(\d+(?:\.\d+)?)/gi,
  ];

  for (const pattern of dimensionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[2]) {
        result.dimensions.push({
          label: "Room dimension",
          value: `${match[1]} × ${match[2]}`,
        });
      } else if (match[1]) {
        const label = match[0].toLowerCase().includes("width") ? "Width" :
                     match[0].toLowerCase().includes("length") ? "Length" :
                     match[0].toLowerCase().includes("height") ? "Height" : "Dimension";
        result.dimensions.push({
          label,
          value: match[1],
        });
      }
    }
  }

  // Limit dimensions to first 5
  result.dimensions = result.dimensions.slice(0, 5);

  return result;
}
