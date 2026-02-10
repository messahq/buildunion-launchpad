import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Loader2, MapPin, Trash2, Users, Share2, Crown, Zap, CheckCircle2, Clock, Eye, EyeOff, ClipboardList, DollarSign, FileText, Cloud, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingInvitationsPanel } from "@/components/PendingInvitationsPanel";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SavedProject {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  description: string | null;
  created_at: string;
  team_count?: number;
  task_count?: number;
  completed_tasks?: number;
}

interface SharedProject {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  status: string;
  role: string;
  owner_name: string | null;
  joined_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  foreman: "Foreman",
  subcontractor: "Subcontractor",
  inspector: "Inspector / QC",
  supplier: "Supplier / Vendor",
  client: "Client Representative",
  worker: "Worker",
  member: "Team Member",
};

const ROLE_COLORS: Record<string, string> = {
  foreman: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  subcontractor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  inspector: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  supplier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  client: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  worker: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
};

// Role-based permission matrix
const ROLE_PERMISSIONS: Record<string, { financials: boolean; documents: string; tasks: string; team: boolean; weather: boolean; timeline: boolean }> = {
  owner: { financials: true, documents: 'full', tasks: 'all', team: true, weather: true, timeline: true },
  foreman: { financials: false, documents: 'upload', tasks: 'all', team: true, weather: true, timeline: true },
  worker: { financials: false, documents: 'view', tasks: 'assigned', team: false, weather: true, timeline: true },
  inspector: { financials: false, documents: 'view', tasks: 'assigned', team: false, weather: true, timeline: true },
  subcontractor: { financials: false, documents: 'view', tasks: 'assigned', team: false, weather: true, timeline: true },
  supplier: { financials: false, documents: 'view', tasks: 'assigned', team: false, weather: true, timeline: true },
  client: { financials: false, documents: 'view', tasks: 'view', team: false, weather: true, timeline: true },
  member: { financials: false, documents: 'view', tasks: 'assigned', team: false, weather: true, timeline: true },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300', icon: Clock },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle2 },
};

