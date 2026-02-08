/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║   ████  PROTECTED ZONE - DO NOT MODIFY WITHOUT EXPLICIT APPROVAL  ████   ║
 * ║                                                                           ║
 * ║                    MATERIAL CALCULATION TAB                               ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║   ⚠️  THIS MODULE IMPLEMENTS THE 3 IRON LAWS (3 VASTÖRVÉNY)  ⚠️          ║
 * ║                                                                           ║
 * ║   These rules are IMMUTABLE. Any future UI changes or new categories     ║
 * ║   MUST preserve these calculations. Violating these laws will break      ║
 * ║   the entire cost estimation system.                                     ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║   IRON LAW #1 - DYNAMIC CALCULATION (No Hardcoding):                     ║
 * ║     Materials QTY = baseArea × (1 + wastePercent/100)                    ║
 * ║     The quantity is NEVER a static number - it's always computed.        ║
 * ║     When baseArea or wastePercent props change, quantities MUST update.  ║
 * ║                                                                           ║
 * ║   IRON LAW #2 - STATE PERSISTENCE:                                       ║
 * ║     The wastePercent is saved to DB (ai_workflow_config.userEdits)       ║
 * ║     and restored on project load, overriding the 10% default.            ║
 * ║     dataSource='saved' → quantities already include waste                ║
 * ║     dataSource='ai'/'tasks' → apply waste calculation dynamically        ║
 * ║                                                                           ║
 * ║   IRON LAW #3 - DUAL LOGIC:                                              ║
 * ║     • Materials → GROSS quantity (base + waste buffer)                   ║
 * ║     • Labor → NET quantity (base area only, in sq ft)                    ║
 * ║     Workers install actual area, not the waste buffer.                   ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║   TEST: If changing Waste% doesn't update Materials QTY, code is broken. ║
 * ║                                                                           ║
 * ║   Last verified: 2026-02-01                                              ║
 * ║   Status: STABLE & FINALIZED                                             ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Package,
  DollarSign,
  Hammer,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  MapPin,
  PenLine,
  RotateCcw,
  Save,
  Clock,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { downloadPDF, generatePDFBlob } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import SignatureCapture, { SignatureData } from "@/components/SignatureCapture";
import { supabase } from "@/integrations/supabase/client";
import { useUnitSettings } from "@/hooks/useUnitSettings";
import { useAuth } from "@/hooks/useAuth";
import { useDataLock } from "@/hooks/useDataLock";
import { ImpactWarningDialog, ImpactType } from "./ImpactWarningDialog";
import { resolveQuantity, type QuantityResolverInput } from "@/lib/quantityResolver";

interface PendingApprovalStatus {
  isPending: boolean;
  submittedAt?: string;
  proposedTotal?: number;
}

interface CostItem {
  id: string;
  item: string;
  quantity: number;
  baseQuantity?: number; // Original quantity before waste
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isEssential?: boolean; // Whether 10% waste applies
}

interface TaskBasedEntry {
  item: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

interface ClientInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface MaterialCalculationTabProps {
  materials: TaskBasedEntry[];
  labor: TaskBasedEntry[];
  other?: TaskBasedEntry[]; // Saved "Other" items from database
  projectTotal: number;
  projectId?: string;
  projectName?: string;
  projectAddress?: string;
  confirmedArea?: number | null; // The confirmed area from citation system
  confirmedAreaUnit?: string;
  wastePercent?: number; // Waste buffer percentage (default 10%)
  baseArea?: number | null; // The base area that materials quantities are based on
  companyName?: string;
  companyLogoUrl?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  clientInfo?: ClientInfo;
  onCostsChange?: (costs: { materials: CostItem[]; labor: CostItem[]; other: CostItem[] }) => void;
  onGrandTotalChange?: (grandTotalWithTax: number) => void;
  onSave?: (costs: { materials: CostItem[]; labor: CostItem[]; other: CostItem[]; grandTotal: number }) => Promise<void>;
  currency?: string;
  dataSource?: 'saved' | 'ai' | 'tasks';
  isSoloMode?: boolean;
  projectOwnerId?: string; // Owner's user ID for approval gate
  onPendingApprovalCreated?: () => void; // Callback when pending approval is submitted
  pendingApprovalStatus?: PendingApprovalStatus | null; // Show pending state for non-owners
}

// Essential material patterns that get 10% waste calculation
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

const WASTE_PERCENTAGE = 0.10;

/**
 * COVERAGE MAP: Realistic coverage per unit for different material types
 * This converts gross area (sq ft) to realistic unit counts (boxes, gallons, etc.)
 * 
 * Example: 1302 sq ft of flooring with coverage 22 sq ft/box = ~60 boxes (not 1302!)
 * 
 * Coverage values are industry-standard averages.
 * Power Edit still allows manual override for precision.
 */
interface CoverageInfo {
  coveragePerUnit: number; // sq ft per unit
  targetUnit: string; // The unit to convert to
}

const MATERIAL_COVERAGE_MAP: Record<string, CoverageInfo> = {
  // Flooring - boxes typically cover 20-25 sq ft
  'laminate': { coveragePerUnit: 22, targetUnit: 'boxes' },
  'flooring': { coveragePerUnit: 22, targetUnit: 'boxes' },
  'hardwood': { coveragePerUnit: 20, targetUnit: 'boxes' },
  'vinyl': { coveragePerUnit: 20, targetUnit: 'boxes' },
  'tile': { coveragePerUnit: 15, targetUnit: 'boxes' },
  'ceramic': { coveragePerUnit: 15, targetUnit: 'boxes' },
  
  // Underlayment - rolls cover ~100-200 sq ft
  'underlayment': { coveragePerUnit: 100, targetUnit: 'rolls' },
  
  // Paint - gallon covers ~350-400 sq ft
  'paint': { coveragePerUnit: 350, targetUnit: 'gallons' },
  'primer': { coveragePerUnit: 350, targetUnit: 'gallons' },
  
  // Drywall - 4x8 sheet = 32 sq ft
  'drywall': { coveragePerUnit: 32, targetUnit: 'sheets' },
  'gypsum': { coveragePerUnit: 32, targetUnit: 'sheets' },
  
  // Carpet - rolls vary, ~12 ft wide rolls
  'carpet': { coveragePerUnit: 144, targetUnit: 'sq yards' }, // 12x12 section
  
  // Adhesive/glue - gallon covers ~200 sq ft
  'adhesive': { coveragePerUnit: 200, targetUnit: 'gallons' },
  'glue': { coveragePerUnit: 200, targetUnit: 'gallons' },
  
  // Baseboard/trim - linear feet, assume ~16 ft per piece
  'baseboard': { coveragePerUnit: 1, targetUnit: 'linear ft' }, // Keep as linear ft
  'trim': { coveragePerUnit: 1, targetUnit: 'linear ft' },
};

/**
 * Get coverage info for a material item
 * Returns null if no conversion needed (keeps original sq ft)
 */
const getMaterialCoverage = (itemName: string): CoverageInfo | null => {
  if (!itemName) return null;
  const lowerName = itemName.toLowerCase();
  
  for (const [keyword, coverage] of Object.entries(MATERIAL_COVERAGE_MAP)) {
    if (lowerName.includes(keyword)) {
      return coverage;
    }
  }
  
  return null;
};

/**
 * Calculate realistic quantity from gross area
 * Converts sq ft to appropriate units (boxes, gallons, etc.)
 */
const calculateCoverageBasedQuantity = (
  grossArea: number, 
  itemName: string,
  originalUnit: string
): { quantity: number; unit: string } => {
  // If unit is already specific (boxes, gallons, etc.), don't convert
  if (!originalUnit) return { quantity: grossArea, unit: originalUnit || 'sq ft' };
  const originalUnitLower = originalUnit.toLowerCase();
  const isSqFtUnit = originalUnitLower.includes('sq') || originalUnitLower.includes('ft²');
  
  // Only apply coverage conversion for sq ft based materials
  if (!isSqFtUnit) {
    return { quantity: grossArea, unit: originalUnit };
  }
  
  const coverage = getMaterialCoverage(itemName);
  
  if (coverage && coverage.coveragePerUnit > 1) {
    // Convert: grossArea / coverage = number of units needed
    const calculatedQty = Math.ceil(grossArea / coverage.coveragePerUnit);
    console.log(`[COVERAGE] ${itemName}: ${grossArea} sq ft ÷ ${coverage.coveragePerUnit} = ${calculatedQty} ${coverage.targetUnit}`);
    return { quantity: calculatedQty, unit: coverage.targetUnit };
  }
  
  // No conversion needed - keep as sq ft
  return { quantity: grossArea, unit: originalUnit };
};

// Canadian provincial tax rates
const getCanadianTaxRates = (address: string): { gst: number; pst: number; hst: number; provinceName: string; provinceCode: string } => {
  if (!address) return { gst: 0.05, pst: 0, hst: 0, provinceName: 'Canada', provinceCode: 'CA' };
  const addressLower = address.toLowerCase();
  
  // Ontario - HST 13%
  if (addressLower.includes('ontario') || addressLower.includes(', on') || addressLower.includes('toronto') || 
      addressLower.includes('ottawa') || addressLower.includes('mississauga') || addressLower.includes('hamilton') ||
      addressLower.includes('brampton') || addressLower.includes('london') || addressLower.includes('markham')) {
    return { gst: 0, pst: 0, hst: 0.13, provinceName: 'Ontario', provinceCode: 'ON' };
  }
  // British Columbia - GST 5% + PST 7%
  if (addressLower.includes('british columbia') || addressLower.includes(', bc') || addressLower.includes('vancouver') || 
      addressLower.includes('victoria') || addressLower.includes('surrey') || addressLower.includes('burnaby')) {
    return { gst: 0.05, pst: 0.07, hst: 0, provinceName: 'British Columbia', provinceCode: 'BC' };
  }
  // Alberta - GST 5% only
  if (addressLower.includes('alberta') || addressLower.includes(', ab') || addressLower.includes('calgary') || 
      addressLower.includes('edmonton') || addressLower.includes('red deer')) {
    return { gst: 0.05, pst: 0, hst: 0, provinceName: 'Alberta', provinceCode: 'AB' };
  }
  // Quebec - GST 5% + QST 9.975%
  if (addressLower.includes('quebec') || addressLower.includes('québec') || addressLower.includes(', qc') || 
      addressLower.includes('montreal') || addressLower.includes('montréal') || addressLower.includes('laval')) {
    return { gst: 0.05, pst: 0.09975, hst: 0, provinceName: 'Quebec', provinceCode: 'QC' };
  }
  // Manitoba - GST 5% + PST 7%
  if (addressLower.includes('manitoba') || addressLower.includes(', mb') || addressLower.includes('winnipeg')) {
    return { gst: 0.05, pst: 0.07, hst: 0, provinceName: 'Manitoba', provinceCode: 'MB' };
  }
  // Saskatchewan - GST 5% + PST 6%
  if (addressLower.includes('saskatchewan') || addressLower.includes(', sk') || addressLower.includes('saskatoon') || 
      addressLower.includes('regina')) {
    return { gst: 0.05, pst: 0.06, hst: 0, provinceName: 'Saskatchewan', provinceCode: 'SK' };
  }
  // Nova Scotia - HST 15%
  if (addressLower.includes('nova scotia') || addressLower.includes(', ns') || addressLower.includes('halifax')) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'Nova Scotia', provinceCode: 'NS' };
  }
  // New Brunswick - HST 15%
  if (addressLower.includes('new brunswick') || addressLower.includes(', nb') || addressLower.includes('moncton') || 
      addressLower.includes('saint john')) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'New Brunswick', provinceCode: 'NB' };
  }
  // Newfoundland and Labrador - HST 15%
  if (addressLower.includes('newfoundland') || addressLower.includes('labrador') || addressLower.includes(', nl') || 
      addressLower.includes("st. john's")) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'Newfoundland and Labrador', provinceCode: 'NL' };
  }
  // Prince Edward Island - HST 15%
  if (addressLower.includes('prince edward island') || addressLower.includes(', pe') || addressLower.includes('charlottetown')) {
    return { gst: 0, pst: 0, hst: 0.15, provinceName: 'Prince Edward Island', provinceCode: 'PE' };
  }
  // Default to Ontario HST
  return { gst: 0, pst: 0, hst: 0.13, provinceName: 'Ontario', provinceCode: 'ON' };
};

