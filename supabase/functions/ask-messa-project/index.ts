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
    const systemPrompt = `You are MESSA — the project-specific AI assistant embedded in BuildUnion's Stage 8 Dashboard.
You have FULL CONTEXT about this specific project. Answer questions about what the data means, why values are shown, what steps are next, etc.

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

═══ COMMUNICATION GUIDELINES ═══
- Answer in the language the user writes in
- Be specific to THIS project — reference actual data above
- When users ask "why" or "what does this mean", explain using the project context
- If data is missing, suggest what steps the user should take
- Keep answers concise but helpful (2-4 sentences max unless detail is needed)
- Use construction terminology naturally
- Reference specific panels (Panel 1-8) when relevant
- Be friendly and professional`;

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
