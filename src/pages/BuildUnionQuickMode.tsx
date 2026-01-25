import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import QuickModePhotoEstimate from "@/components/quick-mode/QuickModePhotoEstimate";
import QuickModeTemplates from "@/components/quick-mode/QuickModeTemplates";
import QuickModeCalculator from "@/components/quick-mode/QuickModeCalculator";
import QuickModeQuoteGenerator from "@/components/quick-mode/QuickModeQuoteGenerator";
import ContractGenerator from "@/components/quick-mode/ContractGenerator";
import QuickModeOnboarding from "@/components/quick-mode/QuickModeOnboarding";
import DataMergeDialog from "@/components/DataMergeDialog";
import AuthGateModal from "@/components/AuthGateModal";
import GuestProgressBar from "@/components/GuestProgressBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, LayoutTemplate, Calculator, FileText, Zap, ArrowLeft, FileSpreadsheet, Sparkles, FileUp, Crown, Lock, ClipboardSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { useDraftData } from "@/hooks/useDraftData";
import { toast } from "sonner";

// Template data type for passing between tabs
interface TemplateData {
  templateId: string;
  templateName: string;
  projectName: string;
  checklist: any[];
  completedTasks: string[];
  materials: string[];
}

// Collected data state type
interface CollectedData {
  photoEstimate: any | null;
  calculatorResults: any[];
  templateItems: any[];
}

interface PhotoEstimatePreFill {
  area: number;
  areaUnit: string;
}

