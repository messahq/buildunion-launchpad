// ============================================
// VISUAL UPLOAD CANVAS PANEL - Stage 5 upload UI
// Extracted from DefinitionFlowStage.tsx
// ============================================

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Plus,
  FileText,
  Upload,
  Image,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HardHatSpinner } from "@/components/ui/loading-states";
import { Citation, CITATION_TYPES } from "@/types/citation";
import { type UploadedFile } from "./types";

export interface VisualUploadCanvasPanelProps {
  gfaValue: number;
  selectedTrade: string | null;
  grandTotal: number;
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  flowCitations: Citation[];
  onFilesDrop: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onSkipUpload: () => void;
  onConfirmUploads: () => void;
}

const VisualUploadCanvasPanel = ({
  gfaValue,
  selectedTrade,
  grandTotal,
  uploadedFiles,
  isUploading,
  flowCitations,
  onFilesDrop,
  onRemoveFile,
  onSkipUpload,
  onConfirmUploads,
}: VisualUploadCanvasPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f => 
      f.type === 'application/pdf' || 
      f.type === 'image/jpeg' || 
      f.type === 'image/png' ||
      f.type === 'image/jpg'
    );
    if (validFiles.length > 0) {
      onFilesDrop(validFiles);
    } else {
      toast.error("Only PDF, JPG, and PNG files are supported");
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesDrop(files);
    }
  };
  
  // Filter relevant citations to display
  const relevantCitationTypes: string[] = [
    CITATION_TYPES.GFA_LOCK, 
    CITATION_TYPES.TRADE_SELECTION, 
    CITATION_TYPES.TEMPLATE_LOCK, 
    CITATION_TYPES.TEAM_SIZE, 
    CITATION_TYPES.EXECUTION_MODE,
    CITATION_TYPES.SITE_CONDITION,
  ];
  const relevantCitations = flowCitations.filter(c => 
    relevantCitationTypes.includes(c.cite_type)
  );
  
  const uploadedCount = uploadedFiles.length;
  const hasBlueprint = uploadedFiles.some(f => f.type === 'blueprint');
  const sitePhotoCount = uploadedFiles.filter(f => f.type === 'site_photo').length;
  
  const obcChecklist = [
    { label: 'Blueprint uploaded', done: hasBlueprint },
    { label: 'Site photos (min. 3)', done: sitePhotoCount >= 3 },
    { label: 'Inspection report', done: false },
    { label: 'Permit verification', done: false },
  ];
  
  const overallStatus = hasBlueprint && sitePhotoCount >= 3 ? 'verified' : uploadedCount > 0 ? 'pending' : 'missing';
  const statusConfig = {
    verified: { label: 'Verified', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700' },
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
    missing: { label: 'Missing', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700' },
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Subtle blueprint background illustration */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] bg-repeat" />
      
      {/* Header - fixed */}
      <div className="px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Image className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider">Stage 5</span>
            </div>
            <h2 className="text-xl font-bold text-amber-600 dark:text-amber-400">
              Blueprint & Site Documentation
            </h2>
          </div>
          <Badge className={cn("border text-xs font-semibold", statusConfig[overallStatus].color)}>
            {statusConfig[overallStatus].label}
          </Badge>
        </div>
      </div>
      
      {/* Main Content - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 relative z-10">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        {/* Upload Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-2xl border-[3px] border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center py-6 px-4 group",
              isDragOver
                ? "border-amber-500 bg-amber-100/40 dark:bg-amber-900/20 scale-[1.02] shadow-lg shadow-amber-500/20"
                : "border-amber-400/60 dark:border-amber-600/40 bg-white/60 dark:bg-gray-800/50 hover:border-amber-500 hover:bg-amber-50/40 hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.01]"
            )}
            style={{
              borderImage: isDragOver 
                ? 'linear-gradient(135deg, #f59e0b, #f97316) 1' 
                : undefined,
            }}
          >
            <motion.div
              animate={{ 
                y: [0, -6, 0],
                scale: isDragOver ? 1.15 : 1 
              }}
              transition={{ 
                y: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
                scale: { duration: 0.2 }
              }}
              className="mb-3"
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow duration-300">
                <Upload className="h-7 w-7 text-white" />
              </div>
            </motion.div>
            
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1 text-center">
              Drop blueprints (PDF) & site photos (JPG/PNG) here to verify {gfaValue.toLocaleString()} sq ft
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse files
            </p>
          </div>
        </motion.div>

        {/* Uploaded Files - scrollable only section */}
        {uploadedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-h-0 flex flex-col bg-white/70 dark:bg-gray-800/50 rounded-xl border border-border/50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
              <span className="text-sm font-semibold text-foreground">
                Uploaded ({uploadedCount})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-amber-600 hover:text-amber-700 h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {uploadedFiles.map(file => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2.5 p-2 bg-white dark:bg-gray-800 rounded-lg border border-border/50 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md hover:shadow-amber-500/10 hover:scale-[1.02] transition-all duration-300 group/file"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Thumbnail */}
                  {file.previewUrl ? (
                    <div className="h-[50px] w-[50px] md:h-[60px] md:w-[60px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                      <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-[50px] w-[50px] md:h-[60px] md:w-[60px] rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate text-foreground">{file.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {file.type === 'blueprint' ? 'Blueprint' : 'Site Photo'}
                      </span>
                      {file.uploaded ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover/file:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* OBC Verification Block - fixed at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-amber-200/60 dark:border-amber-800/40 shadow-sm overflow-hidden"
        >
          <div className="px-3 py-2 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/40 dark:to-orange-950/40 border-b border-amber-200/50 dark:border-amber-800/30 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">OBC Compliance</span>
          </div>
          <div className="p-3 space-y-1.5">
            {obcChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-amber-300 dark:border-amber-600 shrink-0" />
                )}
                <span className={cn(
                  "text-xs",
                  item.done ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Fixed Bottom Action Bar */}
      <div className="shrink-0 p-3 border-t border-border/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm relative z-10 flex gap-2">
        <Button
          variant="outline"
          onClick={onSkipUpload}
          disabled={isUploading}
          size="sm"
          className="flex-1 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 min-h-[44px]"
        >
          Skip for now
        </Button>
        <Button
          onClick={onConfirmUploads}
          disabled={isUploading}
          size="sm"
          className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/25 min-h-[44px]"
        >
          {isUploading ? (
            <>
              <HardHatSpinner size="sm" className="mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {uploadedCount > 0 ? 'Analyze & Continue' : 'Ready for Execution'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VisualUploadCanvasPanel;
