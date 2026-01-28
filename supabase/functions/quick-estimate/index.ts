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
// MESSA AUDIT REPORT TYPES
// ============================================

interface AuditReportStatus {
  status: "VERIFIED" | "CONFLICT_DETECTED" | "PENDING";
  conflictCount: number;
  highSeverityCount: number;
}

interface StructuralSummary {
  dimensions: string[];
  materials: string[];
  loadBearing: string[];
  utilities: string[];
  specialConsiderations: string[];
}

interface OBCCheckResult {
  status: "PASSED" | "WARNING" | "FAILED" | "PENDING";
  complianceScore: number;
  criticalIssues: string[];
  permitRequired: boolean;
}

interface OperationalReadiness {
  isStable: boolean;
  readinessScore: number; // 0-100
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

interface MESSAAuditReport {
  auditStatus: AuditReportStatus;
  structuralSummary: StructuralSummary;
  obcCheck: OBCCheckResult;
  operationalReadiness: OperationalReadiness;
  engineHandshake: {
    geminiExtraction: {
      timestamp: string;
      dataPoints: Record<string, unknown>;
      confidence: "high" | "medium" | "low";
    };
    openaiValidation: {
      timestamp: string;
      dataPoints: Record<string, unknown>;
      validationPassed: boolean;
    };
    crossValidation: {
      performed: boolean;
      discrepancies: ConflictItem[];
      deltaPercentage: number;
    };
  };
  tierEnforcement: {
    tier: "free" | "pro" | "premium";
    featuresEnabled: string[];
    featuresLocked: string[];
  };
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
  
  // =============================================================================
  // PRECISION AREA EXTRACTION PROMPT - Zero Tolerance for Estimation Errors
  // =============================================================================
  
  // Pre-extract area from description for prompt injection
  const descriptionAreaPatterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet?|sqft|SF)/i,
    /area\s*(?:is|=|:)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i,
    /(\d{1,3}(?:,\d{3})*)\s*(?:négyzetláb|nm|m2)/i,
  ];
  let descriptionAreaHint: number | null = null;
  for (const pattern of descriptionAreaPatterns) {
    const match = description?.match(pattern);
    if (match?.[1]) {
      descriptionAreaHint = parseFloat(match[1].replace(/,/g, ""));
      if (descriptionAreaHint > 10 && descriptionAreaHint < 100000) {
        console.log(`[GEMINI] Found area in user description: ${descriptionAreaHint} sq ft`);
        break;
      }
    }
  }
  
  const basePrompt = `You are a PRECISION VISUAL ANALYSIS specialist for construction. Your PRIMARY task is to EXTRACT EXACT MEASUREMENTS.

=== CRITICAL: EXACT AREA EXTRACTION ===
Your FIRST and MOST IMPORTANT job is to find and read ANY area measurement.

LOOK IN TWO PLACES:
1. THE IMAGE - Look for text like "Total Area = 1302 sq ft" or any visible measurement
2. THE USER DESCRIPTION - The user may have written the area in their message

${descriptionAreaHint ? `
⚠️ USER PROVIDED AREA: The user wrote "${descriptionAreaHint} sq ft" in their description.
Use this value: ${descriptionAreaHint}
Set confidence to "high" because this is user-confirmed data.
` : ''}

RULES:
- DO NOT estimate or calculate - READ THE EXACT NUMBER
- DO NOT apply any buffers or adjustments - return the RAW number
- DO NOT round or approximate - if you see "150", return 150, NOT 165

=== SECONDARY ANALYSIS (only after area extraction) ===
1. SURFACE TYPE - What material is visible? (tile, hardwood, laminate, concrete, carpet, etc.)
2. SURFACE CONDITION - Current state (new, worn, damaged, subfloor exposed, etc.)
3. VISIBLE FEATURES - What rooms/areas are shown? Any obstacles?
4. ROOM TYPE - Kitchen, bathroom, living room, basement, etc.`;

  const premiumAdditions = isPremium ? `

=== PREMIUM DEEP ANALYSIS ===
5. STRUCTURAL ELEMENTS - Identify load-bearing walls, doorways, windows, columns
6. ACCESSIBILITY - Note any accessibility considerations (ramps, wide doorways)
7. UTILITIES - Visible electrical outlets, plumbing, HVAC vents that may affect work
8. COMPLEXITY ASSESSMENT - Rate project complexity (simple/moderate/complex/highly complex)
9. SPECIAL CONSIDERATIONS - Identify areas requiring special treatment (moisture, high traffic, etc.)` : '';

  const geminiPrompt = `${basePrompt}
${premiumAdditions}

User notes: "${description || 'No description provided'}"

=== RESPOND IN THIS EXACT JSON FORMAT ===
{
  "total_area": ${descriptionAreaHint ? descriptionAreaHint : 'EXACT_NUMBER_OR_NULL'},
  "unit": "sq ft",
  "surface_type": "detected surface material",
  "surface_condition": "current condition assessment", 
  "visible_features": ["feature1", "feature2"],
  "room_type": "room type",
  "confidence": "${descriptionAreaHint ? 'high' : 'high/medium/low'}",
  "area_source": "${descriptionAreaHint ? 'user_description' : 'visible_text | blueprint_label | estimated'}"${isPremium ? `,
  "structural_elements": ["element1", "element2"],
  "utilities_detected": ["utility1", "utility2"],
  "complexity_rating": "simple/moderate/complex/highly complex",
  "special_considerations": ["consideration1", "consideration2"]` : ''}
}

=== ZERO TOLERANCE RULES ===
1. ${descriptionAreaHint ? `User said ${descriptionAreaHint} sq ft - USE EXACTLY ${descriptionAreaHint}` : 'Read the exact number from visible text'}
2. NEVER add or subtract percentages - return the RAW base area
3. Set confidence to "high" if the user provided the number or you read it from text
4. The number 150 must stay 150, NOT become 165 (waste buffer is added LATER)`;

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

