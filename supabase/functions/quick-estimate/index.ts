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

// OpenAI OBC Validation Output - Full regulatory analysis
interface OpenAIOBCData {
  obcReferences: Array<{
    code: string;
    title: string;
    relevance: "direct" | "related" | "informational";
    summary: string;
  }>;
  regulatoryNotes: string[];
  permitRequired: boolean;
  permitType: "building" | "electrical" | "plumbing" | "hvac" | "none";
  inspectionRequired: boolean;
  estimatedPermitCost: number | null;
  validationStatus: "validated" | "warning" | "pending";
  complianceScore: number; // 0-100
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

// ============================================
// MODEL SELECTION - COST OPTIMIZED
// ============================================

// Model tiers for cost optimization
const AI_MODELS = {
  // Visual analysis models (ordered by cost: low → high)
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite", // Cheapest - simple tasks
  GEMINI_FLASH: "google/gemini-2.5-flash",           // Mid-tier - standard tasks
  GEMINI_PRO: "google/gemini-2.5-pro",               // Premium - complex tasks
  
  // Text/validation models
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",   // Fast text validation
  GPT5_MINI: "openai/gpt-5-mini",                    // OpenAI alternative
};

interface ModelSelection {
  visualModel: string;
  estimationModel: string;
  validationModel: string;
  maxTokensVisual: number;
  maxTokensEstimation: number;
  runDualEngine: boolean;
  runOBCValidation: boolean;
}

function selectModelsForTier(
  tier: "free" | "pro" | "premium",
  filterAnswers?: FilterAnswers | null,
  hasConflict?: boolean
): ModelSelection {
  const affectsStructure = filterAnswers?.technicalFilter?.affectsStructure || false;
  const affectsMechanical = filterAnswers?.technicalFilter?.affectsMechanical || false;
  const isComplex = affectsStructure || affectsMechanical;
  
  // Premium: Full power, always dual engine
  if (tier === "premium") {
    return {
      visualModel: AI_MODELS.GEMINI_PRO,
      estimationModel: AI_MODELS.GEMINI_FLASH,
      validationModel: AI_MODELS.GPT5_MINI,
      maxTokensVisual: 1500,
      maxTokensEstimation: 1200,
      runDualEngine: true,
      runOBCValidation: isComplex,
    };
  }
  
  // Pro: Flash for most, dual engine only on conflicts or complex work
  if (tier === "pro") {
    return {
      visualModel: AI_MODELS.GEMINI_FLASH,
      estimationModel: AI_MODELS.GEMINI_FLASH_LITE,
      validationModel: AI_MODELS.GEMINI_3_FLASH,
      maxTokensVisual: 800,
      maxTokensEstimation: 600,
      runDualEngine: isComplex || hasConflict === true,
      runOBCValidation: isComplex,
    };
  }
  
  // Free: Flash-Lite only, single engine, no OBC
  return {
    visualModel: AI_MODELS.GEMINI_FLASH_LITE,
    estimationModel: AI_MODELS.GEMINI_FLASH_LITE,
    validationModel: AI_MODELS.GEMINI_FLASH_LITE,
    maxTokensVisual: 400,
    maxTokensEstimation: 400,
    runDualEngine: false,
    runOBCValidation: false,
  };
}

// STEP 1: Gemini Visual Analysis - Model selected by tier
async function geminiVisualAnalysis(
  image: string, 
  description: string, 
  apiKey: string, 
  modelConfig: ModelSelection
): Promise<GeminiVisualData> {
  const isPremium = modelConfig.visualModel === AI_MODELS.GEMINI_PRO;
  
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

  console.log(`GEMINI: Using ${modelConfig.visualModel} (max_tokens: ${modelConfig.maxTokensVisual})`);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.visualModel,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: geminiPrompt },
          { type: "image_url", image_url: { url: image } }
        ]
      }],
      max_tokens: modelConfig.maxTokensVisual,
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

