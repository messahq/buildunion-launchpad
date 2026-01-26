import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Image, 
  FileIcon, 
  Package,
  Plus,
  ExternalLink,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

// Default waste percentage for materials
const WASTE_PERCENTAGE = 10;

export default function DocumentsPane({ 
  projectId, 
  siteImages, 
  aiAnalysis,
  className 
}: DocumentsPaneProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  // Calculate materials with waste
  const materialsWithWaste = aiAnalysis?.materials?.map(m => ({
    ...m,
    quantityWithWaste: Math.ceil(m.quantity * (1 + WASTE_PERCENTAGE / 100)),
  })) || [];

  const totalImages = (siteImages?.length || 0);
  const totalDocuments = documents.length;
  const pdfDocuments = documents.filter(d => d.file_name.toLowerCase().endsWith('.pdf'));

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

        {/* Materials List with Waste Calculation */}
        {materialsWithWaste.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              Extracted Materials 
              <Badge variant="outline" className="text-[10px] ml-1">
                +{WASTE_PERCENTAGE}% waste included
              </Badge>
            </h4>
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
                  {materialsWithWaste.map((m, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-foreground">{m.item}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {m.quantity} {m.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-amber-600 dark:text-amber-400">
                        {m.quantityWithWaste} {m.unit}
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
