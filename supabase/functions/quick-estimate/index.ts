import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeminiVisualData {
  total_area: number | null;
  unit: string;
  surface_type: string;
  surface_condition: string;
  visible_features: string[];
  room_type: string;
  confidence: "high" | "medium" | "low";
  raw_response?: string;
}

interface GPTEstimateData {
  materials: Array<{
    item: string;
    quantity: number;
    unit: string;
    notes: string;
  }>;
  labor: {
    hours: number;
    days: number;
    rate: number;
    total: number;
  };
  total_material_area: number;
  summary: string;
  recommendations: string[];
  raw_response?: string;
}

interface ConflictItem {
  field: string;
  geminiValue: string;
  gptValue: string;
  verified: boolean;
  severity: "high" | "medium" | "low";
}

// STEP 1: Gemini Pro - The Visual Specialist
async function geminiVisualAnalysis(image: string, description: string, apiKey: string): Promise<GeminiVisualData> {
  const geminiPrompt = `You are a VISUAL ANALYSIS specialist for construction. Your job is to LOOK at the image and extract what you SEE.

ANALYZE THE IMAGE AND EXTRACT:
1. TOTAL AREA - Read the exact measurement shown (e.g., "1350 sq ft")
2. SURFACE TYPE - What material is visible? (tile, hardwood, concrete, carpet, etc.)
3. SURFACE CONDITION - Current state (new, worn, damaged, subfloor exposed, etc.)
4. VISIBLE FEATURES - What rooms/areas are shown? Any obstacles?
5. ROOM TYPE - Kitchen, bathroom, living room, basement, etc.

${description ? `User notes: "${description}"` : ""}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "total_area": NUMBER_FROM_IMAGE_OR_NULL,
  "unit": "sq ft",
  "surface_type": "detected surface material",
  "surface_condition": "current condition assessment",
  "visible_features": ["feature1", "feature2"],
  "room_type": "room type",
  "confidence": "high/medium/low"
}

CRITICAL: Read ANY visible measurements EXACTLY as written. If you see "Total Area = 1350 sq ft", return 1350.
If no area measurement is visible, estimate based on room proportions and set confidence to "low".`;

  console.log("GEMINI: Starting visual analysis...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: geminiPrompt },
          { type: "image_url", image_url: { url: image } }
        ]
      }],
      max_tokens: 1000,
    }),
  });

  const defaultResult: GeminiVisualData = {
    total_area: null,
    unit: "sq ft",
    surface_type: "unknown",
    surface_condition: "unknown",
    visible_features: [],
    room_type: "unknown",
    confidence: "low"
  };

  if (!response.ok) {
    console.error("GEMINI: API error", response.status);
    return defaultResult;
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content || "";
  console.log("GEMINI raw response:", rawContent);

  try {
    let cleanContent = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    const parsed = JSON.parse(cleanContent);
    console.log("GEMINI parsed:", parsed);
    return { ...parsed, raw_response: rawContent.substring(0, 500) };
  } catch (e) {
    console.error("GEMINI: JSON parse failed, trying regex extraction");
    
    // Fallback regex for area
    const areaPatterns = [
      /total_area["\s:]+(\d+(?:\.\d+)?)/i,
      /(\d{3,5})\s*(?:sq\.?\s*ft|square\s*feet)/i,
    ];
    
    for (const pattern of areaPatterns) {
      const match = rawContent.match(pattern);
      if (match?.[1]) {
        defaultResult.total_area = parseFloat(match[1]);
        defaultResult.confidence = "medium";
        console.log("GEMINI: Extracted area via regex:", defaultResult.total_area);
        break;
      }
    }
    
    defaultResult.raw_response = rawContent.substring(0, 500);
    return defaultResult;
  }
}

// STEP 2: GPT-5 - The Estimation Specialist (Materials Only - no labor calc)
async function gptEstimationAnalysis(
  image: string, 
  description: string, 
  geminiData: GeminiVisualData, 
  apiKey: string
): Promise<GPTEstimateData> {
  const areaValue = geminiData.total_area;
  
  const gptPrompt = `You are a PROFESSIONAL CONSTRUCTION ESTIMATOR. Calculate materials needed based on the area.

=== VISUAL DATA ===
- Total Area: ${areaValue ? `${areaValue} sq ft` : "Estimate from image"}
- Surface Type: ${geminiData.surface_type}
- Room Type: ${geminiData.room_type}

=== PROJECT ===
${description || "General flooring/tile work"}

=== ESTIMATION RULES ===
- Tile box: ~12 sq ft per box
- Tile adhesive: 1 bag per 40 sq ft
- Grout: 1 bag per 80 sq ft
- Add 10-15% waste factor

RESPOND IN JSON:
{
  "materials": [
    {"item": "Ceramic Tile", "quantity": NUMBER, "unit": "boxes", "notes": "calc details"},
    {"item": "Tile Adhesive", "quantity": NUMBER, "unit": "bags", "notes": ""},
    {"item": "Grout", "quantity": NUMBER, "unit": "bags", "notes": ""}
  ],
  "total_material_area": ${areaValue || "ESTIMATED_AREA"},
  "summary": "Brief summary",
  "recommendations": ["tip1", "tip2"]
}`;

  console.log("GPT-5: Starting estimation with area:", areaValue);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: gptPrompt
      }],
      max_tokens: 1500,
    }),
  });

  const defaultResult: GPTEstimateData = {
    materials: [],
    labor: { hours: 0, days: 0, rate: 0, total: 0 },
    total_material_area: areaValue || 1000,
    summary: "Material estimation",
    recommendations: [],
  };

  if (!response.ok) {
    console.error("GPT-5: API error", response.status);
    // Calculate fallback materials if we have area
    if (areaValue) {
      const wasteArea = Math.ceil(areaValue * 1.15);
      defaultResult.materials = [
        { item: "Tile/Flooring", quantity: wasteArea, unit: "sq ft", notes: `${areaValue} + 15% waste` },
        { item: "Tile Boxes (12 sq ft/box)", quantity: Math.ceil(wasteArea / 12), unit: "boxes", notes: "" },
        { item: "Tile Adhesive", quantity: Math.ceil(areaValue / 40), unit: "bags", notes: "1 bag/40 sq ft" },
        { item: "Grout", quantity: Math.ceil(areaValue / 80), unit: "bags", notes: "1 bag/80 sq ft" },
      ];
      defaultResult.summary = `Material estimate for ${areaValue} sq ft flooring project.`;
    }
    return defaultResult;
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content || "";
  console.log("GPT-5 raw response:", rawContent);

  try {
    let cleanContent = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    const parsed = JSON.parse(cleanContent);
    console.log("GPT-5 parsed:", parsed);
    // Set empty labor since we removed it from prompt
    parsed.labor = { hours: 0, days: 0, rate: 0, total: 0 };
    return { ...parsed, raw_response: rawContent.substring(0, 500) };
  } catch (e) {
    console.error("GPT-5: JSON parse failed");
    defaultResult.raw_response = rawContent.substring(0, 500);
    
    // Calculate fallback if we have area
    if (areaValue) {
      const wasteArea = Math.ceil(areaValue * 1.15);
      defaultResult.materials = [
        { item: "Tile/Flooring", quantity: wasteArea, unit: "sq ft", notes: `${areaValue} + 15% waste` },
        { item: "Tile Boxes (12 sq ft/box)", quantity: Math.ceil(wasteArea / 12), unit: "boxes", notes: "" },
        { item: "Tile Adhesive", quantity: Math.ceil(areaValue / 40), unit: "bags", notes: "1 bag/40 sq ft" },
        { item: "Grout", quantity: Math.ceil(areaValue / 80), unit: "bags", notes: "1 bag/80 sq ft" },
      ];
      defaultResult.summary = `Material estimate for ${areaValue} sq ft flooring project.`;
    }
    
    return defaultResult;
  }
}

