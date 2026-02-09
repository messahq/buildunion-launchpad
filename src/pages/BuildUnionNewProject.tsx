// ============================================
// BUILD UNION NEW PROJECT - Citation-Driven Flow
// ============================================
// DB-First: Project is created FIRST, then citations are saved
// Horizontal Stage Transitions: No vertical scrolling!
// ============================================

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Citation, CITATION_TYPES } from "@/types/citation";
import WizardChatInterface from "@/components/project-wizard/WizardChatInterface";
import CitationDrivenCanvas from "@/components/project-wizard/CitationDrivenCanvas";
import GFALockStage from "@/components/project-wizard/GFALockStage";
import DefinitionFlowStage from "@/components/project-wizard/DefinitionFlowStage";
import TeamSetupStage from "@/components/project-wizard/TeamSetupStage";
import Stage7GanttSetup from "@/components/project-wizard/Stage7GanttSetup";
import Stage8FinalReview from "@/components/project-wizard/Stage8FinalReview";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import {
  saveProjectToLocalStorage,
  restoreProjectFromLocalStorage,
  syncCitationsToLocalStorage,
  logCriticalError,
  canDeleteProject,
} from "@/lib/projectPersistence";

// Stage definitions
const STAGES = {
  STAGE_1: 0, // Name, Address, Work Type
  STAGE_2: 1, // GFA Lock & Blueprint
  STAGE_3: 2, // Definition Flow (Trade, Template, Site, Finalize)
  STAGE_6: 3, // Team Architecture (Permissions)
  STAGE_7: 4, // Gantt Setup & Task Orchestration
  STAGE_8: 5, // Final Review & Analysis Dashboard
} as const;

