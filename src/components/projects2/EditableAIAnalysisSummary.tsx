import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Pencil, Check, X, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Material {
  item: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface EditableAIAnalysisSummaryProps {
  projectId: string;
  summaryId: string;
  area: number | null;
  areaUnit: string;
  materials: Material[];
  surfaceType?: string;
  surfaceCondition?: string;
  roomType?: string;
  projectSize?: string;
  confidence?: string;
  summary?: string;
  recommendations?: string[];
  hasBlueprint?: boolean;
  onUpdate?: () => void;
}

export default function EditableAIAnalysisSummary({
  projectId,
  summaryId,
  area,
  areaUnit,
  materials,
  surfaceType,
  surfaceCondition,
  roomType,
  projectSize,
  confidence,
  summary,
  recommendations,
  hasBlueprint,
  onUpdate,
}: EditableAIAnalysisSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable state
  const [editArea, setEditArea] = useState<string>(area?.toString() || "");
  const [editAreaUnit, setEditAreaUnit] = useState(areaUnit || "sq ft");
  const [editMaterials, setEditMaterials] = useState<Material[]>(materials || []);
  const [editSurfaceType, setEditSurfaceType] = useState(surfaceType || "");
  const [editSurfaceCondition, setEditSurfaceCondition] = useState(surfaceCondition || "");
  const [editRoomType, setEditRoomType] = useState(roomType || "");
  const [editProjectSize, setEditProjectSize] = useState(projectSize || "medium");
  const [editSummary, setEditSummary] = useState(summary || "");

  useEffect(() => {
    setEditArea(area?.toString() || "");
    setEditAreaUnit(areaUnit || "sq ft");
    setEditMaterials(materials || []);
    setEditSurfaceType(surfaceType || "");
    setEditSurfaceCondition(surfaceCondition || "");
    setEditRoomType(roomType || "");
    setEditProjectSize(projectSize || "medium");
    setEditSummary(summary || "");
  }, [area, areaUnit, materials, surfaceType, surfaceCondition, roomType, projectSize, summary]);

  const handleAddMaterial = () => {
    setEditMaterials([...editMaterials, { item: "", quantity: 0, unit: "units" }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setEditMaterials(editMaterials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: keyof Material, value: string | number) => {
    const updated = [...editMaterials];
    if (field === "quantity") {
      updated[index] = { ...updated[index], [field]: Number(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditMaterials(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build updated photo_estimate - cast to Json for Supabase
      const updatedPhotoEstimate = {
        area: editArea ? Number(editArea) : null,
        areaUnit: editAreaUnit,
        materials: editMaterials
          .filter(m => m.item.trim() !== "")
          .map(m => ({
            item: m.item,
            quantity: m.quantity,
            unit: m.unit,
            notes: m.notes || "",
          })),
        surfaceType: editSurfaceType,
        surfaceCondition: editSurfaceCondition,
        roomType: editRoomType,
        projectSize: editProjectSize,
        summary: editSummary,
        recommendations: recommendations || [],
        userEdited: true,
        editedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("project_summaries")
        .update({ 
          photo_estimate: updatedPhotoEstimate as unknown as import("@/integrations/supabase/types").Json,
        })
        .eq("id", summaryId);

      if (error) throw error;

      toast.success("AI analysis data updated successfully");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditArea(area?.toString() || "");
    setEditAreaUnit(areaUnit || "sq ft");
    setEditMaterials(materials || []);
    setEditSurfaceType(surfaceType || "");
    setEditSurfaceCondition(surfaceCondition || "");
    setEditRoomType(roomType || "");
    setEditProjectSize(projectSize || "medium");
    setEditSummary(summary || "");
    setIsEditing(false);
  };

  const surfaceTypes = ["concrete", "wood", "drywall", "tile", "vinyl", "carpet", "laminate", "other"];
  const surfaceConditions = ["new", "good", "fair", "poor", "damaged"];
  const roomTypes = ["living room", "bedroom", "kitchen", "bathroom", "hallway", "basement", "garage", "office", "other"];
  const projectSizes = [
    { value: "small", label: "Small (<500 sq ft)" },
    { value: "medium", label: "Medium (500-2000 sq ft)" },
    { value: "large", label: "Large (>2000 sq ft)" },
  ];
  const unitOptions = ["sq ft", "m²", "linear ft", "units", "gallons", "liters", "kg", "lbs", "rolls", "boxes"];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI Analysis Summary
            {hasBlueprint && (
              <Badge variant="secondary" className="text-xs">Blueprint Analyzed</Badge>
            )}
          </CardTitle>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <span className="animate-spin mr-1">⏳</span>
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Area */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Detected Area</div>
            {isEditing ? (
              <div className="flex gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="0"
                />
                <Select value={editAreaUnit} onValueChange={setEditAreaUnit}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq ft">sq ft</SelectItem>
                    <SelectItem value="m²">m²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-lg font-semibold">
                {area ? `${area.toLocaleString()} ${areaUnit}` : "N/A"}
              </div>
            )}
          </div>

          {/* Materials Count */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Materials</div>
            <div className="text-lg font-semibold">
              {isEditing ? editMaterials.length : materials?.length || 0} items
            </div>
          </div>

          {/* Project Size */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Project Size</div>
            {isEditing ? (
              <Select value={editProjectSize} onValueChange={setEditProjectSize}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectSizes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-semibold capitalize">{projectSize || "Unknown"}</div>
            )}
          </div>

          {/* Confidence */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
            <div className="text-lg font-semibold capitalize">{confidence || "N/A"}</div>
          </div>
        </div>

        {/* Surface & Room Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Surface Type</Label>
            {isEditing ? (
              <Select value={editSurfaceType} onValueChange={setEditSurfaceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select surface" />
                </SelectTrigger>
                <SelectContent>
                  {surfaceTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="font-medium capitalize mt-1">{surfaceType || "Not detected"}</div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Surface Condition</Label>
            {isEditing ? (
              <Select value={editSurfaceCondition} onValueChange={setEditSurfaceCondition}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {surfaceConditions.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="font-medium capitalize mt-1">{surfaceCondition || "Not assessed"}</div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Room Type</Label>
            {isEditing ? (
              <Select value={editRoomType} onValueChange={setEditRoomType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="font-medium capitalize mt-1">{roomType || "Not identified"}</div>
            )}
          </div>
        </div>

        {/* AI Summary */}
        <div>
          <Label className="text-xs text-muted-foreground">AI Summary</Label>
          {isEditing ? (
            <Textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Enter project summary..."
            />
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              {summary || "No summary available"}
            </div>
          )}
        </div>

        {/* Materials List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Detected Materials</Label>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={handleAddMaterial}>
                <Plus className="h-3 w-3 mr-1" />
                Add Material
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              {editMaterials.map((material, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={material.item}
                    onChange={(e) => handleMaterialChange(index, "item", e.target.value)}
                    placeholder="Material name"
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={material.quantity}
                    onChange={(e) => handleMaterialChange(index, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-24"
                  />
                  <Select
                    value={material.unit}
                    onValueChange={(v) => handleMaterialChange(index, "unit", v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMaterial(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {editMaterials.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No materials added. Click "Add Material" to start.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {materials && materials.length > 0 ? (
                materials.map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {m.item}: {m.quantity} {m.unit}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No materials detected</span>
              )}
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && !isEditing && (
          <div>
            <Label className="text-xs text-muted-foreground">AI Recommendations</Label>
            <ul className="mt-1 space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
