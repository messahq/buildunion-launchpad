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
import { resolveQuantity, type QuantityResolverInput, inferMaterialCategory } from "@/lib/quantityResolver";

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
  taskBudget?: number; // Sum of all task budgets from Supabase
  pendingChange?: {
    status: string;
    proposedGrandTotal: number;
    submittedByName?: string;
  } | null; // Pending budget change awaiting approval
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
  "hardwood flooring": 6.50,
  "underlayment": 0.35,
  "baseboard trim": 1.25,
  "transition strips": 12.00,
  // Painting
  "primer": 38.00,
  "paint": 55.00,
  "painter's tape": 7.50,
  // Drywall
  "drywall sheets": 18.00,
  "joint compound": 22.00,
  "drywall tape": 5.50,
  // General fallback
  "default": 10.00,
};

// Essential material patterns that need Quantity Resolver
const ESSENTIAL_PATTERNS = [
  /laminate|flooring/i,
  /underlayment/i,
  /baseboard|trim|transition|threshold/i,
  /adhesive|glue|supplies/i,
  /paint|primer/i,
  /drywall|gypsum/i,
  /tile|ceramic/i,
  /carpet/i,
];

const isEssentialMaterial = (itemName: string): boolean => {
  return ESSENTIAL_PATTERNS.some(pattern => pattern.test(itemName));
};

/**
 * Enrich AI-detected materials with template-based unit prices
 * AND apply Quantity Resolver for proper unit conversion!
 * 
 * CRITICAL FIX (2026-02-08): This function now applies the same Quantity Resolver
 * logic that MaterialCalculationTab uses, ensuring Budget Overview shows
 * the same calculated quantities (boxes, rolls, gallons) instead of raw sq ft.
 */
