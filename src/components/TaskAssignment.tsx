import { useState, useEffect, useMemo, useCallback } from "react";
import { format, differenceInDays, isPast, isToday, isTomorrow, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  ListTodo, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  CalendarIcon,
  Flag,
  User,
  Pencil,
  Trash2,
  PlayCircle,
  Circle,
  AlertTriangle,
  Bell,
  CalendarDays,
  List,
  UserPlus,
  X,
  ArrowLeft,
  ClipboardCheck,
  Wrench,
  Lock,
  ChevronDown,
  ChevronRight,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import CompactGanttChart from "./CompactGanttChart";
import TaskTemplateManager from "./projects2/TaskTemplateManager";

interface TaskAssignmentProps {
  projectId: string;
  isOwner: boolean;
  projectAddress?: string;
  filterByMemberId?: string | null;
  onClearFilter?: () => void;
  forceCalendarView?: boolean;
  onCalendarViewActivated?: () => void;
  isSoloMode?: boolean;
  initialEditTaskId?: string;
  onEditTaskHandled?: () => void;
}

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
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

const PRIORITIES = [
  { value: "low", label: "Low", color: "text-slate-600 bg-slate-100 border-slate-200" },
  { value: "medium", label: "Medium", color: "text-amber-600 bg-amber-100 border-amber-200" },
  { value: "high", label: "High", color: "text-orange-600 bg-orange-100 border-orange-200" },
  { value: "urgent", label: "Urgent", color: "text-red-600 bg-red-100 border-red-200" },
];

const STATUSES = [
  { value: "pending", label: "Pending", icon: Circle, color: "text-slate-600" },
  { value: "in_progress", label: "In Progress", icon: PlayCircle, color: "text-blue-600" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-green-600" },
];

const TaskAssignment = ({ projectId, isOwner, projectAddress, filterByMemberId, onClearFilter, forceCalendarView, onCalendarViewActivated, isSoloMode = false, initialEditTaskId, onEditTaskHandled }: TaskAssignmentProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    preparation: true,
    execution: true,
    verification: false,
  });

  // Handle initial edit task from Gantt chart
  useEffect(() => {
    if (initialEditTaskId && tasks.length > 0) {
      const taskToEdit = tasks.find(t => t.id === initialEditTaskId);
      if (taskToEdit) {
        setEditingTask(taskToEdit);
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || "");
        setAssignedTo(taskToEdit.assigned_to);
        setPriority(taskToEdit.priority);
        setDueDate(taskToEdit.due_date ? new Date(taskToEdit.due_date) : undefined);
        setDialogOpen(true);
        onEditTaskHandled?.();
      }
    }
  }, [initialEditTaskId, tasks, onEditTaskHandled]);


  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch tasks and members - defined as useCallback so it can be called from offline sync
  const fetchData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from("project_members")
        .select("id, user_id, role")
        .eq("project_id", projectId);

      if (membersError) throw membersError;

      // Get profile info for each member
      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", member.user_id)
            .maybeSingle();

          return {
            ...member,
            full_name: profile?.full_name || "Team Member",
            avatar_url: profile?.avatar_url,
          };
        })
      );

      setMembers(membersWithProfiles);

      // Enrich tasks with assignee info
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
      console.error("Error fetching task data:", err);
      toast.error(t("tasks.loadError", "Failed to load tasks"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  // Offline sync hook
  const { online, pendingCount, isSyncing, queueTaskUpdate, syncAllPending } = useOfflineSync({
    projectId,
    onSyncComplete: fetchData,
  });

  // Handle force calendar view from parent (e.g., from Operational Truth reschedule button)
  useEffect(() => {
    if (forceCalendarView) {
      setViewMode("calendar");
      onCalendarViewActivated?.();
    }
  }, [forceCalendarView, onCalendarViewActivated]);

  // Initial data fetch and realtime subscription
  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates (only when online)
    const channel = supabase
      .channel(`project_tasks_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          if (online) {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchData, online]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("medium");
    setDueDate(undefined);
    setEditingTask(null);
    setCalendarOpen(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setAssignedTo(task.assigned_to);
    setPriority(task.priority);
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!title.trim() || !assignedTo) {
      toast.error(t("tasks.fillRequired", "Please fill in title and assign to a member"));
      return;
    }

    setSaving(true);
    try {
      const taskData = {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo,
        assigned_by: user?.id || "",
        priority,
        due_date: dueDate ? dueDate.toISOString() : null,
      };

      if (editingTask) {
        // Try offline queue first
        const handledOffline = await queueTaskUpdate(editingTask.id, "update", taskData);
        
        if (!handledOffline) {
          // Online - do the update directly
          const { error } = await supabase
            .from("project_tasks")
            .update(taskData)
            .eq("id", editingTask.id);

          if (error) throw error;
          toast.success(t("tasks.updated", "Task updated"));
        } else {
          // Optimistically update local state
          setTasks(prev => prev.map(t => 
            t.id === editingTask.id ? { ...t, ...taskData } : t
          ));
        }
      } else {
        // For new tasks, we need a temporary ID for offline mode
        const tempId = crypto.randomUUID();
        const handledOffline = await queueTaskUpdate(tempId, "create", taskData);
        
        if (!handledOffline) {
          // Online - insert directly
          const { error } = await supabase
            .from("project_tasks")
            .insert(taskData);

          if (error) throw error;
          toast.success(t("tasks.created", "Task created"));
        } else {
          // Optimistically add to local state
          const newTask: Task = {
            id: tempId,
            ...taskData,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee_name: members.find(m => m.user_id === assignedTo)?.full_name || "Unknown",
            assignee_avatar: members.find(m => m.user_id === assignedTo)?.avatar_url,
          };
          setTasks(prev => [newTask, ...prev]);
        }
      }

      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || t("tasks.saveFailed", "Failed to save task"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t("tasks.deleteConfirm", "Delete this task?"))) return;

    try {
      // Try offline queue first
      const handledOffline = await queueTaskUpdate(taskId, "delete", {});
      
      if (!handledOffline) {
        // Online - delete directly
        const { error } = await supabase
          .from("project_tasks")
          .delete()
          .eq("id", taskId);

        if (error) throw error;
        toast.success(t("tasks.deleted", "Task deleted"));
      } else {
        // Optimistically remove from local state
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (err: any) {
      toast.error(err.message || t("tasks.deleteFailed", "Failed to delete task"));
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      // Try offline queue first
      const handledOffline = await queueTaskUpdate(taskId, "complete", { status: newStatus });
      
      if (!handledOffline) {
        // Online - update directly
        const { error } = await supabase
          .from("project_tasks")
          .update({ status: newStatus })
          .eq("id", taskId);

        if (error) throw error;
        toast.success(t("tasks.statusUpdated", "Status updated"));
      } else {
        // Optimistically update local state
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
        ));
      }
    } catch (err: any) {
      toast.error(err.message || t("tasks.statusFailed", "Failed to update status"));
    }
  };

  // Handle applying template tasks
  const handleApplyTemplate = async (templateTasks: Omit<Task, "id">[]) => {
    if (!user) return;

    try {
      // In solo mode (no members), assign all tasks to the current user
      const assignees = members.length > 0 ? members : [{ user_id: user.id }];
      
      const tasksToInsert = templateTasks.map((t, index) => ({
        project_id: projectId,
        title: t.title,
        description: t.description,
        assigned_to: assignees[index % assignees.length].user_id, // Round-robin or self
        assigned_by: user.id,
        priority: t.priority,
        status: "pending",
        due_date: null,
      }));

      const { error } = await supabase
        .from("project_tasks")
        .insert(tasksToInsert);

      if (error) throw error;
      toast.success(t("tasks.templateApplied", `Applied ${templateTasks.length} tasks from template`));
    } catch (err: any) {
      console.error("Error applying template:", err);
      toast.error(err.message || t("tasks.templateFailed", "Failed to apply template"));
    }
  };

  const handleUpdateAssignee = async (taskId: string, newAssigneeId: string) => {
    try {
      // Try offline queue first
      const handledOffline = await queueTaskUpdate(taskId, "update", { assigned_to: newAssigneeId });
      
      if (!handledOffline) {
        // Online - update directly
        const { error } = await supabase
          .from("project_tasks")
          .update({ assigned_to: newAssigneeId })
          .eq("id", taskId);

        if (error) throw error;
        
        const member = members.find(m => m.user_id === newAssigneeId);
        toast.success(t("tasks.assigned", `Task assigned to ${member?.full_name || 'team member'}`));
      } else {
        // Optimistically update local state
        const member = members.find(m => m.user_id === newAssigneeId);
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, assigned_to: newAssigneeId, assignee_name: member?.full_name || "Unknown", assignee_avatar: member?.avatar_url } 
            : t
        ));
      }
    } catch (err: any) {
      toast.error(err.message || t("tasks.assignFailed", "Failed to update assignee"));
    }
  };

  const getPriorityBadge = (priorityValue: string) => {
    const p = PRIORITIES.find((pr) => pr.value === priorityValue) || PRIORITIES[1];
    return (
      <Badge variant="outline" className={`text-xs ${p.color}`}>
        <Flag className="h-3 w-3 mr-1" />
        {p.label}
      </Badge>
    );
  };

  const getStatusInfo = (statusValue: string) => {
    return STATUSES.find((s) => s.value === statusValue) || STATUSES[0];
  };

  // Helper function - must be before useMemo
  // Categorizes tasks into phases based on title keywords
  const getPhaseForTask = (task: Task): "preparation" | "execution" | "verification" => {
    const titleLower = task.title.toLowerCase();
    const descLower = (task.description || "").toLowerCase();
    const combined = titleLower + " " + descLower;
    
    // Preparation phase - ordering, planning, measuring, setup tasks
    if (combined.includes("order") || combined.includes("deliver") || combined.includes("measure") || 
        combined.includes("prep") || combined.includes("plan") || combined.includes("schedule") ||
        combined.includes("permit") || combined.includes("survey") || combined.includes("quote") ||
        combined.includes("buy") || combined.includes("purchase") || combined.includes("setup") ||
        combined.includes("protect") || combined.includes("tape") || combined.includes("drop cloth") ||
        combined.includes("primer") || combined.includes("sand")) {
      return "preparation";
    }
    
    // Verification phase - inspection, testing, cleanup, final touches
    if (combined.includes("inspect") || combined.includes("verify") || combined.includes("test") ||
        combined.includes("final") || combined.includes("clean") || combined.includes("review") ||
        combined.includes("check") || combined.includes("approve") || combined.includes("sign off") ||
        combined.includes("touch up") || combined.includes("punch list")) {
      return "verification";
    }
    
    // Everything else is execution (install, apply, paint, lay, cut, build, etc.)
    return "execution";
  };

  // Filter tasks by member if selected - moved before useMemo
  const filteredTasks = filterByMemberId 
    ? tasks.filter(t => t.assigned_to === filterByMemberId)
    : tasks;

  const filteredMemberInfo = filterByMemberId 
    ? members.find(m => m.user_id === filterByMemberId)
    : null;

  // Memoize phase calculations - MUST be before loading return
  const phaseData = useMemo(() => {
    const preparation = filteredTasks.filter(t => getPhaseForTask(t) === "preparation");
    const execution = filteredTasks.filter(t => getPhaseForTask(t) === "execution");
    const verification = filteredTasks.filter(t => getPhaseForTask(t) === "verification");

    const calcProgress = (tasks: Task[]) => {
      if (tasks.length === 0) return 0;
      return Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100);
    };

    return {
      preparation: { tasks: preparation, progress: calcProgress(preparation) },
      execution: { tasks: execution, progress: calcProgress(execution) },
      verification: { tasks: verification, progress: calcProgress(verification) },
    };
  }, [filteredTasks, filterByMemberId, tasks]);

  // Calculate if phases are locked
  const isExecutionLocked = phaseData.preparation.progress < 100;
  const isVerificationLocked = phaseData.execution.progress < 100;

  const pendingTasks = filteredTasks.filter((t) => t.status === "pending");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");
  const overdueTasks = filteredTasks.filter((t) => 
    t.due_date && 
    isPast(startOfDay(new Date(t.due_date))) && 
    !isToday(new Date(t.due_date)) &&
    t.status !== "completed"
  );

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }


  // Helper to get due date display info
  const getDueDateInfo = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    const date = new Date(dueDateStr);
    const today = startOfDay(new Date());
    const dueDay = startOfDay(date);
    const daysUntil = differenceInDays(dueDay, today);
    
    if (isToday(date)) return { label: "Due today", color: "text-amber-600", urgent: true };
    if (isTomorrow(date)) return { label: "Due tomorrow", color: "text-blue-600", urgent: false };
    if (isPast(dueDay)) return { label: `${Math.abs(daysUntil)} days overdue`, color: "text-red-600", urgent: true };
    if (daysUntil <= 3) return { label: `${daysUntil} days left`, color: "text-amber-600", urgent: false };
    if (daysUntil <= 7) return { label: `${daysUntil} days left`, color: "text-slate-600", urgent: false };
    return { label: format(date, "MMM d"), color: "text-slate-500", urgent: false };
  };

  return (
    <>
      {/* Member Filter Banner */}
      {filterByMemberId && filteredMemberInfo && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={filteredMemberInfo.avatar_url || undefined} />
              <AvatarFallback className="bg-amber-100 text-amber-700 font-medium text-sm">
                {(filteredMemberInfo.full_name || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-amber-900">
                {filteredMemberInfo.full_name}'s Tasks
              </p>
              <p className="text-xs text-amber-700">
                {filteredTasks.length} tasks • {pendingTasks.length} in progress
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilter}
            className="gap-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
          >
            <ArrowLeft className="h-4 w-4" />
            All Tasks
          </Button>
        </div>
      )}

      {/* Offline Status Banner */}
      {(!online || pendingCount > 0) && (
        <div className={cn(
          "mb-4 flex items-center justify-between rounded-lg p-3 border",
          !online 
            ? "bg-amber-50 border-amber-200" 
            : "bg-blue-50 border-blue-200"
        )}>
          <div className="flex items-center gap-2">
            {!online ? (
              <>
                <WifiOff className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {t("offline.workingOffline", "Working offline")}
                </span>
              </>
            ) : (
              <>
                <RefreshCw className={cn("h-4 w-4 text-blue-600", isSyncing && "animate-spin")} />
                <span className="text-sm font-medium text-blue-800">
                  {pendingCount} {t("offline.pendingChanges", "pending changes")}
                </span>
              </>
            )}
          </div>
          {online && pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={syncAllPending}
              disabled={isSyncing}
              className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
              {t("offline.syncNow", "Sync now")}
            </Button>
          )}
        </div>
      )}

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          {/* Header row - stacks on mobile */}
          <div className="flex flex-col gap-3">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                  <ListTodo className="h-5 w-5 text-amber-600 shrink-0" />
                  <span className="truncate">
                    {filterByMemberId ? `${filteredMemberInfo?.full_name || "Member"} ${t("tasks.tasks", "Tasks")}` : t("tasks.tasks", "Tasks")}
                  </span>
                  {!online && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                      <WifiOff className="h-3 w-3 mr-1" />
                      {t("offline.offline", "Offline")}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  {filteredTasks.length} {t("tasks.task", "task")}{filteredTasks.length !== 1 ? "s" : ""} 
                  {inProgressTasks.length > 0 && ` • ${inProgressTasks.length} ${t("tasks.inProgress", "in progress")}`}
                </CardDescription>
              </div>
              
              {/* Add Task button - always visible in header on mobile */}
              {isOwner && (members.length > 0 || isSoloMode) && (
                <Button
                  size="sm"
                  className="gap-1 bg-amber-600 hover:bg-amber-700 shrink-0"
                  onClick={openCreateDialog}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">Add Task</span>
                </Button>
              )}
            </div>
            
            {/* Controls row - scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              {/* View Toggle */}
              {filteredTasks.length > 0 && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2 sm:px-2.5 text-xs gap-1 sm:gap-1.5 rounded-md transition-colors",
                      viewMode === "list"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">List</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2 sm:px-2.5 text-xs gap-1 sm:gap-1.5 rounded-md transition-colors",
                      viewMode === "calendar"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                    onClick={() => setViewMode("calendar")}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Timeline</span>
                  </Button>
                </div>
              )}
              {isOwner && (members.length > 0 || isSoloMode) && (
                <TaskTemplateManager
                  projectId={projectId}
                  currentTasks={tasks}
                  onApplyTemplate={handleApplyTemplate}
                  isOwner={isOwner}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 && !isSoloMode ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <User className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>Add team members first</p>
              <p className="text-xs mt-1">You can assign tasks after adding members</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <ListTodo className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No tasks yet</p>
              {isOwner && <p className="text-xs mt-1">{isSoloMode ? "Use templates or add tasks manually" : "Create tasks for your team"}</p>}
            </div>
          ) : viewMode === "calendar" ? (
            <CompactGanttChart
              tasks={tasks}
              isOwner={isOwner}
              onTaskClick={(task) => openEditDialog(task)}
              projectAddress={projectAddress}
            />
          ) : (
            <div className="space-y-4">
              {/* Overdue Alert Banner */}
              {overdueTasks.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800">
                      {overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-red-600">
                      These tasks require immediate attention
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                    <Bell className="h-3 w-3 mr-1" />
                    Action Required
                  </Badge>
                </div>
              )}

              {/* Phase-based Task Groups */}
              {/* Preparation Phase */}
              <PhaseSection
                phaseId="preparation"
                phaseName="Preparation"
                phaseIcon={<ClipboardCheck className="h-4 w-4" />}
                phaseColor="blue"
                tasks={phaseData.preparation.tasks}
                progress={phaseData.preparation.progress}
                isLocked={false}
                lockReason=""
                isExpanded={expandedPhases.preparation}
                onToggle={() => setExpandedPhases(prev => ({ ...prev, preparation: !prev.preparation }))}
                isOwner={isOwner}
                members={members}
                onEdit={openEditDialog}
                onDelete={handleDeleteTask}
                onStatusChange={handleUpdateStatus}
                onAssigneeChange={handleUpdateAssignee}
                getPriorityBadge={getPriorityBadge}
                getStatusInfo={getStatusInfo}
                getDueDateInfo={getDueDateInfo}
              />

              {/* Execution Phase */}
              <PhaseSection
                phaseId="execution"
                phaseName="Execution"
                phaseIcon={<Wrench className="h-4 w-4" />}
                phaseColor="amber"
                tasks={phaseData.execution.tasks}
                progress={phaseData.execution.progress}
                isLocked={isExecutionLocked}
                lockReason={`Previous phase verification not complete (${phaseData.preparation.progress}%)`}
                isExpanded={expandedPhases.execution}
                onToggle={() => setExpandedPhases(prev => ({ ...prev, execution: !prev.execution }))}
                isOwner={isOwner}
                members={members}
                onEdit={openEditDialog}
                onDelete={handleDeleteTask}
                onStatusChange={handleUpdateStatus}
                onAssigneeChange={handleUpdateAssignee}
                getPriorityBadge={getPriorityBadge}
                getStatusInfo={getStatusInfo}
                getDueDateInfo={getDueDateInfo}
              />

              {/* Verification Phase */}
              <PhaseSection
                phaseId="verification"
                phaseName="Verification"
                phaseIcon={<CheckCircle2 className="h-4 w-4" />}
                phaseColor="green"
                tasks={phaseData.verification.tasks}
                progress={phaseData.verification.progress}
                isLocked={isVerificationLocked}
                lockReason={`Previous phase verification not complete (${phaseData.execution.progress}%)`}
                isExpanded={expandedPhases.verification}
                onToggle={() => setExpandedPhases(prev => ({ ...prev, verification: !prev.verification }))}
                isOwner={isOwner}
                members={members}
                onEdit={openEditDialog}
                onDelete={handleDeleteTask}
                onStatusChange={handleUpdateStatus}
                onAssigneeChange={handleUpdateAssignee}
                getPriorityBadge={getPriorityBadge}
                getStatusInfo={getStatusInfo}
                getDueDateInfo={getDueDateInfo}
              />

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs pt-3 border-t">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Preparation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Execution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Verification</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Dependency Lock</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
            <DialogDescription>
              Assign a task to a team member with priority and deadline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Task details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign To *</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(member.full_name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <Flag className={`h-3 w-3 ${p.color.split(" ")[0]}`} />
                          <span>{p.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < startOfDay(new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-slate-500 h-6 px-2"
                  onClick={() => setDueDate(undefined)}
                >
                  Clear date
                </Button>
              )}
            </div>

            <Button
              onClick={handleSaveTask}
              disabled={saving || !title.trim() || !assignedTo}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : editingTask ? (
                <Pencil className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Task Item Component
interface DueDateInfo {
  label: string;
  color: string;
  urgent: boolean;
}

interface TaskItemProps {
  task: Task;
  isOwner: boolean;
  members: TeamMember[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onAssigneeChange: (newAssigneeId: string) => void;
  getPriorityBadge: (priority: string) => JSX.Element;
  getStatusInfo: (status: string) => { value: string; label: string; icon: any; color: string };
  getDueDateInfo?: (dueDateStr: string | null) => DueDateInfo | null;
  isLocked?: boolean;
}

const TaskItem = ({ task, isOwner, members, onEdit, onDelete, onStatusChange, onAssigneeChange, getPriorityBadge, getStatusInfo, getDueDateInfo, isLocked = false }: TaskItemProps) => {
  const statusInfo = getStatusInfo(task.status);
  const StatusIcon = statusInfo.icon;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
  const dueDateInfo = getDueDateInfo ? getDueDateInfo(task.due_date) : null;
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      task.status === "completed" ? "bg-slate-50 opacity-75" : "bg-white hover:bg-slate-50",
      isOverdue ? "border-red-200" : "border-slate-200"
    )}>
      {/* Main row: Status icon + Title + Actions */}
      <div className="flex items-start gap-3">
        {/* Status Icon - fixed width */}
        <div className="flex-shrink-0 pt-0.5">
          {isLocked ? (
            <div className="h-6 w-6 flex items-center justify-center" title="Complete previous phase first">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <Select value={task.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                      <span>{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Task Content - flexible, takes remaining space */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className={cn(
            "text-sm font-medium break-words",
            task.status === "completed" ? "line-through text-slate-500" : "text-slate-900"
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 break-words line-clamp-2">{task.description}</p>
          )}
        </div>

        {/* Action Buttons - fixed, never shrinks */}
        {isOwner && !isLocked && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-amber-600"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Metadata row - wraps on mobile */}
      <div className="flex items-center gap-2 mt-2 ml-9 flex-wrap">
        {getPriorityBadge(task.priority)}
        
        {/* Assignee with reassign popover */}
        <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
          <PopoverTrigger asChild>
            <button 
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 transition-colors group"
              disabled={!isOwner}
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={task.assignee_avatar || undefined} />
                <AvatarFallback className="text-[8px]">
                  {(task.assignee_name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate">{task.assignee_name}</span>
              {isOwner && members.length > 1 && (
                <UserPlus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
              )}
            </button>
          </PopoverTrigger>
          {isOwner && members.length > 0 && (
            <PopoverContent className="w-56 p-2" align="start">
              <p className="text-xs font-medium text-slate-500 mb-2 px-2">Reassign to:</p>
              <div className="space-y-1">
                {members.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => {
                      onAssigneeChange(member.user_id);
                      setAssignPopoverOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-md text-sm transition-colors",
                      task.assigned_to === member.user_id 
                        ? "bg-amber-100 text-amber-800" 
                        : "hover:bg-slate-100"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(member.full_name || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{member.full_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                    </div>
                    {task.assigned_to === member.user_id && (
                      <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>
        
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${dueDateInfo?.color || (isOverdue ? "text-red-600" : "text-slate-500")}`}>
            {isOverdue || dueDateInfo?.urgent ? <AlertCircle className="h-3 w-3 shrink-0" /> : <CalendarIcon className="h-3 w-3 shrink-0" />}
            <span className="whitespace-nowrap">{dueDateInfo?.label || new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Phase Section Component
interface PhaseSectionProps {
  phaseId: string;
  phaseName: string;
  phaseIcon: React.ReactNode;
  phaseColor: "blue" | "amber" | "green";
  tasks: Task[];
  progress: number;
  isLocked: boolean;
  lockReason: string;
  isExpanded: boolean;
  onToggle: () => void;
  isOwner: boolean;
  members: TeamMember[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onAssigneeChange: (taskId: string, assigneeId: string) => void;
  getPriorityBadge: (priority: string) => JSX.Element;
  getStatusInfo: (status: string) => { value: string; label: string; icon: any; color: string };
  getDueDateInfo?: (dueDateStr: string | null) => DueDateInfo | null;
}

const PhaseSection = ({
  phaseId,
  phaseName,
  phaseIcon,
  phaseColor,
  tasks,
  progress,
  isLocked,
  lockReason,
  isExpanded,
  onToggle,
  isOwner,
  members,
  onEdit,
  onDelete,
  onStatusChange,
  onAssigneeChange,
  getPriorityBadge,
  getStatusInfo,
  getDueDateInfo,
}: PhaseSectionProps) => {
  if (tasks.length === 0) return null;

  const colorClasses = {
    blue: {
      bg: "bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
      hover: "hover:bg-blue-100/50",
      icon: "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
      progress: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-300",
    },
    amber: {
      bg: "bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
      hover: "hover:bg-amber-100/50",
      icon: "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
      progress: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
    },
    green: {
      bg: "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
      hover: "hover:bg-green-100/50",
      icon: "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200",
      progress: "bg-green-500",
      text: "text-green-700 dark:text-green-300",
    },
  };

  const colors = colorClasses[phaseColor];
  const completedCount = tasks.filter(t => t.status === "completed").length;

  return (
    <Collapsible open={isExpanded}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          isLocked && "opacity-75",
          colors.bg
        )}
      >
        {/* Phase Header */}
        <CollapsibleTrigger asChild>
          <div
            onClick={onToggle}
            className={cn(
              "flex items-center justify-between p-3 cursor-pointer",
              colors.hover
            )}
          >
            <div className="flex items-center gap-3">
              {isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <div className={cn("p-1.5 rounded", colors.icon)}>
                {phaseIcon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{phaseName}</span>
                  {isLocked && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Lock className="h-3 w-3 mr-0.5" />
                      Locked
                    </Badge>
                  )}
                </div>
                {isLocked && (
                  <p className="text-xs text-muted-foreground">{lockReason}</p>
                )}
              </div>
            </div>

            {/* Right side: Status indicator showing phase name */}
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", colors.text)}>
                {phaseName}
              </Badge>
              <div className="text-right font-medium">
                {progress}%
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {completedCount}/{tasks.length}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Progress bar */}
        <div className="px-3 pb-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", colors.progress)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Tasks list */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isOwner={isOwner}
                members={members}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                onStatusChange={(status) => onStatusChange(task.id, status)}
                onAssigneeChange={(assigneeId) => onAssigneeChange(task.id, assigneeId)}
                getPriorityBadge={getPriorityBadge}
                getStatusInfo={getStatusInfo}
                getDueDateInfo={getDueDateInfo}
                isLocked={isLocked}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default TaskAssignment;
