import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DraftDataHook<T> {
  draftData: T | null;
  hasDraft: boolean;
  loading: boolean;
  saveDraft: (data: T) => Promise<boolean>;
  clearDraft: () => Promise<boolean>;
  lastUpdated: Date | null;
}

export function useDraftData<T = any>(draftType: string = "quick_mode"): DraftDataHook<T> {
  const { user } = useAuth();
  const [draftData, setDraftData] = useState<T | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch draft data from database
  const fetchDraftData = useCallback(async () => {
    if (!user) {
      setDraftData(null);
      setLastUpdated(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_draft_data")
        .select("*")
        .eq("user_id", user.id)
        .eq("draft_type", draftType)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDraftData(data.data as T);
        setLastUpdated(new Date(data.last_updated));
      } else {
        setDraftData(null);
        setLastUpdated(null);
      }
    } catch (error) {
      console.error("Error fetching draft data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, draftType]);

  useEffect(() => {
    fetchDraftData();
  }, [fetchDraftData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save draft with debounce
  const saveDraft = useCallback(async (data: T): Promise<boolean> => {
    if (!user) return false;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    return new Promise((resolve) => {
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from("user_draft_data")
            .upsert({
              user_id: user.id,
              draft_type: draftType,
              data: data as any,
              last_updated: new Date().toISOString(),
            }, {
              onConflict: "user_id,draft_type",
            });

          if (error) throw error;

          setDraftData(data);
          setLastUpdated(new Date());
          resolve(true);
        } catch (error) {
          console.error("Error saving draft:", error);
          resolve(false);
        }
      }, 1000); // 1 second debounce
    });
  }, [user, draftType]);

  // Clear draft
  const clearDraft = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("user_draft_data")
        .delete()
        .eq("user_id", user.id)
        .eq("draft_type", draftType);

      if (error) throw error;

      setDraftData(null);
      setLastUpdated(null);
      return true;
    } catch (error) {
      console.error("Error clearing draft:", error);
      return false;
    }
  }, [user, draftType]);

  return {
    draftData,
    hasDraft: draftData !== null,
    loading,
    saveDraft,
    clearDraft,
    lastUpdated,
  };
}

export default useDraftData;
