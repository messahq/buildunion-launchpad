import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { WizardCitation } from "@/types/projectWizard";
import WizardChatInterface from "@/components/project-wizard/WizardChatInterface";
import DynamicCanvas from "@/components/project-wizard/DynamicCanvas";
import BuildUnionHeader from "@/components/BuildUnionHeader";

const BuildUnionNewProject = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [citations, setCitations] = useState<Record<string, WizardCitation>>({});
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectAddress, setProjectAddress] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [workType, setWorkType] = useState<string | null>(null);
  
  // Cross-panel highlighting
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);

  // Geocode address to coordinates
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

  // Handle answer submission from chat
  const handleAnswerSubmit = useCallback(async (
    questionKey: string,
    answer: string,
    citation: WizardCitation
  ) => {
    // Store citation
    setCitations(prev => ({
      ...prev,
      [citation.id]: citation
    }));

    // Process answer based on question type
    switch (questionKey) {
      case 'project_name':
        setProjectName(answer);
        break;
      case 'project_address':
        setProjectAddress(answer);
        const coords = await geocodeAddress(answer);
        if (coords) {
          setCoordinates(coords);
        }
        break;
      case 'work_type':
        setWorkType(answer);
        break;
    }

    // Move to next step
    setCurrentStep(prev => prev + 1);
  }, [geocodeAddress]);

  // Handle citation click from chat (highlight element on canvas)
  const handleCitationClick = useCallback((citationId: string) => {
    setHighlightedElementId(citationId);
    setHighlightedCitationId(null);
    
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedElementId(null), 3000);
  }, []);

  // Handle element click from canvas (highlight message in chat)
  const handleElementClick = useCallback((citationId: string) => {
    setHighlightedCitationId(citationId);
    setHighlightedElementId(null);
    
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedCitationId(null), 3000);
  }, []);

  // Create project when all steps complete
  useEffect(() => {
    if (currentStep >= 3 && projectName && projectAddress && workType && !isCreating) {
      createProject();
    }
  }, [currentStep, projectName, projectAddress, workType]);

  const createProject = async () => {
    if (!user || isCreating) return;
    
    setIsCreating(true);
    
    try {
      // Create project in database
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName!,
          address: projectAddress,
          trade: workType,
          status: "draft",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project summary with citations
      const { error: summaryError } = await supabase
        .from("project_summaries")
        .insert({
          user_id: user.id,
          project_id: project.id,
          verified_facts: Object.values(citations).map(c => ({
            id: c.id,
            questionKey: c.questionKey,
            answer: c.answer,
            timestamp: c.timestamp,
            elementType: c.elementType,
          })),
          mode: "solo",
          status: "draft",
        });

      if (summaryError) throw summaryError;

      toast.success("Project created successfully!");
      
      // Navigate to workspace after short delay
      setTimeout(() => {
        navigate("/buildunion/workspace");
      }, 1500);
      
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
      setIsCreating(false);
    }
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/buildunion/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BuildUnionHeader />
      
      {/* Top Navigation */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/buildunion/workspace")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back", "Back")}
            </Button>
            
            <h1 className="font-semibold">
              {t("project.newProject", "New Project")}
            </h1>
            
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat Interface */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-[400px] lg:w-[450px] border-r flex flex-col"
        >
          <WizardChatInterface
            onAnswerSubmit={handleAnswerSubmit}
            onCitationClick={handleCitationClick}
            highlightedCitationId={highlightedCitationId}
            currentStep={currentStep}
          />
        </motion.div>

        {/* Right Panel - Dynamic Canvas */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex flex-1 flex-col"
        >
          <DynamicCanvas
            projectName={projectName}
            address={projectAddress}
            coordinates={coordinates}
            workType={workType}
            citations={citations}
            onElementClick={handleElementClick}
            highlightedElementId={highlightedElementId}
          />
        </motion.div>
      </main>
    </div>
  );
};

export default BuildUnionNewProject;
