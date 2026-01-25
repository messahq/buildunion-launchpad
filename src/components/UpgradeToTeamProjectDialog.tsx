import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Users,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Crown,
  FileText,
  Clock,
  Target,
  Shield,
} from "lucide-react";

interface UpgradeToTeamProjectDialogProps {
  summaryId?: string;
  projectId?: string;
  projectName?: string;
  lineItemsCount?: number;
  totalAmount?: number;
  formatCurrency?: (amount: number) => string;
  children: React.ReactNode;
}

export function UpgradeToTeamProjectDialog({
  summaryId,
  projectId,
  projectName,
  lineItemsCount = 0,
  totalAmount = 0,
  formatCurrency = (n) => `$${n.toFixed(2)}`,
  children,
}: UpgradeToTeamProjectDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [open, setOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const canUpgrade = subscription.tier === "pro" || subscription.tier === "premium" || subscription.tier === "enterprise";
  const hasProject = !!projectId;

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade project");
      return;
    }

    if (!hasProject && !summaryId) {
      toast.error("No project data to upgrade");
      return;
    }

    setUpgrading(true);

    try {
      if (hasProject) {
        // Project already exists, just navigate to it
        toast.success("Navigating to team project view...");
        setOpen(false);
        navigate(`/buildunion/project/${projectId}`);
        return;
      }

      // Create new project from summary
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName || `Team Project - ${new Date().toLocaleDateString()}`,
          status: "active",
          description: "Upgraded from Quick Mode for team collaboration",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Link summary to the new project
      if (summaryId) {
        const { error: updateError } = await supabase
          .from("project_summaries")
          .update({
            project_id: newProject.id,
            status: "upgraded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", summaryId);

        if (updateError) throw updateError;
      }

      toast.success("✅ Project upgraded to team mode!");
      setOpen(false);

      // Navigate to the project details page
      setTimeout(() => {
        navigate(`/buildunion/project/${newProject.id}`);
      }, 500);
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast.error(error.message || "Failed to upgrade project");
    } finally {
      setUpgrading(false);
    }
  };

  const features = [
    { icon: Users, label: "Add team members with roles", tier: "PRO" },
    { icon: FileText, label: "Upload blueprints & documents", tier: "PRO" },
    { icon: Target, label: "Assign tasks & track progress", tier: "PRO" },
    { icon: Clock, label: "Set timelines & milestones", tier: "PRO" },
    { icon: Shield, label: "Operational Truth verification", tier: "PREMIUM" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-500" />
            Upgrade to Team Project
          </DialogTitle>
          <DialogDescription>
            Convert this Quick Mode estimate into a full team project with collaboration features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Summary Stats */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Quick Mode Data to Transfer</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{lineItemsCount} line items</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              All estimates, contracts & documents will be preserved
            </div>
          </div>

          <Separator />

          {/* Features List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Team Project Features</h4>
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

          {!canUpgrade && (
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-200">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-cyan-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Pro Plan Required</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upgrade to Pro ($19.99/mo) to unlock team collaboration features.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    onClick={() => {
                      setOpen(false);
                      navigate("/buildunion/pricing");
                    }}
                  >
                    View Plans
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {canUpgrade && (
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="flex-1 gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {upgrading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  {hasProject ? "Open Team View" : "Upgrade Project"}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
