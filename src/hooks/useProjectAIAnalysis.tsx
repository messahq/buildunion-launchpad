import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { FilterAnswers, AITriggers } from "@/components/projects2/FilterQuestions";
import { DualEngineOutput, SynthesisResult } from "@/components/projects2/ProjectSynthesis";
import { buildOperationalTruth, OperationalTruth } from "@/types/operationalTruth";
import { 
  generateCacheHash, 
  getCachedAIResult,
  setCachedAIResult,
} from "@/lib/aiCacheUtils";
import { Json } from "@/integrations/supabase/types";

// Project size type - determined by AI
export type ProjectSize = "small" | "medium" | "large";

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
  // AI-determined project size
  projectSize: ProjectSize;
  projectSizeReason: string;
  processingTime?: number;
  tier?: string;
  // Dual-engine structured output for Synthesis Bridge
  dualEngineOutput?: DualEngineOutput;
  synthesisResult?: SynthesisResult;
  // Cache metadata
  fromCache?: boolean;
  cacheHash?: string;
}

interface AnalyzeProjectParams {
  projectId: string;
  images: File[];
  documents?: File[]; // PDF files
  description: string;
  workType: string | null;
  // NEW: Filter answers for targeted AI analysis
  filterAnswers?: FilterAnswers;
  aiTriggers?: AITriggers;
  // Force skip cache
  forceRefresh?: boolean;
}

