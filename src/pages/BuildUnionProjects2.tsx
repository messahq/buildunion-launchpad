import { useState, useEffect } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Plus, FolderOpen, Loader2, Sparkles, Trash2, Users } from "lucide-react";
import ProjectDashboardWidget from "@/components/ProjectDashboardWidget";
import { useNavigate } from "react-router-dom";
import ProjectQuestionnaire, { 
  ProjectAnswers, 
  WorkflowRecommendation 
} from "@/components/projects2/ProjectQuestionnaire";
import FilterQuestions, { FilterAnswers, AITriggers } from "@/components/projects2/FilterQuestions";
import AIAnalysisProgress from "@/components/projects2/AIAnalysisProgress";
import WorkflowSelector, { AIAnalysisResult, EditedAnalysisData } from "@/components/projects2/WorkflowSelector";
import ProjectDetailsView from "@/components/projects2/ProjectDetailsView";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjectAIAnalysis } from "@/hooks/useProjectAIAnalysis";
import { useSubscription, TEAM_LIMITS } from "@/hooks/useSubscription";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
}

// Questionnaire data stored for filter step
interface QuestionnaireData {
  answers: ProjectAnswers;
  workflow: WorkflowRecommendation;
}

const BuildUnionProjects2 = () => {
  const navigate = useNavigate();
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
  
  // Selected project for details view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  
  // Tab state for My Projects / Shared With Me
  const [projectsTab, setProjectsTab] = useState<"my" | "shared">("my");

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
      // Load my projects
      const { data: myProjectsData, error: myError } = await supabase
        .from("projects")
        .select("id, name, address, trade, status, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (myError) {
        console.error("Error loading projects:", myError);
        toast.error("Failed to load projects");
      } else {
        setProjects(myProjectsData || []);
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
  const transformToSelectorFormat = (result: typeof analysisResult): AIAnalysisResult | null => {
    if (!result) return null;

    const { projectSize, projectSizeReason } = result;
    const area = result.estimate.area || null;
    const materials = result.estimate.materials || [];
    const hasBlueprint = !!result.blueprintAnalysis?.extractedText;

    return {
      area,
      areaUnit: result.estimate.areaUnit || "sq ft",
      materials: materials.slice(0, 10).map(m => ({ item: m.item, quantity: m.quantity, unit: m.unit })),
      hasBlueprint,
      surfaceType: result.estimate.surfaceType || "unknown",
      roomType: result.estimate.roomType || "unknown",
      projectSize: projectSize as "small" | "medium" | "large",
      projectSizeReason: projectSizeReason || "AI analysis complete",
      confidence: materials.length > 3 ? "high" : area ? "medium" : "low",
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
        // Reset pending state but keep createdProjectId for workflow selection
        setPendingImages([]);
        setPendingDocuments([]);
        setPendingWorkType(null);
        setPendingDescription("");
      });
    }
  }, [createdProjectId, pendingImages, pendingDocuments, analyzing, subscription.tier, filterAnswers]);

  // Handle workflow selection from WorkflowSelector
  const handleWorkflowSelect = async (mode: "solo" | "team", editedData?: EditedAnalysisData) => {
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

      // Save workflow selection and any user edits
      await supabase
        .from("project_summaries")
        .update({
          mode,
          status: "active",
          photo_estimate: JSON.parse(JSON.stringify(photoEstimate)),
          ai_workflow_config: JSON.parse(JSON.stringify(workflowConfig)),
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
          Back to Home
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
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Projects 2.0</h1>
                    <p className="text-muted-foreground">Smart workflow based on AI analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Tier indicator */}
                  {subscription.tier !== "free" && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                      {subscription.tier.toUpperCase()} • Up to {TEAM_LIMITS[subscription.tier] === Infinity ? "∞" : TEAM_LIMITS[subscription.tier]} team members
                    </span>
                  )}
                  <Button 
                    onClick={() => setShowQuestionnaire(true)}
                    disabled={!user}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    New Project
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
                  <WorkflowSelector
                    projectId={createdProjectId}
                    analysisResult={aiAnalysisForSelector}
                    tier={subscription.tier}
                    filterAnswers={filterAnswers || undefined}
                    aiTriggers={aiTriggers || undefined}
                    onSelectWorkflow={handleWorkflowSelect}
                    onUpgradeClick={handleUpgradeClick}
                  />
                </div>
              )}

              {/* Auth check */}
              {!authLoading && !user && (
                <div className="min-h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground">Sign in to view projects</p>
                    <p className="text-muted-foreground">Create an account to start managing your projects</p>
                  </div>
                  <Button 
                    onClick={() => navigate("/login")}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    Sign In
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
                  {/* Tab Switcher */}
                  <Tabs value={projectsTab} onValueChange={(v) => setProjectsTab(v as "my" | "shared")} className="mb-6">
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="my" className="gap-2 data-[state=active]:bg-background">
                        <FolderOpen className="h-4 w-4" />
                        My Projects
                      </TabsTrigger>
                      <TabsTrigger value="shared" className="gap-2 data-[state=active]:bg-background">
                        <Users className="h-4 w-4" />
                        Shared With Me
                        {sharedProjects.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {sharedProjects.length}
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
                        <h2 className="text-xl font-bold text-foreground">My Projects</h2>
                        <p className="text-sm text-muted-foreground">
                          {projects.length} project{projects.length !== 1 ? "s" : ""}{sharedProjects.length > 0 ? ` • ${sharedProjects.length} shared` : ""}
                        </p>
                      </div>

                      {projects.length === 0 ? (
                        <div className="min-h-[300px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
                          <FolderOpen className="h-16 w-16 text-muted-foreground/40" />
                          <div className="text-center">
                            <p className="text-lg font-medium text-foreground">No projects yet</p>
                            <p className="text-muted-foreground">Start by answering a few questions</p>
                          </div>
                          <Button 
                            onClick={() => setShowQuestionnaire(true)}
                            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          >
                            <Plus className="h-4 w-4" />
                            New Project
                          </Button>
                        </div>
                      ) : (
                        <div className="grid lg:grid-cols-3 gap-6">
                          {/* Projects List */}
                          <div className="lg:col-span-2 space-y-4">
                            {projects.map((project) => (
                              <div 
                                key={project.id}
                                onClick={() => setSelectedProjectId(project.id)}
                                className="p-6 rounded-xl border bg-card hover:border-amber-300 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                      <FolderOpen className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                                        <Badge variant="outline" className="capitalize">
                                          {project.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {project.description || project.address || "No description"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {project.id === createdProjectId && analyzing && (
                                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                        <Sparkles className="h-3 w-3 animate-pulse" />
                                        Analyzing...
                                      </span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
                                        
                                        const { error } = await supabase
                                          .from("projects")
                                          .delete()
                                          .eq("id", project.id);
                                        
                                        if (error) {
                                          toast.error("Failed to delete project");
                                        } else {
                                          setProjects(prev => prev.filter(p => p.id !== project.id));
                                          toast.success("Project deleted");
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                  <span>📅 {format(new Date(project.created_at), "MMM d, yyyy")}</span>
                                  {project.address && <span>📍 {project.address}</span>}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Sidebar with Project Dashboard Widget */}
                          <div className="lg:col-span-1">
                            <ProjectDashboardWidget 
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
                            {sharedProjects.map((project) => (
                              <div 
                                key={project.id}
                                onClick={() => setSelectedProjectId(project.id)}
                                className="p-6 rounded-xl border bg-card hover:border-cyan-300 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                                      <Users className="h-5 w-5 text-cyan-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                                        <Badge variant="outline" className="capitalize">
                                          {project.status}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                                          Shared
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {project.description || project.address || "No description"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                  <span>👤 {project.owner_name}</span>
                                  <span>📅 {format(new Date(project.created_at), "MMM d, yyyy")}</span>
                                  {project.address && <span>📍 {project.address}</span>}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Sidebar with Project Dashboard Widget */}
                          <div className="lg:col-span-1">
                            <ProjectDashboardWidget 
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
