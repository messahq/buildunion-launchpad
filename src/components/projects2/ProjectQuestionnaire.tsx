import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, 
  ArrowLeft, 
  Ruler, 
  MapPin, 
  Wrench, 
  Users,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// QUESTION DEFINITIONS & WORKFLOW MAPPING
// ============================================

export type ProjectSize = "small" | "medium" | "large";
export type WorkType = "painting" | "flooring" | "renovation" | "new_construction" | "repair" | "other";
export type TeamNeed = "solo" | "with_team";

export interface ProjectAnswers {
  name: string;
  size: ProjectSize | null;
  location: string;
  workType: WorkType | null;
  teamNeed: TeamNeed | null;
}

export interface WorkflowRecommendation {
  mode: "quick" | "standard" | "full";
  calculator: string | null;
  teamEnabled: boolean;
  estimatedSteps: number;
  features: string[];
}

// Maps answers to workflow recommendation
export function determineWorkflow(answers: ProjectAnswers): WorkflowRecommendation {
  const { size, workType, teamNeed } = answers;
  
  // Default recommendation
  let recommendation: WorkflowRecommendation = {
    mode: "quick",
    calculator: null,
    teamEnabled: false,
    estimatedSteps: 3,
    features: ["Photo Estimate", "Quote", "Contract"]
  };

  // Size determines base complexity
  if (size === "small") {
    recommendation.mode = "quick";
    recommendation.estimatedSteps = 3;
  } else if (size === "medium") {
    recommendation.mode = "standard";
    recommendation.estimatedSteps = 5;
    recommendation.features = ["Photo Estimate", "Calculator", "Quote", "Contract", "Templates"];
  } else if (size === "large") {
    recommendation.mode = "full";
    recommendation.estimatedSteps = 8;
    recommendation.features = ["Documents", "Photo Estimate", "Calculator", "Quote", "Contract", "Team", "Tasks", "Timeline"];
  }

  // Work type determines calculator
  switch (workType) {
    case "painting":
      recommendation.calculator = "paint";
      break;
    case "flooring":
      recommendation.calculator = "tile";
      break;
    case "renovation":
      recommendation.calculator = "general";
      break;
    case "new_construction":
      recommendation.mode = "full"; // Override to full for new construction
      recommendation.calculator = "general";
      recommendation.estimatedSteps = 8;
      break;
    case "repair":
      recommendation.calculator = null; // No specific calculator
      break;
  }

  // Team need overrides
  if (teamNeed === "with_team") {
    recommendation.teamEnabled = true;
    if (recommendation.mode === "quick") {
      recommendation.mode = "standard";
      recommendation.estimatedSteps = 5;
    }
    if (!recommendation.features.includes("Team")) {
      recommendation.features.push("Team");
    }
  }

  return recommendation;
}

// ============================================
// QUESTION STEP COMPONENTS
// ============================================

interface StepProps {
  answers: ProjectAnswers;
  onUpdate: (updates: Partial<ProjectAnswers>) => void;
  onNext: () => void;
  onBack?: () => void;
}