function enrichMaterialsWithPrices(
  materials: MaterialItem[],
  workType: string | null,
  confirmedArea: number | null,
  wastePercent: number = 10
): MaterialItem[] {
  // ============ CRITICAL FIX (2026-02-08): INFER baseArea FROM MATERIALS ============
  // This mirrors MaterialCalculationTab logic to ensure Budget Overview
  // shows the same calculated quantities as the Materials tab.
  
  let authorityBaseArea = confirmedArea ?? 0;
  
  if (!authorityBaseArea || authorityBaseArea <= 0) {
    // Find the largest sq ft quantity from materials - this is our base area
    let maxSqFtQty = 0;
    for (const m of materials) {
      const unit = (m.unit || '').toLowerCase();
      const isSqFtUnit = unit.includes('sq') || unit.includes('ft²');
      if (isSqFtUnit && m.quantity > maxSqFtQty) {
        maxSqFtQty = m.quantity;
      }
    }
    if (maxSqFtQty > 0) {
      authorityBaseArea = maxSqFtQty;
      console.log(`[BUDGET SYNC] Inferred baseArea: ${authorityBaseArea} sq ft`);
    }
  }
  
  // Try to get template prices
  const workTypeId = workType?.toLowerCase() as WorkTypeId | undefined;
  const template = workTypeId ? getTemplateByWorkType(workTypeId) : null;
  
  return materials.map((material, index) => {
    const itemLower = material.item.toLowerCase();
    const isEssential = isEssentialMaterial(material.item);
    
    // ============ APPLY QUANTITY RESOLVER ============
    // For essential materials with sq ft units, convert to proper units (boxes, rolls, etc.)
    let finalQuantity = material.quantity;
    let finalUnit = material.unit;
    // Note: MaterialItem doesn't have baseQuantity, so we track it locally
    let finalBaseQty = material.quantity;
    
    const isSqFtUnit = (material.unit || '').toLowerCase().includes('sq') || 
                       (material.unit || '').toLowerCase().includes('ft²');
    
    if (isEssential && isSqFtUnit && authorityBaseArea > 0) {
      // Run Quantity Resolver for physics-based calculation
      const resolverInput: QuantityResolverInput = {
        material_name: material.item,
        input_unit: 'sq ft',
        input_value: authorityBaseArea,
        waste_percent: wastePercent,
      };
      
      const resolved = resolveQuantity(resolverInput);
      
      if (resolved.success && resolved.gross_quantity && resolved.resolved_unit) {
        // ✅ RESOLVER SUCCEEDED: Use calculated values
        finalQuantity = resolved.gross_quantity;
        finalUnit = resolved.resolved_unit;
        finalBaseQty = resolved.resolved_quantity ?? authorityBaseArea;
        console.log(`[BUDGET SYNC RESOLVER] ${material.item}: ${resolved.calculation_trace}`);
      }
    }
    
    // ============ DETERMINE UNIT PRICE ============
    let unitPrice = material.unitPrice || 0;
    
    // Skip price enrichment if already has valid prices with resolved quantities
    if (material.unitPrice && material.unitPrice > 0 && material.totalPrice && material.totalPrice > 0) {
      // Already has valid prices - recalculate total with new resolved quantity
      const totalPrice = finalQuantity * material.unitPrice;
      return {
        ...material,
        quantity: finalQuantity,
        unit: finalUnit,
        totalPrice,
      } as MaterialItem;
    }
    
    // First try template match
    if (template) {
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
    
    // Final fallback based on resolved unit type
    if (unitPrice === 0) {
      const unitLower = (finalUnit || '').toLowerCase();
      if (unitLower.includes('box')) {
        unitPrice = 55.00; // Per box flooring average
      } else if (unitLower.includes('roll')) {
        unitPrice = 35.00; // Per roll underlayment average
      } else if (unitLower.includes('gallon')) {
        unitPrice = 45.00; // Per gallon paint average
      } else if (unitLower === 'sq ft') {
        unitPrice = 2.50; // Generic per sq ft
      } else if (unitLower.includes('linear')) {
        unitPrice = 12.00; // Generic per linear ft
      } else {
        unitPrice = DEFAULT_UNIT_PRICES.default;
      }
    }
    
    const totalPrice = finalQuantity * unitPrice;
    
    console.log(`[BUDGET SYNC] ${material.item}: ${finalQuantity} ${finalUnit} × $${unitPrice} = $${totalPrice.toFixed(2)}`);
    
    return {
      ...material,
      quantity: finalQuantity,
      unit: finalUnit,
      unitPrice,
      totalPrice,
      citationSource: material.citationSource || "template_preset",
      citationId: material.citationId || `[TMPL-${String(index + 1).padStart(3, '0')}]`,
    } as MaterialItem;
  });
}

export function useDashboardFinancialSync() {
  const { state, actions } = useProjectContext();
  const { centralMaterials, centralFinancials, operationalTruth, page1, page4, sync, projectId } = state;

  // ====== FETCH BUDGET DATA FROM DATABASE ======
  // Read ai_workflow_config.grandTotal + line_items for approved amounts
  // Also fetch task totals using aggregation
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["dashboard-budget-sync", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config, total_cost, labor_cost, material_cost, line_items")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 3000, // Refresh every 3 seconds for real-time sync
  });

  // Fetch task budget totals from Supabase
  const { data: taskTotals } = useQuery({
    queryKey: ["task-budget-totals", projectId],
    queryFn: async () => {
      if (!projectId) return { totalBudget: 0, taskCount: 0 };
      
      const { data, error } = await supabase
        .from("project_tasks")
        .select("total_cost, unit_price, quantity")
        .eq("project_id", projectId)
        .is("archived_at", null);
      
      if (error) throw error;
      
      // Calculate sum manually (Supabase JS doesn't support aggregate functions)
      const totalBudget = (data || []).reduce((sum, task) => {
        const taskCost = task.total_cost || (task.unit_price || 0) * (task.quantity || 1);
        return sum + taskCost;
      }, 0);
      
      return { totalBudget, taskCount: data?.length || 0 };
    },
    enabled: !!projectId,
    staleTime: 3000,
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

  // Extract pending change for display
  const pendingChange = useMemo(() => {
    const aiConfig = summaryData?.ai_workflow_config as {
      pendingBudgetChange?: {
        status: string;
        proposedGrandTotal: number;
        submittedByName?: string;
      };
    } | null;
    
    const pending = aiConfig?.pendingBudgetChange;
    if (!pending || pending.status !== "pending") return null;
    return pending;
  }, [summaryData]);

  // Calculate actuals from line_items stored in Supabase
  // IRON LAW: USE SAVED totalPrice DIRECTLY - NO RECALCULATION!
  // The Materials tab already saves GROSS values, trust the database!
  const supabaseTotals = useMemo(() => {
    const lineItems = summaryData?.line_items as {
      materials?: Array<{ 
        totalPrice?: number; 
        total?: number; 
        item?: string; 
        name?: string;
      }>;
      labor?: Array<{ totalPrice?: number; total?: number }>;
      other?: Array<{ totalPrice?: number; total?: number }>;
    } | null;

    // ===== ZERO TOLERANCE: USE SAVED GROSS VALUES DIRECTLY =====
    // The Materials tab saves totalPrice as GROSS (with waste already applied)
    // DO NOT recalculate - just SUM the stored values!
    const materialCost = (lineItems?.materials || []).reduce((sum, item) => {
      // Direct read from database - this IS the GROSS value
      let price = item.totalPrice ?? item.total ?? 0;
      
      // Heuristic: convert cents to dollars if needed (legacy data)
      if (price > 10000 && price % 100 === 0) price /= 100;
      
      console.log(`[DIRECT-SYNC] ${item.item || item.name}: totalPrice(GROSS)=$${price}`);
      
      return sum + price;
    }, 0);

    // Sum labor (direct read)
    const laborCost = (lineItems?.labor || []).reduce((sum, item) => {
      let price = item.totalPrice ?? item.total ?? 0;
      if (price > 10000 && price % 100 === 0) price /= 100;
      return sum + price;
    }, 0);

    // Sum other (direct read)
    const otherCost = (lineItems?.other || []).reduce((sum, item) => {
      let price = item.totalPrice ?? item.total ?? 0;
      if (price > 10000 && price % 100 === 0) price /= 100;
      return sum + price;
    }, 0);

    console.log(`[DIRECT-SYNC TOTALS] Materials(GROSS from DB): $${materialCost.toFixed(2)}, Labor: $${laborCost.toFixed(2)}, Other: $${otherCost.toFixed(2)}`);

    return { materialCost, laborCost, otherCost };
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
        operationalTruth.confirmedArea.value,
        10 // Default 10% waste
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

  // Enrich materials for display (always apply Quantity Resolver!)
  // CRITICAL FIX: This now uses the same resolver as MaterialCalculationTab
  const effectiveMaterials = useMemo(() => {
    return enrichMaterialsWithPrices(
      centralMaterials.items,
      page1.workType,
      operationalTruth.confirmedArea.value,
      10 // Default 10% waste - synced with MaterialCalculationTab
    );
  }, [centralMaterials.items, page1.workType, operationalTruth.confirmedArea.value]);

  // Calculate financial summary from SUPABASE data (priority) or CENTRAL as fallback
  const financialSummary = useMemo((): FinancialSummary => {
    // PRIORITY: Use Supabase line_items totals if available
    // This ensures team members see the same data as the owner
    const hasSuapabaseData = supabaseTotals.materialCost > 0 || supabaseTotals.laborCost > 0 || supabaseTotals.otherCost > 0;
    
    const materialCost = hasSuapabaseData 
      ? supabaseTotals.materialCost 
      : effectiveMaterials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    
    const laborCost = hasSuapabaseData 
      ? supabaseTotals.laborCost 
      : (centralFinancials.laborCost || 0);
    
    const otherCost = hasSuapabaseData 
      ? supabaseTotals.otherCost 
      : (centralFinancials.otherCost || 0);
    
    const subtotal = materialCost + laborCost + otherCost;
    const taxRate = centralFinancials.taxRate || 0.13;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    // Include task budget from Supabase for team projects
    const taskBudget = taskTotals?.totalBudget || 0;

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
      taskBudget, // Task budget from Supabase
      pendingChange, // Pending change info for display
    };
  }, [effectiveMaterials, centralFinancials, centralMaterials.lastUpdatedAt, approvedGrandTotal, supabaseTotals, taskTotals, pendingChange]);

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
