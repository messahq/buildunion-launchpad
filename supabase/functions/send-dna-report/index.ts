import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DnaReportEmailRequest {
  clientEmail: string;
  clientName: string;
  projectName: string;
  projectAddress?: string;
  projectId: string;
  dnaScore: number;
  dnaPassCount: number;
  pillars: Array<{
    label: string;
    icon: string;
    status: boolean;
    sourceSummary: string;
  }>;
  contractorName?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorWebsite?: string;
  financialSummary?: {
    material_cost: number | null;
    labor_cost: number | null;
    total_cost: number | null;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SEND-DNA-REPORT] User authenticated:", user.id);

    const body: DnaReportEmailRequest = await req.json();
    const {
      clientEmail, clientName, projectName, projectAddress, projectId,
      dnaScore, dnaPassCount, pillars,
      contractorName, contractorPhone, contractorEmail, contractorWebsite,
      financialSummary,
    } = body;

    if (!clientEmail || !clientName || !projectId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: clientEmail, clientName, projectId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user owns the project
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (project.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - You do not own this project" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const scoreColor = dnaPassCount === 8 ? '#10b981' : dnaPassCount >= 5 ? '#f59e0b' : '#ef4444';
    const scoreLabel = dnaPassCount === 8 ? 'PERFECT' : dnaPassCount >= 5 ? 'PARTIAL' : 'CRITICAL';
    const pct = dnaScore;

    const fmt = (n: number | null | undefined) => n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

    const pillarRows = (pillars || []).map(p => {
      const statusBg = p.status ? '#dcfce7' : '#fef2f2';
      const statusColor = p.status ? '#166534' : '#991b1b';
      const statusText = p.status ? '✓ PASS' : '✗ FAIL';
      return `
        <tr>
          <td style="padding:10px 14px;font-size:14px;">${p.icon} ${p.label}</td>
          <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${p.sourceSummary || ''}</td>
          <td style="padding:10px 14px;text-align:center;">
            <span style="background:${statusBg};color:${statusColor};padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;">${statusText}</span>
          </td>
        </tr>`;
    }).join('');

    const financialBlock = financialSummary && (financialSummary.total_cost ?? 0) > 0 ? `
      <div style="margin-top:24px;padding:20px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <div style="font-size:14px;font-weight:700;color:#1e3a5f;margin-bottom:12px;">💰 Financial Summary</div>
        <table style="width:100%;">
          <tr>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;">Materials</div>
              <div style="font-size:18px;font-weight:700;color:#059669;margin-top:2px;">${fmt(financialSummary.material_cost)}</div>
            </td>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;">Labor</div>
              <div style="font-size:18px;font-weight:700;color:#2563eb;margin-top:2px;">${fmt(financialSummary.labor_cost)}</div>
            </td>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;">Total</div>
              <div style="font-size:18px;font-weight:700;color:#d97706;margin-top:2px;">${fmt(financialSummary.total_cost)}</div>
            </td>
          </tr>
        </table>
      </div>` : '';

    const contractorBlock = contractorName ? `
      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <div style="font-size:13px;font-weight:600;color:#064e3b;">${contractorName}</div>
        ${contractorPhone ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">📞 ${contractorPhone}</div>` : ''}
        ${contractorEmail ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">✉️ ${contractorEmail}</div>` : ''}
        ${contractorWebsite ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">🌐 ${contractorWebsite}</div>` : ''}
      </div>` : '';

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 640px; margin: 0 auto; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <div style="font-size: 24px; font-weight: 800; color: white;">
        <span>Build</span><span style="color: #f59e0b;">Union</span>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">M.E.S.S.A. DNA Deep Audit Report</div>
    </div>

    <!-- Content -->
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="font-size: 15px;">Hello <strong>${clientName}</strong>,</p>
      <p style="font-size: 14px; color: #4b5563;">
        ${contractorName || 'Your contractor'} has completed a M.E.S.S.A. DNA Deep Audit for 
        <strong>${projectName}</strong>${projectAddress ? ` at ${projectAddress}` : ''}.
        Below is the project validation summary.
      </p>

      <!-- Score Badge -->
      <div style="background: linear-gradient(135deg, #064e3b, #065f46); color: white; border-radius: 10px; padding: 18px 22px; margin: 20px 0; display: flex; text-align: center;">
        <table style="width:100%;">
          <tr>
            <td style="width:60px;vertical-align:middle;">
              <div style="font-size: 32px; font-weight: 800; font-family: monospace; color: white;">${dnaPassCount}/8</div>
            </td>
            <td style="vertical-align:middle;padding-left:14px;text-align:left;">
              <div style="font-size: 13px; font-weight: 600; color: white; margin-bottom: 5px;">DNA Integrity Score — ${pct}%</div>
              <div style="height: 8px; background: rgba(255,255,255,0.2); border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: ${scoreColor}; border-radius: 999px;"></div>
              </div>
            </td>
            <td style="width:80px;vertical-align:middle;text-align:right;">
              <span style="background: rgba(255,255,255,0.15); padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; color: white;">${scoreLabel}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Pillars -->
      <div style="font-size: 14px; font-weight: 700; color: #1e3a5f; margin-bottom: 10px;">🧬 8-Pillar Validation Matrix</div>
      <table style="width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px 14px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase;">Pillar</th>
            <th style="padding: 8px 14px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase;">Summary</th>
            <th style="padding: 8px 14px; text-align: center; font-size: 11px; color: #6b7280; text-transform: uppercase;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${pillarRows}
        </tbody>
      </table>

      ${financialBlock}
      ${contractorBlock}

      <div style="margin-top: 24px; padding: 14px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
        <div style="font-size: 12px; color: #1e40af;">
          📋 This report was generated by BuildUnion's M.E.S.S.A. validation engine on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. 
          For the full PDF audit with citation-level traceability, please contact your contractor.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p>This email was sent by BuildUnion on behalf of ${contractorName || 'your contractor'}.</p>
      <p>© ${new Date().getFullYear()} BuildUnion. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BuildUnion <admin@buildunion.ca>",
        to: [clientEmail],
        subject: `M.E.S.S.A. DNA Audit Report: ${projectName} — ${pct}% Integrity`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("[SEND-DNA-REPORT] Resend error:", errText);
      throw new Error(`Email delivery failed: ${errText}`);
    }

    const resendData = await resendResponse.json();
    console.log("[SEND-DNA-REPORT] Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[SEND-DNA-REPORT] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