IMPORTANT: Use the EXACT base area (${areaValue} sq ft) for calculations. Do NOT modify this number.
The waste buffer will be added by the frontend display.`;
    materialsExample = `{
    "materials": [
      {"item": "Interior Paint", "quantity": NUMBER, "unit": "gallons", "notes": "Based on ${areaValue} sq ft × 2 coats"},
      {"item": "Primer", "quantity": NUMBER, "unit": "gallons", "notes": "1 coat for ${areaValue} sq ft"},
      {"item": "Painter's Tape", "quantity": NUMBER, "unit": "rolls", "notes": "60 ft/roll"},
      {"item": "Drop Cloths", "quantity": NUMBER, "unit": "pcs", "notes": ""},
      {"item": "Roller Kit", "quantity": NUMBER, "unit": "sets", "notes": "roller + brushes"}
    ],
    "base_area": ${areaValue || "null"},
    "total_material_area": ${areaValue || "ESTIMATED_AREA"},
    "summary": "Paint materials for ${areaValue || 'estimated'} sq ft",
    "recommendations": ["tip1", "tip2"]
  }`;
  } else if (isFlooring || !description) {
    projectType = "Flooring/Tile project";
    estimationRules = `=== FLOORING ESTIMATION RULES ===
- IMPORTANT: Use EXACT base area of ${areaValue} sq ft for all calculations
- The 10% waste buffer will be ADDED by the frontend, do NOT add it here
- Tile box: ~12 sq ft per box
- Tile adhesive: 1 bag per 40 sq ft
- Grout: 1 bag per 80 sq ft
- Hardwood/Laminate: calculate per ${areaValue} sq ft base

