// ============================================
// CITATION-DRIVEN STATE ARCHITECTURE
// ============================================
// The Source of Truth for Project 3.0
// Every UI element is driven by citations stored in the database
// ============================================

export const CITATION_TYPES = {
  LOCATION: 'LOCATION',
  WORK_TYPE: 'WORK_TYPE',
  PROJECT_NAME: 'PROJECT_NAME',
  GFA_LOCK: 'GFA_LOCK',
  BLUEPRINT: 'BLUEPRINT',
  MATERIAL: 'MATERIAL',
  BUDGET: 'BUDGET',
  // Stage 3: Definition Flow
  TRADE_SELECTION: 'TRADE_SELECTION',
  TEMPLATE_LOCK: 'TEMPLATE_LOCK',
  TEAM_SIZE: 'TEAM_SIZE',
  // Stage 4: Execution Flow
  EXECUTION_MODE: 'EXECUTION_MODE',
  SITE_CONDITION: 'SITE_CONDITION',
  DEMOLITION_PRICE: 'DEMOLITION_PRICE',
  TIMELINE: 'TIMELINE',
  END_DATE: 'END_DATE',
  DNA_FINALIZED: 'DNA_FINALIZED',
  // Stage 5: Visual Intelligence
  BLUEPRINT_UPLOAD: 'BLUEPRINT_UPLOAD',
  SITE_PHOTO: 'SITE_PHOTO',
  VISUAL_VERIFICATION: 'VISUAL_VERIFICATION',
  // Stage 6: Team Architecture
  TEAM_STRUCTURE: 'TEAM_STRUCTURE',
  TEAM_MEMBER_INVITE: 'TEAM_MEMBER_INVITE',
  TEAM_PERMISSION_SET: 'TEAM_PERMISSION_SET',
  // Stage 7-8: Weather & Conditions
  WEATHER_ALERT: 'WEATHER_ALERT',
  // Stage 6: Contracts
  CONTRACT: 'CONTRACT',
  // Budget approval tracking
  BUDGET_APPROVAL: 'BUDGET_APPROVAL',
} as const;

export type CitationType = typeof CITATION_TYPES[keyof typeof CITATION_TYPES];

/**
 * Citation - The atomic unit of verified project data
 * Each citation is a Source of Truth that drives UI rendering
 */
export interface Citation {
  id: string;
  cite_type: CitationType;
  question_key: string;
  answer: string;
  value: string | number | Record<string, unknown>;
  timestamp: string;
  metadata?: {
    coordinates?: { lat: number; lng: number };
    work_type_key?: string;
    gfa_value?: number;
    gfa_unit?: 'sqft' | 'sqm';
    blueprint_url?: string;
    [key: string]: unknown;
  };
}

/**
 * CitationRenderConfig - Maps citation types to component requirements
 */
export interface CitationRenderConfig {
  cite_type: CitationType;
  component: 'GoogleMapsComponent' | 'WireframeSVG' | 'BudgetCalculator' | 'ProjectLabel' | 'BlueprintViewer';
  props: Record<string, unknown>;
}

/**
 * Helper to create a new citation with proper typing
 */
export function createCitation(params: {
  cite_type: CitationType;
  question_key: string;
  answer: string;
  value?: string | number | Record<string, unknown>;
  metadata?: Citation['metadata'];
}): Citation {
  return {
    id: `cite_${params.cite_type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cite_type: params.cite_type,
    question_key: params.question_key,
    answer: params.answer,
    value: params.value ?? params.answer,
    timestamp: new Date().toISOString(),
    metadata: params.metadata,
  };
}

/**
 * Determine citation type from question key
 */
export function getCitationType(questionKey: string): CitationType {
  switch (questionKey) {
    case 'project_name':
      return CITATION_TYPES.PROJECT_NAME;
    case 'project_address':
      return CITATION_TYPES.LOCATION;
    case 'work_type':
      return CITATION_TYPES.WORK_TYPE;
    case 'gfa':
    case 'gross_floor_area':
      return CITATION_TYPES.GFA_LOCK;
    case 'blueprint':
      return CITATION_TYPES.BLUEPRINT;
    default:
      return CITATION_TYPES.PROJECT_NAME;
  }
}

/**
 * Convert legacy WizardCitation to new Citation format
 */
export function migrateLegacyCitation(legacy: {
  id: string;
  questionKey: string;
  answer: string;
  timestamp: string;
  elementType?: string;
  metadata?: Record<string, unknown>;
}): Citation {
  const cite_type = getCitationType(legacy.questionKey);
  
  return {
    id: legacy.id,
    cite_type,
    question_key: legacy.questionKey,
    answer: legacy.answer,
    value: legacy.answer,
    timestamp: legacy.timestamp,
    metadata: legacy.metadata as Citation['metadata'],
  };
}