// Tier-based analysis depth with model selection
const getTierAnalysisConfig = (tier: SubscriptionTier) => {
  switch (tier) {
    case "premium":
    case "enterprise":
      return {
        isPremium: true,
        tierName: "premium" as const,
        maxImages: 10,
        analysisDepth: "deep",
        features: ["dual_engine", "conflict_detection", "premium_insights"],
        // Premium: always dual engine
        forceDualEngine: true,
      };
    case "pro":
      return {
        isPremium: true,
        tierName: "pro" as const,
        maxImages: 5,
        analysisDepth: "standard",
        features: ["dual_engine", "conflict_detection"],
        // Pro: dual engine only on conflicts
        forceDualEngine: false,
      };
    default: // free
      return {
        isPremium: false,
        tierName: "free" as const,
        maxImages: 2,
        analysisDepth: "basic",
        features: ["basic_estimate"],
        // Free: never dual engine
        forceDualEngine: false,
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
    filterAnswers,
    aiTriggers,
    forceRefresh = false,
  }: AnalyzeProjectParams): Promise<AIAnalysisResult | null> => {
    if (!session?.access_token) {
      toast.error("Please sign in to use AI analysis");
      return null;
    }

    const hasContent = images.length > 0 || documents.length > 0;
    if (!hasContent) {
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

      // Step 1: Check cache before making API call
      let cacheHash: string | null = null;
      if (imagesToAnalyze.length > 0 && !forceRefresh) {
        setProgress(5);
        setCurrentStep("Checking cached results...");

        const firstImage = imagesToAnalyze[0];
        const imageUrl = firstImage.name; // Use filename as identifier
        cacheHash = generateCacheHash(imageUrl, description || "", tierConfig.tierName);

        // Try to get cached result using the utility function
        const cachedResult = await getCachedAIResult(projectId, cacheHash);
        
        if (cachedResult) {
          // === STRUCTURED LOGGING: CACHE HIT ===
          console.log(`[AI_CALL] ${JSON.stringify({
            event: "cache_hit",
            tier: tierConfig.tierName,
            timestamp: new Date().toISOString(),
            hash: cacheHash,
            projectId,
          })}`);
          
          setProgress(100);
          setCurrentStep("Loaded from cache!");
          
          const cachedData = cachedResult as Record<string, any>;
          const cachedAnalysis: AIAnalysisResult = {
            estimate: cachedData.estimate || {
              materials: [],
              summary: "Cached result",
              recommendations: [],
              area: null,
              areaUnit: "sq ft",
              areaConfidence: "low",
              surfaceType: "unknown",
              surfaceCondition: "unknown",
              roomType: "unknown",
            },
            blueprintAnalysis: cachedData.blueprintAnalysis,
            projectSize: cachedData.projectSize || "small",
            projectSizeReason: cachedData.projectSizeReason || "From cache",
            fromCache: true,
            cacheHash,
            processingTime: Date.now() - startTime,
            tier: cachedData.tier,
          };
          setResult(cachedAnalysis);
          setAnalyzing(false);
          return cachedAnalysis;
        }
      }

      // Step 2: Analyze images if present
      if (imagesToAnalyze.length > 0) {
        setProgress(10);
        setCurrentStep("Converting images...");

        const firstImage = imagesToAnalyze[0];
        const base64Image = await fileToBase64(firstImage);

        setProgress(25);
        setCurrentStep(tierConfig.isPremium ? "Running deep AI analysis on photos..." : "Running AI analysis on photos...");

        // Add OBC search step indicator if triggered
        if (aiTriggers?.obcSearch) {
          setCurrentStep("Running dual-engine analysis (Visual + OBC validation)...");
        }

        const enhancedDescription = workType 
          ? `${workType} project: ${description || "No additional details"}`
          : description || "";

        // Pass tier info to edge function for model selection
        const { data, error: fnError } = await supabase.functions.invoke("quick-estimate", {
          body: {
            image: base64Image,
            description: enhancedDescription,
            isPremium: tierConfig.isPremium,
            tier: tierConfig.tierName, // NEW: explicit tier for model selection
            forceDualEngine: tierConfig.forceDualEngine, // NEW: premium always dual
            // Pass filter data for targeted analysis
            filterAnswers: filterAnswers || null,
            aiTriggers: aiTriggers || null,
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
      setCurrentStep("Determining project size...");

      // Determine project size based on AI analysis
      const { projectSize, projectSizeReason } = determineProjectSize(
        imageAnalysisResult,
        blueprintAnalysis,
        documents.length
      );

      // Build dual-engine structured output for Synthesis Bridge
      const dualEngineOutput: DualEngineOutput | undefined = imageAnalysisResult?.dualEngine ? {
        gemini: {
          role: imageAnalysisResult.dualEngine.gemini?.role || "Visual Specialist",
          model: imageAnalysisResult.dualEngine.gemini?.model || "gemini-2.5-flash",
          area: imageAnalysisResult.area,
          areaUnit: imageAnalysisResult.areaUnit || "sq ft",
          confidence: imageAnalysisResult.areaConfidence || "medium",
          surfaceType: imageAnalysisResult.surfaceType || "unknown",
          roomType: imageAnalysisResult.roomType || "unknown",
          visualFindings: imageAnalysisResult.dualEngine.gemini?.findings?.visible_features as string[] || [],
          rawExcerpt: imageAnalysisResult.dualEngine.gemini?.rawExcerpt,
        },
        openai: {
          role: "Regulatory Validator",
          model: "gpt-5-mini",
          obcReferences: aiTriggers?.obcSearch ? ["Pending OBC validation"] : [],
          regulatoryNotes: [],
          permitRequired: filterAnswers?.technicalFilter?.affectsStructure || filterAnswers?.technicalFilter?.affectsMechanical || false,
          validationStatus: "pending",
          rawExcerpt: imageAnalysisResult.dualEngine.gpt?.rawExcerpt,
        }
      } : undefined;

      // Build synthesis result
      const synthesisResult: SynthesisResult | undefined = {
        operationalTruth: {
          confirmedArea: imageAnalysisResult?.area || blueprintAnalysis?.detectedArea || null,
          areaUnit: imageAnalysisResult?.areaUnit || "sq ft",
          materialsCount: imageAnalysisResult?.materials?.length || 0,
          hasBlueprint: !!blueprintAnalysis?.extractedText,
        },
        conflicts: imageAnalysisResult?.conflicts?.map(c => ({
          field: c.field,
          geminiValue: c.geminiValue,
          openaiValue: c.gptValue,
          severity: c.severity,
        })) || [],
        verificationStatus: imageAnalysisResult?.conflicts?.length ? "conflicts_detected" : "verified",
      };

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
        projectSize,
        projectSizeReason,
        processingTime: Date.now() - startTime,
        tier: subscription.tier,
        dualEngineOutput,
        synthesisResult,
      };

      setCurrentStep("Saving results...");

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
        // Include AI-determined project size
        projectSize,
        projectSizeReason,
      }));

      const blueprintData = blueprintAnalysis ? JSON.parse(JSON.stringify(blueprintAnalysis)) : null;

      // Include project size in calculator_results for workflow recommendations
      const calculatorResultsWithSize = [{
        type: "ai_project_analysis",
        projectSize,
        projectSizeReason,
        detectedArea: analysisResult.estimate.area,
        areaUnit: analysisResult.estimate.areaUnit,
        materialsCount: analysisResult.estimate.materials.length,
        hasBlueprint: !!blueprintAnalysis?.extractedText,
        analyzedAt: new Date().toISOString(),
      }];

      // Save cache entry for this analysis
      if (cacheHash) {
        const cacheData: Json = {
          estimate: analysisResult.estimate,
          blueprintAnalysis: blueprintAnalysis || null,
          projectSize,
          projectSizeReason,
          tier: subscription.tier,
        } as unknown as Json;
        
        await setCachedAIResult(
          projectId,
          cacheHash,
          cacheData,
          tierConfig.isPremium ? "gemini-2.5-flash" : "gemini-2.5-flash-lite",
          tierConfig.tierName
        );
      }

      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({
          photo_estimate: photoEstimateData,
          blueprint_analysis: blueprintData,
          calculator_results: calculatorResultsWithSize,
          status: "analyzed",
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (updateError) {
        console.error("Error saving analysis:", updateError);
      }

      setProgress(100);
      setCurrentStep("Analysis complete!");
      
      // Add cache metadata to result
      const finalResult: AIAnalysisResult = {
        ...analysisResult,
        fromCache: false,
        cacheHash: cacheHash || undefined,
      };
      setResult(finalResult);

      return finalResult;
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

  // Build operational truth from result - automatically syncs with AI analysis
  const operationalTruth: OperationalTruth | null = useMemo(() => {
    if (!result) return null;
    
    return buildOperationalTruth({
      aiAnalysis: {
        area: result.estimate.area,
        areaUnit: result.estimate.areaUnit,
        materials: result.estimate.materials,
        hasBlueprint: !!result.blueprintAnalysis?.extractedText,
        confidence: result.estimate.areaConfidence,
      },
      blueprintAnalysis: result.blueprintAnalysis ? {
        analyzed: !!result.blueprintAnalysis.extractedText,
      } : undefined,
      dualEngineOutput: result.dualEngineOutput,
      synthesisResult: result.synthesisResult,
      projectSize: result.projectSize,
    });
  }, [result]);

  return {
    analyzeProject,
    analyzing,
    progress,
    currentStep,
    result,
    error,
    reset,
    tierConfig: getTierAnalysisConfig(subscription.tier),
    // NEW: Direct access to operational truth from AI analysis
    operationalTruth,
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

// Helper: Determine project size based on AI analysis
function determineProjectSize(
  imageAnalysis: any,
  blueprintAnalysis: AIAnalysisResult["blueprintAnalysis"] | undefined,
  documentCount: number
): { projectSize: ProjectSize; projectSizeReason: string } {
  // Priority: blueprint area > image analysis area
  const area = blueprintAnalysis?.detectedArea || imageAnalysis?.area || 0;
  const areaUnit = blueprintAnalysis?.areaUnit || imageAnalysis?.areaUnit || "sq ft";
  const materialsCount = imageAnalysis?.materials?.length || 0;
  const hasBlueprint = !!blueprintAnalysis?.extractedText;
  const dimensionsCount = blueprintAnalysis?.dimensions?.length || 0;

  // Convert to sq ft for consistent comparison if needed
  let normalizedArea = area;
  if (areaUnit === "m²") {
    normalizedArea = area * 10.764; // Convert m² to sq ft
  }

  // Determine size based on multiple factors
  let projectSize: ProjectSize = "small";
  let reasons: string[] = [];

  // Area-based determination (primary factor)
  if (normalizedArea > 0) {
    if (normalizedArea >= 2000) {
      projectSize = "large";
      reasons.push(`Large area: ${area} ${areaUnit}`);
    } else if (normalizedArea >= 500) {
      projectSize = "medium";
      reasons.push(`Medium area: ${area} ${areaUnit}`);
    } else {
      reasons.push(`Small area: ${area} ${areaUnit}`);
    }
  }

  // Complexity indicators can upgrade the size
  if (materialsCount > 10 && projectSize !== "large") {
    projectSize = projectSize === "small" ? "medium" : "large";
    reasons.push(`${materialsCount} materials detected`);
  } else if (materialsCount > 5 && projectSize === "small") {
    projectSize = "medium";
    reasons.push(`${materialsCount} materials`);
  }

  // Blueprint presence indicates complexity
  if (hasBlueprint && documentCount > 1) {
    if (projectSize === "small") projectSize = "medium";
    reasons.push(`${documentCount} blueprint(s)`);
  }

  // Multiple room dimensions indicate complexity
  if (dimensionsCount > 3 && projectSize !== "large") {
    projectSize = projectSize === "small" ? "medium" : "large";
    reasons.push(`${dimensionsCount} room dimensions`);
  }

  // Build reason string
  const projectSizeReason = reasons.length > 0 
    ? `AI determined ${projectSize} project: ${reasons.join(", ")}`
    : `Default: ${projectSize} project (limited data)`;

  return { projectSize, projectSizeReason };
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
