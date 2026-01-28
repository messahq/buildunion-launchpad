import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Image,
  FileIcon,
  Quote,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Ruler,
  Package,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CitationSource, getCitationTypeLabel } from "@/types/citation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CitationRegistryProps {
  citations: CitationSource[];
  className?: string;
  onCitationClick?: (citation: CitationSource) => void;
  onLinkToPillar?: (citationId: string, pillar: string) => void;
  compact?: boolean;
}

const getPillarIcon = (pillar?: string) => {
  switch (pillar) {
    case 'area': return <Ruler className="h-3 w-3" />;
    case 'materials': return <Package className="h-3 w-3" />;
    case 'blueprint': return <FileText className="h-3 w-3" />;
    case 'obc': return <Shield className="h-3 w-3" />;
    case 'conflict': return <AlertTriangle className="h-3 w-3" />;
    default: return null;
  }
};

const getPillarLabel = (pillar?: string) => {
  switch (pillar) {
    case 'area': return 'Confirmed Area';
    case 'materials': return 'Materials';
    case 'blueprint': return 'Blueprint';
    case 'obc': return 'OBC Compliance';
    case 'conflict': return 'Conflict Check';
    case 'mode': return 'Project Mode';
    case 'size': return 'Project Size';
    case 'confidence': return 'Confidence';
    default: return 'Not Linked';
  }
};

