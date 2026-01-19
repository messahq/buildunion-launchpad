import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, FileUp, Camera, Calculator, FileText, Brain, Crown, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { useSubscription } from "@/hooks/useSubscription";

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProjectModal = ({ open, onOpenChange }: NewProjectModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { remainingTrials: blueprintTrials, maxTrials: blueprintMaxTrials } = useDbTrialUsage("blueprint_analysis");
  const { remainingTrials: projectTrials, maxTrials: projectMaxTrials } = useDbTrialUsage("project_creation");
  const { remainingTrials: estimateTrials, maxTrials: estimateMaxTrials } = useDbTrialUsage("quick_estimate");
  const { subscription } = useSubscription();
  const isPremium = subscription?.subscribed === true;

  const handleQuickMode = () => {
    onOpenChange(false);
    navigate("/buildunion/quick?flow=create");
  };

  const handleBlueprintMode = () => {
    onOpenChange(false);
    if (!user) {
      navigate("/buildunion/login", { state: { returnTo: "/buildunion/workspace/new" } });
    } else if (!isPremium && projectTrials === 0) {
      navigate("/buildunion/pricing");
    } else {
      navigate("/buildunion/workspace/new");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Start New Project</DialogTitle>
          <DialogDescription>
            Choose the right method for your project
          </DialogDescription>
        </DialogHeader>

        {/* Free Trial Info Banner */}
        {user && !isPremium && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">Your Free Trial Limits:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-bold text-amber-600">{estimateTrials}/{estimateMaxTrials}</div>
                <div className="text-muted-foreground">AI Estimates</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-bold text-cyan-600">{blueprintTrials}/{blueprintMaxTrials}</div>
                <div className="text-muted-foreground">Blueprint AI</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-bold text-purple-600">{projectTrials}/{projectMaxTrials}</div>
                <div className="text-muted-foreground">Projects</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 py-4">
          {/* Quick Mode Option */}
          <Card 
            className="cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
            onClick={handleQuickMode}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Quick Mode</h3>
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
                    For small jobs without blueprints. Photo-based estimates, templates, calculator.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3 text-amber-500" />
                      Photo Estimate
                      {!isPremium && user && (
                        <Badge variant="outline" className="text-xs ml-1">{estimateTrials} left</Badge>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3 h-3 text-amber-500" />
                      Calculator
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-amber-500" />
                      PDF Quote
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blueprint/M.E.S.S.A. Mode Option */}
          <Card 
            className={`cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all group ${!isPremium && user && projectTrials === 0 ? 'opacity-60' : ''}`}
            onClick={handleBlueprintMode}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Blueprint Analysis</h3>
                    {!user ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="w-3 h-3" />
                        Sign In
                      </Badge>
                    ) : isPremium ? (
                      <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    ) : projectTrials === 0 ? (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <Lock className="w-3 h-3" />
                        Upgrade
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {projectTrials}/{projectMaxTrials} project
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    M.E.S.S.A. dual-engine AI analysis. Upload blueprints and documents.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileUp className="w-3 h-3 text-cyan-500" />
                      PDF Blueprints
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain className="w-3 h-3 text-cyan-500" />
                      AI Analysis
                      {!isPremium && user && (
                        <Badge variant="outline" className="text-xs ml-1">{blueprintTrials} left</Badge>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-cyan-500" />
                      Verified Facts
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isPremium ? (
            "Unlimited access to all features with your Premium subscription"
          ) : (
            "Results from both methods can be combined in one project summary"
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
