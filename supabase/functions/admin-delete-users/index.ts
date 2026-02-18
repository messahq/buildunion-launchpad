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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
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
        console.log(`Deleted user: ${userId}`);
      }
    }

    return new Response(JSON.stringify({ success: true, deletedCount, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
