import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Professional dual-engine photo analysis with full material estimation
async function dualEngineAnalysis(image: string, description: string, apiKey: string) {
  // STEP 1: Gemini Pro for visual extraction AND professional estimation
  const geminiPrompt = `You are an expert construction estimator with 20+ years experience. Analyze this floor plan/photo.

CRITICAL TASK:
1. READ the TOTAL AREA measurement EXACTLY as shown on the image (e.g., "Total Area = 1350 sq ft")
2. Based on the area and the user's project description, provide a COMPLETE material estimate

${description ? `USER PROJECT: "${description}"` : "Analyze what work is needed based on the image."}

ESTIMATION RULES:
- Labor rate: $17.50/hour, 8-hour work days
- Add 10-15% waste factor for tiles/flooring
- Standard tile box covers ~10-12 sq ft
- Tile adhesive: 1 bag per 40 sq ft
- Grout: 1 bag per 80 sq ft

RESPOND IN THIS EXACT JSON FORMAT:
{
  "total_area": NUMBER_FROM_IMAGE,
  "unit": "sq ft",
  "materials": [
    {
      "item": "Material name (e.g., Ceramic Tile 12x12)",
      "quantity": CALCULATED_NUMBER,
      "unit": "boxes/bags/sq ft",
      "notes": "Calculation explanation"
    }
  ],
  "labor": {
    "hours": NUMBER,
    "rate": 17.5,
    "total": NUMBER,
    "days": NUMBER
  },
  "summary": "Brief project summary including the EXACT area from the image",
  "recommendations": ["Professional tip 1", "Professional tip 2", "Professional tip 3"]
}

EXAMPLE for 1350 sq ft tile job:
- Tiles: 1350 + 10% waste = 1485 sq ft = ~124 boxes (12 sq ft/box)
- Adhesive: 1350 / 40 = ~34 bags
- Grout: 1350 / 80 = ~17 bags
- Labor: 1350 sq ft / 100 sq ft per day = 13.5 days = 108 hours

READ THE AREA FROM THE IMAGE FIRST, THEN CALCULATE.`;

  console.log("Calling Gemini Pro for full estimation...");
  
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
      max_tokens: 2000,
    }),
  });

  let geminiData: any = null;
  let rawGeminiResponse = "";
  
  if (geminiResponse.ok) {
    const geminiResult = await geminiResponse.json();
    rawGeminiResponse = geminiResult.choices?.[0]?.message?.content || "";
    console.log("Gemini raw response:", rawGeminiResponse);
    
    // Try JSON parse
    try {
      let cleanContent = rawGeminiResponse;
      cleanContent = cleanContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonStart = cleanContent.indexOf("{");
      const jsonEnd = cleanContent.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
      }
      geminiData = JSON.parse(cleanContent);
      console.log("Gemini parsed data:", geminiData);
    } catch (e) {
      console.error("Gemini JSON parse error, using fallback:", e);
    }
  } else {
    console.error("Gemini API error:", await geminiResponse.text());
  }

  // STEP 2: If Gemini provided full data, use it. Otherwise, call OpenAI as backup
  if (geminiData?.materials && geminiData.materials.length > 0) {
    console.log("Using Gemini's full estimation");
    return {
      estimate: {
        materials: geminiData.materials,
        laborHours: geminiData.labor?.hours ? `${geminiData.labor.hours} hours (${geminiData.labor.days || Math.ceil(geminiData.labor.hours / 8)} days at $17.50/hr)` : "16-24 hours",
        laborCost: geminiData.labor?.total || (geminiData.labor?.hours ? geminiData.labor.hours * 17.5 : null),
        summary: geminiData.summary || `Project covers ${geminiData.total_area} ${geminiData.unit}`,
        recommendations: geminiData.recommendations || [],
        area: geminiData.total_area,
        areaUnit: geminiData.unit || "sq ft",
        source: "gemini_pro"
      }
    };
  }

  // FALLBACK: Extract area from raw response and call OpenAI
  console.log("Gemini didn't return full data, using OpenAI backup...");
  
  let extractedArea: number | null = null;
  
  // Try to extract area from Gemini response
  const areaPatterns = [
    /total_area["\s:]+(\d+(?:\.\d+)?)/i,
    /(\d{3,5})\s*(?:sq\.?\s*ft|square\s*feet)/i,
    /"?total[_\s]?area"?\s*[:=]\s*"?(\d+)/i,
    /(\d{3,5})\s*sqft/i,
  ];
  
  for (const pattern of areaPatterns) {
    const match = rawGeminiResponse.match(pattern);
    if (match && match[1]) {
      extractedArea = parseFloat(match[1]);
      console.log("Extracted area via regex:", extractedArea);
      break;
    }
  }

  const openaiPrompt = `You are an expert construction estimator.

${extractedArea ? `CRITICAL: The floor plan shows EXACTLY ${extractedArea} sq ft. USE THIS NUMBER.` : "Estimate the area from the context."}

${description ? `Project: "${description}"` : "Provide a general tile/flooring estimate."}

ESTIMATION RULES:
- Labor rate: $17.50/hour, 8-hour work days
- Tiles: Add 10-15% waste, ~12 sq ft per box
- Adhesive: 1 bag per 40 sq ft
- Grout: 1 bag per 80 sq ft
- Productivity: ~100 sq ft per day for tile work

RESPOND IN THIS EXACT JSON FORMAT:
{
  "materials": [
    {"item": "Material", "quantity": NUMBER, "unit": "unit", "notes": "calculation"}
  ],
  "laborHours": "X hours (Y days)",
  "laborCost": NUMBER,
  "summary": "Summary with exact area",
  "recommendations": ["tip1", "tip2"],
  "area": ${extractedArea || "null"}
}`;

  const openaiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [
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

  let openaiData: any = null;
  let rawOpenaiResponse = "";
  
  if (openaiResponse.ok) {
    const openaiResult = await openaiResponse.json();
    rawOpenaiResponse = openaiResult.choices?.[0]?.message?.content || "";
    console.log("OpenAI raw response:", rawOpenaiResponse);
    
    try {
      let cleanContent = rawOpenaiResponse;
      cleanContent = cleanContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonStart = cleanContent.indexOf("{");
      const jsonEnd = cleanContent.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
      }
      openaiData = JSON.parse(cleanContent);
      console.log("OpenAI parsed data:", openaiData);
    } catch (e) {
      console.error("OpenAI JSON parse error:", e);
    }
  }

  // FINAL FALLBACK: Return raw text if all parsing fails
  if (!openaiData?.materials && !geminiData?.materials) {
    console.log("All parsing failed, returning raw text fallback");
    
    // Create a basic estimate from the area if we have it
    const area = extractedArea || geminiData?.total_area || 1000;
    const wasteArea = Math.ceil(area * 1.15);
    
    return {
      estimate: {
        materials: [
          { 
            item: "Tile/Flooring Material", 
            quantity: wasteArea, 
            unit: "sq ft", 
            notes: `${area} sq ft + 15% waste` 
          },
          { 
            item: "Tile Boxes (12 sq ft/box)", 
            quantity: Math.ceil(wasteArea / 12), 
            unit: "boxes", 
            notes: `${wasteArea} / 12 sq ft per box` 
          },
          { 
            item: "Tile Adhesive", 
            quantity: Math.ceil(area / 40), 
            unit: "bags", 
            notes: "1 bag per 40 sq ft" 
          },
          { 
            item: "Grout", 
            quantity: Math.ceil(area / 80), 
            unit: "bags", 
            notes: "1 bag per 80 sq ft" 
          }
        ],
        laborHours: `${Math.ceil(area / 100) * 8} hours (${Math.ceil(area / 100)} days)`,
        laborCost: Math.ceil(area / 100) * 8 * 17.5,
        summary: `Flooring project for ${area} sq ft area. AI response was not fully parsed - this is a calculated estimate.`,
        recommendations: [
          "Verify measurements on-site before ordering materials",
          "Consider ordering 15-20% extra for cuts and waste",
          "Check subfloor condition before installation"
        ],
        area: area,
        areaUnit: "sq ft",
        source: "calculated_fallback",
        rawGeminiResponse: rawGeminiResponse.substring(0, 500),
        rawOpenaiResponse: rawOpenaiResponse.substring(0, 500)
      }
    };
  }

  return {
    estimate: {
      materials: openaiData?.materials || [],
      laborHours: openaiData?.laborHours || "16-24 hours",
      laborCost: openaiData?.laborCost || null,
      summary: openaiData?.summary || `Estimate for ${extractedArea || "unknown"} sq ft`,
      recommendations: openaiData?.recommendations || [],
      area: openaiData?.area || extractedArea,
      areaUnit: "sq ft",
      source: "openai_gpt5"
    }
  };
}

