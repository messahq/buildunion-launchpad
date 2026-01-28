import React, { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Image, FileCode, ScrollText, BookOpen } from "lucide-react";
import { CitationSource } from "@/types/citation";
import { cn } from "@/lib/utils";

interface SourceTagProps {
  source: CitationSource;
  onOpenProofPanel?: (source: CitationSource) => void;
  className?: string;
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

export const SourceTag: React.FC<SourceTagProps> = ({
  source,
  onOpenProofPanel,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = getDocumentIcon(source.documentType);

  const handleClick = () => {
    if (onOpenProofPanel) {
      onOpenProofPanel(source);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              // Base styles - Geist Sans SemiBold equivalent
              "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5",
              "font-semibold text-xs",
              // Amber styling as specified
              "border border-amber-500 rounded-md",
              "bg-amber-500/10",
              "text-foreground dark:text-foreground",
              // Hover and interaction states
              "transition-all duration-200 ease-in-out",
              "hover:bg-amber-500/20 hover:border-amber-400",
              "hover:shadow-sm hover:shadow-amber-500/20",
              "cursor-pointer select-none",
              // Focus states for accessibility
              "focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-1",
              className
            )}
            aria-label={`View source: ${source.sourceId}`}
          >
            <span className="text-amber-600 dark:text-amber-400">
              [{source.sourceId}]
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className={cn(
            "max-w-xs p-3 z-50",
            "bg-popover border border-border shadow-lg",
            "rounded-lg"
          )}
        >
          <div className="space-y-2">
            {/* Document Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Icon className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm text-foreground">
                {source.documentName}
              </span>
            </div>
            
            {/* Page/Location Info */}
            {source.pageNumber && (
              <div className="text-xs text-muted-foreground">
                Page {source.pageNumber}
              </div>
            )}
            
            {/* Context Snippet */}
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Context: </span>
              <span className="italic">"{source.contextSnippet}"</span>
            </div>
            
            {/* Click hint */}
            <div className="pt-2 border-t border-border text-xs text-amber-600 dark:text-amber-400">
              Click to view original document
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SourceTag;
