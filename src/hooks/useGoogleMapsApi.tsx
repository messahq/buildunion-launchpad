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
      console.log("[useGoogleMapsApi] Starting API key fetch...");
      try {
        // Get session if available (for logged-in users)
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[useGoogleMapsApi] Session:", session ? "authenticated" : "guest");
        
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        console.log("[useGoogleMapsApi] Calling get-maps-key function...");
        const { data, error: fetchError } = await supabase.functions.invoke("get-maps-key", {
          headers,
        });

        console.log("[useGoogleMapsApi] Response:", { data, error: fetchError });

        if (fetchError) throw fetchError;
        if (data?.key) {
          console.log("[useGoogleMapsApi] API key received successfully");
          setApiKey(data.key);
        } else {
          console.error("[useGoogleMapsApi] No key in response data");
          setError(true);
        }
      } catch (err) {
        console.error("[useGoogleMapsApi] Error fetching maps key:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  return { apiKey, isLoading, error };
};