const BuildUnionWorkspace = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { subscription } = useSubscription();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<SavedProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute stats for quick overview
  const stats = useMemo(() => {
    const activeCount = projects.filter(p => p.status === 'active').length;
    const draftCount = projects.filter(p => p.status === 'draft').length;
    const totalTeamMembers = sharedProjects.length;
    return { activeCount, draftCount, totalTeamMembers };
  }, [projects, sharedProjects]);

  // Load projects from database
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const loadProjects = async () => {
      // Load own projects
      const { data: ownProjects, error: ownError } = await supabase
        .from("projects")
        .select("id, name, address, trade, status, description, created_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (ownError) {
        console.error("Error loading own projects:", ownError);
        toast.error("Failed to load projects");
      } else {
        setProjects(ownProjects || []);
      }

      // Load shared projects (projects where user is a team member)
      const { data: memberData, error: memberError } = await supabase
        .from("project_members")
        .select(`
          project_id,
          role,
          joined_at,
          projects!inner(
            id,
            name,
            address,
            trade,
            status,
            user_id,
            archived_at
          )
        `)
        .eq("user_id", user.id);

      if (memberError) {
        console.error("Error loading shared projects:", memberError);
      } else if (memberData) {
        // Filter out archived projects and get owner names
        const activeSharedProjects = memberData.filter(
          (m: any) => m.projects?.archived_at === null
        );

        // Get owner profiles
        const ownerIds = [...new Set(activeSharedProjects.map((m: any) => m.projects?.user_id).filter(Boolean))];
        
        let ownerProfiles: Record<string, string> = {};
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", ownerIds);
          
          if (profiles) {
            ownerProfiles = profiles.reduce((acc: Record<string, string>, p: any) => {
              acc[p.user_id] = p.full_name || "Unknown";
              return acc;
            }, {});
          }
        }

        const formatted: SharedProject[] = activeSharedProjects.map((m: any) => ({
          id: m.projects.id,
          name: m.projects.name,
          address: m.projects.address,
          trade: m.projects.trade,
          status: m.projects.status,
          role: m.role,
          owner_name: ownerProfiles[m.projects.user_id] || null,
          joined_at: m.joined_at,
        }));

        setSharedProjects(formatted);
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

  const hasSharedProjects = sharedProjects.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BuildUnionHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8 pb-28">
        <div className="max-w-4xl mx-auto">
          {/* Header with Amber accent */}
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                  Projects 3.0
                </h1>
                <p className="text-amber-700/70 dark:text-amber-400/70">
                  Smart workflow based on AI analysis
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Subscription Badge */}
                {subscription.subscribed && (
                  <Badge 
                    variant="outline" 
                    className="gap-1 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                  >
                    {subscription.tier === 'premium' ? <Crown className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                    {subscription.tier?.charAt(0).toUpperCase() + subscription.tier?.slice(1)}
                    {subscription.isTrialing && subscription.trialDaysRemaining && (
                      <span className="text-[10px] ml-1">({subscription.trialDaysRemaining}d trial)</span>
                    )}
                  </Badge>
                )}
                <Button 
                  onClick={handleNewProject} 
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 border-0"
                >
                  <Plus className="h-4 w-4" />
                  {t("workspace.newProject", "New Project")}
                </Button>
              </div>
            </div>
            
            {/* Quick Stats Bar */}
            {(projects.length > 0 || sharedProjects.length > 0) && (
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{stats.activeCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Drafts</p>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stats.draftCount}</p>
                  </div>
                </div>
                {stats.totalTeamMembers > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shared</p>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{stats.totalTeamMembers}</p>
                    </div>
                  </div>
                )}
                <div className="flex-1" />
                {!subscription.subscribed && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/buildunion/pricing')}
                    className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <Zap className="h-3 w-3" />
                    Upgrade
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Pending Invitations Panel */}
          <PendingInvitationsPanel />

          {/* Tabs for My Projects vs Shared with me */}
          {hasSharedProjects ? (
            <Tabs defaultValue="my-projects" className="w-full">
              <TabsList className="mb-6 bg-amber-100/50 dark:bg-amber-900/20">
                <TabsTrigger 
                  value="my-projects" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  My Projects ({projects.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="shared-with-me"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Shared with me ({sharedProjects.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-projects">
                {renderOwnProjects()}
              </TabsContent>

              <TabsContent value="shared-with-me">
                {renderSharedProjects()}
              </TabsContent>
            </Tabs>
          ) : (
            renderOwnProjects()
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

  function renderOwnProjects() {
    if (projects.length === 0) {
      return (
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
      );
    }

    return (
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
                  {(() => {
                    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Badge variant="outline" className={`gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  function renderSharedProjects() {
    return (
      <div className="grid gap-4">
        {sharedProjects.map((project) => {
          const perms = ROLE_PERMISSIONS[project.role] || ROLE_PERMISSIONS.member;
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-indigo-200/50 dark:border-indigo-800/30 hover:border-indigo-300 dark:hover:border-indigo-600 bg-gradient-to-r from-background via-indigo-50/10 to-background dark:from-background dark:via-indigo-950/10 dark:to-background group"
                onClick={() => navigate(`/buildunion/project/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {project.name}
                      </CardTitle>
                      {project.owner_name && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Owner: {project.owner_name}
                        </p>
                      )}
                    </div>
                    <Badge className={ROLE_COLORS[project.role] || ROLE_COLORS.member}>
                      {ROLE_LABELS[project.role] || project.role}
                    </Badge>
                  </div>
                  {project.address && (
                    <CardDescription className="flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3" />
                      {project.address}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {project.trade && (
                      <span className="text-indigo-600 dark:text-indigo-400">{project.trade}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
                      {project.status}
                    </span>
                  </div>
                  
                  {/* Permission Summary Icons */}
                  <TooltipProvider>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            perms.financials 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                              : 'bg-red-100/50 text-red-400 dark:bg-red-900/20 dark:text-red-500'
                          }`}>
                            <DollarSign className="h-2.5 w-2.5" />
                            {perms.financials ? 'Prices' : 'Hidden'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{perms.financials ? 'Financial data visible' : 'Financial data hidden for your role'}</p></TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            perms.documents === 'full' || perms.documents === 'upload'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-400'
                          }`}>
                            <FileText className="h-2.5 w-2.5" />
                            {perms.documents === 'full' ? 'Full' : perms.documents === 'upload' ? 'Upload' : 'View'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Documents: {perms.documents} access</p></TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            perms.tasks === 'all'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                            <ClipboardList className="h-2.5 w-2.5" />
                            {perms.tasks === 'all' ? 'All Tasks' : 'My Tasks'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{perms.tasks === 'all' ? 'Can see all project tasks' : 'Only assigned tasks visible'}</p></TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            perms.team
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' 
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-900/20 dark:text-slate-500'
                          }`}>
                            <Users className="h-2.5 w-2.5" />
                            {perms.team ? 'Team' : 'No Team'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{perms.team ? 'Team panel visible' : 'Team panel hidden'}</p></TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                            <Cloud className="h-2.5 w-2.5" />
                            Weather
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Weather data always available</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  }
};

export default BuildUnionWorkspace;