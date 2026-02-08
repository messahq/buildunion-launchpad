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
import BuildUnionHeader from "@/components/BuildUnionHeader";

// Stage definitions
const STAGES = {
  STAGE_1: 0, // Name, Address, Work Type
  STAGE_2: 1, // GFA Lock & Blueprint
  STAGE_3: 2, // Definition Flow (Trade, Template, Team, Site, Finalize)
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
        const { data: project, error } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            name: "Untitled Project",
            status: "draft",
          })
          .select()
          .single();

        if (error) throw error;
        
        setProjectId(project.id);
        console.log("[NewProject] Draft project created:", project.id);
      } catch (error) {
        console.error("[NewProject] Failed to create draft:", error);
        toast.error("Failed to initialize project");
        navigate("/buildunion/workspace");
      } finally {
        setIsInitializing(false);
      }
    };

    createDraftProject();
  }, [user, projectId, navigate]);

  // Handle citation saved (from WizardChatInterface)
  const handleCitationSaved = useCallback(async (citation: Citation) => {
    // Add to local state (this is an EFFECT of successful DB save)
    setCitations(prev => [...prev, citation]);
    
    // Update project with extracted data
    if (projectId) {
      const updates: Record<string, string | null> = {};
      
      switch (citation.cite_type) {
        case CITATION_TYPES.PROJECT_NAME:
          updates.name = citation.answer;
          break;
        case CITATION_TYPES.LOCATION:
          updates.address = citation.answer;
          break;
        case CITATION_TYPES.WORK_TYPE:
          updates.trade = citation.metadata?.work_type_key as string || citation.value as string;
          break;
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from("projects")
          .update(updates)
          .eq("id", projectId);
      }
    }
  }, [projectId]);

  // Handle step complete within Stage 1
  const handleStepComplete = useCallback(() => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    // Check if Stage 1 is complete (all 3 questions answered)
    if (nextStep >= STAGE_1_STEPS) {
      // Transition to Stage 2 with slight delay for animation
      setTimeout(() => {
        setCurrentStage(STAGES.STAGE_2);
      }, 500);
    }
  }, [currentStep]);

  // Handle GFA Lock completion - now transitions to Stage 3
  const handleGFALocked = useCallback((citation: Citation) => {
    setCitations(prev => [...prev, citation]);
    
    // Extract GFA value for Stage 3
    const gfa = citation.metadata?.gfa_value as number || 0;
    setGfaValue(gfa);
    
    toast.success("GFA locked! Proceeding to Definition Flow...");
    
    // Transition to Stage 3 after animation
    setTimeout(() => {
      setCurrentStage(STAGES.STAGE_3);
    }, 800);
  }, []);

  // Handle Definition Flow complete
  const handleDefinitionFlowComplete = useCallback((newCitations: Citation[]) => {
    setCitations(prev => [...prev, ...newCitations]);
    
    // Navigate to project details
    toast.success("Project DNA Finalized! Opening project...");
    setTimeout(() => {
      navigate(`/buildunion/project/${projectId}`);
    }, 1500);
  }, [projectId, navigate]);

  // Handle citation click from chat (highlight on canvas)
  const handleCitationClick = useCallback((citationId: string) => {
    setHighlightedCitationId(citationId);
    setTimeout(() => setHighlightedCitationId(null), 3000);
  }, []);

  // Auth check
  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm text-amber-600/70 dark:text-amber-400/70">
            Initializing Project 3.0...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/buildunion/login");
    return null;
  }

  if (!projectId) {
    return null;
  }

  // Determine stage progress for header
  const stageLabels: Record<number, string> = {
    [STAGES.STAGE_1]: `Stage 1: Project Basics (${Math.min(currentStep + 1, STAGE_1_STEPS)}/${STAGE_1_STEPS})`,
    [STAGES.STAGE_2]: "Stage 2: Lock Area",
    [STAGES.STAGE_3]: "Stage 3: Definition Flow",
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
              {/* Left Panel - Stage 2 Chat Summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full md:w-[400px] lg:w-[450px] border-r border-amber-200/50 dark:border-amber-800/30 flex flex-col h-full bg-gradient-to-b from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10"
              >
                {/* Summary Header */}
                <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50">
                  <h3 className="font-semibold text-amber-700 dark:text-amber-300">
                    ✓ Stage 1 Complete
                  </h3>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    Project basics verified
                  </p>
                </div>
                
                {/* Citations Summary */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {citations.map((citation, index) => (
                    <motion.div
                      key={citation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleCitationClick(citation.id)}
                      className="p-3 rounded-lg bg-card border border-amber-200/50 dark:border-amber-800/30 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">
                          {citation.question_key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-mono text-amber-500/70">
                          {citation.id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 text-foreground">
                        {citation.answer}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right Panel - GFA Lock Stage */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="hidden md:flex flex-1 flex-col h-full"
              >
                <GFALockStage
                  projectId={projectId}
                  userId={user.id}
                  onGFALocked={handleGFALocked}
                  existingGFA={citations.find(c => c.cite_type === CITATION_TYPES.GFA_LOCK)}
                />
              </motion.div>
            </motion.div>
          ) : (
            /* ========== STAGE 3: Definition Flow ========== */
            <motion.div
              key="stage-3"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {/* DefinitionFlowStage now includes both LEFT (Chat) and RIGHT (Canvas) panels */}
              <DefinitionFlowStage
                projectId={projectId}
                userId={user.id}
                gfaValue={gfaValue}
                onFlowComplete={handleDefinitionFlowComplete}
                className="h-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default BuildUnionNewProject;