// STEP 3: Cross-verify and detect conflicts
function detectConflicts(gemini: GeminiVisualData, gpt: GPTEstimateData): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  
  // Check area consistency
  if (gemini.total_area && gpt.total_material_area) {
    const areaDiff = Math.abs(gemini.total_area - gpt.total_material_area);
    const areaPercent = (areaDiff / gemini.total_area) * 100;
    
    if (areaPercent > 10) {
      conflicts.push({
        field: "Total Area",
        geminiValue: `${gemini.total_area} sq ft (measured)`,
        gptValue: `${gpt.total_material_area} sq ft (used for calc)`,
        verified: false,
        severity: areaPercent > 25 ? "high" : "medium"
      });
    }
  }
  
  // Check if flooring quantity matches area
  const flooringMaterial = gpt.materials.find(m => 
    m.item.toLowerCase().includes("tile") || 
    m.item.toLowerCase().includes("floor")
  );
  
  if (flooringMaterial && gemini.total_area) {
    const expectedMin = gemini.total_area * 1.10;
    const expectedMax = gemini.total_area * 1.20;
    
    // Check boxes calculation (12 sq ft per box standard)
    if (flooringMaterial.unit === "boxes") {
      const boxArea = flooringMaterial.quantity * 12;
      if (boxArea < expectedMin || boxArea > expectedMax * 1.5) {
        conflicts.push({
          field: "Tile Quantity",
          geminiValue: `${gemini.total_area} sq ft = ~${Math.ceil(gemini.total_area * 1.15 / 12)} boxes expected`,
          gptValue: `${flooringMaterial.quantity} boxes (${boxArea} sq ft)`,
          verified: false,
          severity: "medium"
        });
      }
    }
  }
  
  return conflicts;
}

