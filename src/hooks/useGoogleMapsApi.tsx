import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseGoogleMapsApiReturn {
  apiKey: string | null;
  isLoading: boolean;
  error: boolean;
}

export const useGoogleMapsApi = (): UseGoogleMapsApiReturn => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchApiKey = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const tokenToUse = session?.access_token;

        if (!tokenToUse) {
          console.warn("No valid session for maps key fetch");
          setError(true);
          setIsLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase.functions.invoke("get-maps-key", {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
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
  }, [user]);

  return { apiKey, isLoading, error };
};
