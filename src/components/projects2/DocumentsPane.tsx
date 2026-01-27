import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Image, 
  FileIcon, 
  Plus,
  ExternalLink,
  Loader2,
  Upload,
  X,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentsPaneProps {
  projectId: string;
  siteImages: string[] | null;
  className?: string;
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'csv'];

export default function DocumentsPane({ 
  projectId, 
  siteImages, 
  className,
}: DocumentsPaneProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project documents
  const fetchDocuments = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return <FileText className="h-4 w-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="h-4 w-4 text-blue-500" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText className="h-4 w-4 text-blue-600" />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileText className="h-4 w-4 text-green-600" />;
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type .${ext} is not supported`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (max 50MB)`;
    }
    return null;
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!user) {
      toast.error("Please sign in to upload files");
      return;
    }

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate all files first
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (const file of fileArray) {
        const fileId = crypto.randomUUID();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${projectId}/${fileId}-${safeFileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, file, { 
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Create document record
        const { error: dbError } = await supabase
          .from("project_documents")
          .insert({
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
          });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`Failed to save ${file.name} record`);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([doc.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast.success("Document deleted");
      fetchDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, [user, projectId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalImages = (siteImages?.length || 0);
  const pdfDocuments = documents.filter(d => d.file_name.toLowerCase().endsWith('.pdf'));
  const otherDocuments = documents.filter(d => !d.file_name.toLowerCase().endsWith('.pdf'));

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Documents
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalImages} images
            </Badge>
            <Badge variant="outline" className="text-xs">
              {documents.length} files
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
            isDragOver 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className={cn(
                "h-8 w-8 transition-colors",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
              <div>
                <p className="text-sm font-medium">
                  {isDragOver ? "Drop files here" : "Drag & drop files here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse • PDF, DOC, XLS, images up to 50MB
                </p>
              </div>
            </div>
          )}
        </div>

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
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors group"
                >
                  {getFileIcon(doc.file_name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc)}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Documents */}
        {otherDocuments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileIcon className="h-4 w-4 text-muted-foreground" />
              Other Documents
            </h4>
            <div className="space-y-2">
              {otherDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors group"
                >
                  {getFileIcon(doc.file_name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc)}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materials info note */}
        <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            💡 Materials and cost breakdown are managed in the <strong>Materials</strong> tab.
          </p>
        </div>

        {/* Empty state - only show if no documents at all */}
        {!siteImages?.length && documents.length === 0 && !isLoading && (
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs mt-1">Drag files above or click to upload</p>
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
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
