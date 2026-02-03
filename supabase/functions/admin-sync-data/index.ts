import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SYNC] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Create admin client with service role to check admin status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication token");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is admin
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !adminRole) {
      logStep("Access denied - not admin", { userId: user.id });
      throw new Error("Access denied: Admin role required");
    }

    logStep("Admin access confirmed");

    // Parse request
    const body = await req.json();
    const { table } = body;

    if (!table || !["projects", "contracts", "project_tasks"].includes(table)) {
      throw new Error("Invalid table specified");
    }

    logStep("Fetching all data", { table });

    // Fetch ALL data using service role (bypasses RLS) - including archived records
    let query;
    
    if (table === "projects") {
      query = supabaseAdmin
        .from("projects")
        .select("id, name, status, address, created_at, user_id, archived_at")
        .order("created_at", { ascending: false })
        .limit(500);
    } else if (table === "contracts") {
      query = supabaseAdmin
        .from("contracts")
        .select("id, contract_number, project_name, client_name, status, total_amount, created_at, user_id, archived_at")
        .order("created_at", { ascending: false })
        .limit(500);
    } else {
      query = supabaseAdmin
        .from("project_tasks")
        .select("id, title, status, priority, project_id, created_at, assigned_to, assigned_by, archived_at")
        .order("created_at", { ascending: false })
        .limit(500);
    }

    const { data, error } = await query;

    if (error) {
      logStep("Query error", { message: error.message });
      throw error;
    }

    // Fetch profiles separately for user names
    const userIds = new Set<string>();
    if (data) {
      for (const record of data as Record<string, unknown>[]) {
        if (table === "project_tasks") {
          const assignedBy = record.assigned_by as string | undefined;
          if (assignedBy) userIds.add(assignedBy);
        } else {
          const userId = record.user_id as string | undefined;
          if (userId) userIds.add(userId);
        }
      }
    }

    let profilesMap = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(userIds));
      
      if (profiles) {
        profilesMap = new Map(profiles.map(p => [p.user_id, p.full_name || "Unknown"]));
      }
    }

    // Attach profile info to records
    const enrichedData = (data as Record<string, unknown>[] | null)?.map(record => {
      const userId = table === "project_tasks" 
        ? record.assigned_by as string 
        : record.user_id as string;
      return {
        ...record,
        profiles: { full_name: profilesMap.get(userId) || "Unknown User" }
      };
    });

    logStep("Data fetched successfully", { table, count: enrichedData?.length || 0 });

    return new Response(JSON.stringify({ data: enrichedData, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error && typeof error === "object" && "message" in error) {
      errorMessage = (error as { message: string }).message;
    }
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ data: null, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
