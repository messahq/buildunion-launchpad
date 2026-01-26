import React, { useState, useEffect } from "react";
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
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MaterialItem {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface TaskBasedMaterial {
  item: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

interface MaterialCalculationTabProps {
  materials: TaskBasedMaterial[];
  onMaterialsChange?: (materials: MaterialItem[]) => void;
  currency?: string;
}

export function MaterialCalculationTab({ 
  materials: initialMaterials, 
  onMaterialsChange,
  currency = "CAD"
}: MaterialCalculationTabProps) {
  const { t } = useTranslation();
  
  // Convert initial materials to internal format with prices
  const [items, setItems] = useState<MaterialItem[]>(() => 
    initialMaterials.map((m, idx) => ({
      id: `material-${idx}`,
      item: m.item,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unitPrice || 0,
      totalPrice: m.quantity * (m.unitPrice || 0),
    }))
  );
  
  // Other/custom item
  const [otherDescription, setOtherDescription] = useState("");
  const [otherQuantity, setOtherQuantity] = useState<number>(1);
  const [otherUnit, setOtherUnit] = useState("pcs");
  const [otherUnitPrice, setOtherUnitPrice] = useState<number>(0);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MaterialItem>>({});

  // Calculate grand total
  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Update parent when items change
  useEffect(() => {
    onMaterialsChange?.(items);
  }, [items, onMaterialsChange]);

  const handleUnitPriceChange = (id: string, unitPrice: number) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, unitPrice, totalPrice: item.quantity * unitPrice }
        : item
    ));
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const startEditing = (item: MaterialItem) => {
    setEditingId(item.id);
    setEditValues({
      item: item.item,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    });
  };

  const saveEdit = (id: string) => {
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

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addOtherItem = () => {
    if (!otherDescription.trim()) return;
    
    const newItem: MaterialItem = {
      id: `other-${Date.now()}`,
      item: otherDescription,
      quantity: otherQuantity,
      unit: otherUnit,
      unitPrice: otherUnitPrice,
      totalPrice: otherQuantity * otherUnitPrice,
    };
    
    setItems(prev => [...prev, newItem]);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {t("materials.calculation", "Material Calculation")}
          </h3>
        </div>
        <Badge variant="outline" className="text-sm">
          {items.length} {t("materials.items", "items")}
        </Badge>
      </div>

      {/* Materials List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            {t("materials.list", "Materials List")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 pb-2 border-b">
            <div className="col-span-4">{t("materials.description", "Description")}</div>
            <div className="col-span-2 text-center">{t("materials.quantity", "Qty")}</div>
            <div className="col-span-1 text-center">{t("materials.unit", "Unit")}</div>
            <div className="col-span-2 text-right">{t("materials.unitPrice", "Unit Price")}</div>
            <div className="col-span-2 text-right">{t("materials.total", "Total")}</div>
            <div className="col-span-1"></div>
          </div>

          {/* Material Items */}
          {items.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg transition-colors",
                editingId === item.id ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
              )}
            >
              {editingId === item.id ? (
                // Editing mode
                <>
                  <div className="col-span-4">
                    <Input
                      value={editValues.item || ""}
                      onChange={(e) => setEditValues(prev => ({ ...prev, item: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={editValues.quantity || 0}
                      onChange={(e) => setEditValues(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      value={editValues.unit || ""}
                      onChange={(e) => setEditValues(prev => ({ ...prev, unit: e.target.value }))}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.unitPrice || ""}
                      onChange={(e) => setEditValues(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 text-right font-medium text-sm">
                    {formatCurrency((editValues.quantity || 0) * (editValues.unitPrice || 0))}
                  </div>
                  <div className="col-span-1 flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => saveEdit(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={cancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                // Display mode
                <>
                  <div className="col-span-4 font-medium text-sm truncate" title={item.item}>
                    {item.item}
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">
                    {item.quantity.toLocaleString()}
                  </div>
                  <div className="col-span-1 text-center text-xs text-muted-foreground">
                    {item.unit}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) => handleUnitPriceChange(item.id, parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 text-right font-medium text-sm">
                    {item.totalPrice > 0 ? formatCurrency(item.totalPrice) : "-"}
                  </div>
                  <div className="col-span-1 flex gap-1 justify-end">
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
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("materials.noItems", "No materials added yet")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Other Item */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            {t("materials.addOther", "Add Other Item")}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                type="number"
                value={otherQuantity}
                onChange={(e) => setOtherQuantity(parseFloat(e.target.value) || 0)}
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
                type="number"
                step="0.01"
                value={otherUnitPrice || ""}
                onChange={(e) => setOtherUnitPrice(parseFloat(e.target.value) || 0)}
                className="h-9 text-right"
                placeholder="0.00"
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
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">
                {t("materials.grandTotal", "Grand Total")}
              </span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(grandTotal)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
