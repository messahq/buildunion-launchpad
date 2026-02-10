import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Building, FileText, Sparkles, ChevronRight, Trash2, User, Users, Lock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import RoleDashboard from "@/components/projects/RoleDashboard";
import { WizardCitation, WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import WireframeVisualizer from "@/components/project-wizard/WireframeVisualizer";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
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
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [teamMemberRole, setTeamMemberRole] = useState<string>('member');
  
  // Stage 4 Execution Flow state
  const [stage4Step, setStage4Step] = useState(0); // 0=not started, 1=team, 2=site, 3=date
  const [executionMode, setExecutionMode] = useState<'solo' | 'team' | null>(null);
  const [siteCondition, setSiteCondition] = useState<'clear' | 'demolition' | null>(null);
  const [timeline, setTimeline] = useState<'asap' | 'scheduled' | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [isSavingStage4, setIsSavingStage4] = useState(false);

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

  // Load project data and check user role
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

      // Check if user is owner or team member
      const isOwner = projectData.user_id === user.id;
      
      // Load summary to check project state
      const { data: summaryData } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .single();

      // Check if project has reached Stage 8 (has GFA lock OR is active status)
      // A project is considered "ready for Stage 8 dashboard" if it has been through the wizard
      let hasReachedStage8 = false;
      if (summaryData?.verified_facts && Array.isArray(summaryData.verified_facts)) {
        const facts = summaryData.verified_facts as unknown as Citation[];
        const hasGfaLock = facts.some(f => f.cite_type === CITATION_TYPES.GFA_LOCK);
        // If project has GFA locked AND is active, it's ready for Stage 8
        hasReachedStage8 = hasGfaLock && projectData.status === 'active';
      }

      if (!isOwner) {
        // Check if user is a team member
        const { data: memberData } = await supabase
          .from("project_members")
          .select("role")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .single();
        
        if (memberData) {
          // Team members see the simplified role-based dashboard first
          console.log("[ProjectDetails] Team member detected, showing role dashboard");
          setTeamMemberRole(memberData.role);
          setIsTeamMember(true);
          setLoading(false);
          return;
        }
      } else if (hasReachedStage8) {
        // Owner accessing a completed project - redirect to Stage 8 dashboard
        console.log("[ProjectDetails] Owner accessing completed project, redirecting to Stage 8 dashboard");
        navigate(`/buildunion/new-project?projectId=${projectId}&stage=8&role=owner`, { replace: true });
        return;
      }

      // Only reach here if project is NOT yet at Stage 8 (still in wizard flow)
      setProject(projectData);

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

  // Handle Stage 4 finalization
  const handleFinalizeProject = async () => {
    if (!project || !user || !executionMode || !siteCondition || !timeline) return;
    
    setIsSavingStage4(true);
    try {
      const gfaVal = (summary?.verified_facts || []).find(
        (f) => (f as Citation).cite_type === CITATION_TYPES.GFA_LOCK
      ) as Citation | undefined;
      const gfaValue = gfaVal?.metadata?.gfa_value as number || 0;
      const demolitionCost = siteCondition === 'demolition' ? gfaValue * 2.5 : 0;

      const executionCitation = createCitation({
        cite_type: CITATION_TYPES.EXECUTION_MODE,
        question_key: 'execution_mode',
        answer: executionMode === 'solo' ? 'Solo Installation' : 'Team Installation',
        value: executionMode,
        metadata: { is_team: executionMode === 'team' },
      });

      const siteCitation = createCitation({
        cite_type: CITATION_TYPES.SITE_CONDITION,
        question_key: 'site_condition',
        answer: siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed',
        value: siteCondition,
        metadata: { 
          demolition_required: siteCondition === 'demolition',
          demolition_cost: demolitionCost,
        },
      });

      const timelineCitation = createCitation({
        cite_type: CITATION_TYPES.TIMELINE,
        question_key: 'timeline',
        answer: timeline === 'asap' ? 'ASAP' : `Scheduled: ${scheduledDate ? format(scheduledDate, 'PPP') : 'TBD'}`,
        value: timeline,
        metadata: {
          start_date: timeline === 'asap' ? new Date().toISOString() : scheduledDate?.toISOString(),
        },
      });

      const dnaCitation = createCitation({
        cite_type: CITATION_TYPES.DNA_FINALIZED,
        question_key: 'project_dna',
        answer: `Project DNA Locked: ${gfaValue.toLocaleString()} sq ft`,
        value: {
          gfa: gfaValue,
          execution_mode: executionMode,
          site_condition: siteCondition,
          timeline: timeline,
          demolition_cost: demolitionCost,
        },
        metadata: {
          finalized_at: new Date().toISOString(),
        },
      });

      const newCitations = [executionCitation, siteCitation, timelineCitation, dnaCitation];
      const currentFacts = Array.isArray(summary?.verified_facts) ? summary.verified_facts : [];
      const updatedFacts = [...currentFacts, ...newCitations.map(c => c as unknown as Record<string, unknown>)];

      const { error } = await supabase
        .from("project_summaries")
        .update({
          verified_facts: updatedFacts as unknown as null,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", project.id);

      if (error) throw error;

      toast.success("Project DNA Finalized!");
      
      // Reload the page to show finalized state
      window.location.reload();
      
    } catch (err) {
      console.error("[ProjectDetails] Finalize failed:", err);
      toast.error("Failed to finalize project - please try again");
    } finally {
      setIsSavingStage4(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Team member simplified dashboard
  if (isTeamMember && user && projectId) {
    return <RoleDashboard projectId={projectId} role={teamMemberRole} userId={user.id} />;
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

  // Check if DNA is finalized (Stage 3 complete)
  const dnaFinalized = verifiedFacts.some(
    (f) => (f as Citation).cite_type === CITATION_TYPES.DNA_FINALIZED
  );

  // Get work type from citation if project.trade is missing
  const workTypeCitation = verifiedFacts.find(
    (f) => (f as Citation).cite_type === CITATION_TYPES.WORK_TYPE ||
           ('questionKey' in f && f.questionKey === 'work_type')
  );
  const workType = project.trade || 
    (workTypeCitation as Citation)?.metadata?.work_type_key ||
    (workTypeCitation as WizardCitation)?.answer;
  
  // Determine if we can continue to Stage 3
  const canContinueToDefinition = gfaValue && !dnaFinalized;

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

            {/* STAGE 4: Execution Flow (if GFA locked but DNA not finalized) */}
            {gfaValue && !dnaFinalized && (
              <AnimatePresence mode="wait">
                {/* Stage 4 Step 1: Who is handling the installation? */}
                {stage4Step === 0 && (
                  <motion.div
                    key="stage4-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 shadow-sm">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold">MESSA AI • Stage 4</span>
                      </div>
                      <p className="text-sm text-foreground mb-3">
                        <strong>Who is handling the installation?</strong>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setExecutionMode('solo');
                            setStage4Step(1);
                          }}
                          className="p-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-card hover:border-green-400 dark:hover:border-green-600 transition-all flex flex-col items-center gap-1 text-center"
                        >
                          <User className="h-6 w-6 text-green-500" />
                          <span className="text-sm font-medium">Solo</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setExecutionMode('team');
                            setStage4Step(1);
                          }}
                          className="p-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-card hover:border-green-400 dark:hover:border-green-600 transition-all flex flex-col items-center gap-1 text-center"
                        >
                          <Users className="h-6 w-6 text-green-500" />
                          <span className="text-sm font-medium">Team</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* User Answer - Execution Mode */}
                {executionMode && stage4Step >= 1 && (
                  <motion.div
                    key="exec-answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
                      <p className="font-medium">{executionMode === 'solo' ? 'Solo Installation' : 'Team Installation'}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-white/80">
                        <FileText className="h-3 w-3" />
                        <span>cite_execution...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stage 4 Step 2: Site Condition */}
                {stage4Step >= 1 && !siteCondition && (
                  <motion.div
                    key="site-question"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 shadow-sm">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold">MESSA AI</span>
                      </div>
                      <p className="text-sm text-foreground mb-3">
                        <strong>What's the site condition?</strong>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSiteCondition('clear');
                            setStage4Step(2);
                          }}
                          className="p-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-card hover:border-green-400 dark:hover:border-green-600 transition-all text-left"
                        >
                          <p className="font-medium text-sm">Clear Site</p>
                          <p className="text-xs text-muted-foreground">Ready to work</p>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSiteCondition('demolition');
                            setStage4Step(2);
                          }}
                          className="p-3 rounded-xl border-2 border-green-200 dark:border-green-800 bg-card hover:border-orange-400 dark:hover:border-orange-600 transition-all text-left"
                        >
                          <p className="font-medium text-sm">Demolition Needed</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">+${((gfaValue || 0) * 2.5).toLocaleString()} ($2.50/sq ft)</p>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* User Answer - Site Condition */}
                {siteCondition && stage4Step >= 2 && (
                  <motion.div
                    key="site-answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-white shadow-lg ${
                      siteCondition === 'demolition'
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/25'
                        : 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/25'
                    }`}>
                      <p className="font-medium">{siteCondition === 'clear' ? 'Clear Site' : 'Demolition Needed'}</p>
                      {siteCondition === 'demolition' && (
                        <p className="text-xs text-white/80">+${((gfaValue || 0) * 2.5).toLocaleString()} added</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Stage 4 Step 3: Start Date */}
                {stage4Step >= 2 && (
                  <motion.div
                    key="date-question"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 shadow-sm">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold">MESSA AI</span>
                      </div>
                      <p className="text-sm text-foreground mb-3">
                        <strong>When do you want to start?</strong>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTimeline('asap')}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            timeline === 'asap'
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                              : 'border-green-200 dark:border-green-800 hover:border-green-400'
                          }`}
                        >
                          <p className="font-medium text-sm">ASAP</p>
                          <p className="text-xs text-muted-foreground">Start immediately</p>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTimeline('scheduled')}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            timeline === 'scheduled'
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                              : 'border-green-200 dark:border-green-800 hover:border-green-400'
                          }`}
                        >
                          <p className="font-medium text-sm">Scheduled</p>
                          <p className="text-xs text-muted-foreground">Pick a date</p>
                        </motion.button>
                      </div>
                      
                      {/* Date Picker */}
                      {timeline === 'scheduled' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mb-3"
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <Calendar className="mr-2 h-4 w-4" />
                                {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={scheduledDate}
                                onSelect={setScheduledDate}
                                initialFocus
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </motion.div>
                      )}
                      
                      {/* Final Lock Button */}
                      {(timeline === 'asap' || (timeline === 'scheduled' && scheduledDate)) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Button
                            onClick={handleFinalizeProject}
                            disabled={isSavingStage4}
                            className="w-full h-12 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 gap-2"
                          >
                            {isSavingStage4 ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Finalizing Project...
                              </>
                            ) : (
                              <>
                                <Lock className="h-5 w-5" />
                                FINALIZE PROJECT
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* DNA Finalized confirmation + Ready for Execution CTA */}
            {dnaFinalized && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-green-500 shadow-lg shadow-green-500/25">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                      <Lock className="h-4 w-4" />
                      <span className="text-xs font-semibold">Project DNA Finalized</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All project parameters are locked. Ready for execution.
                    </p>
                  </div>
                </motion.div>
                
                {/* Ready for Execution CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="pt-4"
                >
                  <Button
                    onClick={() => {
                      toast.success("Project ready! Redirecting to Workspace...");
                      setTimeout(() => navigate("/buildunion/workspace"), 800);
                    }}
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 gap-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                    Ready for Execution — Go to Workspace
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Interactive Visual Panels (Clickable for Editing) */}
        <div className="w-full md:w-1/2 flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 overflow-y-auto pb-20 md:pb-0">
          
          {/* Canvas Header */}
          <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Building className="h-4 w-4" />
                <span className="font-semibold uppercase tracking-wider">PROJECT 3.0</span>
              </div>
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent mt-1">
              {project.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Click any panel to edit</p>
          </div>
          
          {/* Interactive Panels Container */}
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            
            {/* LOCATION PANEL - Clickable */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setHighlightedCitation('location');
                toast.info("Location editing coming soon...");
              }}
              className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                highlightedCitation === 'location' 
                  ? 'border-amber-500 shadow-lg shadow-amber-500/25' 
                  : 'border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400 dark:hover:border-amber-600'
              }`}
            >
              {/* Panel Header */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-semibold">Project Location</span>
                </div>
                <Badge 
                  variant="outline" 
                  className="text-[10px] font-mono border-amber-300 dark:border-amber-700 bg-amber-100/50 dark:bg-amber-900/30 px-2"
                >
                  cite_location_{project.id.slice(0, 6)}
                </Badge>
              </div>
              {/* Map Content */}
              <div className="h-36 md:h-44 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-950/30 dark:to-orange-950/30">
                {mapsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : apiKey && coordinates ? (
                  <LoadScript googleMapsApiKey={apiKey}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={coordinates}
                      zoom={15}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: false,
                        styles: [{ featureType: "all", stylers: [{ saturation: -20 }] }]
                      }}
                    >
                      <Marker position={coordinates} />
                    </GoogleMap>
                  </LoadScript>
                ) : (
                  <div className="h-full flex items-center justify-center text-amber-600/70 dark:text-amber-400/70">
                    <div className="text-center space-y-1">
                      <MapPin className="h-6 w-6 mx-auto opacity-50" />
                      <p className="text-xs">No location set</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Panel Footer - Address */}
              {project.address && (
                <div className="px-3 py-2 bg-white/80 dark:bg-slate-900/50 border-t border-amber-200/30 dark:border-amber-800/20">
                  <p className="text-xs text-muted-foreground truncate">{project.address}</p>
                </div>
              )}
            </motion.div>
            
            {/* WORK TYPE / WIREFRAME PANEL - Clickable */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setHighlightedCitation('worktype');
                toast.info("Work type editing coming soon...");
              }}
              className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                highlightedCitation === 'worktype' 
                  ? 'border-amber-500 shadow-lg shadow-amber-500/25' 
                  : 'border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400 dark:hover:border-amber-600'
              }`}
            >
              {/* Panel Header */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Building className="h-4 w-4" />
                  <span className="text-sm font-semibold">Work Type</span>
                </div>
                <div className="flex items-center gap-2">
                  {workType && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-2">
                      {WORK_TYPE_LABELS[workType as WorkType] || workType}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className="text-[10px] font-mono border-amber-300 dark:border-amber-700 bg-amber-100/50 dark:bg-amber-900/30 px-2"
                  >
                    cite_work_{project.id.slice(0, 6)}
                  </Badge>
                </div>
              </div>
              {/* Wireframe Content */}
              <div className="h-32 md:h-40">
                {workType ? (
                  <WireframeVisualizer workType={workType} gfaValue={gfaValue} />
                ) : (
                  <WireframeVisualizer />
                )}
              </div>
            </motion.div>
            
            {/* GFA PANEL - Clickable (if exists) */}
            {gfaValue && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setHighlightedCitation('gfa');
                  toast.info("GFA editing coming soon...");
                }}
                className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  highlightedCitation === 'gfa' 
                    ? 'border-amber-500 shadow-lg shadow-amber-500/25' 
                    : 'border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400 dark:hover:border-amber-600'
                }`}
              >
                {/* Panel Header */}
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">Gross Floor Area</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-[10px] font-mono border-amber-300 dark:border-amber-700 bg-amber-100/50 dark:bg-amber-900/30 px-2"
                  >
                    cite_gfa_{project.id.slice(0, 6)}
                  </Badge>
                </div>
                {/* GFA Content */}
                <div className="p-4 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-950/30 dark:to-orange-950/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                        {gfaValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">square feet</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <span className="text-white text-xs font-bold">LOCKED</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* CONTINUE TO DEFINITION or BLUEPRINT PANEL */}
            {canContinueToDefinition ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  // Store the projectId and stage in sessionStorage for BuildUnionNewProject to pick up
                  sessionStorage.setItem('continueFromProjectId', projectId || '');
                  sessionStorage.setItem('continueFromStage', '3');
                  sessionStorage.setItem('continueGfaValue', gfaValue?.toString() || '0');
                  // Navigate to new project with continue mode
                  navigate('/buildunion/new-project');
                }}
                className="rounded-xl overflow-hidden border-2 border-amber-400 dark:border-amber-600 cursor-pointer transition-all bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/50 hover:shadow-lg hover:shadow-amber-500/25"
              >
                {/* Panel Header */}
                <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <ChevronRight className="h-5 w-5" />
                    <span className="text-sm font-bold">Continue to Definition Flow</span>
                  </div>
                  <Badge className="bg-white text-amber-700 font-bold text-[10px] px-2">
                    STAGE 3
                  </Badge>
                </div>
                {/* Content */}
                <div className="p-6 flex items-center justify-center min-h-[120px]">
                  <div className="text-center space-y-3 w-full">
                    <p className="text-sm text-muted-foreground">
                      GFA is locked. Ready to define your project scope, team, and timeline?
                    </p>
                    <Button
                      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0 w-full"
                      size="sm"
                    >
                      Start Definition Flow
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl overflow-hidden border-2 border-dashed border-amber-200/50 dark:border-amber-800/30 opacity-60"
              >
                {/* Panel Header */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700/70 dark:text-amber-300/70">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-semibold">Blueprint Analysis</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-300/50 dark:border-amber-700/50">
                    Coming Soon
                  </Badge>
                </div>
                {/* Placeholder Content */}
                <div className="p-6 bg-gradient-to-br from-amber-100/20 to-orange-100/20 dark:from-amber-950/20 dark:to-orange-950/20 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-amber-500/50" />
                    <p className="text-xs text-muted-foreground">Upload blueprints for AI analysis</p>
                  </div>
                </div>
              </motion.div>
            )}
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
