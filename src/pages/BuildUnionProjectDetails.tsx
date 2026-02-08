import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Building, FileText, Sparkles, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import { WizardCitation, WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import { Citation, CITATION_TYPES } from "@/types/citation";
import WireframeVisualizer from "@/components/project-wizard/WireframeVisualizer";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectData {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

interface ProjectSummary {
  id: string;
  verified_facts: (WizardCitation | Citation)[] | null;
  blueprint_analysis: any | null;
  total_cost: number | null;
  material_cost: number | null;
  labor_cost: number | null;
  status: string;
}

const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiKey, isLoading: mapsLoading } = useGoogleMapsApi();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Geocode address
  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const { data } = await supabase.functions.invoke("get-maps-key");
      if (!data?.key) return null;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${data.key}`
      );
      const result = await response.json();
      
      if (result.results?.[0]?.geometry?.location) {
        return result.results[0].geometry.location;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  }, []);

  // Load project data
  useEffect(() => {
    if (authLoading || !projectId) return;
    if (!user) {
      navigate("/buildunion/login");
      return;
    }

    const loadProject = async () => {
      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        console.error("Error loading project:", projectError);
        toast.error("Project not found");
        navigate("/buildunion/workspace");
        return;
      }

      setProject(projectData);

      // Load summary
      const { data: summaryData } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (summaryData) {
        // Parse verified_facts from JSON
        let parsedFacts: (WizardCitation | Citation)[] = [];
        if (Array.isArray(summaryData.verified_facts)) {
          parsedFacts = (summaryData.verified_facts as unknown as (WizardCitation | Citation)[]).filter(
            (fact): fact is (WizardCitation | Citation) => 
              fact !== null && 
              typeof fact === 'object' && 
              'id' in fact && 
              'answer' in fact
          );
        }
        
        setSummary({
          ...summaryData,
          verified_facts: parsedFacts
        });

        // PRIORITY: Extract coordinates from LOCATION citation first
        const locationCitation = parsedFacts.find(
          (f) => (f as Citation).cite_type === CITATION_TYPES.LOCATION || 
                 (f as WizardCitation).questionKey === 'project_address'
        );
        
        const citationCoords = (locationCitation as Citation)?.metadata?.coordinates;
        
        if (citationCoords) {
          console.log("[ProjectDetails] Using coordinates from citation:", citationCoords);
          setCoordinates(citationCoords);
        } else if (projectData.address) {
          // Fallback: Geocode the address if no coordinates in citation
          console.log("[ProjectDetails] No citation coords, geocoding address:", projectData.address);
          const coords = await geocodeAddress(projectData.address);
          if (coords) setCoordinates(coords);
        }
      } else if (projectData.address) {
        // No summary at all, try geocoding
        const coords = await geocodeAddress(projectData.address);
        if (coords) setCoordinates(coords);
      }

      setLoading(false);
    };

    loadProject();
  }, [user, authLoading, projectId, navigate, geocodeAddress]);

  // Handle project deletion (soft delete)
  const handleDeleteProject = async () => {
    if (!project) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) throw error;

      toast.success(t("workspace.projectDeleted", "Project deleted successfully"));
      navigate("/buildunion/workspace");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(t("workspace.deleteError", "Failed to delete project"));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const verifiedFacts = summary?.verified_facts || [];
  
  // Extract GFA value from citations
  const gfaCitation = verifiedFacts.find(
    (f) => (f as Citation).cite_type === CITATION_TYPES.GFA_LOCK
  ) as Citation | undefined;
  const gfaValue = gfaCitation?.metadata?.gfa_value as number | undefined;

  // Get work type from citation if project.trade is missing
  const workTypeCitation = verifiedFacts.find(
    (f) => (f as Citation).cite_type === CITATION_TYPES.WORK_TYPE ||
           ('questionKey' in f && f.questionKey === 'work_type')
  );
  const workType = project.trade || 
    (workTypeCitation as Citation)?.metadata?.work_type_key ||
    (workTypeCitation as WizardCitation)?.answer;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      <BuildUnionHeader />
      
      {/* Top Navigation - Wizard style */}
      <div className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-background/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12 md:h-14">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/workspace")}
              className="gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.back", "Back")}</span>
            </Button>
            
            {/* Stage indicator like wizard */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Project Details
              </span>
              <ChevronRight className="h-4 w-4 text-amber-400" />
              <span className="text-amber-700/70 dark:text-amber-400/70">
                {project.name}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Wizard-style two panel layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden pb-20 md:pb-0">
        
        {/* LEFT PANEL - Chat-style verified facts */}
        <div className="w-full md:w-1/2 flex flex-col border-r-0 md:border-r border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-slate-50/50 via-background to-slate-100/30 dark:from-slate-950/30 dark:via-background dark:to-slate-900/20">
          
          {/* Project Header in chat panel */}
          <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-amber-700 dark:text-amber-300">
                  Project Summary
                </h2>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                  Verified facts from wizard
                </p>
              </div>
            </div>
          </div>
          
          {/* Chat-style messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* System message - Project name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">What would you like to name this project?</p>
              </div>
            </motion.div>
            
            {/* User answer - Project name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                <p className="font-medium">{project.name}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                  <FileText className="h-3 w-3" />
                  <span>cite_project...</span>
                </div>
              </div>
            </motion.div>

            {/* System message - Address */}
            {project.address && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-sm text-muted-foreground">Where is the project located?</p>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                    <p className="font-medium">{project.address}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                      <FileText className="h-3 w-3" />
                      <span>cite_locatio...</span>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {/* System message - Work type */}
            {workType && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-sm text-muted-foreground">What type of work is this project?</p>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                    <p className="font-medium">{WORK_TYPE_LABELS[workType as WorkType] || workType}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                      <FileText className="h-3 w-3" />
                      <span>cite_work_ty...</span>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {/* GFA Lock info if exists */}
            {gfaValue && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-sm text-muted-foreground">What is the Gross Floor Area?</p>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                    <p className="font-medium">{gfaValue.toLocaleString()} sq ft</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                      <FileText className="h-3 w-3" />
                      <span>cite_gfa_lock...</span>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {/* Next question prompt */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold">Next Step</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ready to upload blueprints for AI analysis?
                </p>
                <Button 
                  className="mt-3 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0"
                  size="sm"
                  disabled
                >
                  Upload Blueprint
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-amber-500/70 mt-2">Coming soon...</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT PANEL - Dynamic Canvas (Map + Wireframe) */}
        <div className="w-full md:w-1/2 flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20">
          
          {/* Canvas Header */}
          <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Building className="h-4 w-4" />
                <span className="font-semibold uppercase">PROJECT 3.0</span>
              </div>
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent mt-1">
              {project.name}
            </h2>
          </div>
          
          {/* Map Section */}
          <div className="border-b border-amber-200/50 dark:border-amber-800/30">
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Project Location</span>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-amber-300 dark:border-amber-700">
                cite_locatio...
              </Badge>
            </div>
            <div className="h-48 md:h-56 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-950/30 dark:to-orange-950/30">
              {mapsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
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
                    <p className="text-sm">No location available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Wireframe Section */}
          <div className="flex-1">
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium">Project Visualization</span>
              </div>
              {workType && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                  {WORK_TYPE_LABELS[workType as WorkType] || workType}
                </Badge>
              )}
            </div>
            <div className="h-48 md:h-auto md:flex-1">
              {workType ? (
                <WireframeVisualizer workType={workType} gfaValue={gfaValue} />
              ) : (
                <WireframeVisualizer />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workspace.deleteProject", "Delete Project")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workspace.deleteConfirmation", "Are you sure you want to delete")} <strong>{project?.name}</strong>? 
              {t("workspace.deleteWarning", " This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("common.deleting", "Deleting...")}
                </>
              ) : (
                t("common.delete", "Delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuildUnionProjectDetails;
