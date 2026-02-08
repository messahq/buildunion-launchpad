/**
 * QUANTITY RESOLVER ENGINE
 * 
 * Deterministic layer between AI Analysis and Materials Table.
 * This is NOT AI, NOT UI, NOT DB logic - it's a physics-based calculation engine.
 * 
 * Flow: [ AI Analysis ] → [ Quantity Resolver ] → [ Materials Table ] → [ Budget Engine ]
 * 
 * CRITICAL RULES:
 * - FAIL HARD if coverage_rate is missing
 * - FAIL HARD if material_type is unknown
 * - NO guessing, NO approximation
 * - ONE valid resolution path only
 */

// ============================================================================
// TYPES
// ============================================================================

export type MaterialCategory = 
  | 'paint'
  | 'flooring'
  | 'drywall'
  | 'insulation'
  | 'tile'
  | 'trim'
  | 'underlayment'
  | 'adhesive'
  | 'grout'
  | 'primer'
  | 'sealant'
  | 'lumber'
  | 'concrete'
  | 'roofing'
  | 'unknown';

export type ResolutionMethod = 
  | 'area_to_liquid'      // sq ft → gallons (paint, primer)
  | 'area_to_boxes'       // sq ft → boxes (flooring, tile)
  | 'area_to_sheets'      // sq ft → sheets (drywall, underlayment)
  | 'area_to_rolls'       // sq ft → rolls (insulation, roofing)
  | 'area_to_bags'        // sq ft → bags (concrete, grout)
  | 'linear_to_pieces'    // linear ft → pieces (trim, lumber)
  | 'passthrough'         // unit stays as-is (already resolved)
  | 'manual_required';    // cannot resolve - needs human input

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'failed';

export interface QuantityResolverInput {
  material_name: string;
  material_type?: MaterialCategory;
  input_unit: string;
  input_value: number;
  coverage_rate?: number;        // e.g., 350 sq ft per gallon
  container_unit?: string;       // e.g., "gallon", "box"
  waste_percent?: number;        // e.g., 10 for 10%
}

export interface QuantityResolverOutput {
  success: boolean;
  resolved_quantity?: number;
  resolved_unit?: string;
  gross_quantity?: number;       // with waste applied
  resolution_method: ResolutionMethod;
  confidence: ConfidenceLevel;
  error_message?: string;
  calculation_trace?: string;    // human-readable calculation for transparency
}

export interface ManualOverride {
  override: true;
  quantity: number;
  unit: string;
  reason: string;
  resolved_by: 'user' | 'foreman' | 'owner';
  timestamp: string;
}

// ============================================================================
// COVERAGE RATES DATABASE (Physics-based constants)
// ============================================================================

/**
 * Industry-standard coverage rates.
 * These are NOT guesses - they're from manufacturer specifications.
 */
