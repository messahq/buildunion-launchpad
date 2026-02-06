// ============================================
// DASHBOARD FINANCIAL SYNC HOOK
// Reads from ProjectContext.centralMaterials & centralFinancials
// Dashboard's single source of truth
// Synced with ai_workflow_config for approved budget
// ============================================

import { useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MaterialItem, CitationSource, CentralMaterials } from "@/contexts/ProjectContext.types";
import { 
  WORK_TYPE_TEMPLATES, 
  WorkTypeId,
  getTemplateByWorkType,
  calculateTemplateEstimate,
} from "@/lib/workTypeTemplates";

export interface FinancialSummary {
  materialCost: number;
  laborCost: number;
  otherCost: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  approvedGrandTotal: number | null; // From ai_workflow_config after approval
  isDraft: boolean;
  lastModified: string | null;
}

export interface MaterialWithCitation extends MaterialItem {
  citationBadge: {
    label: string;
    className: string;
    shortLabel: string;
  };
}

// Citation badge styling map
const CITATION_BADGES: Record<CitationSource, { label: string; className: string; shortLabel: string }> = {
  ai_photo: { label: "AI Photo Analysis", className: "bg-blue-100 text-blue-700 border-blue-200", shortLabel: "AI" },
  ai_blueprint: { label: "Blueprint Extraction", className: "bg-purple-100 text-purple-700 border-purple-200", shortLabel: "BP" },
  template_preset: { label: "Template Preset", className: "bg-violet-100 text-violet-700 border-violet-200", shortLabel: "TPL" },
  manual_override: { label: "Manual Override", className: "bg-amber-100 text-amber-700 border-amber-200", shortLabel: "EDIT" },
  calculator: { label: "Calculator", className: "bg-green-100 text-green-700 border-green-200", shortLabel: "CALC" },
  imported: { label: "Imported", className: "bg-gray-100 text-gray-700 border-gray-200", shortLabel: "IMP" },
};

// Default unit prices for common materials (Toronto 2024)
const DEFAULT_UNIT_PRICES: Record<string, number> = {
  // Flooring
  "laminate flooring": 2.85,
  "laminate": 2.85,
  "hardwood flooring": 6.50,
  "hardwood": 6.50,
  "vinyl flooring": 3.50,
  "vinyl": 3.50,
  "tile": 4.00,
  "ceramic tile": 4.00,
  "underlayment": 0.35,
  "vapor barrier": 0.25,
  "baseboard trim": 1.25,
  "baseboard": 1.25,
  "transition strips": 12.00,
  "transition": 12.00,
  "threshold": 15.00,
  // Adhesives & Fasteners
  "adhesive": 8.00,
  "fastener": 12.00,
  "screw": 8.00,
  "nail": 6.00,
  // Painting
  "primer": 38.00,
  "paint": 55.00,
  "painter's tape": 7.50,
  "drop cloth": 15.00,
  "sandpaper": 8.00,
  "caulk": 6.00,
  "filler": 12.00,
  // Drywall
  "drywall sheets": 18.00,
  "drywall": 18.00,
  "joint compound": 22.00,
  "drywall tape": 5.50,
  // Roofing
  "shingle": 45.00,
  "roofing": 2.50,
  "flashing": 8.00,
  // Plumbing
  "pipe": 3.50,
  "fitting": 5.00,
  "valve": 25.00,
  // Electrical
  "wire": 0.75,
  "outlet": 8.00,
  "switch": 6.00,
  "breaker": 35.00,
  // General fallback
  "default": 10.00,
};

/**
 * Enrich ALL materials with template-based unit prices
 * ALWAYS calculates totalPrice to ensure budget displays correctly
 */
