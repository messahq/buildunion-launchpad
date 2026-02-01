// ============================================
// DASHBOARD FINANCIAL SYNC HOOK
// Bridges Page 2 materials to Dashboard Budget
// ============================================

import { useMemo, useCallback } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MaterialItem, CitationSource } from "@/contexts/ProjectContext.types";

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

export function useDashboardFinancialSync() {
  const { state, actions } = useProjectContext();
  const { page2, page3, sync } = state;

  // Calculate financial summary from Page 2 materials
  const financialSummary = useMemo((): FinancialSummary => {
    const materialCost = page2.materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
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
  }, [page2.materials, page2.estimatedLaborCost, page3, state.page4.contractorSigned, sync.lastSyncedAt]);

  // Get materials with citation badges for Dashboard display
  const materialsWithCitations = useMemo((): MaterialWithCitation[] => {
    return page2.materials.map(material => ({
      ...material,
      citationBadge: CITATION_BADGES[material.citationSource] || CITATION_BADGES.calculator,
    }));
  }, [page2.materials]);

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

    page2.materials.forEach(m => {
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
  }, [page2.materials]);

  return {
    // Financial data
    financialSummary,
    
    // Materials with badges
    materialsWithCitations,
    materialCount: page2.materials.length,
    
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
    getCitationBadge: (source: CitationSource) => CITATION_BADGES[source] || CITATION_BADGES.calculator,
  };
}

export default useDashboardFinancialSync;
