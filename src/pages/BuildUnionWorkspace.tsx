import { useState, useEffect } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Plus, FolderOpen, Loader2, Sparkles, Trash2, Users, Download } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SwipeableProjectCard from "@/components/SwipeableProjectCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExportDialog, ExportOptions, ExportFormat } from "@/components/ExportDialog";
import { exportToCSV, exportToJSON, projectExportColumns, generateExportFilename } from "@/lib/exportUtils";
import { downloadPDF, buildProjectSummaryHTML } from "@/lib/pdfGenerator";

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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Projects 2.0</h1>
                    <p className="text-sm text-muted-foreground truncate">Smart workflow based on AI analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Tier indicator - hidden on mobile */}
                  {subscription.tier !== "free" && (
                    <span className="hidden md:inline-block px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {subscription.tier.toUpperCase()} • Up to {TEAM_LIMITS[subscription.tier] === Infinity ? "∞" : TEAM_LIMITS[subscription.tier]} team members
                    </span>
                  )}
                  
                  {/* Export Button */}
                  {projects.length > 0 && (
                    <ExportDialog
                      dataType="projects"
                      onExport={handleProjectExport}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Export</span>
                        </Button>
                      }
                    />
                  )}
                  
                  <Button 
                    onClick={() => setShowQuestionnaire(true)}
                    disabled={!user}
                    size={isMobile ? "sm" : "default"}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">New Project</span>
                    <span className="xs:hidden">New</span>
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
                        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                          {/* Projects List */}
                          <div className="lg:col-span-2 space-y-4">
                            {projects.map((project) => {
                              const handleDelete = async () => {
                                const { error } = await supabase
                                  .from("projects")
                                  .delete()
                                  .eq("id", project.id);
                                
                                if (error) {
                                  toast.error("Failed to delete project");
                                } else {
                                  setProjects(prev => prev.filter(p => p.id !== project.id));
                                  if (sidebarProjectId === project.id) setSidebarProjectId(null);
                                  toast.success("Project deleted");
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
                                      ? "border-amber-400 ring-2 ring-amber-200 dark:ring-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20" 
                                      : "hover:border-amber-300 hover:bg-accent/30"
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
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {project.status}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {project.description || project.address || "No description"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                      {project.id === createdProjectId && analyzing && (
                                        <span className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                          <Sparkles className="h-3 w-3 animate-pulse" />
                                          Analyzing...
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
                                        Open
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
                                      {/* Desktop delete button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hidden sm:flex h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
                                          handleDelete();
                                        }}
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
                                      ✓ Selected — Swipe left to delete
                                    </p>
                                  )}
                                </div>
                              );

                              // Mobile: wrap in swipeable container
                              if (isMobile) {
                                return (
                                  <SwipeableProjectCard
                                    key={project.id}
                                    onDelete={handleDelete}
                                    deleteLabel="Delete"
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
                                      ? "border-cyan-400 ring-2 ring-cyan-200 dark:ring-cyan-800/50 bg-cyan-50/50 dark:bg-cyan-950/20" 
                                      : "hover:border-cyan-300 hover:bg-accent/30"
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