function enrichMaterialsWithPrices(
  materials: MaterialItem[],
  workType: string | null,
  confirmedArea: number | null
): MaterialItem[] {
  // Try to get template prices
  const workTypeId = workType?.toLowerCase() as WorkTypeId | undefined;
  const template = workTypeId ? getTemplateByWorkType(workTypeId) : null;
  
  return materials.map((material, index) => {
    const itemLower = material.item.toLowerCase();
    let unitPrice = material.unitPrice || 0;
    
    // ALWAYS try to enrich if unitPrice is 0 or totalPrice is missing/0
    const needsEnrichment = unitPrice === 0 || !material.totalPrice || material.totalPrice === 0;
    
    if (needsEnrichment) {
      // First try template match
      if (template && unitPrice === 0) {
        const templateMatch = template.materials.find(tm => 
          itemLower.includes(tm.item.toLowerCase().split(' ')[0]) ||
          tm.item.toLowerCase().includes(itemLower.split(' ')[0])
        );
        if (templateMatch) {
          unitPrice = templateMatch.unitPrice;
        }
      }
      
      // Fallback to default prices
      if (unitPrice === 0) {
        for (const [key, price] of Object.entries(DEFAULT_UNIT_PRICES)) {
          if (itemLower.includes(key)) {
            unitPrice = price;
            break;
          }
        }
      }
      
      // Extended fallback - check partial matches
      if (unitPrice === 0) {
        const firstWord = itemLower.split(/[\s/,]+/)[0];
        for (const [key, price] of Object.entries(DEFAULT_UNIT_PRICES)) {
          if (key.includes(firstWord) || firstWord.includes(key.split(' ')[0])) {
            unitPrice = price;
            break;
          }
        }
      }
      
      // Final fallback based on unit type
      if (unitPrice === 0) {
        const unitLower = (material.unit || "").toLowerCase();
        if (unitLower.includes("sq") || unitLower.includes("ft²") || unitLower.includes("m²")) {
          unitPrice = 2.50; // Generic per sq ft/m²
        } else if (unitLower.includes("ft") || unitLower.includes("linear") || unitLower.includes("m")) {
          unitPrice = 1.50; // Generic per linear ft/m
        } else if (unitLower.includes("gal") || unitLower.includes("l")) {
          unitPrice = 45.00; // Generic per gallon/liter
        } else if (unitLower.includes("roll") || unitLower.includes("pack")) {
          unitPrice = 15.00; // Generic per roll/pack
        } else if (unitLower.includes("tube") || unitLower.includes("box")) {
          unitPrice = 8.00; // Generic per tube/box
        } else if (unitLower.includes("pc") || unitLower.includes("unit") || unitLower === "") {
          unitPrice = 12.00; // Generic per piece
        } else {
          unitPrice = DEFAULT_UNIT_PRICES.default;
        }
      }
    }
    
    // ALWAYS calculate totalPrice
    const quantity = material.quantity || 0;
    const totalPrice = quantity * unitPrice;
    
    return {
      ...material,
      unitPrice,
      totalPrice,
      citationSource: material.citationSource || "template_preset",
      citationId: material.citationId || `[TMPL-${String(index + 1).padStart(3, '0')}]`,
    };
  });
}

