import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI assistant performing an Ontario Building Code (OBC) pre-compliance risk check.

Your task is NOT to give legal approval, but to:
- identify potential OBC-relevant risks
- flag missing or conflicting information
- determine whether the provided project data is sufficient for preliminary OBC alignment

You must base your reasoning only on the provided project data.
If information is missing, explicitly state what is missing.
Do not assume compliance.

Required Output Format (STRICT JSON only, no markdown):
{
  "obc_status": "PASS | CONDITIONAL | FAIL",
  "risk_level": "LOW | MEDIUM | HIGH",
  "reasoning": [
    "Short, concrete explanation bullets"
  ],
  "missing_information": [
    "Only list items if something is required"
  ],
  "requires_professional_review": true | false,
  "notes": "Optional short clarification for the user"
}

Decision Logic:

PASS criteria:
- interior / non-structural work
- no mechanical / electrical / load-bearing changes
- sufficient area + materials info

CONDITIONAL criteria:
- unclear blueprint
- partial info
- possible but unconfirmed structural relevance

FAIL criteria:
- confirmed structural, mechanical, or electrical scope
- missing mandatory info
- conflicting data`;

interface OBCCheckInput {
  project_type?: string;
  scope_of_work?: string;
  confirmed_area_sqft?: number;
  materials?: string[] | { name: string }[];
  blueprint_status?: "none" | "uploaded" | "manually_verified";
  structural_changes?: boolean | null;
  mechanical_changes?: boolean | null;
  electrical_changes?: boolean | null;
  load_bearing_work?: boolean | null;
  project_mode?: "solo" | "team";
  conflict_status?: "none" | "detected" | "ignored";
  data_confidence?: "low" | "medium" | "high";
}

interface OBCCheckOutput {
  obc_status: "PASS" | "CONDITIONAL" | "FAIL";
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string[];
  missing_information: string[];
  requires_professional_review: boolean;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData } = await req.json() as { projectData: OBCCheckInput };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Format materials for the prompt
    const materialsStr = Array.isArray(projectData.materials)
      ? projectData.materials.map(m => typeof m === 'string' ? m : m.name).join(", ")
      : "Not specified";

    // Build structured user prompt
    const userPrompt = JSON.stringify({
      project_type: projectData.project_type || "unknown",
      scope_of_work: projectData.scope_of_work || "Not specified",
      location: "Ontario, Canada",
      confirmed_area_sqft: projectData.confirmed_area_sqft || 0,
      materials: materialsStr,
      blueprint_status: projectData.blueprint_status || "none",
      structural_changes: projectData.structural_changes ?? "unknown",
      mechanical_changes: projectData.mechanical_changes ?? "unknown",
      electrical_changes: projectData.electrical_changes ?? "unknown",
      load_bearing_work: projectData.load_bearing_work ?? "unknown",
      project_mode: projectData.project_mode || "solo",
      conflict_status: projectData.conflict_status || "none",
      data_confidence: projectData.data_confidence || "medium"
    }, null, 2);

    console.log("OBC Check input:", userPrompt);

    // Call AI gateway with OpenAI for regulatory analysis
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
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
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("OBC Check AI response:", content);

    // Parse JSON response
    let result: OBCCheckOutput;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse OBC response:", parseError);
      // Return a default CONDITIONAL status if parsing fails
      result = {
        obc_status: "CONDITIONAL",
        risk_level: "MEDIUM",
        reasoning: ["Unable to fully analyze project data"],
        missing_information: ["Complete AI analysis unavailable"],
        requires_professional_review: true,
        notes: "Partial analysis completed. Please verify with a professional."
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        rawResponse: content
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OBC Status Check error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        result: {
          obc_status: "CONDITIONAL",
          risk_level: "MEDIUM",
          reasoning: ["Error during compliance check"],
          missing_information: [],
          requires_professional_review: true,
          notes: "An error occurred. Please try again or consult a professional."
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
