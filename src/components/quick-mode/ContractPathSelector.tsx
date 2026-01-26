import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, FileUp, Users, Brain, ListTodo, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuthGateModal from "@/components/AuthGateModal";

// Types for collected data from Quick Mode synthesis
interface CollectedData {
  photoEstimate: {
    area?: number;
    areaUnit?: string;
    materials?: Array<{ name: string; quantity: string; unit: string }>;
    confidence?: string;
  } | null;
  calculatorResults: Array<{
    calculatorType?: string;
    area?: number;
    areaUnit?: string;
    materials?: Array<{ name: string; quantity: number; unit: string }>;
    totalCost?: number;
  }>;
  templateItems: Array<{
    name?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>;
}

// Quote data from the Quote Generator step
interface QuoteData {
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  totalAmount?: number;
  scopeOfWork?: string;
}

interface ContractPathSelectorProps {
  collectedData: CollectedData;
  quoteData: QuoteData | null;
  onSelectSimple: () => void;
  onClearDraft: () => void;
}

const ContractPathSelector = ({
  collectedData,
  quoteData,
  onSelectSimple,
  onClearDraft,
}: ContractPathSelectorProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { remainingTrials, hasTrialsRemaining, useOneTrial } = useDbTrialUsage("blueprint_analysis");
  
  const [isCreating, setIsCreating] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  
  const isPremium = subscription?.subscribed === true;
  const canAccessTeam = isPremium || hasTrialsRemaining;

  // Build scope of work from collected data
  const buildScopeOfWork = (): string => {
    const parts: string[] = [];
    
    if (collectedData.photoEstimate?.area) {
      parts.push(`Estimated area: ${collectedData.photoEstimate.area} ${collectedData.photoEstimate.areaUnit || 'sq ft'}`);
    }
    
    if (collectedData.photoEstimate?.materials?.length) {
      const materialNames = collectedData.photoEstimate.materials.map(m => m.name).join(', ');
      parts.push(`Materials: ${materialNames}`);
    }
    
    if (collectedData.templateItems.length > 0) {
      const templateNames = collectedData.templateItems.map(t => t.name).filter(Boolean).join(', ');
      if (templateNames) {
        parts.push(`Templates applied: ${templateNames}`);
      }
    }
    
    if (quoteData?.scopeOfWork) {
      parts.push(quoteData.scopeOfWork);
    }
    
    return parts.join('\n');
  };

  // Create a full Team Project with all collected data
  const createTeamProject = async () => {
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    // Check tier access
    if (!isPremium && !hasTrialsRemaining) {
      toast.error("Upgrade to Pro for Team Projects");
      navigate("/buildunion/pricing");
      return;
    }

    setIsCreating(true);

    try {
      // Use one trial if not premium
      if (!isPremium) {
        const success = await useOneTrial();
        if (success) {
          toast.success(`Blueprint trial used. ${remainingTrials - 1} remaining.`);
        }
      }

      const projectName = quoteData?.clientName 
        ? `${quoteData.clientName} Project`
        : "Quick Mode Project";
      
      const scopeOfWork = buildScopeOfWork();

      // 1. Create the project in the projects table
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName,
          description: `Generated from Quick Mode.\n${scopeOfWork}`,
          address: quoteData?.clientAddress || null,
          status: "draft",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Create the project summary with team mode
      const { error: summaryError } = await supabase
        .from("project_summaries")
        .insert({
          project_id: project.id,
          user_id: user.id,
          mode: "team", // Team mode enabled
          photo_estimate: collectedData.photoEstimate || {},
          calculator_results: collectedData.calculatorResults || [],
          template_items: collectedData.templateItems || [],
          line_items: quoteData?.lineItems || [],
          total_cost: quoteData?.totalAmount || 0,
          client_name: quoteData?.clientName || null,
          client_email: quoteData?.clientEmail || null,
          client_phone: quoteData?.clientPhone || null,
          client_address: quoteData?.clientAddress || null,
          status: "draft",
        });

      if (summaryError) throw summaryError;

      // Clear the Quick Mode draft
      onClearDraft();

      toast.success("Team Project created! Upload your blueprints.");
      
      // Navigate to project with documents tab
      navigate(`/buildunion/workspace/project/${project.id}?tab=documents`);
    } catch (error) {
      console.error("Error creating team project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleBlueprintSelect = () => {
    if (!user) {
      setShowAuthGate(true);
      return;
    }
    createTeamProject();
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          How would you like to complete this project?
        </h2>
        <p className="text-muted-foreground">
          Choose your path based on your project needs
        </p>
      </div>

      {/* Path Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Simple Contract Card */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 hover:shadow-lg",
            "hover:border-amber-400 border-border"
          )}
          onClick={onSelectSimple}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FileText className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Simple Contract</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a professional contract for your solo project. Perfect for individual work.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 text-xs mb-4">
              <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded">
                Solo Mode
              </span>
              <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded">
                Quick & Easy
              </span>
            </div>
            
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200">
              Continue Solo
            </Badge>
          </CardContent>
        </Card>

        {/* Blueprint Team Project Card */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 hover:shadow-lg",
            canAccessTeam 
              ? "hover:border-cyan-400 border-border" 
              : "opacity-75 border-border"
          )}
          onClick={handleBlueprintSelect}
        >
          <CardContent className="p-6 text-center relative">
            {isCreating && (
              <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center z-10">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                  <span className="text-sm font-medium">Creating project...</span>
                </div>
              </div>
            )}
            
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <FileUp className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-foreground">Blueprint Team Project</h3>
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Create a full team project with blueprint analysis. All your Quick Mode data transfers automatically.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 text-xs mb-4">
              <span className="px-2 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded flex items-center gap-1">
                <Users className="w-3 h-3" />
                Team Members
              </span>
              <span className="px-2 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Blueprint AI
              </span>
              <span className="px-2 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded flex items-center gap-1">
                <ListTodo className="w-3 h-3" />
                Task Tracking
              </span>
            </div>
            
            {!isPremium && hasTrialsRemaining && (
              <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-200">
                {remainingTrials} trial{remainingTrials !== 1 ? 's' : ''} remaining
              </Badge>
            )}
            
            {isPremium && (
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
                Unlimited Access
              </Badge>
            )}
            
            {!canAccessTeam && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/buildunion/pricing");
                }}
              >
                Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Transfer Info */}
      {(collectedData.photoEstimate || collectedData.calculatorResults.length > 0 || collectedData.templateItems.length > 0) && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-3xl mx-auto">
          <h4 className="text-sm font-medium mb-2 text-foreground">Your collected data will transfer:</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {collectedData.photoEstimate && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200">
                ✓ Photo Estimate
              </Badge>
            )}
            {collectedData.calculatorResults.length > 0 && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200">
                ✓ Calculator ({collectedData.calculatorResults.length})
              </Badge>
            )}
            {collectedData.templateItems.length > 0 && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200">
                ✓ Templates ({collectedData.templateItems.length})
              </Badge>
            )}
            {quoteData?.lineItems && quoteData.lineItems.length > 0 && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200">
                ✓ Quote Items ({quoteData.lineItems.length})
              </Badge>
            )}
            {quoteData?.clientName && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200">
                ✓ Client Info
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Auth Gate Modal */}
      <AuthGateModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        feature="blueprints"
        incentiveMessage="Register now to create Team Projects and get 3 FREE blueprint analyses!"
      />
    </div>
  );
};

export default ContractPathSelector;