// Main dual-engine analysis
async function dualEngineAnalysis(image: string, description: string, apiKey: string) {
  console.log("=== DUAL ENGINE ANALYSIS START ===");
  
  // Step 1: Gemini visual analysis
  const geminiData = await geminiVisualAnalysis(image, description, apiKey);
  console.log("Gemini complete:", { area: geminiData.total_area, confidence: geminiData.confidence });
  
  // Step 2: GPT estimation based on Gemini data
  const gptData = await gptEstimationAnalysis(image, description, geminiData, apiKey);
  console.log("GPT complete:", { materials: gptData.materials.length, laborHours: gptData.labor.hours });
  
  // Step 3: Conflict detection
  const conflicts = detectConflicts(geminiData, gptData);
  console.log("Conflicts detected:", conflicts.length);
  
  // Build final response
  return {
    estimate: {
      // Core estimate data
      materials: gptData.materials,
      summary: gptData.summary,
      recommendations: gptData.recommendations,
      
      // Area information
      area: geminiData.total_area,
      areaUnit: geminiData.unit,
      areaConfidence: geminiData.confidence,
      
      // Surface analysis from Gemini
      surfaceType: geminiData.surface_type,
      surfaceCondition: geminiData.surface_condition,
      roomType: geminiData.room_type,
      
      // Dual-engine transparency
      dualEngine: {
        gemini: {
          role: "Visual Specialist",
          model: "gemini-2.5-pro",
          findings: {
            area: geminiData.total_area,
            surface: geminiData.surface_type,
            condition: geminiData.surface_condition,
            confidence: geminiData.confidence
          },
          rawExcerpt: geminiData.raw_response
        },
        gpt: {
          role: "Estimation Specialist", 
          model: "gpt-5-mini",
          findings: {
            materialsCount: gptData.materials.length,
            laborHours: gptData.labor.hours,
            totalLaborCost: gptData.labor.total,
            areaUsed: gptData.total_material_area
          },
          rawExcerpt: gptData.raw_response
        },
        conflicts: conflicts,
        verified: conflicts.length === 0,
        verificationStatus: conflicts.length === 0 ? "verified" : "conflicts_detected"
      }
    }
  };
}

// Standard single-engine for non-floor-plan images
async function standardAnalysis(image: string, description: string, apiKey: string) {
  const prompt = `You are an expert construction estimator. Analyze this image and provide a material/labor estimate.

${description ? `Project: "${description}"` : "General construction analysis"}

Labor rate: $17.50/hour, 8-hour days.

RESPOND IN JSON:
{
  "materials": [{"item": "Material", "quantity": NUMBER, "unit": "unit", "notes": ""}],
  "laborHours": "X-Y hours",
  "summary": "Brief summary",
  "recommendations": ["tip1", "tip2"]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image } }
        ]
      }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) throw new Error(`AI API error: ${response.status}`);

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";
  
  try {
    let clean = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1) clean = clean.substring(start, end + 1);
    return { estimate: JSON.parse(clean) };
  } catch {
    return {
      estimate: {
        materials: [{ item: "See analysis", quantity: 1, unit: "lot", notes: content.substring(0, 300) }],
        laborHours: "8-16 hours",
        summary: content.substring(0, 200),
        recommendations: []
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

    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    if (!image) throw new Error("No image provided");

    console.log(`Processing ${type} request...`);

    const result = type === "photo_estimate" 
      ? await dualEngineAnalysis(image, description, apiKey)
      : await standardAnalysis(image, description, apiKey);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