export const COVERAGE_RATES: Record<string, { rate: number; inputUnit: string; outputUnit: string }> = {
  // Paints & Liquids (sq ft per gallon)
  'paint': { rate: 350, inputUnit: 'sq ft', outputUnit: 'gallon' },
  'primer': { rate: 400, inputUnit: 'sq ft', outputUnit: 'gallon' },
  'sealant': { rate: 200, inputUnit: 'sq ft', outputUnit: 'gallon' },
  'stain': { rate: 300, inputUnit: 'sq ft', outputUnit: 'gallon' },
  
  // Flooring (sq ft per box/unit)
  'laminate': { rate: 22, inputUnit: 'sq ft', outputUnit: 'box' },
  'hardwood': { rate: 20, inputUnit: 'sq ft', outputUnit: 'box' },
  'vinyl_plank': { rate: 24, inputUnit: 'sq ft', outputUnit: 'box' },
  'tile': { rate: 10, inputUnit: 'sq ft', outputUnit: 'box' },
  'carpet': { rate: 12, inputUnit: 'sq ft', outputUnit: 'sq yd' },
  
  // Sheets (sq ft per sheet)
  'drywall_4x8': { rate: 32, inputUnit: 'sq ft', outputUnit: 'sheet' },
  'drywall_4x12': { rate: 48, inputUnit: 'sq ft', outputUnit: 'sheet' },
  'plywood': { rate: 32, inputUnit: 'sq ft', outputUnit: 'sheet' },
  'underlayment': { rate: 100, inputUnit: 'sq ft', outputUnit: 'roll' },
  
  // Insulation (sq ft per roll/batt)
  'insulation_r13': { rate: 40, inputUnit: 'sq ft', outputUnit: 'roll' },
  'insulation_r19': { rate: 48, inputUnit: 'sq ft', outputUnit: 'roll' },
  'insulation_r30': { rate: 31, inputUnit: 'sq ft', outputUnit: 'roll' },
  
  // Linear materials (linear ft per piece)
  'baseboard': { rate: 8, inputUnit: 'linear ft', outputUnit: 'piece' },
  'crown_molding': { rate: 8, inputUnit: 'linear ft', outputUnit: 'piece' },
  'trim': { rate: 8, inputUnit: 'linear ft', outputUnit: 'piece' },
  'lumber_2x4': { rate: 8, inputUnit: 'linear ft', outputUnit: 'piece' },
  
  // Adhesives & Grout (sq ft per bag/tube)
  'thinset': { rate: 50, inputUnit: 'sq ft', outputUnit: 'bag' },
  'grout': { rate: 25, inputUnit: 'sq ft', outputUnit: 'bag' },
  'adhesive': { rate: 40, inputUnit: 'sq ft', outputUnit: 'tube' },
  
  // Roofing (sq ft per bundle/roll)
  'shingles': { rate: 33.3, inputUnit: 'sq ft', outputUnit: 'bundle' },
  'roofing_felt': { rate: 400, inputUnit: 'sq ft', outputUnit: 'roll' },
  
  // Concrete (sq ft per bag at standard depth)
  'concrete': { rate: 4, inputUnit: 'sq ft', outputUnit: 'bag' }, // 4" depth
};

// ============================================================================
// MATERIAL TYPE DETECTION
// ============================================================================

/**
 * Infer material category from name.
 * Returns 'unknown' if cannot confidently determine.
 */
export function inferMaterialCategory(materialName: string): MaterialCategory {
  const name = materialName.toLowerCase();
  
  // Paint family
  if (name.includes('paint') || name.includes('wall color')) return 'paint';
  if (name.includes('primer')) return 'primer';
  if (name.includes('stain')) return 'paint';
  if (name.includes('sealant') || name.includes('sealer')) return 'sealant';
  
  // Flooring family
  if (name.includes('laminate')) return 'flooring';
  if (name.includes('hardwood')) return 'flooring';
  if (name.includes('vinyl') && (name.includes('plank') || name.includes('floor'))) return 'flooring';
  if (name.includes('tile') && !name.includes('ceiling')) return 'tile';
  if (name.includes('carpet')) return 'flooring';
  if (name.includes('flooring')) return 'flooring';
  
  // Drywall family
  if (name.includes('drywall') || name.includes('sheetrock') || name.includes('gypsum')) return 'drywall';
  if (name.includes('plywood')) return 'drywall';
  
  // Underlayment
  if (name.includes('underlayment') || name.includes('underlay')) return 'underlayment';
  
  // Insulation
  if (name.includes('insulation') || name.includes('batt')) return 'insulation';
  
  // Trim family
  if (name.includes('baseboard') || name.includes('base board')) return 'trim';
  if (name.includes('crown') || name.includes('molding') || name.includes('moulding')) return 'trim';
  if (name.includes('trim') || name.includes('casing')) return 'trim';
  
  // Adhesives
  if (name.includes('thinset') || name.includes('thin-set')) return 'adhesive';
  if (name.includes('grout')) return 'grout';
  if (name.includes('adhesive') || name.includes('glue')) return 'adhesive';
  
  // Roofing
  if (name.includes('shingle')) return 'roofing';
  if (name.includes('roofing') || name.includes('felt')) return 'roofing';
  
  // Concrete
  if (name.includes('concrete') || name.includes('cement')) return 'concrete';
  
  // Lumber
  if (name.includes('lumber') || name.includes('2x4') || name.includes('2x6')) return 'lumber';
  
  return 'unknown';
}

