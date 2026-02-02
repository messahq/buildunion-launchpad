// ============================================
// POWER EDIT MODAL
// Atomic Area & Materials & Waste % Editor
// ============================================
//
// ==================== 3 IRON LAWS ====================
//
// 1. DYNAMIC CALCULATION:
//    When waste% changes → ALL essential materials recalculate
//    Formula: QTY = baseArea × (1 + wastePercent/100)
//    See: handleWastePercentChange() for live recalculation
//
// 2. STATE PERSISTENCE:
//    wastePercent saved to BOTH:
//    - photo_estimate.wastePercent
//    - ai_workflow_config.userEdits.wastePercent
//    This ensures it loads correctly on project reload.
//
// 3. DUAL LOGIC:
//    Materials use GROSS (with waste), Labor uses NET (base only)
//    This modal only edits materials - labor is handled separately.
//
// =====================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Ruler, 
  Package, 
  Save, 
  RefreshCw, 
  Loader2, 
  Plus, 
  Trash2,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Material {
  item: string;
  quantity: number;
  unit: string;
}

interface PowerEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Current values
  currentArea: number | null;
  areaUnit: string;
  currentMaterials: Material[];
  currentWastePercent?: number;
  // Callbacks for atomic save - now includes wastePercent
  onSaveAndSync: (area: number, materials: Material[], wastePercent: number) => Promise<void>;
  // Optional: surface type for context
  surfaceType?: string;
}

// Essential materials that should scale with area (get +10% waste)
const ESSENTIAL_MATERIAL_PATTERNS = [
  'flooring', 'tile', 'hardwood', 'laminate', 'vinyl', 'carpet',
  'drywall', 'sheetrock', 'plywood', 'osb',
  'underlayment', 'vapor barrier', 'membrane',
  'paint', 'primer', 'stain',
  'insulation', 'batt',
  'padlóburkolat', 'csempe', 'laminált', 'parketta',
  'gipszkarton', 'festék', 'alapozó', 'szigetelés'
];

function isEssentialMaterial(itemName: string): boolean {
  const lower = itemName.toLowerCase();
  return ESSENTIAL_MATERIAL_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * COVERAGE MAP: Realistic coverage per unit for different material types
 * Mirrors the map from MaterialCalculationTab.tsx for display purposes
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
  // Carpet - 12x12 = 144 sq ft
  'carpet': { coveragePerUnit: 144, targetUnit: 'sq yards' },
  // Adhesive/glue - gallon covers ~200 sq ft
  'adhesive': { coveragePerUnit: 200, targetUnit: 'gallons' },
  'glue': { coveragePerUnit: 200, targetUnit: 'gallons' },
};

/**
 * Get coverage info for a material item
 */
function getMaterialCoverage(itemName: string): CoverageInfo | null {
  const lowerName = itemName.toLowerCase();
  for (const [keyword, coverage] of Object.entries(MATERIAL_COVERAGE_MAP)) {
    if (lowerName.includes(keyword)) {
      return coverage;
    }
  }
  return null;
}

/**
 * Calculate coverage-based quantity from gross area
 */
function calculateCoverageQuantity(grossArea: number, itemName: string): { 
  qty: number; 
  unit: string; 
  formula: string | null;
  coverage: CoverageInfo | null;
} {
  const coverage = getMaterialCoverage(itemName);
  if (coverage && coverage.coveragePerUnit > 1) {
    const qty = Math.ceil(grossArea / coverage.coveragePerUnit);
    return {
      qty,
      unit: coverage.targetUnit,
      formula: `${grossArea.toLocaleString()} sq ft ÷ ${coverage.coveragePerUnit} = ${qty} ${coverage.targetUnit}`,
      coverage
    };
  }
  return { qty: grossArea, unit: 'sq ft', formula: null, coverage: null };
}