=== CRITICAL AREA HANDLING ===
- base_area = ${areaValue} (the EXACT number from the image, no modification)
- total_material_area = ${areaValue} (EXACT SAME as base_area, waste added later)
- Do NOT subtract or add percentages to the detected area`;
    materialsExample = `{
    "materials": [
      {"item": "Hardwood Flooring", "quantity": ${areaValue || "NUMBER"}, "unit": "sq ft", "notes": "Base area - waste added later"},
      {"item": "Underlayment/Vapor Barrier", "quantity": ${areaValue || "NUMBER"}, "unit": "sq ft", "notes": "Matches base area"},
      {"item": "Transition Strips/Thresholds", "quantity": 8, "unit": "linear ft", "notes": "Doorways estimate"},
      {"item": "Adhesive/Fasteners", "quantity": 1, "unit": "lot", "notes": "Installation supplies"}
    ],
    "base_area": ${areaValue || "null"},
    "total_material_area": ${areaValue || "ESTIMATED_AREA"},
    "summary": "Flooring materials for ${areaValue || 'detected'} sq ft",
    "recommendations": ["tip1", "tip2"]
  }`;
  } else {
    projectType = description;
    estimationRules = `=== GENERAL ESTIMATION RULES ===
- IMPORTANT: Use EXACT base area of ${areaValue} sq ft
- The waste buffer will be ADDED by the frontend display, do NOT add it here
Based on the project description, estimate appropriate materials.`;
    materialsExample = `{
    "materials": [
      {"item": "Primary Material", "quantity": ${areaValue || "NUMBER"}, "unit": "sq ft", "notes": "Base area"}
    ],
    "base_area": ${areaValue || "null"},
    "total_material_area": ${areaValue || "ESTIMATED_AREA"},
    "summary": "Brief summary based on project type",
    "recommendations": ["tip1", "tip2"]
  }`;
  }
  
  const gptPrompt = `You are a PRECISION CONSTRUCTION ESTIMATOR. Calculate materials based on EXACT measurements.

=== CRITICAL: EXACT AREA USAGE ===
The Visual Engine detected EXACTLY ${areaValue} sq ft from the image.
YOU MUST USE THIS EXACT NUMBER: ${areaValue}
DO NOT modify, round, or apply any buffers to this number.
The frontend will add the waste buffer (+10%) separately.

=== DETECTED DATA ===
- Base Area: ${areaValue ? `${areaValue} sq ft (EXACT - use this number)` : "Estimate from image"}
- Surface Type: ${geminiData.surface_type}
- Room Type: ${geminiData.room_type}

=== PROJECT TYPE ===
${projectType}
User description: "${description || 'Not specified'}"

${estimationRules}

=== RESPOND IN THIS EXACT JSON FORMAT ===
${materialsExample}

