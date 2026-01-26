import { useState, useEffect } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, Plus, FolderOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProjectQuestionnaire, { 
  ProjectAnswers, 
  WorkflowRecommendation 
} from "@/components/projects2/ProjectQuestionnaire";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleQuestionnaireComplete = async (answers: ProjectAnswers, workflow: WorkflowRecommendation) => {
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
          status: "draft",
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
            imageCount: uploadedImagePaths.length
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
      toast.success(`Project "${answers.name}" created!`, {
        description: uploadedImagePaths.length > 0 
          ? `${uploadedImagePaths.length} photo(s) uploaded for AI analysis`
          : undefined
      });

    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  // Extract workflow info from description for display
  const getWorkflowMode = (description: string | null): string => {
    if (!description) return "standard";
    if (description.includes("quick workflow")) return "quick";
    if (description.includes("full workflow")) return "full";
    return "standard";
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
                <Button 
                  onClick={() => setShowQuestionnaire(true)}
                  disabled={!user}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </div>

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
                            <div className="text-right">
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
            />
          )}
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionProjects2;