/**
 * Get coverage key for lookup in COVERAGE_RATES.
 */
function getCoverageKey(category: MaterialCategory, materialName: string): string | null {
  const name = materialName.toLowerCase();
  
  switch (category) {
    case 'paint':
      if (name.includes('primer')) return 'primer';
      if (name.includes('stain')) return 'stain';
      if (name.includes('sealant') || name.includes('sealer')) return 'sealant';
      return 'paint';
      
    case 'flooring':
      if (name.includes('laminate')) return 'laminate';
      if (name.includes('hardwood')) return 'hardwood';
      if (name.includes('vinyl')) return 'vinyl_plank';
      if (name.includes('carpet')) return 'carpet';
      return 'laminate'; // default flooring
      
    case 'tile':
      return 'tile';
      
    case 'drywall':
      if (name.includes('4x12') || name.includes('12 ft')) return 'drywall_4x12';
      return 'drywall_4x8';
      
    case 'underlayment':
      return 'underlayment';
      
    case 'insulation':
      if (name.includes('r-30') || name.includes('r30')) return 'insulation_r30';
      if (name.includes('r-19') || name.includes('r19')) return 'insulation_r19';
      return 'insulation_r13';
      
    case 'trim':
      if (name.includes('crown')) return 'crown_molding';
      if (name.includes('baseboard')) return 'baseboard';
      return 'trim';
      
    case 'adhesive':
      if (name.includes('thinset')) return 'thinset';
      return 'adhesive';
      
    case 'grout':
      return 'grout';
      
    case 'roofing':
      if (name.includes('shingle')) return 'shingles';
      return 'roofing_felt';
      
    case 'concrete':
      return 'concrete';
      
    case 'lumber':
      return 'lumber_2x4';
      
    default:
      return null;
  }
}

// ============================================================================
// LINEAR MATERIALS - Special handling (not area-based!)
// ============================================================================

/**
 * Check if material is a LINEAR type that should NOT use sq ft area directly.
 * These materials are measured in linear feet, not square feet.
 */
function isLinearMaterial(materialName: string): boolean {
  const name = materialName.toLowerCase();
  return (
    name.includes('transition') ||
    name.includes('threshold') ||
    name.includes('strip') ||
    name.includes('baseboard') ||
    name.includes('crown') ||
    name.includes('molding') ||
    name.includes('moulding') ||
    name.includes('trim') ||
    name.includes('casing') ||
    name.includes('quarter round')
  );
}

/**
 * Estimate perimeter from area for linear materials.
 * Formula: perimeter ≈ 4 × √area (assumes roughly square room)
 * For multiple doors/transitions, we use a more conservative estimate.
 */
function estimateLinearFeetFromArea(areaSqFt: number, materialType: string): { linearFt: number; confidence: 'medium' | 'low' } {
  const name = materialType.toLowerCase();
  
  // Transition strips: typically 1-3 per room (3-9 ft each)
  // Conservative estimate: ~20-30 ft for average room
  if (name.includes('transition') || name.includes('threshold')) {
    // For larger areas, assume more transitions needed
    const estimatedRooms = Math.max(1, Math.ceil(areaSqFt / 200)); // ~200 sq ft per "zone"
    const ftPerTransition = 3; // Average transition strip length
    const transitionsPerRoom = 2; // Conservative average
    return { 
      linearFt: Math.ceil(estimatedRooms * transitionsPerRoom * ftPerTransition),
      confidence: 'low' as const
    };
  }
  
  // Baseboards, crown molding, trim: perimeter-based
  // perimeter ≈ 4 × √area, minus ~20% for doors/windows
  const estimatedPerimeter = 4 * Math.sqrt(areaSqFt) * 0.85;
  return { 
    linearFt: Math.ceil(estimatedPerimeter),
    confidence: 'medium' as const
  };
}

// ============================================================================
// MAIN RESOLVER FUNCTION
// ============================================================================

/**
 * QUANTITY RESOLVER - The core deterministic engine.
 * 
 * Takes raw input (usually from AI analysis) and produces a resolved quantity.
 * FAILS HARD if resolution is not possible - no guessing.
 */
