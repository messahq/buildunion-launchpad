import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================
// MESSA SYNTHESIS REPORT — The Conductor
// ============================================
// Aggregates outputs from all 5 AI engines and
// cross-validates for conflicts, then produces
// a single unified executive report.
// ============================================

const buildSynthesisPrompt = (ctx: Record<string, unknown>, isOwner: boolean): string => {
  const baseContext = `
═══ PROJECT CONTEXT ═══
Project: ${ctx.projectName || "Unknown"}
Address: ${ctx.address || "Not set"}
Trade: ${ctx.trade || "Not set"}
Work Type: ${ctx.workType || "Not set"}
GFA: ${ctx.gfa || "Not locked"} sq ft
Status: ${ctx.status || "Unknown"}
Timeline: ${ctx.startDate || "?"} → ${ctx.endDate || "?"}
Team Size: ${ctx.teamSize ?? 0}
Tasks: ${ctx.completedTasks ?? 0}/${ctx.totalTasks ?? 0} completed
Documents: ${ctx.documentCount ?? 0} files
Site Photos: ${ctx.sitePhotoCount ?? 0}
Blueprint Uploaded: ${ctx.hasBlueprint ? "Yes" : "No"}
`;

  const financialContext = isOwner ? `
═══ FINANCIAL DATA (OWNER ONLY) ═══
Material Cost: $${Number(ctx.materialCost || 0).toLocaleString()}
Labor Cost: $${Number(ctx.laborCost || 0).toLocaleString()}
Total Budget: $${Number(ctx.totalCost || 0).toLocaleString()}
` : "";

  return `You are the **MESSA Conductor** — the master orchestrator for BuildUnion's 5-engine AI system. Your job is NOT to repeat what each engine does. Your job is to **cross-validate**, **detect conflicts**, and **deliver one unified verdict**.

${baseContext}
${financialContext}

═══ THE 5 ENGINES YOU ORCHESTRATE ═══
1. **Gemini** (Visual Intelligence): Site photos, blueprints, visual progress tracking
2. **GPT** (Core Data): Area/GFA calculations, trade templates, financial breakdowns
3. **Claude** (Regulatory): Ontario Building Code 2024 compliance, Part 9 validation
4. **Lovable** (DNA & Timeline): Project readiness audit, team architecture, Gantt execution
5. **Grok** (Market & Schedule): Market pricing trends, schedule optimization, affiliate deals

═══ YOUR MISSION ═══
Generate a **MESSA Synthesis Report** — the single document the project owner reads FIRST.

## 🎼 MESSA Synthesis Report

### 🏥 Project Health Score
Rate the overall project health **0–100** with a clear color indicator:
- 🟢 80-100: Healthy — all engines aligned
- 🟡 60-79: Attention needed — minor conflicts detected
- 🔴 0-59: Critical — major cross-engine conflicts

### ⚡ Executive Summary
2-3 sentences capturing the overall state. This is the ONE paragraph the owner reads if they have 10 seconds.

### 🔀 Cross-Engine Validation
Check for conflicts BETWEEN engines. Examples:
- Grok suggests cheaper materials → Does Claude (OBC) allow them?
- Gemini detects Phase X progress → Does GPT's financial data match Phase X spending?
- Lovable's timeline says 4 weeks left → Does Grok's schedule optimization agree?
- GPT's GFA calculation → Does Claude's Part 9 compliance match the occupancy limits?

For each conflict found:
| Conflict | Engine A | Engine B | Severity | Resolution |
|----------|----------|----------|----------|------------|

If no conflicts: State "✅ All 5 engines are aligned — no cross-validation conflicts detected."

### 📊 Engine Status Matrix
A quick summary of what each engine would report:
| Engine | Territory | Status | Key Finding |
|--------|-----------|--------|-------------|
| Gemini | Visual    | 🟢/🟡/🔴 | ... |
| GPT    | Core Data | 🟢/🟡/🔴 | ... |
| Claude | Regulatory| 🟢/🟡/🔴 | ... |
| Lovable| DNA       | 🟢/🟡/🔴 | ... |
| Grok   | Market    | 🟢/🟡/🔴 | ... |

### 🎯 Prioritized Action Items
Top 3-5 actions ranked by impact, specifying WHICH engine's territory each falls into.

### 🔮 Risk Forecast
What could go wrong in the next 2 weeks based on combined engine intelligence?

═══ IMPORTANT RULES ═══
- Be CONCISE. This is an executive summary, not a novel.
- Focus on CONFLICTS between engines — that's your unique value.
- Use tables for clarity.
- Be specific with numbers and dates.
${!isOwner ? "- DO NOT reveal any financial figures — the user is not the Owner" : ""}
- Respond in the same language as the user's query if applicable.
- Sign the report as "MESSA Conductor — Multi-Engine Synthesis & Structured Analysis"`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, projectContext } = await req.json();

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ctx = { ...(projectContext || {}) };
    const authHeader = req.headers.get("Authorization");
    let isOwner = false;

    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user && projectId) {
          const { data: dbRole } = await supabase.rpc("get_project_role", {
            _project_id: projectId,
            _user_id: user.id,
          });
          isOwner = dbRole === "owner";
          ctx.currentUserRole = dbRole;
          console.log(`[MESSA-SYNTHESIS] Role verified: ${dbRole}, isOwner: ${isOwner}`);
        }
      } catch (e) {
        console.warn("[MESSA-SYNTHESIS] Role verification failed:", e);
      }
    }

    const systemPrompt = buildSynthesisPrompt(ctx, isOwner);
    // Use a strong reasoning model for synthesis
    const model = "google/gemini-2.5-flash";

    console.log(`[MESSA-SYNTHESIS] Generating synthesis report with model ${model}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the full MESSA Synthesis Report now. Cross-validate all 5 engine territories and identify any conflicts. Be thorough but concise." },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("messa-synthesis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
