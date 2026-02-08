import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, Camera, Calculator, FileText, Crown, FileUp, Lock, Sparkles, PenLine, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProjectModal = ({ open, onOpenChange }: NewProjectModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Manual project creation state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualProjectName, setManualProjectName] = useState("");
  const [manualArea, setManualArea] = useState("");
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  
  const { 
    remainingTrials: estimateTrials, 
    maxTrials: estimateMaxTrials,
    isPremiumUser: isPremium 
  } = useDbTrialUsage("quick_estimate");

  const { 
    remainingTrials: blueprintTrials, 
    maxTrials: blueprintMaxTrials,
    hasTrialsRemaining: hasBlueprintTrials
  } = useDbTrialUsage("blueprint_analysis");

  const handleQuickMode = () => {
    onOpenChange(false);
    navigate("/buildunion/quick?flow=create");
  };

  const handleBlueprintMode = () => {
    if (!user) {
      onOpenChange(false);
      navigate("/buildunion/login?redirect=/buildunion/workspace/new");
      return;
    }
    
    if (!isPremium && !hasBlueprintTrials) {
      toast.error("You've used all free trials. Upgrade to Pro for unlimited access.");
      onOpenChange(false);
      navigate("/buildunion/pricing");
      return;
    }
    
    onOpenChange(false);
    navigate("/buildunion/workspace/new");
  };

  const handleManualProjectCreate = async () => {
    if (!user) {
      toast.error("Please sign in to create a project");
      return;
    }
    
    if (!manualProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    
    setIsCreatingManual(true);
    
    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: manualProjectName.trim(),
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // Parse area if provided
      const areaValue = manualArea ? parseFloat(manualArea) : null;
      
      // Create project summary with manual data (no AI)
      // The Materials tab will use Inferred Base Area if areaValue is null
      const { data: summary, error: summaryError } = await supabase
        .from("project_summaries")
        .insert({
          project_id: project.id,
          user_id: user.id,
          mode: "solo",
          status: "draft",
          // Store manual area in ai_workflow_config for the Materials tab to pick up
          ai_workflow_config: areaValue ? {
            manualArea: areaValue,
            userEdits: { wastePercent: 10 },
            createdManually: true,
          } : {
            userEdits: { wastePercent: 10 },
            createdManually: true,
          },
          // Initialize with empty materials - user will add manually
          line_items: {
            materials: [],
            labor: [],
            other: [],
          },
        })
        .select()
        .single();
      
      if (summaryError) throw summaryError;
      
      toast.success("Manual project created successfully!");
      onOpenChange(false);
      setShowManualForm(false);
      setManualProjectName("");
      setManualArea("");
      
      // Navigate to the project details page
      navigate(`/buildunion/project/${project.id}`);
      
    } catch (error) {
      console.error("Error creating manual project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsCreatingManual(false);
    }
  };

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowManualForm(false);
      setManualProjectName("");
      setManualArea("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">
            {showManualForm ? "Create Manual Project" : "Start New Project"}
          </DialogTitle>
          <DialogDescription>
            {showManualForm 
              ? "Enter project details manually (no AI analysis)" 
              : "Choose how you want to create your estimate"}
          </DialogDescription>
        </DialogHeader>

        {showManualForm ? (
          /* Manual Project Form */
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Project Name *</Label>
              <Input
                id="manual-name"
                placeholder="e.g., Kitchen Renovation"
                value={manualProjectName}
                onChange={(e) => setManualProjectName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manual-area">Area (sq ft) - Optional</Label>
              <Input
                id="manual-area"
                type="number"
                placeholder="e.g., 1350"
                value={manualArea}
                onChange={(e) => setManualArea(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to enter materials with quantities directly in the Dashboard
              </p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowManualForm(false)}
                disabled={isCreatingManual}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleManualProjectCreate}
                disabled={isCreatingManual || !manualProjectName.trim()}
              >
                {isCreatingManual ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Mode Selection */
          <>
            {/* Free Trial Info Banner */}
            {user && !isPremium && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">Your Free Trials:</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-center p-2 bg-white rounded border flex-1">
                    <div className="font-bold text-amber-600">{estimateTrials}/{estimateMaxTrials}</div>
                    <div className="text-xs text-muted-foreground">AI Estimates</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border flex-1">
                    <div className="font-bold text-cyan-600">{blueprintTrials}/{blueprintMaxTrials}</div>
                    <div className="text-xs text-muted-foreground">Blueprints</div>
                  </div>
                </div>
              </div>
            )}

            <div className="py-2 space-y-4">
              {/* Quick Mode Option */}
              <Card 
                className="cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group border-2"
                onClick={handleQuickMode}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">Quick Mode</h3>
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                          Fast
                        </Badge>
                        {isPremium && (
                          <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                            <Crown className="w-3 h-3" />
                            Unlimited
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Photo-based estimates, templates, and calculators for quick project creation.
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-amber-500" />
                          Photo Estimate
                        </span>
                        <span className="flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5 text-amber-500" />
                          Calculator
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          PDF Quote
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Blueprint Analysis Option - PRO */}
              <Card 
                className="cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all group border-2"
                onClick={handleBlueprintMode}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <FileUp className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground text-lg">Blueprint Analysis</h3>
                        <Badge className="text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                          PRO
                        </Badge>
                        {/* Tier indicator */}
                        {!user ? (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        ) : isPremium ? (
                          <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                            <Crown className="w-3 h-3" />
                            Unlimited
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {blueprintTrials}/{blueprintMaxTrials} trials
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Upload blueprints for M.E.S.S.A. AI deep analysis and automated material takeoff.
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                          AI Analysis
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-cyan-500" />
                          Material Takeoff
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Project Option - NEW */}
              <Card 
                className="cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group border-2 border-dashed"
                onClick={() => user ? setShowManualForm(true) : navigate("/buildunion/login")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
                      <PenLine className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">Manual Project</h3>
                        <Badge variant="outline" className="text-xs">
                          Skip AI
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create a blank project and enter all materials, quantities, and costs manually.
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <PenLine className="w-3.5 h-3.5 text-slate-500" />
                          Full Control
                        </span>
                        <span className="flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5 text-slate-500" />
                          Custom Input
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {isPremium ? (
                "Unlimited access with your Pro subscription"
              ) : !user ? (
                "Sign in to access all project creation options"
              ) : (
                <>
                  <span className="font-medium text-cyan-600">Upgrade to Pro</span> for unlimited access to all features
                </>
              )}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
