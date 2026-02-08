import { useState, useEffect } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Plus, FolderOpen, Loader2, Sparkles, Trash2, Users, Download, CheckCircle2, Archive, Undo2 } from "lucide-react";
import ProjectDashboardWidget from "@/components/ProjectDashboardWidget";
import { useNavigate } from "react-router-dom";
import ProjectQuestionnaire, { 
  ProjectAnswers, 
  WorkflowRecommendation 
} from "@/components/projects2/ProjectQuestionnaire";
import FilterQuestions, { FilterAnswers, AITriggers } from "@/components/projects2/FilterQuestions";
import AIAnalysisProgress from "@/components/projects2/AIAnalysisProgress";
import WorkflowSelector, { AIAnalysisResult, EditedAnalysisData } from "@/components/projects2/WorkflowSelector";
import { CollectedCitation } from "@/types/collectedCitation";
import ProjectDetailsView from "@/components/projects2/ProjectDetailsView";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjectAIAnalysis } from "@/hooks/useProjectAIAnalysis";
import { useSubscription, TEAM_LIMITS } from "@/hooks/useSubscription";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SwipeableProjectCard from "@/components/SwipeableProjectCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExportDialog, ExportOptions, ExportFormat } from "@/components/ExportDialog";
import { exportToCSV, exportToJSON, projectExportColumns, generateExportFilename } from "@/lib/exportUtils";
import { downloadPDF, buildProjectSummaryHTML } from "@/lib/pdfGenerator";
import MESSAReportModal from "@/components/MESSAReportModal";
import { useTranslation } from "react-i18next";
import { RoleBadge } from "@/components/PermissionGate";
import { ProjectRole } from "@/hooks/useProjectPermissions";
import PendingInvitations from "@/components/PendingInvitations";

interface SavedProject {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  description: string | null;
  created_at: string;
  owner_name?: string;
  is_shared?: boolean;
  role?: string; // Role in shared projects (foreman, worker, etc.)
}

// Questionnaire data stored for filter step
interface QuestionnaireData {
  answers: ProjectAnswers;
  workflow: WorkflowRecommendation;
}

