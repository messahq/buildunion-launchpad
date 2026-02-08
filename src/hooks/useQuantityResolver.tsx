/**
 * USE QUANTITY RESOLVER HOOK
 * 
 * React hook wrapper for the deterministic Quantity Resolver engine.
 * Handles V1/V2 version detection and batch material resolution.
 * 
 * Flow: [ AI Analysis ] → [ Quantity Resolver ] → [ Materials Table ] → [ Budget Engine ]
 */

import { useCallback, useMemo } from 'react';
import { 
  resolveQuantity, 
  resolveMaterialsBatch,
  getQuantityLogicVersion,
  shouldUseQuantityResolver,
  QuantityResolverInput,
  QuantityResolverOutput,
  MaterialItem,
  ManualOverride,
  QuantityLogicVersion,
  inferMaterialCategory,
  COVERAGE_RATES,
} from '@/lib/quantityResolver';

export interface UseQuantityResolverOptions {
  projectCreatedAt?: string | Date;
  explicitVersion?: QuantityLogicVersion;
  baseArea?: number;
  wastePercent?: number;
}

export interface ResolvedMaterialsResult {
  resolved: MaterialItem[];
  failed: MaterialItem[];
  summary: string;
  version: QuantityLogicVersion;
}

export function useQuantityResolver(options: UseQuantityResolverOptions = {}) {
  const {
    projectCreatedAt = new Date(),
    explicitVersion,
    baseArea = 0,
    wastePercent = 10,
  } = options;

  // Determine which version of quantity logic to use
  const version = useMemo(() => {
    return explicitVersion ?? getQuantityLogicVersion(projectCreatedAt);
  }, [projectCreatedAt, explicitVersion]);

  const isV2 = useMemo(() => {
    return shouldUseQuantityResolver(projectCreatedAt, explicitVersion);
  }, [projectCreatedAt, explicitVersion]);

  /**
   * Resolve a single material's quantity
   * Returns success/failure with resolved values or error message
   */
  const resolveSingleMaterial = useCallback((input: QuantityResolverInput): QuantityResolverOutput => {
    if (!isV2) {
      // V1: Passthrough - return as-is (legacy behavior)
      const wasteMultiplier = 1 + (input.waste_percent ?? wastePercent) / 100;
      const grossQty = Math.ceil(input.input_value * wasteMultiplier);
      return {
        success: true,
        resolved_quantity: input.input_value,
        resolved_unit: input.input_unit,
        gross_quantity: grossQty,
        resolution_method: 'passthrough',
        confidence: 'medium',
        calculation_trace: `V1 Legacy: ${input.input_value} × ${wasteMultiplier.toFixed(2)} = ${grossQty}`,
      };
    }

    // V2: Use deterministic Quantity Resolver
    return resolveQuantity({
      ...input,
      waste_percent: input.waste_percent ?? wastePercent,
    });
  }, [isV2, wastePercent]);

  /**
   * Resolve all materials in a batch
   * Separates successful resolutions from failures
   */
  const resolveMaterials = useCallback((materials: MaterialItem[]): ResolvedMaterialsResult => {
    if (!isV2) {
      // V1: Apply simple waste calculation (legacy)
      const wasteMultiplier = 1 + wastePercent / 100;
      const resolved = materials.map(m => ({
        ...m,
        quantity: Math.ceil((m.quantity || baseArea) * wasteMultiplier),
        resolved: true,
        resolution_trace: `V1 Legacy: ${m.quantity || baseArea} × ${wasteMultiplier.toFixed(2)}`,
      }));
      
      return {
        resolved,
        failed: [],
        summary: `V1 Legacy mode: Applied ${wastePercent}% waste to all ${materials.length} materials.`,
        version: 1,
      };
    }

    // V2: Use Quantity Resolver engine
    const result = resolveMaterialsBatch(materials, baseArea, wastePercent);
    
    return {
      ...result,
      version: 2,
    };
  }, [isV2, baseArea, wastePercent]);

  /**
   * Create a manual override for a material
   * AI doesn't calculate - just documents
   */
  const createManualOverride = useCallback((
    quantity: number,
    unit: string,
    reason: string,
    resolvedBy: 'user' | 'foreman' | 'owner' = 'user'
  ): ManualOverride => {
    return {
      override: true,
      quantity,
      unit,
      reason,
      resolved_by: resolvedBy,
      timestamp: new Date().toISOString(),
    };
  }, []);

  /**
   * Get coverage rate info for a material
   * Returns null if no coverage data available
   */
  const getCoverageInfo = useCallback((materialName: string) => {
    const category = inferMaterialCategory(materialName);
    if (category === 'unknown') return null;

    // Find matching coverage rate
    const lowerName = materialName.toLowerCase();
    for (const [key, data] of Object.entries(COVERAGE_RATES)) {
      if (lowerName.includes(key)) {
        return {
          key,
          ...data,
          category,
        };
      }
    }

    return null;
  }, []);

  /**
   * Validate if a material can be resolved
   * Returns true if Quantity Resolver can handle it
   */
  const canResolve = useCallback((materialName: string): boolean => {
    const category = inferMaterialCategory(materialName);
    return category !== 'unknown';
  }, []);

  return {
    // Version info
    version,
    isV2,

    // Resolution functions
    resolveSingleMaterial,
    resolveMaterials,

    // Override handling
    createManualOverride,

    // Utilities
    getCoverageInfo,
    canResolve,
    inferMaterialCategory,
  };
}

export type { QuantityResolverInput, QuantityResolverOutput, MaterialItem, ManualOverride };
