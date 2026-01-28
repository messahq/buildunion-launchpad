import React, { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  FileText, 
  Image, 
  FileCode, 
  ScrollText, 
  BookOpen,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { CitationSource } from "@/types/citation";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SourceProofPanelProps {
  isOpen: boolean;
  onClose: () => void;
  source: CitationSource | null;
}

const getDocumentIcon = (type: CitationSource['documentType']) => {
  switch (type) {
    case 'pdf':
      return FileText;
    case 'image':
      return Image;
    case 'blueprint':
      return FileCode;
    case 'regulation':
      return ScrollText;
    case 'log':
      return BookOpen;
    default:
      return FileText;
  }
};

const getDocumentTypeLabel = (type: CitationSource['documentType']) => {
  switch (type) {
    case 'pdf':
      return 'PDF Document';
    case 'image':
      return 'Image';
    case 'blueprint':
      return 'Blueprint';
    case 'regulation':
      return 'Regulation';
    case 'log':
      return 'Project Log';
    default:
      return 'Document';
  }
};

export const SourceProofPanel: React.FC<SourceProofPanelProps> = ({
  isOpen,
  onClose,
  source,
}) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(100);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Scroll to highlighted area when panel opens
  useEffect(() => {
    if (isOpen && source?.coordinates && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, [isOpen, source]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  if (!source) return null;

  const Icon = getDocumentIcon(source.documentType);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[600px] md:w-[700px] lg:w-[800px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <SheetTitle className="text-left text-lg font-semibold">
                  {source.documentName}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {source.sourceId}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getDocumentTypeLabel(source.documentType)}
                  </span>
                  {source.pageNumber && (
                    <span className="text-xs text-muted-foreground">
                      • Page {source.pageNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {source.filePath && (
              <>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Full
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Document Viewer */}
        <ScrollArea className="flex-1">
          <div 
            ref={contentRef}
            className="p-4"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
          >
            {/* Document Preview Area */}
            <div className="relative bg-muted/20 rounded-lg border border-border min-h-[400px]">
              {/* Placeholder for actual document rendering */}
              {source.documentType === 'image' || source.documentType === 'blueprint' ? (
                <div className="p-4">
                  {source.filePath ? (
                    <img 
                      src={source.filePath} 
                      alt={source.documentName}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Image className="h-16 w-16 mb-4 opacity-30" />
                      <p className="text-sm">Image preview not available</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {/* Simulated document content with highlight */}
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p className="opacity-50">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <p className="opacity-50">
                      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    
                    {/* Highlighted Section */}
                    <div 
                      ref={highlightRef}
                      className={cn(
                        "relative p-4 rounded-lg",
                        "bg-amber-500/20 border-2 border-amber-500",
                        "shadow-lg shadow-amber-500/10"
                      )}
                    >
                      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded">
                        Referenced Section
                      </div>
                      <p className="text-foreground font-medium">
                        {source.contextSnippet}
                      </p>
                    </div>
                    
                    <p className="opacity-50">
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    </p>
                    <p className="opacity-50">
                      Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                  </div>
                </div>
              )}

              {/* Coordinate-based highlight overlay (for PDFs/images with coordinates) */}
              {source.coordinates && (
                <div
                  className="absolute border-2 border-amber-500 bg-amber-500/20 rounded pointer-events-none animate-pulse"
                  style={{
                    left: `${source.coordinates.x}%`,
                    top: `${source.coordinates.y}%`,
                    width: `${source.coordinates.width}%`,
                    height: `${source.coordinates.height}%`,
                  }}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer with metadata */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Source ID: <strong className="text-foreground">{source.sourceId}</strong></span>
              {source.timestamp && (
                <span>Extracted: <strong className="text-foreground">{new Date(source.timestamp).toLocaleDateString()}</strong></span>
              )}
            </div>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
              Verified Source
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SourceProofPanel;
