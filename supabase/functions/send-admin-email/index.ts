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

    const logoUrl = "https://buildunionca.lovable.app/images/buildunion-logo-email.png";

    // Build elegant light-themed HTML email with logo
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Space Grotesk', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif; 
      line-height: 1.7; 
      color: #374151; 
      margin: 0; 
      padding: 0; 
      background-color: #f8fafc; 
    }
    .brand-name {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .brand-build { color: #475569; }
    .brand-union { color: #f59e0b; }
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
      background: linear-gradient(135deg, #ffffff 0%, #fffbeb 50%, #fef3c7 100%);
      padding: 32px;
      text-align: center;
      border-bottom: 4px solid #f59e0b;
    }
    .logo-img {
      max-width: 120px;
      height: auto;
      margin-bottom: 16px;
    }
    .header-content {
      margin-top: 16px;
    }
    .company-name {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .header-info {
      display: table;
      width: 100%;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .header-info-item {
      display: inline-block;
      padding: 0 16px;
      border-right: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .header-info-item:last-child {
      border-right: none;
    }
    .header-info-item a {
      color: #f59e0b;
      text-decoration: none;
      font-weight: 500;
    }
    .meta-bar {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 16px 32px;
      border-bottom: 1px solid #e2e8f0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      border-left: 4px solid #f59e0b;
      padding: 24px; 
      margin: 24px 0; 
      border-radius: 0 12px 12px 0;
      font-size: 15px;
      line-height: 1.8;
    }
    .message-box p {
      margin: 0 0 12px 0;
    }
    .message-box p:last-child {
      margin-bottom: 0;
    }
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
    .signature strong {
      color: #1e293b;
      font-style: normal;
    }
    .info-section {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px 24px;
      margin-top: 32px;
      border: 1px solid #e2e8f0;
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
      padding: 4px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label { color: #64748b; }
    .info-value { color: #1e293b; font-weight: 500; }
    .footer { 
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      padding: 40px 32px; 
      text-align: center;
    }
    .footer-logo-section {
      margin-bottom: 24px;
    }
    .footer-logo-img {
      max-width: 80px;
      height: auto;
      opacity: 0.9;
    }
    .footer-company-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 22px;
      font-weight: 600;
      margin-top: 12px;
      letter-spacing: -0.5px;
    }
    .footer-build { color: #ffffff; }
    .footer-union { color: #f59e0b; }
    .footer-tagline {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 4px;
    }
    .footer-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #475569, transparent);
      margin: 24px 0;
    }
    .footer-contact {
      margin: 20px 0;
    }
    .footer-contact-row {
      display: inline-block;
      margin: 6px 16px;
      font-size: 13px;
      color: #94a3b8;
    }
    .footer-contact-row a {
      color: #f59e0b;
      text-decoration: none;
    }
    .footer-contact-row a:hover {
      color: #fbbf24;
      text-decoration: underline;
    }
    .footer-links {
      margin: 24px 0;
    }
    .footer-link-btn {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      margin: 4px;
    }
    .footer-legal {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #334155;
    }
    .footer-legal p {
      margin: 4px 0;
      font-size: 11px;
      color: #64748b;
    }
    .footer-copyright {
      font-size: 12px !important;
      color: #94a3b8 !important;
      font-weight: 500;
    }
    .footer-badges {
      margin-top: 16px;
    }
    .footer-badge {
      display: inline-block;
      background: #334155;
      color: #94a3b8;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10px;
      margin: 2px 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    @media (max-width: 600px) {
      .meta-row { flex-direction: column; text-align: center; }
      .content { padding: 24px 20px; }
      .header { padding: 24px 16px; }
      .header-info-item { display: block; border-right: none; padding: 4px 0; }
      .footer { padding: 32px 20px; }
      .footer-contact-row { display: block; margin: 8px 0; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- HEADER -->
      <div class="header">
        <div class="brand-name" style="font-size: 28px; margin-bottom: 8px;">
          <span class="brand-build">Build</span><span class="brand-union">Union</span>
        </div>
        <div class="header-content">
          <div class="company-name">Construction Management Platform</div>
        </div>
        <div class="header-info">
          <span class="header-info-item">
            🌐 <a href="https://buildunion.ca">buildunion.ca</a>
          </span>
          <span class="header-info-item">
            📧 <a href="mailto:admin@buildunion.ca">admin@buildunion.ca</a>
          </span>
          <span class="header-info-item">
            📍 Toronto, Ontario, Canada
          </span>
        </div>
      </div>
      
      <!-- META BAR -->
      <div class="meta-bar">
        <div class="meta-row">
          <div class="meta-item">
            📅 ${currentDate}
          </div>
          <div class="meta-item">
            🕐 ${currentTime}
          </div>
          <span class="badge">✉️ Official Message</span>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="content">
        <p class="greeting">
          ${recipientName ? `Dear ${recipientName},` : 'Hello,'}
        </p>
        
        <div class="message-box">
          ${message.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('')}
        </div>

        <div class="divider"></div>
        
        <p class="signature">
          Warm regards,<br><br>
          <strong>The BuildUnion Team</strong><br>
          <span style="font-size: 12px; color: #94a3b8;">admin@buildunion.ca</span>
        </p>

        <div class="info-section">
          <div class="info-title">📋 Message Details</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Recipient:</span>
              <span class="info-value">${recipientEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Subject:</span>
              <span class="info-value">${subject}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sent From:</span>
              <span class="info-value">BuildUnion Admin</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date & Time:</span>
              <span class="info-value">${currentDate}, ${currentTime}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-logo-section">
          <div class="footer-company-name">
            <span class="footer-build">Build</span><span class="footer-union">Union</span>
          </div>
          <div class="footer-tagline">Building Better, Together</div>
        </div>

        <div class="footer-divider"></div>

        <div class="footer-contact">
          <span class="footer-contact-row">🌐 <a href="https://buildunion.ca">buildunion.ca</a></span>
          <span class="footer-contact-row">📧 <a href="mailto:admin@buildunion.ca">admin@buildunion.ca</a></span>
          <span class="footer-contact-row">📍 Toronto, Ontario, Canada</span>
        </div>

        <div class="footer-legal">
          <p class="footer-copyright">© 2026 BuildUnion. All rights reserved.</p>
          <p>This is an official communication from BuildUnion Admin.</p>
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
