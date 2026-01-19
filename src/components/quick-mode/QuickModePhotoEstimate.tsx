import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Sparkles, ImageIcon, X, AlertCircle, CheckCircle2, AlertTriangle, Eye, Brain, ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image too large. Maximum size is 10MB.");
        return;
      }
      
      setImageFile(file);
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

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("quick-estimate", {
        body: {
          image: selectedImage,
          description: description,
          type: "photo_estimate"
        }
      });

      if (error) throw error;

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
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Upload Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-500" />
            Photo Upload
          </CardTitle>
          <CardDescription>
            Take a photo of the work area and our dual-engine AI will estimate materials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Preview or Upload Zone */}
          {selectedImage ? (
            <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={selectedImage}
                alt="Work area"
                className="w-full h-full object-cover"
              />
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
              <p className="text-foreground font-medium mb-1">Drop photo here or click to upload</p>
              <p className="text-sm text-muted-foreground">JPG, PNG up to 10MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
            <Button
              variant="outline"
              className="flex-1"
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
            <Label htmlFor="description">Describe the work (optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., I want to lay tile here, need ceramic tiles for the bathroom floor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Analyze Button */}
          <Button
            onClick={analyzePhoto}
            disabled={!selectedImage || isAnalyzing}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Dual-Engine Analysis...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Estimate
              </>
            )}
          </Button>

          {/* Dual Engine Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            <span>Gemini Pro (Visual)</span>
            <span>+</span>
            <Brain className="w-3 h-3" />
            <span>GPT-5 (Estimation)</span>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Estimate
              </CardTitle>
              <CardDescription>
                Material list and labor estimate based on your photo
              </CardDescription>
            </div>
            {getVerificationBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {result ? (
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
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {result.dualEngine.gemini.role} ({result.dualEngine.gemini.model})
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-purple-600">Area:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.area || "N/A"} sq ft</span>
                        </div>
                        <div>
                          <span className="text-purple-600">Surface:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.surface}</span>
                        </div>
                        <div>
                          <span className="text-purple-600">Condition:</span>
                          <span className="ml-2 font-medium">{result.dualEngine.gemini.findings.condition}</span>
                        </div>
                        <div>
                          <span className="text-purple-600">Confidence:</span>
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

              {/* Continue Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => result?.area && onContinueToCalculator?.(result.area, result.areaUnit || "sq ft")}
                  disabled={!result?.area}
                  className="flex-1 gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <Calculator className="w-4 h-4" />
                  Continue to Calculator
                  {result?.area && (
                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-xs">
                      {result.area} {result.areaUnit || "sq ft"}
                    </Badge>
                  )}
                </Button>
                <Button
                  onClick={onContinueToTemplates}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  Continue to Templates
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Upload a photo and click "Get AI Estimate" to see dual-engine analysis
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickModePhotoEstimate;
