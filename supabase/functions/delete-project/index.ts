import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Missing projectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify ownership or admin
    const { data: project } = await adminClient
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin status
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });

    if (project.user_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Not authorized to delete this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting project ${projectId} for user ${user.id}`);

    // Delete all related data with service role (bypasses RLS)
    await adminClient.from("project_tasks").delete().eq("project_id", projectId);
    await adminClient.from("project_documents").delete().eq("project_id", projectId);
    await adminClient.from("project_chat_messages").delete().eq("project_id", projectId);
    await adminClient.from("site_checkins").delete().eq("project_id", projectId);
    await adminClient.from("site_logs").delete().eq("project_id", projectId);
    await adminClient.from("material_deliveries").delete().eq("project_id", projectId);
    await adminClient.from("pending_budget_changes").delete().eq("project_id", projectId);
    await adminClient.from("project_syntheses").delete().eq("project_id", projectId);
    await adminClient.from("team_invitations").delete().eq("project_id", projectId);
    await adminClient.from("project_members").delete().eq("project_id", projectId);
    await adminClient.from("baseline_versions").delete().eq("project_id", projectId);
    await adminClient.from("project_summaries").delete().eq("project_id", projectId);

    // Contracts and events
    const { data: contracts } = await adminClient
      .from("contracts")
      .select("id")
      .eq("project_id", projectId);

    if (contracts && contracts.length > 0) {
      for (const c of contracts) {
        await adminClient.from("contract_events").delete().eq("contract_id", c.id);
      }
      await adminClient.from("contracts").delete().eq("project_id", projectId);
    }

    // Finally delete the project
    const { error } = await adminClient.from("projects").delete().eq("id", projectId);

    if (error) {
      console.error("Error deleting project:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete project" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted project ${projectId}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in delete-project:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
