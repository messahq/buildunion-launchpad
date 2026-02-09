/**
 * Project Health Score Calculator
 * 
 * Calculates project completion percentage based on verified data sources.
 * Solo Mode: Excludes team-only pillars (Documents, Contracts, Team) from calculation
 * Team Mode: Includes all 16 data source pillars
 * 
 * Architecture follows "Operational Truth" principle - all calculations derived from citations.
 */

import { useMemo } from "react";
import { Citation, CITATION_TYPES } from "@/types/citation";

// Data source pillars that contribute to health score
export interface DataSourcePillar {
  id: string;
  label: string;
  citationType: string;
  requiredInSoloMode: boolean;
  weight: number;
}

// All 16 pillars - some are N/A in Solo mode
export const DATA_SOURCE_PILLARS: DataSourcePillar[] = [
  // Core pillars (always required)
  { id: 'project_name', label: 'Project Name', citationType: 'PROJECT_NAME', requiredInSoloMode: true, weight: 1 },
  { id: 'location', label: 'Location', citationType: 'LOCATION', requiredInSoloMode: true, weight: 1 },
  { id: 'work_type', label: 'Work Type', citationType: 'WORK_TYPE', requiredInSoloMode: true, weight: 1 },
  { id: 'gfa_lock', label: 'Area (GFA)', citationType: 'GFA_LOCK', requiredInSoloMode: true, weight: 1.5 },
  { id: 'trade_selection', label: 'Trade Selection', citationType: 'TRADE_SELECTION', requiredInSoloMode: true, weight: 1 },
  { id: 'template_lock', label: 'Template', citationType: 'TEMPLATE_LOCK', requiredInSoloMode: true, weight: 1.5 },
  { id: 'site_condition', label: 'Site Condition', citationType: 'SITE_CONDITION', requiredInSoloMode: true, weight: 1 },
  { id: 'timeline', label: 'Start Date', citationType: 'TIMELINE', requiredInSoloMode: true, weight: 1 },
  { id: 'end_date', label: 'End Date', citationType: 'END_DATE', requiredInSoloMode: true, weight: 1 },
  { id: 'dna_finalized', label: 'Project DNA', citationType: 'DNA_FINALIZED', requiredInSoloMode: true, weight: 1 },
  { id: 'budget', label: 'Budget', citationType: 'BUDGET', requiredInSoloMode: true, weight: 1.5 },
  { id: 'material', label: 'Materials', citationType: 'MATERIAL', requiredInSoloMode: true, weight: 1 },
  { id: 'demolition_price', label: 'Demolition', citationType: 'DEMOLITION_PRICE', requiredInSoloMode: true, weight: 0.5 },
  
  // Team-only pillars (N/A in Solo mode)
  { id: 'documents', label: 'Documents', citationType: 'BLUEPRINT_UPLOAD', requiredInSoloMode: false, weight: 1 },
  { id: 'contracts', label: 'Contracts', citationType: 'CONTRACT', requiredInSoloMode: false, weight: 1 },
  { id: 'team', label: 'Team', citationType: 'TEAM_STRUCTURE', requiredInSoloMode: false, weight: 1 },
];

export interface HealthScoreResult {
  score: number; // 0-100
  completedCount: number;
  totalCount: number;
  completedPillars: string[];
  missingPillars: string[];
  isSoloMode: boolean;
  healthStatus: 'excellent' | 'good' | 'needs-attention' | 'critical';
  statusColor: string;
  statusLabel: string;
}

interface UseProjectHealthScoreProps {
  citations: Citation[];
  teamMemberCount: number;
  documentCount?: number;
  contractCount?: number;
}

export const useProjectHealthScore = ({
  citations,
  teamMemberCount,
  documentCount = 0,
  contractCount = 0,
}: UseProjectHealthScoreProps): HealthScoreResult => {
  return useMemo(() => {
    // Determine Solo vs Team mode based on team member count
    const isSoloMode = teamMemberCount === 0;
    
    // Filter pillars based on mode
    const relevantPillars = isSoloMode
      ? DATA_SOURCE_PILLARS.filter(p => p.requiredInSoloMode)
      : DATA_SOURCE_PILLARS;
    
    // Calculate which pillars are complete
    const completedPillars: string[] = [];
    const missingPillars: string[] = [];
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    for (const pillar of relevantPillars) {
      totalWeight += pillar.weight;
      
      // Check if citation exists for this pillar
      const hasCitation = citations.some(c => c.cite_type === pillar.citationType);
      
      // Special handling for team-only pillars
      let isComplete = hasCitation;
      
      if (pillar.id === 'documents') {
        isComplete = documentCount > 0 || hasCitation;
      } else if (pillar.id === 'contracts') {
        isComplete = contractCount > 0 || hasCitation;
      } else if (pillar.id === 'team') {
        isComplete = teamMemberCount > 0 || hasCitation;
      }
      
      if (isComplete) {
        completedPillars.push(pillar.id);
        completedWeight += pillar.weight;
      } else {
        missingPillars.push(pillar.id);
      }
    }
    
    // Calculate weighted score
    const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    
    // Determine health status
    let healthStatus: HealthScoreResult['healthStatus'];
    let statusColor: string;
    let statusLabel: string;
    
    if (score >= 90) {
      healthStatus = 'excellent';
      statusColor = 'text-emerald-600 dark:text-emerald-400';
      statusLabel = 'Excellent';
    } else if (score >= 70) {
      healthStatus = 'good';
      statusColor = 'text-blue-600 dark:text-blue-400';
      statusLabel = 'Good';
    } else if (score >= 40) {
      healthStatus = 'needs-attention';
      statusColor = 'text-amber-600 dark:text-amber-400';
      statusLabel = 'Needs Attention';
    } else {
      healthStatus = 'critical';
      statusColor = 'text-red-600 dark:text-red-400';
      statusLabel = 'Critical';
    }
    
    return {
      score,
      completedCount: completedPillars.length,
      totalCount: relevantPillars.length,
      completedPillars,
      missingPillars,
      isSoloMode,
      healthStatus,
      statusColor,
      statusLabel,
    };
  }, [citations, teamMemberCount, documentCount, contractCount]);
};

// Utility function to get pillar label
export const getPillarLabel = (pillarId: string): string => {
  const pillar = DATA_SOURCE_PILLARS.find(p => p.id === pillarId);
  return pillar?.label || pillarId;
};

// Get pillars that are N/A in Solo mode
export const getSoloModeExcludedPillars = (): DataSourcePillar[] => {
  return DATA_SOURCE_PILLARS.filter(p => !p.requiredInSoloMode);
};
