import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Image, 
  FileIcon, 
  Package,
  Plus,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Save,
  Pencil,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AIAnalysis {
  area: number | null;
  areaUnit: string;
  materials: Array<{ item: string; quantity: number; unit: string }>;
  hasBlueprint: boolean;
  confidence: string;
}

interface DocumentsPaneProps {
  projectId: string;
  siteImages: string[] | null;
  aiAnalysis?: AIAnalysis | null;
  className?: string;
  onMaterialsUpdated?: () => void;
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

interface ConsolidatedMaterial {
  id: string;
  item: string;
  baseQuantity: number;
  unit: string;
  quantityWithWaste: number;
  isEditing?: boolean;
}

// Default waste percentage for materials
const WASTE_PERCENTAGE = 10;

// Essential material categories to consolidate into
const ESSENTIAL_CATEGORIES = [
  { pattern: /laminate|flooring/i, label: "Laminate Flooring", unit: "sq ft" },
  { pattern: /underlayment|underlay/i, label: "Underlayment", unit: "sq ft" },
  { pattern: /baseboard|trim|moulding/i, label: "Baseboard Trim", unit: "linear ft" },
  { pattern: /adhesive|glue|supplies|nails|screws/i, label: "Adhesive & Supplies", unit: "units" },
];

export default function DocumentsPane({ 
  projectId, 
  siteImages, 
  aiAnalysis,
  className,
  onMaterialsUpdated
}: DocumentsPaneProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingMaterials, setEditingMaterials] = useState<ConsolidatedMaterial[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch project documents
  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("project_documents")
          .select("*")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [projectId]);

  // Consolidate materials into essential categories with 10% waste
  const consolidatedMaterials = useMemo((): ConsolidatedMaterial[] => {
    if (!aiAnalysis?.materials?.length) return [];

    const consolidated: Record<string, { quantity: number; unit: string }> = {};

    // Initialize all essential categories
    ESSENTIAL_CATEGORIES.forEach(cat => {
      consolidated[cat.label] = { quantity: 0, unit: cat.unit };
    });

    // Consolidate materials by matching to categories
    aiAnalysis.materials.forEach(material => {
      for (const cat of ESSENTIAL_CATEGORIES) {
        if (cat.pattern.test(material.item)) {
          // Only add quantity if it's greater than 1 (skip "1 unit" placeholder tasks)
          if (material.quantity > 1) {
            // Use max quantity to avoid duplicates
            if (material.quantity > consolidated[cat.label].quantity) {
              consolidated[cat.label].quantity = material.quantity;
            }
          }
          break;
        }
      }
    });

    // If no laminate detected but we have area, use that
    if (consolidated["Laminate Flooring"].quantity === 0 && aiAnalysis.area) {
      consolidated["Laminate Flooring"].quantity = aiAnalysis.area;
    }

    // If no underlayment detected, use laminate area + 10%
    if (consolidated["Underlayment"].quantity === 0 && consolidated["Laminate Flooring"].quantity > 0) {
      consolidated["Underlayment"].quantity = Math.ceil(consolidated["Laminate Flooring"].quantity * 1.08);
    }

    // Estimate baseboard if not detected (perimeter calculation from area)
    if (consolidated["Baseboard Trim"].quantity === 0 && aiAnalysis.area) {
      // Rough estimate: sqrt(area) * 4 for perimeter
      const estimatedPerimeter = Math.ceil(Math.sqrt(aiAnalysis.area) * 4);
      consolidated["Baseboard Trim"].quantity = estimatedPerimeter;
    }

    // Default adhesive & supplies if none detected
    if (consolidated["Adhesive & Supplies"].quantity === 0 && aiAnalysis.area) {
      // Roughly 1 unit per 100 sq ft
      consolidated["Adhesive & Supplies"].quantity = Math.max(5, Math.ceil(aiAnalysis.area / 100));
    }

    // Convert to array and add waste calculation
    return ESSENTIAL_CATEGORIES.map((cat, index) => ({
      id: `mat-${index}`,
      item: cat.label,
      baseQuantity: consolidated[cat.label].quantity,
      unit: consolidated[cat.label].unit,
      quantityWithWaste: Math.ceil(consolidated[cat.label].quantity * (1 + WASTE_PERCENTAGE / 100)),
    })).filter(m => m.baseQuantity > 0);
  }, [aiAnalysis]);

