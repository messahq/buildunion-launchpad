import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface VerificationEmailRequest {
  email: string;
  fullName?: string;
  redirectUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, fullName, redirectUrl }: VerificationEmailRequest = await req.json();

    // Validate required fields
    if (!email) {
      throw new Error("Missing required field: email");
    }

    console.log("[SEND-VERIFICATION-EMAIL] Processing request for:", email);

    // Create admin client with service role key to generate verification link
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Use magiclink type to generate a verification link
    // This will verify the email when clicked
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: redirectUrl || `${req.headers.get("origin")}/buildunion/workspace`,
      },
    });

    if (linkError) {
      console.error("[SEND-VERIFICATION-EMAIL] Error generating link:", linkError);
      throw new Error(`Failed to generate verification link: ${linkError.message}`);
    }

    const verificationLink = linkData.properties?.action_link;

    if (!verificationLink) {
      throw new Error("No verification link generated");
    }

    console.log("[SEND-VERIFICATION-EMAIL] Verification link generated successfully");

    // Send verification email via Resend
    const emailResponse = await resend.send({
      from: "BuildUnion <admin@buildunion.ca>",
      to: [email],
      subject: "Verify your BuildUnion account",
      html: generateEmailHtml(fullName || email.split("@")[0], verificationLink),
    });

    console.log("[SEND-VERIFICATION-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-VERIFICATION-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateEmailHtml(name: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
        .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; }
        .welcome { font-size: 22px; font-weight: 600; color: #1f2937; margin-bottom: 15px; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); }
        .divider { height: 1px; background: #e5e7eb; margin: 25px 0; }
        .features { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature { display: flex; align-items: center; margin: 12px 0; }
        .feature-icon { width: 24px; height: 24px; margin-right: 12px; color: #10b981; }
        .footer { text-align: center; padding: 25px; color: #6b7280; font-size: 13px; background: #f9fafb; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .footer a { color: #f59e0b; text-decoration: none; }
        .note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; margin: 20px 0; font-size: 14px; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏗️ BuildUnion</h1>
          <p>Construction Management Platform</p>
        </div>
        <div class="content">
          <p class="welcome">Welcome, ${name}!</p>
          
          <p>Thank you for signing up for BuildUnion. To complete your registration and access all features, please verify your email address.</p>
          
          <div class="button-container">
            <a href="${verificationLink}" class="button">✓ Verify My Email</a>
          </div>
          
          <div class="note">
            <strong>Link expires in 24 hours.</strong> If you didn't create a BuildUnion account, you can safely ignore this email.
          </div>
          
          <div class="divider"></div>
          
          <p style="font-size: 14px; color: #6b7280;">
            <strong>Having trouble?</strong> Copy and paste this link into your browser:<br>
            <span style="word-break: break-all; color: #f59e0b;">${verificationLink}</span>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} BuildUnion. All rights reserved.</p>
          <p>Questions? Contact us at <a href="mailto:support@buildunion.ca">support@buildunion.ca</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
