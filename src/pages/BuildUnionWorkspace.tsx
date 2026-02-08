import { useState, useEffect } from "react";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">{t("workspace.title", "My Workspace")}</h1>
              <p className="text-muted-foreground">
                {t("workspace.subtitle", "Manage your construction projects")}
              </p>
            </div>
            <Button onClick={handleNewProject} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("workspace.newProject", "New Project")}
            </Button>
          </div>

          {/* Empty State */}
          {projects.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {t("workspace.noProjects", "No projects yet")}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t("workspace.noProjectsDescription", "Start by creating your first project. The new Project 3.0 wizard will guide you through the process.")}
                </p>
                <Button onClick={handleNewProject} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  {t("workspace.createFirstProject", "Create Your First Project")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Project List - placeholder for future implementation */
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.address && (
                      <CardDescription>{project.address}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {project.trade && <span>{project.trade}</span>}
                      <span>Status: {project.status}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BuildUnionFooter />
    </div>
  );
};

export default BuildUnionWorkspace;