export default function PowerEditModal({
  open,
  onOpenChange,
  currentArea,
  areaUnit,
  currentMaterials,
  currentWastePercent = 10,
  onSaveAndSync,
  surfaceType = "unknown"
}: PowerEditModalProps) {
  // Local state for editing
  const [editArea, setEditArea] = useState<number>(currentArea || 0);
  const [editMaterials, setEditMaterials] = useState<Material[]>([]);
  const [wastePercent, setWastePercent] = useState<number>(currentWastePercent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // Sync local state when modal opens or props change
  // IMPORTANT: Initialize essential materials with GROSS values (base * (1 + waste%))
  useEffect(() => {
    if (open) {
      const baseArea = currentArea || 0;
      const waste = currentWastePercent;
      
      // Calculate gross quantities for essential materials
      const grossMaterials = currentMaterials.map(mat => {
        const isEssential = isEssentialMaterial(mat.item) || mat.unit === "sq ft" || mat.unit === "sq m";
        if (isEssential && baseArea > 0) {
          // Calculate gross quantity: baseArea * (1 + waste%)
          const grossQuantity = Math.ceil(baseArea * (1 + waste / 100));
          return { ...mat, quantity: grossQuantity };
        }
        return { ...mat };
      });
      
      setEditArea(baseArea);
      setEditMaterials(grossMaterials);
      setWastePercent(waste);
      setHasChanges(false);
    }
  }, [open, currentArea, currentMaterials, currentWastePercent]);

  // Calculate waste buffer based on wastePercent
  const wasteBuffer = Math.round(editArea * (wastePercent / 100));
  const totalWithWaste = editArea + wasteBuffer;

  // Track previous values with refs to avoid stale closures
  const previousAreaRef = useRef<number>(editArea);
  const previousWasteRef = useRef<number>(wastePercent);

  // Update refs when state changes
  useEffect(() => {
    previousAreaRef.current = editArea;
  }, [editArea]);

  useEffect(() => {
    previousWasteRef.current = wastePercent;
  }, [wastePercent]);

  // Handle waste percent change - recalculate all essential material quantities
  const handleWastePercentChange = useCallback((newPercent: number) => {
    const clampedPercent = Math.max(0, Math.min(50, newPercent)); // Clamp between 0-50%
    
    setWastePercent(prevWaste => {
      if (prevWaste !== clampedPercent) {
        // Recalculate essential materials using functional update
        const ratio = (100 + clampedPercent) / (100 + prevWaste);
        setEditMaterials(prevMaterials => 
          prevMaterials.map(mat => {
            if (isEssentialMaterial(mat.item) || mat.unit === "sq ft" || mat.unit === "sq m") {
              return { ...mat, quantity: Math.round(mat.quantity * ratio) };
            }
            return mat;
          })
        );
      }
      return clampedPercent;
    });
    setHasChanges(true);
  }, []);

  // Recalculate materials when area changes - using functional updates to avoid stale closures
  const handleAreaChange = useCallback((newArea: number) => {
    setEditArea(prevArea => {
      // Auto-recalculate essential materials based on area ratio
      if (prevArea > 0 && newArea > 0 && newArea !== prevArea) {
        const ratio = newArea / prevArea;
        setEditMaterials(prevMaterials => 
          prevMaterials.map(mat => {
            // Only scale essential materials (those measured in sq ft or similar)
            if (isEssentialMaterial(mat.item) || mat.unit === "sq ft" || mat.unit === "sq m") {
              return { ...mat, quantity: Math.round(mat.quantity * ratio) };
            }
            return mat;
          })
        );
      }
      return newArea;
    });
    setHasChanges(true);
  }, []);

  // Handle material quantity change
  const handleMaterialQuantityChange = (index: number, newQuantity: number) => {
    const updated = [...editMaterials];
    updated[index].quantity = newQuantity;
    setEditMaterials(updated);
    setHasChanges(true);
  };

  // Add new material
  const handleAddMaterial = () => {
    if (!newMaterialName.trim()) return;
    
    const updated = [
      ...editMaterials,
      { item: newMaterialName.trim(), quantity: 1, unit: "units" }
    ];
    setEditMaterials(updated);
    setNewMaterialName("");
    setShowAddMaterial(false);
    setHasChanges(true);
  };

  // Remove material
  const handleRemoveMaterial = (index: number) => {
    const updated = editMaterials.filter((_, i) => i !== index);
    setEditMaterials(updated);
    setHasChanges(true);
  };

  // ATOMIC SAVE - the core function
  const handleSaveAndSync = async () => {
    if (editArea <= 0) return;
    
    setIsSaving(true);
    try {
      // This callback should atomically update:
      // 1. centralMaterials in ProjectContext
      // 2. centralFinancials (recalculate costs)
      // 3. Persist to database with wastePercent
      await onSaveAndSync(editArea, editMaterials, wastePercent);
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("[PowerEditModal] Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            Power Edit - Area & Materials
          </DialogTitle>
          <DialogDescription>
            Edit area and materials together. Changes are synchronized atomically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[55vh] pr-4">
            {/* Area Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold">Project Area</h3>
                {surfaceType !== "unknown" && (
                  <Badge variant="outline" className="text-xs">
                    {surfaceType}
                  </Badge>
                )}
              </div>
              
              <div className="p-4 rounded-lg border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Base Area (without waste)
                    </label>
                    <div className="flex items-center gap-2">
                      <NumericInput
                        value={editArea}
                        onChange={(val) => handleAreaChange(val || 0)}
                        className="h-12 text-xl font-bold w-32"
                      />
                      <span className="text-lg text-muted-foreground">{areaUnit}</span>
                    </div>
                  </div>
                  
                  <div className="text-center px-2">
                    <span className="text-2xl text-muted-foreground">+</span>
                  </div>
                  
                  <div className="min-w-[120px]">
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Waste Buffer
                    </label>
                    <div className="flex items-center gap-1">
                      <NumericInput
                        value={wastePercent}
                        onChange={(val) => handleWastePercentChange(val || 0)}
                        className="h-10 w-16 text-center font-semibold text-amber-600"
                      />
                      <span className="text-amber-600 font-medium">%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      = {wasteBuffer.toLocaleString()} {areaUnit}
                    </div>
                  </div>
                  
                  <div className="text-center px-2">
                    <span className="text-2xl text-muted-foreground">=</span>
                  </div>
                  
                  <div className="min-w-[120px]">
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Total with Waste
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {totalWithWaste.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">{areaUnit}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Changing area or waste % will automatically recalculate essential material quantities.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Materials Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold">Materials List</h3>
                  <Badge variant="secondary" className="text-xs">
                    {editMaterials.length} items
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMaterial(!showAddMaterial)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Material
                </Button>
              </div>

              {/* Add Material Input */}
              {showAddMaterial && (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <Input
                    placeholder="Material name..."
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddMaterial()}
                  />
                  <Button size="sm" onClick={handleAddMaterial}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddMaterial(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* Materials Grid */}
              <div className="space-y-2">
                {editMaterials.map((material, index) => {
                  const isEssential = isEssentialMaterial(material.item);
                  // Calculate coverage info for display
                  const coverageCalc = isEssential 
                    ? calculateCoverageQuantity(totalWithWaste, material.item)
                    : { qty: material.quantity, unit: material.unit, formula: null, coverage: null };
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex flex-col gap-2 p-3 rounded-lg border",
                        isEssential 
                          ? "border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10" 
                          : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{material.item}</span>
                            {isEssential && (
                              <Badge className="text-[10px] bg-amber-500/20 text-amber-600 shrink-0">
                                Auto-scaled
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <NumericInput
                            value={material.quantity}
                            onChange={(val) => handleMaterialQuantityChange(index, val || 0)}
                            className="w-24 h-9"
                          />
                          <span className="text-sm text-muted-foreground w-16">
                            {material.unit}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMaterial(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Coverage calculation details */}
                      {isEssential && coverageCalc.coverage && (
                        <div className="flex items-center gap-2 pl-2 text-xs text-muted-foreground">
                          <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">
                            {coverageCalc.formula}
                          </span>
                          <span className="text-amber-600">
                            ({coverageCalc.coverage.coveragePerUnit} sq ft/{coverageCalc.coverage.targetUnit.replace(/s$/, '')})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {editMaterials.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No materials detected. Add materials manually or re-analyze the project.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  All synced
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAndSync}
                disabled={isSaving || !hasChanges || editArea <= 0}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Sync All
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
