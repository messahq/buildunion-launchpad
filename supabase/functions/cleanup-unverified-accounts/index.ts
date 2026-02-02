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
    // Use service role key to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find unverified users older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get list of unverified users from auth.users
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const unverifiedUsers = users.users.filter(user => {
      const createdAt = new Date(user.created_at);
      const isOldEnough = createdAt < twentyFourHoursAgo;
      const isUnverified = !user.email_confirmed_at;
      return isOldEnough && isUnverified;
    });

    console.log(`Found ${unverifiedUsers.length} unverified accounts older than 24 hours`);

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each unverified user
    for (const user of unverifiedUsers) {
      try {
        // First delete related data from public tables (cascading should handle most)
        // Delete from bu_profiles
        await supabaseAdmin.from("bu_profiles").delete().eq("user_id", user.id);
        // Delete from profiles
        await supabaseAdmin.from("profiles").delete().eq("user_id", user.id);
        // Delete from user_draft_data
        await supabaseAdmin.from("user_draft_data").delete().eq("user_id", user.id);
        // Delete from user_trials
        await supabaseAdmin.from("user_trials").delete().eq("user_id", user.id);
        // Delete from push_subscriptions
        await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", user.id);

        // Finally delete the auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError);
          errors.push(`${user.email}: ${deleteError.message}`);
        } else {
          deletedCount++;
          console.log(`Deleted unverified user: ${user.email} (created: ${user.created_at})`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        errors.push(`${user.email}: ${String(userError)}`);
      }
    }

    const result = {
      success: true,
      message: `Cleanup complete. Deleted ${deletedCount} of ${unverifiedUsers.length} unverified accounts.`,
      deletedCount,
      totalFound: unverifiedUsers.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log("Cleanup result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
