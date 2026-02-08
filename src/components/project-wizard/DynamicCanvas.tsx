import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building, Maximize2, Sparkles } from "lucide-react";
import { WizardCitation, WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { cn } from "@/lib/utils";
import WireframeVisualizer from "./WireframeVisualizer";

interface DynamicCanvasProps {
  projectName: string | null;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
  workType: string | null;
  citations: Record<string, WizardCitation>;
  onElementClick: (citationId: string) => void;
  highlightedElementId?: string | null;
}

const DynamicCanvas = forwardRef<HTMLDivElement, DynamicCanvasProps>(
  ({ projectName, address, coordinates, workType, citations, onElementClick, highlightedElementId }, ref) => {
    const { apiKey, isLoading: mapsLoading } = useGoogleMapsApi();
    const [mapZoom, setMapZoom] = useState(4);

    // Animate map zoom when coordinates change
    useEffect(() => {
      if (coordinates) {
        setMapZoom(4);
        const timer1 = setTimeout(() => setMapZoom(10), 500);
        const timer2 = setTimeout(() => setMapZoom(15), 1000);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
    }, [coordinates]);

    const nameCitation = Object.values(citations).find(c => c.questionKey === 'project_name');
    const addressCitation = Object.values(citations).find(c => c.questionKey === 'project_address');
    const workTypeCitation = Object.values(citations).find(c => c.questionKey === 'work_type');

    return (
      <div ref={ref} className="h-full bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Empty State with amber theme */}
          <AnimatePresence>
            {!projectName && !address && !workType && (
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
                    Your Project Canvas
                  </h3>
                  <p className="text-amber-700/70 dark:text-amber-400/70 max-w-sm mx-auto">
                    Answer the questions on the left and watch your project come to life here.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Project Label with amber theme */}
          <AnimatePresence>
            {projectName && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                onClick={() => nameCitation && onElementClick(nameCitation.id)}
                className={cn(
                  "relative cursor-pointer group",
                  highlightedElementId === nameCitation?.id && "ring-2 ring-amber-500 ring-offset-4 rounded-xl"
                )}
              >
                <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-6 shadow-lg overflow-hidden">
                  {/* Animated amber gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 animate-pulse" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <Building className="h-3 w-3" />
                          <span className="font-semibold">PROJECT 3.0</span>
                        </div>
                        <motion.h1
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent"
                        >
                          {projectName}
                        </motion.h1>
                        {address && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-2 text-amber-700/70 dark:text-amber-400/70"
                          >
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{address}</span>
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Source badge */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono border border-amber-300/50 dark:border-amber-700/50">
                          Click for source
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative amber dot */}
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/50"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Section with amber frame */}
          <AnimatePresence>
            {address && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.1
                }}
                onClick={() => addressCitation && onElementClick(addressCitation.id)}
                className={cn(
                  "relative cursor-pointer group",
                  highlightedElementId === addressCitation?.id && "ring-2 ring-amber-500 ring-offset-4 rounded-xl"
                )}
              >
                <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm text-amber-700 dark:text-amber-300">Project Location</span>
                    </div>
                    <Maximize2 className="h-4 w-4 text-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="h-64 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-950/30 dark:to-orange-950/30 relative">
                    {mapsLoading ? (
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
                          zoom={mapZoom}
                          options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                            styles: [
                              {
                                featureType: "all",
                                stylers: [{ saturation: -20 }]
                              }
                            ]
                          }}
                        >
                          <Marker 
                            position={coordinates}
                            animation={google.maps.Animation?.DROP}
                          />
                        </GoogleMap>
                      </LoadScript>
                    ) : (
                      <div className="h-full flex items-center justify-center text-amber-600/70 dark:text-amber-400/70">
                        <div className="text-center space-y-2">
                          <MapPin className="h-8 w-8 mx-auto opacity-50" />
                          <p className="text-sm">Locating address...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Zoom animation overlay with amber tint */}
                    {coordinates && mapZoom < 15 && (
                      <motion.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 bg-amber-500/10 pointer-events-none"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wireframe Section with amber frame */}
          <AnimatePresence>
            {workType && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.2
                }}
                onClick={() => workTypeCitation && onElementClick(workTypeCitation.id)}
                className={cn(
                  "relative cursor-pointer group",
                  highlightedElementId === workTypeCitation?.id && "ring-2 ring-amber-500 ring-offset-4 rounded-xl"
                )}
              >
                <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-xl overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm text-amber-700 dark:text-amber-300">
                        {WORK_TYPE_LABELS[workType as WorkType] || workType}
                      </span>
                    </div>
                    <span className="text-xs text-amber-500/70 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                      Click for source
                    </span>
                  </div>
                  
                  <WireframeVisualizer workType={workType} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

DynamicCanvas.displayName = "DynamicCanvas";

export default DynamicCanvas;
