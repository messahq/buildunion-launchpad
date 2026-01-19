import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_MAX_TRIALS = 3;

interface TrialData {
  usedCount: number;
  maxAllowed: number;
  lastUsed: string | null;
}

export const useDbTrialUsage = (feature: string = "blueprint_analysis") => {
  const { user } = useAuth();
  const [trialData, setTrialData] = useState<TrialData>({
    usedCount: 0,
    maxAllowed: DEFAULT_MAX_TRIALS,
    lastUsed: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetch trial data from database
  const fetchTrialData = useCallback(async () => {
    if (!user) {
      setTrialData({ usedCount: 0, maxAllowed: DEFAULT_MAX_TRIALS, lastUsed: null });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_trials")
        .select("*")
        .eq("user_id", user.id)
        .eq("feature", feature)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTrialData({
          usedCount: data.used_count,
          maxAllowed: data.max_allowed,
          lastUsed: data.last_used,
        });
      } else {
        // No record yet - user has full trials available
        setTrialData({
          usedCount: 0,
          maxAllowed: DEFAULT_MAX_TRIALS,
          lastUsed: null,
        });
      }
    } catch (error) {
      console.error("Error fetching trial data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, feature]);

  useEffect(() => {
    fetchTrialData();
  }, [fetchTrialData]);

  const remainingTrials = Math.max(0, trialData.maxAllowed - trialData.usedCount);
  const hasTrialsRemaining = remainingTrials > 0;

  const useOneTrial = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (!hasTrialsRemaining) return false;

    try {
      const newUsedCount = trialData.usedCount + 1;

      // Upsert the trial record
      const { error } = await supabase
        .from("user_trials")
        .upsert({
          user_id: user.id,
          feature,
          used_count: newUsedCount,
          max_allowed: trialData.maxAllowed,
          last_used: new Date().toISOString(),
        }, {
          onConflict: "user_id,feature",
        });

      if (error) throw error;

      setTrialData(prev => ({
        ...prev,
        usedCount: newUsedCount,
        lastUsed: new Date().toISOString(),
      }));

      return true;
    } catch (error) {
      console.error("Error using trial:", error);
      return false;
    }
  }, [user, feature, hasTrialsRemaining, trialData]);

  const resetTrials = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("user_trials")
        .upsert({
          user_id: user.id,
          feature,
          used_count: 0,
          max_allowed: DEFAULT_MAX_TRIALS,
          last_used: null,
        }, {
          onConflict: "user_id,feature",
        });

      if (error) throw error;

      setTrialData({
        usedCount: 0,
        maxAllowed: DEFAULT_MAX_TRIALS,
        lastUsed: null,
      });

      return true;
    } catch (error) {
      console.error("Error resetting trials:", error);
      return false;
    }
  }, [user, feature]);

  return {
    usedCount: trialData.usedCount,
    remainingTrials,
    hasTrialsRemaining,
    maxTrials: trialData.maxAllowed,
    useOneTrial,
    resetTrials,
    loading,
    isAuthenticated: !!user,
  };
};

export default useDbTrialUsage;
