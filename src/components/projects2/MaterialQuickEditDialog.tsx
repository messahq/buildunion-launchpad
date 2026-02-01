// ============================================
// MATERIAL QUICK EDIT DIALOG
// Click citation badge to open quick-edit
// Syncs bidirectionally with ProjectContext
// ============================================

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Pencil,
  Save,
  X,
  AlertTriangle,
  Sparkles,
  FileText,
  Calculator,
  LayoutTemplate,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MaterialItem, CitationSource } from "@/contexts/ProjectContext.types";

interface MaterialQuickEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  material: MaterialItem | null;
  onSave: (materialId: string, field: "quantity" | "unitPrice" | "item", newValue: string | number) => void;
  onDelete?: (materialId: string) => void;
  isDraft: boolean;
}

// Citation badge styling
const CITATION_BADGES: Record<CitationSource, { label: string; className: string; icon: React.ReactNode }> = {
  ai_photo: { label: "AI Photo", className: "bg-blue-100 text-blue-700 border-blue-200", icon: <Sparkles className="w-3 h-3" /> },
  ai_blueprint: { label: "Blueprint", className: "bg-purple-100 text-purple-700 border-purple-200", icon: <FileText className="w-3 h-3" /> },
  template_preset: { label: "Template", className: "bg-violet-100 text-violet-700 border-violet-200", icon: <LayoutTemplate className="w-3 h-3" /> },
  manual_override: { label: "Manual", className: "bg-amber-100 text-amber-700 border-amber-200", icon: <Pencil className="w-3 h-3" /> },
  calculator: { label: "Calculated", className: "bg-green-100 text-green-700 border-green-200", icon: <Calculator className="w-3 h-3" /> },
  imported: { label: "Imported", className: "bg-gray-100 text-gray-700 border-gray-200", icon: <FileText className="w-3 h-3" /> },
};

export function MaterialQuickEditDialog({
  isOpen,
  onClose,
  material,
  onSave,
  onDelete,
  isDraft,
}: MaterialQuickEditDialogProps) {
  const { t } = useTranslation();
  const [editedItem, setEditedItem] = useState("");
  const [editedQuantity, setEditedQuantity] = useState<number>(0);
  const [editedUnitPrice, setEditedUnitPrice] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [showManualOverrideFlash, setShowManualOverrideFlash] = useState(false);

  // Reset form when material changes
  useEffect(() => {
    if (material) {
      setEditedItem(material.item);
      setEditedQuantity(material.quantity);
      setEditedUnitPrice(material.unitPrice || 0);
      setHasChanges(false);
      setShowManualOverrideFlash(false);
    }
  }, [material]);

  // Track changes
  useEffect(() => {
    if (!material) return;
    const changed = 
      editedItem !== material.item ||
      editedQuantity !== material.quantity ||
      editedUnitPrice !== (material.unitPrice || 0);
    setHasChanges(changed);
  }, [editedItem, editedQuantity, editedUnitPrice, material]);

  const handleSave = () => {
    if (!material) return;

    // Flash the manual override indicator
    setShowManualOverrideFlash(true);
    setTimeout(() => setShowManualOverrideFlash(false), 2000);

    // Save changes
    if (editedItem !== material.item) {
      onSave(material.id, "item", editedItem);
    }
    if (editedQuantity !== material.quantity) {
      onSave(material.id, "quantity", editedQuantity);
    }
    if (editedUnitPrice !== (material.unitPrice || 0)) {
      onSave(material.id, "unitPrice", editedUnitPrice);
    }

    onClose();
  };

  const handleDelete = () => {
    if (material && onDelete) {
      onDelete(material.id);
      onClose();
    }
  };

  if (!material) return null;

  const citationBadge = CITATION_BADGES[material.citationSource] || CITATION_BADGES.calculator;
  const calculatedTotal = editedQuantity * editedUnitPrice;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-amber-500" />
            {t("dashboard.quickEdit.title", "Quick Edit Material")}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {t("dashboard.quickEdit.description", "Edit material details. Changes sync globally.")}
            <Badge variant="outline" className={cn("text-xs gap-1", citationBadge.className)}>
              {citationBadge.icon}
              {citationBadge.label}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Draft Status Banner */}
        {isDraft && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              {t("dashboard.quickEdit.draftWarning", "Draft Mode - Changes will be marked as [MANUAL-OVERRIDE]")}
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Override Flash */}
        {showManualOverrideFlash && (
          <div className="absolute top-4 right-4 animate-pulse">
            <Badge className="bg-amber-500 text-white animate-bounce">
              [MANUAL-OVERRIDE]
            </Badge>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">{t("dashboard.quickEdit.itemName", "Item Name")}</Label>
            <Input
              id="item-name"
              value={editedItem}
              onChange={(e) => setEditedItem(e.target.value)}
              placeholder="Material name..."
            />
          </div>

          {/* Quantity & Unit Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("dashboard.quickEdit.quantity", "Quantity")}</Label>
              <NumericInput
                value={editedQuantity}
                onChange={(val) => setEditedQuantity(val)}
                className="w-full"
              />
              {material.originalValue && material.originalValue !== editedQuantity && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <History className="w-3 h-3" />
                  Original: {material.originalValue}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-price">{t("dashboard.quickEdit.unitPrice", "Unit Price ($)")}</Label>
              <NumericInput
                value={editedUnitPrice}
                onChange={(val) => setEditedUnitPrice(val)}
                className="w-full"
              />
            </div>
          </div>

          {/* Unit Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("dashboard.quickEdit.unit", "Unit")}:</span>
            <Badge variant="secondary">{material.unit}</Badge>
          </div>

          {/* Calculated Total */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("dashboard.quickEdit.total", "Total")}:
              </span>
              <span className={cn(
                "text-lg font-bold",
                hasChanges ? "text-amber-600" : "text-foreground"
              )}>
                ${calculatedTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {hasChanges && material.totalPrice !== calculatedTotal && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {t("dashboard.quickEdit.changed", "Changed from")} ${material.totalPrice?.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Citation ID */}
          {material.citationId && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {t("dashboard.quickEdit.citationId", "Citation ID")}: {material.citationId}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <X className="w-4 h-4 mr-1" />
                {t("common.delete", "Delete")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn(
                hasChanges && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              <Save className="w-4 h-4 mr-1" />
              {t("common.save", "Save")}
              {hasChanges && " [OVERRIDE]"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MaterialQuickEditDialog;
