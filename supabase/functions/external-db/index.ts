import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXTERNAL-DB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify user is authenticated via Lovable Cloud
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Create Lovable Cloud client to verify auth
    const lovableSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await lovableSupabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      throw new Error("Invalid authentication token");
    }

    const userId = claims.claims.sub;
    const userEmail = claims.claims.email;
    logStep("User authenticated via Lovable Cloud", { userId, email: userEmail });

    // Create external Supabase client
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!externalUrl || !externalKey) {
      throw new Error("External Supabase credentials not configured");
    }

    const externalSupabase = createClient(externalUrl, externalKey);
    logStep("Connected to external Supabase");

    // Parse request body
    const body = await req.json();
    const { action, table, data, filters, select } = body;

    logStep("Processing request", { action, table });

    let result;

    switch (action) {
      case "select": {
        let query = externalSupabase.from(table).select(select || "*");
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }
        
        const { data: selectData, error: selectError } = await query;
        if (selectError) throw selectError;
        result = selectData;
        break;
      }

      case "insert": {
        // Add lovable_user_id to track which Lovable user owns this data
        const insertData = { ...data, lovable_user_id: userId };
        const { data: insertResult, error: insertError } = await externalSupabase
          .from(table)
          .insert(insertData)
          .select();
        if (insertError) throw insertError;
        result = insertResult;
        break;
      }

      case "update": {
        if (!filters) throw new Error("Filters required for update");
        const { data: updateResult, error: updateError } = await externalSupabase
          .from(table)
          .update(data)
          .match(filters)
          .select();
        if (updateError) throw updateError;
        result = updateResult;
        break;
      }

      case "delete": {
        if (!filters) throw new Error("Filters required for delete");
        const { data: deleteResult, error: deleteError } = await externalSupabase
          .from(table)
          .delete()
          .match(filters)
          .select();
        if (deleteError) throw deleteError;
        result = deleteResult;
        break;
      }

      case "rpc": {
        const { functionName, args } = body;
        const { data: rpcResult, error: rpcError } = await externalSupabase
          .rpc(functionName, args || {});
        if (rpcError) throw rpcError;
        result = rpcResult;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    logStep("Request completed successfully", { action, table, resultCount: Array.isArray(result) ? result.length : 1 });

    return new Response(JSON.stringify({ data: result, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ data: null, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