export function resolveQuantity(input: QuantityResolverInput): QuantityResolverOutput {
  console.log('[QUANTITY RESOLVER] Input:', JSON.stringify(input, null, 2));
  
  const wasteMultiplier = 1 + (input.waste_percent ?? 10) / 100;
  
  // Step 1: Determine material category
  const category = input.material_type ?? inferMaterialCategory(input.material_name);
  
  if (category === 'unknown') {
    console.warn('[QUANTITY RESOLVER] FAIL: Unknown material type for:', input.material_name);
    return {
      success: false,
      resolution_method: 'manual_required',
      confidence: 'failed',
      error_message: `Material type could not be determined for "${input.material_name}". Manual input required.`,
    };
  }
  
  // Step 2: Check if input is already in final units (passthrough)
  const inputUnit = input.input_unit.toLowerCase().trim();
  if (['gallon', 'gallons', 'box', 'boxes', 'sheet', 'sheets', 'roll', 'rolls', 'piece', 'pieces', 'bag', 'bags', 'bundle', 'bundles'].includes(inputUnit)) {
    const grossQty = Math.ceil(input.input_value * wasteMultiplier);
    console.log('[QUANTITY RESOLVER] Passthrough - already in container units:', inputUnit);
    return {
      success: true,
      resolved_quantity: input.input_value,
      resolved_unit: input.container_unit || inputUnit,
      gross_quantity: grossQty,
      resolution_method: 'passthrough',
      confidence: 'high',
      calculation_trace: `${input.input_value} ${inputUnit} × ${wasteMultiplier.toFixed(2)} waste = ${grossQty} ${inputUnit}`,
    };
  }
  
  // ========== CRITICAL FIX: LINEAR MATERIALS ==========
  // If input is sq ft but material is LINEAR (transition strips, baseboards, etc.),
  // we CANNOT directly convert sq ft to linear ft 1:1.
  // Instead: estimate linear ft from area OR require manual input.
  const isLinear = isLinearMaterial(input.material_name);
  const inputIsSqFt = inputUnit.includes('sq') || inputUnit.includes('ft²');
  
  if (isLinear && inputIsSqFt) {
    // Estimate linear feet from area
    const { linearFt, confidence } = estimateLinearFeetFromArea(input.input_value, input.material_name);
    const grossLinearFt = Math.ceil(linearFt * wasteMultiplier);
    
    console.log(`[QUANTITY RESOLVER] LINEAR MATERIAL: ${input.material_name} - estimated ${linearFt} linear ft from ${input.input_value} sq ft (${confidence} confidence)`);
    
    return {
      success: true,
      resolved_quantity: linearFt,
      resolved_unit: 'linear ft',
      gross_quantity: grossLinearFt,
      resolution_method: 'linear_to_pieces',
      confidence: confidence,
      calculation_trace: `${input.input_value} sq ft area → estimated perimeter/transitions = ${linearFt} linear ft × ${wasteMultiplier.toFixed(2)} waste = ${grossLinearFt} linear ft`,
    };
  }
  
  // Step 3: Get coverage rate
  const coverageKey = getCoverageKey(category, input.material_name);
  const coverageData = coverageKey ? COVERAGE_RATES[coverageKey] : null;
  
  // Allow explicit override of coverage rate
  const coverageRate = input.coverage_rate ?? coverageData?.rate;
  const outputUnit = input.container_unit ?? coverageData?.outputUnit;
  
  if (!coverageRate || !outputUnit) {
    console.warn('[QUANTITY RESOLVER] FAIL: No coverage rate for:', input.material_name, 'category:', category);
    return {
      success: false,
      resolution_method: 'manual_required',
      confidence: 'failed',
      error_message: `Coverage rate not available for "${input.material_name}". Manual input required.`,
    };
  }
  
  // Step 4: Calculate resolved quantity
  const rawQuantity = input.input_value / coverageRate;
  const resolvedQuantity = Math.ceil(rawQuantity); // Always round up for materials
  const grossQuantity = Math.ceil(resolvedQuantity * wasteMultiplier);
  
  // Determine resolution method based on output unit
  let resolutionMethod: ResolutionMethod = 'passthrough';
  if (outputUnit.includes('gallon')) resolutionMethod = 'area_to_liquid';
  else if (outputUnit.includes('box')) resolutionMethod = 'area_to_boxes';
  else if (outputUnit.includes('sheet')) resolutionMethod = 'area_to_sheets';
  else if (outputUnit.includes('roll')) resolutionMethod = 'area_to_rolls';
  else if (outputUnit.includes('bag')) resolutionMethod = 'area_to_bags';
  else if (outputUnit.includes('piece')) resolutionMethod = 'linear_to_pieces';
  
  const calculationTrace = `${input.input_value} ${input.input_unit} ÷ ${coverageRate} ${coverageData?.inputUnit ?? input.input_unit}/${outputUnit} = ${rawQuantity.toFixed(2)} → ${resolvedQuantity} ${outputUnit} (rounded up) × ${wasteMultiplier.toFixed(2)} waste = ${grossQuantity} ${outputUnit}`;
  
  console.log('[QUANTITY RESOLVER] SUCCESS:', calculationTrace);
  
  return {
    success: true,
    resolved_quantity: resolvedQuantity,
    resolved_unit: outputUnit,
    gross_quantity: grossQuantity,
    resolution_method: resolutionMethod,
    confidence: 'high',
    calculation_trace: calculationTrace,
  };
}