// Step 1: Project Name
function NameStep({ answers, onUpdate, onNext }: StepProps) {
  const isValid = answers.name.trim().length >= 2;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">What's your project called?</h2>
        <p className="text-muted-foreground">Give your project a memorable name</p>
      </div>
      
      <div className="max-w-md mx-auto space-y-4">
        <Input
          value={answers.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g., Kitchen Renovation, Basement Flooring..."
          className="text-lg h-12"
          autoFocus
        />
        
        <Button 
          onClick={onNext} 
          disabled={!isValid}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Project Size
function SizeStep({ answers, onUpdate, onNext, onBack }: StepProps) {
  const sizes: { value: ProjectSize; label: string; description: string; icon: string }[] = [
    { value: "small", label: "Small", description: "Quick job, under $5,000", icon: "🏠" },
    { value: "medium", label: "Medium", description: "Standard project, $5,000 - $25,000", icon: "🏗️" },
    { value: "large", label: "Large", description: "Major project, over $25,000", icon: "🏢" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">How big is this project?</h2>
        <p className="text-muted-foreground">This helps us set up the right workflow</p>
      </div>
      
      <div className="grid gap-4 max-w-lg mx-auto">
        {sizes.map((size) => (
          <Card
            key={size.value}
            className={cn(
              "cursor-pointer transition-all hover:border-amber-400",
              answers.size === size.value && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            )}
            onClick={() => {
              onUpdate({ size: size.value });
              setTimeout(onNext, 300);
            }}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <span className="text-3xl">{size.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{size.label}</div>
                <div className="text-sm text-muted-foreground">{size.description}</div>
              </div>
              {answers.size === size.value && (
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

// Step 3: Location
function LocationStep({ answers, onUpdate, onNext, onBack }: StepProps) {
  const isValid = answers.location.trim().length >= 3;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Where is the project?</h2>
        <p className="text-muted-foreground">City or address for logistics planning</p>
      </div>
      
      <div className="max-w-md mx-auto space-y-4">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={answers.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="e.g., Toronto, ON or 123 Main St..."
            className="text-lg h-12 pl-10"
          />
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={onNext} 
            disabled={!isValid}
            className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 4: Work Type
function WorkTypeStep({ answers, onUpdate, onNext, onBack }: StepProps) {
  const types: { value: WorkType; label: string; icon: string }[] = [
    { value: "painting", label: "Painting", icon: "🎨" },
    { value: "flooring", label: "Flooring / Tiling", icon: "🪵" },
    { value: "renovation", label: "Renovation", icon: "🔨" },
    { value: "new_construction", label: "New Construction", icon: "🏗️" },
    { value: "repair", label: "Repair / Maintenance", icon: "🔧" },
    { value: "other", label: "Other", icon: "📋" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">What type of work?</h2>
        <p className="text-muted-foreground">We'll suggest the right tools and calculators</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
        {types.map((type) => (
          <Card
            key={type.value}
            className={cn(
              "cursor-pointer transition-all hover:border-amber-400",
              answers.workType === type.value && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            )}
            onClick={() => {
              onUpdate({ workType: type.value });
              setTimeout(onNext, 300);
            }}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <span className="text-2xl">{type.icon}</span>
              <div className="font-medium text-sm text-foreground">{type.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

// Step 5: Team Need
function TeamStep({ answers, onUpdate, onNext, onBack }: StepProps) {
  const options: { value: TeamNeed; label: string; description: string; icon: React.ReactNode }[] = [
    { 
      value: "solo", 
      label: "Just Me", 
      description: "Solo contractor or quick estimate",
      icon: <Wrench className="h-8 w-8" />
    },
    { 
      value: "with_team", 
      label: "With Team", 
      description: "Multiple workers, subcontractors",
      icon: <Users className="h-8 w-8" />
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Working alone or with a team?</h2>
        <p className="text-muted-foreground">This determines collaboration features</p>
      </div>
      
      <div className="grid gap-4 max-w-lg mx-auto">
        {options.map((option) => (
          <Card
            key={option.value}
            className={cn(
              "cursor-pointer transition-all hover:border-amber-400",
              answers.teamNeed === option.value && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
            )}
            onClick={() => {
              onUpdate({ teamNeed: option.value });
              setTimeout(onNext, 300);
            }}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="text-amber-500">{option.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </div>
              {answers.teamNeed === option.value && (
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

// Step 6: Summary & Recommendation
function SummaryStep({ answers, onBack, onStart }: StepProps & { onStart: () => void }) {
  const recommendation = determineWorkflow(answers);
  
  const modeLabels = {
    quick: "Quick Mode",
    standard: "Standard Workflow", 
    full: "Full Project Management"
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Workflow Ready</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">{answers.name}</h2>
        <p className="text-muted-foreground">Here's your personalized workflow</p>
      </div>
      
      <Card className="max-w-lg mx-auto border-amber-200 dark:border-amber-800">
        <CardContent className="p-6 space-y-4">
          {/* Project Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Size</Label>
              <p className="font-medium capitalize">{answers.size}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Location</Label>
              <p className="font-medium">{answers.location}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Work Type</Label>
              <p className="font-medium capitalize">{answers.workType?.replace("_", " ")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Team</Label>
              <p className="font-medium">{answers.teamNeed === "solo" ? "Solo" : "With Team"}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-muted-foreground">Recommended Workflow</Label>
            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {modeLabels[recommendation.mode]}
            </p>
            <p className="text-sm text-muted-foreground">
              {recommendation.estimatedSteps} steps • {recommendation.features.length} features
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2">
            {recommendation.features.map((feature) => (
              <span 
                key={feature}
                className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {feature}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 max-w-lg mx-auto">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onStart}
          className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Start Project
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// MAIN QUESTIONNAIRE COMPONENT
// ============================================

interface ProjectQuestionnaireProps {
  onComplete: (answers: ProjectAnswers, workflow: WorkflowRecommendation) => void;
  onCancel: () => void;
}

export default function ProjectQuestionnaire({ onComplete, onCancel }: ProjectQuestionnaireProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ProjectAnswers>({
    name: "",
    size: null,
    location: "",
    workType: null,
    teamNeed: null,
  });

  const updateAnswers = (updates: Partial<ProjectAnswers>) => {
    setAnswers(prev => ({ ...prev, ...updates }));
  };

  const totalSteps = 6;

  const handleStart = () => {
    const workflow = determineWorkflow(answers);
    onComplete(answers, workflow);
  };

  return (
    <div className="min-h-[500px] flex flex-col">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Step {step + 1} of {totalSteps}</span>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
            Cancel
          </Button>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center">
        {step === 0 && (
          <NameStep 
            answers={answers} 
            onUpdate={updateAnswers} 
            onNext={() => setStep(1)} 
          />
        )}
        {step === 1 && (
          <SizeStep 
            answers={answers} 
            onUpdate={updateAnswers} 
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <LocationStep 
            answers={answers} 
            onUpdate={updateAnswers} 
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <WorkTypeStep 
            answers={answers} 
            onUpdate={updateAnswers} 
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <TeamStep 
            answers={answers} 
            onUpdate={updateAnswers} 
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <SummaryStep 
            answers={answers} 
            onUpdate={updateAnswers} 
            onNext={() => {}}
            onBack={() => setStep(4)}
            onStart={handleStart}
          />
        )}
      </div>
    </div>
  );
}
