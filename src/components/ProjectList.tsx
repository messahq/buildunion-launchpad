import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Calendar, FileText, Loader2, Trash2, Users, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PendingInvitations from "./PendingInvitations";
import NewProjectModal from "./NewProjectModal";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  isShared?: boolean;
}

interface DraftData {
  id: string;
  last_updated: string;
  data: any;
}

const ProjectList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch draft data for Quick Mode
    const fetchDraftData = async () => {
      try {
        const { data, error } = await supabase
          .from("user_draft_data")
          .select("id, last_updated, data")
          .eq("user_id", user.id)
          .eq("draft_type", "quick_mode")
          .maybeSingle();

        if (!error && data) {
          setDraftData(data);
        }
      } catch (err) {
        console.error("Error fetching draft:", err);
      }
    };

    fetchDraftData();

    const fetchProjects = async () => {
      try {
        // Fetch own projects
        const { data: ownProjects, error: ownError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (ownError) throw ownError;

        // Fetch shared projects (where user is a member)
        const { data: memberships, error: memberError } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);

        let sharedProjects: Project[] = [];
        if (!memberError && memberships && memberships.length > 0) {
          const projectIds = memberships.map(m => m.project_id);
          const { data: shared, error: sharedError } = await supabase
            .from("projects")
            .select("*")
            .in("id", projectIds)
            .order("created_at", { ascending: false });

          if (!sharedError && shared) {
            sharedProjects = shared.map(p => ({ ...p, isShared: true }));
          }
        }

        // Combine and sort by created_at
        const allProjects = [...(ownProjects || []), ...sharedProjects].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setProjects(allProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    // Subscribe to realtime changes
    const projectsChannel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => fetchProjects()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members" },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    
    // Can't delete shared projects
    if (project.isShared || project.user_id !== user?.id) {
      toast.error("You can only delete your own projects");
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return;

    try {
      // Delete associated documents from storage and DB
      const { data: docs } = await supabase
        .from("project_documents")
        .select("file_path")
        .eq("project_id", project.id);

      if (docs && docs.length > 0) {
        const paths = docs.map(d => d.file_path);
        await supabase.storage.from("project-documents").remove(paths);
        await supabase.from("project_documents").delete().eq("project_id", project.id);
      }

      // Delete team invitations
      await supabase.from("team_invitations").delete().eq("project_id", project.id);

      // Delete project
      const { error } = await supabase.from("projects").delete().eq("id", project.id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast.success("Project deleted");
    } catch (error) {
      console.error("Delete project error:", error);
      toast.error("Failed to delete project");
    }
  };

  if (!user) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <Folder className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sign in to view your projects</h3>
          <p className="text-muted-foreground mb-6">Create an account to start managing your construction projects.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/buildunion/login")}>
              Log In
            </Button>
            <Button onClick={() => navigate("/buildunion/register")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              Register
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <Folder className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6">Start your first project and let M.E.S.S.A. analyze your documents.</p>
          <Button onClick={() => setShowNewProjectModal(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ownProjects = projects.filter(p => !p.isShared);
  const sharedProjects = projects.filter(p => p.isShared);

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      <PendingInvitations />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Projects</h2>
          <p className="text-muted-foreground text-sm">
            {ownProjects.length} project{ownProjects.length !== 1 ? "s" : ""}
            {sharedProjects.length > 0 && ` • ${sharedProjects.length} shared`}
          </p>
        </div>
        <Button onClick={() => setShowNewProjectModal(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* New Project Modal */}
      <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} />

      {/* Draft in Progress Card */}
      {draftData && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={() => navigate("/buildunion/quick")}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-amber-900">Quick Mode Draft</h3>
                    <Badge className="bg-amber-200 text-amber-800 text-xs">In Progress</Badge>
                  </div>
                  <p className="text-sm text-amber-700">
                    Last updated: {new Date(draftData.last_updated).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
              <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Own Projects Grid */}
      {ownProjects.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownProjects.map((project) => (
            <Card 
              key={project.id} 
              className="border-border bg-card hover:border-amber-400 hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/buildunion/project/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30 transition-colors">
                    <Folder className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                      {project.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteProject(e, project)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold text-foreground mt-3 group-hover:text-amber-600 transition-colors">
                  {project.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <CardDescription className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(project.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Documents
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Shared Projects Section */}
      {sharedProjects.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Shared With Me</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedProjects.map((project) => (
              <Card 
                key={project.id} 
                className="border-border bg-card hover:border-cyan-400 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/buildunion/project/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 dark:group-hover:bg-cyan-500/30 transition-colors">
                      <Users className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                        {project.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-cyan-600 border-cyan-400">
                        Shared
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground mt-3 group-hover:text-cyan-600 transition-colors">
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <CardDescription className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Documents
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Empty state for own projects */}
      {ownProjects.length === 0 && sharedProjects.length > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-8 text-center">
            <Folder className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">You haven't created any projects yet</p>
            <Button onClick={() => setShowNewProjectModal(true)} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </CardContent>

          {/* New Project Modal for empty state */}
          <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} />
        </Card>
      )}
    </div>
  );
};

export default ProjectList;
