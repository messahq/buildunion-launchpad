import React, { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { CitationSource } from "@/types/citation";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Reset state when source changes
  useEffect(() => {
    if (source) {
      setCurrentPage(source.pageNumber || 1);
      setPdfError(null);
      setIsLoading(true);
    }
  }, [source]);

  // Scroll to highlighted area when panel opens
  useEffect(() => {
    if (isOpen && source?.pageNumber && pageRefs.current.get(source.pageNumber)) {
      setTimeout(() => {
        const pageElement = pageRefs.current.get(source.pageNumber!);
        pageElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 500);
    }
  }, [isOpen, source, numPages]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages || 1));

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF document');
    setIsLoading(false);
  }, []);

  if (!source) return null;

  const Icon = getDocumentIcon(source.documentType);
  const isPdf = source.documentType === 'pdf' || source.documentType === 'regulation' || source.documentType === 'blueprint';
  const isImage = source.documentType === 'image';

  // Calculate page width based on zoom
  const pageWidth = Math.floor(550 * (zoom / 100));

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
            
            {/* Page navigation for PDFs */}
            {isPdf && numPages && numPages > 1 && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentPage} / {numPages}
                </span>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= numPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {source.filePath && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={source.filePath} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={source.filePath} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Full
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Document Viewer */}
        <ScrollArea className="flex-1">
          <div ref={contentRef} className="p-4 flex justify-center">
            {/* PDF Rendering */}
            {isPdf && source.filePath && (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  </div>
                )}
                
                {pdfError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-8">
                    <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
                    <p className="text-sm text-center">{pdfError}</p>
                    <p className="text-xs text-center mt-2">The document may be unavailable or corrupted.</p>
                  </div>
                ) : (
                  <Document
                    file={source.filePath}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex flex-col items-center justify-center h-64">
                        <Skeleton className="h-[600px] w-[450px]" />
                      </div>
                    }
                  >
                    <div className="relative">
                      <Page
                        pageNumber={currentPage}
                        width={pageWidth}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="shadow-lg rounded-lg overflow-hidden"
                        loading={
                          <Skeleton className="h-[600px] w-[450px]" />
                        }
                      />
                      
                      {/* Coordinate-based highlight overlay */}
                      {source.coordinates && source.pageNumber === currentPage && (
                        <div
                          ref={highlightRef}
                          className={cn(
                            "absolute border-2 border-amber-500 bg-amber-500/30 rounded pointer-events-none",
                            "animate-pulse shadow-lg shadow-amber-500/20"
                          )}
                          style={{
                            left: `${source.coordinates.x}%`,
                            top: `${source.coordinates.y}%`,
                            width: `${source.coordinates.width}%`,
                            height: `${source.coordinates.height}%`,
                          }}
                        >
                          <div className="absolute -top-6 left-0 px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded whitespace-nowrap">
                            Referenced Section
                          </div>
                        </div>
                      )}
                    </div>
                  </Document>
                )}
              </div>
            )}

            {/* Image Rendering */}
            {isImage && source.filePath && (
              <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                <img 
                  src={source.filePath} 
                  alt={source.documentName}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setPdfError('Failed to load image');
                  }}
                />
                
                {/* Coordinate-based highlight overlay for images */}
                {source.coordinates && (
                  <div
                    ref={highlightRef}
                    className={cn(
                      "absolute border-2 border-amber-500 bg-amber-500/30 rounded pointer-events-none",
                      "animate-pulse shadow-lg shadow-amber-500/20"
                    )}
                    style={{
                      left: `${source.coordinates.x}%`,
                      top: `${source.coordinates.y}%`,
                      width: `${source.coordinates.width}%`,
                      height: `${source.coordinates.height}%`,
                    }}
                  />
                )}
              </div>
            )}

            {/* Fallback: Text-based content preview */}
            {(!source.filePath || (!isPdf && !isImage)) && (
              <div 
                className="w-full max-w-2xl"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <div className="relative bg-muted/20 rounded-lg border border-border min-h-[400px] p-6">
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
              </div>
            )}
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