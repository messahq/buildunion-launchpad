import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, isPast, isToday, isTomorrow, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TaskTimelineCalendar from "./TaskTimelineCalendar";

interface TaskAssignmentProps {
  projectId: string;
  isOwner: boolean;
  projectAddress?: string;
  filterByMemberId?: string | null;
  onClearFilter?: () => void;
  forceCalendarView?: boolean;
  onCalendarViewActivated?: () => void;
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

const TaskAssignment = ({ projectId, isOwner, projectAddress, filterByMemberId, onClearFilter, forceCalendarView, onCalendarViewActivated }: TaskAssignmentProps) => {
  const { user } = useAuth();
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

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Handle force calendar view from parent (e.g., from Operational Truth reschedule button)
  useEffect(() => {
    if (forceCalendarView) {
      setViewMode("calendar");
      onCalendarViewActivated?.();
    }
  }, [forceCalendarView, onCalendarViewActivated]);

  // Fetch tasks and members
  useEffect(() => {
    const fetchData = async () => {
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
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates
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
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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
      toast.error("Please fill in title and assign to a member");
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
        const { error } = await supabase
          .from("project_tasks")
          .update(taskData)
          .eq("id", editingTask.id);

        if (error) throw error;
        toast.success("Task updated");
      } else {
        const { error } = await supabase
          .from("project_tasks")
          .insert(taskData);

        if (error) throw error;
        toast.success("Task created");
      }

      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Status updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleUpdateAssignee = async (taskId: string, newAssigneeId: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ assigned_to: newAssigneeId })
        .eq("id", taskId);

      if (error) throw error;
      
      const member = members.find(m => m.user_id === newAssigneeId);
      toast.success(`Task assigned to ${member?.full_name || 'team member'}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update assignee");
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
  const getPhaseForTask = (task: Task): "preparation" | "execution" | "verification" => {
    const titleLower = task.title.toLowerCase();
    if (titleLower.includes("prep") || titleLower.includes("order") || titleLower.includes("measure") || titleLower.includes("deliver")) {
      return "preparation";
    }
    if (titleLower.includes("install") || titleLower.includes("lay") || titleLower.includes("apply") || titleLower.includes("cut")) {
      return "execution";
    }
    if (titleLower.includes("inspect") || titleLower.includes("verify") || titleLower.includes("clean") || titleLower.includes("final")) {
      return "verification";
    }
    return "execution"; // Default
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

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-amber-600" />
                {filterByMemberId ? `${filteredMemberInfo?.full_name || "Member"} Tasks` : "Tasks"}
              </CardTitle>
              <CardDescription>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} 
                {inProgressTasks.length > 0 && ` • ${inProgressTasks.length} in progress`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              {filteredTasks.length > 0 && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs gap-1.5 rounded-md transition-colors",
                      viewMode === "list"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs gap-1.5 rounded-md transition-colors",
                      viewMode === "calendar"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                    onClick={() => setViewMode("calendar")}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Timeline
                  </Button>
                </div>
              )}
              {isOwner && members.length > 0 && (
                <Button
                  size="sm"
                  className="gap-1 bg-amber-600 hover:bg-amber-700"
                  onClick={openCreateDialog}
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <User className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>Add team members first</p>
              <p className="text-xs mt-1">You can assign tasks after adding members</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <ListTodo className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No tasks yet</p>
              {isOwner && <p className="text-xs mt-1">Create tasks for your team</p>}
            </div>
          ) : viewMode === "calendar" ? (
            <TaskTimelineCalendar
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
}

const TaskItem = ({ task, isOwner, members, onEdit, onDelete, onStatusChange, onAssigneeChange, getPriorityBadge, getStatusInfo, getDueDateInfo }: TaskItemProps) => {
  const statusInfo = getStatusInfo(task.status);
  const StatusIcon = statusInfo.icon;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
  const dueDateInfo = getDueDateInfo ? getDueDateInfo(task.due_date) : null;
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);

  return (
    <div className={`
      flex items-start gap-3 p-3 rounded-lg border transition-colors
      ${task.status === "completed" ? "bg-slate-50 opacity-75" : "bg-white hover:bg-slate-50"}
      ${isOverdue ? "border-red-200" : "border-slate-200"}
    `}>
      <div className="flex-shrink-0 pt-0.5">
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
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-900"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                <span>{task.assignee_name}</span>
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
                      <div className="flex-1 text-left">
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                      </div>
                      {task.assigned_to === member.user_id && (
                        <CheckCircle2 className="h-4 w-4 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            )}
          </Popover>
          
          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${dueDateInfo?.color || (isOverdue ? "text-red-600" : "text-slate-500")}`}>
              {isOverdue || dueDateInfo?.urgent ? <AlertCircle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
              <span>{dueDateInfo?.label || new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
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
    <Collapsible open={isExpanded && !isLocked}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          isLocked && "opacity-60",
          colors.bg
        )}
      >
        {/* Phase Header */}
        <CollapsibleTrigger asChild>
          <div
            onClick={isLocked ? undefined : onToggle}
            className={cn(
              "flex items-center justify-between p-3 cursor-pointer",
              !isLocked && colors.hover,
              isLocked && "cursor-not-allowed"
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

            {/* Right side: Progress info */}
            <div className="flex items-center gap-4">
              <div className="text-right text-xs text-muted-foreground">
                Progress
              </div>
              <div className="text-right font-medium">
                {progress}%
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {tasks.length} tasks
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
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default TaskAssignment;
