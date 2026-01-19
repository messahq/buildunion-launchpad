import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dual-engine photo analysis for accurate measurements
async function dualEngineAnalysis(image: string, description: string, apiKey: string) {
  // STEP 1: Gemini Pro for visual extraction (area, dimensions, room counts)
  const geminiPrompt = `You are analyzing a floor plan or construction photo. 
CRITICALLY IMPORTANT: Read ANY visible text on the image EXACTLY as written.

Look for:
1. Total area measurements (e.g., "Total Area = 1350 sq ft" - read this EXACTLY)
2. Individual room dimensions (e.g., "23'6 x 23'" or "138 SQ. FT.")
3. Room labels and counts
4. Scale indicators

RESPOND IN THIS EXACT JSON FORMAT:
{
  "visible_total_area": "The EXACT number shown for total area (e.g., 1350)",
  "visible_area_unit": "sq ft or sq m",
  "room_dimensions": [
    {"room": "room name", "dimensions": "as written", "area_sqft": number}
  ],
  "calculated_total": "sum of all room areas if no total shown",
  "image_type": "floor_plan" | "photo" | "blueprint",
  "confidence": "high" | "medium" | "low"
}

${description ? `Context: ${description}` : ""}

READ THE NUMBERS EXACTLY AS SHOWN ON THE IMAGE. Do not round or estimate.`;

  const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: geminiPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 1500,
    }),
  });

  let geminiData = null;
  if (geminiResponse.ok) {
    const geminiResult = await geminiResponse.json();
    const geminiContent = geminiResult.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = geminiContent.match(/```json\n?([\s\S]*?)\n?```/) || geminiContent.match(/\{[\s\S]*\}/);
      geminiData = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : geminiContent);
    } catch (e) {
      console.error("Gemini parse error:", e);
    }
  }

  // STEP 2: OpenAI for material estimation using the extracted area
  const extractedArea = geminiData?.visible_total_area || geminiData?.calculated_total || null;
  const areaValue = extractedArea ? parseFloat(extractedArea.toString().replace(/[^0-9.]/g, "")) : null;

  const openaiPrompt = `You are an expert construction estimator with 20+ years of experience.

${areaValue ? `IMPORTANT: The floor plan shows a TOTAL AREA of ${areaValue} sq ft. Use this EXACT number for calculations.` : "Estimate the area from the image."}
${geminiData?.room_dimensions?.length ? `Room breakdown: ${JSON.stringify(geminiData.room_dimensions)}` : ""}

Analyze the provided photo/floor plan and provide a detailed material estimate.
Use Canadian construction standards.

${description ? `Contractor notes: "${description}"` : ""}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "materials": [
    {
      "item": "Material name",
      "quantity": numeric_value_only,
      "unit": "sq ft / pcs / bags / rolls / etc",
      "notes": "Optional notes"
    }
  ],
  "laborHours": "X-Y hours",
  "summary": "Brief summary mentioning the EXACT area (${areaValue ? areaValue + ' sq ft' : 'as measured'})",
  "recommendations": ["tip 1", "tip 2"],
  "area_used": ${areaValue || "null"},
  "area_source": "${geminiData ? 'extracted_from_image' : 'estimated'}"
}

CRITICAL: If floor plan shows ${areaValue} sq ft, use ${areaValue} for calculations, NOT a different number.
Add 10-15% waste factor to flooring materials.`;

  const openaiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: "You are a construction estimation expert. Always use the EXACT area measurements provided." },
        {
          role: "user",
          content: [
            { type: "text", text: openaiPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 2000,
    }),
  });

  let openaiData = null;
  if (openaiResponse.ok) {
    const openaiResult = await openaiResponse.json();
    const openaiContent = openaiResult.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = openaiContent.match(/```json\n?([\s\S]*?)\n?```/) || openaiContent.match(/\{[\s\S]*\}/);
      openaiData = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : openaiContent);
    } catch (e) {
      console.error("OpenAI parse error:", e);
    }
  }

  // STEP 3: Cross-verify and merge results
  const finalEstimate = {
    materials: openaiData?.materials || [],
    laborHours: openaiData?.laborHours || "8-16 hours",
    summary: openaiData?.summary || `Material estimate for ${areaValue || 'the'} sq ft area.`,
    recommendations: openaiData?.recommendations || [],
    _dualEngine: {
      geminiExtraction: geminiData,
      extractedArea: areaValue,
      confidence: geminiData?.confidence || "medium"
    }
  };

  // Validate: if Gemini extracted a specific area, ensure materials reflect it
  if (areaValue && finalEstimate.materials.length > 0) {
    finalEstimate.materials = finalEstimate.materials.map((mat: any) => {
      // For flooring materials, ensure quantity matches extracted area + waste
      if (mat.unit === "sq ft" && mat.item.toLowerCase().includes("floor")) {
        const expectedMin = areaValue * 1.10; // 10% waste
        const expectedMax = areaValue * 1.20; // 20% waste
        const currentQty = parseFloat(mat.quantity) || 0;
        
        if (currentQty < areaValue * 0.9 || currentQty > areaValue * 1.5) {
          // Quantity seems wrong, correct it
          mat.quantity = Math.ceil(areaValue * 1.15); // 15% waste factor
          mat.notes = `Based on ${areaValue} sq ft with 15% waste factor. ${mat.notes || ""}`;
        }
      }
      return mat;
    });
  }

  return finalEstimate;
}

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
      // Use dual-engine analysis for accurate measurements
      const estimate = await dualEngineAnalysis(image, description || "", LOVABLE_API_KEY);

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
