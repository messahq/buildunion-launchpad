import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";

// Feature-specific trial limits
const TRIAL_LIMITS: Record<string, number> = {
  blueprint_analysis: 3,
  quick_estimate: 3,
  project_creation: 1,
  messa_brief: 3, // Free tier: 3 trial briefs
  messa_quick_log: 3, // Free tier: 3 reports/month (monthly reset)
};

// Features that reset monthly
const MONTHLY_RESET_FEATURES = ['messa_quick_log'];

// Check if last_used is from a previous month
const shouldResetMonthly = (lastUsed: string | null, feature: string): boolean => {
  if (!MONTHLY_RESET_FEATURES.includes(feature)) return false;
  if (!lastUsed) return false;
  
  const lastUsedDate = new Date(lastUsed);
  const now = new Date();
  
  return lastUsedDate.getMonth() !== now.getMonth() || 
         lastUsedDate.getFullYear() !== now.getFullYear();
};

const getDefaultMaxTrials = (feature: string): number => {
  return TRIAL_LIMITS[feature] ?? 3;
};

// Check for dev tier override directly from localStorage
const getDevTierOverride = (userId?: string): SubscriptionTier | null => {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;
  if (!userId) return null;
  const override = localStorage.getItem(`dev_tier_override_${userId}`);
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
  const devOverride = getDevTierOverride(user?.id);
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
        // Monthly reset is now handled server-side in use_one_trial()
        // Just check if we should show reset state client-side
        if (shouldResetMonthly(data.last_used, feature)) {
          setTrialData({
            usedCount: 0,
            maxAllowed: data.max_allowed,
            lastUsed: null,
          });
        } else {
          setTrialData({
            usedCount: data.used_count,
            maxAllowed: data.max_allowed,
            lastUsed: data.last_used,
          });
        }
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
      // Use server-side SECURITY DEFINER function — prevents client manipulation
      const { data, error } = await supabase.rpc("use_one_trial", {
        _feature: feature,
      });

      if (error) throw error;

      const result = data as { success: boolean; used_count?: number; max_allowed?: number; remaining?: number; error?: string };

      if (!result.success) {
        console.warn("Trial limit reached:", result.error);
        return false;
      }

      setTrialData(prev => ({
        ...prev,
        usedCount: result.used_count ?? prev.usedCount + 1,
        maxAllowed: result.max_allowed ?? prev.maxAllowed,
        lastUsed: new Date().toISOString(),
      }));

      return true;
    } catch (error) {
      console.error("Error using trial:", error);
      return false;
    }
  }, [user, feature, hasTrialsRemaining]);

  const resetTrials = useCallback(async (): Promise<boolean> => {
    // Client-side reset is no longer allowed — trials are managed server-side
    console.warn("Client-side trial reset is disabled for security. Contact admin.");
    return false;
  }, []);

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
