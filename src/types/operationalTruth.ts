// ============================================
// OPERATIONAL TRUTH - 8 PILLARS TYPE DEFINITIONS
// ============================================

export interface OperationalTruth {
  // 8 Pillars of Operational Truth
  confirmedArea: number | null;
  areaUnit: string;
  materialsCount: number;
  blueprintStatus: "analyzed" | "none" | "pending";
  obcCompliance: "clear" | "permit_required" | "pending";
  conflictStatus: "aligned" | "conflict_detected" | "pending";
  projectMode: "solo" | "team";
  projectSize: "small" | "medium" | "large";
  confidenceLevel: "high" | "medium" | "low";

  // Verification Metrics
  verifiedPillars: number;
  totalPillars: 8;
  verificationRate: number; // Percentage 0-100
}

// ============================================
// BUILD OPERATIONAL TRUTH FUNCTION
// ============================================

export interface BuildOperationalTruthParams {
  aiAnalysis?: {
    area: number | null;
    areaUnit: string;
    materials: Array<{ item: string; quantity: number; unit: string }>;
    hasBlueprint: boolean;
    confidence: string;
  };
  blueprintAnalysis?: {
    analyzed: boolean;
  };
  dualEngineOutput?: {
    openai?: {
      permitRequired: boolean;
      validationStatus: string;
    };
  };
  synthesisResult?: {
    conflicts: Array<unknown>;
    verificationStatus: string;
  };
  filterAnswers?: {
    workflowFilter?: {
      subcontractorCount?: string;
    };
    technicalFilter?: {
      affectsStructure?: boolean;
      affectsMechanical?: boolean;
    };
  };
  projectSize?: string;
}

export function buildOperationalTruth(params: BuildOperationalTruthParams): OperationalTruth {
  const {
    aiAnalysis,
    blueprintAnalysis,
    dualEngineOutput,
    synthesisResult,
    filterAnswers,
    projectSize,
  } = params;

  // Calculate confirmed area - prioritize direct area, then try to extract from materials
  let confirmedArea = aiAnalysis?.area || null;
  
  // If no direct area but we have materials with sq ft quantities, extract from first material
  if (confirmedArea === null && aiAnalysis?.materials?.length) {
    const areaBasedMaterial = aiAnalysis.materials.find(m => 
      m.unit?.toLowerCase().includes('sq ft') || 
      m.unit?.toLowerCase().includes('sq m') ||
      m.unit?.toLowerCase().includes('m²')
    );
    if (areaBasedMaterial && areaBasedMaterial.quantity > 0) {
      confirmedArea = areaBasedMaterial.quantity;
    }
  }
  
  const areaUnit = aiAnalysis?.areaUnit || "sq ft";
  const materialsCount = aiAnalysis?.materials?.length || 0;

  // Blueprint status
  let blueprintStatus: OperationalTruth["blueprintStatus"] = "pending";
  if (blueprintAnalysis?.analyzed || aiAnalysis?.hasBlueprint) {
    blueprintStatus = "analyzed";
  } else if (aiAnalysis && !aiAnalysis.hasBlueprint) {
    blueprintStatus = "none";
  }

  // OBC Compliance
  let obcCompliance: OperationalTruth["obcCompliance"] = "pending";
  if (dualEngineOutput?.openai) {
    obcCompliance = dualEngineOutput.openai.permitRequired ? "permit_required" : "clear";
  }

  // Conflict Status
  let conflictStatus: OperationalTruth["conflictStatus"] = "pending";
  if (synthesisResult) {
    conflictStatus = synthesisResult.conflicts?.length > 0 ? "conflict_detected" : "aligned";
  }

  // Project Mode (based on workflow filter)
  let projectMode: OperationalTruth["projectMode"] = "solo";
  if (filterAnswers?.workflowFilter) {
    const subCount = filterAnswers.workflowFilter.subcontractorCount;
    if (subCount && !["1-2", "none"].includes(subCount)) {
      projectMode = "team";
    }
    if (filterAnswers.technicalFilter?.affectsStructure || filterAnswers.technicalFilter?.affectsMechanical) {
      projectMode = "team";
    }
  }

  // Project Size
  let projectSizeValue: OperationalTruth["projectSize"] = "medium";
  if (projectSize === "small") projectSizeValue = "small";
  else if (projectSize === "large") projectSizeValue = "large";

  // Confidence Level
  let confidenceLevel: OperationalTruth["confidenceLevel"] = "low";
  const aiConfidence = aiAnalysis?.confidence?.toLowerCase();
  if (aiConfidence === "high") confidenceLevel = "high";
  else if (aiConfidence === "medium") confidenceLevel = "medium";

  // Calculate verified pillars
  let verifiedPillars = 0;
  if (confirmedArea !== null) verifiedPillars++;
  if (materialsCount > 0) verifiedPillars++;
  if (blueprintStatus !== "pending") verifiedPillars++;
  if (obcCompliance !== "pending") verifiedPillars++;
  if (conflictStatus !== "pending") verifiedPillars++;
  // Mode, Size, Confidence are always "verified" as they have defaults
  verifiedPillars += 3;

  const verificationRate = Math.round((verifiedPillars / 8) * 100);

  return {
    confirmedArea,
    areaUnit,
    materialsCount,
    blueprintStatus,
    obcCompliance,
    conflictStatus,
    projectMode,
    projectSize: projectSizeValue,
    confidenceLevel,
    verifiedPillars,
    totalPillars: 8,
    verificationRate,
  };
}
