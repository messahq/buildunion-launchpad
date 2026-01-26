import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Sparkles, ImageIcon, X, AlertCircle, CheckCircle2, AlertTriangle, Eye, Brain, ArrowRight, Calculator, Lock, Crown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { TrialLimitUpgradeModal } from "@/components/TrialLimitUpgradeModal";
interface Material {
  item: string;
  quantity: number | string;
  unit: string;
  notes?: string;
}

interface DualEngineData {
  gemini: {
    role: string;
    model: string;
    findings: {
      area: number | null;
      surface: string;
      condition: string;
      confidence: string;
    };
    rawExcerpt?: string;
  };
  gpt: {
    role: string;
    model: string;
    findings: {
      materialsCount: number;
      laborHours: number;
      totalLaborCost: number;
      areaUsed: number;
    };
    rawExcerpt?: string;
  };
  conflicts: Array<{
    field: string;
    geminiValue: string;
    gptValue: string;
    verified: boolean;
    severity: "high" | "medium" | "low";
  }>;
  verified: boolean;
  verificationStatus: string;
}

interface EstimateResult {
  materials: Material[];
  laborHours: string;
  laborCost?: number;
  summary: string;
  recommendations: string[];
  area?: number;
  areaUnit?: string;
  areaConfidence?: string;
  surfaceType?: string;
  surfaceCondition?: string;
  roomType?: string;
  dualEngine?: DualEngineData;
}

interface QuickModePhotoEstimateProps {
  onEstimateComplete?: (estimate: EstimateResult) => void;
  onContinueToTemplates?: () => void;
  onContinueToCalculator?: (area: number, areaUnit: string) => void;
}

