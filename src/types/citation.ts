// Citation System Types for BuildUnion Operational Truth

export interface CitationSource {
  id: string;
  sourceId: string; // e.g., "D-102", "OBC 3.4"
  documentName: string;
  documentType: 'pdf' | 'image' | 'blueprint' | 'regulation' | 'log';
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
