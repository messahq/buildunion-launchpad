import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Plus, Calendar, FileText, Loader2, Trash2, Users, Zap, ArrowRight, Download } from "lucide-react";
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
  isSiteLog?: boolean;
  template_type?: string;
  completed_count?: number;
  total_count?: number;
  pdf_url?: string;
}

interface DraftData {
  id: string;
  last_updated: string;
  data: any;
}

interface ProjectListProps {
  onProjectSelect?: (id: string, name: string) => void;
}

const ProjectList = ({ onProjectSelect }: ProjectListProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
        // Fetch own projects - explicitly filter out archived
        const { data: ownProjects, error: ownError } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .is("archived_at", null)
          .order("created_at", { ascending: false });

        if (ownError) throw ownError;

        // Fetch site logs (MESSA reports)
        const { data: siteLogs, error: siteLogsError } = await supabase
          .from("site_logs")
          .select("id, report_name, template_type, created_at, updated_at, completed_count, total_count, notes, pdf_url, tasks_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (siteLogsError) {
          console.error("Error fetching site logs:", siteLogsError);
        }

        // Transform site logs to project-like format with client name extraction
        const siteLogProjects: Project[] = (siteLogs || []).map(log => {
          // Parse tasks_data to extract client name
          let clientName = '';
          try {
            const tasksData = log.tasks_data as { clientName?: string } | null;
            clientName = tasksData?.clientName || '';
          } catch (e) {
            console.error('Error parsing tasks_data:', e);
          }
          
          return {
            id: log.id,
            name: clientName || log.report_name,
            description: log.template_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Site Log',
            status: "site_log",
            created_at: log.created_at,
            updated_at: log.updated_at,
            user_id: user.id,
            isSiteLog: true,
            template_type: log.template_type,
            completed_count: log.completed_count,
            total_count: log.total_count,
            pdf_url: log.pdf_url,
          };
        });
        
        console.log("Site logs fetched:", siteLogs?.length || 0, "items");

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
            .is("archived_at", null)
            .order("created_at", { ascending: false });

          if (!sharedError && shared) {
            sharedProjects = shared.map(p => ({ ...p, isShared: true }));
          }
        }

        // Combine all and sort by created_at
        const allProjects = [...(ownProjects || []), ...siteLogProjects, ...sharedProjects].sort(
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_logs" },
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
      case "site_log":
        return "bg-purple-100 text-purple-700 border-purple-200";
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

  const handleArchiveProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    
    // Can't archive shared projects
    if (project.isShared || project.user_id !== user?.id) {
      toast.error("You can only archive your own projects");
      return;
    }
    
    if (!confirm(`Are you sure you want to archive "${project.name}"? You can restore it later from the archive.`)) return;

    try {
      // Soft delete - set archived_at timestamp instead of actually deleting
      const { error } = await supabase
        .from("projects")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) throw error;

      // Also archive related contracts and tasks
      await supabase
        .from("contracts")
        .update({ archived_at: new Date().toISOString() })
        .eq("project_id", project.id);

      await supabase
        .from("project_tasks")
        .update({ archived_at: new Date().toISOString() })
        .eq("project_id", project.id);

      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast.success("Project archived successfully. Admins can still access this data.");
    } catch (error) {
      console.error("Archive project error:", error);
      toast.error("Failed to archive project");
    }
  };

  const handleDeleteSiteLog = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    
    if (!project.isSiteLog) return;
    
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from("site_logs")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast.success("Site log deleted successfully");
    } catch (error) {
      console.error("Delete site log error:", error);
      toast.error("Failed to delete site log");
    }
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </CardContent>
      </Card>
    );
  }

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
      <>
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Start your first project and let M.E.S.S.A. analyze your documents.</p>
            <Button onClick={() => setShowNewProjectModal(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </CardContent>
        </Card>
        <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} />
      </>
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
          {ownProjects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            const isSiteLog = project.isSiteLog;
            return (
              <Card 
                key={project.id} 
                className={`border-border bg-card hover:shadow-md transition-all duration-200 cursor-pointer group ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-200 shadow-md' : isSiteLog ? 'hover:border-purple-400' : 'hover:border-amber-400'
                }`}
                onClick={(e) => {
                  // Site logs don't have a detail page, just toggle selection
                  if (isSiteLog) {
                    if (isSelected) {
                      setSelectedProjectId(null);
                      onProjectSelect?.('', '');
                    } else {
                      setSelectedProjectId(project.id);
                      onProjectSelect?.(project.id, project.name);
                    }
                    return;
                  }
                  // Navigate directly to Owner View for owned projects
                  navigate(`/buildunion/project/${project.id}/owner`);
                }}
                onDoubleClick={() => !isSiteLog && navigate(`/buildunion/project/${project.id}/owner`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isSiteLog
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 group-hover:bg-purple-500/20'
                        : isSelected 
                          ? 'bg-amber-500/30 dark:bg-amber-500/40' 
                          : 'bg-amber-500/10 dark:bg-amber-500/20 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30'
                    }`}>
                      {isSiteLog ? (
                        <FileText className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Folder className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSiteLog && (
                        <>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                            Site Log
                          </Badge>
                          {project.pdf_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(project.pdf_url, '_blank');
                              }}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteSiteLog(e, project)}
                            title="Delete site log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {isSelected && !isSiteLog && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                          Selected
                        </Badge>
                      )}
                      {!isSiteLog && (
                        <>
                          <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                            {project.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleArchiveProject(e, project)}
                            title="Archive project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <CardTitle className={`text-lg font-semibold mt-3 transition-colors ${
                    isSiteLog 
                      ? 'text-foreground group-hover:text-purple-600'
                      : isSelected ? 'text-amber-700' : 'text-foreground group-hover:text-amber-600'
                  }`}>
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <CardDescription className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.created_at)}
                      </div>
                      {isSiteLog && project.completed_count !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className="text-purple-600">{project.completed_count}/{project.total_count || 0}</span>
                          tasks
                        </div>
                      )}
                      {!isSiteLog && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Documents
                        </div>
                      )}
                    </div>
                    {!isSiteLog && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={(e) => {
                          e.stopPropagation();
                        navigate(`/buildunion/project/${project.id}/owner`);
                        }}
                      >
                        Open →
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
