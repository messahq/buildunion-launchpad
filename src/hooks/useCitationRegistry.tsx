import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CitationSource, CitationRegistry, generateCitationId } from "@/types/citation";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

interface UseCitationRegistryResult {
  citations: CitationSource[];
  isLoading: boolean;
  error: Error | null;
  registerCitation: (citation: Omit<CitationSource, 'id' | 'registeredAt' | 'registeredBy'>) => Promise<void>;
  registerMultipleCitations: (citations: Omit<CitationSource, 'id' | 'registeredAt' | 'registeredBy'>[]) => Promise<void>;
  linkCitationToPillar: (sourceId: string, pillar: CitationSource['linkedPillar']) => Promise<void>;
  removeCitation: (sourceId: string) => Promise<void>;
  getCitationsForPillar: (pillar: CitationSource['linkedPillar']) => CitationSource[];
  refreshCitations: () => Promise<void>;
  totalCitations: number;
  linkedCitations: number;
}

export function useCitationRegistry(projectId: string | undefined): UseCitationRegistryResult {
  const { user } = useAuth();
  const [citations, setCitations] = useState<CitationSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load citations from project_summaries.verified_facts
  const loadCitations = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("project_summaries")
        .select("verified_facts")
        .eq("project_id", projectId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Extract citations from verified_facts
      const verifiedFacts = data?.verified_facts as { citationRegistry?: CitationSource[] } | null;
      const storedCitations = verifiedFacts?.citationRegistry || [];
      
      setCitations(storedCitations);
    } catch (err) {
      console.error("Error loading citations:", err);
      setError(err instanceof Error ? err : new Error("Failed to load citations"));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Save citations to project_summaries.verified_facts
  const saveCitations = useCallback(async (newCitations: CitationSource[]) => {
    if (!projectId) return;

    try {
      // First get existing verified_facts
      const { data: existing } = await supabase
        .from("project_summaries")
        .select("verified_facts")
        .eq("project_id", projectId)
        .maybeSingle();

      const existingFacts = (existing?.verified_facts || {}) as Record<string, Json>;
      
      // Merge with new citation registry - serialize citations to JSON
      const serializedCitations = JSON.parse(JSON.stringify(newCitations)) as Json;
      const updatedFacts: Json = {
        ...existingFacts,
        citationRegistry: serializedCitations,
        citationRegistryUpdatedAt: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({ verified_facts: updatedFacts })
        .eq("project_id", projectId);

      if (updateError) throw updateError;
      
      setCitations(newCitations);
    } catch (err) {
      console.error("Error saving citations:", err);
      throw err;
    }
  }, [projectId]);

  // Register a new citation
  const registerCitation = useCallback(async (
    citation: Omit<CitationSource, 'id' | 'registeredAt' | 'registeredBy'>
  ) => {
    const newCitation: CitationSource = {
      ...citation,
      id: crypto.randomUUID(),
      registeredAt: new Date().toISOString(),
      registeredBy: user?.id,
    };

    // Check if sourceId already exists
    const existingIndex = citations.findIndex(c => c.sourceId === citation.sourceId);
    
    let newCitations: CitationSource[];
    if (existingIndex >= 0) {
      // Update existing citation
      newCitations = [...citations];
      newCitations[existingIndex] = { ...newCitations[existingIndex], ...newCitation };
    } else {
      // Add new citation
      newCitations = [...citations, newCitation];
    }

    await saveCitations(newCitations);
  }, [citations, saveCitations, user?.id]);

  // Register multiple citations at once
  const registerMultipleCitations = useCallback(async (
    newCitationsData: Omit<CitationSource, 'id' | 'registeredAt' | 'registeredBy'>[]
  ) => {
    const timestamp = new Date().toISOString();
    
    const newCitations = newCitationsData.map(citation => ({
      ...citation,
      id: crypto.randomUUID(),
      registeredAt: timestamp,
      registeredBy: user?.id,
    }));

    // Merge with existing, avoiding duplicates by sourceId
    const existingIds = new Set(citations.map(c => c.sourceId));
    const uniqueNew = newCitations.filter(c => !existingIds.has(c.sourceId));
    
    const merged = [...citations, ...uniqueNew];
    await saveCitations(merged);
  }, [citations, saveCitations, user?.id]);

  // Link a citation to an Operational Truth pillar
  const linkCitationToPillar = useCallback(async (
    sourceId: string,
    pillar: CitationSource['linkedPillar']
  ) => {
    const updatedCitations = citations.map(c => 
      c.sourceId === sourceId ? { ...c, linkedPillar: pillar } : c
    );
    await saveCitations(updatedCitations);
  }, [citations, saveCitations]);

  // Remove a citation
  const removeCitation = useCallback(async (sourceId: string) => {
    const filtered = citations.filter(c => c.sourceId !== sourceId);
    await saveCitations(filtered);
  }, [citations, saveCitations]);

  // Get citations linked to a specific pillar
  const getCitationsForPillar = useCallback((pillar: CitationSource['linkedPillar']) => {
    return citations.filter(c => c.linkedPillar === pillar);
  }, [citations]);

  // Refresh citations from database
  const refreshCitations = useCallback(async () => {
    await loadCitations();
  }, [loadCitations]);

  // Load on mount and when projectId changes
  useEffect(() => {
    loadCitations();
  }, [loadCitations]);

  return {
    citations,
    isLoading,
    error,
    registerCitation,
    registerMultipleCitations,
    linkCitationToPillar,
    removeCitation,
    getCitationsForPillar,
    refreshCitations,
    totalCitations: citations.length,
    linkedCitations: citations.filter(c => c.linkedPillar).length,
  };
}

// Auto-link helper: Determine pillar based on file type and name
export function getAutoPillarLink(
  fileName: string, 
  documentType: CitationSource['documentType']
): CitationSource['linkedPillar'] | undefined {
  const lowerName = fileName.toLowerCase();
  
  // Site photos → Area (photos are typically used for area detection)
  if (documentType === 'site_photo' || documentType === 'image') {
    // Check if it's a materials-related photo
    if (lowerName.includes('material') || lowerName.includes('supply') || lowerName.includes('inventory')) {
      return 'materials';
    }
    // Default site photos to Area
    return 'area';
  }
  
  // Blueprint detection
  if (
    lowerName.includes('blueprint') || 
    lowerName.includes('floorplan') || 
    lowerName.includes('floor_plan') ||
    lowerName.includes('floor-plan') ||
    lowerName.includes('architectural') ||
    lowerName.includes('drawing') ||
    lowerName.includes('cad') ||
    lowerName.includes('layout') ||
    lowerName.includes('plan.pdf') ||
    lowerName.includes('plans.pdf')
  ) {
    return 'blueprint';
  }
  
  // OBC/Permit detection
  if (
    lowerName.includes('permit') ||
    lowerName.includes('license') ||
    lowerName.includes('obc') ||
    lowerName.includes('building_code') ||
    lowerName.includes('building-code') ||
    lowerName.includes('inspection') ||
    lowerName.includes('compliance') ||
    lowerName.includes('regulation') ||
    lowerName.includes('certificate') ||
    lowerName.includes('approval')
  ) {
    return 'obc';
  }
  
  // Materials/BOM detection
  if (
    lowerName.includes('material') ||
    lowerName.includes('bom') ||
    lowerName.includes('bill_of_materials') ||
    lowerName.includes('supply') ||
    lowerName.includes('inventory') ||
    lowerName.includes('quote') ||
    lowerName.includes('estimate')
  ) {
    return 'materials';
  }
  
  // No auto-link for generic documents
  return undefined;
}

// Helper hook to auto-register documents as citations
export function useAutoRegisterCitations(
  projectId: string | undefined,
  siteImages: string[] | null,
  documents: { id: string; file_name: string; file_path: string; uploaded_at: string }[]
) {
  const { registerMultipleCitations, citations } = useCitationRegistry(projectId);

  useEffect(() => {
    if (!projectId) return;

    const citationsToRegister: Omit<CitationSource, 'id' | 'registeredAt' | 'registeredBy'>[] = [];

    // Register site photos with auto-link to Area
    siteImages?.forEach((path, index) => {
      const sourceId = generateCitationId('P', index);
      if (!citations.some(c => c.sourceId === sourceId)) {
        const fileName = path.split('/').pop() || `Site Photo ${index + 1}`;
        const autoPillar = getAutoPillarLink(fileName, 'site_photo');
        
        citationsToRegister.push({
          sourceId,
          documentName: `Site Photo ${index + 1}`,
          documentType: 'site_photo',
          contextSnippet: 'Site photo uploaded during project creation',
          filePath: path,
          timestamp: new Date().toISOString(),
          linkedPillar: autoPillar,
        });
      }
    });

    // Register documents with auto-link based on file name
    documents.forEach((doc, index) => {
      const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
      const isBlueprint = doc.file_name.toLowerCase().includes('blueprint') || 
                          doc.file_name.toLowerCase().includes('plan');
      const sourceId = generateCitationId(isBlueprint ? 'B' : 'D', index);
      
      if (!citations.some(c => c.sourceId === sourceId)) {
        const docType: CitationSource['documentType'] = isBlueprint ? 'blueprint' : (isPdf ? 'pdf' : 'image');
        const autoPillar = getAutoPillarLink(doc.file_name, docType);
        
        citationsToRegister.push({
          sourceId,
          documentName: doc.file_name,
          documentType: docType,
          contextSnippet: `Uploaded document: ${doc.file_name}`,
          filePath: doc.file_path,
          timestamp: doc.uploaded_at,
          linkedPillar: autoPillar,
        });
      }
    });

    // Register all new citations
    if (citationsToRegister.length > 0) {
      registerMultipleCitations(citationsToRegister);
    }
  }, [projectId, siteImages, documents, citations, registerMultipleCitations]);
}