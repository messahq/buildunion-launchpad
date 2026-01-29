import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request body
    const { confirmation } = await req.json();
    
    if (confirmation !== "DELETE") {
      return new Response(
        JSON.stringify({ error: "Invalid confirmation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Deleting account for user: ${userId}`);

    // Delete user data in order (respecting foreign key constraints)
    // Note: Most tables have CASCADE delete via user_id, but we do this explicitly for safety

    // 1. Delete user's forum replies
    await adminClient.from("forum_replies").delete().eq("user_id", userId);

    // 2. Delete user's forum posts
    await adminClient.from("forum_posts").delete().eq("user_id", userId);

    // 3. Delete user's team messages
    await adminClient.from("team_messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

    // 4. Delete project-related data
    // Get user's projects first
    const { data: userProjects } = await adminClient
      .from("projects")
      .select("id")
      .eq("user_id", userId);

    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map(p => p.id);

      // Delete project tasks
      for (const projectId of projectIds) {
        await adminClient.from("project_tasks").delete().eq("project_id", projectId);
        await adminClient.from("project_documents").delete().eq("project_id", projectId);
        await adminClient.from("project_members").delete().eq("project_id", projectId);
        await adminClient.from("project_syntheses").delete().eq("project_id", projectId);
        await adminClient.from("team_invitations").delete().eq("project_id", projectId);
        await adminClient.from("baseline_versions").delete().eq("project_id", projectId);
      }
    }

    // 5. Delete project summaries
    await adminClient.from("project_summaries").delete().eq("user_id", userId);

    // 6. Delete contracts and related
    const { data: userContracts } = await adminClient
      .from("contracts")
      .select("id")
      .eq("user_id", userId);

    if (userContracts && userContracts.length > 0) {
      for (const contract of userContracts) {
        await adminClient.from("contract_events").delete().eq("contract_id", contract.id);
      }
    }
    await adminClient.from("contracts").delete().eq("user_id", userId);

    // 7. Delete projects
    await adminClient.from("projects").delete().eq("user_id", userId);

    // 8. Delete user templates
    await adminClient.from("user_templates").delete().eq("user_id", userId);
    await adminClient.from("task_templates").delete().eq("user_id", userId);

    // 9. Delete user trials
    await adminClient.from("user_trials").delete().eq("user_id", userId);

    // 10. Delete draft data
    await adminClient.from("user_draft_data").delete().eq("user_id", userId);

    // 11. Delete push subscriptions
    await adminClient.from("push_subscriptions").delete().eq("user_id", userId);

    // 12. Delete bu_profile
    await adminClient.from("bu_profiles").delete().eq("user_id", userId);

    // 13. Delete profile
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // 14. Delete user roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // 15. Delete storage files (avatars)
    const { data: avatarFiles } = await adminClient.storage
      .from("avatars")
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      const filePaths = avatarFiles.map(f => `${userId}/${f.name}`);
      await adminClient.storage.from("avatars").remove(filePaths);
    }

    // 16. Finally, delete the auth user using admin API
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in delete-account function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
