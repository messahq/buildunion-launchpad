// Citation System Types for BuildUnion Operational Truth

export interface CitationSource {
  id: string;
  sourceId: string; // e.g., "D-102", "OBC 3.4", "P-001"
  documentName: string;
  documentType: 'pdf' | 'image' | 'blueprint' | 'regulation' | 'log' | 'site_photo';
  pageNumber?: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  contextSnippet: string; // The relevant text excerpt
  filePath?: string; // Path to the original document
  timestamp?: string;
  // NEW: Link to Operational Truth pillar
  linkedPillar?: 'area' | 'materials' | 'blueprint' | 'obc' | 'conflict' | 'mode' | 'size' | 'confidence' | 'tasks' | 'team';
  // NEW: Registration metadata
  registeredAt?: string;
  registeredBy?: string; // user_id
  // NEW: Source attribution for References section
  sourceType?: 'USER' | 'PHOTO-AI' | 'CONFIG' | 'EDIT';
}

export interface CitationMetadata {
  sources: CitationSource[];
  generatedAt: string;
  modelUsed?: string;
  verificationStatus: 'verified' | 'partial' | 'unverified';
}

export interface AIResponseWithCitations {
  content: string;
  citations: CitationSource[];
  references: CitationSource[];
}

// NEW: Citation Registry for project-wide tracking
export interface CitationRegistry {
  projectId: string;
  citations: CitationSource[];
  pillarLinks: Record<string, string[]>; // pillar name -> array of citation sourceIds
  lastUpdated: string;
  totalCitations: number;
}

// Helper to generate citation ID
export const generateCitationId = (type: 'D' | 'P' | 'B' | 'OBC', index: number): string => {
  return `${type}-${String(index + 1).padStart(3, '0')}`;
};

// Helper to get citation type label
export const getCitationTypeLabel = (type: CitationSource['documentType']): string => {
  switch (type) {
    case 'pdf': return 'PDF Document';
    case 'image': return 'Image';
    case 'blueprint': return 'Blueprint';
    case 'regulation': return 'OBC Regulation';
    case 'log': return 'Activity Log';
    case 'site_photo': return 'Site Photo';
    default: return 'Document';
  }
};
