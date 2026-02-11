import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trade, gfa_sqft, project_name, location, work_type } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a construction cost estimator AI. Generate a detailed material and labor template for a construction project.

RULES:
- Return ONLY a valid JSON object, no markdown, no explanation
- All prices in CAD
- Include realistic unit prices for Ontario, Canada market (2025)
- Apply quantities based on the GFA provided
- Include both materials and labor items
- Each item must have: name, category (material or labor), quantity, unit, unitPrice
- Include 5-8 items total
- Be specific to the trade requested

JSON format:
{
  "items": [
    { "name": "Item Name", "category": "material", "quantity": 100, "unit": "sq ft", "unitPrice": 8.50 },
    { "name": "Labor Item", "category": "labor", "quantity": 100, "unit": "sq ft", "unitPrice": 4.50 }
  ],
  "notes": "Brief note about the estimate"
}`;

    const userPrompt = `Generate a construction template for:
- Trade: ${trade}
- Gross Floor Area: ${gfa_sqft} sq ft
- Project: ${project_name || 'Construction Project'}
- Location: ${location || 'Ontario, Canada'}
- Work Type: ${work_type || 'General'}

Provide accurate material quantities and current Ontario market labor rates for this ${trade} project.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI template response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trade-template error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
