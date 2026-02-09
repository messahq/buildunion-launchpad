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

// All 16 pillars based on Citation 16-Data Source Architecture
// Solo Mode: 8 Core pillars (requiredInSoloMode: true)
// Team Mode: All 16 pillars (8 Core + 8 Team-specific)
export const DATA_SOURCE_PILLARS: DataSourcePillar[] = [
  // ===== 8 CORE PILLARS (Solo Mode) =====
  { id: 'work_type', label: 'Work Type', citationType: 'WORK_TYPE', requiredInSoloMode: true, weight: 1 },
  { id: 'photos', label: 'Site Photos', citationType: 'SITE_PHOTO', requiredInSoloMode: true, weight: 1 },
  { id: 'documents_core', label: 'Documents (Initial)', citationType: 'BLUEPRINT_UPLOAD', requiredInSoloMode: true, weight: 1 },
  { id: 'description', label: 'Description', citationType: 'PROJECT_NAME', requiredInSoloMode: true, weight: 1 },
  { id: 'data_source', label: 'Data Source', citationType: 'GFA_LOCK', requiredInSoloMode: true, weight: 1.5 },
  { id: 'timeline', label: 'Timeline', citationType: 'TIMELINE', requiredInSoloMode: true, weight: 1 },
  { id: 'mode', label: 'Mode Selection', citationType: 'DNA_FINALIZED', requiredInSoloMode: true, weight: 1 },
  { id: 'ai_analysis', label: 'AI Analysis', citationType: 'TEMPLATE_LOCK', requiredInSoloMode: true, weight: 1.5 },
  
  // ===== 8 TEAM PILLARS (Team Mode Only) =====
  { id: 'trades', label: 'Trades', citationType: 'TRADE_SELECTION', requiredInSoloMode: false, weight: 1 },
  { id: 'team_members', label: 'Team Members', citationType: 'TEAM_STRUCTURE', requiredInSoloMode: false, weight: 1 },
  { id: 'tasks', label: 'Tasks', citationType: 'TASK', requiredInSoloMode: false, weight: 1 },
  { id: 'contracts', label: 'Contracts', citationType: 'CONTRACT', requiredInSoloMode: false, weight: 1 },
  { id: 'client_info', label: 'Client Info', citationType: 'CLIENT', requiredInSoloMode: false, weight: 1 },
  { id: 'site_map', label: 'Site Map', citationType: 'LOCATION', requiredInSoloMode: false, weight: 1 },
  { id: 'documents_team', label: 'Documents (Post)', citationType: 'DOCUMENT', requiredInSoloMode: false, weight: 1 },
  { id: 'weather', label: 'Weather', citationType: 'WEATHER', requiredInSoloMode: false, weight: 0.5 },
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
