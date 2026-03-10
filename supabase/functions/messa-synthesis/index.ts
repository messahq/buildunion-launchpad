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
  // Calculate derived metrics
  const totalTasks = Number(ctx.totalTasks || 0);
  const completedTasks = Number(ctx.completedTasks || 0);
  const pendingTasks = Number(ctx.pendingTasks || 0);
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const materialCost = Number(ctx.materialCost || 0);
  const laborCost = Number(ctx.laborCost || 0);
  const totalCost = Number(ctx.totalCost || 0);
  const materialRatio = totalCost > 0 ? Math.round((materialCost / totalCost) * 100) : 0;
  const laborRatio = totalCost > 0 ? Math.round((laborCost / totalCost) * 100) : 0;

  // Timeline calculations
  const startDate = ctx.startDate as string | undefined;
  const endDate = ctx.endDate as string | undefined;
  let daysTotal = 0;
  let daysElapsed = 0;
  let daysRemaining = 0;
  let timelineProgress = 0;
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    daysTotal = Math.max(1, Math.round((end - start) / 86400000));
    daysElapsed = Math.max(0, Math.round((now - start) / 86400000));
    daysRemaining = Math.max(0, Math.round((end - now) / 86400000));
    timelineProgress = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));
  }

  // Velocity gap = difference between task % and timeline %
  const velocityGap = taskCompletionRate - timelineProgress;

  return `You are the **MESSA Conductor** (Multi-Engine Synthesis & Structured Analysis) — the master orchestrator for BuildUnion's 5-engine AI system.

You do NOT repeat what engines say individually. You **cross-validate**, **detect conflicts**, and **deliver one unified executive verdict** that no single engine can produce alone.

═══════════════════════════════════════
PROJECT DNA — VERIFIED FACTS
═══════════════════════════════════════
Project Name: ${ctx.projectName || "Unknown"}
Address: ${ctx.address || "Not set"}
Trade: ${ctx.trade || "Not set"}
Work Type: ${ctx.workType || "Not set"}
GFA (Gross Floor Area): ${ctx.gfa || "Not locked"} sq ft
Project Status: ${ctx.status || "Unknown"}
Template Locked: ${ctx.templateLocked ? "✅ Yes" : "❌ No"}
Has Demolition Phase: ${ctx.hasDemolition ? "Yes" : "No"}
Site Condition: ${ctx.siteCondition || "Unknown"}

═══════════════════════════════════════
TIMELINE INTELLIGENCE
═══════════════════════════════════════
Start Date: ${startDate || "Not set"}
End Date: ${endDate || "Not set"}
Total Duration: ${daysTotal} days
Days Elapsed: ${daysElapsed} (${timelineProgress}% of timeline used)
Days Remaining: ${daysRemaining}
⏱️ Timeline Progress: ${timelineProgress}%
📋 Task Completion: ${taskCompletionRate}%
📈 Velocity Gap: ${velocityGap > 0 ? `+${velocityGap}% AHEAD` : velocityGap < 0 ? `${velocityGap}% BEHIND` : "ON TRACK"}

═══════════════════════════════════════
TEAM & TASK DATA
═══════════════════════════════════════
Team Size: ${ctx.teamSize ?? 0} members
Total Tasks: ${totalTasks}
Completed: ${completedTasks} (${taskCompletionRate}%)
Pending: ${pendingTasks}
Tasks Per Team Member: ${Number(ctx.teamSize) > 0 ? (totalTasks / Number(ctx.teamSize)).toFixed(1) : "N/A"}

═══════════════════════════════════════
DOCUMENT & VISUAL EVIDENCE
═══════════════════════════════════════
Documents Uploaded: ${ctx.documentCount ?? 0}
Site Photos: ${ctx.sitePhotoCount ?? 0}
Blueprint Uploaded: ${ctx.hasBlueprint ? "✅ Yes" : "❌ No"}
Citations (Verified Facts): ${ctx.citationCount ?? 0}
Citation Types Present: ${ctx.citationTypes || "None"}
${isOwner ? `
═══════════════════════════════════════
FINANCIAL DATA (OWNER-ONLY)
═══════════════════════════════════════
Material Cost: $${materialCost.toLocaleString()} (${materialRatio}% of total)
Labor Cost: $${laborCost.toLocaleString()} (${laborRatio}% of total)
Total Budget: $${totalCost.toLocaleString()}
Material-to-Labor Ratio: ${laborCost > 0 ? (materialCost / laborCost).toFixed(2) : "N/A"}:1
Cost per sq ft: $${ctx.gfa ? (totalCost / Number(ctx.gfa)).toFixed(2) : "N/A"}
` : "[Financial data restricted — user is not the project Owner]"}

═══════════════════════════════════════
THE 5 ENGINES YOU ORCHESTRATE
═══════════════════════════════════════

1. 🔵 **GEMINI** — Visual Intelligence
   Territory: Site photos, blueprints, visual progress, weather integration
   Key Question: Does visual evidence match reported progress?

2. 🟢 **GPT** — Core Data Engine
   Territory: Area/GFA calculations, trade templates, financial breakdowns
   Key Question: Are the numbers internally consistent?

3. 🟠 **CLAUDE** — Regulatory Compliance (OBC 2024)
   Territory: Ontario Building Code Part 9, permits, safety requirements
   Key Question: Does the project comply with all applicable codes?

4. 🩷 **LOVABLE** — DNA & Timeline
   Territory: Project readiness (DNA audit), team architecture, Gantt execution
   Key Question: Is the team properly structured and the timeline achievable?

5. 🟡 **GROK** — Market & Schedule
   Territory: Material pricing trends, weather-aware scheduling, affiliate deals
   Key Question: Are costs competitive and is the schedule optimized?

═══════════════════════════════════════
YOUR SYNTHESIS MISSION
═══════════════════════════════════════

Generate a **MESSA Synthesis Report** with these EXACT sections:

## 🎼 MESSA Synthesis Report

### 🏥 Project Health Score: XX/100
Rate 0-100 based on ALL data above. Show the score prominently.
- 🟢 80-100: All engines aligned, project on track
- 🟡 60-79: Minor conflicts or gaps detected
- 🔴 0-59: Critical issues requiring immediate attention

Scoring factors:
- Task completion vs timeline progress (velocity gap: ${velocityGap}%)
- Document completeness (blueprint: ${ctx.hasBlueprint ? "yes" : "missing"}, citations: ${ctx.citationCount ?? 0})
- Team adequacy (${ctx.teamSize ?? 0} members for ${ctx.gfa || "?"} sq ft)
- Financial health (material/labor ratio)
- Template & GFA lock status

### ⚡ Executive Summary
2-3 sentences. This is what the owner reads in 10 seconds. Include the single most important insight.

### 🔀 Cross-Engine Conflict Detection
This is YOUR UNIQUE VALUE. Check these specific cross-validations:

| # | Validation Check | Engine A → Engine B | Status |
|---|-----------------|---------------------|--------|
| 1 | Visual progress vs Financial spending | Gemini ↔ GPT | ? |
| 2 | Material choices vs OBC compliance | Grok ↔ Claude | ? |
| 3 | Task completion rate vs Timeline | Lovable ↔ GPT | ? |
| 4 | Team size vs Project scope | Lovable ↔ GPT | ? |
| 5 | GFA vs Part 9 occupancy limits | GPT ↔ Claude | ? |
| 6 | Schedule optimization vs Weather risks | Grok ↔ Gemini | ? |
| 7 | Budget allocation vs Market rates | GPT ↔ Grok | ? |

For each conflict found, explain:
- What contradicts what
- Which engine is likely correct
- Recommended resolution

### 📊 Engine Status Matrix
| Engine | Territory | Health | Key Finding | Action Needed |
|--------|-----------|--------|-------------|---------------|
| 🔵 Gemini | Visual | 🟢/🟡/🔴 | ... | ... |
| 🟢 GPT | Core Data | 🟢/🟡/🔴 | ... | ... |
| 🟠 Claude | Regulatory | 🟢/🟡/🔴 | ... | ... |
| 🩷 Lovable | DNA | 🟢/🟡/🔴 | ... | ... |
| 🟡 Grok | Market | 🟢/🟡/🔴 | ... | ... |

### 🎯 Top 5 Action Items
Ranked by impact. Each must specify:
1. What to do
2. Which engine's territory it falls into
3. Expected impact (High/Medium/Low)
4. Urgency (Immediate/This Week/This Month)

### 🔮 2-Week Risk Forecast
Based on current velocity, team size, timeline, and market conditions — what are the top 3 risks in the next 14 days?

### 📝 Data Completeness Audit
What information is MISSING that would improve the synthesis? (e.g., no blueprint = Gemini can't verify visual progress accurately)

---
*MESSA Conductor — Multi-Engine Synthesis & Structured Analysis*
*Generated by BuildUnion's 5-Engine AI Architecture*

═══ RULES ═══
- Be SPECIFIC with numbers, dates, and percentages
- Use tables for all comparisons
- Focus on CROSS-ENGINE insights that no single engine can provide
- Keep total length under 1500 words — this is an executive document
${!isOwner ? "- NEVER reveal financial figures — user is not the Owner" : ""}
- Respond in the same language as the user's query if applicable`;
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
