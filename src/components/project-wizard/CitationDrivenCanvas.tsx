// ============================================
// CITATION-DRIVEN CANVAS
// ============================================
// The Canvas that renders ONLY from citations
// No hardcoded data - everything comes from the Source of Truth
// ============================================

import { forwardRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Citation, CITATION_TYPES } from "@/types/citation";
import CitationRenderer from "./CitationRenderer";
import { cn } from "@/lib/utils";

interface CitationDrivenCanvasProps {
  citations: Citation[];
  onCitationClick?: (citationId: string) => void;
  highlightedCitationId?: string | null;
  isLoading?: boolean;
  className?: string;
  onGfaLocked?: boolean; // Trigger when GFA was just locked
}

/**
 * CitationDrivenCanvas - The pure, data-driven canvas
 * 
 * Principle: This component has ZERO hardcoded project data.
 * Everything rendered is driven by the citations array.
 * The rendering order and components are determined by cite_type.
 */
const CitationDrivenCanvas = forwardRef<HTMLDivElement, CitationDrivenCanvasProps>(
  ({ citations, onCitationClick, highlightedCitationId, isLoading, className, onGfaLocked }, ref) => {
    
    // Organize citations by type for structured rendering
    const organizedCitations = useMemo(() => {
      const knownTypes: string[] = [
        CITATION_TYPES.PROJECT_NAME, 
        CITATION_TYPES.LOCATION, 
        CITATION_TYPES.WORK_TYPE, 
        CITATION_TYPES.GFA_LOCK
      ];
      
      return {
        projectName: citations.find(c => c.cite_type === CITATION_TYPES.PROJECT_NAME),
        location: citations.find(c => c.cite_type === CITATION_TYPES.LOCATION),
        workType: citations.find(c => c.cite_type === CITATION_TYPES.WORK_TYPE),
        gfa: citations.find(c => c.cite_type === CITATION_TYPES.GFA_LOCK),
        others: citations.filter(c => !knownTypes.includes(c.cite_type)
        ),
      };
    }, [citations]);

    const isEmpty = citations.length === 0;

    return (
      <div 
        ref={ref} 
        className={cn(
          "h-full bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 p-6 overflow-y-auto",
          className
        )}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Empty State */}
          <AnimatePresence>
            {isEmpty && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center min-h-[400px]"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                  >
                    <Sparkles className="h-10 w-10 text-amber-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                    Citation-Driven Canvas
                  </h3>
                  <p className="text-amber-700/70 dark:text-amber-400/70 max-w-sm mx-auto">
                    Answer questions to create verified citations. Each citation becomes a visual element on this canvas.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && (
            <div className="h-full flex items-center justify-center min-h-[400px]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
              />
            </div>
          )}

          {/* Render Order: Project Name -> Location -> Work Type -> GFA -> Others */}
          {!isEmpty && !isLoading && (
            <>
              {/* Project Name Citation */}
              {organizedCitations.projectName && (
                <CitationRenderer
                  citation={organizedCitations.projectName}
                  onCitationClick={onCitationClick}
                  isHighlighted={highlightedCitationId === organizedCitations.projectName.id}
                />
              )}

              {/* Two-Column Grid for Location & Work Type */}
              {(organizedCitations.location || organizedCitations.workType) && (
                <div className="grid md:grid-cols-2 gap-6">
                  {organizedCitations.location && (
                    <CitationRenderer
                      citation={organizedCitations.location}
                      onCitationClick={onCitationClick}
                      isHighlighted={highlightedCitationId === organizedCitations.location.id}
                    />
                  )}
                  {organizedCitations.workType && (
                    <CitationRenderer
                      citation={organizedCitations.workType}
                      onCitationClick={onCitationClick}
                      isHighlighted={highlightedCitationId === organizedCitations.workType.id}
                      gfaValue={organizedCitations.gfa?.metadata?.gfa_value as number | undefined}
                      onGfaLocked={onGfaLocked}
                    />
                  )}
                </div>
              )}

              {/* GFA Lock - Full Width */}
              {organizedCitations.gfa && (
                <CitationRenderer
                  citation={organizedCitations.gfa}
                  onCitationClick={onCitationClick}
                  isHighlighted={highlightedCitationId === organizedCitations.gfa.id}
                />
              )}

              {/* Other Citations */}
              {organizedCitations.others.length > 0 && (
                <div className="space-y-4">
                  {organizedCitations.others.map((citation) => (
                    <CitationRenderer
                      key={citation.id}
                      citation={citation}
                      onCitationClick={onCitationClick}
                      isHighlighted={highlightedCitationId === citation.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

CitationDrivenCanvas.displayName = "CitationDrivenCanvas";

export default CitationDrivenCanvas;
