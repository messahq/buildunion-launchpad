// ============================================
// DASHBOARD FINANCIAL SYNC HOOK
// Bridges Page 2 materials to Dashboard Budget
// Forces sync from Operational Truth + Templates
// ============================================

import { useMemo, useCallback, useEffect } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MaterialItem, CitationSource } from "@/contexts/ProjectContext.types";
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
  const { page2, page3, sync, operationalTruth, page1 } = state;

  // Force sync: If page2.materials is empty but operationalTruth has materials, inject them
  useEffect(() => {
    const otMaterials = operationalTruth.materials.items;
    const page2Materials = page2.materials;
    
    // Sync required if: page2 is empty but OT has data, OR page2 has data but no prices
    const needsSync = (
      (page2Materials.length === 0 && otMaterials.length > 0) ||
      (page2Materials.length > 0 && page2Materials.every(m => !m.totalPrice || m.totalPrice === 0))
    );
    
    if (needsSync) {
      const sourceMaterials = page2Materials.length > 0 ? page2Materials : otMaterials;
      const enrichedMaterials = enrichMaterialsWithPrices(
        sourceMaterials,
        page1.workType,
        operationalTruth.confirmedArea.value
      );
      
      // Get estimated labor from template
      const workTypeId = page1.workType?.toLowerCase() as WorkTypeId | undefined;
      const template = workTypeId ? getTemplateByWorkType(workTypeId) : null;
      const laborCost = template ? calculateTemplateEstimate(template).laborCost : 0;
      
      actions.setPage2Data({
        materials: enrichedMaterials,
        estimatedLaborCost: laborCost || page2.estimatedLaborCost,
        lastModifiedSource: "template_preset",
      });
    }
  }, [
    operationalTruth.materials.items,
    page2.materials,
    page1.workType,
    operationalTruth.confirmedArea.value,
    actions,
  ]);

  // Effective materials with price enrichment (always apply for display)
  const effectiveMaterials = useMemo(() => {
    return enrichMaterialsWithPrices(
      page2.materials,
      page1.workType,
      operationalTruth.confirmedArea.value
    );
  }, [page2.materials, page1.workType, operationalTruth.confirmedArea.value]);

  // Calculate financial summary from enriched materials
  const financialSummary = useMemo((): FinancialSummary => {
    const materialCost = effectiveMaterials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    const laborCost = page2.estimatedLaborCost || page3.laborCost;
    const otherCost = page3.otherCost;
    const subtotal = materialCost + laborCost + otherCost;
    const taxRate = page3.taxRate || 0.13; // Default HST
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
      isDraft: !state.page4.contractorSigned, // Draft until finalized
      lastModified: sync.lastSyncedAt,
    };
  }, [effectiveMaterials, page2.estimatedLaborCost, page3, state.page4.contractorSigned, sync.lastSyncedAt]);

  // Get materials with citation badges for Dashboard display
  const materialsWithCitations = useMemo((): MaterialWithCitation[] => {
    return effectiveMaterials.map(material => ({
      ...material,
      citationBadge: CITATION_BADGES[material.citationSource] || CITATION_BADGES.template_preset,
    }));
  }, [effectiveMaterials]);

  // Update a single material from Dashboard (bidirectional sync)
  const updateMaterialFromDashboard = useCallback((
    materialId: string,
    field: "quantity" | "unitPrice" | "item",
    newValue: string | number
  ) => {
    const timestamp = new Date().toISOString();
    const material = page2.materials.find(m => m.id === materialId);
    
    if (!material) return;

    const updatedMaterials = page2.materials.map(m => {
      if (m.id !== materialId) return m;
      
      const updates: Partial<MaterialItem> = {
        [field]: newValue,
        source: "manual" as const,
        citationSource: "manual_override" as CitationSource,
        editedAt: timestamp,
        originalValue: m.originalValue ?? (field === "quantity" ? m.quantity : undefined),
      };

      // Recalculate total if quantity or price changed
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? (newValue as number) : m.quantity;
        const price = field === "unitPrice" ? (newValue as number) : (m.unitPrice || 0);
        updates.totalPrice = qty * price;
      }

      return { ...m, ...updates };
    });

    // Update citation registry with manual override entry
    const citationEntry = {
      id: `[MO-${Date.now()}]`,
      materialId,
      source: "manual_override" as CitationSource,
      timestamp,
      previousValue: typeof material[field] === "number" ? material[field] as number : undefined,
      newValue: typeof newValue === "number" ? newValue : undefined,
      field: field as "quantity" | "unitPrice" | "item",
    };

    actions.setPage2Data({
      materials: updatedMaterials,
      citationRegistry: [...page2.citationRegistry, citationEntry],
      lastModifiedSource: "manual_override",
    });

    // Mark as dirty for sync
    actions.markDirty("materials");
  }, [page2.materials, page2.citationRegistry, actions]);

  // Add new material from Dashboard
  const addMaterialFromDashboard = useCallback((
    item: string,
    quantity: number,
    unit: string,
    unitPrice: number = 0
  ) => {
    const timestamp = new Date().toISOString();
    const newMaterial: MaterialItem = {
      id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      item,
      quantity,
      unit,
      unitPrice,
      totalPrice: quantity * unitPrice,
      source: "manual" as const,
      citationSource: "manual_override" as CitationSource,
      citationId: `[MO-${page2.materials.length + 1}]`,
      isEssential: false,
    };

    const citationEntry = {
      id: newMaterial.citationId!,
      materialId: newMaterial.id,
      source: "manual_override" as CitationSource,
      timestamp,
      newValue: quantity,
      field: "added" as const,
    };

    actions.setPage2Data({
      materials: [...page2.materials, newMaterial],
      citationRegistry: [...page2.citationRegistry, citationEntry],
      lastModifiedSource: "manual_override",
    });

    actions.markDirty("materials");
    return newMaterial;
  }, [page2.materials, page2.citationRegistry, actions]);

  // Remove material from Dashboard
  const removeMaterialFromDashboard = useCallback((materialId: string) => {
    const timestamp = new Date().toISOString();
    const material = page2.materials.find(m => m.id === materialId);
    
    if (!material) return;

    const citationEntry = {
      id: `[MO-DEL-${Date.now()}]`,
      materialId,
      source: "manual_override" as CitationSource,
      timestamp,
      previousValue: material.quantity,
      field: "removed" as const,
    };

    actions.setPage2Data({
      materials: page2.materials.filter(m => m.id !== materialId),
      citationRegistry: [...page2.citationRegistry, citationEntry],
      lastModifiedSource: "manual_override",
    });

    actions.markDirty("materials");
  }, [page2.materials, page2.citationRegistry, actions]);

  // Finalize project (lock all data)
  const finalizeProject = useCallback(async () => {
    actions.setPage4Data({
      contractorSigned: true,
    });
    await actions.syncToDatabase();
    return true;
  }, [actions]);

  // Get citation summary stats from enriched materials
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
    // Financial data
    financialSummary,
    
    // Materials with badges (use enriched effectiveMaterials)
    materialsWithCitations,
    materialCount: effectiveMaterials.length,
    
    // Actions
    updateMaterialFromDashboard,
    addMaterialFromDashboard,
    removeMaterialFromDashboard,
    finalizeProject,
    
    // Stats
    citationStats,
    isDraft: financialSummary.isDraft,
    hasManualOverrides: citationStats.some(s => s.source === "manual_override"),
    
    // Badge helper
    getCitationBadge: (source: CitationSource) => CITATION_BADGES[source] || CITATION_BADGES.template_preset,
    
    // Force refresh for debugging
    forceRefresh: () => {
      const enriched = enrichMaterialsWithPrices(
        page2.materials.length > 0 ? page2.materials : operationalTruth.materials.items,
        page1.workType,
        operationalTruth.confirmedArea.value
      );
      actions.setPage2Data({ materials: enriched, lastModifiedSource: "template_preset" });
    },
  };
}

export default useDashboardFinancialSync;