const BuildUnionNewProject = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  
  // Project state - created FIRST before any citations
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Citation-driven state
  const [citations, setCitations] = useState<Citation[]>([]);
  const [currentStep, setCurrentStep] = useState(0); // Steps within Stage 1
  const [currentStage, setCurrentStage] = useState<number>(STAGES.STAGE_1);
  
  // GFA value for Stage 3
  const [gfaValue, setGfaValue] = useState<number>(0);
  
  // Cross-panel highlighting
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null);
  
  // Stage 1 has 3 questions (name, address, work_type)
  const STAGE_1_STEPS = 3;
  
  // Create draft project on mount
  useEffect(() => {
    if (!user || projectId) return;
    
    // Check if continuing from existing project
    const continueProjectId = sessionStorage.getItem('continueFromProjectId');
    const continueStage = parseInt(sessionStorage.getItem('continueFromStage') || '0');
    const continueGfaValue = parseFloat(sessionStorage.getItem('continueGfaValue') || '0');
    
    if (continueProjectId && continueStage === 3) {
      // Load existing project instead of creating new
      console.log("[NewProject] Continuing from project:", continueProjectId);
      setProjectId(continueProjectId);
      setCurrentStage(STAGES.STAGE_3);
      setGfaValue(continueGfaValue);
      
      // Load citations from existing project
      const loadCitations = async () => {
        const { data: summary } = await supabase
          .from('project_summaries')
          .select('verified_facts')
          .eq('project_id', continueProjectId)
          .single();
        
        if (summary?.verified_facts) {
          const facts = Array.isArray(summary.verified_facts) ? (summary.verified_facts as unknown as Citation[]) : [];
          setCitations(facts);
        }
        setIsInitializing(false);
      };
      
      loadCitations().catch(error => {
        console.error("Failed to load citations:", error);
        setIsInitializing(false);
      });
      
      // Clear session storage
      sessionStorage.removeItem('continueFromProjectId');
      sessionStorage.removeItem('continueFromStage');
      sessionStorage.removeItem('continueGfaValue');
      return;
    }
    
    const createDraftProject = async () => {
      try {
        const projectName = `Project-${Date.now()}`;
        
        // ✓ IMMEDIATE PERSISTENCE: Create project with 'active' status from the start
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            name: projectName,
            user_id: user.id,
            status: 'active', // NOT 'draft' - active from minute 1
          })
          .select('id')
          .single();

        if (error) throw error;
        if (!newProject) throw new Error('No project returned');

        console.log('[NewProject] Active project created:', newProject.id);
        setProjectId(newProject.id);
        
        // Create project_summaries record with 'active' status
        const { error: summaryError } = await supabase
          .from('project_summaries')
          .insert({
            project_id: newProject.id,
            user_id: user.id,
            status: 'active',
            verified_facts: [],
          });

        if (summaryError) {
          logCriticalError('[NewProject] Failed to create summary', summaryError);
          // Non-fatal - continue anyway
        }

        // ✓ LOCAL BACKUP: Save to localStorage immediately
        saveProjectToLocalStorage({
          projectId: newProject.id,
          userId: user.id,
          currentStage: 0,
          citations: [],
          gfaValue: 0,
          timestamp: Date.now(),
        });
      } catch (err) {
        logCriticalError('[NewProject] Failed to create project', err);
        toast.error('Failed to initialize project');
        navigate('/buildunion/workspace');
      } finally {
        setIsInitializing(false);
      }
    };

    createDraftProject();
  }, [user, navigate]);

  // Handle citation saved
  const handleCitationSaved = useCallback((citation: Citation) => {
    console.log('[NewProject] Citation saved:', citation.cite_type);
    setCitations(prev => {
      const newCitations = prev.some(c => c.id === citation.id)
        ? prev.map(c => c.id === citation.id ? citation : c)
        : [...prev, citation];
      
      // ✓ SYNC: Update localStorage in real-time
      if (projectId) {
        syncCitationsToLocalStorage(projectId, newCitations, currentStage, gfaValue);
      }
      
      return newCitations;
    });
  }, [projectId, currentStage, gfaValue]);

  // Handle citation click (cross-panel highlighting)
  const handleCitationClick = useCallback((citationId: string) => {
    setHighlightedCitationId(citationId);
    setTimeout(() => setHighlightedCitationId(null), 3000);
  }, []);

  // Handle Stage 1 completion
  const handleStepComplete = useCallback(() => {
    const newStep = currentStep + 1;
    if (newStep >= STAGE_1_STEPS) {
      console.log('[NewProject] Stage 1 Complete, moving to Stage 2');
      const newStage = STAGES.STAGE_2;
      setCurrentStage(newStage);
      setCurrentStep(0);
      
      // ✓ SYNC: Update localStorage with new stage
      if (projectId) {
        syncCitationsToLocalStorage(projectId, citations, newStage, gfaValue);
      }
    } else {
      setCurrentStep(newStep);
    }
  }, [currentStep, STAGE_1_STEPS, projectId, citations, gfaValue]);

  // Handle Stage 2 (GFA Lock) completion
  const handleGFALockComplete = useCallback((citation: Citation) => {
    console.log('[NewProject] GFA Lock complete:', citation.value);
    
    // ✓ CRITICAL FIX: Add GFA citation to the citations array
    const updatedCitations = [...citations, citation];
    setCitations(updatedCitations);
    
    let newGfaValue = gfaValue;
    if (typeof citation.value === 'number') {
      newGfaValue = citation.value;
      setGfaValue(newGfaValue);
    } else if (typeof citation.metadata?.gfa_value === 'number') {
      newGfaValue = citation.metadata.gfa_value;
      setGfaValue(newGfaValue);
    }
    
    const newStage = STAGES.STAGE_3;
    setCurrentStage(newStage);
    
    // ✓ SYNC: Update localStorage with updated citations and new stage
    if (projectId) {
      syncCitationsToLocalStorage(projectId, updatedCitations, newStage, newGfaValue);
    }
  }, [projectId, citations, gfaValue]);

  // Handle Stage 3 (Definition Flow) completion
  const handleDefinitionFlowComplete = useCallback(async (citations_data: Citation[]) => {
    console.log('[NewProject] Definition Flow complete');
    
    // Save citations to project
    if (projectId) {
      const allCitations = [...citations, ...citations_data];
      
      const { error } = await supabase
        .from('project_summaries')
        .update({
          verified_facts: allCitations as any,
        })
        .eq('project_id', projectId);

      if (error) {
        logCriticalError('[NewProject] Failed to save citations', error);
        // Continue anyway - localStorage has backup
      } else {
        // ✓ SYNC: Update localStorage after successful DB save
        syncCitationsToLocalStorage(projectId, allCitations, STAGES.STAGE_6, gfaValue);
      }
    }
    
    toast.success("Project DNA ready! Now let's set up your team...");
    setTimeout(() => {
      setCurrentStage(STAGES.STAGE_6);
    }, 800);
  }, [projectId, citations, gfaValue]);

  // Handle Team Setup completion
  const handleTeamSetupComplete = useCallback(async (teamCitations: Citation[]) => {
    console.log('[NewProject] Team setup complete');
    
    // Save team citations
    if (projectId) {
      const allCitations = [...citations, ...teamCitations];
      
      const { error } = await supabase
        .from('project_summaries')
        .update({
          verified_facts: allCitations as any,
        })
        .eq('project_id', projectId);

      if (error) {
        logCriticalError('[NewProject] Failed to save team citations', error);
        // Continue - localStorage has backup
      } else {
        syncCitationsToLocalStorage(projectId, allCitations, STAGES.STAGE_7, gfaValue);
      }
    }
    
    toast.success("Team structure set! Moving to next phase...");
    setTimeout(() => {
      setCurrentStage(STAGES.STAGE_7);
    }, 800);
  }, [projectId, citations, gfaValue]);

  // Handle Team Setup skip
  const handleTeamSetupSkip = useCallback(() => {
    console.log('[NewProject] Team setup skipped');
    toast.info("You can add team members later from the workspace");
    setTimeout(() => {
      setCurrentStage(STAGES.STAGE_7);
    }, 600);
  }, []);

  // Loading state
  if (authLoading || isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-muted-foreground">Initializing project...</p>
        </div>
      </div>
    );
  }

  if (!user || !projectId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Unable to initialize project</p>
      </div>
    );
  }

  const stageLabels: Record<number, string> = {
    [STAGES.STAGE_1]: "Stage 1: Basic Info",
    [STAGES.STAGE_2]: "Stage 2: Lock Area",
    [STAGES.STAGE_3]: "Stage 3-5: Definition Flow",
    [STAGES.STAGE_6]: "Stage 6: Team Architecture",
    [STAGES.STAGE_7]: "Stage 7: Execution Timeline",
    [STAGES.STAGE_8]: "Stage 8: Final Review",
  };
  const stageLabel = stageLabels[currentStage] || "";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      <BuildUnionHeader />
      
      {/* Top Navigation */}
      <div className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-background/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm sticky top-0 z-40 shrink-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/workspace")}
              className="gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back", "Back")}
            </Button>
            
            <div className="flex items-center gap-2">
              <h1 className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                {t("project.newProject", "Project 3.0 Wizard")}
              </h1>
              <ChevronRight className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-600/70 dark:text-amber-400/70">
                {stageLabel}
              </span>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Main Content - Horizontal Slide Container */}
      <main className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="wait">
          {currentStage === STAGES.STAGE_1 ? (
            /* ========== STAGE 1: Name/Address/Type ========== */
            <motion.div
              key="stage-1"
              initial={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0 flex"
            >
              {/* Left Panel - Chat Interface */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full md:w-[400px] lg:w-[450px] border-r border-amber-200/50 dark:border-amber-800/30 flex flex-col h-full"
              >
                <WizardChatInterface
                  projectId={projectId}
                  userId={user.id}
                  onCitationSaved={handleCitationSaved}
                  onCitationClick={handleCitationClick}
                  highlightedCitationId={highlightedCitationId}
                  currentStep={currentStep}
                  onStepComplete={handleStepComplete}
                />
              </motion.div>

              {/* Right Panel - Citation-Driven Canvas */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden md:flex flex-1 flex-col h-full"
              >
                <CitationDrivenCanvas
                  citations={citations}
                  onCitationClick={handleCitationClick}
                  highlightedCitationId={highlightedCitationId}
                />
              </motion.div>
            </motion.div>
          ) : currentStage === STAGES.STAGE_2 ? (
            /* ========== STAGE 2: GFA Lock ========== */
            <motion.div
              key="stage-2"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0 flex"
            >
              {/* Left Panel - Stage 2 Summary (hidden on mobile to show GFA input) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="hidden md:flex w-[400px] lg:w-[450px] border-r border-amber-200/50 dark:border-amber-800/30 flex-col h-full bg-gradient-to-b from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10"
              >
                {/* Summary Header */}
                <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50">
                  <h3 className="font-semibold text-amber-700 dark:text-amber-300">
                    ✓ Stage 1 Complete
                  </h3>
                </div>
              </motion.div>

              {/* Right Panel - GFA Lock Stage (visible on all screens) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-1"
              >
                <GFALockStage
                  projectId={projectId}
                  userId={user.id}
                  onGFALocked={handleGFALockComplete}
                  onCitationClick={handleCitationClick}
                  className="w-full"
                />
              </motion.div>
            </motion.div>
          ) : currentStage === STAGES.STAGE_3 ? (
            /* ========== STAGE 3: Definition Flow ========== */
            <motion.div
              key="stage-3"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {/* DefinitionFlowStage now includes both LEFT (Chat) and RIGHT (Canvas) panels */}
              <DefinitionFlowStage
                projectId={projectId}
                userId={user.id}
                gfaValue={gfaValue}
                onFlowComplete={handleDefinitionFlowComplete}
                onCitationClick={handleCitationClick}
                className="h-full"
              />
            </motion.div>
          ) : currentStage === STAGES.STAGE_6 ? (
            /* ========== STAGE 6: Team Architecture ========== */
            <motion.div
              key="stage-6"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <TeamSetupStage
                projectId={projectId}
                userId={user.id}
                onComplete={handleTeamSetupComplete}
                onSkip={handleTeamSetupSkip}
                className="h-full"
              />
            </motion.div>
          ) : currentStage === STAGES.STAGE_7 ? (
            /* ========== STAGE 7: Gantt Setup & Task Orchestration ========== */
            <motion.div
              key="stage-7"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Stage7GanttSetup
                projectId={projectId}
                userId={user.id}
                onComplete={() => setCurrentStage(STAGES.STAGE_8)}
              />
            </motion.div>
          ) : (
            /* ========== STAGE 8: Final Review & Analysis Dashboard ========== */
            <motion.div
              key="stage-8"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Stage8FinalReview
                projectId={projectId}
                userId={user.id}
                userRole="owner"
                onComplete={() => navigate('/buildunion/workspace')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default BuildUnionNewProject;
