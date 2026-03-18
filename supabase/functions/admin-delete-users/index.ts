import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Authentication & Admin Authorization ─────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized — invalid or expired token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const callerUserId = claimsData.claims.sub;

    // Verify caller is admin using the has_role security definer function
    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc("is_admin", { _user_id: callerUserId });
    if (roleError || !isAdmin) {
      console.warn(`[admin-delete-users] Non-admin access attempt by user: ${callerUserId}`);
      return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // ─── Service Role Client for Deletion ─────────────────────
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user_ids } = await req.json();

    if (!user_ids || !Array.isArray(user_ids)) {
      return new Response(JSON.stringify({ error: "user_ids array required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const userId of user_ids) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        errors.push(`${userId}: ${error.message}`);
      } else {
        deletedCount++;
        console.log(`[admin-delete-users] Admin ${callerUserId} deleted user: ${userId}`);
      }
    }

    return new Response(JSON.stringify({ success: true, deletedCount, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[admin-delete-users] Error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});