// STEP 2: Estimation - Model selected by tier
async function gptEstimationAnalysis(
  image: string, 
  description: string, 
  geminiData: GeminiVisualData, 
  apiKey: string,
  modelConfig: ModelSelection
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

  // Use model from config for cost optimization
  const estimationModel = modelConfig?.estimationModel || AI_MODELS.GEMINI_FLASH_LITE;
  const maxTokens = modelConfig?.maxTokensEstimation || 600;
  
  console.log(`ESTIMATION: Using ${estimationModel} with area: ${areaValue} (max_tokens: ${maxTokens})`);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: estimationModel,
      messages: [{
        role: "user",
        content: gptPrompt
      }],
      max_tokens: maxTokens,
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

// Main dual-engine analysis - now with tier-based model selection
async function dualEngineAnalysis(
  image: string, 
  description: string, 
  apiKey: string, 
  modelConfig: ModelSelection,
  filterAnswers?: FilterAnswers | null
) {
  const tierName = modelConfig.visualModel === AI_MODELS.GEMINI_PRO ? "PREMIUM" : 
                   modelConfig.visualModel === AI_MODELS.GEMINI_FLASH ? "PRO" : "FREE";
  console.log(`=== DUAL ENGINE ANALYSIS START === (${tierName}) - DualEngine: ${modelConfig.runDualEngine}`);
  
  // Step 1: Gemini visual analysis
  const geminiData = await geminiVisualAnalysis(image, description, apiKey, modelConfig);
  console.log("Gemini complete:", { area: geminiData.total_area, confidence: geminiData.confidence });
  
  // Step 2: Estimation based on Gemini data
  const gptData = await gptEstimationAnalysis(image, description, geminiData, apiKey, modelConfig);
  console.log("Estimation complete:", { materials: gptData.materials.length });
  
  // Step 3: Conflict detection
  const conflicts = detectConflicts(geminiData, gptData);
  console.log("Conflicts detected:", conflicts.length);
  
  // Build final response with tier info
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
          model: modelConfig.visualModel,
          findings: {
            area: geminiData.total_area,
            surface: geminiData.surface_type,
            condition: geminiData.surface_condition,
            confidence: geminiData.confidence
          },
          rawExcerpt: geminiData.raw_response
        },
        estimation: {
          role: "Estimation Specialist", 
          model: modelConfig.estimationModel,
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
// OPENAI OBC VALIDATION - GPT-5 REGULATORY ENGINE
// Uses Lovable AI Gateway with OpenAI GPT-5 for 
// Ontario Building Code analysis
// ============================================

async function openaiOBCValidation(
  filterAnswers: FilterAnswers | null,
  aiTriggers: AITriggers | null,
  apiKey: string,
  projectDescription?: string,
  projectArea?: number
): Promise<OpenAIOBCData> {
  const requiresOBC = aiTriggers?.obcSearch || false;
  const affectsStructure = filterAnswers?.technicalFilter?.affectsStructure || false;
  const affectsMechanical = filterAnswers?.technicalFilter?.affectsMechanical || false;
  const affectsFacade = filterAnswers?.technicalFilter?.affectsFacade || false;
  
  console.log("OBC Validation START:", { requiresOBC, affectsStructure, affectsMechanical, affectsFacade });
  
  // Build work scope description for AI
  const workScope: string[] = [];
  if (affectsStructure) workScope.push("structural modifications (load-bearing walls, foundations)");
  if (affectsMechanical) workScope.push("mechanical/plumbing work (HVAC, plumbing stacks, electrical)");
  if (affectsFacade) workScope.push("exterior/facade modifications (windows, doors, cladding)");
  if (workScope.length === 0) workScope.push("general interior renovation");
  
  const obcPrompt = `You are an Ontario Building Code (OBC 2024) regulatory expert. Analyze this construction project and provide compliance guidance.

=== PROJECT DETAILS ===
Description: ${projectDescription || "General construction/renovation project"}
Area: ${projectArea ? `${projectArea} sq ft` : "Not specified"}
Work Scope: ${workScope.join(", ")}
Affects Structure: ${affectsStructure ? "YES" : "No"}
Affects Mechanical: ${affectsMechanical ? "YES" : "No"}
Affects Facade: ${affectsFacade ? "YES" : "No"}

=== YOUR TASK ===
1. Identify ALL relevant OBC sections that apply
2. Determine permit requirements
3. List required inspections
4. Estimate permit costs (Ontario 2024 rates)
5. Provide compliance recommendations

=== RESPONSE FORMAT (JSON) ===
{
  "obcReferences": [
    {
      "code": "OBC Section Number (e.g., 9.10.14)",
      "title": "Section Title",
      "relevance": "direct/related/informational",
      "summary": "Brief explanation of how this applies"
    }
  ],
  "regulatoryNotes": ["Important note 1", "Important note 2"],
  "permitRequired": true/false,
  "permitType": "building/electrical/plumbing/hvac/none",
  "inspectionRequired": true/false,
  "estimatedPermitCost": NUMBER_OR_NULL,
  "complianceScore": 0-100,
  "recommendations": ["Action item 1", "Action item 2"]
}

=== OBC REFERENCE GUIDELINES ===
- Part 9 (Housing/Small Buildings): Most residential renovations
- Part 3 (Fire Protection): Multi-unit or commercial
- Part 4 (Structural Design): Load-bearing modifications
- Part 6 (HVAC): Heating/cooling changes
- Part 7 (Plumbing): Plumbing modifications
- Part 10 (Change of Use): Occupancy changes

Be specific with OBC section numbers. If structural work is involved, ALWAYS require permits.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini", // Using GPT-5 for regulatory reasoning
        messages: [{
          role: "system",
          content: "You are an Ontario Building Code expert providing regulatory compliance analysis for construction projects. Always cite specific OBC sections."
        }, {
          role: "user",
          content: obcPrompt
        }],
        max_tokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent regulatory advice
      }),
    });

    if (!response.ok) {
      console.error("OBC Validation API error:", response.status);
      throw new Error(`OBC API error: ${response.status}`);
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || "";
    console.log("OBC raw response:", rawContent.substring(0, 500));

    // Parse JSON response
    let cleanContent = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(cleanContent);
    console.log("OBC parsed successfully:", { 
      referencesCount: parsed.obcReferences?.length, 
      permitRequired: parsed.permitRequired,
      complianceScore: parsed.complianceScore
    });

    return {
      obcReferences: parsed.obcReferences || [],
      regulatoryNotes: parsed.regulatoryNotes || [],
      permitRequired: parsed.permitRequired ?? (affectsStructure || affectsMechanical),
      permitType: parsed.permitType || "none",
      inspectionRequired: parsed.inspectionRequired ?? (affectsStructure || affectsMechanical),
      estimatedPermitCost: parsed.estimatedPermitCost || null,
      validationStatus: "validated",
      complianceScore: parsed.complianceScore ?? 75,
      recommendations: parsed.recommendations || [],
      raw_response: rawContent.substring(0, 800),
    };
  } catch (error) {
    console.error("OBC Validation error:", error);
    
    // Fallback with basic logic-based analysis
    const fallbackReferences: OpenAIOBCData["obcReferences"] = [];
    
    if (affectsStructure) {
      fallbackReferences.push({
        code: "OBC 9.10.14",
        title: "Structural Requirements",
        relevance: "direct",
        summary: "Load-bearing wall modifications require engineering review"
      });
      fallbackReferences.push({
        code: "OBC 4.1.5",
        title: "Dead Loads",
        relevance: "direct",
        summary: "Structural load calculations required"
      });
    }
    if (affectsMechanical) {
      fallbackReferences.push({
        code: "OBC 9.31",
        title: "Mechanical Systems",
        relevance: "direct",
        summary: "HVAC modifications require permit and inspection"
      });
      fallbackReferences.push({
        code: "OBC 9.33",
        title: "Plumbing Systems",
        relevance: "direct",
        summary: "Plumbing changes require plumbing permit"
      });
    }
    if (affectsFacade) {
      fallbackReferences.push({
        code: "OBC 9.27",
        title: "Windows and Doors",
        relevance: "direct",
        summary: "Exterior openings must meet energy and egress requirements"
      });
    }
    
    // Add general reference if no specific work type
    if (fallbackReferences.length === 0) {
      fallbackReferences.push({
        code: "OBC Part 9",
        title: "Housing and Small Buildings",
        relevance: "informational",
        summary: "General requirements for residential renovations"
      });
    }
    
    return {
      obcReferences: fallbackReferences,
      regulatoryNotes: [
        affectsStructure ? "Structural work requires building permit" : "",
        affectsMechanical ? "Mechanical/plumbing work may require separate permits" : "",
        "Consult local building authority for specific requirements"
      ].filter(Boolean),
      permitRequired: affectsStructure || affectsMechanical,
      permitType: affectsStructure ? "building" : (affectsMechanical ? "plumbing" : "none"),
      inspectionRequired: affectsStructure || affectsMechanical,
      estimatedPermitCost: affectsStructure ? 500 : (affectsMechanical ? 200 : null),
      validationStatus: "warning", // Warning because AI failed, using fallback
      complianceScore: 60,
      recommendations: [
        "Verify requirements with local building department",
        "Consider consulting a licensed contractor"
      ],
      raw_response: `Fallback analysis due to: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============================================
// MAIN SERVER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, description, type, isPremium, tier, filterAnswers, aiTriggers } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    if (!image) throw new Error("No image provided");

    // Determine tier: explicit tier > isPremium flag > default to free
    let userTier: "free" | "pro" | "premium" = "free";
    if (tier === "premium" || tier === "pro" || tier === "free") {
      userTier = tier;
    } else if (isPremium === true) {
      userTier = "premium";
    }
    
    console.log(`Processing ${type} request... (Tier: ${userTier})`);
    
    // Log filter data if provided
    if (filterAnswers) {
      console.log("Filter Answers received:", JSON.stringify(filterAnswers));
    }
    if (aiTriggers) {
      console.log("AI Triggers:", JSON.stringify(aiTriggers));
    }

    // Select models based on tier and filter answers
    const modelConfig = selectModelsForTier(userTier, filterAnswers);
    console.log(`Model Config: Visual=${modelConfig.visualModel}, Est=${modelConfig.estimationModel}, DualEngine=${modelConfig.runDualEngine}`);

    // Run analysis with tier-optimized models
    const result = type === "photo_estimate" 
      ? await dualEngineAnalysis(image, description, apiKey, modelConfig, filterAnswers)
      : await standardAnalysis(image, description, apiKey);
    
    // OBC validation only if enabled by model config OR explicitly triggered
    const shouldRunOBC = modelConfig.runOBCValidation || aiTriggers?.obcSearch;
      
    if (shouldRunOBC) {
      console.log("Running OBC Validation...");
      const obcData = await openaiOBCValidation(
        filterAnswers, 
        aiTriggers, 
        apiKey,
        description,
        result.estimate?.area
      );
      
      // Merge OBC data into result
      if (result.estimate) {
        result.estimate.obcValidation = obcData;
        result.estimate.dualEngine = result.estimate.dualEngine || {};
        result.estimate.dualEngine.openai = {
          role: "Regulatory Validator",
          model: modelConfig.validationModel,
          findings: obcData,
          rawExcerpt: obcData.raw_response,
        };
      }
      console.log("OBC Validation complete:", { 
        status: obcData.validationStatus, 
        permitRequired: obcData.permitRequired 
      });
    }

    // Add tier info to response for transparency
    if (result.estimate) {
      result.estimate.tierInfo = {
        tier: userTier,
        modelsUsed: {
          visual: modelConfig.visualModel,
          estimation: modelConfig.estimationModel,
          validation: modelConfig.validationModel,
        },
        dualEngineEnabled: modelConfig.runDualEngine,
        obcEnabled: shouldRunOBC,
      };
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