// Standard single-engine analysis for non-photo estimates
async function standardAnalysis(image: string, description: string, apiKey: string) {
  const prompt = `You are an expert construction estimator analyzing a construction project.

Analyze the provided image and give a detailed material and labor estimate.
Consider: ${description || "general construction requirements"}

Use Canadian construction standards and pricing.
Labor rate: $17.50/hour, 8-hour work days.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "materials": [
    {"item": "Material name", "quantity": NUMBER, "unit": "unit", "notes": "details"}
  ],
  "laborHours": "X-Y hours",
  "summary": "Brief project summary",
  "recommendations": ["tip 1", "tip 2"]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";
  
  try {
    let cleanContent = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    return { estimate: JSON.parse(cleanContent) };
  } catch {
    return {
      estimate: {
        materials: [{ item: "See AI Analysis", quantity: 1, unit: "lot", notes: content.substring(0, 300) }],
        laborHours: "8-16 hours",
        summary: content.substring(0, 200),
        recommendations: ["Review AI analysis for details"]
      }
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, description, type } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!image) {
      throw new Error("No image provided");
    }

    console.log(`Processing ${type} request with description: ${description}`);

    let result;
    if (type === "photo_estimate") {
      // Use dual-engine for photo estimates (floor plans)
      result = await dualEngineAnalysis(image, description, apiKey);
    } else {
      // Standard analysis for other types
      result = await standardAnalysis(image, description, apiKey);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Quick estimate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
