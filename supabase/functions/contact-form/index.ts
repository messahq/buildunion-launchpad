import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = message.split('\n').map((line: string) =>
      line.trim() ? `<p>${escapeHtml(line)}</p>` : ''
    ).join('');

    const now = new Date();
    const torontoDate = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Toronto'
    });
    const torontoTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Toronto'
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background: #f8fafc;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 24px 32px; border-bottom: 4px solid #f59e0b;">
      <h1 style="margin: 0; color: #fff; font-size: 20px;">📬 New Contact Form Submission</h1>
      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${torontoDate} • ${torontoTime} (Toronto)</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 80px;"><strong>From:</strong></td><td style="color: #1e293b;">${safeName}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Email:</strong></td><td><a href="mailto:${safeEmail}" style="color: #f59e0b;">${safeEmail}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;"><strong>Subject:</strong></td><td style="color: #1e293b;">${safeSubject}</td></tr>
        </table>
      </div>
      <h3 style="color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Message</h3>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0; font-size: 15px;">
        ${safeMessage}
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #94a3b8;">Reply directly to this email to respond to ${safeName}.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BuildUnion Contact <admin@buildunion.ca>",
        to: ["admin@buildunion.ca"],
        subject: `[Contact] ${subject}`,
        html: htmlContent,
        reply_to: email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
