// ============================================
// CITATION RENDERER - Component Mapping Switch
// ============================================
// Renders the correct component based on citation type
// This is the SINGLE source of truth for UI rendering
// ============================================

import { forwardRef, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Building, FileText, Calculator, DollarSign } from "lucide-react";
import { Citation, CITATION_TYPES, CitationType } from "@/types/citation";
import { WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import WireframeVisualizer from "./WireframeVisualizer";
import { cn } from "@/lib/utils";

interface CitationRendererProps {
  citation: Citation;
  onCitationClick?: (citationId: string) => void;
  isHighlighted?: boolean;
  className?: string;
}

/**
 * CitationRenderer - The Switch Case component mapper
 * Decides what to render based on cite_type
 */
const CitationRenderer = forwardRef<HTMLDivElement, CitationRendererProps>(
  ({ citation, onCitationClick, isHighlighted, className }, ref) => {
    
    // Render based on citation type
    switch (citation.cite_type) {
      case CITATION_TYPES.LOCATION:
        return (
          <LocationRenderer
            ref={ref}
            citation={citation}
            onCitationClick={onCitationClick}
            isHighlighted={isHighlighted}
            className={className}
          />
        );
      
      case CITATION_TYPES.WORK_TYPE:
        return (
          <WorkTypeRenderer
            ref={ref}
            citation={citation}
            onCitationClick={onCitationClick}
            isHighlighted={isHighlighted}
            className={className}
          />
        );
      
      case CITATION_TYPES.GFA_LOCK:
        return (
          <GFARenderer
            ref={ref}
            citation={citation}
            onCitationClick={onCitationClick}
            isHighlighted={isHighlighted}
            className={className}
          />
        );
      
      case CITATION_TYPES.PROJECT_NAME:
        return (
          <ProjectLabelRenderer
            ref={ref}
            citation={citation}
            onCitationClick={onCitationClick}
            isHighlighted={isHighlighted}
            className={className}
          />
        );
      
      default:
        return (
          <DefaultRenderer
            ref={ref}
            citation={citation}
            onCitationClick={onCitationClick}
            isHighlighted={isHighlighted}
            className={className}
          />
        );
    }
  }
);

CitationRenderer.displayName = "CitationRenderer";

// ============================================
// SUB-RENDERERS FOR EACH CITATION TYPE
// ============================================

interface SubRendererProps extends CitationRendererProps {}

/**
 * LOCATION Renderer - Google Maps Component
 */
const LocationRenderer = forwardRef<HTMLDivElement, SubRendererProps>(
  ({ citation, onCitationClick, isHighlighted, className }, ref) => {
    const { apiKey, isLoading } = useGoogleMapsApi();
    const coordinates = citation.metadata?.coordinates;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onCitationClick?.(citation.id)}
        className={cn(
          "relative cursor-pointer group",
          isHighlighted && "ring-2 ring-amber-500 ring-offset-4 rounded-xl",
          className
        )}
      >
        <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm text-amber-700 dark:text-amber-300">
                Project Location
              </span>
            </div>
            <CitationBadge citationId={citation.id} />
          </div>
          
          <div className="h-64 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-950/30 dark:to-orange-950/30 relative">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
                />
              </div>
            ) : apiKey && coordinates ? (
              <LoadScript googleMapsApiKey={apiKey}>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={coordinates}
                  zoom={15}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    styles: [{ featureType: "all", stylers: [{ saturation: -20 }] }]
                  }}
                >
                  <Marker position={coordinates} />
                </GoogleMap>
              </LoadScript>
            ) : (
              <div className="h-full flex items-center justify-center text-amber-600/70 dark:text-amber-400/70">
                <div className="text-center space-y-2">
                  <MapPin className="h-8 w-8 mx-auto opacity-50" />
                  <p className="text-sm">{citation.answer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

LocationRenderer.displayName = "LocationRenderer";

/**
 * WORK_TYPE Renderer - Wireframe SVG Animation
 */
const WorkTypeRenderer = forwardRef<HTMLDivElement, SubRendererProps>(
  ({ citation, onCitationClick, isHighlighted, className }, ref) => {
    const workType = citation.metadata?.work_type_key || citation.answer;
    const label = WORK_TYPE_LABELS[workType as WorkType] || workType;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onCitationClick?.(citation.id)}
        className={cn(
          "relative cursor-pointer group",
          isHighlighted && "ring-2 ring-amber-500 ring-offset-4 rounded-xl",
          className
        )}
      >
        <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm text-amber-700 dark:text-amber-300">
                {label}
              </span>
            </div>
            <CitationBadge citationId={citation.id} />
          </div>
          
          <WireframeVisualizer workType={workType} />
        </div>
      </motion.div>
    );
  }
);

