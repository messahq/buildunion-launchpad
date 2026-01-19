import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dual-engine photo analysis for accurate measurements
async function dualEngineAnalysis(image: string, description: string, apiKey: string) {
  // STEP 1: Gemini Pro for visual extraction - FOCUSED on just the area
  const geminiPrompt = `Analyze this floor plan image. Find the TOTAL AREA measurement shown.

RESPOND ONLY with this simple JSON (nothing else):
{"total_area": NUMBER, "unit": "sq ft"}

Example: If image shows "Total Area = 1350 sq ft", respond: {"total_area": 1350, "unit": "sq ft"}

READ THE EXACT NUMBER FROM THE IMAGE.`;

  const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: geminiPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 200,
    }),
  });

  let geminiData = null;
  let extractedAreaFromGemini: number | null = null;
  
  if (geminiResponse.ok) {
    const geminiResult = await geminiResponse.json();
    const geminiContent = geminiResult.choices?.[0]?.message?.content || "";
    console.log("Gemini raw response:", geminiContent);
    
    // Try JSON parse first
    try {
      let cleanContent = geminiContent;
      cleanContent = cleanContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonStart = cleanContent.indexOf("{");
      const jsonEnd = cleanContent.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
      }
      geminiData = JSON.parse(cleanContent);
      extractedAreaFromGemini = geminiData?.total_area || null;
      console.log("Gemini parsed data:", geminiData);
    } catch (e) {
      console.error("Gemini JSON parse error:", e);
    }
    
    // Fallback: regex extraction if JSON failed
    if (!extractedAreaFromGemini) {
      // Try to find area patterns in raw response
      const areaPatterns = [
        /total_area["\s:]+(\d+(?:\.\d+)?)/i,
        /(\d{3,5})\s*(?:sq\.?\s*ft|square\s*feet)/i,
        /"?total[_\s]?area"?\s*[:=]\s*"?(\d+)/i,
      ];
      
      for (const pattern of areaPatterns) {
        const match = geminiContent.match(pattern);
        if (match && match[1]) {
          extractedAreaFromGemini = parseFloat(match[1]);
          console.log("Extracted area via regex:", extractedAreaFromGemini);
          break;
        }
      }
    }
  }

  // STEP 2: OpenAI for material estimation using the extracted area
  const areaValue = extractedAreaFromGemini;
  console.log("Using extracted area for OpenAI:", areaValue);

  const openaiPrompt = `You are an expert construction estimator with 20+ years of experience.

${areaValue ? `CRITICAL: The floor plan shows a TOTAL AREA of exactly ${areaValue} sq ft. You MUST use this EXACT number for all calculations.` : "Estimate the area from the image."}

Analyze the provided photo/floor plan and provide a detailed material estimate.
Use Canadian construction standards.

${description ? `Contractor notes: "${description}"` : ""}

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
    console.log("OpenAI raw response:", openaiContent);
    try {
      // Clean markdown code blocks first
      let cleanContent = openaiContent;
      cleanContent = cleanContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
      const jsonStart = cleanContent.indexOf("{");
      const jsonEnd = cleanContent.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
      }
      openaiData = JSON.parse(cleanContent);
      console.log("OpenAI parsed data:", openaiData);
    } catch (e) {
      console.error("OpenAI parse error:", e, "Content was:", openaiContent);
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
