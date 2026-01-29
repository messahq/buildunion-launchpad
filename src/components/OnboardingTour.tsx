import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Brain,
  FolderKanban,
  FileSignature,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Calculator,
  Map,
} from "lucide-react";

const TOUR_STORAGE_KEY = "buildunion_onboarding_completed";

interface TourStep {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
}

const tourSteps: TourStep[] = [
  {
    icon: <Sparkles className="h-12 w-12" />,
    titleKey: "onboarding.steps.welcome.title",
    descriptionKey: "onboarding.steps.welcome.description",
    gradient: "from-primary to-primary/60",
  },
  {
    icon: <Zap className="h-12 w-12" />,
    titleKey: "onboarding.steps.quickMode.title",
    descriptionKey: "onboarding.steps.quickMode.description",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: <Brain className="h-12 w-12" />,
    titleKey: "onboarding.steps.messa.title",
    descriptionKey: "onboarding.steps.messa.description",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: <Calculator className="h-12 w-12" />,
    titleKey: "onboarding.steps.calculator.title",
    descriptionKey: "onboarding.steps.calculator.description",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: <FolderKanban className="h-12 w-12" />,
    titleKey: "onboarding.steps.projects.title",
    descriptionKey: "onboarding.steps.projects.description",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: <FileSignature className="h-12 w-12" />,
    titleKey: "onboarding.steps.contracts.title",
    descriptionKey: "onboarding.steps.contracts.description",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: <Users className="h-12 w-12" />,
    titleKey: "onboarding.steps.community.title",
    descriptionKey: "onboarding.steps.community.description",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    icon: <Shield className="h-12 w-12" />,
    titleKey: "onboarding.steps.obc.title",
    descriptionKey: "onboarding.steps.obc.description",
    gradient: "from-green-500 to-emerald-600",
  },
];

export const OnboardingTour = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    setCurrentStep(0);
  };

  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const step = tourSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
        <div className={`bg-gradient-to-br ${step.gradient} p-8 text-white relative`}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
              {step.icon}
            </div>
            <h2 className="text-2xl font-bold">{t(step.titleKey)}</h2>
            <p className="text-white/90 leading-relaxed">
              {t(step.descriptionKey)}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4 bg-background">
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {tourSteps.length}
            </span>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("onboarding.back")}
                </Button>
              )}
              
              <Button size="sm" onClick={handleNext}>
                {currentStep === tourSteps.length - 1 ? (
                  t("onboarding.getStarted")
                ) : (
                  <>
                    {t("onboarding.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const StartTourButton = () => {
  const { t } = useTranslation();
  
  const handleStartTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    window.location.reload();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleStartTour}>
      <Map className="h-4 w-4 mr-2" />
      {t("onboarding.restartTour")}
    </Button>
  );
};

export default OnboardingTour;
