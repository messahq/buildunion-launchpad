import { useState, useCallback, useEffect } from "react";

const TRIAL_STORAGE_KEY = "buildunion_blueprint_trials";
const MAX_FREE_TRIALS = 3;

interface TrialUsage {
  usedCount: number;
  lastUsed: string | null;
}

export const useTrialUsage = () => {
  const [trialData, setTrialData] = useState<TrialUsage>(() => {
    try {
      const stored = localStorage.getItem(TRIAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error reading trial usage:", error);
    }
    return { usedCount: 0, lastUsed: null };
  });

  // Sync to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(trialData));
    } catch (error) {
      console.error("Error saving trial usage:", error);
    }
  }, [trialData]);

  const remainingTrials = Math.max(0, MAX_FREE_TRIALS - trialData.usedCount);
  const hasTrialsRemaining = remainingTrials > 0;

  const useOneTrial = useCallback(() => {
    if (!hasTrialsRemaining) return false;
    
    setTrialData(prev => ({
      usedCount: prev.usedCount + 1,
      lastUsed: new Date().toISOString(),
    }));
    return true;
  }, [hasTrialsRemaining]);

  const resetTrials = useCallback(() => {
    setTrialData({ usedCount: 0, lastUsed: null });
  }, []);

  return {
    usedCount: trialData.usedCount,
    remainingTrials,
    hasTrialsRemaining,
    maxTrials: MAX_FREE_TRIALS,
    useOneTrial,
    resetTrials,
  };
};

export default useTrialUsage;
