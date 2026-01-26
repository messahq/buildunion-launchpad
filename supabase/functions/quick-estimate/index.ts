import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// FILTER ANSWERS & AI TRIGGERS INTERFACES
// ============================================

interface FilterAnswers {
  inputFilter: {
    dataAvailability: "both" | "blueprints_only" | "photos_only" | "none";
    siteModifications: "significant" | "minor" | "none" | "unknown";
  };
  technicalFilter: {
    affectsStructure: boolean;
    affectsMechanical: boolean;
    affectsFacade: boolean;
    hasProjectManager: "yes_pm" | "yes_technical" | "no" | "self";
  };
  workflowFilter: {
    subcontractorCount: "1-2" | "3-5" | "6+" | "not_applicable";
    deadline: "strict_fixed" | "flexible_fixed" | "strict_flexible" | "both_flexible";
  };
}

interface AITriggers {
  ragEnabled: boolean;
  conflictDetection: boolean;
  obcSearch: boolean;
  teamMapDepth: "basic" | "standard" | "deep";
  reportGeneration: boolean;
  recommendTeamMode: boolean;
}

// ============================================
// DUAL-ENGINE OUTPUT TYPES
// ============================================

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

// OpenAI OBC Validation Output (Placeholder for future OPENAI_API_KEY integration)
interface OpenAIOBCData {
  obcReferences: string[];
  regulatoryNotes: string[];
  permitRequired: boolean;
  validationStatus: "validated" | "warning" | "pending";
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
async function geminiVisualAnalysis(image: string, description: string, apiKey: string, isPremium: boolean): Promise<GeminiVisualData> {
  const basePrompt = `You are a VISUAL ANALYSIS specialist for construction. Your job is to LOOK at the image and extract what you SEE.

ANALYZE THE IMAGE AND EXTRACT:
1. TOTAL AREA - Read the exact measurement shown (e.g., "1350 sq ft")
2. SURFACE TYPE - What material is visible? (tile, hardwood, concrete, carpet, etc.)
3. SURFACE CONDITION - Current state (new, worn, damaged, subfloor exposed, etc.)
4. VISIBLE FEATURES - What rooms/areas are shown? Any obstacles?
5. ROOM TYPE - Kitchen, bathroom, living room, basement, etc.`;

  const premiumAdditions = isPremium ? `

=== PREMIUM DEEP ANALYSIS ===
6. STRUCTURAL ELEMENTS - Identify load-bearing walls, doorways, windows, columns
7. ACCESSIBILITY - Note any accessibility considerations (ramps, wide doorways)
8. UTILITIES - Visible electrical outlets, plumbing, HVAC vents that may affect work
9. COMPLEXITY ASSESSMENT - Rate project complexity (simple/moderate/complex/highly complex)
10. SPECIAL CONSIDERATIONS - Identify areas requiring special treatment (moisture, high traffic, etc.)` : '';

  const geminiPrompt = `${basePrompt}
${premiumAdditions}

${description ? `User notes: "${description}"` : ""}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "total_area": NUMBER_FROM_IMAGE_OR_NULL,
  "unit": "sq ft",
  "surface_type": "detected surface material",
  "surface_condition": "current condition assessment",
  "visible_features": ["feature1", "feature2"],
  "room_type": "room type",
  "confidence": "high/medium/low"${isPremium ? `,
  "structural_elements": ["element1", "element2"],
  "utilities_detected": ["utility1", "utility2"],
  "complexity_rating": "simple/moderate/complex/highly complex",
  "special_considerations": ["consideration1", "consideration2"]` : ''}
}

CRITICAL: Read ANY visible measurements EXACTLY as written. If you see "Total Area = 1350 sq ft", return 1350.
If no area measurement is visible, estimate based on room proportions and set confidence to "low".`;

  console.log("GEMINI: Starting", isPremium ? "DEEP" : "STANDARD", "visual analysis...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: isPremium ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: geminiPrompt },
          { type: "image_url", image_url: { url: image } }
        ]
      }],
      max_tokens: isPremium ? 1500 : 800,
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
  apiKey: string,
  isPremium: boolean
): Promise<GPTEstimateData> {
  const areaValue = geminiData.total_area;
  
  // Detect project type from description
  const descLower = (description || "").toLowerCase();
  const isPainting = descLower.includes("paint") || descLower.includes("festés") || descLower.includes("festeni");
  const isFlooring = descLower.includes("floor") || descLower.includes("tile") || descLower.includes("padló") || descLower.includes("csempe");
  
  // Build project-specific estimation rules
  let estimationRules = "";
  let materialsExample = "";
  let projectType = "General construction";
  
  if (isPainting) {
    projectType = "Painting project";
    estimationRules = `=== PAINTING ESTIMATION RULES ===
- Paint coverage: ~350-400 sq ft per gallon (1 coat)
- Primer coverage: ~300-350 sq ft per gallon
- For 2 coats of paint, double the paint quantity
- Painter's tape: 1 roll per 60 linear ft
- Drop cloths: 1 per 200 sq ft
- Brushes/rollers: basic set per 500 sq ft
- Add 10% extra for waste/touch-ups`;
    materialsExample = `{
    "materials": [
      {"item": "Interior Paint", "quantity": NUMBER, "unit": "gallons", "notes": "2 coats, calc details"},
      {"item": "Primer", "quantity": NUMBER, "unit": "gallons", "notes": "1 coat"},
      {"item": "Painter's Tape", "quantity": NUMBER, "unit": "rolls", "notes": "60 ft/roll"},
      {"item": "Drop Cloths", "quantity": NUMBER, "unit": "pcs", "notes": ""},
      {"item": "Roller Kit", "quantity": NUMBER, "unit": "sets", "notes": "roller + brushes"}
    ],
    "total_material_area": ${areaValue || "ESTIMATED_AREA"},
    "summary": "Paint materials for ${areaValue || 'estimated'} sq ft",
    "recommendations": ["tip1", "tip2"]
  }`;
  } else if (isFlooring || !description) {
    projectType = "Flooring/Tile project";
    estimationRules = `=== FLOORING ESTIMATION RULES ===
- Tile box: ~12 sq ft per box
- Tile adhesive: 1 bag per 40 sq ft
- Grout: 1 bag per 80 sq ft
- Add 10-15% waste factor`;
    materialsExample = `{
    "materials": [
      {"item": "Ceramic Tile", "quantity": NUMBER, "unit": "boxes", "notes": "calc details"},
      {"item": "Tile Adhesive", "quantity": NUMBER, "unit": "bags", "notes": ""},
      {"item": "Grout", "quantity": NUMBER, "unit": "bags", "notes": ""}
    ],
    "total_material_area": ${areaValue || "ESTIMATED_AREA"},
    "summary": "Brief summary",
    "recommendations": ["tip1", "tip2"]
  }`;
  } else {
    projectType = description;
    estimationRules = `=== GENERAL ESTIMATION RULES ===
Based on the project description, estimate appropriate materials.
Add 10-15% waste factor for materials.`;
    materialsExample = `{
    "materials": [
      {"item": "Primary Material", "quantity": NUMBER, "unit": "appropriate unit", "notes": "calculation details"}
    ],
    "total_material_area": ${areaValue || "ESTIMATED_AREA"},
    "summary": "Brief summary based on project type",
    "recommendations": ["tip1", "tip2"]
  }`;
  }
  
  const gptPrompt = `You are a PROFESSIONAL CONSTRUCTION ESTIMATOR. Calculate materials needed based on the area and PROJECT TYPE.

=== VISUAL DATA ===
- Total Area: ${areaValue ? `${areaValue} sq ft` : "Estimate from image"}
- Surface Type: ${geminiData.surface_type}
- Room Type: ${geminiData.room_type}

=== PROJECT TYPE ===
${projectType}
User description: "${description || 'Not specified'}"

${estimationRules}

RESPOND IN THIS EXACT JSON FORMAT:
${materialsExample}

CRITICAL: Match materials to the PROJECT TYPE. If user says "paint", provide PAINT materials, NOT tiles!`;

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
      if (isPainting) {
        // Paint fallback
        const paintGallons = Math.ceil((areaValue / 350) * 2); // 2 coats
        const primerGallons = Math.ceil(areaValue / 325);
        defaultResult.materials = [
          { item: "Interior Paint", quantity: paintGallons, unit: "gallons", notes: `${areaValue} sq ft × 2 coats` },
          { item: "Primer", quantity: primerGallons, unit: "gallons", notes: "1 coat" },
          { item: "Painter's Tape", quantity: Math.ceil(areaValue / 200), unit: "rolls", notes: "" },
          { item: "Drop Cloths", quantity: Math.ceil(areaValue / 200), unit: "pcs", notes: "" },
          { item: "Roller Kit", quantity: Math.ceil(areaValue / 500), unit: "sets", notes: "" },
        ];
        defaultResult.summary = `Paint materials for ${areaValue} sq ft painting project.`;
      } else {
        // Flooring fallback
        const wasteArea = Math.ceil(areaValue * 1.15);
        defaultResult.materials = [
          { item: "Tile/Flooring", quantity: wasteArea, unit: "sq ft", notes: `${areaValue} + 15% waste` },
          { item: "Tile Boxes (12 sq ft/box)", quantity: Math.ceil(wasteArea / 12), unit: "boxes", notes: "" },
          { item: "Tile Adhesive", quantity: Math.ceil(areaValue / 40), unit: "bags", notes: "1 bag/40 sq ft" },
          { item: "Grout", quantity: Math.ceil(areaValue / 80), unit: "bags", notes: "1 bag/80 sq ft" },
        ];
        defaultResult.summary = `Material estimate for ${areaValue} sq ft flooring project.`;
      }
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
    
    // Calculate fallback if we have area - respect project type
    if (areaValue) {
      if (isPainting) {
        const paintGallons = Math.ceil((areaValue / 350) * 2);
        const primerGallons = Math.ceil(areaValue / 325);
        defaultResult.materials = [
          { item: "Interior Paint", quantity: paintGallons, unit: "gallons", notes: `${areaValue} sq ft × 2 coats` },
          { item: "Primer", quantity: primerGallons, unit: "gallons", notes: "1 coat" },
          { item: "Painter's Tape", quantity: Math.ceil(areaValue / 200), unit: "rolls", notes: "" },
          { item: "Drop Cloths", quantity: Math.ceil(areaValue / 200), unit: "pcs", notes: "" },
        ];
        defaultResult.summary = `Paint materials for ${areaValue} sq ft painting project.`;
      } else {
        const wasteArea = Math.ceil(areaValue * 1.15);
        defaultResult.materials = [
          { item: "Tile/Flooring", quantity: wasteArea, unit: "sq ft", notes: `${areaValue} + 15% waste` },
          { item: "Tile Boxes (12 sq ft/box)", quantity: Math.ceil(wasteArea / 12), unit: "boxes", notes: "" },
          { item: "Tile Adhesive", quantity: Math.ceil(areaValue / 40), unit: "bags", notes: "1 bag/40 sq ft" },
          { item: "Grout", quantity: Math.ceil(areaValue / 80), unit: "bags", notes: "1 bag/80 sq ft" },
        ];
        defaultResult.summary = `Material estimate for ${areaValue} sq ft flooring project.`;
      }
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
async function dualEngineAnalysis(image: string, description: string, apiKey: string, isPremium: boolean) {
  console.log("=== DUAL ENGINE ANALYSIS START ===", isPremium ? "(PREMIUM)" : "(STANDARD)");
  
  // Step 1: Gemini visual analysis
  const geminiData = await geminiVisualAnalysis(image, description, apiKey, isPremium);
  console.log("Gemini complete:", { area: geminiData.total_area, confidence: geminiData.confidence });
  
  // Step 2: GPT estimation based on Gemini data
  const gptData = await gptEstimationAnalysis(image, description, geminiData, apiKey, isPremium);
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

// ============================================
// OPENAI OBC VALIDATION PLACEHOLDER
// Future: Use OPENAI_API_KEY for regulatory validation
// ============================================

async function openaiOBCValidation(
  filterAnswers: FilterAnswers | null,
  aiTriggers: AITriggers | null,
  _apiKey: string
): Promise<OpenAIOBCData> {
  // PLACEHOLDER: This will be implemented when OPENAI_API_KEY is configured
  // For now, return pending status based on filter answers
  
  const requiresOBC = aiTriggers?.obcSearch || false;
  const affectsStructure = filterAnswers?.technicalFilter?.affectsStructure || false;
  const affectsMechanical = filterAnswers?.technicalFilter?.affectsMechanical || false;
  
  // Generate placeholder OBC references based on work type
  const obcReferences: string[] = [];
  if (affectsStructure) {
    obcReferences.push("OBC 9.10.14 - Structural Requirements");
    obcReferences.push("OBC 4.1.5 - Load-Bearing Walls");
  }
  if (affectsMechanical) {
    obcReferences.push("OBC 9.31 - Mechanical Systems");
    obcReferences.push("OBC 9.33 - Plumbing Stacks");
  }
  
  console.log("OBC Validation:", { requiresOBC, affectsStructure, affectsMechanical, obcReferences });
  
  return {
    obcReferences,
    regulatoryNotes: requiresOBC 
      ? ["Building permit may be required", "Consult local building authority"]
      : [],
    permitRequired: affectsStructure || affectsMechanical,
    validationStatus: "pending", // Will be "validated" when OPENAI_API_KEY is active
  };
}

// ============================================
// MAIN SERVER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, description, type, isPremium, filterAnswers, aiTriggers } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    if (!image) throw new Error("No image provided");

    const premiumMode = isPremium === true;
    console.log(`Processing ${type} request... (Premium: ${premiumMode})`);
    
    // Log filter data if provided
    if (filterAnswers) {
      console.log("Filter Answers received:", JSON.stringify(filterAnswers));
    }
    if (aiTriggers) {
      console.log("AI Triggers:", JSON.stringify(aiTriggers));
    }

    // Run dual-engine analysis
    const result = type === "photo_estimate" 
      ? await dualEngineAnalysis(image, description, apiKey, premiumMode)
      : await standardAnalysis(image, description, apiKey);
    
    // If OBC search is triggered, add regulatory data
    if (aiTriggers?.obcSearch) {
      const obcData = await openaiOBCValidation(filterAnswers, aiTriggers, apiKey);
      
      // Merge OBC data into result
      if (result.estimate) {
        result.estimate.obcValidation = obcData;
        result.estimate.dualEngine = result.estimate.dualEngine || {};
        result.estimate.dualEngine.openai = {
          role: "Regulatory Validator",
          model: "gpt-5-mini (pending)",
          findings: obcData,
        };
      }
    }

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
