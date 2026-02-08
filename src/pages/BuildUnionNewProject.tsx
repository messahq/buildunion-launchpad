// ============================================
// BUILD UNION NEW PROJECT - Citation-Driven Flow
// ============================================
// DB-First: Project is created FIRST, then citations are saved
// ============================================

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Citation, CITATION_TYPES } from "@/types/citation";
import WizardChatInterface from "@/components/project-wizard/WizardChatInterface";
import CitationDrivenCanvas from "@/components/project-wizard/CitationDrivenCanvas";
import BuildUnionHeader from "@/components/BuildUnionHeader";

const BuildUnionNewProject = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  
  // Project state - created FIRST before any citations
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Citation-driven state
  const [citations, setCitations] = useState<Citation[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Cross-panel highlighting
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null);
  
  // Create draft project on mount
  useEffect(() => {
    if (!user || projectId) return;
    
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

  // Handle step complete
  const handleStepComplete = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  // Handle citation click from chat (highlight on canvas)
  const handleCitationClick = useCallback((citationId: string) => {
    setHighlightedCitationId(citationId);
    setTimeout(() => setHighlightedCitationId(null), 3000);
  }, []);

  // Navigate to project details when wizard complete
  useEffect(() => {
    if (currentStep >= 3 && projectId) {
      toast.success("Project created successfully!");
      setTimeout(() => {
        navigate(`/buildunion/project/${projectId}`);
      }, 1500);
    }
  }, [currentStep, projectId, navigate]);

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      <BuildUnionHeader />
      
      {/* Top Navigation */}
      <div className="border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-background/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm sticky top-0 z-40">
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
            
            <h1 className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              {t("project.newProject", "Project 3.0 Wizard")}
            </h1>
            
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat Interface */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-[400px] lg:w-[450px] border-r border-amber-200/50 dark:border-amber-800/30 flex flex-col"
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
          className="hidden md:flex flex-1 flex-col"
        >
          <CitationDrivenCanvas
            citations={citations}
            onCitationClick={handleCitationClick}
            highlightedCitationId={highlightedCitationId}
          />
        </motion.div>
      </main>
    </div>
  );
};

export default BuildUnionNewProject;
