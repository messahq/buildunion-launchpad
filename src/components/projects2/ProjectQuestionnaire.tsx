import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { 
  MapPin, 
  Camera,
  Sparkles,
  Loader2,
  X,
  Upload,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPE DEFINITIONS
// ============================================

// ProjectSize is determined by AI, not user input
export type WorkType = 
  | "painting" 
  | "flooring" 
  | "drywall" 
  | "electrical" 
  | "plumbing" 
  | "hvac" 
  | "roofing" 
  | "carpentry"
  | "concrete"
  | "renovation" 
  | "new_construction" 
  | "repair" 
  | "other";

export interface UploadedFile {
  file: File;
  type: "image" | "pdf";
  preview?: string;
}

// Simplified answers - no size or teamNeed (AI determines these)
export interface ProjectAnswers {
  name: string;
  location: string;
  workType: WorkType | null;
  description: string;
  images: File[];
  documents: File[]; // PDF/blueprints
}

export interface WorkflowRecommendation {
  mode: "quick" | "standard" | "full";
  calculator: string | null;
  teamEnabled: boolean;
  estimatedSteps: number;
  features: string[];
}

// Work types with more trade-specific options
const WORK_TYPES: { value: WorkType; label: string; icon: string }[] = [
  { value: "painting", label: "Painting", icon: "🎨" },
  { value: "flooring", label: "Flooring", icon: "🪵" },
  { value: "drywall", label: "Drywall", icon: "🧱" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "hvac", label: "HVAC", icon: "❄️" },
  { value: "roofing", label: "Roofing", icon: "🏠" },
  { value: "carpentry", label: "Carpentry", icon: "🪚" },
  { value: "concrete", label: "Concrete", icon: "🧱" },
  { value: "renovation", label: "Renovation", icon: "🔨" },
  { value: "new_construction", label: "New Build", icon: "🏗️" },
  { value: "repair", label: "Repair", icon: "🛠️" },
  { value: "other", label: "Other", icon: "📋" },
];

// Maps answers to workflow recommendation
// Note: Size will be determined by AI later, so we base initial workflow on work type and data availability
export function determineWorkflow(answers: ProjectAnswers): WorkflowRecommendation {
  const { workType, images, documents } = answers;
  
  let recommendation: WorkflowRecommendation = {
    mode: "quick",
    calculator: null,
    teamEnabled: false,
    estimatedSteps: 3,
    features: ["Photo Estimate", "Quote", "Contract"]
  };

  // If we have images or documents, AI will analyze and refine the workflow
  const hasUploadedContent = images.length > 0 || documents.length > 0;
  
  // Start with quick mode, AI will upgrade if needed based on analysis
  recommendation.estimatedSteps = hasUploadedContent ? 4 : 3;
  recommendation.features = hasUploadedContent 
    ? ["AI Analysis", "Photo Estimate", "Quote", "Contract"]
    : ["Manual Entry", "Quote", "Contract"];

  // Work type determines calculator
  switch (workType) {
    case "painting":
      recommendation.calculator = "paint";
      break;
    case "flooring":
      recommendation.calculator = "tile";
      break;
    case "drywall":
      recommendation.calculator = "drywall";
      break;
    case "roofing":
      recommendation.calculator = "roofing";
      break;
    case "concrete":
      recommendation.calculator = "concrete";
      break;
    case "carpentry":
      recommendation.calculator = "deck";
      break;
    case "electrical":
    case "plumbing":
    case "hvac":
      recommendation.calculator = "other";
      break;
    case "renovation":
    case "new_construction":
      recommendation.calculator = "general";
      // New construction typically needs full workflow
      if (workType === "new_construction") {
        recommendation.mode = "full";
        recommendation.estimatedSteps = 6;
        recommendation.features = ["AI Analysis", "Documents", "Calculator", "Quote", "Contract", "Team"];
        recommendation.teamEnabled = true;
      }
      break;
    case "repair":
      recommendation.calculator = null;
      break;
  }

  return recommendation;
}

// ============================================
// MAIN QUESTIONNAIRE COMPONENT
// ============================================

interface TierConfig {
  isPremium: boolean;
  maxImages: number;
  analysisDepth: string;
  features: string[];
}

interface ProjectQuestionnaireProps {
  onComplete: (answers: ProjectAnswers, workflow: WorkflowRecommendation) => void;
  onCancel: () => void;
  saving?: boolean;
  tierConfig?: TierConfig;
}

export default function ProjectQuestionnaire({ onComplete, onCancel, saving, tierConfig }: ProjectQuestionnaireProps) {
  const maxImages = tierConfig?.maxImages || 2;
  const maxDocuments = 3; // PDF limit
  
  const [answers, setAnswers] = useState<ProjectAnswers>({
    name: "",
    location: "",
    workType: null,
    description: "",
    images: [],
    documents: [],
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const updateAnswers = (updates: Partial<ProjectAnswers>) => {
    setAnswers(prev => ({ ...prev, ...updates }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Separate images and PDFs
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    const pdfFiles = files.filter(f => f.type === "application/pdf");

    // Handle images
    if (imageFiles.length > 0) {
      const currentCount = answers.images.length;
      const remaining = maxImages - currentCount;
      
      if (remaining > 0) {
        const filesToAdd = imageFiles.slice(0, remaining);
        const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
        updateAnswers({ images: [...answers.images, ...filesToAdd] });
      }
    }

    // Handle PDFs
    if (pdfFiles.length > 0) {
      const currentPdfCount = answers.documents.length;
      const remainingPdfs = maxDocuments - currentPdfCount;
      
      if (remainingPdfs > 0) {
        const pdfsToAdd = pdfFiles.slice(0, remainingPdfs);
        updateAnswers({ documents: [...answers.documents, ...pdfsToAdd] });
      }
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = answers.documents.length;
    const remaining = maxDocuments - currentCount;
    
    if (remaining <= 0) return;
    
    const filesToAdd = files.slice(0, remaining);
    updateAnswers({ documents: [...answers.documents, ...filesToAdd] });
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    updateAnswers({ images: answers.images.filter((_, i) => i !== index) });
  };

  const removeDocument = (index: number) => {
    updateAnswers({ documents: answers.documents.filter((_, i) => i !== index) });
  };

  const handleSubmit = () => {
    const workflow = determineWorkflow(answers);
    onComplete(answers, workflow);
  };

  // Validation - name is required, work type helps AI
  const isValid = answers.name.trim().length >= 2;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">New Project</h2>
          <p className="text-sm text-muted-foreground">Tell us about your project</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground">
            Project Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={answers.name}
            onChange={(e) => updateAnswers({ name: e.target.value })}
            placeholder="e.g., Kitchen Renovation, Office Painting..."
            className="h-11"
            autoFocus
          />
        </div>

        {/* Project Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-foreground">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={answers.location}
              onChange={(e) => updateAnswers({ location: e.target.value })}
              placeholder="e.g., Toronto, ON"
              className="h-11 pl-10"
            />
          </div>
        </div>

        {/* Work Type - expanded with more trades */}
        <div className="space-y-2">
          <Label className="text-foreground">Work Type</Label>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all border",
                  answers.workType === type.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                )}
                onClick={() => updateAnswers({ workType: type.value })}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Photos for AI Analysis</Label>
            <span className="text-xs text-muted-foreground">
              {answers.images.length}/{maxImages} photos
              {tierConfig?.isPremium && (
                <span className="ml-1 text-primary">({tierConfig.analysisDepth} analysis)</span>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload site photos - AI will analyze and estimate materials automatically
          </p>
          
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {answers.images.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">Photo</span>
              </button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* PDF/Blueprint Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">PDF / Blueprint (optional)</Label>
            <span className="text-xs text-muted-foreground">
              {answers.documents.length}/{maxDocuments} documents
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload blueprints or floor plans - AI will extract area measurements and dimensions
          </p>
          
          <div className="flex flex-wrap gap-2">
            {answers.documents.map((doc, index) => (
              <div 
                key={index} 
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30"
              >
                <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate max-w-[120px]">{doc.name}</div>
                  <div className="text-[10px] text-muted-foreground">Ready for analysis</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="w-5 h-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {answers.documents.length < maxDocuments && (
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="h-12 px-4 rounded-lg border-2 border-dashed border-border hover:border-amber-500/50 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Add PDF</span>
              </button>
            )}
          </div>
          
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handlePdfUpload}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-foreground">
            Brief Description (optional)
          </Label>
          <Textarea
            id="description"
            value={answers.description}
            onChange={(e) => updateAnswers({ description: e.target.value })}
            placeholder="Describe the scope of work, materials needed, special requirements..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* AI Analysis Hint - shown only when files are uploaded */}
        {(answers.images.length > 0 || answers.documents.length > 0) && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">AI will analyze your uploads:</div>
              {answers.images.length > 0 && (
                <div>📷 {answers.images.length} photo(s) - surface detection & material estimation</div>
              )}
              {answers.documents.length > 0 && (
                <div>📄 {answers.documents.length} PDF(s) - area measurements & dimensions</div>
              )}
              {tierConfig?.isPremium && (
                <div className="text-primary font-medium">✨ Deep structural analysis enabled</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Create & Analyze
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
