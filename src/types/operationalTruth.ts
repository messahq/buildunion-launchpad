// ============================================
// OPERATIONAL TRUTH - 8 PILLARS TYPE DEFINITIONS
// ============================================

// OBC Reference Detail Type
export interface OBCReference {
  code: string;
  title: string;
  relevance: "direct" | "related" | "informational";
  summary: string;
}

// OBC Validation Details
export interface OBCValidationDetails {
  status: "validated" | "warning" | "pending" | "clear" | "permit_required";
  permitRequired: boolean;
  permitType: "building" | "electrical" | "plumbing" | "hvac" | "none";
  inspectionRequired: boolean;
  estimatedPermitCost: number | null;
  complianceScore: number;
  references: OBCReference[];
  recommendations: string[];
  notes: string[];
}

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

  // OBC Validation Details (Pro+ feature)
  obcDetails?: OBCValidationDetails;

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
      permitType?: string;
      inspectionRequired?: boolean;
      estimatedPermitCost?: number | null;
      complianceScore?: number;
      // Accept flexible OBC reference format from API
      obcReferences?: Array<string | { code: string; title: string; relevance: string; summary: string }>;
      recommendations?: string[];
      regulatoryNotes?: string[];
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
  // Manual overrides
  obcAcknowledged?: boolean; // User clicked "I Understood" on OBC warning
}

// Helper function to normalize OBC references (handle both string and object formats)
function normalizeOBCReferences(refs?: Array<string | { code: string; title: string; relevance: string; summary: string }>): OBCReference[] {
  if (!refs || refs.length === 0) return [];
  
  return refs.map((ref, index) => {
    if (typeof ref === "string") {
      // Parse legacy string format like "OBC 9.10.14 - Structural Requirements"
      const match = ref.match(/^(OBC\s+[\d.]+)\s*[-–]\s*(.+)$/i);
      if (match) {
        return {
          code: match[1],
          title: match[2],
          relevance: "direct" as const,
          summary: match[2],
        };
      }
      return {
        code: `REF-${index + 1}`,
        title: ref,
        relevance: "informational" as const,
        summary: ref,
      };
    }
    // Normalize relevance to valid type
    const validRelevance = (["direct", "related", "informational"].includes(ref.relevance) 
      ? ref.relevance 
      : "informational") as "direct" | "related" | "informational";
    
    return {
      code: ref.code,
      title: ref.title,
      relevance: validRelevance,
      summary: ref.summary,
    };
  });
}

export function buildOperationalTruth(params: BuildOperationalTruthParams): OperationalTruth {
  const {
    aiAnalysis,
    blueprintAnalysis,
    dualEngineOutput,
    synthesisResult,
    filterAnswers,
    projectSize,
    obcAcknowledged,
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

  // OBC Compliance and Details
  // If user acknowledged OBC warnings, treat as "clear" for verification purposes
  let obcCompliance: OperationalTruth["obcCompliance"] = "pending";
  let obcDetails: OBCValidationDetails | undefined = undefined;
  
  if (obcAcknowledged) {
    // User acknowledged OBC - treat as verified/clear for the pillar
    obcCompliance = "clear";
  } else if (dualEngineOutput?.openai) {
    const openai = dualEngineOutput.openai;
    obcCompliance = openai.permitRequired ? "permit_required" : "clear";
    
    // Build detailed OBC validation info
    obcDetails = {
      status: openai.validationStatus as OBCValidationDetails["status"] || (openai.permitRequired ? "permit_required" : "clear"),
      permitRequired: openai.permitRequired || false,
      permitType: (openai.permitType as OBCValidationDetails["permitType"]) || "none",
      inspectionRequired: openai.inspectionRequired || false,
      estimatedPermitCost: openai.estimatedPermitCost || null,
      complianceScore: openai.complianceScore || 0,
      references: normalizeOBCReferences(openai.obcReferences),
      recommendations: openai.recommendations || [],
      notes: openai.regulatoryNotes || [],
    };
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
    obcDetails,
    verifiedPillars,
    totalPillars: 8,
    verificationRate,
  };
}
