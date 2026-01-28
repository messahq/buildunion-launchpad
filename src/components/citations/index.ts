// BuildUnion Citation System
// Provides inline citations with proof panel for source verification

export { SourceTag } from "./SourceTag";
export { SourceProofPanel } from "./SourceProofPanel";
export { ReferencesSection } from "./ReferencesSection";
export { CitationProvider, useCitation } from "./CitationProvider";
export { default as CitationRegistry } from "./CitationRegistry";
export type { CitationSource, CitationMetadata, AIResponseWithCitations, CitationRegistry as CitationRegistryType } from "@/types/citation";
export { generateCitationId, getCitationTypeLabel } from "@/types/citation";
