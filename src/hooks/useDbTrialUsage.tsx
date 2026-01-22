import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";

// Feature-specific trial limits
const TRIAL_LIMITS: Record<string, number> = {
  blueprint_analysis: 3,
  quick_estimate: 3,
  project_creation: 1,
};

const getDefaultMaxTrials = (feature: string): number => {
  return TRIAL_LIMITS[feature] ?? 3;
};

// Check for dev tier override directly from localStorage
const getDevTierOverride = (): SubscriptionTier | null => {
  if (typeof window === 'undefined') return null;
  const override = localStorage.getItem("dev_tier_override");
  if (override && ["free", "pro", "premium", "enterprise"].includes(override)) {
    return override as SubscriptionTier;
  }
  return null;
};

interface TrialData {
  usedCount: number;
  maxAllowed: number;
  lastUsed: string | null;
}

export const useDbTrialUsage = (feature: string = "blueprint_analysis") => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  
  // Check both: real subscription OR dev override
  const devOverride = getDevTierOverride();
  const isPremiumUser = subscription?.subscribed === true || (devOverride !== null && devOverride !== "free");
  
  const defaultMax = getDefaultMaxTrials(feature);
  const [trialData, setTrialData] = useState<TrialData>({
    usedCount: 0,
    maxAllowed: defaultMax,
    lastUsed: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetch trial data from database
  const fetchTrialData = useCallback(async () => {
    if (!user) {
      setTrialData({ usedCount: 0, maxAllowed: defaultMax, lastUsed: null });
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
          maxAllowed: defaultMax,
          lastUsed: null,
        });
      }
    } catch (error) {
      console.error("Error fetching trial data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, feature, defaultMax]);

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
          max_allowed: defaultMax,
          last_used: null,
        }, {
          onConflict: "user_id,feature",
        });

      if (error) throw error;

      setTrialData({
        usedCount: 0,
        maxAllowed: defaultMax,
        lastUsed: null,
      });

      return true;
    } catch (error) {
      console.error("Error resetting trials:", error);
      return false;
    }
  }, [user, feature, defaultMax]);

  // Premium users have unlimited access
  const effectiveRemainingTrials = isPremiumUser ? Infinity : remainingTrials;
  const effectiveHasTrialsRemaining = isPremiumUser ? true : hasTrialsRemaining;

  return {
    usedCount: trialData.usedCount,
    remainingTrials: effectiveRemainingTrials,
    hasTrialsRemaining: effectiveHasTrialsRemaining,
    maxTrials: isPremiumUser ? Infinity : trialData.maxAllowed,
    useOneTrial,
    resetTrials,
    loading,
    isAuthenticated: !!user,
    isPremiumUser,
  };
};

export default useDbTrialUsage;
