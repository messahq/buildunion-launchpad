import React from "react";
import { CitationSource } from "@/types/citation";
import { SourceTag } from "./SourceTag";
import { 
  FileText, 
  Image, 
  FileCode, 
  ScrollText, 
  BookOpen,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReferencesSectionProps {
  references: CitationSource[];
  onOpenProofPanel?: (source: CitationSource) => void;
  defaultExpanded?: boolean;
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

export const ReferencesSection: React.FC<ReferencesSectionProps> = ({
  references,
  onOpenProofPanel,
  defaultExpanded = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (references.length === 0) return null;

  // Group references by document type
  const groupedRefs = references.reduce((acc, ref) => {
    if (!acc[ref.documentType]) {
      acc[ref.documentType] = [];
    }
    acc[ref.documentType].push(ref);
    return acc;
  }, {} as Record<string, CitationSource[]>);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          "mt-6 rounded-lg border border-border",
          "bg-gradient-to-br from-muted/30 via-background to-muted/20",
          className
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-t-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/30">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-semibold text-foreground">References</span>
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                {references.length} source{references.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {Object.entries(groupedRefs).map(([type, refs]) => {
              const Icon = getDocumentIcon(type as CitationSource['documentType']);
              return (
                <div key={type} className="space-y-2">
                  {/* Type Header */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                    <Icon className="h-3 w-3" />
                    <span>{type.replace('_', ' ')}s</span>
                  </div>
                  
                  {/* Reference Items */}
                  <div className="space-y-2">
                    {refs.map((ref, index) => (
                      <div
                        key={`${ref.sourceId}-${index}`}
                        onClick={() => onOpenProofPanel?.(ref)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg",
                          "bg-background/50 border border-border/50",
                          "hover:bg-muted/50 hover:border-amber-500/30",
                          "cursor-pointer transition-all duration-200",
                          "group"
                        )}
                      >
                        {/* Source Tag */}
                        <div className="flex-shrink-0 mt-0.5">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5",
                            "font-semibold text-xs",
                            "border border-amber-500 rounded-md",
                            "bg-amber-500/10",
                            "text-amber-600 dark:text-amber-400",
                            "group-hover:bg-amber-500/20"
                          )}>
                            [{ref.sourceId}]
                          </span>
                        </div>
                        
                        {/* Reference Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">
                              {ref.documentName}
                            </span>
                            {ref.pageNumber && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                p.{ref.pageNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 italic">
                            "{ref.contextSnippet}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default ReferencesSection;
