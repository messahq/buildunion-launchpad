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

/**
 * Enrich AI-detected materials with template-based unit prices
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
    // Skip if already has valid unitPrice
    if (material.unitPrice && material.unitPrice > 0 && material.totalPrice && material.totalPrice > 0) {
      return material;
    }
    
    // Try to find matching template material
    const itemLower = material.item.toLowerCase();
    let unitPrice = material.unitPrice || 0;
    
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
    
    // Final fallback based on unit type
    if (unitPrice === 0) {
      if (material.unit === "sq ft") {
        unitPrice = 2.50; // Generic per sq ft
      } else if (material.unit === "ft") {
        unitPrice = 1.50; // Generic per linear ft
      } else if (material.unit === "gal") {
        unitPrice = 45.00; // Generic per gallon
      } else {
        unitPrice = DEFAULT_UNIT_PRICES.default;
      }
    }
    
    const totalPrice = material.quantity * unitPrice;
    
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
  // IRON LAW: Materials MUST use GROSS (with waste) totals
  const supabaseTotals = useMemo(() => {
    const lineItems = summaryData?.line_items as {
      materials?: Array<{ 
        totalPrice?: number; 
        total?: number; 
        item?: string; 
        name?: string;
        quantity?: number;
        baseQuantity?: number;
        unitPrice?: number;
        isEssential?: boolean;
      }>;
      labor?: Array<{ totalPrice?: number; total?: number }>;
      other?: Array<{ totalPrice?: number; total?: number }>;
    } | null;

    // Get waste percent from ai_workflow_config or default to 10%
    const aiConfig = summaryData?.ai_workflow_config as { userEdits?: { wastePercent?: number } } | null;
    const wastePercent = aiConfig?.userEdits?.wastePercent ?? 10;

    // IRON LAW #1: Materials Total = GROSS (with waste) × unitPrice
    // For essential materials, we MUST apply waste to get the GROSS amount
    const materialCost = (lineItems?.materials || []).reduce((sum, item) => {
      // Get the base values
      const baseQty = item.baseQuantity ?? item.quantity ?? 0;
      const unitPrice = item.unitPrice ?? 0;
      const isEssential = item.isEssential !== false; // Default to essential if not specified
      
      // Calculate GROSS quantity with waste for essential materials
      const grossQty = isEssential 
        ? Math.ceil(baseQty * (1 + wastePercent / 100))
        : baseQty;
      
      // Calculate GROSS total price
      const grossTotalPrice = grossQty * unitPrice;
      
      // Use the dynamically calculated GROSS price if we have unitPrice
      // Otherwise fall back to stored totalPrice (which should already be GROSS)
      let price = unitPrice > 0 ? grossTotalPrice : (item.totalPrice ?? item.total ?? 0);
      
      // Heuristic: convert cents to dollars if needed
      if (price > 100 && price % 100 === 0) price /= 100;
      
      console.log(`[GROSS-SYNC] ${item.item || item.name}: baseQty=${baseQty}, grossQty=${grossQty}, unitPrice=${unitPrice}, grossTotal=${price}`);
      
      return sum + price;
    }, 0);

    // Sum labor (no waste applied)
    const laborCost = (lineItems?.labor || []).reduce((sum, item) => {
      let price = item.totalPrice ?? item.total ?? 0;
      if (price > 100 && price % 100 === 0) price /= 100;
      return sum + price;
    }, 0);

    // Sum other (no waste applied)
    const otherCost = (lineItems?.other || []).reduce((sum, item) => {
      let price = item.totalPrice ?? item.total ?? 0;
      if (price > 100 && price % 100 === 0) price /= 100;
      return sum + price;
    }, 0);

    console.log(`[GROSS-SYNC TOTALS] Materials(GROSS): $${materialCost.toFixed(2)}, Labor: $${laborCost.toFixed(2)}, Other: $${otherCost.toFixed(2)}`);

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
