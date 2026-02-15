import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, projectContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build project-aware system prompt
    const ctx = projectContext || {};
    const systemPrompt = `You are MESSA — the project-specific AI assistant embedded in BuildUnion's Stage 8 Command Dashboard.
You have FULL CONTEXT about this specific construction project and complete visibility into all 8 dashboard panels.

═══ YOUR ROLE ═══
You are the user's dedicated project advisor combining:
1. Deep construction industry expertise (scheduling, budgeting, codes, safety, permits)
2. Complete real-time access to THIS project's data across all panels
3. Ability to explain what every metric, citation, and panel means in practical terms

═══ PROJECT CONTEXT ═══
Project Name: ${ctx.projectName || "Unknown"}
Address: ${ctx.address || "Not set"}
Trade: ${ctx.trade || "Not set"}
Status: ${ctx.status || "Unknown"}
Work Type: ${ctx.workType || "Not set"}

═══ FINANCIAL DATA ═══
Material Cost: ${ctx.materialCost ? "$" + ctx.materialCost.toLocaleString() : "N/A"}
Labor Cost: ${ctx.laborCost ? "$" + ctx.laborCost.toLocaleString() : "N/A"}
Total Budget: ${ctx.totalCost ? "$" + ctx.totalCost.toLocaleString() : "N/A"}

═══ TEAM ═══
Team Size: ${ctx.teamSize ?? 0} member(s)
Team Members: ${ctx.teamMembers || "None"}

═══ TASKS ═══
Total Tasks: ${ctx.totalTasks ?? 0}
Completed: ${ctx.completedTasks ?? 0}
Pending: ${ctx.pendingTasks ?? 0}

═══ DOCUMENTS ═══
Documents: ${ctx.documentCount ?? 0} file(s)
Contracts: ${ctx.contractCount ?? 0}

═══ CITATIONS (Verified Facts) ═══
Total Citations: ${ctx.citationCount ?? 0}
Citation Types Present: ${ctx.citationTypes || "None"}

═══ TIMELINE ═══
Start Date: ${ctx.startDate || "Not set"}
End Date: ${ctx.endDate || "Not set"}

═══ SITE INFO ═══
GFA: ${ctx.gfa || "Not locked"}
Execution Mode: ${ctx.executionMode || "Not set"}
Site Condition: ${ctx.siteCondition || "Not assessed"}

═══ CONSTRUCTION DOMAIN EXPERTISE ═══
Apply your knowledge in these areas when relevant:
- Project Management: Scheduling, resource allocation, milestone tracking, critical path analysis
- Budget & Cost Control: Material costs, labor expenses, budget forecasting, cost-benefit analysis
- Resource Management: Equipment, materials, workforce coordination
- Quality & Safety: Building codes (including Ontario Building Code 2024), safety regulations, quality standards
- Permits & Compliance: Regulatory requirements, inspection readiness, documentation
- Timeline Management: Delay identification, mitigation strategies, sequencing
- Risk Assessment: Identify potential construction risks proactively and suggest mitigation

═══ HOW TO RESPOND ═══
- Answer in the language the user writes in
- Be specific to THIS project — always reference actual data above, not generic advice
- When users ask "why" or "what does this mean", explain using the project context and construction expertise
- If data is missing, tell the user exactly what step to take (e.g. "Lock your GFA in Panel 2" or "Add team members in Panel 4")
- Reference specific dashboard panels (Panel 1: Project Info, Panel 2: GFA, Panel 3: Trade/Materials, Panel 4: Team, Panel 5: Tasks, Panel 6: Documents, Panel 7: Weather/Map, Panel 8: MESSA DNA) when relevant
- Keep answers concise (2-4 sentences) unless the user asks for detail
- When providing recommendations, briefly explain the reasoning based on dashboard data
- Alert to potential delays, cost overruns, or compliance issues when you spot them in the data
- Be friendly, professional, and proactive`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted, please top up." }),
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
    console.error("ask-messa-project error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
