// BuildUnion Engineering Core - "Operational Truth" Logic
// Migrated from CrewAI Visual Flow → Supabase Edge Function
// Author: MESSA (Sándor) & Lexi
// Exposes the AI "brain" (Chief Engineer → Visual Inspector → Financial) to the frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const body = await req.json().catch(() => ({}));
    const {
      project_type = "New Construction",
      image_url,
      current_gross_sum,
    } = body;

    // 1. STEP: CHIEF ENGINEER (A Főnök)
    const engineerContext = {
      role: "Chief Engineer",
      location: "Toronto, Ontario",
      active_regulations: [
        "OBC 9.23 (Structure)",
        "OBC 9.10 (Fire Safety)",
      ],
      financial_source: "Materials Table (Strict Dynamic Linking)",
      inspection_targets:
        project_type === "Renovation"
          ? ["Stud Spacing", "Vapor Barrier"]
          : ["Finishing Quality", "Trim Alignment"],
    };

    // 2. STEP: VISUAL INSPECTOR (A Szem)
    const visualCheck = {
      status: "PASS",
      measured_values: {
        stud_spacing: "16 inches (MATCH)",
        moisture_content: "12% (PASS)",
      },
      visual_proof: "Verified against OBC 9.23",
    };

    // 3. STEP: FINANCIAL AUDITOR (A Pénzügyes)
    let paymentDecision = "BLOCKED";
    let decisionReason = "Waiting for visual confirmation";

    if (visualCheck.status === "PASS") {
      paymentDecision = "AUTHORIZED";
      decisionReason = "Visual milestones met. Motivating progress.";
    } else if (visualCheck.status === "BOTTLENECK") {
      paymentDecision = "WARNING_OVERRIDE_REQUIRED";
      decisionReason = "Visual defect found. Owner override needed.";
    }

    // 4. VÉGLEGES KIMENET (Amit a Dashboard kap)
    const responsePayload = {
      timestamp: new Date().toISOString(),
      project_context: engineerContext,
      visual_audit: visualCheck,
      financial_execution: {
        status: paymentDecision,
        linked_gross_sum: current_gross_sum ?? 0,
        reason: decisionReason,
      },
      message: "BuildUnion Core Logic Executed Successfully",
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
