import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  ListTodo, 
  Sparkles, 
  Plus,
  Loader2,
  AlertTriangle,
  Lock,
  GanttChart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, getTeamLimit, getNextTier } from "@/hooks/useSubscription";
import { useProjectTeam } from "@/hooks/useProjectTeam";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import TeamManagement from "@/components/TeamManagement";
import TaskAssignment from "@/components/TaskAssignment";
import PhaseGanttChart from "./PhaseGanttChart";
import { ProBadge } from "@/components/ui/pro-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Material {
  item: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface Task {
  id: string;
  project_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_avatar?: string;
}

interface TeamTabProps {
  projectId: string;
  isOwner: boolean;
  projectAddress?: string;
  aiMaterials?: Material[];
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  forceCalendarView?: boolean;
  onCalendarViewActivated?: () => void;
  existingTaskCount?: number;
  isSoloMode?: boolean;
  permissions?: {
    canCreateTasks: boolean;
    canAssignTasks: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
  };
}

// Map materials to task titles
const materialToTaskTitle = (material: Material): string => {
  const itemLower = material.item.toLowerCase();
  
  if (itemLower.includes("paint")) return `Paint application - ${material.item}`;
  if (itemLower.includes("drywall") || itemLower.includes("gypsum")) return `Drywall installation`;
  if (itemLower.includes("floor") || itemLower.includes("tile")) return `Flooring installation - ${material.item}`;
  if (itemLower.includes("plywood") || itemLower.includes("wood")) return `Wood/framing work - ${material.item}`;
  if (itemLower.includes("insulation")) return `Insulation installation`;
  if (itemLower.includes("electrical") || itemLower.includes("wire")) return `Electrical work`;
  if (itemLower.includes("plumbing") || itemLower.includes("pipe")) return `Plumbing work`;
  if (itemLower.includes("concrete") || itemLower.includes("cement")) return `Concrete work`;
  if (itemLower.includes("roofing") || itemLower.includes("shingle")) return `Roofing work`;
  
  return `Install/Apply ${material.item}`;
};

// Map materials to task descriptions
const materialToTaskDescription = (material: Material): string => {
  return `${material.quantity} ${material.unit} of ${material.item}${material.notes ? ` - ${material.notes}` : ""}`;
};

