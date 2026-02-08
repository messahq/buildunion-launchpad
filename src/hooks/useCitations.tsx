// ============================================
// CITATION HOOK - Database-First State Management
// ============================================
// The Source of Truth is the DATABASE, not local state
// UI updates are EFFECTS of successful DB operations
// ============================================

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Citation, createCitation, getCitationType, migrateLegacyCitation, CITATION_TYPES } from "@/types/citation";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

interface UseCitationsOptions {
  projectId?: string;
  autoLoad?: boolean;
}

interface UseCitationsReturn {
  citations: Citation[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Core operations - DB first
  saveCitation: (citation: Omit<Citation, 'id' | 'timestamp'>) => Promise<Citation | null>;
  loadCitations: () => Promise<void>;
  deleteCitation: (citationId: string) => Promise<boolean>;
  
  // Utility
  getCitationByType: (type: Citation['cite_type']) => Citation | undefined;
  getCitationById: (id: string) => Citation | undefined;
}

/**
 * useCitations - Citation-Driven State Hook
 * 
 * Key Principle: The database is the source of truth.
 * Local state is only a mirror of what's in the database.
 * All UI updates are EFFECTS of successful database operations.
 */
export function useCitations(options: UseCitationsOptions = {}): UseCitationsReturn {
  const { projectId, autoLoad = true } = options;
  const { user } = useAuth();
  
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load citations from database
   * This is the ONLY way to populate local state
   */
  const loadCitations = useCallback(async () => {
    if (!projectId || !user) {
      setCitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("project_summaries")
        .select("verified_facts")
        .eq("project_id", projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data?.verified_facts && Array.isArray(data.verified_facts)) {
        // Parse and migrate legacy citations to new format
        const parsed: Citation[] = (data.verified_facts as unknown[])
          .filter((item): item is Record<string, unknown> => 
            item !== null && typeof item === 'object'
          )
          .map((item) => {
            // Check if already new format
            if ('cite_type' in item && 'question_key' in item) {
              return item as unknown as Citation;
            }
            // Migrate legacy format
            return migrateLegacyCitation({
              id: String(item.id || ''),
              questionKey: String(item.questionKey || item.question_key || ''),
              answer: String(item.answer || ''),
              timestamp: String(item.timestamp || new Date().toISOString()),
              elementType: item.elementType as string | undefined,
              metadata: item.metadata as Record<string, unknown> | undefined,
            });
          });

        setCitations(parsed);
      } else {
        setCitations([]);
      }
    } catch (err) {
      console.error("[useCitations] Load error:", err);
      setError("Failed to load citations");
      setCitations([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  /**
   * Save a new citation to the database
   * UI update happens ONLY after successful save
   */
  const saveCitation = useCallback(async (
    citationData: Omit<Citation, 'id' | 'timestamp'>
  ): Promise<Citation | null> => {
    if (!projectId || !user) {
      toast.error("Cannot save citation: No active project");
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Create the citation with ID and timestamp
      const newCitation = createCitation({
        cite_type: citationData.cite_type,
        question_key: citationData.question_key,
        answer: citationData.answer,
        value: citationData.value,
        metadata: citationData.metadata,
      });

      // Get current citations from DB (not local state)
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("id, verified_facts")
        .eq("project_id", projectId)
        .maybeSingle();

      const currentFacts = Array.isArray(currentData?.verified_facts) 
        ? currentData.verified_facts 
        : [];

      // Append new citation - cast to Json compatible format
      const updatedFacts = [...currentFacts, newCitation as unknown as Record<string, unknown>];

      // Save to database - use update if exists, insert if not
      let upsertError;
      if (currentData?.id) {
        const { error } = await supabase
          .from("project_summaries")
          .update({
            verified_facts: updatedFacts as unknown as null,
            updated_at: new Date().toISOString(),
          })
          .eq("project_id", projectId);
        upsertError = error;
      } else {
        const { error } = await supabase
          .from("project_summaries")
          .insert({
            project_id: projectId,
            user_id: user.id,
            verified_facts: updatedFacts as unknown as null,
          });
        upsertError = error;
      }

      if (upsertError) throw upsertError;

      // SUCCESS: Now update local state as an EFFECT
      setCitations(prev => [...prev, newCitation]);
      
      console.log("[useCitations] Citation saved:", newCitation.id);
      return newCitation;

    } catch (err) {
      console.error("[useCitations] Save error:", err);
      setError("Failed to save citation");
      toast.error("Citation save failed - please retry");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, user]);

  /**
   * Delete a citation from the database
   */
  const deleteCitation = useCallback(async (citationId: string): Promise<boolean> => {
    if (!projectId || !user) return false;

    try {
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("verified_facts")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!currentData?.verified_facts) return false;

      const updatedFacts = (currentData.verified_facts as unknown[]).filter(
        (item: unknown) => (item as Record<string, unknown>).id !== citationId
      ) as unknown as Record<string, unknown>[];

      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({ 
          verified_facts: updatedFacts as unknown as null,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (updateError) throw updateError;

      // SUCCESS: Update local state as EFFECT
      setCitations(prev => prev.filter(c => c.id !== citationId));
      return true;

    } catch (err) {
      console.error("[useCitations] Delete error:", err);
      return false;
    }
  }, [projectId, user]);

  /**
   * Get citation by type
   */
  const getCitationByType = useCallback((type: Citation['cite_type']) => {
    return citations.find(c => c.cite_type === type);
  }, [citations]);

  /**
   * Get citation by ID
   */
  const getCitationById = useCallback((id: string) => {
    return citations.find(c => c.id === id);
  }, [citations]);

  // Auto-load on mount and projectId change
  useEffect(() => {
    if (autoLoad && projectId && user) {
      loadCitations();
    }
  }, [autoLoad, projectId, user, loadCitations]);

  return {
    citations,
    isLoading,
    isSaving,
    error,
    saveCitation,
    loadCitations,
    deleteCitation,
    getCitationByType,
    getCitationById,
  };
}

export default useCitations;
