import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectMode, ProjectMode } from "@/hooks/useProjectMode";
import { 
  Users, 
  User, 
  Loader2, 
  Crown,
  FileText,
  Target,
  Clock,
  Shield,
  MessageSquare,
  Map
} from "lucide-react";

interface ProjectModeToggleProps {
  summaryId?: string;
  projectId?: string | null;
  initialMode?: ProjectMode;
  onModeChange?: (newMode: ProjectMode) => void;
  variant?: "switch" | "button" | "compact" | "icon";
  showLabel?: boolean;
}

export function ProjectModeToggle({
  summaryId,
  projectId,
  initialMode = "solo",
  onModeChange,
  variant = "switch",
  showLabel = true,
}: ProjectModeToggleProps) {
  const navigate = useNavigate();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  const {
    mode,
    isTeamMode,
    canAccessTeamMode,
    isLoading,
    toggleMode,
    switchToTeam,
  } = useProjectMode({
    summaryId,
    projectId,
    initialMode,
    onModeChange,
  });

  const handleToggle = async () => {
    if (!isTeamMode && !canAccessTeamMode) {
      setShowUpgradeDialog(true);
      return;
    }
    await toggleMode();
  };

  const handleUpgrade = () => {
    setShowUpgradeDialog(false);
    navigate("/buildunion/pricing");
  };

  const teamFeatures = [
    { icon: Users, label: "Add team members with roles", tier: "PRO" },
    { icon: FileText, label: "Upload blueprints & documents", tier: "PRO" },
    { icon: Target, label: "Assign tasks & track progress", tier: "PRO" },
    { icon: MessageSquare, label: "Direct messaging with team", tier: "PRO" },
    { icon: Map, label: "Team location map view", tier: "PRO" },
    { icon: Clock, label: "Set timelines & milestones", tier: "PRO" },
    { icon: Shield, label: "Operational Truth verification", tier: "PREMIUM" },
  ];

  // Icon variant - circular icon button (for card headers)
  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggle}
              disabled={isLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isTeamMode
                  ? "bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700"
                  : "bg-amber-100 hover:bg-amber-200 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : isTeamMode ? (
                <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isTeamMode ? "Switch to Solo mode" : "Switch to Team mode"}</p>
            {!canAccessTeamMode && !isTeamMode && (
              <p className="text-xs text-muted-foreground">Requires Pro plan</p>
            )}
          </TooltipContent>
        </Tooltip>

        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          onUpgrade={handleUpgrade}
          features={teamFeatures}
        />
      </TooltipProvider>
    );
  }

  // Compact variant - just icons
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isLoading}
              className={`gap-1.5 ${
                isTeamMode
                  ? "text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                  : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isTeamMode ? (
                <Users className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">
                {isTeamMode ? "Team" : "Solo"}
              </span>
              {!canAccessTeamMode && !isTeamMode && (
                <Crown className="h-3 w-3 text-amber-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isTeamMode ? "Switch to Solo mode" : "Switch to Team mode"}</p>
            {!canAccessTeamMode && !isTeamMode && (
              <p className="text-xs text-muted-foreground">Requires Pro plan</p>
            )}
          </TooltipContent>
        </Tooltip>

        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          onUpgrade={handleUpgrade}
          features={teamFeatures}
        />
      </TooltipProvider>
    );
  }

  // Button variant
  if (variant === "button") {
    return (
      <>
        <Button
          onClick={handleToggle}
          disabled={isLoading}
          variant={isTeamMode ? "default" : "outline"}
          className={`gap-2 ${
            isTeamMode
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              : "border-amber-200 hover:bg-amber-50 hover:border-amber-300"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isTeamMode ? (
            <Users className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
          {showLabel && (
            <span>{isTeamMode ? "Team Mode" : "Solo Mode"}</span>
          )}
          {!canAccessTeamMode && !isTeamMode && (
            <Badge variant="outline" className="ml-1 text-xs bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200">
              PRO
            </Badge>
          )}
        </Button>

        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          onUpgrade={handleUpgrade}
          features={teamFeatures}
        />
      </>
    );
  }

  // Default switch variant
  return (
    <>
      <div className="flex items-center gap-3">
        {/* Solo mode label with active background */}
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${
          !isTeamMode 
            ? "bg-amber-100 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700" 
            : ""
        }`}>
          <User className={`h-4 w-4 ${!isTeamMode ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
          {showLabel && (
            <span className={`text-sm font-medium ${!isTeamMode ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
              Solo
            </span>
          )}
        </div>

        <Switch
          checked={isTeamMode}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-blue-500"
        />

        {/* Team mode label with active background */}
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${
          isTeamMode 
            ? "bg-cyan-100 border border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700" 
            : ""
        }`}>
          <Users className={`h-4 w-4 ${isTeamMode ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"}`} />
          {showLabel && (
            <span className={`text-sm font-medium ${isTeamMode ? "text-cyan-700 dark:text-cyan-300" : "text-muted-foreground"}`}>
              Team
            </span>
          )}
          {!canAccessTeamMode && (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200">
              PRO
            </Badge>
          )}
        </div>

        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        onUpgrade={handleUpgrade}
        features={teamFeatures}
      />
    </>
  );
}

// Upgrade dialog component
interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
  features: Array<{ icon: any; label: string; tier: string }>;
}

function UpgradeDialog({ open, onOpenChange, onUpgrade, features }: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade to Pro for Team Mode
          </DialogTitle>
          <DialogDescription>
            Unlock powerful collaboration features for your construction projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Team Mode Features</h4>
            <div className="space-y-2">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{feature.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      feature.tier === "PREMIUM"
                        ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-200"
                        : "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 border-cyan-200"
                    }
                  >
                    {feature.tier}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-200">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-cyan-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Pro Plan - $19.99/month</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Unlimited projects, team collaboration, and priority support.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Stay on Solo
          </Button>
          <Button
            onClick={onUpgrade}
            className="flex-1 gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