WorkTypeRenderer.displayName = "WorkTypeRenderer";

/**
 * GFA_LOCK Renderer - Budget Calculator (locked value)
 */
const GFARenderer = forwardRef<HTMLDivElement, SubRendererProps>(
  ({ citation, onCitationClick, isHighlighted, className }, ref) => {
    const gfaValue = citation.metadata?.gfa_value || Number(citation.value) || 0;
    const gfaUnit = citation.metadata?.gfa_unit || 'sqft';

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onCitationClick?.(citation.id)}
        className={cn(
          "relative cursor-pointer group",
          isHighlighted && "ring-2 ring-amber-500 ring-offset-4 rounded-xl",
          className
        )}
      >
        <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-sm text-amber-700 dark:text-amber-300">
                Gross Floor Area (Locked)
              </span>
            </div>
            <CitationBadge citationId={citation.id} />
          </div>
          
          <div className="p-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex flex-col items-center"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                {gfaValue.toLocaleString()}
              </div>
              <div className="text-sm text-amber-600/70 dark:text-amber-400/70 mt-1">
                {gfaUnit === 'sqft' ? 'Square Feet' : 'Square Meters'}
              </div>
              <div className="mt-3 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Budget Calculator Ready
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }
);

GFARenderer.displayName = "GFARenderer";

/**
 * PROJECT_NAME Renderer - Project Label Card
 */
const ProjectLabelRenderer = forwardRef<HTMLDivElement, SubRendererProps>(
  ({ citation, onCitationClick, isHighlighted, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onCitationClick?.(citation.id)}
        className={cn(
          "relative cursor-pointer group",
          isHighlighted && "ring-2 ring-amber-500 ring-offset-4 rounded-xl",
          className
        )}
      >
        <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-6 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 animate-pulse" />
          
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Building className="h-3 w-3" />
                <span className="font-semibold">PROJECT 3.0</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent">
                {citation.answer}
              </h1>
            </div>
            <CitationBadge citationId={citation.id} showOnHover />
          </div>
        </div>
        
        <motion.div
          className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/50"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </motion.div>
    );
  }
);

ProjectLabelRenderer.displayName = "ProjectLabelRenderer";

/**
 * Default Renderer - Fallback for unhandled types
 */
const DefaultRenderer = forwardRef<HTMLDivElement, SubRendererProps>(
  ({ citation, onCitationClick, isHighlighted, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onCitationClick?.(citation.id)}
        className={cn(
          "relative cursor-pointer group p-4 rounded-lg border border-amber-200/50 dark:border-amber-800/30",
          isHighlighted && "ring-2 ring-amber-500",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
              {citation.question_key.replace(/_/g, ' ')}
            </div>
            <div className="text-sm font-medium">{citation.answer}</div>
          </div>
          <CitationBadge citationId={citation.id} />
        </div>
      </motion.div>
    );
  }
);

DefaultRenderer.displayName = "DefaultRenderer";

// ============================================
// SHARED COMPONENTS
// ============================================

interface CitationBadgeProps {
  citationId: string;
  showOnHover?: boolean;
}

const CitationBadge = ({ citationId, showOnHover = false }: CitationBadgeProps) => (
  <div className={cn(
    "px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono border border-amber-300/50 dark:border-amber-700/50 transition-opacity",
    showOnHover && "opacity-0 group-hover:opacity-100"
  )}>
    {citationId.slice(0, 12)}...
  </div>
);

export default CitationRenderer;