  // Initialize editing materials when consolidated changes
  useEffect(() => {
    if (consolidatedMaterials.length > 0 && editingMaterials.length === 0) {
      setEditingMaterials(consolidatedMaterials);
    }
  }, [consolidatedMaterials, editingMaterials.length]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return <FileText className="h-4 w-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="h-4 w-4 text-blue-500" />;
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle quantity change in edit mode
  const handleQuantityChange = (id: string, newQuantity: number) => {
    setEditingMaterials(prev => prev.map(m => 
      m.id === id 
        ? { 
            ...m, 
            baseQuantity: newQuantity,
            quantityWithWaste: Math.ceil(newQuantity * (1 + WASTE_PERCENTAGE / 100))
          } 
        : m
    ));
  };

  // Save materials to database
  const saveMaterials = useCallback(async () => {
    if (!projectId) return;
    
    setIsSaving(true);
    try {
      // Convert to the format expected by the database
      const materialsToSave = editingMaterials.map(m => ({
        item: m.item,
        quantity: m.baseQuantity,
        unit: m.unit,
        userEdited: true,
      }));

      // Get current summary
      const { data: summary, error: fetchError } = await supabase
        .from("project_summaries")
        .select("photo_estimate, ai_workflow_config")
        .eq("project_id", projectId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Update photo_estimate with edited materials
      const currentPhotoEstimate = (summary?.photo_estimate as any) || {};
      const updatedPhotoEstimate = {
        ...currentPhotoEstimate,
        materials: materialsToSave,
        materialsEditedAt: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("project_summaries")
        .update({
          photo_estimate: updatedPhotoEstimate,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      if (updateError) throw updateError;

      toast.success("Materials saved successfully!");
      setIsEditMode(false);
      onMaterialsUpdated?.();
    } catch (error) {
      console.error("Error saving materials:", error);
      toast.error("Failed to save materials");
    } finally {
      setIsSaving(false);
    }
  }, [projectId, editingMaterials, onMaterialsUpdated]);

  // Cancel editing
  const cancelEditing = () => {
    setEditingMaterials(consolidatedMaterials);
    setIsEditMode(false);
  };

  const totalImages = (siteImages?.length || 0);
  const pdfDocuments = documents.filter(d => d.file_name.toLowerCase().endsWith('.pdf'));
  const displayMaterials = isEditMode ? editingMaterials : (editingMaterials.length > 0 ? editingMaterials : consolidatedMaterials);

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Documents & Materials
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalImages} images
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pdfDocuments.length} PDFs
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Site Images Grid */}
        {siteImages && siteImages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              Site Photos
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {siteImages.slice(0, 8).map((path, i) => (
                <div 
                  key={i}
                  className="aspect-square rounded-lg bg-muted/50 border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => setSelectedImage(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${path}`)}
                >
                  <img 
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${path}`}
                    alt={`Site image ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
              {siteImages.length > 8 && (
                <div className="aspect-square rounded-lg bg-muted/50 border flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">+{siteImages.length - 8}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF Documents */}
        {pdfDocuments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-500" />
              Blueprints & PDFs
            </h4>
            <div className="space-y-2">
              {pdfDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
                >
                  {getFileIcon(doc.file_name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${doc.file_path}`,
                        "_blank"
                      );
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Essential Materials List with Waste Calculation - Editable */}
        {displayMaterials.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                Essential Materials 
                <Badge variant="outline" className="text-[10px] ml-1 bg-green-50 text-green-700 border-green-200">
                  +{WASTE_PERCENTAGE}% waste included
                </Badge>
              </h4>
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveMaterials}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Material</th>
                    <th className="text-right px-3 py-2 font-medium">Base Qty</th>
                    <th className="text-right px-3 py-2 font-medium">With Waste</th>
                    <th className="text-center px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMaterials.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-2 text-foreground font-medium">{m.item}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {isEditMode ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={m.baseQuantity}
                              onChange={(e) => handleQuantityChange(m.id, parseInt(e.target.value) || 0)}
                              className="w-24 h-8 text-right"
                              min={0}
                            />
                            <span className="text-xs w-16">{m.unit}</span>
                          </div>
                        ) : (
                          <>
                            {m.baseQuantity.toLocaleString()} {m.unit}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-amber-600 dark:text-amber-400">
                        {m.quantityWithWaste.toLocaleString()} {m.unit}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          RAG
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {aiAnalysis?.area && (
              <p className="text-xs text-muted-foreground mt-2">
                Based on detected area: {aiAnalysis.area.toLocaleString()} {aiAnalysis.areaUnit}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!siteImages?.length && documents.length === 0 && !isLoading && (
          <div className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <Button variant="outline" size="sm" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>

      {/* Image Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Site Photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="p-4">
              <img 
                src={selectedImage}
                alt="Site photo"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
