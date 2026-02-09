// ============================================
// TIER-BASED FEATURE ACCESS HOOK
// Centralizes all tier-gated feature logic for Project 3.0
// ============================================

import { useMemo } from 'react';
import { useSubscription, SubscriptionTier } from './useSubscription';
import { selectModels, detectTaskComplexity, ModelConfig } from '@/lib/aiModelConfig';

// Feature flags per tier
export interface TierFeatures {
  // Project limits
  maxActiveProjects: number;
  maxTeamMembers: number;
  
  // AI Features
  aiAnalysisEnabled: boolean;
  dualEngineEnabled: boolean;
  obcValidationEnabled: boolean;
  blueprintAnalysisEnabled: boolean;
  photoEstimateEnabled: boolean;
  
  // Document Features
  contractGenerationEnabled: boolean;
  invoiceGenerationEnabled: boolean;
  pdfExportEnabled: boolean;
  unlimitedDocuments: boolean;
  
  // Team Features
  teamModeEnabled: boolean;
  directMessagingEnabled: boolean;
  taskAssignmentEnabled: boolean;
  
  // Advanced Features
  ganttSchedulingEnabled: boolean;
  weatherAlertsEnabled: boolean;
  conflictDetectionEnabled: boolean;
  baselineVersioningEnabled: boolean;
  
  // Trial/Limits
  monthlyQuickLogLimit: number;
  blueprintAnalysisLimit: number;
}

// Tier configuration
const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    maxActiveProjects: 1,
    maxTeamMembers: 0,
    
    aiAnalysisEnabled: true, // Limited
    dualEngineEnabled: false,
    obcValidationEnabled: false,
    blueprintAnalysisEnabled: true, // Trial: 3 uses
    photoEstimateEnabled: true, // Trial: 3 uses
    
    contractGenerationEnabled: false,
    invoiceGenerationEnabled: false,
    pdfExportEnabled: false,
    unlimitedDocuments: false,
    
    teamModeEnabled: false,
    directMessagingEnabled: false,
    taskAssignmentEnabled: false,
    
    ganttSchedulingEnabled: false,
    weatherAlertsEnabled: true, // Basic
    conflictDetectionEnabled: false,
    baselineVersioningEnabled: false,
    
    monthlyQuickLogLimit: 3,
    blueprintAnalysisLimit: 3,
  },
  
  pro: {
    maxActiveProjects: 10,
    maxTeamMembers: 10,
    
    aiAnalysisEnabled: true,
    dualEngineEnabled: false, // Only on complex/conflict
    obcValidationEnabled: true,
    blueprintAnalysisEnabled: true,
    photoEstimateEnabled: true,
    
    contractGenerationEnabled: true,
    invoiceGenerationEnabled: true,
    pdfExportEnabled: true,
    unlimitedDocuments: true,
    
    teamModeEnabled: true,
    directMessagingEnabled: false, // Premium only
    taskAssignmentEnabled: true,
    
    ganttSchedulingEnabled: true,
    weatherAlertsEnabled: true,
    conflictDetectionEnabled: false, // Premium only
    baselineVersioningEnabled: true,
    
    monthlyQuickLogLimit: Infinity,
    blueprintAnalysisLimit: Infinity,
  },
  
  premium: {
    maxActiveProjects: Infinity,
    maxTeamMembers: 50,
    
    aiAnalysisEnabled: true,
    dualEngineEnabled: true, // Always
    obcValidationEnabled: true,
    blueprintAnalysisEnabled: true,
    photoEstimateEnabled: true,
    
    contractGenerationEnabled: true,
    invoiceGenerationEnabled: true,
    pdfExportEnabled: true,
    unlimitedDocuments: true,
    
    teamModeEnabled: true,
    directMessagingEnabled: true,
    taskAssignmentEnabled: true,
    
    ganttSchedulingEnabled: true,
    weatherAlertsEnabled: true,
    conflictDetectionEnabled: true,
    baselineVersioningEnabled: true,
    
    monthlyQuickLogLimit: Infinity,
    blueprintAnalysisLimit: Infinity,
  },
  
  enterprise: {
    maxActiveProjects: Infinity,
    maxTeamMembers: Infinity,
    
    aiAnalysisEnabled: true,
    dualEngineEnabled: true,
    obcValidationEnabled: true,
    blueprintAnalysisEnabled: true,
    photoEstimateEnabled: true,
    
    contractGenerationEnabled: true,
    invoiceGenerationEnabled: true,
    pdfExportEnabled: true,
    unlimitedDocuments: true,
    
    teamModeEnabled: true,
    directMessagingEnabled: true,
    taskAssignmentEnabled: true,
    
    ganttSchedulingEnabled: true,
    weatherAlertsEnabled: true,
    conflictDetectionEnabled: true,
    baselineVersioningEnabled: true,
    
    monthlyQuickLogLimit: Infinity,
    blueprintAnalysisLimit: Infinity,
  },
};