=== ZERO TOLERANCE RULES ===
1. If Visual Engine said ${areaValue} sq ft, your base_area AND total_material_area MUST be ${areaValue}
2. Material quantities for area-based items (flooring, underlayment) MUST match ${areaValue}
3. NEVER subtract from the detected area - the waste is ADDED later, not subtracted now
4. NEVER round 1302 to 1300 or 1100 - use the EXACT number`;

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

// STEP 3: Cross-verify and detect conflicts - ENGINEERING HANDSHAKE
function detectConflicts(gemini: GeminiVisualData, gpt: GPTEstimateData): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  
  // Check area consistency - CRITICAL for cost accuracy
  if (gemini.total_area && gpt.total_material_area) {
    const areaDiff = Math.abs(gemini.total_area - gpt.total_material_area);
    const areaPercent = (areaDiff / gemini.total_area) * 100;
    
    // ANY delta > 0% triggers conflict (strict mode)
    if (areaPercent > 0) {
      conflicts.push({
        field: "Total Area",
        geminiValue: `${gemini.total_area} sq ft (Visual Engine measurement)`,
        gptValue: `${gpt.total_material_area} sq ft (Estimation Engine calc)`,
        verified: false,
        severity: areaPercent > 25 ? "high" : areaPercent > 10 ? "medium" : "low"
      });
    }
  }
  
  // Check if flooring/material quantity matches area
  const flooringMaterial = gpt.materials.find(m => 
    m.item.toLowerCase().includes("tile") || 
    m.item.toLowerCase().includes("floor")
  );
  
  if (flooringMaterial && gemini.total_area) {
    const expectedMin = gemini.total_area * 1.10;
    const expectedMax = gemini.total_area * 1.20;
    
    if (flooringMaterial.unit === "boxes") {
      const boxArea = flooringMaterial.quantity * 12;
      if (boxArea < expectedMin || boxArea > expectedMax * 1.5) {
        conflicts.push({
          field: "Tile Quantity",
          geminiValue: `${gemini.total_area} sq ft = ~${Math.ceil(gemini.total_area * 1.15 / 12)} boxes expected`,
          gptValue: `${flooringMaterial.quantity} boxes (${boxArea} sq ft)`,
          verified: false,
          severity: "high"
        });
      }
    }
  }
  
  // Surface type vs material mismatch detection
  if (gemini.surface_type && gpt.materials.length > 0) {
    const surfaceLower = gemini.surface_type.toLowerCase();
    const hasMatchingMaterial = gpt.materials.some(m => {
      const itemLower = m.item.toLowerCase();
      if (surfaceLower.includes("concrete") && itemLower.includes("concrete")) return true;
      if (surfaceLower.includes("wood") && (itemLower.includes("wood") || itemLower.includes("floor"))) return true;
      if (surfaceLower.includes("tile") && itemLower.includes("tile")) return true;
      if (surfaceLower.includes("carpet") && itemLower.includes("carpet")) return true;
      return false;
    });
    
    if (!hasMatchingMaterial && gemini.surface_type !== "unknown") {
      conflicts.push({
        field: "Surface Type vs Materials",
        geminiValue: `Detected: ${gemini.surface_type}`,
        gptValue: `Materials: ${gpt.materials.map(m => m.item).slice(0, 3).join(", ")}`,
        verified: false,
        severity: "medium"
      });
    }
  }
  
  return conflicts;
}

// ============================================
// MESSA AUDIT REPORT BUILDER
// ============================================

function buildAuditReport(
  gemini: GeminiVisualData,
  gpt: GPTEstimateData,
  conflicts: ConflictItem[],
  obcData: OpenAIOBCData | null,
  tier: "free" | "pro" | "premium",
  filterAnswers?: FilterAnswers | null
): MESSAAuditReport {
  const highSeverityConflicts = conflicts.filter(c => c.severity === "high");
  const deltaPercentage = conflicts.length > 0 && gemini.total_area && gpt.total_material_area
    ? Math.abs(gemini.total_area - gpt.total_material_area) / gemini.total_area * 100
    : 0;

  // Determine audit status
  let auditStatus: AuditReportStatus["status"] = "VERIFIED";
  if (conflicts.length > 0) {
    auditStatus = "CONFLICT_DETECTED";
  }
  if (!gemini.total_area && !gpt.total_material_area) {
    auditStatus = "PENDING";
  }

  // Build structural summary
  const structuralSummary: StructuralSummary = {
    dimensions: gemini.total_area ? [`Total Area: ${gemini.total_area} ${gemini.unit}`] : ["Area: Pending measurement"],
    materials: gpt.materials.map(m => `${m.item}: ${m.quantity} ${m.unit}`),
    loadBearing: (gemini as any).structural_elements || [],
    utilities: (gemini as any).utilities_detected || [],
    specialConsiderations: (gemini as any).special_considerations || [],
  };

  // Build OBC check result
  const obcCheck: OBCCheckResult = obcData ? {
    status: obcData.complianceScore >= 80 ? "PASSED" : obcData.complianceScore >= 50 ? "WARNING" : "FAILED",
    complianceScore: obcData.complianceScore,
    criticalIssues: obcData.obcReferences.filter(r => r.relevance === "direct").map(r => `${r.code}: ${r.summary}`),
    permitRequired: obcData.permitRequired,
  } : {
    status: "PENDING",
    complianceScore: 0,
    criticalIssues: [],
    permitRequired: false,
  };

  // Calculate operational readiness
  const blockers: string[] = [];
  const warnings: string[] = [];
  
  if (highSeverityConflicts.length > 0) {
    blockers.push(`${highSeverityConflicts.length} high-severity data conflicts detected`);
  }
  if (!gemini.total_area) {
    blockers.push("Area measurement not confirmed");
  }
  if (obcData?.permitRequired && obcData.validationStatus !== "validated") {
    blockers.push("Permit requirements not verified");
  }
  if (gemini.confidence === "low") {
    warnings.push("Low confidence in visual analysis - recommend additional photos");
  }
  if (conflicts.length > 0 && conflicts.length <= 2) {
    warnings.push("Minor discrepancies detected between engines");
  }

  const readinessScore = Math.max(0, 100 - (blockers.length * 25) - (warnings.length * 10) - (conflicts.length * 5));
  
  // Tier enforcement
  const tierFeatures = {
    free: {
      enabled: ["Basic visual analysis", "Material estimation"],
      locked: ["Dual-engine validation", "OBC compliance check", "Conflict visualization", "Team coordination"]
    },
    pro: {
      enabled: ["Enhanced visual analysis", "Material estimation", "Dual-engine validation (on conflict)", "OBC check (structural/mechanical)"],
      locked: ["Full conflict visualization", "Priority analysis", "Impact analysis"]
    },
    premium: {
      enabled: ["Full deep analysis", "Dual-engine always", "OBC compliance check", "Conflict visualization", "Impact analysis", "Priority support"],
      locked: []
    }
  };

  return {
    auditStatus: {
      status: auditStatus,
      conflictCount: conflicts.length,
      highSeverityCount: highSeverityConflicts.length,
    },
    structuralSummary,
    obcCheck,
    operationalReadiness: {
      isStable: blockers.length === 0,
      readinessScore,
      blockers,
      warnings,
      recommendations: [
        ...gpt.recommendations,
        ...(obcData?.recommendations || []),
        blockers.length > 0 ? "Resolve blockers before proceeding to Timeline/Task modules" : "",
      ].filter(Boolean),
    },
    engineHandshake: {
      geminiExtraction: {
        timestamp: new Date().toISOString(),
        dataPoints: {
          area: gemini.total_area,
          surfaceType: gemini.surface_type,
          condition: gemini.surface_condition,
          roomType: gemini.room_type,
          features: gemini.visible_features,
        },
        confidence: gemini.confidence,
      },
      openaiValidation: {
        timestamp: new Date().toISOString(),
        dataPoints: {
          materialsCount: gpt.materials.length,
          areaUsed: gpt.total_material_area,
          summary: gpt.summary,
        },
        validationPassed: conflicts.length === 0,
      },
      crossValidation: {
        performed: true,
        discrepancies: conflicts,
        deltaPercentage: Math.round(deltaPercentage * 100) / 100,
      },
    },
    tierEnforcement: {
      tier,
      featuresEnabled: tierFeatures[tier].enabled,
      featuresLocked: tierFeatures[tier].locked,
    },
  };
}

// Helper: Extract area from description text
function extractAreaFromDescription(description: string): number | null {
  if (!description) return null;
  
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet?|sqft)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*m|m²|square\s*meters?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:négyzetláb|nm|m2)/i,
    /total\s*(?:area|size)?\s*[:\-=]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (value > 10 && value < 100000) { // Sanity check
        console.log(`[AREA] Extracted from description: ${value} sq ft`);
        return value;
      }
    }
  }
  return null;
}

// Main dual-engine analysis - MESSA AUDIT PROTOCOL
async function dualEngineAnalysis(
  image: string, 
  description: string, 
  apiKey: string, 
  modelConfig: ModelSelection,
  filterAnswers?: FilterAnswers | null,
  obcData?: OpenAIOBCData | null
) {
  const tier = modelConfig.visualModel === AI_MODELS.GEMINI_PRO ? "premium" as const : 
               modelConfig.visualModel === AI_MODELS.GEMINI_FLASH ? "pro" as const : "free" as const;
  console.log(`=== MESSA DUAL ENGINE AUDIT START === (Tier: ${tier.toUpperCase()}) - DualEngine: ${modelConfig.runDualEngine}`);
  
  // STEP 0: Try to extract area from description first (user-provided data)
  const descriptionArea = extractAreaFromDescription(description);
  if (descriptionArea) {
    console.log(`[AREA] User provided area in description: ${descriptionArea} sq ft`);
  }
  
  // STEP 1: GEMINI VISUAL EXTRACTION
  // Role: Spatial analysis of blueprints, dimensions, site photos
  console.log(`[GEMINI] Starting visual extraction with ${modelConfig.visualModel}`);
  const geminiData = await geminiVisualAnalysis(image, description, apiKey, modelConfig);
  console.log("[GEMINI] Extraction complete:", { 
    area: geminiData.total_area, 
    surface: geminiData.surface_type,
    confidence: geminiData.confidence 
  });
  
  // STEP 2: ESTIMATION ENGINE (Material Calculations)
  console.log(`[ESTIMATION] Starting material calculation with ${modelConfig.estimationModel}`);
  const gptData = await gptEstimationAnalysis(image, description, geminiData, apiKey, modelConfig);
  console.log("[ESTIMATION] Calculation complete:", { 
    materialsCount: gptData.materials.length,
    areaUsed: gptData.total_material_area
  });
  
  // STEP 2.5: AREA FALLBACK CHAIN
  // Priority: 1. Gemini visual detection, 2. User description, 3. Estimation engine area
  let finalArea = geminiData.total_area;
  let areaSource = "gemini_visual";
  let areaConfidence = geminiData.confidence;
  
  if (!finalArea && descriptionArea) {
    finalArea = descriptionArea;
    areaSource = "user_description";
    areaConfidence = "high"; // User-provided data is high confidence
    console.log(`[AREA] Using user-provided area: ${finalArea} sq ft`);
  }
  
  if (!finalArea && gptData.total_material_area && gptData.total_material_area > 10) {
    finalArea = gptData.total_material_area;
    areaSource = "estimation_engine";
    areaConfidence = "medium";
    console.log(`[AREA] Using estimation engine area: ${finalArea} sq ft`);
  }
  
  // Update geminiData with final area for downstream processing
  if (finalArea && !geminiData.total_area) {
    geminiData.total_area = finalArea;
    geminiData.confidence = areaConfidence;
  }
  
  console.log(`[AREA] Final resolved area: ${finalArea} sq ft (source: ${areaSource}, confidence: ${areaConfidence})`);
  
  // STEP 3: ENGINEERING HANDSHAKE - Cross-Validation
  console.log("[CROSS-VALIDATION] Performing engineering handshake...");
  const conflicts = detectConflicts(geminiData, gptData);
  const deltaPercentage = geminiData.total_area && gptData.total_material_area
    ? Math.abs(geminiData.total_area - gptData.total_material_area) / geminiData.total_area * 100
    : 0;
  console.log("[CROSS-VALIDATION] Result:", { 
    conflictsDetected: conflicts.length,
    deltaPercentage: `${deltaPercentage.toFixed(2)}%`,
    status: conflicts.length > 0 ? "CONFLICT_DETECTED" : "VERIFIED"
  });
  
  // Build MESSA Audit Report
  const auditReport = buildAuditReport(geminiData, gptData, conflicts, obcData || null, tier, filterAnswers);
  
  // Build final response with full audit transparency
  return {
    estimate: {
      // Core estimate data
      materials: gptData.materials,
      summary: gptData.summary,
      recommendations: gptData.recommendations,
      
      // Area information - use resolved final area
      area: finalArea,
      areaUnit: geminiData.unit,
      areaConfidence: areaConfidence,
      areaSource: areaSource,
      
      // Surface analysis from Gemini
      surfaceType: geminiData.surface_type,
      surfaceCondition: geminiData.surface_condition,
      roomType: geminiData.room_type,
      
      // MESSA AUDIT REPORT - Primary output
      messaAudit: auditReport,
      
      // Dual-engine transparency (legacy format for compatibility)
      dualEngine: {
        gemini: {
          role: "Visual Specialist (Spatial Analysis)",
          model: modelConfig.visualModel,
          findings: {
            area: finalArea,
            areaSource: areaSource,
            surface: geminiData.surface_type,
            condition: geminiData.surface_condition,
            confidence: areaConfidence,
            roomType: geminiData.room_type,
            features: geminiData.visible_features,
          },
          rawExcerpt: geminiData.raw_response
        },
        estimation: {
          role: "Estimation Specialist (Material Calculations)", 
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
        verificationStatus: conflicts.length === 0 ? "verified" : "conflicts_detected",
        deltaPercentage: deltaPercentage,
      }
    },
    // Store raw engine data for Decision Log transparency
    _engineData: {
      gemini: geminiData,
      estimation: gptData,
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
    
    // === STRUCTURED LOGGING FOR MONITORING ===
    const logEntry = {
      event: modelConfig.runDualEngine ? "dual_engine_call" : "single_engine_call",
      tier: userTier,
      timestamp: new Date().toISOString(),
      models: {
        visual: modelConfig.visualModel,
        estimation: modelConfig.estimationModel,
        validation: modelConfig.runDualEngine ? modelConfig.validationModel : null,
      },
      config: {
        dualEngine: modelConfig.runDualEngine,
        obcValidation: modelConfig.runOBCValidation,
        maxTokens: modelConfig.maxTokensVisual,
      },
    };
    console.log(`[AI_CALL] ${JSON.stringify(logEntry)}`);

    // === MESSA AUDIT PROTOCOL ===
    // For photo_estimate: run OBC first if needed, then pass to dual engine
    let obcData: OpenAIOBCData | null = null;
    const shouldRunOBC = modelConfig.runOBCValidation || aiTriggers?.obcSearch;
    
    if (shouldRunOBC && type === "photo_estimate") {
      console.log(`[MESSA] Running OBC validation BEFORE dual-engine analysis`);
      console.log(`[AI_CALL] ${JSON.stringify({ event: "obc_validation_call", tier: userTier, timestamp: new Date().toISOString() })}`);
      obcData = await openaiOBCValidation(
        filterAnswers, 
        aiTriggers, 
        apiKey,
        description,
        undefined // Area not yet known
      );
      console.log("[OBC] Validation complete:", { 
        status: obcData.validationStatus, 
        permitRequired: obcData.permitRequired,
        complianceScore: obcData.complianceScore
      });
    }

    // Run analysis with tier-optimized models
    const result = type === "photo_estimate" 
      ? await dualEngineAnalysis(image, description, apiKey, modelConfig, filterAnswers, obcData)
      : await standardAnalysis(image, description, apiKey);
    
    // Merge OBC data into result if we ran it
    if (obcData && result.estimate) {
      result.estimate.obcValidation = obcData;
      result.estimate.dualEngine = result.estimate.dualEngine || {};
      result.estimate.dualEngine.openai = {
        role: "Regulatory Validator (OBC Compliance)",
        model: modelConfig.validationModel,
        findings: obcData,
        rawExcerpt: obcData.raw_response,
      };
      
      // Update MESSA Audit Report with OBC data
      if (result.estimate.messaAudit) {
        result.estimate.messaAudit.obcCheck = {
          status: obcData.complianceScore >= 80 ? "PASSED" : obcData.complianceScore >= 50 ? "WARNING" : "FAILED",
          complianceScore: obcData.complianceScore,
          criticalIssues: obcData.obcReferences.filter(r => r.relevance === "direct").map(r => `${r.code}: ${r.summary}`),
          permitRequired: obcData.permitRequired,
        };
      }
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

    // === FINAL AUDIT LOG ===
    console.log(`[MESSA_AUDIT] ${JSON.stringify({
      event: "audit_complete",
      tier: userTier,
      timestamp: new Date().toISOString(),
      auditStatus: result.estimate?.messaAudit?.auditStatus?.status || "N/A",
      conflictCount: result.estimate?.messaAudit?.auditStatus?.conflictCount || 0,
      obcStatus: result.estimate?.messaAudit?.obcCheck?.status || "PENDING",
      readinessScore: result.estimate?.messaAudit?.operationalReadiness?.readinessScore || 0,
    })}`);

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
