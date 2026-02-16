import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, trade, location } = await req.json();
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

    const safeTrade = escapeHtml(trade || "");
    const safeLocation = escapeHtml(location || "");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://buildunionca.lovable.app/images/buildunion-logo-email.png" alt="BuildUnion" width="180" style="display:inline-block;" />
    </div>
    <div style="background:#18181b;border-radius:12px;padding:32px 24px;border:1px solid #27272a;">
      <h1 style="color:#f59e0b;font-size:24px;margin:0 0 8px;">You're on the list! 🎉</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Thank you for joining the BuildUnion early access waitlist.</p>
      
      <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#d4d4d8;font-size:13px;margin:0 0 4px;"><strong style="color:#f59e0b;">Trade:</strong> ${safeTrade}</p>
        <p style="color:#d4d4d8;font-size:13px;margin:0;"><strong style="color:#f59e0b;">Location:</strong> ${safeLocation}</p>
      </div>
      
      <p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin:0 0 16px;">
        We're rolling out access in phases — prioritizing by region and trade to ensure the best experience for every crew.
      </p>
      <p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin:0;">
        When it's your turn, you'll receive an exclusive invitation with early-member benefits.
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
        subject: "You're on the BuildUnion waitlist! 🏗️",
        html,
      }),
    });

    const result = await res.json();

    // Mark email as sent
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase
      .from("waitlist_signups")
      .update({ welcome_email_sent: true })
      .eq("email", email.toLowerCase());

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Waitlist welcome error:", err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
