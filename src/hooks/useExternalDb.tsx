import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ExternalDbRequest {
  action: "select" | "insert" | "update" | "delete" | "rpc";
  table?: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  select?: string;
  functionName?: string;
  args?: Record<string, unknown>;
}

interface ExternalDbResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

export const useExternalDb = () => {
  const { session } = useAuth();

  const query = async <T = unknown>(
    request: ExternalDbRequest
  ): Promise<ExternalDbResponse<T>> => {
    if (!session?.access_token) {
      return { data: null, error: "Not authenticated" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("external-db", {
        body: request,
      });

      if (error) {
        console.error("[useExternalDb] Function error:", error);
        return { data: null, error: error.message };
      }

      return data as ExternalDbResponse<T>;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("[useExternalDb] Error:", errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  // Convenience methods
  const select = async <T = unknown>(
    table: string,
    options?: { select?: string; filters?: Record<string, unknown> }
  ) => {
    return query<T[]>({
      action: "select",
      table,
      select: options?.select,
      filters: options?.filters,
    });
  };

  const insert = async <T = unknown>(
    table: string,
    data: Record<string, unknown>
  ) => {
    return query<T[]>({
      action: "insert",
      table,
      data,
    });
  };

  const update = async <T = unknown>(
    table: string,
    data: Record<string, unknown>,
    filters: Record<string, unknown>
  ) => {
    return query<T[]>({
      action: "update",
      table,
      data,
      filters,
    });
  };

  const remove = async <T = unknown>(
    table: string,
    filters: Record<string, unknown>
  ) => {
    return query<T[]>({
      action: "delete",
      table,
      filters,
    });
  };

  const rpc = async <T = unknown>(
    functionName: string,
    args?: Record<string, unknown>
  ) => {
    return query<T>({
      action: "rpc",
      functionName,
      args,
    });
  };

  return {
    query,
    select,
    insert,
    update,
    remove,
    rpc,
    isAuthenticated: !!session,
  };
};