const BuildUnionQuickMode = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { remainingTrials, hasTrialsRemaining, useOneTrial, maxTrials, isAuthenticated } = useDbTrialUsage("blueprint_analysis");
  
  // Draft data for returning users
  const { draftData, hasDraft, saveDraft, clearDraft } = useDraftData<CollectedData>("quick_mode");
  
  const isCreateFlow = searchParams.get("flow") === "create";
  const isPremium = subscription?.subscribed === true;
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "photo");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authGateFeature, setAuthGateFeature] = useState<"blueprints" | "templates" | "quote" | "summary">("blueprints");
  const [showDraftResume, setShowDraftResume] = useState(false);
  
  // Collected data from all tabs
  const [collectedData, setCollectedData] = useState<CollectedData>({
    photoEstimate: null,
    calculatorResults: [],
    templateItems: []
  });
  
  // Template data to pass to calculator
  const [currentTemplateData, setCurrentTemplateData] = useState<TemplateData | null>(null);
  
  // Photo estimate pre-fill data for calculator
  const [photoEstimatePreFill, setPhotoEstimatePreFill] = useState<PhotoEstimatePreFill | null>(null);

  // Check for draft data on mount (for returning users)
  useEffect(() => {
    if (user && hasDraft && draftData) {
      setShowDraftResume(true);
    }
  }, [user, hasDraft, draftData]);

  // Auto-save draft for authenticated users
  useEffect(() => {
    if (user && (collectedData.photoEstimate || collectedData.calculatorResults.length > 0 || collectedData.templateItems.length > 0)) {
      saveDraft(collectedData);
    }
  }, [user, collectedData, saveDraft]);

  // Handle resuming from draft
  const handleResumeDraft = () => {
    if (draftData) {
      setCollectedData(draftData);
      toast.success("Welcome back! Your progress has been restored.");
    }
    setShowDraftResume(false);
  };

  const handleStartFresh = () => {
    clearDraft();
    setShowDraftResume(false);
  };

  // Callbacks to collect data from child components
  const handlePhotoEstimateComplete = useCallback((estimate: any) => {
    setCollectedData(prev => ({ ...prev, photoEstimate: estimate }));
  }, []);

  const handleCalculatorComplete = useCallback((result: any) => {
    setCollectedData(prev => ({
      ...prev,
      calculatorResults: [...prev.calculatorResults, result]
    }));
  }, []);

  const handleTemplateSelect = useCallback((template: any) => {
    setCollectedData(prev => ({
      ...prev,
      templateItems: [...prev.templateItems, template]
    }));
  }, []);

  // Handle template continue - go to calculator with template data
  const handleTemplateContinueToCalculator = useCallback((template: TemplateData) => {
    setCurrentTemplateData(template);
    setActiveTab("calculator");
  }, []);

  // Handle photo estimate continue - go to calculator with area data
  const handlePhotoEstimateContinueToCalculator = useCallback((area: number, areaUnit: string) => {
    setPhotoEstimatePreFill({ area, areaUnit });
    setActiveTab("calculator");
  }, []);

  // Navigate to summary with collected data
  const goToSummary = () => {
    if (!user) {
      setAuthGateFeature("summary");
      setShowAuthGate(true);
      return;
    }

    const hasData = collectedData.photoEstimate || 
                    collectedData.calculatorResults.length > 0 || 
                    collectedData.templateItems.length > 0;

    if (!hasData) {
      toast.info("Add some data (photo, calculator, template) to create a summary");
      return;
    }

    // Clear draft when going to summary
    clearDraft();

    // Encode data as URL params for the summary page
    const params = new URLSearchParams();
    if (collectedData.photoEstimate) {
      params.set("photoEstimate", encodeURIComponent(JSON.stringify(collectedData.photoEstimate)));
    }
    if (collectedData.calculatorResults.length > 0) {
      params.set("calculatorResults", encodeURIComponent(JSON.stringify(collectedData.calculatorResults)));
    }
    if (collectedData.templateItems.length > 0) {
      params.set("templateItems", encodeURIComponent(JSON.stringify(collectedData.templateItems)));
    }

    navigate(`/buildunion/summary?${params.toString()}`);
  };

  // Handle Skip to Blueprints click
  const handleSkipToBlueprints = async () => {
    // Guests must sign in first
    if (!user) {
      setAuthGateFeature("blueprints");
      setShowAuthGate(true);
      return;
    }

    const hasData = collectedData.photoEstimate || 
                    collectedData.calculatorResults.length > 0 || 
                    collectedData.templateItems.length > 0;

    // If user has collected data, show merge dialog
    if (hasData) {
      setShowMergeDialog(true);
      return;
    }

    // Otherwise go directly to blueprints
    await navigateToBlueprints(false);
  };

  // Navigate to blueprint upload (PRO Mode)
  const navigateToBlueprints = async (mergeData: boolean) => {
    // Check if premium or has trials
    if (!isPremium && !hasTrialsRemaining) {
      toast.error("You've used all free trials. Upgrade to Premium for unlimited blueprint analysis.");
      navigate("/buildunion/pricing");
      return;
    }

    // Use one trial if not premium
    if (!isPremium) {
      const success = await useOneTrial();
      if (success) {
        toast.success(`Blueprint analysis trial used. ${remainingTrials - 1} remaining.`);
      }
    }

    // Clear draft when navigating away
    clearDraft();

    // Build navigation params
    const params = new URLSearchParams();
    if (mergeData) {
      params.set("mergeQuickMode", "true");
      if (collectedData.photoEstimate) {
        params.set("photoEstimate", encodeURIComponent(JSON.stringify(collectedData.photoEstimate)));
      }
      if (collectedData.calculatorResults.length > 0) {
        params.set("calculatorResults", encodeURIComponent(JSON.stringify(collectedData.calculatorResults)));
      }
      if (collectedData.templateItems.length > 0) {
        params.set("templateItems", encodeURIComponent(JSON.stringify(collectedData.templateItems)));
      }
    }

    navigate(`/buildunion/workspace/new?${params.toString()}`);
  };

  // Handle tab change with auth gates
  const handleTabChange = (tab: string) => {
    // Quote and Contract tabs require auth
    if ((tab === "quote" || tab === "contract") && !user) {
      setAuthGateFeature("quote");
      setShowAuthGate(true);
      return;
    }
    setActiveTab(tab);
  };

  // Count collected items for badge
  const collectedItemsCount = 
    (collectedData.photoEstimate ? 1 : 0) +
    collectedData.calculatorResults.length +
    collectedData.templateItems.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BuildUnionHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-background py-8 sm:py-12 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion")}
              className="gap-2 text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-amber-600 uppercase tracking-wide">Quick Mode</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Quick Estimates & Quotes
                </h1>
                <p className="text-muted-foreground max-w-xl">
                  No blueprints? No problem. Get instant material estimates, use project templates, 
                  calculate quantities, and generate professional quotes in minutes.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Summary Button */}
                <Button
                  onClick={goToSummary}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Summary</span>
                  {collectedItemsCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                      {collectedItemsCount}
                    </Badge>
                  )}
                  {!user && <Lock className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Guest Progress Bar */}
        <GuestProgressBar 
          hasPhotoEstimate={!!collectedData.photoEstimate} 
          className="container mx-auto px-4 sm:px-6 mt-4"
        />

        {/* Collected Data Indicator */}
        {collectedItemsCount > 0 && (
          <div className="container mx-auto px-4 sm:px-6 pt-4">
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-700">
                <strong>{collectedItemsCount}</strong> items collected for summary
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={goToSummary}
                className="ml-auto text-amber-600 hover:text-amber-700"
              >
                View →
              </Button>
            </div>
          </div>
        )}

        {/* Main Content with Tabs */}
        <section className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-5 gap-2 h-auto p-1 bg-muted/50 mb-6">
              <TabsTrigger 
                value="photo" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Photo</span>
                <span className="sm:hidden">Photo</span>
                {collectedData.photoEstimate && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">✓</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
                <span className="sm:hidden">Tmpl</span>
                {collectedData.templateItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{collectedData.templateItems.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="calculator" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Calc</span>
                <span className="sm:hidden">Calc</span>
                {collectedData.calculatorResults.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">✓</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="quote" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Quote</span>
                <span className="sm:hidden">Quote</span>
                {!user && <Lock className="w-3 h-3 text-muted-foreground" />}
              </TabsTrigger>
              <TabsTrigger 
                value="contract" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <ClipboardSignature className="w-4 h-4" />
                <span className="hidden sm:inline">Contract</span>
                <span className="sm:hidden">Contract</span>
                {!user && <Lock className="w-3 h-3 text-muted-foreground" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="mt-0">
              <QuickModePhotoEstimate 
                onEstimateComplete={handlePhotoEstimateComplete}
                onContinueToTemplates={() => setActiveTab("templates")}
                onContinueToCalculator={handlePhotoEstimateContinueToCalculator}
              />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <QuickModeTemplates 
                onTemplateSelect={handleTemplateSelect}
                onContinueToCalculator={handleTemplateContinueToCalculator}
              />
            </TabsContent>

            <TabsContent value="calculator" className="mt-0">
              <QuickModeCalculator 
                onCalculatorComplete={handleCalculatorComplete}
                onContinue={() => handleTabChange("quote")}
                templateData={currentTemplateData}
                prefillArea={photoEstimatePreFill?.area || collectedData.photoEstimate?.detectedArea}
                prefillAreaUnit={photoEstimatePreFill?.areaUnit || collectedData.photoEstimate?.areaUnit || "sq ft"}
              />
            </TabsContent>

            <TabsContent value="quote" className="mt-0">
              <QuickModeQuoteGenerator 
                collectedData={collectedData}
                onSkipToSummary={goToSummary}
                onQuoteGenerated={(quote) => {
                  // Navigate to summary with quote data
                  const params = new URLSearchParams();
                  if (collectedData.photoEstimate) {
                    params.set("photoEstimate", encodeURIComponent(JSON.stringify(collectedData.photoEstimate)));
                  }
                  if (collectedData.calculatorResults.length > 0) {
                    params.set("calculatorResults", encodeURIComponent(JSON.stringify(collectedData.calculatorResults)));
                  }
                  if (collectedData.templateItems.length > 0) {
                    params.set("templateItems", encodeURIComponent(JSON.stringify(collectedData.templateItems)));
                  }
                  params.set("quote", encodeURIComponent(JSON.stringify(quote)));
                  clearDraft();
                  navigate(`/buildunion/summary?${params.toString()}`);
                }}
                onSaveToProjects={(data) => {
                  // Navigate to project details after saving
                  clearDraft();
                  toast.success("Project created! Redirecting...");
                  setTimeout(() => {
                    navigate(`/buildunion/project/${data.projectId}`);
                  }, 1000);
                }}
              />
            </TabsContent>

            <TabsContent value="contract" className="mt-0">
              <ContractGenerator 
                quoteData={null}
                collectedData={collectedData}
                onContractGenerated={(contractData) => {
                  toast.success("Contract generated successfully!");
                }}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <BuildUnionFooter />

      {/* Onboarding for first-time users */}
      {showOnboarding && (
        <QuickModeOnboarding
          onComplete={() => setShowOnboarding(false)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Data Merge Dialog */}
      <DataMergeDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        collectedData={collectedData}
        onMerge={() => {
          setShowMergeDialog(false);
          navigateToBlueprints(true);
        }}
        onReplace={() => {
          setShowMergeDialog(false);
          navigateToBlueprints(false);
        }}
      />

      {/* Auth Gate Modal */}
      <AuthGateModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        feature={authGateFeature}
        incentiveMessage={
          authGateFeature === "blueprints" 
            ? "Register now and get 3 FREE blueprint analyses!"
            : undefined
        }
      />

      {/* Draft Resume Dialog - removed as per user request */}
    </div>
  );
};

export default BuildUnionQuickMode;