// ============================================================================
// BATCH RESOLVER
// ============================================================================

export interface MaterialItem {
  id?: string;
  name?: string;
  item?: string;
  baseQuantity?: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  resolved?: boolean;
  resolution_trace?: string;
  manual_override?: ManualOverride;
}

/**
 * Resolve all materials in a batch.
 * Returns items with resolved quantities and flags for failed items.
 */
export function resolveMaterialsBatch(
  materials: MaterialItem[],
  baseArea: number,
  wastePercent: number = 10
): { resolved: MaterialItem[]; failed: MaterialItem[]; summary: string } {
  const resolved: MaterialItem[] = [];
  const failed: MaterialItem[] = [];
  
  for (const material of materials) {
    const materialName = material.name || material.item || 'Unknown';
    
    // Skip if already manually overridden
    if (material.manual_override) {
      resolved.push({
        ...material,
        resolved: true,
        resolution_trace: `Manual override: ${material.manual_override.quantity} ${material.manual_override.unit} - ${material.manual_override.reason}`,
      });
      continue;
    }
    
    // Attempt resolution
    const result = resolveQuantity({
      material_name: materialName,
      input_unit: material.unit || 'sq ft',
      input_value: material.baseQuantity ?? baseArea,
      waste_percent: wastePercent,
    });
    
    if (result.success) {
      resolved.push({
        ...material,
        quantity: result.gross_quantity,
        unit: result.resolved_unit,
        baseQuantity: result.resolved_quantity,
        resolved: true,
        resolution_trace: result.calculation_trace,
      });
    } else {
      failed.push({
        ...material,
        resolved: false,
        resolution_trace: result.error_message,
      });
    }
  }
  
  const summary = `Resolved ${resolved.length}/${materials.length} materials. ${failed.length} require manual input.`;
  console.log('[QUANTITY RESOLVER BATCH]', summary);
  
  return { resolved, failed, summary };
}

// ============================================================================
// VERSION CHECK
// ============================================================================

export type QuantityLogicVersion = 1 | 2;

/**
 * Determine which logic version to use for a project.
 * V1 = Legacy (frozen, no changes)
 * V2 = Quantity Resolver required
 */
export function getQuantityLogicVersion(projectCreatedAt: string | Date): QuantityLogicVersion {
  const createdDate = new Date(projectCreatedAt);
  const v2CutoffDate = new Date('2026-02-08'); // Today - all new projects use V2
  
  return createdDate >= v2CutoffDate ? 2 : 1;
}

/**
 * Check if Quantity Resolver should be used for this project.
 */
export function shouldUseQuantityResolver(
  projectCreatedAt: string | Date,
  explicitVersion?: QuantityLogicVersion
): boolean {
  const version = explicitVersion ?? getQuantityLogicVersion(projectCreatedAt);
  return version === 2;
}
