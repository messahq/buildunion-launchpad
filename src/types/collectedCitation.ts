// Collected Citation - used during project creation flow before project exists
// These are converted to CitationSource entries after project is created

export interface CollectedCitation {
  sourceId: string; // e.g., "C-001", "P-001", "D-001"
  documentName: string;
  documentType: 'log' | 'site_photo' | 'pdf' | 'blueprint' | 'image';
  contextSnippet: string;
  linkedPillar?: 'area' | 'materials' | 'blueprint' | 'obc' | 'conflict' | 'mode' | 'size' | 'confidence';
  timestamp: string;
  filePath?: string;
  sourceType: 'USER' | 'PHOTO-AI' | 'CONFIG'; // Attribution for References section
}

// Citation IDs mapping for 16 data sources
export const CITATION_IDS = {
  // Solo Mode: 8 Core Citations (Page 1-5)
  WORK_TYPE: 'C-001',      // Page 1: Work type selection
  DESCRIPTION: 'C-002',     // Page 1: Brief description
  DATA_SOURCE: 'C-003',     // Page 2: Data availability selection
  TIMELINE: 'TL-001',       // Page 2: Project dates
  MODE: 'M-001',            // Page 5: Solo/Team mode selection
  AI_ANALYSIS: 'A-001',     // Page 5: AI analysis results
  
  // Team Mode: Additional Citations (Pages 4+)
  TRADES: 'T-001',          // Page 3: Trades/subcontractor selection
  
  // Dynamic IDs (generated with index)
  PHOTO_PREFIX: 'P',        // P-001, P-002, etc.
  DOCUMENT_PREFIX: 'D',     // D-001, D-002, etc.
  BLUEPRINT_PREFIX: 'B',    // B-001, B-002, etc.
} as const;

// Generate photo citation ID
export const generatePhotoCitationId = (index: number): string => 
  `${CITATION_IDS.PHOTO_PREFIX}-${String(index + 1).padStart(3, '0')}`;

// Generate document citation ID
export const generateDocumentCitationId = (index: number, isBlueprint: boolean): string => {
  const prefix = isBlueprint ? CITATION_IDS.BLUEPRINT_PREFIX : CITATION_IDS.DOCUMENT_PREFIX;
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
};

// Check if file is likely a blueprint based on name
export const isLikelyBlueprint = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return (
    lower.includes('blueprint') ||
    lower.includes('plan') ||
    lower.includes('drawing') ||
    lower.includes('layout') ||
    lower.includes('floorplan') ||
    lower.includes('floor_plan') ||
    lower.includes('architectural') ||
    lower.includes('cad')
  );
};
