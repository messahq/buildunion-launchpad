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
    const { table, action, id, newStatus } = body;

    // ─── Waitlist status update action ─────────────────────
    if (action === "update_waitlist_status" && id && newStatus) {
      if (!["approved", "rejected", "pending"].includes(newStatus)) {
        throw new Error("Invalid status. Must be 'approved', 'rejected', or 'pending'.");
      }
      const { error: updateError } = await supabaseAdmin
        .from("waitlist_signups")
        .update({ status: newStatus })
        .eq("id", id);
      if (updateError) throw updateError;
      logStep("Waitlist status updated", { id, newStatus });

      // Send approval email if approved
      if (newStatus === "approved") {
        const { data: signup } = await supabaseAdmin
          .from("waitlist_signups")
          .select("email, trade, location")
          .eq("id", id)
          .single();

        if (signup?.email) {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            const safeTrade = (signup.trade || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeLocation = (signup.location || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const approvalHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://buildunionca.lovable.app/images/buildunion-logo-email.png" alt="BuildUnion" width="180" style="display:inline-block;" />
    </div>
    <div style="background:#18181b;border-radius:12px;padding:32px 24px;border:1px solid #27272a;">
      <h1 style="color:#f59e0b;font-size:24px;margin:0 0 8px;">You're Approved! 🎉</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Great news — your BuildUnion early access has been approved!</p>
      
      <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#d4d4d8;font-size:13px;margin:0 0 4px;"><strong style="color:#f59e0b;">Trade:</strong> ${safeTrade}</p>
        <p style="color:#d4d4d8;font-size:13px;margin:0;"><strong style="color:#f59e0b;">Location:</strong> ${safeLocation}</p>
      </div>
      
      <p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin:0 0 24px;">
        You can now create your account and start using BuildUnion's full suite of construction management tools.
      </p>
      
      <div style="text-align:center;">
        <a href="https://buildunionca.lovable.app/dock-register" style="display:inline-block;background:#f59e0b;color:#0a0a0a;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none;">
          Create Your Account →
        </a>
      </div>
    </div>
    <p style="color:#52525b;font-size:11px;text-align:center;margin-top:24px;">
      © ${new Date().getFullYear()} BuildUnion · Toronto, Canada
    </p>
  </div>
</body>
</html>`;

            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                  from: "BuildUnion <admin@buildunion.ca>",
                  to: [signup.email],
                  subject: "You're approved! Welcome to BuildUnion 🏗️",
                  html: approvalHtml,
                }),
              });
              const emailResult = await emailRes.json();
              logStep("Approval email sent", { email: signup.email, resendId: emailResult.id });
            } catch (emailErr) {
              logStep("Approval email failed", { error: String(emailErr) });
            }
          } else {
            logStep("RESEND_API_KEY not set, skipping approval email");
          }
        }
      }

      return new Response(JSON.stringify({ data: { success: true }, error: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!table || !["projects", "contracts", "project_tasks", "waitlist_signups"].includes(table)) {
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
    } else if (table === "waitlist_signups") {
      query = supabaseAdmin
        .from("waitlist_signups")
        .select("id, email, trade, company_size, location, status, welcome_email_sent, created_at")
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