const QuickModePhotoEstimate = ({ onEstimateComplete, onContinueToTemplates, onContinueToCalculator }: QuickModePhotoEstimateProps) => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { remainingTrials, hasTrialsRemaining, useOneTrial, maxTrials, isAuthenticated } = useDbTrialUsage("quick_estimate");
  const isPremium = subscription?.subscribed === true;
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPdfFile, setIsPdfFile] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }
      
      setImageFile(file);
      setFileName(file.name);
      setIsPdfFile(file.type === "application/pdf");
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setIsPdfFile(false);
    setFileName("");
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyzePhoto = async () => {
    if (!selectedImage) {
      toast.error("Please upload a photo first");
      return;
    }

    // Check trial limits for non-premium users
    if (!isPremium && isAuthenticated) {
      if (!hasTrialsRemaining) {
        setShowUpgradeModal(true);
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("quick-estimate", {
        body: {
          image: selectedImage,
          description: description,
          type: "photo_estimate",
          isPremium: isPremium
        }
      });

      if (error) throw error;

      // Use one trial for non-premium authenticated users
      if (!isPremium && isAuthenticated) {
        await useOneTrial();
      }

      setResult(data.estimate);
      onEstimateComplete?.(data.estimate);
      toast.success("Dual-engine analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze photo. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getVerificationBadge = () => {
    if (!result?.dualEngine) return null;
    
    const { verified, conflicts } = result.dualEngine;
    
    if (verified) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (conflicts.length > 0) {
      const highSeverity = conflicts.some(c => c.severity === "high");
      return (
        <Badge className={highSeverity ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-100 text-amber-700 border-amber-300"}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          Could not be verified
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Upload Section */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 text-amber-500" />
            Upload Photos & Files
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Upload blueprints, site photos, or floor plans. Our dual-engine AI will analyze and estimate materials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Image Preview or Upload Zone */}
          {selectedImage ? (
            <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted">
              {isPdfFile ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                  <FileText className="w-16 h-16 text-red-500 mb-3" />
                  <p className="font-medium text-foreground text-sm truncate max-w-[80%]">{fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF Document - Ready for Analysis</p>
                </div>
              ) : (
                <img
                  src={selectedImage}
                  alt="Work area"
                  className="w-full h-full object-cover"
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-amber-400 transition-colors bg-muted/30 flex flex-col items-center justify-center cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                <ImageIcon className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-foreground font-medium mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground">JPG, PNG, PDF up to 10MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photos & Files
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Describe the work (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., I want to paint this room, approx. 150 sq ft (or 14 m²)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Tier-based analysis info */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Analysis Depth</span>
              {isPremium ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs gap-1">
                  <Crown className="w-3 h-3" />
                  Deep Analysis
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Standard
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isPremium 
                ? "Pro tier: Full dual-engine analysis with detailed material breakdown, structural insights, and unlimited estimates."
                : "Free tier: Basic analysis with essential material estimates. Upgrade for deeper insights."
              }
            </p>
            {isAuthenticated && !isPremium && (
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">AI Estimates remaining:</span>
                <Badge variant={hasTrialsRemaining ? "secondary" : "destructive"} className="text-xs">
                  {remainingTrials}/{maxTrials}
                </Badge>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <Button
            onClick={analyzePhoto}
            disabled={!selectedImage || isAnalyzing || (!isPremium && isAuthenticated && !hasTrialsRemaining)}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-medium text-base"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Dual-Engine Analysis...
              </>
            ) : !isPremium && isAuthenticated && !hasTrialsRemaining ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Upgrade to Continue
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Estimate
              </>
            )}
          </Button>

          {/* Dual Engine Info */}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-600" />
              <span>Gemini Pro</span>
            </div>
            <span className="text-muted-foreground/50">+</span>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-green-600" />
              <span>GPT-5</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Estimate
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {result ? "Material list and analysis based on your upload" : "Upload photos or files to get started"}
              </CardDescription>
            </div>
            {getVerificationBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-2">No estimate yet</h4>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Upload a photo or blueprint of your work area and describe the job to get AI-powered material estimates
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Detected Area */}
              {result.area && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">Detected Area:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-900">{result.area} {result.areaUnit || "sq ft"}</span>
                    {result.areaConfidence && (
                      <Badge variant="outline" className="text-xs">
                        {result.areaConfidence} confidence
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-foreground">{result.summary}</p>
              </div>

              {/* Materials List */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Materials Needed</h4>
                <div className="space-y-2">
                  {result.materials.map((material, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{material.item}</p>
                        {material.notes && (
                          <p className="text-sm text-muted-foreground">{material.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-amber-600">
                          {material.quantity} {material.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Decision Log - Dual Engine Transparency */}
              {result.dualEngine && (
                <Collapsible open={showDecisionLog} onOpenChange={setShowDecisionLog}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      {showDecisionLog ? "Hide" : "Show"} Decision Log
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    {/* Conflicts */}
                    {result.dualEngine.conflicts.length > 0 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <h5 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Conflicts Detected
                        </h5>
                        <div className="space-y-2">
                          {result.dualEngine.conflicts.map((conflict, idx) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-red-700">{conflict.field}</p>
                              <p className="text-red-600">Gemini: {conflict.geminiValue}</p>
                              <p className="text-red-600">GPT-5: {conflict.gptValue}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gemini Findings */}
                    <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                      <h5 className="font-semibold text-cyan-800 mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {result.dualEngine.gemini.role} ({result.dualEngine.gemini.model})
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-cyan-600">Area:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.area || "N/A"} sq ft</span>
                        </div>
                        <div>
                          <span className="text-cyan-600">Surface:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.surface}</span>
                        </div>
                        <div>
                          <span className="text-cyan-600">Condition:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.condition}</span>
                        </div>
                        <div>
                          <span className="text-cyan-600">Confidence:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.confidence}</span>
                        </div>
                      </div>
                    </div>

                    {/* GPT Findings */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        {result.dualEngine.gpt.role} ({result.dualEngine.gpt.model})
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-green-600">Materials:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gpt.findings.materialsCount} items</span>
                        </div>
                        <div>
                          <span className="text-green-600">Area Used:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gpt.findings.areaUsed} sq ft</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Continue Button */}
              <Button
                onClick={onContinueToTemplates}
                variant="outline"
                className="w-full gap-2"
              >
                Continue to Templates
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

      {/* Upgrade Modal */}
      <TrialLimitUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="quick_estimate"
      />
    </>
  );
};

export default QuickModePhotoEstimate;