const BuildUnionProjects2 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showFilterQuestions, setShowFilterQuestions] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [filterAnswers, setFilterAnswers] = useState<FilterAnswers | null>(null);
  const [aiTriggers, setAiTriggers] = useState<AITriggers | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [sharedProjects, setSharedProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);
  const [pendingWorkType, setPendingWorkType] = useState<string | null>(null);
  const [pendingDescription, setPendingDescription] = useState<string>("");
  
  // Selected project for details view (opens full project)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  
  // Sidebar project selection (just highlights in list, updates sidebar)
  const [sidebarProjectId, setSidebarProjectId] = useState<string | null>(null);
  
  // Tab state for My Projects / Shared With Me / Archived
  const [projectsTab, setProjectsTab] = useState<"my" | "shared" | "archived">("my");
  
  // Archived projects state
  const [archivedProjects, setArchivedProjects] = useState<SavedProject[]>([]);
  
  // Re-analyze state - stores files for re-analysis
  const [reanalyzeImages, setReanalyzeImages] = useState<File[]>([]);
  const [reanalyzeDocuments, setReanalyzeDocuments] = useState<File[]>([]);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const { 
    analyzeProject, 
    analyzing, 
    progress, 
    currentStep, 
    result: analysisResult,
    error: analysisError,
    reset: resetAnalysis,
    tierConfig
  } = useProjectAIAnalysis();

  // Load projects from database (my projects + shared projects)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const loadProjects = async () => {
      // Load my active projects (not archived) - use archived_at for soft delete
      const { data: myProjectsData, error: myError } = await supabase
        .from("projects")
        .select("id, name, address, trade, status, description, created_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (myError) {
        console.error("Error loading projects:", myError);
        toast.error("Failed to load projects");
      } else {
        setProjects(myProjectsData || []);
      }

      // Load archived projects - use archived_at for soft delete
      const { data: archivedData, error: archivedError } = await supabase
        .from("projects")
        .select("id, name, address, trade, status, description, created_at, archived_at")
        .eq("user_id", user.id)
        .not("archived_at", "is", null)
        .order("created_at", { ascending: false });

      if (!archivedError && archivedData) {
        setArchivedProjects(archivedData);
      }

      // Load shared projects (where user is a team member but not owner)
      const { data: memberData, error: memberError } = await supabase
        .from("project_members")
        .select(`
          project_id,
          role,
          projects!inner(id, name, address, trade, status, description, created_at, user_id)
        `)
        .eq("user_id", user.id);

      if (memberError) {
        console.error("Error loading shared projects:", memberError);
      } else if (memberData) {
        // Filter out projects where user is owner and format data
        const sharedProjectsFormatted: SavedProject[] = [];
        
        for (const member of memberData) {
          const project = member.projects as any;
          if (project && project.user_id !== user.id) {
            // Get owner profile
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", project.user_id)
              .single();
            
            sharedProjectsFormatted.push({
              id: project.id,
              name: project.name,
              address: project.address,
              trade: project.trade,
              status: project.status,
              description: project.description,
              created_at: project.created_at,
              owner_name: ownerProfile?.full_name || "Unknown",
              is_shared: true,
              role: member.role,
            });
          }
        }
        
        setSharedProjects(sharedProjectsFormatted);
      }

      setLoading(false);
    };

    loadProjects();
  }, [user, authLoading]);

  // AI-determined workflow state for WorkflowSelector
  const [aiAnalysisForSelector, setAiAnalysisForSelector] = useState<AIAnalysisResult | null>(null);

  // Transform analysis result to WorkflowSelector format
  // SIMPLE RULE: Essential sq ft materials QTY = detectedArea × (1 + waste/100)
  const transformToSelectorFormat = (result: typeof analysisResult): AIAnalysisResult | null => {
    if (!result) return null;

    const { projectSize, projectSizeReason, dualEngineOutput, synthesisResult } = result;
    
    // Get the SINGLE SOURCE OF TRUTH for area
    const detectedArea = dualEngineOutput?.gemini?.area 
      || result.estimate.area 
      || synthesisResult?.operationalTruth?.confirmedArea 
      || null;
    
    const rawMaterials = result.estimate.materials || [];
    const hasBlueprint = !!result.blueprintAnalysis?.extractedText;
    const wastePercent = (result.estimate as { wastePercent?: number }).wastePercent ?? 10;
    
    // SIMPLE MATH: Essential sq ft materials = detectedArea × (1 + waste/100)
    // NOT m.quantity × 1.1 (that was the bug - AI returns inconsistent quantities)
    const essentialKeywords = ["flooring", "laminate", "tile", "drywall", "underlayment", "baseboard", "trim", "hardwood"];
    const checkEssential = (item: string) => essentialKeywords.some(k => item.toLowerCase().includes(k));
    
    const materialsWithCorrectQty = rawMaterials.slice(0, 10).map(m => {
      const isEssential = checkEssential(m.item);
      const isSqFtUnit = m.unit?.toLowerCase().includes("sq") || m.unit?.toLowerCase().includes("ft");
      
      // THE ONE SIMPLE RULE: QTY = detectedArea × (1 + waste/100) for essential sq ft items
      // For non-essential or non-sq ft items, keep original quantity
      let finalQuantity: number;
      if (isEssential && isSqFtUnit && detectedArea) {
        finalQuantity = Math.ceil(detectedArea * (1 + wastePercent / 100));
      } else {
        finalQuantity = m.quantity;
      }
      
      return { 
        item: m.item, 
        quantity: finalQuantity,
        unit: m.unit 
      };
    });
    
    console.log("[BuildUnionWorkspace] SIMPLE MATH:", 
      `detectedArea=${detectedArea}, waste=${wastePercent}%, gross=${detectedArea ? Math.ceil(detectedArea * (1 + wastePercent / 100)) : 'N/A'}`,
      materialsWithCorrectQty.map(m => `${m.item}: ${m.quantity}`));
    
    const confidence = dualEngineOutput?.gemini?.confidence 
      || (rawMaterials.length > 3 ? "high" : detectedArea ? "medium" : "low");

    return {
      area: detectedArea,
      areaUnit: result.estimate.areaUnit || dualEngineOutput?.gemini?.areaUnit || "sq ft",
      materials: materialsWithCorrectQty,
      hasBlueprint,
      surfaceType: result.estimate.surfaceType || dualEngineOutput?.gemini?.surfaceType || "unknown",
      roomType: result.estimate.roomType || dualEngineOutput?.gemini?.roomType || "unknown",
      projectSize: projectSize as "small" | "medium" | "large",
      projectSizeReason: projectSizeReason || "AI analysis complete",
      confidence: confidence as "low" | "medium" | "high",
      wastePercent,
      dualEngineOutput,
      synthesisResult,
    };
  };

  // Trigger AI analysis after project creation AND filter completion
  useEffect(() => {
    const hasContent = pendingImages.length > 0 || pendingDocuments.length > 0;
    // Only start if we have filterAnswers (filter questions completed)
    if (createdProjectId && hasContent && !analyzing && filterAnswers) {
      // Start AI analysis with filter context
      analyzeProject({
        projectId: createdProjectId,
        images: pendingImages,
        documents: pendingDocuments,
        description: pendingDescription,
        workType: pendingWorkType,
      }).then((result) => {
        if (result) {
          // Transform for WorkflowSelector
          const selectorData = transformToSelectorFormat(result);
          if (selectorData) {
            setAiAnalysisForSelector(selectorData);
            
            // Update project_summaries with AI-determined workflow + filter data
            const workflowConfigData = JSON.parse(JSON.stringify({
              filterAnswers,
              aiTriggers,
              projectSize: selectorData.projectSize,
              projectSizeReason: selectorData.projectSizeReason,
              tierAtCreation: subscription.tier,
              teamLimitAtCreation: TEAM_LIMITS[subscription.tier],
              aiAnalysis: {
                area: selectorData.area,
                areaUnit: selectorData.areaUnit,
                materials: selectorData.materials,
                hasBlueprint: selectorData.hasBlueprint,
                confidence: selectorData.confidence,
              },
              analyzedAt: new Date().toISOString(),
            }));

            supabase
              .from("project_summaries")
              .update({
                ai_workflow_config: workflowConfigData
              })
              .eq("project_id", createdProjectId)
              .then(() => {
                toast.success("AI analysis complete!", {
                  description: selectorData.projectSizeReason
                });
              });
          }
        }
        // Store files for potential re-analysis before clearing pending state
        if (pendingImages.length > 0) {
          setReanalyzeImages([...pendingImages]);
        }
        if (pendingDocuments.length > 0) {
          setReanalyzeDocuments([...pendingDocuments]);
        }
        // Reset pending state but keep createdProjectId for workflow selection
        setPendingImages([]);
        setPendingDocuments([]);
        setPendingWorkType(null);
        setPendingDescription("");
      });
    }
  }, [createdProjectId, pendingImages, pendingDocuments, analyzing, subscription.tier, filterAnswers]);

  // Handle re-analyze request from WorkflowSelector
  const handleReanalyze = async () => {
    if (!createdProjectId) return;
    
    // Check if we have files to re-analyze
    const hasFiles = reanalyzeImages.length > 0 || reanalyzeDocuments.length > 0;
    if (!hasFiles) {
      toast.info("No files available for re-analysis", {
        description: "Upload new images or blueprints to analyze."
      });
      return;
    }
    
    setIsReanalyzing(true);
    
    try {
      // Get the description from questionnaireData if available
      const description = questionnaireData?.answers?.description || "";
      const workType = questionnaireData?.answers?.workType || null;
      
      // Use precision mode with force refresh for re-analysis
      const result = await analyzeProject({
        projectId: createdProjectId,
        images: reanalyzeImages,
        documents: reanalyzeDocuments,
        description,
        workType,
        forceRefresh: true, // Force skip cache
        precisionMode: true, // Use enhanced OCR and contextual validation
      });
      
      if (result) {
        const selectorData = transformToSelectorFormat(result);
        if (selectorData) {
          setAiAnalysisForSelector(selectorData);
          toast.success("Precision re-analysis complete!", {
            description: `Detected area: ${selectorData.area || "Not found"} ${selectorData.areaUnit}`
          });
        }
      }
    } catch (err) {
      console.error("Re-analyze error:", err);
      toast.error("Failed to re-analyze", {
        description: "Please try again or add area manually."
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Handle atomic save from Power Modal - synchronized area & materials update
  // IRON LAW #2: State Persistence - wastePercent saved to DB and loaded on project open
  const handlePowerSaveAndSync = async (area: number, materials: Array<{ item: string; quantity: number; unit: string }>, wastePercent: number = 10) => {
    if (!createdProjectId || !aiAnalysisForSelector) {
      throw new Error("No project available for save");
    }
    
    console.log("[IRON LAW #2] PowerSaveAndSync - Persisting to DB:", { area, materialsCount: materials.length, wastePercent });
    
    try {
      // Prepare updated photo estimate with user edits
      const updatedPhotoEstimate = {
        ...aiAnalysisForSelector,
        area,
        materials,
        wastePercent, // Store the custom waste percentage
        userEdited: true,
        editedAt: new Date().toISOString(),
      };

      // Update ai_workflow_config with user edits marker
      const updatedWorkflowConfig = {
        filterAnswers,
        aiTriggers,
        projectSize: aiAnalysisForSelector.projectSize,
        projectSizeReason: aiAnalysisForSelector.projectSizeReason,
        userEdits: {
          editedArea: area,
          editedMaterials: materials,
          wastePercent, // Store waste % in workflow config too
          editedAt: new Date().toISOString(),
          editSource: "power_modal",
        },
      };

      // ATOMIC UPDATE - single database call
      const { error } = await supabase
        .from("project_summaries")
        .update({
          photo_estimate: JSON.parse(JSON.stringify(updatedPhotoEstimate)),
          ai_workflow_config: JSON.parse(JSON.stringify(updatedWorkflowConfig)),
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", createdProjectId);
      
      if (error) {
        console.error("[PowerSaveAndSync] Database error:", error);
        throw error;
      }
      
      // Update local state to reflect changes immediately
      setAiAnalysisForSelector({
        ...aiAnalysisForSelector,
        area,
        materials,
        wastePercent,
      });
      
      console.log("[PowerSaveAndSync] Atomic save completed successfully");
      toast.success("Area & Materials synced!", {
        description: `Updated to ${area.toLocaleString()} sq ft with ${wastePercent}% waste and ${materials.length} materials.`
      });
    } catch (err) {
      console.error("[PowerSaveAndSync] Failed:", err);
      toast.error("Failed to sync changes", {
        description: "Please try again."
      });
      throw err;
    }
  };

  // Handle workflow selection from WorkflowSelector
  const handleWorkflowSelect = async (mode: "solo" | "team", editedData?: EditedAnalysisData, allCitations?: CollectedCitation[]) => {
    if (!createdProjectId || !aiAnalysisForSelector) return;

    try {
      // Build workflow config object with filter data (JSON-safe)
      const workflowConfig = JSON.parse(JSON.stringify({
        filterAnswers,
        aiTriggers,
        projectSize: aiAnalysisForSelector.projectSize,
        projectSizeReason: aiAnalysisForSelector.projectSizeReason,
        recommendedMode: aiTriggers?.recommendTeamMode ? "team" : "solo",
        selectedMode: mode,
        tierAtCreation: subscription.tier,
        teamLimitAtCreation: TEAM_LIMITS[subscription.tier],
        aiAnalysis: {
          area: aiAnalysisForSelector.area,
          areaUnit: aiAnalysisForSelector.areaUnit,
          materials: aiAnalysisForSelector.materials,
          hasBlueprint: aiAnalysisForSelector.hasBlueprint,
          confidence: aiAnalysisForSelector.confidence,
        },
        ...(editedData ? { userEdits: {
          editedArea: editedData.editedArea,
          editedMaterials: editedData.editedMaterials,
          editedAt: editedData.editedAt,
        }} : {}),
        selectedAt: new Date().toISOString(),
      }));

      // Build photo estimate object
      const photoEstimate = {
        ...aiAnalysisForSelector,
        ...(editedData ? {
          area: editedData.editedArea,
          materials: editedData.editedMaterials,
          userEdited: true,
          editedAt: editedData.editedAt,
        } : {}),
      };

      // Convert CollectedCitation[] to CitationSource[] format for database storage
      const citationRegistry = (allCitations || []).map(citation => ({
        id: crypto.randomUUID(),
        sourceId: citation.sourceId,
        documentName: citation.documentName,
        documentType: citation.documentType,
        contextSnippet: citation.contextSnippet,
        filePath: citation.filePath,
        timestamp: citation.timestamp,
        linkedPillar: citation.linkedPillar,
        registeredAt: new Date().toISOString(),
        registeredBy: user?.id,
        // Store source type for traceability
        sourceType: citation.sourceType,
      }));

      // Build verified_facts with citation registry
      const verifiedFacts = {
        citationRegistry,
        citationRegistryUpdatedAt: new Date().toISOString(),
        totalCitations: citationRegistry.length,
      };

      // Save workflow selection, photo estimate, and citations
      await supabase
        .from("project_summaries")
        .update({
          mode,
          status: "active",
          photo_estimate: JSON.parse(JSON.stringify(photoEstimate)),
          ai_workflow_config: JSON.parse(JSON.stringify(workflowConfig)),
          verified_facts: JSON.parse(JSON.stringify(verifiedFacts)),
        })
        .eq("project_id", createdProjectId);

      if (editedData) {
        toast.success("Your edits have been saved!");
      }

      // Navigate based on selected workflow
      if (mode === "solo") {
        // Go to Quick Mode with pre-filled data
        navigate(`/buildunion/quick-mode?projectId=${createdProjectId}`);
      } else {
        // Go to project details view (Team Mode) - stay in Projects2
        setSelectedProjectId(createdProjectId);
      }

      // Reset state
      setAiAnalysisForSelector(null);
      setCreatedProjectId(null);
    } catch (error) {
      console.error("Error saving workflow selection:", error);
      toast.error("Failed to save workflow selection");
    }
  };

  // Handle upgrade click
  const handleUpgradeClick = () => {
    navigate("/buildunion/pricing");
  };

  // Step 1: Questionnaire complete -> go to FilterQuestions
  const handleQuestionnaireComplete = (answers: ProjectAnswers, workflow: WorkflowRecommendation) => {
    if (!user) {
      toast.error("Please sign in to create a project");
      return;
    }

    // Store data and move to filter step
    setQuestionnaireData({ answers, workflow });
    setShowQuestionnaire(false);
    setShowFilterQuestions(true);
  };

  // Step 2: FilterQuestions complete -> create project and start AI analysis
  const handleFilterComplete = async (filters: FilterAnswers, triggers: AITriggers) => {
    if (!user || !questionnaireData) {
      toast.error("Missing project data");
      return;
    }

    setFilterAnswers(filters);
    setAiTriggers(triggers);
    setShowFilterQuestions(false);
    setSaving(true);
    resetAnalysis();

    const { answers, workflow } = questionnaireData;

    try {
      // Map work type to trade
      const tradeMap: Record<string, string> = {
        painting: "painter",
        flooring: "flooring_specialist",
        drywall: "drywall_installer",
        electrical: "electrician",
        plumbing: "plumber",
        hvac: "hvac_technician",
        roofing: "roofer",
        carpentry: "carpenter",
        concrete: "concrete_worker",
        renovation: "general_contractor",
        new_construction: "general_contractor",
        repair: "general_contractor",
        other: "other"
      };

      // Create project description
      const description = answers.description.trim() || 
        `${workflow.mode} workflow with ${workflow.estimatedSteps} steps. Features: ${workflow.features.join(", ")}`;

      // Insert into projects table
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: answers.name,
          address: answers.location,
          trade: answers.workType ? tradeMap[answers.workType] : null,
          description,
          status: "draft"
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Upload images to storage if any
      const uploadedImagePaths: string[] = [];
      if (answers.images.length > 0) {
        for (const image of answers.images) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${projectData.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("project-documents")
            .upload(fileName, image);
          
          if (!uploadError) {
            uploadedImagePaths.push(fileName);
          }
        }

        if (uploadedImagePaths.length > 0) {
          await supabase
            .from("projects")
            .update({ site_images: uploadedImagePaths })
            .eq("id", projectData.id);
        }
      }

      // Create project_summaries with filter answers
      const initialWorkflowConfig = JSON.parse(JSON.stringify({
        filterAnswers: filters,
        aiTriggers: triggers,
        tierAtCreation: subscription.tier,
        teamLimitAtCreation: TEAM_LIMITS[subscription.tier],
        createdAt: new Date().toISOString(),
      }));

      // Format dates for database
      const projectStartDate = filters.technicalFilter.projectStartDate 
        ? new Date(filters.technicalFilter.projectStartDate).toISOString().split('T')[0]
        : null;
      const projectEndDate = filters.technicalFilter.projectEndDate 
        ? new Date(filters.technicalFilter.projectEndDate).toISOString().split('T')[0]
        : null;

      const { error: summaryError } = await supabase
        .from("project_summaries")
        .insert({
          user_id: user.id,
          project_id: projectData.id,
          mode: triggers.recommendTeamMode ? "team" : "solo",
          status: answers.images.length > 0 ? "analyzing" : "draft",
          project_start_date: projectStartDate,
          project_end_date: projectEndDate,
          calculator_results: [{
            type: "workflow_config",
            workflowMode: workflow.mode,
            calculator: workflow.calculator,
            teamEnabled: workflow.teamEnabled,
            estimatedSteps: workflow.estimatedSteps,
            features: workflow.features,
            workType: answers.workType,
            userDescription: answers.description,
            imageCount: uploadedImagePaths.length,
            documentCount: answers.documents?.length || 0
          }],
          ai_workflow_config: initialWorkflowConfig
        });

      if (summaryError) {
        console.error("Error creating summary:", summaryError);
      }

      // Update local state
      setProjects(prev => [{
        id: projectData.id,
        name: projectData.name,
        address: projectData.address,
        trade: projectData.trade,
        status: projectData.status,
        description: projectData.description,
        created_at: projectData.created_at
      }, ...prev]);

      // If images or documents were uploaded, trigger AI analysis
      const hasContent = answers.images.length > 0 || answers.documents.length > 0;
      if (hasContent) {
        const contentDesc = [];
        if (answers.images.length > 0) contentDesc.push(`${answers.images.length} photo(s)`);
        if (answers.documents.length > 0) contentDesc.push(`${answers.documents.length} PDF(s)`);
        
        toast.success(`Project "${answers.name}" created!`, {
          description: `Starting AI analysis of ${contentDesc.join(" and ")}...`
        });
        
        // Store pending data for AI analysis (useEffect will pick this up)
        setCreatedProjectId(projectData.id);
        setPendingImages(answers.images);
        setPendingDocuments(answers.documents);
        setPendingWorkType(answers.workType);
        setPendingDescription(answers.description);
      } else {
        toast.success(`Project "${answers.name}" created!`);
        setSelectedProjectId(projectData.id);
      }

      // Clear questionnaire data
      setQuestionnaireData(null);

    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  // Go back from FilterQuestions to Questionnaire
  const handleFilterBack = () => {
    setShowFilterQuestions(false);
    setShowQuestionnaire(true);
  };

  // NEW: Skip AI Analysis - create project and go directly to dashboard
  const handleSkipAI = async (answers: ProjectAnswers) => {
    if (!user) {
      toast.error("Please sign in to create a project");
      return;
    }

    setSaving(true);

    try {
      // Map work type to trade
      const tradeMap: Record<string, string> = {
        painting: "painter",
        flooring: "flooring_specialist",
        drywall: "drywall_installer",
        electrical: "electrician",
        plumbing: "plumber",
        hvac: "hvac_technician",
        roofing: "roofer",
        carpentry: "carpenter",
        concrete: "concrete_worker",
        renovation: "general_contractor",
        new_construction: "general_contractor",
        repair: "general_contractor",
        other: "other"
      };

      // Create project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: answers.name,
          address: answers.location || null,
          trade: answers.workType ? tradeMap[answers.workType] : null,
          description: answers.description || "Manual project - no AI analysis",
          status: "active" // Directly active, not draft
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project_summaries with manual mode flag
      const manualWorkflowConfig = {
        createdManually: true,
        skipAI: true,
        userEdits: { wastePercent: 10 },
        tierAtCreation: subscription.tier,
        createdAt: new Date().toISOString(),
      };

      const { error: summaryError } = await supabase
        .from("project_summaries")
        .insert({
          project_id: projectData.id,
          user_id: user.id,
          mode: "solo",
          status: "active",
          ai_workflow_config: JSON.parse(JSON.stringify(manualWorkflowConfig)),
          line_items: { materials: [], labor: [], other: [] },
        });

      if (summaryError) throw summaryError;

      toast.success(`Manual project "${answers.name}" created!`, {
        description: "No AI analysis - add materials manually in the Dashboard."
      });

      // Close questionnaire and navigate to project
      setShowQuestionnaire(false);
      setQuestionnaireData(null);
      
      // Navigate to project details
      setSelectedProjectId(projectData.id);

      // Refresh projects list
      const { data: refreshedProjects } = await supabase
        .from("projects")
        .select("id, name, address, trade, status, description, created_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      
      if (refreshedProjects) {
        setProjects(refreshedProjects);
      }

    } catch (error) {
      console.error("Error creating manual project:", error);
      toast.error("Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  // NEW: Skip AI from FilterQuestions step - uses stored questionnaireData
  const handleFilterSkipAI = async () => {
    if (!questionnaireData) {
      toast.error("No project data available");
      return;
    }
    // Re-use the existing handleSkipAI with stored questionnaire answers
    await handleSkipAI(questionnaireData.answers);
    // Also close filter questions view
    setShowFilterQuestions(false);
  };

  // Handle project export
  const handleProjectExport = async (format: ExportFormat, options: ExportOptions) => {
    const allProjects = [...projects, ...sharedProjects.map(p => ({ ...p, is_shared: true }))];
    
    if (allProjects.length === 0) {
      throw new Error("No projects to export");
    }

    const filename = generateExportFilename("buildunion_projects");

    if (format === "csv") {
      const exportData = allProjects.map(p => ({
        ...p,
        is_shared: p.is_shared ? "Yes" : "No",
      }));
      exportToCSV(exportData, [
        ...projectExportColumns,
        { key: "is_shared", header: "Shared Project" },
      ], filename);
    } else if (format === "json") {
      exportToJSON(allProjects, filename);
    } else if (format === "pdf") {
      // Simple PDF export for projects list
      const formatCurrency = (amount: number) => 
        new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Projects Export</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 32px; }
            h1 { font-size: 24px; margin-bottom: 24px; color: #f59e0b; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; font-size: 12px; text-transform: uppercase; }
            td { font-size: 14px; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .status-draft { background: #f1f5f9; color: #475569; }
            .status-active { background: #dcfce7; color: #166534; }
          </style>
        </head>
        <body>
          <h1>📁 BuildUnion Projects</h1>
          <p style="color: #64748b; margin-bottom: 16px;">Exported on ${new Date().toLocaleDateString("en-CA")}</p>
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Address</th>
                <th>Trade</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${allProjects.map(p => `
                <tr>
                  <td><strong>${p.name}</strong>${p.is_shared ? ' <span style="color: #3b82f6;">(Shared)</span>' : ''}</td>
                  <td>${p.address || '-'}</td>
                  <td>${p.trade?.replace(/_/g, ' ') || '-'}</td>
                  <td><span class="status status-${p.status}">${p.status}</span></td>
                  <td>${new Date(p.created_at).toLocaleDateString("en-CA")}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Total: ${allProjects.length} projects</p>
        </body>
        </html>
      `;
      
      await downloadPDF(htmlContent, { filename: `${filename}.pdf` });
    }
  };

  return (
    <main className="bg-background min-h-screen transition-colors">
      <BuildUnionHeader />
      
      {/* Back Button */}
      <div className="container mx-auto px-6 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/buildunion")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("workspace.backToHome")}
        </Button>
      </div>

      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Questionnaire */}
          {showQuestionnaire && (
            <div className="bg-card rounded-xl border shadow-lg">
              <ProjectQuestionnaire 
                onComplete={handleQuestionnaireComplete}
                onCancel={() => setShowQuestionnaire(false)}
                onSkipAI={handleSkipAI}
                saving={saving}
                tierConfig={tierConfig}
              />
            </div>
          )}

          {/* Step 2: Filter Questions */}
          {showFilterQuestions && questionnaireData && (
            <div className="bg-card rounded-xl border shadow-lg">
              <FilterQuestions
                projectData={{
                  name: questionnaireData.answers.name,
                  workType: questionnaireData.answers.workType,
                  hasImages: questionnaireData.answers.images.length > 0,
                  hasDocuments: questionnaireData.answers.documents.length > 0,
                }}
                onComplete={handleFilterComplete}
                onBack={handleFilterBack}
                onSkipAI={handleFilterSkipAI}
              />
            </div>
          )}

          {/* Project Details View - when a project is selected */}
          {!showQuestionnaire && !showFilterQuestions && selectedProjectId && (
            <ProjectDetailsView
              projectId={selectedProjectId}
              onBack={() => {
                setSelectedProjectId(null);
                setInitialTab(undefined);
              }}
              initialTab={initialTab}
            />
          )}

          {/* Main Dashboard - shown when not in questionnaire, filter mode, or viewing project */}
          {!showQuestionnaire && !showFilterQuestions && !selectedProjectId && (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("workspace.title")}</h1>
                    <p className="text-sm text-muted-foreground truncate">{t("workspace.subtitle")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Tier indicator - hidden on mobile */}
                  {subscription.tier !== "free" && (
                    <span className="hidden md:inline-block px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {subscription.tier.toUpperCase()} • {t("workspace.upTo")} {TEAM_LIMITS[subscription.tier] === Infinity ? "∞" : TEAM_LIMITS[subscription.tier]} {t("workspace.teamMembers")}
                    </span>
                  )}
                  
                  {/* Quick Log Button */}
                  <MESSAReportModal
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="hidden sm:inline">Quick Log</span>
                      </Button>
                    }
                  />
                  
                  <Button 
                    onClick={() => setShowQuestionnaire(true)}
                    disabled={!user}
                    size={isMobile ? "sm" : "default"}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">{t("workspace.newProject")}</span>
                    <span className="xs:hidden">{t("workspace.new")}</span>
                  </Button>
                </div>
              </div>

              {/* AI Analysis Progress (if running) */}
              {analyzing && (
                <div className="mb-6">
                  <AIAnalysisProgress
                    progress={progress}
                    currentStep={currentStep}
                    analyzing={analyzing}
                    error={analysisError}
                    tier={subscription.tier}
                    imageCount={pendingImages.length}
                    documentCount={pendingDocuments.length}
                  />
                </div>
              )}

              {/* AI Workflow Selector (after analysis) */}
              {aiAnalysisForSelector && !analyzing && createdProjectId && (
                <div className="mb-6">
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Reset all analysis state and go back to projects list
                      setAiAnalysisForSelector(null);
                      setCreatedProjectId(null);
                      setPendingImages([]);
                      setPendingDocuments([]);
                      setPendingDescription("");
                      setPendingWorkType(null);
                      setFilterAnswers(null);
                      setAiTriggers(null);
                      resetAnalysis(); // Reset the AI analysis hook
                    }}
                    className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Projects
                  </Button>
                  
                  <WorkflowSelector
                    projectId={createdProjectId}
                    analysisResult={aiAnalysisForSelector}
                    tier={subscription.tier}
                    filterAnswers={filterAnswers || undefined}
                    aiTriggers={aiTriggers || undefined}
                    collectedCitations={filterAnswers?.collectedCitations || []}
                    onSelectWorkflow={handleWorkflowSelect}
                    onUpgradeClick={handleUpgradeClick}
                    onReanalyze={handleReanalyze}
                    isReanalyzing={isReanalyzing}
                    onPowerSaveAndSync={handlePowerSaveAndSync}
                  />
                </div>
              )}

              {/* Auth check */}
              {!authLoading && !user && (
                <div className="min-h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground">{t("workspace.signInToView")}</p>
                    <p className="text-muted-foreground">{t("workspace.createAccountToStart")}</p>
                  </div>
                  <Button 
                    onClick={() => navigate("/buildunion/login")}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    {t("workspace.signIn")}
                  </Button>
                </div>
              )}

              {/* Loading state */}
              {(authLoading || loading) && user && (
                <div className="min-h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              )}

              {/* Projects List or Empty State */}
              {!authLoading && !loading && user && (
                <>
                  {/* Pending Invitations */}
                  <div className="mb-6">
                    <PendingInvitations />
                  </div>

                  {/* Tab Switcher */}
                  <Tabs value={projectsTab} onValueChange={(v) => setProjectsTab(v as "my" | "shared" | "archived")} className="mb-6">
                    <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
                      <TabsTrigger value="my" className="gap-2 data-[state=active]:bg-background">
                        <FolderOpen className="h-4 w-4" />
                        <span className="hidden xs:inline">{t("workspace.myProjects")}</span>
                        <span className="xs:hidden">{t("workspace.projects")}</span>
                      </TabsTrigger>
                      <TabsTrigger value="shared" className="gap-2 data-[state=active]:bg-background">
                        <Users className="h-4 w-4" />
                        <span className="hidden xs:inline">{t("workspace.sharedWithMe")}</span>
                        <span className="xs:hidden">{t("workspace.shared")}</span>
                        {sharedProjects.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {sharedProjects.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="archived" className="gap-2 data-[state=active]:bg-background">
                        <Archive className="h-4 w-4" />
                        <span className="hidden xs:inline">{t("archive.archived", "Archived")}</span>
                        {archivedProjects.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {archivedProjects.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* My Projects Tab */}
                  {projectsTab === "my" && (
                    <>
                      {/* Header with count */}
                      <div className="mb-4">
                        <h2 className="text-xl font-bold text-foreground">{t("workspace.myProjects")}</h2>
                        <p className="text-sm text-muted-foreground">
                          {projects.length} {t("workspace.projects")}{sharedProjects.length > 0 ? ` • ${sharedProjects.length} ${t("workspace.shared")}` : ""}
                        </p>
                      </div>

                      {projects.length === 0 ? (
                        <div className="min-h-[300px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                          <FolderOpen className="h-16 w-16 text-muted-foreground/40" />
                          <div className="text-center">
                            <p className="text-lg font-medium text-foreground">{t("workspace.noProjectsYet")}</p>
                            <p className="text-muted-foreground">{t("workspace.startByAnswering")}</p>
                          </div>
                          <Button 
                            onClick={() => setShowQuestionnaire(true)}
                            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          >
                            <Plus className="h-4 w-4" />
                            {t("workspace.newProject")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                          {/* Projects List */}
                          <div className="lg:col-span-2 space-y-4">
                            {projects.map((project) => {
                              const handleArchive = async () => {
                                const archivedAt = new Date().toISOString();
                                // Soft delete - set archived_at timestamp
                                const { error } = await supabase
                                  .from("projects")
                                  .update({ archived_at: archivedAt })
                                  .eq("id", project.id);
                                
                                if (error) {
                                  toast.error(t("archive.archiveFailed", "Failed to archive project"));
                                } else {
                                  // Also cascade to related contracts and tasks
                                  await supabase
                                    .from("contracts")
                                    .update({ archived_at: archivedAt })
                                    .eq("project_id", project.id);
                                  await supabase
                                    .from("project_tasks")
                                    .update({ archived_at: archivedAt })
                                    .eq("project_id", project.id);
                                  
                                  setProjects(prev => prev.filter(p => p.id !== project.id));
                                  setArchivedProjects(prev => [{ ...project, archived_at: archivedAt } as any, ...prev]);
                                  if (sidebarProjectId === project.id) setSidebarProjectId(null);
                                  toast.success(t("archive.projectArchived", "Project moved to archive"));
                                }
                              };

                              const handleDelete = async () => {
                                // Soft delete via archive
                                const archivedAt = new Date().toISOString();
                                const { error } = await supabase
                                  .from("projects")
                                  .update({ archived_at: archivedAt })
                                  .eq("id", project.id);
                                
                                if (error) {
                                  toast.error(t("workspace.deleteFailed", "Failed to delete project"));
                                } else {
                                  // Cascade to related entities
                                  await supabase
                                    .from("contracts")
                                    .update({ archived_at: archivedAt })
                                    .eq("project_id", project.id);
                                  await supabase
                                    .from("project_tasks")
                                    .update({ archived_at: archivedAt })
                                    .eq("project_id", project.id);
                                  
                                  setProjects(prev => prev.filter(p => p.id !== project.id));
                                  if (sidebarProjectId === project.id) setSidebarProjectId(null);
                                  toast.success(t("workspace.projectDeleted", "Project archived"));
                                }
                              };

                              const handleCompleteProject = async (e: React.MouseEvent) => {
                                e.stopPropagation();
                                const newStatus = project.status === 'completed' ? 'active' : 'completed';
                                const { error } = await supabase
                                  .from("projects")
                                  .update({ status: newStatus })
                                  .eq("id", project.id);
                                
                                if (error) {
                                  toast.error(t("workspace.statusUpdateFailed", "Failed to update status"));
                                } else {
                                  setProjects(prev => prev.map(p => 
                                    p.id === project.id ? { ...p, status: newStatus } : p
                                  ));
                                  toast.success(
                                    newStatus === 'completed' 
                                      ? t("workspace.projectCompleted", "Project marked as completed!") 
                                      : t("workspace.projectReopened", "Project reopened")
                                  );
                                }
                              };

                              const cardContent = (
                                <div 
                                  onClick={() => setSidebarProjectId(prev => prev === project.id ? null : project.id)}
                                  onDoubleClick={() => setSelectedProjectId(project.id)}
                                  onTouchEnd={(e) => {
                                    // Double tap for mobile navigation (only if not swiping)
                                    const target = e.currentTarget as any;
                                    if (target.isSwiping) return;
                                    
                                    const now = Date.now();
                                    const lastTap = target.lastTap || 0;
                                    if (now - lastTap < 300) {
                                      setSelectedProjectId(project.id);
                                    } else {
                                      target.lastTap = now;
                                    }
                                  }}
                                  className={cn(
                                    "p-4 sm:p-6 rounded-xl border bg-card transition-all cursor-pointer group select-none",
                                    "active:scale-[0.99] touch-manipulation",
                                    sidebarProjectId === project.id 
                                      ? "border-cyan-400 ring-2 ring-cyan-200 dark:ring-cyan-800/50 bg-gradient-to-br from-cyan-50/80 via-sky-50/60 to-blue-50/40 dark:from-cyan-950/30 dark:via-sky-950/20 dark:to-blue-950/10" 
                                      : "hover:border-cyan-200 hover:bg-gradient-to-br hover:from-cyan-50/60 hover:via-sky-50/40 hover:to-blue-50/30 dark:hover:from-cyan-950/20 dark:hover:via-sky-950/15 dark:hover:to-blue-950/10"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                        sidebarProjectId === project.id 
                                          ? "bg-amber-500 text-white" 
                                          : "bg-amber-100 dark:bg-amber-900/30"
                                      )}>
                                        <FolderOpen className={cn(
                                          "h-5 w-5",
                                          sidebarProjectId === project.id ? "text-white" : "text-amber-600"
                                        )} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{project.name}</h3>
                                          <Badge 
                                            variant="outline" 
                                            className={cn(
                                              "text-xs",
                                              project.status === 'completed' 
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" 
                                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                            )}
                                          >
                                            {project.status === 'completed' ? t("workspace.completed") : t("workspace.inProgress")}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {project.description || project.address || t("workspace.noDescription")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                      {project.id === createdProjectId && analyzing && (
                                        <span className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                          <Sparkles className="h-3 w-3 animate-pulse" />
                                          {t("workspace.analyzing")}
                                        </span>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProjectId(project.id);
                                        }}
                                      >
                                        {t("workspace.open")}
                                      </Button>
                                      {/* Mobile open button - always visible */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="sm:hidden h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProjectId(project.id);
                                        }}
                                      >
                                        <ArrowLeft className="h-4 w-4 rotate-180" />
                                      </Button>
                                      {/* Desktop complete button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "hidden sm:flex h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                                          project.status === 'completed' 
                                            ? "text-emerald-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                            : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                        )}
                                        onClick={handleCompleteProject}
                                        title={project.status === 'completed' ? t("workspace.reopenProject", "Reopen project") : t("workspace.completeProject", "Mark as completed")}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                      {/* Desktop archive button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hidden sm:flex h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleArchive();
                                        }}
                                        title={t("archive.moveToArchive", "Move to Archive")}
                                      >
                                        <Archive className="h-4 w-4" />
                                      </Button>
                                      {/* Desktop delete button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hidden sm:flex h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!confirm(`${t("archive.deletePermanently", "Delete permanently")} "${project.name}"? ${t("workspace.cannotUndo", "This cannot be undone.")}`)) return;
                                          handleDelete();
                                        }}
                                        title={t("workspace.deleteProject", "Delete project")}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs text-muted-foreground">
                                    <span>📅 {format(new Date(project.created_at), "MMM d, yyyy")}</span>
                                    {project.address && <span className="truncate max-w-[200px]">📍 {project.address}</span>}
                                  </div>
                                  {/* Mobile hint for selected project */}
                                  {sidebarProjectId === project.id && (
                                    <p className="sm:hidden text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                                      ✓ {t("workspace.selectedSwipeHint", "Selected — Swipe left for options")}
                                    </p>
                                  )}
                                </div>
                              );

                              // Mobile: wrap in swipeable container with archive option
                              if (isMobile) {
                                return (
                                  <SwipeableProjectCard
                                    key={project.id}
                                    onDelete={handleDelete}
                                    onArchive={handleArchive}
                                    deleteLabel={t("common.delete", "Delete")}
                                    archiveLabel={t("archive.archive", "Archive")}
                                    showArchiveOption={true}
                                  >
                                    {cardContent}
                                  </SwipeableProjectCard>
                                );
                              }

                              // Desktop: wrap in tooltip
                              return (
                                <Tooltip key={project.id} delayDuration={700}>
                                  <TooltipTrigger asChild>
                                    {cardContent}
                                  </TooltipTrigger>
                                  <TooltipContent 
                                    side="top" 
                                    className="bg-slate-900 text-white border-slate-800"
                                  >
                                    <p className="text-xs">Click to select • Double-click to open</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>

                          <div className="lg:col-span-1">
                            <ProjectDashboardWidget 
                              selectedProjectId={sidebarProjectId}
                              onTaskClick={(projectId, navigateToTasks) => {
                                setSelectedProjectId(projectId);
                                if (navigateToTasks) {
                                  setInitialTab("team");
                                }
                              }}
                              onClearSelection={() => setSidebarProjectId(null)}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Shared With Me Tab */}
                  {projectsTab === "shared" && (
                    <>
                      {/* Header */}
                      <div className="mb-4">
                        <h2 className="text-xl font-bold text-foreground">Shared With Me</h2>
                        <p className="text-sm text-muted-foreground">
                          Projects where you are a team member
                        </p>
                      </div>

                      {sharedProjects.length === 0 ? (
                        <div className="min-h-[300px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                          <Users className="h-16 w-16 text-muted-foreground/40" />
                          <div className="text-center">
                            <p className="text-lg font-medium text-foreground">No shared projects</p>
                            <p className="text-muted-foreground">Projects shared with you will appear here</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                            {sharedProjects.map((project) => {
                              const cardContent = (
                                <div 
                                  onClick={() => setSidebarProjectId(prev => prev === project.id ? null : project.id)}
                                  onDoubleClick={() => setSelectedProjectId(project.id)}
                                  onTouchEnd={(e) => {
                                    const target = e.currentTarget as any;
                                    if (target.isSwiping) return;
                                    
                                    const now = Date.now();
                                    const lastTap = target.lastTap || 0;
                                    if (now - lastTap < 300) {
                                      setSelectedProjectId(project.id);
                                    } else {
                                      target.lastTap = now;
                                    }
                                  }}
                                  className={cn(
                                    "p-4 sm:p-6 rounded-xl border bg-card transition-all cursor-pointer group select-none",
                                    "active:scale-[0.99] touch-manipulation",
                                    sidebarProjectId === project.id 
                                      ? "border-cyan-400 ring-2 ring-cyan-200 dark:ring-cyan-800/50 bg-gradient-to-br from-cyan-50/80 via-sky-50/60 to-blue-50/40 dark:from-cyan-950/30 dark:via-sky-950/20 dark:to-blue-950/10" 
                                      : "hover:border-cyan-200 hover:bg-gradient-to-br hover:from-cyan-50/60 hover:via-sky-50/40 hover:to-blue-50/30 dark:hover:from-cyan-950/20 dark:hover:via-sky-950/15 dark:hover:to-blue-950/10"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                        sidebarProjectId === project.id 
                                          ? "bg-cyan-500 text-white" 
                                          : "bg-cyan-100 dark:bg-cyan-900/30"
                                      )}>
                                        <Users className={cn(
                                          "h-5 w-5",
                                          sidebarProjectId === project.id ? "text-white" : "text-cyan-600"
                                        )} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{project.name}</h3>
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {project.status}
                                          </Badge>
                                          {project.role && (
                                            <RoleBadge role={project.role as ProjectRole} size="sm" />
                                          )}
                                          <Badge variant="secondary" className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs">
                                            Shared
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {project.description || project.address || "No description"}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Mobile open button */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="sm:hidden h-8 w-8 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProjectId(project.id);
                                      }}
                                    >
                                      <ArrowLeft className="h-4 w-4 rotate-180" />
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs text-muted-foreground">
                                    <span>👤 {project.owner_name}</span>
                                    <span>📅 {format(new Date(project.created_at), "MMM d, yyyy")}</span>
                                    {project.address && <span className="truncate max-w-[200px]">📍 {project.address}</span>}
                                  </div>
                                  {/* Mobile hint for selected project */}
                                  {sidebarProjectId === project.id && (
                                    <p className="sm:hidden text-xs text-cyan-600 dark:text-cyan-400 mt-2 font-medium">
                                      ✓ Selected — Double-tap to open
                                    </p>
                                  )}
                                </div>
                              );

                              // Desktop: wrap in tooltip (shared projects can't be deleted by non-owners)
                              if (!isMobile) {
                                return (
                                  <Tooltip key={project.id} delayDuration={700}>
                                    <TooltipTrigger asChild>
                                      {cardContent}
                                    </TooltipTrigger>
                                    <TooltipContent 
                                      side="top" 
                                      className="bg-slate-900 text-white border-slate-800"
                                    >
                                      <p className="text-xs">Click to select • Double-click to open</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              }

                              return <div key={project.id}>{cardContent}</div>;
                            })}
                          </div>

                          {/* Sidebar with Project Dashboard Widget */}
                          <div className="lg:col-span-1">
                            <ProjectDashboardWidget 
                              selectedProjectId={null}
                              onTaskClick={(projectId, navigateToTasks) => {
                                setSelectedProjectId(projectId);
                                if (navigateToTasks) {
                                  setInitialTab("team");
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Archived Tab */}
                  {projectsTab === "archived" && (
                    <>
                      {/* Header */}
                      <div className="mb-4">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                          <Archive className="h-5 w-5 text-muted-foreground" />
                          {t("archive.archivedProjects", "Archived Projects")}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {t("archive.archivedDescription", "Projects you've archived can be restored or permanently deleted")}
                        </p>
                      </div>

                      {archivedProjects.length === 0 ? (
                        <div className="min-h-[300px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                          <Archive className="h-16 w-16 text-muted-foreground/40" />
                          <div className="text-center">
                            <p className="text-lg font-medium text-foreground">{t("archive.noArchivedProjects", "No archived projects")}</p>
                            <p className="text-muted-foreground">{t("archive.archiveHint", "Swipe left on any project to archive it")}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {archivedProjects.map((project) => {
                            const handleRestore = async () => {
                              // Restore by clearing archived_at
                              const { error } = await supabase
                                .from("projects")
                                .update({ archived_at: null })
                                .eq("id", project.id);
                              
                              if (error) {
                                toast.error(t("archive.restoreFailed", "Failed to restore project"));
                              } else {
                                // Also restore related contracts and tasks
                                await supabase
                                  .from("contracts")
                                  .update({ archived_at: null })
                                  .eq("project_id", project.id);
                                await supabase
                                  .from("project_tasks")
                                  .update({ archived_at: null })
                                  .eq("project_id", project.id);
                                
                                setArchivedProjects(prev => prev.filter(p => p.id !== project.id));
                                setProjects(prev => [{ ...project, archived_at: null } as any, ...prev]);
                                toast.success(t("archive.projectRestored", "Project restored"));
                              }
                            };

                            const handlePermanentDelete = async () => {
                              // Note: RLS prevents actual deletion - this will fail for non-admins
                              // which is by design to preserve Operational Truth
                              toast.info(t("archive.cannotDelete", "Projects cannot be permanently deleted to preserve data integrity"));
                            };

                            return (
                              <div 
                                key={project.id}
                                className="p-4 sm:p-6 rounded-xl border bg-muted/30 border-muted-foreground/20"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                      <Archive className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-semibold text-muted-foreground truncate">{project.name}</h3>
                                      {project.description && (
                                        <p className="text-sm text-muted-foreground/70 truncate mt-1">{project.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleRestore}
                                      className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <Undo2 className="h-4 w-4" />
                                      <span className="hidden sm:inline">{t("archive.restore", "Restore")}</span>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handlePermanentDelete}
                                      className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="hidden sm:inline">{t("archive.delete", "Delete")}</span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs text-muted-foreground">
                                  <span>📅 {format(new Date(project.created_at), "MMM d, yyyy")}</span>
                                  {project.address && <span className="truncate max-w-[200px]">📍 {project.address}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
      
      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionProjects2;
