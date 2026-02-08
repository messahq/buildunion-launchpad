import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGoogleMapsApiReturn {
  apiKey: string | null;
  isLoading: boolean;
  error: boolean;
}

// Session-level cache to prevent repeated API calls
let cachedApiKey: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export const useGoogleMapsApi = (): UseGoogleMapsApiReturn => {
  const [apiKey, setApiKey] = useState<string | null>(cachedApiKey);
  const [isLoading, setIsLoading] = useState(!cachedApiKey);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Return cached key if still valid
    if (cachedApiKey && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      console.log("[useGoogleMapsApi] Using cached API key");
      setApiKey(cachedApiKey);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches in strict mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchApiKey = async () => {
      console.log("[useGoogleMapsApi] Starting API key fetch...");
      try {
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
          cachedApiKey = data.key;
          cacheTimestamp = Date.now();
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