const TeamTab = ({ projectId, isOwner, projectAddress, aiMaterials = [], projectStartDate, projectEndDate, forceCalendarView, onCalendarViewActivated, existingTaskCount = 0, isSoloMode = false, permissions }: TeamTabProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, isDevOverride } = useSubscription();
  const { members, loading: membersLoading } = useProjectTeam(projectId);
  const [activeSubTab, setActiveSubTab] = useState<"team" | "tasks" | "gantt">("team");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [generateTasksDialogOpen, setGenerateTasksDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [editTaskFromGantt, setEditTaskFromGantt] = useState<Task | null>(null);

  // Fetch tasks for Gantt chart
  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    setTasksLoading(true);
    try {
      const { data: tasksData, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with member names
      const membersWithProfiles = await Promise.all(
        (members || []).map(async (member) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", member.user_id)
            .maybeSingle();
          return { ...member, full_name: profile?.full_name, avatar_url: profile?.avatar_url };
        })
      );

      const enrichedTasks = (tasksData || []).map((task) => {
        const assignee = membersWithProfiles.find((m) => m.user_id === task.assigned_to);
        return {
          ...task,
          assignee_name: assignee?.full_name || "Unknown",
          assignee_avatar: assignee?.avatar_url,
        };
      });

      setTasks(enrichedTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setTasksLoading(false);
    }
  }, [projectId, members]);

  // Fetch tasks when tab is gantt or on mount
  useEffect(() => {
    if (activeSubTab === "gantt" || !tasksLoading) {
      fetchTasks();
    }
  }, [activeSubTab, fetchTasks]);

  // Realtime subscription for tasks
  useEffect(() => {
    const channel = supabase
      .channel(`team_tab_tasks_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchTasks]);

  // Auto-switch to tasks tab when forceCalendarView is triggered
  useEffect(() => {
    if (forceCalendarView) {
      setActiveSubTab("tasks");
    }
  }, [forceCalendarView]);

  // Handle task click from Gantt - switch to tasks tab with edit
  const handleGanttTaskClick = (task: Task) => {
    setEditTaskFromGantt(task);
    setActiveSubTab("tasks");
  };
  const handleMemberClick = (memberId: string, memberName: string) => {
    setSelectedMemberId(memberId);
    setActiveSubTab("tasks");
    toast.info(`${memberName}'s tasks`);
  };

  // Clear member filter
  const handleClearMemberFilter = () => {
    setSelectedMemberId(null);
  };

  // Check subscription tier
  const currentTier = subscription?.tier || "free";
  const isPro = isDevOverride || currentTier === "pro" || currentTier === "premium" || currentTier === "enterprise";
  const isPremium = isDevOverride || currentTier === "premium" || currentTier === "enterprise";
  
  // Team limits
  const teamLimit = getTeamLimit(currentTier);
  const spotsUsed = members.length;
  const spotsRemaining = teamLimit === Infinity ? Infinity : Math.max(0, teamLimit - spotsUsed);
  const nextTier = getNextTier(currentTier);

  // Check if user can create tasks
  const canCreateTasks = permissions?.canCreateTasks ?? isOwner;

  // Generate tasks from AI materials
  const handleGenerateTasksFromMaterials = async () => {
    if (!user || (!canCreateTasks) || members.length === 0) {
      toast.error(t("tasks.addMembersFirst", "Add team members first"));
      return;
    }

    if (aiMaterials.length === 0) {
      toast.error(t("tasks.noMaterials", "No AI-detected materials to generate tasks from"));
      return;
    }

    setIsGeneratingTasks(true);
    try {
      // Calculate the project duration in days
      const startDate = projectStartDate || new Date();
      const endDate = projectEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
      const totalDurationMs = endDate.getTime() - startDate.getTime();
      const totalDays = Math.max(1, Math.ceil(totalDurationMs / (24 * 60 * 60 * 1000)));
      
      // Distribute tasks across the timeline based on their phase
      // Phase distribution: Preparation 40%, Execution 40%, Verification 20%
      const getPhaseForMaterial = (material: Material): "prep" | "exec" | "verify" => {
        const itemLower = material.item.toLowerCase();
        // Preparation phase items
        if (itemLower.includes("order") || itemLower.includes("deliver") || 
            itemLower.includes("permit") || itemLower.includes("plan")) {
          return "prep";
        }
        // Verification phase items
        if (itemLower.includes("inspect") || itemLower.includes("verify") || 
            itemLower.includes("test") || itemLower.includes("final")) {
          return "verify";
        }
        // Everything else is execution
        return "exec";
      };
      
      // Calculate due date based on phase and position
      const calculateDueDate = (index: number, phase: "prep" | "exec" | "verify"): Date => {
        const prepDuration = totalDays * 0.4;
        const execDuration = totalDays * 0.4;
        // const verifyDuration = totalDays * 0.2;
        
        let phaseStart: number;
        let phaseDuration: number;
        
        if (phase === "prep") {
          phaseStart = 0;
          phaseDuration = prepDuration;
        } else if (phase === "exec") {
          phaseStart = prepDuration;
          phaseDuration = execDuration;
        } else {
          phaseStart = prepDuration + execDuration;
          phaseDuration = totalDays * 0.2;
        }
        
        // Distribute within the phase
        const positionInPhase = (index % 3) / 3; // Simple distribution
        const dayOffset = Math.floor(phaseStart + (phaseDuration * positionInPhase));
        
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + dayOffset);
        return dueDate;
      };
      
      // Calculate priority based on how soon the due date is
      const calculatePriority = (dueDate: Date): string => {
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        if (daysUntilDue <= 1) return "urgent";
        if (daysUntilDue <= 2) return "high";
        if (daysUntilDue <= 4) return "medium";
        return "low";
      };
      
      // Create tasks from materials with timeline-aware due dates
      const tasks = aiMaterials.map((material, index) => {
        const phase = getPhaseForMaterial(material);
        const dueDate = calculateDueDate(index, phase);
        const priority = calculatePriority(dueDate);
        
        return {
          project_id: projectId,
          title: materialToTaskTitle(material),
          description: materialToTaskDescription(material),
          assigned_to: members[index % members.length].user_id, // Round-robin assignment
          assigned_by: user.id,
          priority,
          status: "pending",
          due_date: dueDate.toISOString(),
        };
      });

      const { error } = await supabase
        .from("project_tasks")
        .insert(tasks);

      if (error) throw error;

      toast.success(t("tasks.generatedSuccess", `Generated ${tasks.length} tasks from AI materials`));
      setGenerateTasksDialogOpen(false);
      setActiveSubTab("tasks");
    } catch (error: any) {
      console.error("Error generating tasks:", error);
      toast.error(error.message || t("tasks.generateError", "Failed to generate tasks"));
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  // Show locked state for non-Pro users (only for Team features, not Tasks in Solo mode)
  if (!isPro && !isSoloMode) {
    return (
      <Card className="border-dashed border-amber-300 dark:border-amber-700">
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto text-amber-500/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("team.proFeature", "Team Mode is a Pro Feature")}</h3>
          <p className="text-muted-foreground mb-4">
            {t("team.upgradeToUnlock", "Upgrade to Pro to invite team members and coordinate your project")}
          </p>
          <ProBadge tier="pro" size="md" />
        </CardContent>
      </Card>
    );
  }

  // Solo mode - show only Tasks without team management
  if (isSoloMode) {
    return (
      <div className="space-y-4">
        {/* Solo Mode Task Header */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">{t("tasks.projectTasks", "Project Tasks")}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className="bg-background border-amber-300 text-amber-600"
                >
                  {t("projects.soloMode", "Solo Mode")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Only - No Team Management in Solo Mode */}
        <TaskAssignment 
          projectId={projectId} 
          isOwner={isOwner}
          projectAddress={projectAddress}
          forceCalendarView={forceCalendarView}
          onCalendarViewActivated={onCalendarViewActivated}
          isSoloMode={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Stats Header */}
      <Card className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-cyan-200 dark:border-cyan-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-600" />
                <span className="font-medium">{t("team.members", "Team Members")}</span>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "bg-background",
                  spotsRemaining === 0 
                    ? "border-red-300 text-red-600" 
                    : "border-cyan-300 text-cyan-600"
                )}
              >
                {teamLimit === Infinity 
                  ? `${spotsUsed} members` 
                  : `${spotsUsed}/${teamLimit} slots`
                }
              </Badge>
              {spotsRemaining === 0 && nextTier && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    {t("team.limitReached", "Limit reached")}
                  </span>
                  <ProBadge tier={nextTier as "pro" | "premium"} size="sm" />
                </div>
              )}
            </div>

            {/* AI Task Generation Button */}
            {isOwner && aiMaterials.length > 0 && members.length > 0 && existingTaskCount === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGenerateTasksDialogOpen(true)}
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <Sparkles className="h-4 w-4" />
                {t("tasks.generateFromAI", "Generate Tasks from AI")}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {aiMaterials.length}
                </Badge>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs for Team, Tasks, and Gantt */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as "team" | "tasks" | "gantt")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden xs:inline">{t("team.manageTeam", "Team")}</span>
            <span className="xs:hidden">Team</span>
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline-flex">
                {members.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm">
            <ListTodo className="h-4 w-4" />
            <span className="hidden xs:inline">{t("team.tasks", "Tasks")}</span>
            <span className="xs:hidden">Tasks</span>
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs hidden sm:inline-flex">
                {tasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5 text-xs sm:text-sm">
            <GanttChart className="h-4 w-4" />
            <span className="hidden xs:inline">{t("team.gantt", "Gantt")}</span>
            <span className="xs:hidden">Gantt</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <TeamManagement 
            projectId={projectId} 
            isOwner={isOwner} 
            onMemberClick={handleMemberClick}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TaskAssignment 
            projectId={projectId} 
            isOwner={isOwner}
            projectAddress={projectAddress}
            filterByMemberId={selectedMemberId}
            onClearFilter={handleClearMemberFilter}
            forceCalendarView={forceCalendarView}
            onCalendarViewActivated={onCalendarViewActivated}
            initialEditTaskId={editTaskFromGantt?.id}
            onEditTaskHandled={() => setEditTaskFromGantt(null)}
          />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          {tasksLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <PhaseGanttChart
              tasks={tasks}
              onTaskClick={handleGanttTaskClick}
              projectStartDate={projectStartDate}
              projectEndDate={projectEndDate}
              onTasksUpdated={fetchTasks}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Tasks Dialog */}
      <Dialog open={generateTasksDialogOpen} onOpenChange={setGenerateTasksDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {t("tasks.generateFromMaterials", "Generate Tasks from AI Materials")}
            </DialogTitle>
            <DialogDescription>
              {t("tasks.generateDescription", "The AI has detected materials for this project. Generate initial tasks based on these materials and assign them to your team members.")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="text-sm font-medium mb-2">{t("tasks.detectedMaterials", "Detected Materials")}:</div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {aiMaterials.map((material, index) => (
                <div key={index} className="p-2 rounded-lg bg-muted/50 border border-border text-sm">
                  <div className="font-medium truncate">{material.item}</div>
                  <div className="text-xs text-muted-foreground">
                    {material.quantity} {material.unit}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {t("tasks.willAssignTo", "Tasks will be distributed among")} <strong>{members.length}</strong> {t("tasks.teamMembers", "team member(s)")}.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateTasksDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button 
              onClick={handleGenerateTasksFromMaterials}
              disabled={isGeneratingTasks}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {isGeneratingTasks ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("tasks.generate", "Generate")} {aiMaterials.length} {t("tasks.tasksLower", "Tasks")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamTab;
