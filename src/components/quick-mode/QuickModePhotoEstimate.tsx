import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Sparkles, ImageIcon, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EstimateResult {
  materials: Array<{
    item: string;
    quantity: string;
    unit: string;
    notes?: string;
  }>;
  laborHours: string;
  summary: string;
  recommendations: string[];
}

interface QuickModePhotoEstimateProps {
  onEstimateComplete?: (estimate: EstimateResult) => void;
}

const QuickModePhotoEstimate = ({ onEstimateComplete }: QuickModePhotoEstimateProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
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
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze photo. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
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
            Take a photo of the work area and our AI will estimate materials needed
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
              placeholder="e.g., Need to tile this bathroom floor, about 8x10 feet. Want subway tiles..."
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
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Estimate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Estimate
          </CardTitle>
          <CardDescription>
            Material list and labor estimate based on your photo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-6">
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

              {/* Labor Estimate */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-foreground mb-1">Estimated Labor</h4>
                <p className="text-2xl font-bold text-amber-600">{result.laborHours}</p>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
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
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Upload a photo and click "Get Estimate" to see AI-powered material estimates
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickModePhotoEstimate;