export function useDashboardFinancialSync() {
  const { state, actions } = useProjectContext();
  const { centralMaterials, centralFinancials, operationalTruth, page1, page4, sync, projectId } = state;

  // ====== FETCH APPROVED BUDGET FROM DATABASE ======
  // Read ai_workflow_config.grandTotal to show approved amounts
  const { data: summaryData } = useQuery({
    queryKey: ["dashboard-budget-sync", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config, total_cost")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 5000, // Refresh every 5 seconds
  });

  // Extract approved grand total from ai_workflow_config
  const approvedGrandTotal = useMemo(() => {
    const aiConfig = summaryData?.ai_workflow_config as {
      grandTotal?: number;
      budgetVersion?: string;
    } | null;
    
    // Return the approved grand total from ai_workflow_config if it exists
    return aiConfig?.grandTotal || null;
  }, [summaryData]);

  // ====== AUTO-SYNC from Operational Truth to Central ======
  // If centralMaterials is empty but OT has data, populate central
  useEffect(() => {
    const otMaterials = operationalTruth.materials.items;
    const centralItems = centralMaterials.items;
    
    // Sync required if: central is empty but OT has data, OR central has no prices
    const needsSync = (
      (centralItems.length === 0 && otMaterials.length > 0) ||
      (centralItems.length > 0 && centralItems.every(m => !m.totalPrice || m.totalPrice === 0))
    );
    
    if (needsSync) {
      const sourceMaterials = centralItems.length > 0 ? centralItems : otMaterials;
      const enrichedMaterials = enrichMaterialsWithPrices(
        sourceMaterials,
        page1.workType,
        operationalTruth.confirmedArea.value
      );
      
      // Write to CENTRAL (not page2)
      actions.setCentralMaterials(enrichedMaterials, "ai_analysis");
      
      // IMPORTANT: Only set laborCost from template if there's no existing laborCost
      // This prevents overwriting saved labor values
      if (!centralFinancials.laborCost || centralFinancials.laborCost === 0) {
        const workTypeId = page1.workType?.toLowerCase() as WorkTypeId | undefined;
        const template = workTypeId ? getTemplateByWorkType(workTypeId) : null;
        const templateLaborCost = template ? calculateTemplateEstimate(template).laborCost : 0;
        if (templateLaborCost > 0) {
          actions.setCentralFinancials({ laborCost: templateLaborCost });
        }
      }
    }
  }, [
    operationalTruth.materials.items,
    centralMaterials.items,
    centralFinancials.laborCost,
    page1.workType,
    operationalTruth.confirmedArea.value,
    actions,
  ]);

  // Enrich materials for display (always apply to ensure prices)
  const effectiveMaterials = useMemo(() => {
    return enrichMaterialsWithPrices(
      centralMaterials.items,
      page1.workType,
      operationalTruth.confirmedArea.value
    );
  }, [centralMaterials.items, page1.workType, operationalTruth.confirmedArea.value]);

  // Calculate financial summary from CENTRAL data + approved budget from DB
  const financialSummary = useMemo((): FinancialSummary => {
    const materialCost = effectiveMaterials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    const laborCost = centralFinancials.laborCost || 0;
    const otherCost = centralFinancials.otherCost || 0;
    const subtotal = materialCost + laborCost + otherCost;
    const taxRate = centralFinancials.taxRate || 0.13;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    return {
      materialCost,
      laborCost,
      otherCost,
      subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      approvedGrandTotal, // From ai_workflow_config after owner approval
      isDraft: centralFinancials.isDraft, // From central financials
      lastModified: centralMaterials.lastUpdatedAt,
    };
  }, [effectiveMaterials, centralFinancials, centralMaterials.lastUpdatedAt, approvedGrandTotal]);

  // Get materials with citation badges for Dashboard display
  const materialsWithCitations = useMemo((): MaterialWithCitation[] => {
    return effectiveMaterials.map(material => ({
      ...material,
      citationBadge: CITATION_BADGES[material.citationSource] || CITATION_BADGES.template_preset,
    }));
  }, [effectiveMaterials]);

  // Update a single material from Dashboard (writes to CENTRAL)
  const updateMaterialFromDashboard = useCallback((
    materialId: string,
    field: "quantity" | "unitPrice" | "item",
    newValue: string | number
  ) => {
    const material = centralMaterials.items.find(m => m.id === materialId);
    if (!material) return;

    const updates: Partial<MaterialItem> = {
      [field]: newValue,
    };

    // Recalculate total if quantity or price changed
    if (field === "quantity" || field === "unitPrice") {
      const qty = field === "quantity" ? (newValue as number) : material.quantity;
      const price = field === "unitPrice" ? (newValue as number) : (material.unitPrice || 0);
      updates.totalPrice = qty * price;
    }

    actions.updateCentralMaterial(materialId, updates);
  }, [centralMaterials.items, actions]);

  // Add new material from Dashboard
  const addMaterialFromDashboard = useCallback((
    item: string,
    quantity: number,
    unit: string,
    unitPrice: number = 0
  ) => {
    const newMaterial = actions.addCentralMaterial({
      item,
      quantity,
      unit,
      unitPrice,
      totalPrice: quantity * unitPrice,
      source: "manual" as const,
      citationSource: "manual_override" as CitationSource,
      isEssential: false,
    });
    return newMaterial;
  }, [actions]);

  // Remove material from Dashboard
  const removeMaterialFromDashboard = useCallback((materialId: string) => {
    actions.removeCentralMaterial(materialId);
  }, [actions]);

  // Finalize project (lock all data)
  const finalizeProject = useCallback(async () => {
    actions.setCentralFinancials({ isDraft: false });
    actions.setPage4Data({ contractorSigned: true });
    await actions.syncToDatabase();
    return true;
  }, [actions]);

  // Get citation summary stats
  const citationStats = useMemo(() => {
    const stats: Record<CitationSource, number> = {
      ai_photo: 0,
      ai_blueprint: 0,
      template_preset: 0,
      manual_override: 0,
      calculator: 0,
      imported: 0,
    };

    effectiveMaterials.forEach(m => {
      if (m.citationSource) {
        stats[m.citationSource]++;
      }
    });

    return Object.entries(stats)
      .filter(([_, count]) => count > 0)
      .map(([source, count]) => ({
        source: source as CitationSource,
        count,
        ...CITATION_BADGES[source as CitationSource],
      }));
  }, [effectiveMaterials]);

  return {
    // Financial data (from CENTRAL)
    financialSummary,
    
    // Materials with badges
    materialsWithCitations,
    materialCount: effectiveMaterials.length,
    
    // Actions (write to CENTRAL)
    updateMaterialFromDashboard,
    addMaterialFromDashboard,
    removeMaterialFromDashboard,
    finalizeProject,
    
    // Stats
    citationStats,
    isDraft: centralFinancials.isDraft,
    hasManualOverrides: centralMaterials.hasManualOverrides,
    
    // Badge helper
    getCitationBadge: (source: CitationSource) => CITATION_BADGES[source] || CITATION_BADGES.template_preset,
    
    // Force refresh for debugging
    forceRefresh: () => {
      const enriched = enrichMaterialsWithPrices(
        centralMaterials.items.length > 0 ? centralMaterials.items : operationalTruth.materials.items,
        page1.workType,
        operationalTruth.confirmedArea.value
      );
      actions.setCentralMaterials(enriched, "merged");
    },
  };
}

export default useDashboardFinancialSync;
