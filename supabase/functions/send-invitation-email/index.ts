import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

interface InvitationEmailRequest {
  recipientEmail: string;
  projectName: string;
  projectId: string;
  inviterName: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  foreman: "Foreman",
  worker: "Worker",
  inspector: "Inspector",
  subcontractor: "Subcontractor",
  member: "Team Member",
};

const escapeHtml = (text: string): string => {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[SEND-INVITATION-EMAIL] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Missing authentication" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create authenticated Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[SEND-INVITATION-EMAIL] Invalid token:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[SEND-INVITATION-EMAIL] User authenticated:", userId);

    // Parse request body
    const { 
      recipientEmail, 
      projectName, 
      projectId,
      inviterName,
      role
    }: InvitationEmailRequest = await req.json();

    // Validate required fields
    if (!recipientEmail || !projectName || !projectId) {
      throw new Error("Missing required fields: recipientEmail, projectName, projectId");
    }

    // ===== AUTHORIZATION CHECK =====
    // Verify user owns the project they're inviting to
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("user_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("[SEND-INVITATION-EMAIL] Project not found:", projectId);
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (project.user_id !== userId) {
      console.error("[SEND-INVITATION-EMAIL] User does not own project:", { userId, projectOwnerId: project.user_id });
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - You do not own this project" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const roleLabel = ROLE_LABELS[role] || "Team Member";
    const safeProjectName = escapeHtml(projectName);
    const safeInviterName = escapeHtml(inviterName || 'A project owner');
    const safeRoleLabel = escapeHtml(roleLabel);
    const appUrl = "https://buildunionca.lovable.app";

    const emailResponse = await resend.send({
      from: "BuildUnion <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `You're Invited to Join "${safeProjectName}" on BuildUnion`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .role-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-radius: 0 0 8px 8px; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏗️ BuildUnion</h1>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">You've Been Invited!</h2>
              
              <p><strong>${safeInviterName}</strong> has invited you to join their construction project on BuildUnion.</p>
              
              <div class="highlight">
                <p style="margin: 0;"><strong>Project:</strong> ${safeProjectName}</p>
                <p style="margin: 10px 0 0 0;"><strong>Your Role:</strong> <span class="role-badge">${safeRoleLabel}</span></p>
              </div>
              
              <p>As a ${safeRoleLabel.toLowerCase()}, you'll be able to:</p>
              <ul>
                ${role === 'foreman' ? `
                  <li>Create and manage tasks</li>
                  <li>Upload documents</li>
                  <li>Generate reports</li>
                  <li>View all project data</li>
                ` : role === 'inspector' ? `
                  <li>View all project data</li>
                  <li>Generate inspection reports</li>
                  <li>Review team progress</li>
                ` : `
                  <li>View your assigned tasks</li>
                  <li>Update task status</li>
                  <li>Access project documents</li>
                `}
              </ul>
              
              <p style="text-align: center;">
                <a href="${appUrl}/buildunion/workspace" class="button">Accept Invitation</a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you don't have a BuildUnion account yet, you'll be prompted to create one. Your invitation will be waiting for you after you sign up.
              </p>
            </div>
            <div class="footer">
              <p>This invitation was sent via BuildUnion.</p>
              <p>© ${new Date().getFullYear()} BuildUnion. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[SEND-INVITATION-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[SEND-INVITATION-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