export interface UseTierFeaturesResult {
  tier: SubscriptionTier;
  features: TierFeatures;
  isSubscribed: boolean;
  isLoading: boolean;
  
  // Helper functions
  canUseFeature: (feature: keyof TierFeatures) => boolean;
  getModelConfig: (complexity?: 'simple' | 'standard' | 'complex') => ModelConfig;
  getUpgradeMessage: (feature: keyof TierFeatures) => string;
  
  // Specific checks
  canCreateProject: (currentCount: number) => boolean;
  canAddTeamMember: (currentCount: number) => boolean;
  canUseAIAnalysis: () => boolean;
  canGenerateInvoice: () => boolean;
  canGenerateContract: () => boolean;
  canExportPDF: () => boolean;
}

export function useTierFeatures(): UseTierFeaturesResult {
  const { subscription, loading } = useSubscription();
  
  const tier = subscription.tier;
  const features = TIER_FEATURES[tier];
  const isSubscribed = subscription.subscribed;
  
  const canUseFeature = useMemo(() => {
    return (feature: keyof TierFeatures): boolean => {
      const value = features[feature];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      return false;
    };
  }, [features]);
  
  const getModelConfig = useMemo(() => {
    return (complexity: 'simple' | 'standard' | 'complex' = 'standard'): ModelConfig => {
      return selectModels(tier, complexity);
    };
  }, [tier]);
  
  const getUpgradeMessage = useMemo(() => {
    return (feature: keyof TierFeatures): string => {
      const featureNames: Record<string, string> = {
        dualEngineEnabled: 'Dual AI Engine validation',
        conflictDetectionEnabled: 'Conflict visualization',
        directMessagingEnabled: 'Direct messaging',
        contractGenerationEnabled: 'Contract generation',
        invoiceGenerationEnabled: 'Invoice generation',
        pdfExportEnabled: 'PDF export',
        teamModeEnabled: 'Team collaboration',
        ganttSchedulingEnabled: 'Gantt scheduling',
        baselineVersioningEnabled: 'Baseline versioning',
      };
      
      const featureName = featureNames[feature] || feature;
      
      if (tier === 'free') {
        return `Upgrade to Pro to unlock ${featureName}`;
      } else if (tier === 'pro') {
        return `Upgrade to Premium to unlock ${featureName}`;
      }
      
      return `Contact support for enterprise features`;
    };
  }, [tier]);
  
  const canCreateProject = useMemo(() => {
    return (currentCount: number): boolean => {
      return currentCount < features.maxActiveProjects;
    };
  }, [features.maxActiveProjects]);
  
  const canAddTeamMember = useMemo(() => {
    return (currentCount: number): boolean => {
      return currentCount < features.maxTeamMembers;
    };
  }, [features.maxTeamMembers]);
  
  const canUseAIAnalysis = useMemo(() => {
    return (): boolean => features.aiAnalysisEnabled;
  }, [features.aiAnalysisEnabled]);
  
  const canGenerateInvoice = useMemo(() => {
    return (): boolean => features.invoiceGenerationEnabled;
  }, [features.invoiceGenerationEnabled]);
  
  const canGenerateContract = useMemo(() => {
    return (): boolean => features.contractGenerationEnabled;
  }, [features.contractGenerationEnabled]);
  
  const canExportPDF = useMemo(() => {
    return (): boolean => features.pdfExportEnabled;
  }, [features.pdfExportEnabled]);
  
  return {
    tier,
    features,
    isSubscribed,
    isLoading: loading,
    canUseFeature,
    getModelConfig,
    getUpgradeMessage,
    canCreateProject,
    canAddTeamMember,
    canUseAIAnalysis,
    canGenerateInvoice,
    canGenerateContract,
    canExportPDF,
  };
}

// Utility hook for showing upgrade prompts
export function useUpgradePrompt() {
  const { tier, getUpgradeMessage } = useTierFeatures();
  
  const showUpgradePrompt = (feature: keyof TierFeatures, onUpgrade?: () => void) => {
    const message = getUpgradeMessage(feature);
    // This can be connected to a modal or toast
    return {
      message,
      currentTier: tier,
      suggestedTier: tier === 'free' ? 'pro' : 'premium',
      onUpgrade,
    };
  };
  
  return { showUpgradePrompt };
}
