import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

export type ProjectMode = "solo" | "team";

interface UseProjectModeOptions {
  summaryId?: string;
  projectId?: string | null;
  initialMode?: ProjectMode;
  onModeChange?: (newMode: ProjectMode) => void;
}

interface UseProjectModeReturn {
  mode: ProjectMode;
  isTeamMode: boolean;
  isSoloMode: boolean;
  canAccessTeamMode: boolean;
  isLoading: boolean;
  switchToTeam: () => Promise<boolean>;
  switchToSolo: () => Promise<boolean>;
  toggleMode: () => Promise<boolean>;
}

export function useProjectMode({
  summaryId,
  projectId,
  initialMode = "solo",
  onModeChange,
}: UseProjectModeOptions): UseProjectModeReturn {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [mode, setMode] = useState<ProjectMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user can access team mode (Pro/Premium/Enterprise)
  const canAccessTeamMode =
    subscription?.tier === "pro" ||
    subscription?.tier === "premium" ||
    subscription?.tier === "enterprise";

  const isTeamMode = mode === "team";
  const isSoloMode = mode === "solo";

  // Switch from Solo to Team mode
  const switchToTeam = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to upgrade to Team mode");
      return false;
    }

    if (!canAccessTeamMode) {
      toast.info("Upgrade to Pro to unlock Team features");
      navigate("/buildunion/pricing");
      return false;
    }

    if (!summaryId) {
      toast.error("No project data to upgrade");
      return false;
    }

    setIsLoading(true);

    try {
      // If project already exists, just update mode
      if (projectId) {
        const { error } = await supabase
          .from("project_summaries")
          .update({ mode: "team" })
          .eq("id", summaryId);

        if (error) throw error;

        setMode("team");
        onModeChange?.("team");
        toast.success("Switched to Team mode");
        return true;
      }

      // Need to create a new project - navigate to project creation with data
      // Get summary data first
      const { data: summary, error: fetchError } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("id", summaryId)
        .maybeSingle();

      if (fetchError || !summary) {
        throw new Error("Failed to fetch project data");
      }

      // Encode data for URL transfer
      const quickModeData = {
        summaryId,
        name: summary.client_name || "",
        address: summary.client_address || "",
        clientName: summary.client_name || "",
        lineItemsCount: Array.isArray(summary.line_items) ? summary.line_items.length : 0,
        totalAmount: summary.total_cost || 0,
        photoEstimate: summary.photo_estimate || {},
        calculatorResults: summary.calculator_results || [],
      };

      const encodedData = encodeURIComponent(JSON.stringify(quickModeData));
      
      toast.success("Opening Team Project setup...");
      navigate(`/buildunion/workspace/new?fromQuickMode=${encodedData}`);
      return true;
    } catch (error: any) {
      console.error("Switch to team error:", error);
      toast.error(error.message || "Failed to switch to Team mode");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, canAccessTeamMode, summaryId, projectId, navigate, onModeChange]);

  // Switch from Team to Solo mode
  const switchToSolo = useCallback(async (): Promise<boolean> => {
    if (!summaryId) {
      toast.error("No project data");
      return false;
    }

    setIsLoading(true);

    try {
      // Just update mode - don't delete project data
      const { error } = await supabase
        .from("project_summaries")
        .update({ mode: "solo" })
        .eq("id", summaryId);

      if (error) throw error;

      setMode("solo");
      onModeChange?.("solo");
      toast.success("Switched to Solo mode");
      return true;
    } catch (error: any) {
      console.error("Switch to solo error:", error);
      toast.error(error.message || "Failed to switch to Solo mode");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [summaryId, onModeChange]);

  // Toggle between modes
  const toggleMode = useCallback(async (): Promise<boolean> => {
    if (mode === "solo") {
      return switchToTeam();
    } else {
      return switchToSolo();
    }
  }, [mode, switchToTeam, switchToSolo]);

  return {
    mode,
    isTeamMode,
    isSoloMode,
    canAccessTeamMode,
    isLoading,
    switchToTeam,
    switchToSolo,
    toggleMode,
  };
}
