import { useState, useEffect } from "react";
import { X, Camera, LayoutTemplate, Calculator, FileText, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "buildunion-quickmode-onboarding-completed";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  feature: string;
}

const steps: OnboardingStep[] = [
  {
    id: "photo",
    title: "AI Photo Estimates",
    description: "Upload a photo of your job site and our AI will analyze it to provide material and labor estimates instantly.",
    icon: <Camera className="w-6 h-6" />,
    feature: "photo",
  },
  {
    id: "templates",
    title: "Project Templates",
    description: "Choose from pre-built templates for common projects like bathroom renovations, kitchen remodels, and more.",
    icon: <LayoutTemplate className="w-6 h-6" />,
    feature: "templates",
  },
  {
    id: "calculator",
    title: "Material Calculators",
    description: "Calculate exact material quantities for drywall, paint, concrete, roofing, and other common materials.",
    icon: <Calculator className="w-6 h-6" />,
    feature: "calculator",
  },
  {
    id: "quote",
    title: "Quote Generator",
    description: "Create professional PDF quotes with your company branding, line items, and payment terms.",
    icon: <FileText className="w-6 h-6" />,
    feature: "quote",
  },
];

interface QuickModeOnboardingProps {
  onComplete: () => void;
  onNavigateToTab: (tab: string) => void;
}

const QuickModeOnboarding = ({ onComplete, onNavigateToTab }: QuickModeOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompleted) {
      // Delay showing the onboarding to let the page load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
    onComplete();
  };

  const handleTryFeature = () => {
    onNavigateToTab(steps[currentStep].feature);
    handleComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Quick Mode Tour</span>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Step indicator */}
          <div className="flex gap-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  index <= currentStep ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-4">
            {step.icon}
          </div>

          <h2 className="text-xl font-bold mb-1">{step.title}</h2>
          <p className="text-white/80 text-sm">Step {currentStep + 1} of {steps.length}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-muted-foreground leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTryFeature}
              >
                Try Now
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-amber-500 hover:bg-amber-600 gap-1"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Skip link */}
        <div className="px-6 pb-4 text-center">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickModeOnboarding;

// Export a hook to reset onboarding for testing
export const useResetOnboarding = () => {
  return () => localStorage.removeItem(ONBOARDING_KEY);
};
