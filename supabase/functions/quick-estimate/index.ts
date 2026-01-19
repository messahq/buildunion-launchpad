import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, description, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (type === "photo_estimate") {
      // Build the prompt for construction photo analysis
      const systemPrompt = `You are an expert construction estimator with 20+ years of experience. 
Analyze the provided photo of a work area and provide a detailed material estimate.

Your analysis should be practical and accurate for Canadian construction standards.

ALWAYS respond in this exact JSON format:
{
  "materials": [
    {
      "item": "Material name",
      "quantity": "numeric value",
      "unit": "sq ft / pcs / bags / rolls / etc",
      "notes": "Optional notes about brand or type"
    }
  ],
  "laborHours": "X-Y hours",
  "summary": "Brief 1-2 sentence summary of the work",
  "recommendations": [
    "Practical tip or recommendation 1",
    "Practical tip or recommendation 2"
  ]
}

Consider:
- Standard Canadian material sizes and packaging
- Appropriate waste factors (typically 10-15%)
- Local building code requirements where applicable
- Quality materials for residential/commercial work
- Safety equipment if needed`;

      const userPrompt = description 
        ? `Analyze this construction photo and estimate materials needed. Additional context from the contractor: "${description}"`
        : "Analyze this construction photo and estimate materials needed for the work shown.";

      // Call the Lovable AI Gateway with vision capabilities
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse the JSON response
      let estimate;
      try {
        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                         content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        estimate = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        // Return a default structure if parsing fails
        estimate = {
          materials: [
            { item: "Unable to parse specific materials", quantity: "N/A", unit: "", notes: "Please try again with a clearer photo" }
          ],
          laborHours: "Estimate unavailable",
          summary: "Analysis incomplete. Please upload a clearer photo of the work area.",
          recommendations: ["Try taking the photo in better lighting", "Include the full work area in frame"]
        };
      }

      return new Response(
        JSON.stringify({ estimate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown estimate type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quick estimate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
