import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = escapeHtml(fullName || email.split("@")[0]);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://buildunionca.lovable.app/images/buildunion-logo-email.png" alt="BuildUnion" width="180" style="display:inline-block;" />
    </div>
    <div style="background:#18181b;border-radius:12px;padding:32px 24px;border:1px solid #27272a;">
      <h1 style="color:#f59e0b;font-size:24px;margin:0 0 8px;">Welcome to BuildUnion, ${safeName}! 🏗️</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Your account has been created. Here's what you can do:</p>
      
      <div style="margin-bottom:24px;">
        <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:12px;">
          <p style="color:#f59e0b;font-size:14px;font-weight:600;margin:0 0 4px;">📐 Create Your First Project</p>
          <p style="color:#d4d4d8;font-size:13px;margin:0;">Set up a project with AI-powered cost estimation and material calculations.</p>
        </div>
        <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:12px;">
          <p style="color:#f59e0b;font-size:14px;font-weight:600;margin:0 0 4px;">👷 Build Your Profile</p>
          <p style="color:#d4d4d8;font-size:13px;margin:0;">Add your trade, certifications, and experience to connect with other professionals.</p>
        </div>
        <div style="background:#27272a;border-radius:8px;padding:16px;">
          <p style="color:#f59e0b;font-size:14px;font-weight:600;margin:0 0 4px;">👥 Invite Your Team</p>
          <p style="color:#d4d4d8;font-size:13px;margin:0;">Add foremen, workers, and subcontractors to collaborate in real-time.</p>
        </div>
      </div>
      
      <div style="text-align:center;margin:24px 0;">
        <a href="https://buildunionca.lovable.app/buildunion/workspace" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#18181b;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Go to Your Workspace →
        </a>
      </div>

      <p style="color:#71717a;font-size:13px;text-align:center;margin:0;">
        Need help? Visit our <a href="https://buildunionca.lovable.app/buildunion/help" style="color:#f59e0b;text-decoration:none;">Help Center</a> or reply to this email.
      </p>
    </div>
    <p style="color:#52525b;font-size:11px;text-align:center;margin-top:24px;">
      © ${new Date().getFullYear()} BuildUnion · Toronto, Canada
    </p>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BuildUnion <admin@buildunion.ca>",
        to: [email],
        subject: "Welcome to BuildUnion — Let's Build! 🏗️",
        html,
      }),
    });

    const result = await res.json();
    console.log("[WELCOME-EMAIL] Sent to:", email, "Result:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[WELCOME-EMAIL] Error:", err);
    return new Response(JSON.stringify({ error: "Failed to send welcome email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