export function MaterialCalculationTab({
  materials: initialMaterials,
  labor: initialLabor,
  other: initialOther = [], // Load saved other items from props
  projectTotal,
  projectId,
  projectName = "Project",
  projectAddress = "",
  confirmedArea,
  confirmedAreaUnit = "sq ft",
  wastePercent = 10,
  baseArea,
  companyName,
  companyLogoUrl,
  companyPhone,
  companyEmail,
  companyWebsite,
  clientInfo,
  onCostsChange,
  onGrandTotalChange,
  onSave,
  currency = "CAD",
  dataSource = "ai",
  isSoloMode = false,
  projectOwnerId,
  onPendingApprovalCreated,
  pendingApprovalStatus
}: MaterialCalculationTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  
  // ====== DATA LOCK SYSTEM ======
  // Protects saved financial data from background modifications
  const isOwner = !projectOwnerId || user?.id === projectOwnerId;
  
  const dataLock = useDataLock({
    dataSource,
    isOwner,
  });
  
  // Impact warning dialog state
  const [impactWarning, setImpactWarning] = useState<{
    open: boolean;
    type: ImpactType;
    onConfirm: () => void;
    affectedCount?: number;
    estimatedChange?: number;
  }>({ open: false, type: 'bulk_update', onConfirm: () => {} });
  
  // Helper to show impact warning before system changes
  const showImpactWarning = useCallback((
    type: ImpactType, 
    onConfirm: () => void,
    affectedCount?: number,
    estimatedChange?: number
  ) => {
    if (dataLock.needsImpactWarning(type)) {
      setImpactWarning({ open: true, type, onConfirm, affectedCount, estimatedChange });
      return true; // Warning shown, operation deferred
    }
    return false; // No warning needed, proceed immediately
  }, [dataLock]);
  
  // Local pending approval state - allows immediate UI update after submission
  const [localPendingApproval, setLocalPendingApproval] = useState<PendingApprovalStatus | null>(
    pendingApprovalStatus || null
  );
  
  // Sync local state with prop when it changes externally
  useEffect(() => {
    if (pendingApprovalStatus) {
      setLocalPendingApproval(pendingApprovalStatus);
    }
  }, [pendingApprovalStatus]);
  
  // Track previous baseArea for dynamic recalculation
  // CRITICAL: Initialize with null to force first useEffect to detect area initialization
  const prevBaseAreaRef = useRef<number | null>(null);
  const prevWasteRef = useRef<number>(10); // Default waste, will be updated by useEffect
  
  // Dynamic waste percentage from props (allows live adjustment)
  const DYNAMIC_WASTE = wastePercent / 100;
  
  // DATA LOCK: Intelligent unit inference from material name
  // This prevents generic 'unit' from being displayed for known material types
  const inferUnitFromMaterialName = useCallback((itemName: string): string => {
    const lowerName = itemName.toLowerCase();
    
    // Flooring materials -> sq ft
    if (lowerName.includes('flooring') || lowerName.includes('hardwood') || 
        lowerName.includes('laminate') || lowerName.includes('vinyl') ||
        lowerName.includes('carpet') || lowerName.includes('tile') ||
        lowerName.includes('underlayment') || lowerName.includes('vapor barrier')) {
      return 'sq ft';
    }
    
    // Trim/linear materials -> linear ft
    if (lowerName.includes('baseboard') || lowerName.includes('trim') ||
        lowerName.includes('transition') || lowerName.includes('molding') ||
        lowerName.includes('threshold')) {
      return 'linear ft';
    }
    
    // Paint/adhesive -> gallon or pcs
    if (lowerName.includes('paint') || lowerName.includes('primer')) {
      return 'gallons';
    }
    
    if (lowerName.includes('adhesive') || lowerName.includes('fastener') ||
        lowerName.includes('glue') || lowerName.includes('screw') ||
        lowerName.includes('nail')) {
      return 'pcs';
    }
    
    return 'unit';
  }, []);
  
  // Helper to create initial material items with INTEGRATED Quantity Resolver
  // CRITICAL: The Quantity Resolver ALWAYS runs on initialization - no 'saved' exception
  // This guarantees Operational Truth: DB always receives physics-based, calculated values
  const createInitialMaterialItems = useCallback(() => {
    // ============ CRITICAL FIX (2026-02-08): INFER baseArea FROM MATERIALS ============
    // Problem: New projects without AI analysis have baseArea=null, so the Quantity Resolver
    // never runs, causing 1486 linear ft instead of 18 linear ft for Transition Strips.
    //
    // Solution: If baseArea is not provided, INFER it from the largest sq ft material.
    // This ensures the Quantity Resolver runs for ALL projects, not just AI-analyzed ones.
    
    let inferredBaseArea = baseArea ?? 0;
    
    if (!inferredBaseArea || inferredBaseArea <= 0) {
      // Find the largest sq ft quantity from incoming materials - this is our base area
      let maxSqFtQty = 0;
      for (const m of initialMaterials) {
        const unit = (m.unit || '').toLowerCase();
        const isSqFtUnit = unit.includes('sq') || unit.includes('ft²');
        if (isSqFtUnit && m.quantity > maxSqFtQty) {
          maxSqFtQty = m.quantity;
        }
      }
      if (maxSqFtQty > 0) {
        inferredBaseArea = maxSqFtQty;
        console.log(`[INFERRED BASE AREA] No baseArea prop provided, inferred from materials: ${inferredBaseArea} sq ft`);
      }
    }
    
    return initialMaterials.map((m: TaskBasedEntry & { baseQuantity?: number; isEssential?: boolean; totalPrice?: number }, idx) => {
      const isEssential = m.isEssential ?? isEssentialMaterial(m.item);
      const unitPrice = m.unitPrice ?? 0;
      const savedQuantity = m.quantity ?? 1;
      const savedUnit = m.unit || 'unit';
      
      // ============ INTEGRATED QUANTITY RESOLVER ============
      // CRITICAL FIX (2026-02-08): The resolver MUST run for ALL essential materials
      // when we have a valid baseArea (either from props or inferred).
      // 
      // BUG ROOT CAUSE: New projects had baseArea=null, so resolver never ran.
      // 
      // SOLUTION: Infer baseArea from the largest sq ft material if not provided.
      
      const authorityBaseArea = inferredBaseArea; // Use inferred baseArea as THE authority
      
      let finalQuantity = savedQuantity;
      let finalUnit = savedUnit;
      let finalBaseQty = savedQuantity;
      
      // RESOLVER RUNS IF: essential material AND we have a valid baseArea (from prop OR inferred)
      if (isEssential && authorityBaseArea > 0) {
        // Run Quantity Resolver for deterministic physics-based calculation
        const resolverInput: QuantityResolverInput = {
          material_name: m.item,
          input_unit: 'sq ft',
          input_value: authorityBaseArea, // ALWAYS use the authoritative baseArea
          waste_percent: wastePercent,
        };
        
        const resolved = resolveQuantity(resolverInput);
        
        if (resolved.success && resolved.gross_quantity && resolved.resolved_unit) {
          // ✅ RESOLVER SUCCEEDED: Use calculated values
          finalQuantity = resolved.gross_quantity;
          finalUnit = resolved.resolved_unit;
          finalBaseQty = resolved.resolved_quantity ?? authorityBaseArea;
          console.log(`[INIT RESOLVER] ${m.item}: ${resolved.calculation_trace}`);
        } else {
          // ⚠️ RESOLVER FAILED: Fallback to local coverage conversion
          console.warn(`[INIT RESOLVER FALLBACK] ${m.item}: ${resolved.error_message}`);
          const grossArea = Math.ceil(authorityBaseArea * (1 + wastePercent / 100));
          const { quantity: covQty, unit: covUnit } = calculateCoverageBasedQuantity(
            grossArea,
            m.item,
            'sq ft' // Force sq ft for coverage calculation
          );
          finalQuantity = covQty;
          finalUnit = covUnit;
          finalBaseQty = authorityBaseArea;
        }
      }
      
      console.log(`[MATERIAL INIT] ${m.item}: baseArea=${authorityBaseArea} → ${finalQuantity} ${finalUnit}`);
      
      return {
        id: `material-${idx}`,
        item: m.item,
        baseQuantity: finalBaseQty,
        quantity: finalQuantity,
        unit: finalUnit,
        unitPrice,
        totalPrice: finalQuantity * unitPrice,
        isEssential,
      };
    });
  }, [initialMaterials, baseArea, wastePercent]);

  // Helper to create initial labor items
  // CRITICAL: Labor uses NET area (baseArea) in sq ft - no waste buffer on labor costs!
  // IRON LAW #3: Installation labor for area-based work MUST use sq ft and baseArea
  // OPERATIONAL TRUTH: totalPrice is ALWAYS calculated, never use savedTotalPrice directly
  const createInitialLaborItems = useCallback(() => 
    initialLabor.map((l: TaskBasedEntry & { totalPrice?: number }, idx) => {
      const savedTotalPrice = l.totalPrice;
      
      // CRITICAL: Use nullish coalescing to preserve 0 as valid values
      const quantity = l.quantity ?? 1;
      const unitPrice = l.unitPrice ?? 0;
      
      // Detect if this is an "Installation" labor item for area-based work
      const isInstallationLabor = /installation|install/i.test(l.item);
      const isAreaBasedWork = /paint|flooring|tile|hardwood|laminate|carpet|drywall|primer/i.test(l.item);
      
      // IRON LAW #3: Area-based installation labor ALWAYS uses sq ft and baseArea (NET)
      // For saved data, still use baseArea for display but preserve saved values
      const isSqFtUnit = l.unit?.toLowerCase().includes("sq") || l.unit?.toLowerCase().includes("ft");
      const shouldUseBaseArea = isInstallationLabor && isAreaBasedWork && baseArea && baseArea > 0;
      const laborQty = (isSqFtUnit && baseArea && baseArea > 0) ? baseArea : quantity;
      
      // CRITICAL FIX: Only use savedTotalPrice as unitPrice if unitPrice is truly missing
      // AND quantity is 1 (flattened item scenario)
      const finalUnitPrice = (!l.unitPrice && savedTotalPrice && quantity === 1) 
        ? savedTotalPrice 
        : unitPrice;
      
      const finalUnit = shouldUseBaseArea ? "sq ft" : (l.unit || 'unit');
      
      // OPERATIONAL TRUTH: totalPrice is ALWAYS quantity * unitPrice
      const calculatedTotal = laborQty * finalUnitPrice;
      
      console.log(`[LABOR LOAD] ${l.item}: ${laborQty} × $${finalUnitPrice} = $${calculatedTotal}`);
      
      return {
        id: `labor-${idx}`,
        item: l.item,
        quantity: laborQty,
        unit: finalUnit,
        unitPrice: finalUnitPrice,
        totalPrice: calculatedTotal, // ALWAYS calculated
      };
    })
  , [initialLabor, baseArea]);
  
  // Material items with waste calculation
  const [materialItems, setMaterialItems] = useState<CostItem[]>(createInitialMaterialItems);

  // Labor items
  const [laborItems, setLaborItems] = useState<CostItem[]>(createInitialLaborItems);
  
  // Other/custom items - PERSISTENCE FIX: Load saved items from props
  // OPERATIONAL TRUTH: totalPrice is ALWAYS calculated, never use savedTotalPrice directly
  const createInitialOtherItems = useCallback((): CostItem[] => {
    if (!initialOther || initialOther.length === 0) return [];
    return initialOther.map((o, idx) => {
      const savedTotalPrice = (o as { totalPrice?: number }).totalPrice;
      
      // CRITICAL: Use nullish coalescing to preserve 0 as valid values
      const quantity = o.quantity ?? 1;
      const unitPrice = o.unitPrice ?? 0;
      
      // CRITICAL FIX: Only use savedTotalPrice as unitPrice if unitPrice is truly missing
      // AND quantity is 1 (flattened item scenario)
      const finalUnitPrice = (!o.unitPrice && savedTotalPrice && quantity === 1) 
        ? savedTotalPrice 
        : unitPrice;
      
      // OPERATIONAL TRUTH: totalPrice is ALWAYS quantity * unitPrice
      const calculatedTotal = quantity * finalUnitPrice;
      
      return {
        id: `other-saved-${idx}-${Date.now()}`,
        item: o.item,
        quantity,
        unit: o.unit || 'unit',
        unitPrice: finalUnitPrice,
        totalPrice: calculatedTotal, // ALWAYS calculated
      };
    });
  }, [initialOther]);
  
  const [otherItems, setOtherItems] = useState<CostItem[]>(createInitialOtherItems);
  
  // PERSISTENCE FIX: Sync otherItems when initialOther prop changes (e.g., navigating between projects)
  // Use ref to track previous value and prevent unnecessary re-renders
  const initialOtherJsonRef = useRef<string>(JSON.stringify(initialOther));
  useEffect(() => {
    const newJson = JSON.stringify(initialOther);
    if (newJson !== initialOtherJsonRef.current && initialOther && initialOther.length > 0) {
      console.log('[MaterialCalculationTab] Syncing otherItems from saved data:', initialOther.length, 'items');
      setOtherItems(createInitialOtherItems());
      initialOtherJsonRef.current = newJson;
    }
  }, [initialOther, createInitialOtherItems]);
  
  // Track unsaved changes and current data source
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<'saved' | 'ai' | 'tasks'>(dataSource);
  
  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ====== UNIT CONVERSION SYSTEM ======
  // Global unit toggle (Imperial <-> Metric) integration
  const { isMetric, convertArea, convertLength, convertVolume, convertUnitPrice, getDisplayUnit } = useUnitSettings();
  
  // Helper: Convert item's display values based on current unit system
  // CRITICAL: Total price remains the same - only display units/prices change
  const getDisplayValues = useCallback((item: CostItem) => {
    const originalUnit = (item.unit || '').toLowerCase();
    
    // Identify unit type and convert if needed
    const isSqFt = originalUnit.includes('sq ft') || originalUnit === 'sq ft' || originalUnit.includes('ft²');
    const isLinearFt = (originalUnit.includes('linear') && originalUnit.includes('ft')) || originalUnit === 'linear ft';
    const isCuYard = originalUnit.includes('cu') && originalUnit.includes('yd');
    
    // Only convert length/area units - not boxes, gallons, sheets, etc.
    if (isSqFt) {
      const converted = convertArea(item.quantity, 'sq ft');
      const priceConv = convertUnitPrice(item.unitPrice, 'sq ft');
      return { quantity: converted.value, unitPrice: priceConv.price, unit: converted.unit };
    }
    
    if (isLinearFt) {
      const converted = convertLength(item.quantity, 'ft');
      const priceConv = convertUnitPrice(item.unitPrice, 'ft');
      return { quantity: converted.value, unitPrice: priceConv.price, unit: converted.unit };
    }
    
    if (isCuYard) {
      const converted = convertVolume(item.quantity, 'cu yd');
      const priceConv = convertUnitPrice(item.unitPrice, 'cu yd');
      return { quantity: converted.value, unitPrice: priceConv.price, unit: converted.unit };
    }
    
    // For non-convertible units (boxes, gallons, sheets, etc.) - no conversion
    return { quantity: item.quantity, unitPrice: item.unitPrice, unit: item.unit };
  }, [isMetric, convertArea, convertLength, convertVolume, convertUnitPrice]);
  
  // Helper: Convert base quantity for display (net area before waste)
  const getDisplayBaseQuantity = useCallback((item: CostItem) => {
    if (!item.baseQuantity) return undefined;
    
    const originalUnit = (item.unit || '').toLowerCase();
    const isSqFt = originalUnit.includes('sq ft') || originalUnit === 'sq ft' || originalUnit.includes('ft²');
    
    if (isSqFt) {
      const converted = convertArea(item.baseQuantity, 'sq ft');
      return converted.value;
    }
    
    return item.baseQuantity;
  }, [convertArea]);
  
  // Get laminate base quantity for sync dependency
  const laminateBaseQty = materialItems.find(m => /laminate|flooring/i.test(m.item))?.baseQuantity;
  
  // ============ CRITICAL FIX (2026-02-08): STABLE REFS FOR DATA LOCK ============
  // Problem: dataLock object in dependency array causes infinite loop because
  // it's a new object reference on every render.
  // 
  // Solution: Extract stable values (isLocked) instead of object reference.
  const isDataLocked = dataLock.isLocked;
  
  // Ref to track if we've already logged the blocked operation (prevents spam)
  const underlaymentSyncBlockedRef = useRef(false);
  
  // Sync underlayment when laminate changes
  // DATA LOCK: Block this for saved data - user's values are authoritative
  useEffect(() => {
    // DATA LOCK: Block background sync for saved data
    // Use stable boolean instead of function to prevent infinite loop
    if (isDataLocked) {
      // Only log once per lock state to prevent console spam
      if (!underlaymentSyncBlockedRef.current) {
        console.log('[DATA LOCK] underlayment_sync blocked - Data is in SAVED state');
        underlaymentSyncBlockedRef.current = true;
      }
      return;
    }
    
    // Reset block log flag when data becomes unlocked
    underlaymentSyncBlockedRef.current = false;
    
    const laminateItem = materialItems.find(m => /laminate|flooring/i.test(m.item));
    const underlaymentItem = materialItems.find(m => /^underlayment$/i.test(m.item.trim()));
    
    if (laminateItem && underlaymentItem) {
      const laminateBase = laminateItem.baseQuantity || laminateItem.quantity / (1 + DYNAMIC_WASTE);
      const underlaymentBase = underlaymentItem.baseQuantity || underlaymentItem.quantity / (1 + DYNAMIC_WASTE);
      
      // Only sync if they're different
      if (Math.abs(laminateBase - underlaymentBase) > 1) {
        const newQuantityWithWaste = Math.ceil(laminateBase * (1 + DYNAMIC_WASTE));
        setMaterialItems(prev => prev.map(item => {
          if (/^underlayment$/i.test(item.item.trim())) {
            return {
              ...item,
              baseQuantity: laminateBase,
              quantity: newQuantityWithWaste,
              totalPrice: newQuantityWithWaste * item.unitPrice,
            };
          }
          return item;
        }));
      }
    }
  }, [laminateBaseQty, isDataLocked, materialItems, DYNAMIC_WASTE]);
  
  // ====== DYNAMIC SYNC: Recalculate when baseArea or wastePercent changes ======
  // CRITICAL: NO 'saved' exception - mathematics ALWAYS guarantees Operational Truth
  // Even saved data must recalculate when waste% or baseArea changes
  useEffect(() => {
    const prevArea = prevBaseAreaRef.current;
    const prevWaste = prevWasteRef.current;
    const newArea = baseArea ?? null;
    const newWaste = wastePercent;
    
    // Detect meaningful changes:
    // 1. Area changed from null to value (initial AI analysis)
    // 2. Area changed from value to different value (Power Modal edit)
    // 3. Waste percentage changed
    const areaInitialized = !prevArea && newArea && newArea > 0;
    const areaModified = prevArea && newArea && Math.abs(newArea - prevArea) > 1;
    const areaChanged = areaInitialized || areaModified;
    const wasteChanged = newWaste !== prevWaste;
    
    if (!areaChanged && !wasteChanged) {
      prevBaseAreaRef.current = newArea;
      prevWasteRef.current = newWaste;
      return;
    }
    
    console.log(`[IRON LAW #1] Dynamic recalc: baseArea=${prevArea}→${newArea}, waste=${prevWaste}%→${newWaste}%`);
    
    // IRON LAW #1: Recalculate essential materials using the NEW baseArea
    // Apply COVERAGE-BASED conversion to get realistic unit counts
    setMaterialItems(prev => prev.map(item => {
      // Check if this is an area-based material (regardless of current unit)
      // After conversion, unit might be "boxes" but we still need to recalculate
      const coverage = getMaterialCoverage(item.item);
      const isAreaBased = item.isEssential && coverage !== null;
      
      if (isAreaBased && newArea && newArea > 0) {
        // IRON LAW #1: Calculate GROSS area first
        const newBaseQty = newArea;
        const grossAreaSqFt = Math.ceil(newBaseQty * (1 + (newWaste / 100)));
        
        // Apply COVERAGE conversion: gross sq ft -> realistic units
        const { quantity: newFinalQty, unit: newUnit } = calculateCoverageBasedQuantity(
          grossAreaSqFt, 
          item.item, 
          'sq ft' // Always calculate from sq ft base
        );
        
        console.log(`[IRON LAW #1 + COVERAGE] ${item.item}: NET=${newBaseQty} sq ft → GROSS=${grossAreaSqFt} sq ft → ${newFinalQty} ${newUnit}`);
        
        return {
          ...item,
          baseQuantity: newBaseQty,
          quantity: newFinalQty,
          unit: newUnit,
          totalPrice: newFinalQty * item.unitPrice,
        };
      }
      return item;
    }));
    
    // IRON LAW #3: Update labor items to use NET area (no waste buffer for labor)
    // For installation labor, FORCE sq ft unit and baseArea quantity
    setLaborItems(prev => prev.map(item => {
      const isInstallationLabor = /installation|install/i.test(item.item);
      const isAreaBasedWork = /paint|flooring|tile|hardwood|laminate|carpet|drywall|primer/i.test(item.item);
      
      // Area-based installation labor ALWAYS uses sq ft and NET area
      if (isInstallationLabor && isAreaBasedWork && newArea && newArea > 0) {
        console.log(`[IRON LAW #3] Labor ${item.item}: FORCED to NET area = ${newArea} sq ft`);
        return {
          ...item,
          quantity: newArea, // NET area - no waste
          unit: "sq ft", // Force sq ft for area-based installation
          totalPrice: newArea * item.unitPrice,
        };
      }
      
      // For other sq ft labor, just update quantity
      const isSqFtUnit = item.unit?.toLowerCase().includes("sq") || item.unit?.toLowerCase().includes("ft");
      if (isSqFtUnit && newArea && newArea > 0) {
        console.log(`[IRON LAW #3] Labor ${item.item}: NET area = ${newArea} (no waste)`);
        return {
          ...item,
          quantity: newArea,
          totalPrice: newArea * item.unitPrice,
        };
      }
      return item;
    }));
    
    setHasUnsavedChanges(true);
    
    // Update refs
    prevBaseAreaRef.current = newArea;
    prevWasteRef.current = newWaste;
  }, [baseArea, wastePercent, dataSource]);
  
  // New other item form
  const [otherDescription, setOtherDescription] = useState("");
  const [otherQuantity, setOtherQuantity] = useState<number>(1);
  const [otherUnit, setOtherUnit] = useState("pcs");
  const [otherUnitPrice, setOtherUnitPrice] = useState<number>(0);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CostItem>>({});

  // Section collapse state
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [laborOpen, setLaborOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  
  // Signature state
  const [clientSignature, setClientSignature] = useState<SignatureData | null>(null);
  const [contractorSignature, setContractorSignature] = useState<SignatureData | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(true);

  // Calculate section totals
  const materialsTotal = materialItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const laborTotal = laborItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const otherTotal = otherItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const grandTotal = materialsTotal + laborTotal + otherTotal;

  // Update parent when items change
  useEffect(() => {
    onCostsChange?.({ materials: materialItems, labor: laborItems, other: otherItems });
  }, [materialItems, laborItems, otherItems, onCostsChange]);

  // Sync grand total with parent (including tax)
  useEffect(() => {
    if (onGrandTotalChange) {
      const taxInfo = getCanadianTaxRates(projectAddress);
      const subtotal = grandTotal;
      const gstAmount = taxInfo.gst > 0 ? subtotal * taxInfo.gst : 0;
      const pstAmount = taxInfo.pst > 0 ? subtotal * taxInfo.pst : 0;
      const hstAmount = taxInfo.hst > 0 ? subtotal * taxInfo.hst : 0;
      const totalTax = gstAmount + pstAmount + hstAmount;
      const grandTotalWithTax = subtotal + totalTax;
      onGrandTotalChange(grandTotalWithTax);
    }
  }, [grandTotal, projectAddress, onGrandTotalChange]);

  // Auto-save when items change (debounced)
  // CRITICAL: Always recalculate with Quantity Resolver before saving to guarantee Operational Truth
  useEffect(() => {
    if (!hasUnsavedChanges || !onSave) return;
    
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for auto-save after 1 second of inactivity
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        // RESOLVER INTEGRATION: Ensure saved values are physics-based (not "1 unit")
        // For each material, verify it has realistic units and quantities
        const validatedMaterials = materialItems.map(item => {
          // If unit is generic 'unit', attempt to infer realistic unit
          let finalUnit = item.unit;
          let finalQty = item.quantity;
          
          if (finalUnit === 'unit' || !finalUnit) {
            // Attempt resolver as fallback
            const resolved = resolveQuantity({
              material_name: item.item,
              input_unit: 'sq ft',
              input_value: item.baseQuantity || item.quantity,
              waste_percent: wastePercent,
            });
            
            if (resolved.success && resolved.gross_quantity && resolved.resolved_unit) {
              finalQty = resolved.gross_quantity;
              finalUnit = resolved.resolved_unit;
              console.log(`[SAVE RESOLVER] ${item.item}: corrected to ${finalQty} ${finalUnit}`);
            }
          }
          
          return {
            ...item,
            quantity: finalQty,
            unit: finalUnit,
          };
        });
        
        await onSave({
          materials: validatedMaterials,
          labor: laborItems,
          other: otherItems,
          grandTotal,
        });
        setHasUnsavedChanges(false);
        setCurrentDataSource('saved');
        toast.success(t("materials.autoSaved", "Saved"));
      } catch (error) {
        console.error("Auto-save error:", error);
        toast.error(t("materials.saveFailed", "Save failed"));
      }
    }, 1000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, materialItems, laborItems, otherItems, grandTotal, onSave, t, wastePercent]);

  // Handle GROSS quantity change for essential materials (user edits the order quantity)
  // This recalculates the baseQuantity from the gross value
  const handleGrossQuantityChange = (id: string, newGrossQty: number) => {
    setHasUnsavedChanges(true);
    setMaterialItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      // Calculate base from gross: base = gross / (1 + waste%)
      const newBaseQty = item.isEssential 
        ? Math.round(newGrossQty / (1 + DYNAMIC_WASTE)) 
        : newGrossQty;
      
      return {
        ...item,
        baseQuantity: newBaseQty,
        quantity: newGrossQty,
        totalPrice: newGrossQty * item.unitPrice,
      };
    }));
  };
  
  // Handle base quantity change for essential materials (auto-updates waste)
  const handleBaseQuantityChange = (id: string, newBaseQty: number) => {
    setHasUnsavedChanges(true);
    setMaterialItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const quantityWithWaste = item.isEssential 
        ? Math.ceil(newBaseQty * (1 + DYNAMIC_WASTE)) 
        : newBaseQty;
      
      return {
        ...item,
        baseQuantity: newBaseQty,
        quantity: quantityWithWaste,
        totalPrice: quantityWithWaste * item.unitPrice,
      };
    }));
  };

  const handleItemChange = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string, 
    field: 'unitPrice' | 'quantity',
    value: number
  ) => {
    setHasUnsavedChanges(true);
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      newItem.totalPrice = newItem.quantity * newItem.unitPrice;
      return newItem;
    }));
  };

  const startEditing = (item: CostItem) => {
    setEditingId(item.id);
    setEditValues({
      item: item.item,
      quantity: item.quantity,
      baseQuantity: item.baseQuantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    });
  };

  const saveEdit = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string
  ) => {
    setHasUnsavedChanges(true);
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            ...editValues,
            totalPrice: (editValues.quantity || item.quantity) * (editValues.unitPrice || item.unitPrice)
          }
        : item
    ));
    setEditingId(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const deleteItem = (
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    id: string
  ) => {
    setHasUnsavedChanges(true);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Reset all changes to initial state
  const handleReset = () => {
    setMaterialItems(createInitialMaterialItems());
    setLaborItems(createInitialLaborItems());
    setOtherItems([]);
    setHasUnsavedChanges(false);
    toast.info(t("materials.reset", "Changes reset to original values"));
  };

  const addOtherItem = () => {
    if (!otherDescription.trim()) return;
    
    const newItem: CostItem = {
      id: `other-${Date.now()}`,
      item: otherDescription,
      quantity: otherQuantity,
      unit: otherUnit,
      unitPrice: otherUnitPrice,
      totalPrice: otherQuantity * otherUnitPrice,
    };
    
    setOtherItems(prev => [...prev, newItem]);
    setOtherDescription("");
    setOtherQuantity(1);
    setOtherUnit("pcs");
    setOtherUnitPrice(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Generate and download PDF cost breakdown
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const currentDate = new Date().toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      // Get tax rates based on project address
      const taxInfo = getCanadianTaxRates(projectAddress);
      const subtotal = grandTotal;
      
      // Calculate taxes
      let gstAmount = 0;
      let pstAmount = 0;
      let hstAmount = 0;
      let taxLabel = '';
      
      if (taxInfo.hst > 0) {
        hstAmount = subtotal * taxInfo.hst;
        taxLabel = `HST (${(taxInfo.hst * 100).toFixed(0)}%)`;
      } else {
        if (taxInfo.gst > 0) {
          gstAmount = subtotal * taxInfo.gst;
        }
        if (taxInfo.pst > 0) {
          pstAmount = subtotal * taxInfo.pst;
          taxLabel = taxInfo.provinceCode === 'QC' ? 'QST' : 'PST';
        }
      }
      
      const totalTax = gstAmount + pstAmount + hstAmount;
      const grandTotalWithTax = subtotal + totalTax;

      // Build cost breakdown items HTML - Compact
      const buildItemsHtml = (items: CostItem[], colorClass: string) => {
        if (items.length === 0) return '';
        return items.map(item => `
          <tr>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9px;">${item.item || ''}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 9px;">${(item.quantity || 0).toLocaleString()}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 9px;">${item.unit || ''}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 9px;">${formatCurrency(item.unitPrice || 0)}</td>
            <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; font-size: 9px; color: ${colorClass};">${formatCurrency(item.totalPrice || 0)}</td>
          </tr>
        `).join('');
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { 
              size: A4; 
              margin: 20mm; 
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              color: #1e293b; 
              line-height: 1.3; 
              font-size: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: auto; }
            tr { page-break-inside: avoid; break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            td, th { word-wrap: break-word; overflow: hidden; }
            /* Page break controls */
            .page-break { page-break-before: always; break-before: always; }
            .avoid-break { page-break-inside: avoid; break-inside: avoid; }
            .section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 12px; }
            .signature-block { page-break-inside: avoid; break-inside: avoid; }
            .footer-block { page-break-inside: avoid; break-inside: avoid; }
            .totals-block { page-break-inside: avoid; break-inside: avoid; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; padding: 15px;">
            <!-- Header with Company Branding - Compact -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  ${companyLogoUrl ? `
                    <img src="${companyLogoUrl}" alt="Logo" style="height: 40px; width: auto; max-width: 100px; object-fit: contain; background: white; padding: 4px; border-radius: 6px;" />
                  ` : ''}
                  <div>
                    <h1 style="font-size: 16px; font-weight: 700; margin-bottom: 2px;">${companyName || 'Cost Breakdown'}</h1>
                    ${companyName ? `<p style="font-size: 11px; opacity: 0.9;">Cost Breakdown</p>` : ''}
                    <p style="font-size: 11px; opacity: 0.8; margin-top: 2px;">${projectName}</p>
                    ${projectAddress ? `<p style="font-size: 9px; opacity: 0.7; margin-top: 2px;">📍 ${projectAddress}</p>` : ''}
                  </div>
                </div>
                <div style="text-align: right; font-size: 9px;">
                  <p style="opacity: 0.8;">${currentDate}</p>
                  <div style="margin-top: 4px; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; display: inline-block;">
                    <span style="font-weight: 600;">${taxInfo.provinceCode}</span>
                  </div>
                  ${(companyPhone || companyEmail) ? `
                    <p style="margin-top: 6px; opacity: 0.8;">
                      ${companyPhone ? `📞 ${companyPhone}` : ''}
                    </p>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Client Information Section -->
            ${clientInfo?.name ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 10px; font-weight: 600; color: #64748b; margin-bottom: 6px;">PREPARED FOR</div>
                <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${clientInfo.name}</div>
                ${clientInfo.email ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📧 ${clientInfo.email}</div>` : ''}
                ${clientInfo.phone ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📞 ${clientInfo.phone}</div>` : ''}
                ${clientInfo.address ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">📍 ${clientInfo.address}</div>` : ''}
              </div>
            ` : ''}

            <!-- Materials Section - Compact -->
            ${materialItems.length > 0 ? `
              <div class="section" style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px;">📦</span>
                  <h2 style="font-size: 12px; font-weight: 600; color: #1e40af;">Materials</h2>
                  <span style="background: #fef3c7; color: #b45309; font-size: 8px; padding: 2px 6px; border-radius: 3px; font-weight: 500;">
                    Waste: ${wastePercent}%
                  </span>
                  <span style="margin-left: auto; font-weight: 600; color: #1e40af; font-size: 11px;">${formatCurrency(materialsTotal)}</span>
                </div>
                <table style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 50px;">Qty</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40px;">Unit</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 70px;">Price</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(materialItems, '#1e40af')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Labor Section - Compact -->
            ${laborItems.length > 0 ? `
              <div class="section" style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px;">🔨</span>
                  <h2 style="font-size: 12px; font-weight: 600; color: #b45309;">Labor</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #b45309; font-size: 11px;">${formatCurrency(laborTotal)}</span>
                </div>
                <table style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 50px;">Qty</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40px;">Unit</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 70px;">Price</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(laborItems, '#b45309')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Other Section - Compact -->
            ${otherItems.length > 0 ? `
              <div class="section" style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px;">⋯</span>
                  <h2 style="font-size: 12px; font-weight: 600; color: #7c3aed;">Other</h2>
                  <span style="margin-left: auto; font-weight: 600; color: #7c3aed; font-size: 11px;">${formatCurrency(otherTotal)}</span>
                </div>
                <table style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">Description</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 50px;">Qty</th>
                      <th style="padding: 6px 8px; text-align: center; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 40px;">Unit</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 70px;">Price</th>
                      <th style="padding: 6px 8px; text-align: right; font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${buildItemsHtml(otherItems, '#7c3aed')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Summary & Grand Total with Tax - Beige styling -->
            <div class="totals-block avoid-break" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 6px; padding: 14px; margin-top: 16px;">
              <!-- Subtotals -->
              <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 10px;">
                  <span style="color: #78716c;">📦 Materials</span>
                  <span style="font-weight: 500;">${formatCurrency(materialsTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 10px;">
                  <span style="color: #78716c;">🔨 Labor</span>
                  <span style="font-weight: 500;">${formatCurrency(laborTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 10px;">
                  <span style="color: #78716c;">⋯ Other</span>
                  <span style="font-weight: 500;">${formatCurrency(otherTotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-weight: 600; font-size: 11px;">
                  <span style="color: #78350f;">Subtotal</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
              </div>

              <!-- Tax Section -->
              <div style="background: rgba(255,255,255,0.6); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                <div style="font-size: 9px; font-weight: 600; color: #78350f; margin-bottom: 4px;">📋 Tax (${taxInfo.provinceName})</div>
                ${taxInfo.hst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px;">
                    <span style="color: #78716c;">HST (${(taxInfo.hst * 100).toFixed(0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(hstAmount)}</span>
                  </div>
                ` : ''}
                ${taxInfo.gst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px;">
                    <span style="color: #78716c;">GST (${(taxInfo.gst * 100).toFixed(0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(gstAmount)}</span>
                  </div>
                ` : ''}
                ${taxInfo.pst > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px;">
                    <span style="color: #78716c;">${taxInfo.provinceCode === 'QC' ? 'QST' : 'PST'} (${(taxInfo.pst * 100).toFixed(taxInfo.provinceCode === 'QC' ? 3 : 0)}%)</span>
                    <span style="font-weight: 500;">${formatCurrency(pstAmount)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px dashed rgba(0,0,0,0.15); margin-top: 3px; font-size: 9px;">
                  <span style="color: #78350f; font-weight: 600;">Total Tax</span>
                  <span style="font-weight: 600;">${formatCurrency(totalTax)}</span>
                </div>
              </div>

              <!-- Grand Total -->
              <div style="border-top: 2px solid #b45309; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 14px; font-weight: 700; color: #78350f;">Grand Total</span>
                  <span style="font-size: 8px; color: #78716c; display: block;">(incl. tax)</span>
                </div>
                <span style="font-size: 18px; font-weight: 800; color: #78350f;">${formatCurrency(grandTotalWithTax)}</span>
              </div>
            </div>

            <!-- Client Signature Section - Compact -->
            <div class="signature-block avoid-break" style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; page-break-inside: avoid;">
              <h3 style="font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Client Approval</h3>
              <p style="font-size: 8px; color: #64748b; margin-bottom: 12px;">
                By signing below, client approves this cost breakdown for: <strong>${projectName}</strong>
              </p>
              
              <div style="display: flex; gap: 20px;">
                <!-- Client Signature -->
                <div style="flex: 1;">
                  <p style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Client Signature</p>
                  ${clientSignature ? `
                    ${clientSignature.type === 'drawn' ? `
                      <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; margin-bottom: 4px; background: white;">
                        <img src="${clientSignature.data}" alt="Client Signature" style="height: 40px; max-width: 100%; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="border-bottom: 1px solid #1e293b; padding: 8px 0; margin-bottom: 4px; font-family: 'Dancing Script', cursive; font-size: 20px; color: #1e293b;">
                        ${clientSignature.data}
                      </div>
                    `}
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="font-weight: 500;">${clientSignature.name || clientSignature.data}</span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="font-weight: 500;">${new Date(clientSignature.signedAt).toLocaleDateString('en-CA')}</span>
                      </div>
                    </div>
                  ` : `
                    <div style="border-bottom: 1px solid #1e293b; height: 35px; margin-bottom: 4px;"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 80px;"></span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 50px;"></span>
                      </div>
                    </div>
                  `}
                </div>
                
                <!-- Contractor Signature -->
                <div style="flex: 1;">
                  <p style="font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Contractor Signature</p>
                  ${contractorSignature ? `
                    ${contractorSignature.type === 'drawn' ? `
                      <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; margin-bottom: 4px; background: white;">
                        <img src="${contractorSignature.data}" alt="Contractor Signature" style="height: 40px; max-width: 100%; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="border-bottom: 1px solid #1e293b; padding: 8px 0; margin-bottom: 4px; font-family: 'Dancing Script', cursive; font-size: 20px; color: #1e293b;">
                        ${contractorSignature.data}
                      </div>
                    `}
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="font-weight: 500;">${contractorSignature.name || contractorSignature.data}</span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="font-weight: 500;">${new Date(contractorSignature.signedAt).toLocaleDateString('en-CA')}</span>
                      </div>
                    </div>
                  ` : `
                    <div style="border-bottom: 1px solid #1e293b; height: 35px; margin-bottom: 4px;"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 8px;">
                      <div>
                        <span style="color: #64748b;">Name: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 80px;"></span>
                      </div>
                      <div>
                        <span style="color: #64748b;">Date: </span>
                        <span style="border-bottom: 1px solid #94a3b8; display: inline-block; width: 50px;"></span>
                      </div>
                    </div>
                  `}
                </div>
              </div>
            </div>

            <!-- Footer with Company Branding - Compact -->
            <div class="footer-block avoid-break" style="margin-top: 16px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 12px; border-radius: 6px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${companyLogoUrl ? `
                    <img src="${companyLogoUrl}" alt="Logo" style="height: 24px; width: auto; max-width: 60px; object-fit: contain; background: white; padding: 2px; border-radius: 3px;" />
                  ` : ''}
                  <div>
                    <p style="font-weight: 600; font-size: 10px;">${companyName || 'BuildUnion'}</p>
                    ${companyPhone ? `<p style="font-size: 8px; opacity: 0.8;">📞 ${companyPhone}</p>` : ''}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8px; opacity: 0.8;">
                  <p style="font-style: italic;">Licensed & Insured</p>
                  <p>${currentDate}</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const filename = `cost-breakdown-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

      // First, save costs to database if onSave is available
      if (onSave) {
        try {
          await onSave({
            materials: materialItems,
            labor: laborItems,
            other: otherItems,
            grandTotal,
          });
          setHasUnsavedChanges(false);
          setCurrentDataSource('saved');
        } catch (saveError) {
          console.error("Save error:", saveError);
        }
      }

      // Generate PDF blob for storage upload
      console.log("[Cost Breakdown] Generating PDF blob...");
      const pdfBlob = await generatePDFBlob(htmlContent, {
        filename,
        pageFormat: 'a4',
        margin: 10
      });
      console.log("[Cost Breakdown] PDF blob generated:", { size: pdfBlob.size, type: pdfBlob.type });

      // Save to storage and register in documents table if projectId is provided
      if (projectId) {
        // Get current user for proper file path
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("[Cost Breakdown] No authenticated user found");
          toast.error("Authentication required to save document");
          setIsExporting(false);
          return;
        }

        const filePath = `${user.id}/${projectId}/${filename}`;
        console.log("[Cost Breakdown] Saving to storage path:", filePath);
        
        // Check for existing cost breakdown and remove it
        const { data: existingDocs, error: fetchError } = await supabase
          .from("project_documents")
          .select("id, file_path")
          .eq("project_id", projectId)
          .ilike("file_name", "%Cost Breakdown%");
        
        console.log("[Cost Breakdown] Existing docs check:", { existingDocs, fetchError });
        
        if (existingDocs && existingDocs.length > 0) {
          for (const doc of existingDocs) {
            console.log("[Cost Breakdown] Removing old file:", doc.file_path);
            await supabase.storage.from("project-documents").remove([doc.file_path]);
            await supabase.from("project_documents").delete().eq("id", doc.id);
          }
        }

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("project-documents")
          .upload(filePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        console.log("[Cost Breakdown] Storage upload result:", { uploadError, uploadData });

        if (uploadError) {
          console.error("[Cost Breakdown] Upload failed:", uploadError);
          toast.error(`Failed to save document: ${uploadError.message}`);
        } else {
          const { data: insertData, error: insertError } = await supabase
            .from("project_documents")
            .insert({
              project_id: projectId,
              file_name: `Cost Breakdown - ${projectName}.pdf`,
              file_path: filePath,
              file_size: pdfBlob.size,
            })
            .select()
            .single();
          
          console.log("[Cost Breakdown] Document record insert:", { insertData, insertError });
          
          if (insertError) {
            console.error("[Cost Breakdown] DB insert failed:", insertError);
            toast.error(`Failed to register document: ${insertError.message}`);
          } else {
            console.log("[Cost Breakdown] Document saved successfully:", insertData);
            
            // ===== AI REFERENCE UPDATE =====
            // Update ai_workflow_config to point to this new document as the budget reference
            // This ensures AI Project Health uses the latest budget version
            const changeOrderTimestamp = new Date().toISOString();
            const isChangeOrder = dataSource === 'saved' || hasUnsavedChanges;
            
            // ===== APPROVAL GATE LOGIC =====
            // If user is NOT the owner, create pending approval instead of immediate update
            if (!isOwner && projectOwnerId && isChangeOrder) {
              // Get current summary to read previous budget
              const { data: currentSummary } = await supabase
                .from("project_summaries")
                .select("ai_workflow_config, total_cost")
                .eq("project_id", projectId)
                .single();
              
              const currentConfig = currentSummary?.ai_workflow_config as Record<string, unknown> || {};
              const previousGrandTotal = (currentConfig.grandTotal as number) || currentSummary?.total_cost || 0;
              
              // Create pending approval request
              const pendingChange = {
                submittedBy: user?.id || '',
                submittedByName: user?.email?.split('@')[0] || 'Team Member',
                submittedAt: changeOrderTimestamp,
                proposedGrandTotal: grandTotalWithTax,
                previousGrandTotal,
                proposedLineItems: {
                  materials: materialItems.map(m => ({ item: m.item, totalPrice: m.totalPrice })),
                  labor: laborItems.map(l => ({ item: l.item, totalPrice: l.totalPrice })),
                  other: otherItems.map(o => ({ item: o.item, totalPrice: o.totalPrice }))
                },
                reason: 'Budget modification by team member',
                status: 'pending' as const
              };
              
              // Get existing document registry for pending doc registration
              const existingRegistry = (currentConfig.documentRegistry as Array<Record<string, unknown>>) || [];
              const sourceId = `BC-${String(existingRegistry.filter(d => d.documentType === 'budget-change').length + 1).padStart(3, '0')}`;
              
              const pendingDocEntry = {
                id: insertData.id,
                documentType: 'budget-change-pending',
                fileName: `Cost Breakdown - ${projectName}.pdf`,
                filePath,
                savedAt: changeOrderTimestamp,
                fileSize: pdfBlob.size,
                linkedPillar: 'materials',
                sourceId,
                isPending: true,
              };
              
              const updatedRegistry = [...existingRegistry, pendingDocEntry];
              
              // Create JSON-safe config
              const pendingConfig = JSON.parse(JSON.stringify({
                ...currentConfig,
                pendingBudgetChange: pendingChange,
                latestPendingDocId: insertData.id,
                latestPendingDocPath: filePath,
                documentRegistry: updatedRegistry,
                lastDocumentUpdate: changeOrderTimestamp,
              }));
              
              const { error: pendingError } = await supabase
                .from("project_summaries")
                .update({
                  ai_workflow_config: pendingConfig,
                  updated_at: changeOrderTimestamp
                })
                .eq("project_id", projectId);
              
              if (pendingError) {
                console.error("[Cost Breakdown] Failed to create pending approval:", pendingError);
                toast.error("Failed to submit budget change for approval");
              } else {
                console.log("[Cost Breakdown] Pending approval created");
                
                // Send message to owner about pending approval
                await supabase
                  .from("team_messages")
                  .insert({
                    sender_id: user?.id,
                    recipient_id: projectOwnerId,
                    message: `📋 Budget Change Request for "${projectName}"\n\nProposed: $${grandTotalWithTax.toFixed(2)} (was: $${previousGrandTotal.toFixed(2)})\n\nPlease review and approve in your Owner Dashboard.`,
                    is_read: false
                  });
                
                toast.success("Budget change submitted for owner approval 📋", { 
                  description: "The owner will be notified and can approve in their dashboard.",
                  duration: 5000 
                });
                
                // Update local state immediately so banner shows
                setLocalPendingApproval({
                  isPending: true,
                  submittedAt: new Date().toISOString(),
                  proposedTotal: grandTotalWithTax,
                });
                
                onPendingApprovalCreated?.();
              }
            } else {
              // Owner or initial save - direct update
              // IMPORTANT: Fetch current config to preserve existing fields (like pendingBudgetChange)
              const { data: existingSummary } = await supabase
                .from("project_summaries")
                .select("ai_workflow_config")
                .eq("project_id", projectId)
                .single();
              
              const existingConfig = (existingSummary?.ai_workflow_config as Record<string, unknown>) || {};
              
              // Get existing document registry or create new one
              const existingRegistry = (existingConfig.documentRegistry as Array<Record<string, unknown>>) || [];
              
              // Create new document registry entry for citation tracking
              const documentType = isChangeOrder ? 'budget-change' : 'cost-breakdown';
              const sourceId = `CB-${String(existingRegistry.filter(d => d.documentType === 'cost-breakdown' || d.documentType === 'budget-change').length + 1).padStart(3, '0')}`;
              
              const newRegistryEntry = {
                id: insertData.id,
                documentType,
                fileName: `Cost Breakdown - ${projectName}.pdf`,
                filePath,
                savedAt: changeOrderTimestamp,
                fileSize: pdfBlob.size,
                linkedPillar: 'materials',
                sourceId,
              };
              
              // Update registry with new entry
              const updatedRegistry = [...existingRegistry, newRegistryEntry];
              
              // Build latest documents map
              const latestDocuments = { ...(existingConfig.latestDocuments as Record<string, unknown>) || {} };
              latestDocuments[documentType] = newRegistryEntry;
              
              // Create JSON-safe config by using JSON parse/stringify
              const newConfig = JSON.parse(JSON.stringify({
                ...existingConfig, // Preserve existing fields (pendingBudgetChange, etc.)
                latestBudgetDocId: insertData.id,
                latestBudgetPath: filePath,
                budgetUpdatedAt: changeOrderTimestamp,
                budgetVersion: isChangeOrder ? 'change_order' : 'initial',
                grandTotal: grandTotalWithTax,
                subtotal: grandTotal,
                taxAmount: totalTax,
                // Document registry for citations
                documentRegistry: updatedRegistry,
                latestDocuments,
                lastDocumentUpdate: changeOrderTimestamp,
                changeOrderHistory: [{
                  timestamp: changeOrderTimestamp,
                  documentId: insertData.id,
                  grandTotal: grandTotalWithTax,
                  reason: isChangeOrder ? 'Manual budget adjustment' : 'Initial budget creation'
                }]
              }));
              
              const { error: summaryUpdateError } = await supabase
                .from("project_summaries")
                .update({
                  ai_workflow_config: newConfig,
                  total_cost: grandTotalWithTax, // Sync gross total to summary
                  updated_at: changeOrderTimestamp
                })
                .eq("project_id", projectId);
              
              if (summaryUpdateError) {
                console.error("[Cost Breakdown] Failed to update AI reference:", summaryUpdateError);
              } else {
                console.log(`[Cost Breakdown] Document registered: ${sourceId} -> ${documentType}`);
                if (isChangeOrder) {
                  toast.success("Budget updated - Change Order registered ✓", { duration: 3000 });
                }
              }
            }
          }
        }
      } else {
        console.warn("[Cost Breakdown] No projectId provided, skipping storage upload");
      }

      // Also download the PDF locally
      await downloadPDF(htmlContent, {
        filename,
        pageFormat: 'a4',
        margin: 10
      });

      toast.success(t("materials.savedAndExported", "Cost breakdown saved & exported to PDF"));
    } catch (error) {
      console.error("[Cost Breakdown] PDF export error:", error);
      toast.error(t("materials.pdfError", "Failed to export PDF"));
    } finally {
      setIsExporting(false);
    }
  };

  // Mobile-responsive item row - uses cards on mobile, grid on desktop
  const renderItemRow = (
    item: CostItem, 
    setItems: React.Dispatch<React.SetStateAction<CostItem[]>>,
    isEditing: boolean
  ) => {
    // Safety guard for invalid items
    if (!item || !item.id) return null;
    
    return (
    <div 
      key={item.id}
      className={cn(
        "py-3 px-3 rounded-lg transition-colors",
        isEditing ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
      )}
    >
      {isEditing ? (
        // Edit mode - stack on mobile
        <div className="space-y-3">
          <Input
            value={editValues.item || ""}
            onChange={(e) => setEditValues(prev => ({ ...prev, item: e.target.value }))}
            className="h-9 text-sm"
            placeholder={t("materials.description", "Description")}
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("materials.quantity", "Qty")}</label>
              <Input
                type="text"
                inputMode="decimal"
                defaultValue={editValues.quantity || 0}
                onBlur={(e) => setEditValues(prev => ({ ...prev, quantity: parseFloat(e.target.value.replace(',', '.')) || 0 }))}
                className="h-9 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("materials.unit", "Unit")}</label>
              <Input
                value={editValues.unit || ""}
                onChange={(e) => setEditValues(prev => ({ ...prev, unit: e.target.value }))}
                className="h-9 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("materials.unitPrice", "Price")}</label>
              <Input
                type="text"
                inputMode="decimal"
                defaultValue={editValues.unitPrice || ''}
                onBlur={(e) => setEditValues(prev => ({ ...prev, unitPrice: parseFloat(e.target.value.replace(',', '.')) || 0 }))}
                className="h-9 text-sm text-right"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("materials.total", "Total")}: {formatCurrency((editValues.quantity || 0) * (editValues.unitPrice || 0))}
            </span>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1"
                onClick={() => saveEdit(setItems, item.id)}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("common.save", "Save")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={cancelEdit}
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("common.cancel", "Cancel")}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // View mode - responsive layout with UNIT CONVERSION + COVERAGE
        // DATA LOCK: When dataSource='saved', show EXACTLY what user saved - no coverage inference
        (() => {
          // Get converted display values based on current unit system (IMP/MET toggle)
          const displayVals = getDisplayValues(item);
          const displayBaseQty = getDisplayBaseQuantity(item);
          
          // DATA LOCK: DISABLE coverage badge/logic for saved data - user's values are authoritative
          const isSavedData = currentDataSource === 'saved';
          
          // Get coverage info for this material (sq ft per box, gallon, etc.)
          // ONLY apply for AI/tasks data - saved data shows raw user values
          const coverageInfo = !isSavedData ? getMaterialCoverage(item.item) : null;
          const hasCoverage = !isSavedData && coverageInfo && coverageInfo.coveragePerUnit > 1;
          
          // Convert coverage to metric if needed
          const displayCoverage = hasCoverage 
            ? (isMetric 
                ? (coverageInfo!.coveragePerUnit * 0.092903).toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                : coverageInfo!.coveragePerUnit.toLocaleString())
            : null;
          const coverageUnit = isMetric ? t("units.sq_m", "sq m") : t("units.sq_ft", "sq ft");
          
          // Calculate price per area (e.g., $/sq ft or $/sq m)
          // For saved data: allow direct display of user's values
          const pricePerArea = hasCoverage && item.unitPrice > 0
            ? item.unitPrice / coverageInfo!.coveragePerUnit
            : null;
          const displayPricePerArea = pricePerArea 
            ? (isMetric 
                ? pricePerArea / 0.092903 // Convert $/sq ft to $/sq m
                : pricePerArea)
            : null;
          
          return (
            <div className="space-y-2">
              {/* Row 1: Description + Coverage Badge + Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm break-words">{item.item}</span>
                    {/* IRON LAW #1: ALWAYS show waste badge for essential materials */}
                    {item.isEssential && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 shrink-0">
                        +{wastePercent}%
                      </Badge>
                    )}
                    {/* Coverage badge - shows sq ft/unit or sq m/unit - ONLY for AI/tasks data */}
                    {hasCoverage && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 shrink-0 font-mono">
                        {displayCoverage} {coverageUnit}/{(item.unit || 'unit').replace(/s$/, '')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => startEditing(item)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteItem(setItems, item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              {/* Row 2: Qty/Unit + Price columns - using CONVERTED display values */}
              {/* IRON LAW #1: For essential materials, show NET area → GROSS (boxes/gallons) from resolver */}
              {/* CRITICAL FIX: DO NOT recalculate here - use the resolver's calculated values! */}
              {(() => {
                // IRON LAW #1 + QUANTITY RESOLVER:
                // - baseQuantity = NET area in sq ft (e.g., 1350 sq ft)
                // - quantity = GROSS units (boxes, gallons, rolls) from resolver (e.g., 68 boxes)
                // 
                // CRITICAL: We do NOT multiply quantity by waste% here because:
                // 1. The resolver already applied waste% when converting area → units
                // 2. item.quantity is already the FINAL value to display and order
                //
                // For display purposes:
                // - NET: baseQuantity (the original area: 1350 sq ft)
                // - GROSS: quantity (the final unit count: 68 boxes) - NO recalculation!
                
                const netAreaSqFt = item.baseQuantity ?? baseArea ?? item.quantity;
                const displayGross = item.quantity; // ALREADY calculated by resolver - DO NOT MODIFY
                const displayNet = netAreaSqFt;
                
                return (
                  <div className="grid grid-cols-4 gap-2 items-center">
                    {/* Quantity + Unit - IRON LAW #1 DISPLAY FORMAT */}
                    <div className="text-sm text-muted-foreground">
                      {/* IRON LAW #1 FORMAT: NET → GROSS → waste% for essential materials */}
                      {item.isEssential ? (
                        <div className="space-y-0.5">
                          {/* Row 1: NET quantity (base install area) */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">{displayNet.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              NET
                            </Badge>
                          </div>
                          {/* Row 2: GROSS quantity (CALCULATED with waste) - EDITABLE, this is ORDER amount */}
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              key={`gross-${item.id}-${displayGross}`}
                              defaultValue={displayGross}
                              onBlur={(e) => handleGrossQuantityChange(item.id, parseFloat(e.target.value.replace(',', '.')) || 0)}
                              className="h-6 w-14 text-xs text-center p-0.5 border-dashed font-semibold text-green-700 dark:text-green-400"
                              title={t("materials.editGrossQty", "Edit order quantity (with waste)")}
                            />
                            <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">
                              GROSS
                            </Badge>
                          </div>
                          {/* Row 3: Waste % indicator */}
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
                            +{wastePercent}% waste
                          </Badge>
                        </div>
                      ) : isSavedData ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            defaultValue={item.quantity || ''}
                            onBlur={(e) => handleGrossQuantityChange(item.id, parseFloat(e.target.value.replace(',', '.')) || 0)}
                            className="h-7 w-16 text-xs text-center p-1 border-dashed font-medium"
                            title={t("materials.editQty", "Edit quantity")}
                          />
                          <span className="text-xs">{item.unit}</span>
                        </div>
                      ) : hasCoverage ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              defaultValue={item.quantity || ''}
                              onBlur={(e) => handleGrossQuantityChange(item.id, parseFloat(e.target.value.replace(',', '.')) || 0)}
                              className="h-7 w-14 text-xs text-center p-1 border-dashed font-medium"
                              title={t("materials.editGrossQty", "Edit order quantity (gross)")}
                            />
                            <span className="text-xs">{item.unit}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            → {displayBaseQty?.toLocaleString(undefined, { maximumFractionDigits: 1 })} {coverageUnit}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            defaultValue={item.quantity || ''}
                            onBlur={(e) => handleGrossQuantityChange(item.id, parseFloat(e.target.value.replace(',', '.')) || 0)}
                            className="h-7 w-14 text-xs text-center p-1 border-dashed font-medium"
                            title={t("materials.editQty", "Edit quantity")}
                          />
                          <span className="text-xs">{item.unit || ''}</span>
                        </div>
                      )}
                    </div>
                
                    {/* Unit Price (per box/gallon) */}
                    <div className="text-sm text-center">
                      {item.unitPrice > 0 ? (
                        <div className="space-y-0.5">
                          <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                          <span className="text-[10px] text-muted-foreground block">/{(item.unit || 'unit').replace(/s$/, '')}</span>
                        </div>
                      ) : (
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={item.unitPrice || ''}
                          onBlur={(e) => handleItemChange(setItems, item.id, 'unitPrice', parseFloat(e.target.value.replace(',', '.')) || 0)}
                          className="h-7 text-xs text-right w-full"
                          placeholder="$0"
                        />
                      )}
                    </div>
                    
                    {/* Price per Area ($/sq ft or $/sq m) - Toronto standard */}
                    <div className="text-sm text-center">
                      {displayPricePerArea ? (
                        <div className="space-y-0.5">
                          <span className="font-medium text-green-700 dark:text-green-400">
                            {formatCurrency(displayPricePerArea)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">/{coverageUnit}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                    
                    {/* Total - IRON LAW #1: Use GROSS × unitPrice */}
                    <div className="text-right font-medium text-sm">
                      {item.isEssential ? (
                        formatCurrency(displayGross * item.unitPrice)
                      ) : (
                        item.totalPrice > 0 ? formatCurrency(item.totalPrice) : "-"
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()
      )}
    </div>
  );
  };

  // Table header - only shown on desktop - now 4 columns with Price/Area
  const TableHeader = () => (
    <div className="hidden md:grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b">
      <div>{t("materials.description", "Description")}</div>
      <div className="text-center">{t("materials.qtyUnit", "Qty/Unit")}</div>
      <div className="text-center">{t("materials.unitPrice", "Unit Price")}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center">{t("materials.pricePerArea", "Price/Area")}</div>
        <div className="text-right">{t("materials.total", "Total")}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Pending Approval Banner for non-owners (Team members: Foreman, Subcontractor, Inspector) */}
      {!isOwner && localPendingApproval?.isPending && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-amber-950/40 p-4 dark:bg-gradient-to-r dark:from-amber-950/40 dark:via-slate-900/80 dark:to-amber-950/40 light:bg-gradient-to-r light:from-amber-100 light:via-amber-50 light:to-amber-100">
          {/* Animated border glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 dark:bg-amber-500/20 light:bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Budget Change Pending Approval</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your proposed budget of <span className="font-medium text-amber-700 dark:text-amber-400">{formatCurrency(localPendingApproval.proposedTotal || 0)}</span> is waiting for owner approval.
                {localPendingApproval.submittedAt && (
                  <span className="ml-1 text-amber-600/70 dark:text-amber-400/70">
                    • Submitted {new Date(localPendingApproval.submittedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50 animate-pulse">
              ⏳ Pending
            </Badge>
          </div>
        </div>
      )}

      {/* Header - stacked on mobile */}
      <div className="space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-base md:text-lg font-semibold">
              {t("materials.calculation", "Cost Breakdown")}
            </h3>
          </div>
          {/* Data source indicator + Data Lock badge */}
          <div className="flex items-center gap-1">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs shrink-0",
                currentDataSource === 'saved' 
                  ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
                  : currentDataSource === 'ai'
                  ? "border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
                  : "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
              )}
            >
              {currentDataSource === 'saved' 
                ? "💾 Saved" 
                : currentDataSource === 'ai' 
                ? "🤖 AI" 
                : "📋 Tasks"}
            </Badge>
            {/* DATA LOCK INDICATOR - shows when data is protected */}
            {dataLock.isLocked && (
              <Badge 
                variant="outline" 
                className="text-xs shrink-0 border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                title={t("dataLock.protected", "Adatok védve a háttérfolyamatoktól")}
              >
                <Lock className="h-3 w-3 mr-1" />
                {t("dataLock.locked", "Locked")}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Badges + Actions row - wrap on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs md:text-sm">
            {materialItems.length + laborItems.length + otherItems.length} {t("materials.items", "items")}
          </Badge>
          {/* Show project total for reference */}
          <Badge 
            variant="outline" 
            className="text-xs md:text-sm border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
          >
            {formatCurrency(projectTotal)}
          </Badge>
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <Badge 
              variant="outline" 
              className="text-xs md:text-sm border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse"
            >
              {t("materials.unsaved", "Unsaved")}
            </Badge>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasUnsavedChanges}
              className="h-8 px-2 md:px-3"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t("materials.reset", "Reset")}</span>
            </Button>
            {/* Save & Export PDF Button */}
            <Button
              variant="default"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="h-8 px-2 md:px-3"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-1">{t("materials.saveAndExportPdf", "Save & Export")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Materials Section */}
      <Collapsible open={materialsOpen} onOpenChange={setMaterialsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  {t("materials.materialsSection", "Materials")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {materialItems.length}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                    {t("materials.wasteBuffer", "Waste")}: {wastePercent.toFixed(0)}%
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-600">
                    {formatCurrency(materialsTotal)}
                  </span>
                  {materialsOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <TableHeader />
              {materialItems.filter(item => item && item.id).map((item) => 
                renderItemRow(item, setMaterialItems, editingId === item.id)
              )}
              {materialItems.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("materials.noMaterials", "No materials")}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Labor Section */}
      <Collapsible open={laborOpen} onOpenChange={setLaborOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-amber-500" />
                  {t("materials.laborSection", "Labor")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {laborItems.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-amber-600">
                    {formatCurrency(laborTotal)}
                  </span>
                  {laborOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <TableHeader />
              {laborItems.filter(item => item && item.id).map((item) => 
                renderItemRow(item, setLaborItems, editingId === item.id)
              )}
              {laborItems.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Hammer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("materials.noLabor", "No labor costs")}</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Other Section */}
      <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <CardTitle className="text-base flex items-center gap-2">
                  <MoreHorizontal className="h-4 w-4 text-purple-500" />
                  {t("materials.otherSection", "Other")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {otherItems.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-purple-600">
                    {formatCurrency(otherTotal)}
                  </span>
                  {otherOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {otherItems.length > 0 && (
                <>
                  <TableHeader />
                  {otherItems.filter(item => item && item.id).map((item) => 
                    renderItemRow(item, setOtherItems, editingId === item.id)
                  )}
                </>
              )}
              
              {/* Add Other Item Form */}
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-3">
                  {t("materials.addOtherHint", "Add delivery fees, permits, equipment rental, etc.")}
                </p>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.description", "Description")}
                    </label>
                    <Input
                      value={otherDescription}
                      onChange={(e) => setOtherDescription(e.target.value)}
                      placeholder={t("materials.enterDescription", "Enter description...")}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.quantity", "Quantity")}
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      defaultValue={otherQuantity || 1}
                      onBlur={(e) => setOtherQuantity(parseFloat(e.target.value.replace(',', '.')) || 1)}
                      className="h-9 text-center"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.unit", "Unit")}
                    </label>
                    <Input
                      value={otherUnit}
                      onChange={(e) => setOtherUnit(e.target.value)}
                      className="h-9 text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t("materials.unitPrice", "Unit Price")}
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      defaultValue={otherUnitPrice || ''}
                      onBlur={(e) => setOtherUnitPrice(parseFloat(e.target.value.replace(',', '.')) || 0)}
                      className="h-9 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium py-2">
                    {formatCurrency(otherQuantity * otherUnitPrice)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={addOtherItem}
                      disabled={!otherDescription.trim()}
                      size="sm"
                      className="w-full h-9"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Client Signature Section - Only show in Team Mode (not Solo) */}
      {!isSoloMode && (
        <Collapsible open={signatureOpen} onOpenChange={setSignatureOpen}>
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-green-600" />
                    {t("materials.signatures", "Signatures")}
                    {(clientSignature || contractorSignature) && (
                      <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                        <Check className="h-3 w-3 mr-1" />
                        {clientSignature && contractorSignature ? '2/2' : '1/2'}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {signatureOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-4 border border-green-100 dark:border-green-900 space-y-6">
                  <p className="text-xs text-muted-foreground">
                    {t("materials.signatureHint", "Capture signatures for cost breakdown approval. Draw or type signatures below.")}
                  </p>
                  
                  {/* Dual Signature Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Client Signature */}
                    <div className="space-y-2">
                      <SignatureCapture
                        onSignatureChange={setClientSignature}
                        label={t("materials.clientApproval", "Client Signature")}
                        placeholder={t("materials.typeClientName", "Type client's full name")}
                      />
                    </div>
                    
                    {/* Contractor Signature */}
                    <div className="space-y-2">
                      <SignatureCapture
                        onSignatureChange={setContractorSignature}
                        label={t("materials.contractorApproval", "Contractor Signature")}
                        placeholder={t("materials.typeContractorName", "Type contractor's full name")}
                      />
                    </div>
                  </div>
                  
                  {/* Status Summary */}
                  {(clientSignature || contractorSignature) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-green-200 dark:border-green-800">
                      {clientSignature && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                          <Check className="h-3 w-3 mr-1" />
                          Client signed
                        </Badge>
                      )}
                      {contractorSignature && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                          <Check className="h-3 w-3 mr-1" />
                          Contractor signed
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Grand Total - matching project total with beige background and tax */}
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="py-4">
          {(() => {
            const taxInfo = getCanadianTaxRates(projectAddress);
            const subtotal = grandTotal;
            const gstAmount = taxInfo.gst > 0 ? subtotal * taxInfo.gst : 0;
            const pstAmount = taxInfo.pst > 0 ? subtotal * taxInfo.pst : 0;
            const hstAmount = taxInfo.hst > 0 ? subtotal * taxInfo.hst : 0;
            const totalTax = gstAmount + pstAmount + hstAmount;
            const grandTotalWithTax = subtotal + totalTax;

            return (
              <div className="space-y-3">
                {/* Section subtotals */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    <span>Materials</span>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(materialsTotal)}</div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hammer className="h-3.5 w-3.5 text-amber-500" />
                    <span>Labor</span>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(laborTotal)}</div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MoreHorizontal className="h-3.5 w-3.5 text-purple-500" />
                    <span>Other</span>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(otherTotal)}</div>
                </div>
                
                {/* Subtotal */}
                <div className="border-t border-amber-300 dark:border-amber-700 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-800 dark:text-amber-300 font-medium">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                {/* Tax Region & Breakdown */}
                {projectAddress && (
                  <div className="bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        Tax Region: {taxInfo.provinceName} ({taxInfo.provinceCode})
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      {taxInfo.hst > 0 && (
                        <>
                          <span className="text-amber-700/80 dark:text-amber-400/80">
                            HST ({(taxInfo.hst * 100).toFixed(0)}%)
                          </span>
                          <span className="text-right font-medium">{formatCurrency(hstAmount)}</span>
                        </>
                      )}
                      {taxInfo.gst > 0 && (
                        <>
                          <span className="text-amber-700/80 dark:text-amber-400/80">
                            GST ({(taxInfo.gst * 100).toFixed(0)}%)
                          </span>
                          <span className="text-right font-medium">{formatCurrency(gstAmount)}</span>
                        </>
                      )}
                      {taxInfo.pst > 0 && (
                        <>
                          <span className="text-amber-700/80 dark:text-amber-400/80">
                            {taxInfo.provinceCode === 'QC' ? 'QST' : 'PST'} ({(taxInfo.pst * 100).toFixed(taxInfo.provinceCode === 'QC' ? 3 : 0)}%)
                          </span>
                          <span className="text-right font-medium">{formatCurrency(pstAmount)}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex justify-between text-sm border-t border-dashed border-amber-300 dark:border-amber-600 pt-1">
                      <span className="text-amber-800 dark:text-amber-300 font-medium">Total Tax</span>
                      <span className="font-semibold">{formatCurrency(totalTax)}</span>
                    </div>
                  </div>
                )}
                
                {/* Divider */}
                <div className="border-t-2 border-amber-400 dark:border-amber-600" />
                
                {/* Grand Total with Tax */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    <div>
                      <span className="font-semibold text-lg text-amber-900 dark:text-amber-200">
                        {t("materials.grandTotal", "Grand Total")}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 block">
                        (incl. tax)
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {formatCurrency(grandTotalWithTax)}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
      
      {/* Impact Warning Dialog - shown when system changes would affect locked data */}
      <ImpactWarningDialog
        open={impactWarning.open}
        onOpenChange={(open) => setImpactWarning(prev => ({ ...prev, open }))}
        impactType={impactWarning.type}
        onConfirm={() => {
          impactWarning.onConfirm();
          setImpactWarning(prev => ({ ...prev, open: false }));
        }}
        onCancel={() => setImpactWarning(prev => ({ ...prev, open: false }))}
        affectedItemsCount={impactWarning.affectedCount}
        estimatedChange={impactWarning.estimatedChange}
      />
    </div>
  );
}
