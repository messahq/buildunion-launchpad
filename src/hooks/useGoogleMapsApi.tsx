import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsApiReturn {
  apiKey: string | null;
  isLoading: boolean;
  error: boolean;
}

export const useGoogleMapsApi = (): UseGoogleMapsApiReturn => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        // Get session if available (for logged-in users)
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const { data, error: fetchError } = await supabase.functions.invoke("get-maps-key", {
          headers,
        });

        if (fetchError) throw fetchError;
        if (data?.key) {
          setApiKey(data.key);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching maps key:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  return { apiKey, isLoading, error };
};
