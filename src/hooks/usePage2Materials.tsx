// ============================================
// PAGE 2 MATERIALS HOOK - Citation-Aware Management
// Bidirectional sync between Page 2 and Dashboard
// ============================================

import { useCallback, useMemo } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MaterialItem, CitationSource, CitationEntry } from "@/contexts/ProjectContext.types";

// Generate unique citation ID
function generateCitationId(source: CitationSource, index: number): string {
  const prefixes: Record<CitationSource, string> = {
    ai_photo: "P",
    ai_blueprint: "B",
    template_preset: "T",
    manual_override: "MO",
    calculator: "CALC",
    imported: "IMP",
  };
  const prefix = prefixes[source] || "MAT";
  return `[${prefix}-${String(index + 1).padStart(3, "0")}]`;
}

// Generate unique material ID
function generateMaterialId(): string {
  return `mat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function usePage2Materials() {
  const { state, actions } = useProjectContext();
  const { materials, citationRegistry, selectedTemplateId } = state.page2;

  // Load materials from template with citation tracking
  const loadFromTemplate = useCallback((templateMaterials: Array<{ item: string; quantity: number; unit: string; unitPrice?: number }>) => {
    const timestamp = new Date().toISOString();
    const newMaterials: MaterialItem[] = templateMaterials.map((mat, index) => ({
      id: generateMaterialId(),
      item: mat.item,
      quantity: mat.quantity,
      unit: mat.unit,
      unitPrice: mat.unitPrice || 0,
      totalPrice: (mat.unitPrice || 0) * mat.quantity,
      source: "template" as const,
      citationSource: "template_preset" as CitationSource,
      citationId: generateCitationId("template_preset", index),
      isEssential: true,
    }));

    const newCitations: CitationEntry[] = newMaterials.map((mat, index) => ({
      id: generateCitationId("template_preset", index),
      materialId: mat.id,
      source: "template_preset" as CitationSource,
      timestamp,
      newValue: mat.quantity,
      field: "added" as const,
    }));

    actions.setPage2Data({
      materials: newMaterials,
      citationRegistry: [...citationRegistry, ...newCitations],
      lastModifiedSource: "template_preset",
    });

    return newMaterials;
  }, [actions, citationRegistry]);

  // Load materials from calculator with citation tracking
  const loadFromCalculator = useCallback((calculatorMaterials: Array<{ item: string; quantity: number; unit: string }>) => {
    const timestamp = new Date().toISOString();
    const existingCount = materials.length;
    
    const newMaterials: MaterialItem[] = calculatorMaterials.map((mat, index) => ({
      id: generateMaterialId(),
      item: mat.item,
      quantity: mat.quantity,
      unit: mat.unit,
      unitPrice: 0,
      totalPrice: 0,
      source: "template" as const,
      citationSource: "calculator" as CitationSource,
      citationId: generateCitationId("calculator", existingCount + index),
      isEssential: true,
    }));

    const newCitations: CitationEntry[] = newMaterials.map((mat, index) => ({
      id: generateCitationId("calculator", existingCount + index),
      materialId: mat.id,
      source: "calculator" as CitationSource,
      timestamp,
      newValue: mat.quantity,
      field: "added" as const,
    }));

    // Merge with existing materials
    actions.setPage2Data({
      materials: [...materials, ...newMaterials],
      citationRegistry: [...citationRegistry, ...newCitations],
      lastModifiedSource: "calculator",
    });

    return newMaterials;
  }, [actions, materials, citationRegistry]);

  // Update material with manual override tracking
  const updateMaterial = useCallback((
    materialId: string,
    field: "quantity" | "unitPrice" | "item",
    newValue: string | number
  ) => {
    const timestamp = new Date().toISOString();
    const material = materials.find(m => m.id === materialId);
    
    if (!material) return;

    const previousValue = field === "item" ? undefined : (material[field] as number);
    const newNumericValue = typeof newValue === "string" ? parseFloat(newValue) || 0 : newValue;

    // Create citation entry for this edit
    const citationEntry: CitationEntry = {
      id: generateCitationId("manual_override", citationRegistry.length),
      materialId,
      source: "manual_override",
      timestamp,
      previousValue: typeof previousValue === "number" ? previousValue : undefined,
      newValue: typeof newNumericValue === "number" ? newNumericValue : undefined,
      field,
    };

    // Update the material
    const updatedMaterials = materials.map(m => {
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
        const qty = field === "quantity" ? newNumericValue : m.quantity;
        const price = field === "unitPrice" ? newNumericValue : (m.unitPrice || 0);
        updates.totalPrice = qty * price;
      }

      return { ...m, ...updates };
    });

    actions.setPage2Data({
      materials: updatedMaterials,
      citationRegistry: [...citationRegistry, citationEntry],
      lastModifiedSource: "manual_override",
    });
  }, [actions, materials, citationRegistry]);

  // Add custom material
  const addMaterial = useCallback((item: string, quantity: number, unit: string, unitPrice?: number) => {
    const timestamp = new Date().toISOString();
    const newMaterial: MaterialItem = {
      id: generateMaterialId(),
      item,
      quantity,
      unit,
      unitPrice: unitPrice || 0,
      totalPrice: (unitPrice || 0) * quantity,
      source: "manual" as const,
      citationSource: "manual_override" as CitationSource,
      citationId: generateCitationId("manual_override", materials.length),
      isEssential: false,
    };

    const citationEntry: CitationEntry = {
      id: newMaterial.citationId!,
      materialId: newMaterial.id,
      source: "manual_override",
      timestamp,
      newValue: quantity,
      field: "added",
    };

    actions.setPage2Data({
      materials: [...materials, newMaterial],
      citationRegistry: [...citationRegistry, citationEntry],
      lastModifiedSource: "manual_override",
    });

    return newMaterial;
  }, [actions, materials, citationRegistry]);

  // Remove material
  const removeMaterial = useCallback((materialId: string) => {
    const timestamp = new Date().toISOString();
    const material = materials.find(m => m.id === materialId);
    
    if (!material) return;

    const citationEntry: CitationEntry = {
      id: generateCitationId("manual_override", citationRegistry.length),
      materialId,
      source: "manual_override",
      timestamp,
      previousValue: material.quantity,
      field: "removed",
    };

    actions.setPage2Data({
      materials: materials.filter(m => m.id !== materialId),
      citationRegistry: [...citationRegistry, citationEntry],
      lastModifiedSource: "manual_override",
    });
  }, [actions, materials, citationRegistry]);

  // Calculate totals
  const totals = useMemo(() => {
    const materialCost = materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    return {
      materialCost,
      itemCount: materials.length,
      manualOverrideCount: materials.filter(m => m.citationSource === "manual_override").length,
      templateCount: materials.filter(m => m.citationSource === "template_preset").length,
      calculatorCount: materials.filter(m => m.citationSource === "calculator").length,
    };
  }, [materials]);

  // Get citation summary for display
  const citationSummary = useMemo(() => {
    const sources = new Map<CitationSource, number>();
    materials.forEach(m => {
      const count = sources.get(m.citationSource) || 0;
      sources.set(m.citationSource, count + 1);
    });
    return Array.from(sources.entries()).map(([source, count]) => ({ source, count }));
  }, [materials]);

  return {
    // State
    materials,
    citationRegistry,
    totals,
    citationSummary,
    selectedTemplateId,

    // Actions
    loadFromTemplate,
    loadFromCalculator,
    updateMaterial,
    addMaterial,
    removeMaterial,

    // Helpers
    generateCitationId,
  };
}

export default usePage2Materials;
