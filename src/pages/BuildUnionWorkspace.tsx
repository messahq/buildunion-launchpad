import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Loader2, MapPin, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface SavedProject {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

const BuildUnionWorkspace = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<SavedProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        .is("archived_at", null)
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

  // Navigate to new project wizard
  const handleNewProject = () => {
    navigate("/buildunion/new-project");
  };

  // Handle project deletion (soft delete)
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", projectToDelete.id);

      if (error) throw error;

      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      toast.success(t("workspace.projectDeleted", "Project deleted successfully"));
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(t("workspace.deleteError", "Failed to delete project"));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, project: SavedProject) => {
    e.stopPropagation(); // Prevent card click
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <BuildUnionHeader />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BuildUnionFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <BuildUnionHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>{t("workspace.loginRequired", "Login Required")}</CardTitle>
              <CardDescription>
                {t("workspace.loginDescription", "Please log in to access your workspace.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/buildunion/login")} className="w-full">
                {t("common.login", "Log In")}
              </Button>
            </CardContent>
          </Card>
        </main>
        <BuildUnionFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8 pb-28">
        <div className="max-w-4xl mx-auto">
          {/* Header with Amber accent */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                Projects 3.0
              </h1>
              <p className="text-amber-700/70 dark:text-amber-400/70">
                Smart workflow based on AI analysis
              </p>
            </div>
            <Button 
              onClick={handleNewProject} 
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0"
            >
              <Plus className="h-4 w-4" />
              {t("workspace.newProject", "New Project")}
            </Button>
          </div>

          {/* Empty State with Amber theme */}
          {projects.length === 0 ? (
            <Card className="text-center py-16 border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20">
              <CardContent>
                <FolderOpen className="h-16 w-16 mx-auto text-amber-500/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                  {t("workspace.noProjects", "No projects yet")}
                </h2>
                <p className="text-amber-700/70 dark:text-amber-400/70 mb-6 max-w-md mx-auto">
                  {t("workspace.noProjectsDescription", "Start by creating your first project. The new Project 3.0 wizard will guide you through the process.")}
                </p>
                <Button 
                  onClick={handleNewProject} 
                  size="lg" 
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0"
                >
                  <Plus className="h-5 w-5" />
                  {t("workspace.createFirstProject", "Create Your First Project")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Project List with Amber theme */
            <div className="grid gap-4">
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all border-amber-200/50 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-600 bg-gradient-to-r from-background via-amber-50/10 to-background dark:from-background dark:via-amber-950/10 dark:to-background group"
                    onClick={() => navigate(`/buildunion/project/${project.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {project.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={(e) => openDeleteDialog(e, project)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <motion.div
                            className="w-2 h-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full opacity-0 group-hover:opacity-100"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                        </div>
                      </div>
                      {project.address && (
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.address}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {project.trade && (
                          <span className="text-amber-600 dark:text-amber-400">{project.trade}</span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs">
                          {project.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workspace.deleteProject", "Delete Project")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workspace.deleteConfirmation", "Are you sure you want to delete")} <strong>{projectToDelete?.name}</strong>? 
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

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionWorkspace;
