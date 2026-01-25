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
import QuickModeProgressBar from "@/components/quick-mode/QuickModeProgressBar";
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
import { useQuickModeProgress, QuickModeProgressData } from "@/hooks/useQuickModeProgress";
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

// Quote data for progress tracking
interface QuoteProgressData {
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyEmail: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPhone: string;
  lineItemsCount: number;
}

// Contract data for progress tracking
interface ContractProgressData {
  contractorName: string;
  contractorAddress: string;
  contractorLicense: string;
  clientName: string;
  clientAddress: string;
  scopeOfWork: string;
  totalAmount: number;
  startDate: string;
  estimatedEndDate: string;
  contractorSignature: boolean;
  clientSignature: boolean;
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

  // Quote and Contract progress tracking
  const [quoteProgress, setQuoteProgress] = useState<QuoteProgressData>({
    companyName: "",
    companyPhone: "",
    companyAddress: "",
    companyEmail: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    clientPhone: "",
    lineItemsCount: 0,
  });

  const [contractProgress, setContractProgress] = useState<ContractProgressData>({
    contractorName: "",
    contractorAddress: "",
    contractorLicense: "",
    clientName: "",
    clientAddress: "",
    scopeOfWork: "",
    totalAmount: 0,
    startDate: "",
    estimatedEndDate: "",
    contractorSignature: false,
    clientSignature: false,
  });

  // Determine tier for progress tracking
  const userTier = subscription?.tier === "premium" || subscription?.tier === "enterprise" 
    ? subscription.tier 
    : subscription?.subscribed 
      ? "pro" 
      : "free";

  // Build progress data for the hook
  const progressData: QuickModeProgressData = {
    photo: {
      hasData: !!collectedData.photoEstimate,
      area: collectedData.photoEstimate?.detectedArea || collectedData.photoEstimate?.area,
      areaUnit: collectedData.photoEstimate?.areaUnit,
    },
    templates: {
      hasData: collectedData.templateItems.length > 0,
      count: collectedData.templateItems.length,
    },
    calculator: {
      hasData: collectedData.calculatorResults.length > 0,
      count: collectedData.calculatorResults.length,
    },
    quote: {
      yourInfo: {
        companyName: !!quoteProgress.companyName,
        phone: !!quoteProgress.companyPhone,
        address: !!quoteProgress.companyAddress,
        email: !!quoteProgress.companyEmail,
      },
      client: {
        name: !!quoteProgress.clientName,
        email: !!quoteProgress.clientEmail,
        address: !!quoteProgress.clientAddress,
        phone: !!quoteProgress.clientPhone,
      },
      lineItems: {
        hasItems: quoteProgress.lineItemsCount > 0,
        count: quoteProgress.lineItemsCount,
      },
    },
    contract: {
      contractor: {
        name: !!contractProgress.contractorName,
        address: !!contractProgress.contractorAddress,
        license: !!contractProgress.contractorLicense,
      },
      client: {
        name: !!contractProgress.clientName,
        address: !!contractProgress.clientAddress,
      },
      terms: {
        scopeOfWork: !!contractProgress.scopeOfWork,
        totalAmount: contractProgress.totalAmount > 0,
      },
      timeline: {
        startDate: !!contractProgress.startDate,
        estimatedEndDate: !!contractProgress.estimatedEndDate,
      },
      signatures: {
        contractor: contractProgress.contractorSignature,
        client: contractProgress.clientSignature,
      },
    },
    // Team features - will be populated when in Team mode
    documents: {
      hasDocuments: false,
      count: 0,
      blueprintsUploaded: false,
      photosUploaded: !!collectedData.photoEstimate,
    },
    team: {
      hasMembers: false,
      count: 0,
      rolesAssigned: false,
      invitesSent: false,
    },
    tasks: {
      hasTasks: false,
      count: 0,
      completedCount: 0,
      overdueCount: 0,
    },
    tier: userTier as "free" | "pro" | "premium" | "enterprise",
  };

  const progress = useQuickModeProgress(progressData);
  
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

        {/* Quick Mode Progress Bar */}
        <section className="container mx-auto px-4 sm:px-6 pt-4">
          <QuickModeProgressBar
            percentage={progress.percentage}
            steps={progress.steps}
            warnings={progress.warnings}
            status={progress.status}
            statusLabel={progress.statusLabel}
            statusColor={progress.statusColor}
            activeTab={activeTab}
            onTabClick={handleTabChange}
            isPro={progress.isPro}
            soloComplete={progress.soloComplete}
            teamComplete={progress.teamComplete}
          />
        </section>

        {/* Guest Progress Bar */}
        <GuestProgressBar 
          hasPhotoEstimate={!!collectedData.photoEstimate} 
          className="container mx-auto px-4 sm:px-6"
        />

        {/* Main Content with Tabs */}
        <section className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                prefillArea={photoEstimatePreFill?.area || collectedData.photoEstimate?.area}
                prefillAreaUnit={photoEstimatePreFill?.areaUnit || collectedData.photoEstimate?.areaUnit || "sq ft"}
              />
            </TabsContent>

            <TabsContent value="quote" className="mt-0">
              <QuickModeQuoteGenerator 
                collectedData={collectedData}
                onSkipToSummary={goToSummary}
                onProgressUpdate={(data) => {
                  setQuoteProgress({
                    companyName: data.companyName || "",
                    companyPhone: data.companyPhone || "",
                    companyAddress: data.companyAddress || "",
                    companyEmail: data.companyEmail || "",
                    clientName: data.clientName || "",
                    clientEmail: data.clientEmail || "",
                    clientAddress: data.clientAddress || "",
                    clientPhone: data.clientPhone || "",
                    lineItemsCount: data.lineItemsCount || 0,
                  });
                }}
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
                onProgressUpdate={(data) => {
                  setContractProgress({
                    contractorName: data.contractorName || "",
                    contractorAddress: data.contractorAddress || "",
                    contractorLicense: data.contractorLicense || "",
                    clientName: data.clientName || "",
                    clientAddress: data.clientAddress || "",
                    scopeOfWork: data.scopeOfWork || "",
                    totalAmount: data.totalAmount || 0,
                    startDate: data.startDate || "",
                    estimatedEndDate: data.estimatedEndDate || "",
                    contractorSignature: data.contractorSignature || false,
                    clientSignature: data.clientSignature || false,
                  });
                }}
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
