import { useState, useEffect } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Plus, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProjectQuestionnaire, { 
  ProjectAnswers, 
  WorkflowRecommendation 
} from "@/components/projects2/ProjectQuestionnaire";
import AIAnalysisProgress from "@/components/projects2/AIAnalysisProgress";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjectAIAnalysis } from "@/hooks/useProjectAIAnalysis";
import { useSubscription } from "@/hooks/useSubscription";

interface SavedProject {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

const BuildUnionProjects2 = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);
  const [pendingWorkType, setPendingWorkType] = useState<string | null>(null);
  const [pendingDescription, setPendingDescription] = useState<string>("");

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

  // Load projects from database
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const loadProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, address, trade, status, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects");
      } else {
        setProjects(data || []);
      }
      setLoading(false);
    };

    loadProjects();
  }, [user, authLoading]);

  // AI-determined workflow state with full analysis data
  const [aiWorkflowRecommendation, setAiWorkflowRecommendation] = useState<{
    mode: "quick" | "standard" | "full";
    reason: string;
    projectSize: "small" | "medium" | "large";
    features: string[];
    // Analysis details for transparency
    analysisDetails: {
      area: number | null;
      areaUnit: string;
      materials: Array<{ item: string; quantity: number; unit: string }>;
      hasBlueprint: boolean;
      surfaceType: string;
      roomType: string;
    };
  } | null>(null);

  // Determine workflow from AI analysis results (now uses AI-determined projectSize)
  const determineAIWorkflow = (result: typeof analysisResult, tier: string) => {
    if (!result) return null;

    const { projectSize, projectSizeReason } = result;
    const area = result.estimate.area || 0;
    const materials = result.estimate.materials || [];
    const hasBlueprint = !!result.blueprintAnalysis?.extractedText;
    const isPremium = tier === "premium" || tier === "enterprise";
    const isPro = tier === "pro" || isPremium;

    // Determine workflow mode based on AI-determined project size + tier
    let mode: "quick" | "standard" | "full" = "quick";
    let reason = "";
    let features: string[] = [];

    if (projectSize === "large" || hasBlueprint) {
      if (isPro) {
        mode = "full";
        reason = `${projectSizeReason}. Full project management recommended.`;
        features = ["AI Estimation", "Blueprint Analysis", "Team Management", "Document Hub", "Contract Generator"];
      } else {
        mode = "standard";
        reason = `${projectSizeReason}. Upgrade to Pro for team features.`;
        features = ["AI Estimation", "Quote Generator", "Contract"];
      }
    } else if (projectSize === "medium") {
      mode = "standard";
      reason = `${projectSizeReason}. Standard workflow covers your needs.`;
      features = ["AI Estimation", "Calculator", "Quote", "Contract"];
    } else {
      mode = "quick";
      reason = `${projectSizeReason}. Quick estimate ready!`;
      features = ["Photo Estimate", "Quote", "Contract"];
    }

    // Include analysis details for UI transparency
    const analysisDetails = {
      area: result.estimate.area,
      areaUnit: result.estimate.areaUnit || "sq ft",
      materials: materials.slice(0, 6).map(m => ({ item: m.item, quantity: m.quantity, unit: m.unit })),
      hasBlueprint,
      surfaceType: result.estimate.surfaceType || "unknown",
      roomType: result.estimate.roomType || "unknown",
    };

    return { mode, reason, projectSize, features, analysisDetails };
  };

  // Trigger AI analysis after project creation
  useEffect(() => {
    const hasContent = pendingImages.length > 0 || pendingDocuments.length > 0;
    if (createdProjectId && hasContent && !analyzing) {
      // Start AI analysis
      analyzeProject({
        projectId: createdProjectId,
        images: pendingImages,
        documents: pendingDocuments,
        description: pendingDescription,
        workType: pendingWorkType,
      }).then((result) => {
        if (result) {
          // AI determines the workflow based on analysis
          const workflow = determineAIWorkflow(result, subscription.tier);
          if (workflow) {
            setAiWorkflowRecommendation(workflow);
            
            // Update project_summaries with AI-determined workflow
            supabase
              .from("project_summaries")
              .update({
                calculator_results: [{
                  type: "ai_workflow_recommendation",
                  ...workflow,
                  aiAnalysis: {
                    area: result.estimate.area,
                    areaUnit: result.estimate.areaUnit,
                    materialsCount: result.estimate.materials.length,
                    hasBlueprint: !!result.blueprintAnalysis?.extractedText
                  }
                }]
              })
              .eq("project_id", createdProjectId)
              .then(() => {
                toast.success("AI analysis complete!", {
                  description: workflow.reason
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
  }, [createdProjectId, pendingImages, pendingDocuments, analyzing, subscription.tier]);

  // Handle workflow selection after AI recommendation
  const handleWorkflowSelect = async (mode: "quick" | "standard" | "full") => {
    if (!createdProjectId) return;

    // Navigate based on selected workflow
    if (mode === "quick") {
      // Go to Quick Mode with pre-filled data
      navigate(`/buildunion/quick-mode?projectId=${createdProjectId}`);
    } else if (mode === "full" && (subscription.tier === "pro" || subscription.tier === "premium")) {
      // Go to full project details
      navigate(`/buildunion/project/${createdProjectId}`);
    } else {
      // Standard mode - go to project with focus on estimate
      navigate(`/buildunion/project/${createdProjectId}?tab=synthesis`);
    }

    // Reset state
    setAiWorkflowRecommendation(null);
    setCreatedProjectId(null);
  };

  const handleQuestionnaireComplete = async (answers: ProjectAnswers, workflow: WorkflowRecommendation) => {
    if (!user) {
      toast.error("Please sign in to create a project");
      return;
    }

    setSaving(true);
    resetAnalysis();

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

      // Create project description - use user's description or generate from workflow
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

        // Update project with site_images if uploads succeeded
        if (uploadedImagePaths.length > 0) {
          await supabase
            .from("projects")
            .update({ site_images: uploadedImagePaths })
            .eq("id", projectData.id);
        }
      }

      // Create a project_summaries entry with the workflow mode
      const { error: summaryError } = await supabase
        .from("project_summaries")
        .insert({
          user_id: user.id,
          project_id: projectData.id,
          mode: workflow.teamEnabled ? "team" : "solo",
          status: answers.images.length > 0 ? "analyzing" : "draft",
          // Store workflow metadata in calculator_results as JSON
          calculator_results: [{
            type: "workflow_config",
            workflowMode: workflow.mode,
            calculator: workflow.calculator,
            teamEnabled: workflow.teamEnabled,
            estimatedSteps: workflow.estimatedSteps,
            features: workflow.features,
            projectSize: answers.size,
            workType: answers.workType,
            teamNeed: answers.teamNeed,
            userDescription: answers.description,
            imageCount: uploadedImagePaths.length,
            documentCount: answers.documents?.length || 0
          }]
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

      setShowQuestionnaire(false);

      // If images or documents were uploaded, trigger AI analysis
      const hasContent = answers.images.length > 0 || answers.documents.length > 0;
      if (hasContent) {
        const contentDesc = [];
        if (answers.images.length > 0) contentDesc.push(`${answers.images.length} photo(s)`);
        if (answers.documents.length > 0) contentDesc.push(`${answers.documents.length} PDF(s)`);
        
        toast.success(`Project "${answers.name}" created!`, {
          description: `Starting AI analysis of ${contentDesc.join(" and ")}...`
        });
        
        // Store pending data for AI analysis
        setCreatedProjectId(projectData.id);
        setPendingImages(answers.images);
        setPendingDocuments(answers.documents);
        setPendingWorkType(answers.workType);
        setPendingDescription(answers.description);
      } else {
        toast.success(`Project "${answers.name}" created!`);
      }

    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
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

      {/* Main Content Area */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {!showQuestionnaire ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Projects</h1>
                    <p className="text-muted-foreground">Smart workflow based on your needs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Tier indicator */}
                  {subscription.tier !== "free" && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                      {subscription.tier.toUpperCase()} • Up to {tierConfig.maxImages} photos
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

              {/* AI Workflow Recommendation (after analysis) */}
              {aiWorkflowRecommendation && !analyzing && (
                <div className="mb-6 p-6 rounded-xl border bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">AI Recommendation</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          aiWorkflowRecommendation.projectSize === "large" 
                            ? "bg-blue-500/20 text-blue-600" 
                            : aiWorkflowRecommendation.projectSize === "medium"
                            ? "bg-cyan-500/20 text-cyan-600"
                            : "bg-amber-500/20 text-amber-600"
                        }`}>
                          {aiWorkflowRecommendation.projectSize.toUpperCase()} PROJECT
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{aiWorkflowRecommendation.reason}</p>
                    </div>
                  </div>

                  {/* AI Detection Results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 rounded-lg bg-muted/30">
                    {/* Area Detection */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">📐 Detected Area</div>
                      {aiWorkflowRecommendation.analysisDetails.area ? (
                        <div className="text-lg font-semibold text-foreground">
                          {aiWorkflowRecommendation.analysisDetails.area.toLocaleString()} {aiWorkflowRecommendation.analysisDetails.areaUnit}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Not detected</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {aiWorkflowRecommendation.analysisDetails.surfaceType !== "unknown" && (
                          <span>Surface: {aiWorkflowRecommendation.analysisDetails.surfaceType}</span>
                        )}
                        {aiWorkflowRecommendation.analysisDetails.roomType !== "unknown" && (
                          <span className="ml-2">• {aiWorkflowRecommendation.analysisDetails.roomType}</span>
                        )}
                      </div>
                      {aiWorkflowRecommendation.analysisDetails.hasBlueprint && (
                        <div className="text-xs text-primary mt-1">📄 Blueprint data included</div>
                      )}
                    </div>

                    {/* Materials List */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">🧱 Materials ({aiWorkflowRecommendation.analysisDetails.materials.length})</div>
                      {aiWorkflowRecommendation.analysisDetails.materials.length > 0 ? (
                        <div className="space-y-1">
                          {aiWorkflowRecommendation.analysisDetails.materials.slice(0, 4).map((m, i) => (
                            <div key={i} className="text-xs flex justify-between">
                              <span className="text-foreground truncate max-w-[140px]">{m.item}</span>
                              <span className="text-muted-foreground">{m.quantity} {m.unit}</span>
                            </div>
                          ))}
                          {aiWorkflowRecommendation.analysisDetails.materials.length > 4 && (
                            <div className="text-xs text-muted-foreground">
                              +{aiWorkflowRecommendation.analysisDetails.materials.length - 4} more...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No materials detected</div>
                      )}
                    </div>
                  </div>

                  {/* Workflow Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleWorkflowSelect("quick")}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        aiWorkflowRecommendation.mode === "quick"
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <div className="font-medium text-foreground">Quick Mode</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Photo → Quote → Contract
                      </div>
                      {aiWorkflowRecommendation.mode === "quick" && (
                        <span className="inline-block mt-2 text-xs font-medium text-amber-600">✓ Recommended</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleWorkflowSelect("standard")}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        aiWorkflowRecommendation.mode === "standard"
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-border hover:border-cyan-300"
                      }`}
                    >
                      <div className="font-medium text-foreground">Standard</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Estimate + Calculator + Docs
                      </div>
                      {aiWorkflowRecommendation.mode === "standard" && (
                        <span className="inline-block mt-2 text-xs font-medium text-cyan-600">✓ Recommended</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleWorkflowSelect("full")}
                      disabled={subscription.tier === "free"}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        aiWorkflowRecommendation.mode === "full"
                          ? "border-blue-500 bg-blue-500/10"
                          : subscription.tier === "free"
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Full Project</span>
                        {subscription.tier === "free" && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Team + Tasks + Full Management
                      </div>
                      {aiWorkflowRecommendation.mode === "full" && subscription.tier !== "free" && (
                        <span className="inline-block mt-2 text-xs font-medium text-blue-600">✓ Recommended</span>
                      )}
                    </button>
                  </div>

                  {/* Features preview */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Selected features: </span>
                      {aiWorkflowRecommendation.features.join(" → ")}
                    </div>
                  </div>
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
                  {projects.length === 0 ? (
                    <div className="min-h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-4">
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
                    <div className="grid gap-4">
                      {projects.map((project) => (
                        <div 
                          key={project.id}
                          onClick={() => navigate(`/buildunion/project/${project.id}`)}
                          className="p-6 rounded-xl border bg-card hover:border-amber-300 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {project.address || "No location"} • {project.trade?.replace("_", " ") || "General"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {project.id === createdProjectId && analyzing && (
                                <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                  <Sparkles className="h-3 w-3 animate-pulse" />
                                  Analyzing...
                                </span>
                              )}
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 capitalize">
                                {project.status}
                              </span>
                            </div>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                              {project.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* Questionnaire */
            <ProjectQuestionnaire
              onComplete={handleQuestionnaireComplete}
              onCancel={() => setShowQuestionnaire(false)}
              saving={saving}
              tierConfig={tierConfig}
            />
          )}
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionProjects2;