const getDocTypeIcon = (type: CitationSource['documentType']) => {
  switch (type) {
    case 'pdf':
    case 'blueprint':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'image':
    case 'site_photo':
      return <Image className="h-4 w-4 text-blue-500" />;
    case 'regulation':
      return <Shield className="h-4 w-4 text-purple-500" />;
    default:
      return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function CitationRegistry({
  citations,
  className,
  onCitationClick,
  onLinkToPillar,
  compact = false,
}: CitationRegistryProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group citations by type
  const groupedCitations = useMemo(() => {
    const groups: Record<string, CitationSource[]> = {
      site_photo: [],
      pdf: [],
      blueprint: [],
      image: [],
      regulation: [],
      other: [],
    };

    citations.forEach((citation) => {
      const type = citation.documentType;
      if (type === 'site_photo') {
        groups.site_photo.push(citation);
      } else if (type === 'pdf') {
        groups.pdf.push(citation);
      } else if (type === 'blueprint') {
        groups.blueprint.push(citation);
      } else if (type === 'image') {
        groups.image.push(citation);
      } else if (type === 'regulation') {
        groups.regulation.push(citation);
      } else {
        groups.other.push(citation);
      }
    });

    return groups;
  }, [citations]);

  // Count linked citations
  const linkedCount = citations.filter(c => c.linkedPillar).length;

  const handleCopyCitation = (sourceId: string) => {
    navigator.clipboard.writeText(`[${sourceId}]`);
    setCopiedId(sourceId);
    toast.success(`Citation [${sourceId}] copied`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderCitationItem = (citation: CitationSource) => (
    <div
      key={citation.id}
      className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      {/* Citation Badge */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className="bg-amber-500/90 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0.5 cursor-pointer font-mono shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyCitation(citation.sourceId);
              }}
            >
              {copiedId === citation.sourceId ? (
                <Check className="h-3 w-3" />
              ) : (
                `[${citation.sourceId}]`
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to copy</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Doc Type Icon */}
      {getDocTypeIcon(citation.documentType)}

      {/* Document Name */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{citation.documentName}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {getCitationTypeLabel(citation.documentType)}
        </p>
      </div>

      {/* Linked Pillar Badge - shows auto-linked indicator */}
      {citation.linkedPillar && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0.5 gap-1",
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                )}
              >
                {getPillarIcon(citation.linkedPillar)}
                <span className="hidden sm:inline">{getPillarLabel(citation.linkedPillar)}</span>
                <span className="text-[8px] opacity-70">⚡</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Auto-linked to: {getPillarLabel(citation.linkedPillar)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onCitationClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onCitationClick(citation)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View source</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {onLinkToPillar && !citation.linkedPillar && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-amber-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Open pillar selector dialog
                    toast.info("Select a pillar to link this citation");
                  }}
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Link to pillar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  if (citations.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-6 text-center">
          <Quote className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No citations registered</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Upload documents to auto-generate citations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-amber-500/30", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="text-sm flex items-center gap-2">
                <Quote className="h-4 w-4 text-amber-500" />
                Citation Registry
                <Badge variant="secondary" className="text-xs">
                  {citations.length} total
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {linkedCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 cursor-help">
                          <Link2 className="h-3 w-3 mr-1" />
                          {linkedCount} linked
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-semibold mb-1">Linked to Pillars:</p>
                        <div className="space-y-0.5 text-xs">
                          {citations.filter(c => c.linkedPillar === 'area').length > 0 && (
                            <div className="flex items-center gap-1">
                              <Ruler className="h-3 w-3 text-blue-500" />
                              <span>Area: {citations.filter(c => c.linkedPillar === 'area').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                          {citations.filter(c => c.linkedPillar === 'materials').length > 0 && (
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-orange-500" />
                              <span>Materials: {citations.filter(c => c.linkedPillar === 'materials').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                          {citations.filter(c => c.linkedPillar === 'blueprint').length > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-purple-500" />
                              <span>Blueprint: {citations.filter(c => c.linkedPillar === 'blueprint').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                          {citations.filter(c => c.linkedPillar === 'obc').length > 0 && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3 text-green-500" />
                              <span>OBC: {citations.filter(c => c.linkedPillar === 'obc').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                          {citations.filter(c => c.linkedPillar === 'conflict').length > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span>Conflict: {citations.filter(c => c.linkedPillar === 'conflict').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                          {citations.filter(c => c.linkedPillar === 'mode').length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">🎯</span>
                              <span>Mode: {citations.filter(c => c.linkedPillar === 'mode').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                          {citations.filter(c => c.linkedPillar === 'confidence').length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">📊</span>
                              <span>Confidence: {citations.filter(c => c.linkedPillar === 'confidence').map(c => `[${c.sourceId}]`).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {/* Site Photos */}
                {groupedCitations.site_photo.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Site Photos ({groupedCitations.site_photo.length})
                    </h4>
                    <div className="space-y-1">
                      {groupedCitations.site_photo.map(renderCitationItem)}
                    </div>
                  </div>
                )}

                {/* PDFs & Blueprints */}
                {(groupedCitations.pdf.length > 0 || groupedCitations.blueprint.length > 0) && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Documents ({groupedCitations.pdf.length + groupedCitations.blueprint.length})
                    </h4>
                    <div className="space-y-1">
                      {[...groupedCitations.blueprint, ...groupedCitations.pdf].map(renderCitationItem)}
                    </div>
                  </div>
                )}

                {/* Other Images */}
                {groupedCitations.image.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Other Images ({groupedCitations.image.length})
                    </h4>
                    <div className="space-y-1">
                      {groupedCitations.image.map(renderCitationItem)}
                    </div>
                  </div>
                )}

                {/* Regulations */}
                {groupedCitations.regulation.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      OBC References ({groupedCitations.regulation.length})
                    </h4>
                    <div className="space-y-1">
                      {groupedCitations.regulation.map(renderCitationItem)}
                    </div>
                  </div>
                )}

                {/* Other */}
                {groupedCitations.other.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <FileIcon className="h-3 w-3" />
                      Other ({groupedCitations.other.length})
                    </h4>
                    <div className="space-y-1">
                      {groupedCitations.other.map(renderCitationItem)}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Summary Footer */}
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {linkedCount}/{citations.length} linked to pillars
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  const citationList = citations.map(c => `[${c.sourceId}]`).join(', ');
                  navigator.clipboard.writeText(citationList);
                  toast.success('All citations copied');
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}