import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { summaryId, action } = await req.json();

    if (action === "analyze") {
      // Fetch summary data
      const { data: summary, error: summaryError } = await supabaseClient
        .from("project_summaries")
        .select("*")
        .eq("id", summaryId)
        .single();

      if (summaryError || !summary) throw new Error("Summary not found");

      // Fetch project facts if linked to a project
      let projectFacts: any[] = [];
      if (summary.project_id) {
        const { data: facts } = await supabaseClient
          .from("project_syntheses")
          .select("*")
          .eq("project_id", summary.project_id);
        projectFacts = facts || [];
      }

      // Build comprehensive analysis prompt
      const analysisPrompt = `
You are a construction expert AI. Analyze the following project data and create a comprehensive summary.

## Photo-based Estimate:
${JSON.stringify(summary.photo_estimate, null, 2)}

## Calculator Results:
${JSON.stringify(summary.calculator_results, null, 2)}

## Template Items:
${JSON.stringify(summary.template_items, null, 2)}

## Blueprint Analysis:
${JSON.stringify(summary.blueprint_analysis, null, 2)}

## Verified Facts (M.E.S.S.A.):
${JSON.stringify(projectFacts.map(f => ({ question: f.question, answer: f.answer, status: f.verification_status })), null, 2)}

Create a detailed summary in English that includes:
1. Material cost estimate (in CAD)
2. Labor cost estimate (in CAD)
3. Main line items list with prices
4. Risks and warnings
5. Recommendations

Respond in JSON format:
{
  "material_cost": number,
  "labor_cost": number,
  "total_cost": number,
  "line_items": [
    { "name": string, "quantity": number, "unit": string, "unit_price": number, "total": number, "source": "photo" | "calculator" | "template" | "blueprint" }
  ],
  "risks": [string],
  "recommendations": [string],
  "confidence_score": number (0-100)
}
`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a construction cost estimation expert. Always return precise JSON." },
            { role: "user", content: analysisPrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI error:", errorText);
        throw new Error("AI analysis failed");
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || "{}";
      
      // Parse AI response
      let analysisResult;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                         aiContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
        analysisResult = JSON.parse(jsonStr);
      } catch (e) {
        console.error("JSON parse error:", e);
        analysisResult = {
          material_cost: 0,
          labor_cost: 0,
          total_cost: 0,
          line_items: [],
          risks: ["AI analysis could not be completed"],
          recommendations: [],
          confidence_score: 0
        };
      }

      // Update summary with AI analysis
      const { error: updateError } = await supabaseClient
        .from("project_summaries")
        .update({
          material_cost: analysisResult.material_cost || 0,
          labor_cost: analysisResult.labor_cost || 0,
          total_cost: analysisResult.total_cost || 0,
          line_items: analysisResult.line_items || [],
          verified_facts: projectFacts,
          updated_at: new Date().toISOString()
        })
        .eq("id", summaryId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ 
        success: true, 
        analysis: analysisResult 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
