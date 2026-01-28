import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

class ResendClient {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async send(options: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    reply_to?: string;
  }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }
    
    return response.json();
  }
}

const resend = new ResendClient(RESEND_API_KEY || "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  message: string;
  replyTo?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipientEmail, recipientName, subject, message, replyTo }: AdminEmailRequest = await req.json();

    // Validate required fields
    if (!recipientEmail || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: recipientEmail, subject, message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // Build elegant light-themed HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif; 
      line-height: 1.7; 
      color: #374151; 
      margin: 0; 
      padding: 0; 
      background-color: #f8fafc; 
    }
    .wrapper {
      padding: 40px 20px;
      background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .container { 
      max-width: 640px; 
      margin: 0 auto; 
      background: #ffffff; 
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header { 
      background: linear-gradient(135deg, #ffffff 0%, #fefce8 100%);
      padding: 40px 32px;
      text-align: center;
      border-bottom: 3px solid #f59e0b;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .logo-icon {
      font-size: 32px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .logo-build { color: #1e293b; }
    .logo-union { color: #f59e0b; }
    .tagline {
      color: #64748b;
      font-size: 14px;
      margin-top: 8px;
      font-weight: 500;
    }
    .meta-bar {
      background: #f8fafc;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      color: #64748b;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .content { 
      padding: 40px 32px; 
    }
    .greeting {
      font-size: 18px;
      color: #1e293b;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .message-box { 
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fcd34d;
      padding: 24px; 
      margin: 24px 0; 
      border-radius: 12px;
      font-size: 15px;
      line-height: 1.8;
    }
    .message-box p {
      margin: 0 0 12px 0;
    }
    .message-box p:last-child {
      margin-bottom: 0;
    }
    .info-section {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px 24px;
      margin-top: 32px;
    }
    .info-title {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .info-grid {
      display: grid;
      gap: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }
    .info-label { color: #64748b; }
    .info-value { color: #1e293b; font-weight: 500; }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 32px 0;
    }
    .signature {
      color: #64748b;
      font-size: 14px;
      font-style: italic;
    }
    .footer { 
      background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
      padding: 32px; 
      text-align: center;
    }
    .footer-logo {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .footer-links {
      margin: 16px 0;
    }
    .footer-link {
      color: #f59e0b;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
    }
    .footer-link:hover {
      color: #d97706;
    }
    .footer-info {
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer-info p {
      margin: 4px 0;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #92400e;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .social-links {
      margin-top: 16px;
    }
    .social-links a {
      color: #64748b;
      text-decoration: none;
      margin: 0 8px;
      font-size: 13px;
    }
    @media (max-width: 600px) {
      .meta-bar { flex-direction: column; gap: 8px; text-align: center; }
      .content { padding: 24px 20px; }
      .header { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <span class="logo-icon">🏗️</span>
          <span class="logo-text">
            <span class="logo-build">Build</span><span class="logo-union">Union</span>
          </span>
        </div>
        <div class="tagline">Construction Management Platform</div>
      </div>
      
      <div class="meta-bar">
        <div class="meta-item">
          <span>📅</span>
          <span>${currentDate}</span>
        </div>
        <div class="meta-item">
          <span>🕐</span>
          <span>${currentTime}</span>
        </div>
        <span class="badge">Official Message</span>
      </div>

      <div class="content">
        <p class="greeting">
          ${recipientName ? `Dear ${recipientName},` : 'Hello,'}
        </p>
        
        <div class="message-box">
          ${message.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('')}
        </div>

        <div class="divider"></div>
        
        <p class="signature">
          Warm regards,<br>
          <strong style="color: #1e293b;">BuildUnion Admin Team</strong>
        </p>

        <div class="info-section">
          <div class="info-title">📧 Message Details</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Sent To:</span>
              <span class="info-value">${recipientEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Subject:</span>
              <span class="info-value">${subject}</span>
            </div>
            <div class="info-row">
              <span class="info-label">From:</span>
              <span class="info-value">admin@buildunion.ca</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${currentDate} at ${currentTime}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-logo">
          <span class="logo-build">Build</span><span class="logo-union">Union</span>
        </div>
        <div class="footer-links">
          <a href="https://buildunion.ca" class="footer-link">🌐 buildunion.ca</a>
        </div>
        <div class="footer-info">
          <p>📍 Toronto, Ontario, Canada</p>
          <p>📧 admin@buildunion.ca</p>
          <p style="margin-top: 12px;">© ${new Date().getFullYear()} BuildUnion. All rights reserved.</p>
          <p style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
            This is an official communication from BuildUnion Admin.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    console.log(`Sending admin email to: ${recipientEmail}, subject: ${subject}`);

    const emailResponse = await resend.send({
      from: "BuildUnion Admin <admin@buildunion.ca>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
      reply_to: replyTo || "admin@buildunion.ca",
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.id,
        sentTo: recipientEmail,
        subject: subject,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending admin email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
