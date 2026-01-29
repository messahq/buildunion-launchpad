import { useState, useEffect, useCallback } from "react";
import { format, isPast, isToday, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Wrench,
  PlayCircle,
  Circle,
  ListTodo,
  TrendingUp,
  Calendar,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string;
  project_id: string;
}

interface WorkerDashboardProps {
  projectId: string;
  projectName?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-600 bg-slate-100 border-slate-200",
  medium: "text-amber-600 bg-amber-100 border-amber-200",
  high: "text-orange-600 bg-orange-100 border-orange-200",
  urgent: "text-red-600 bg-red-100 border-red-200",
};

const STATUS_CONFIG = {
  pending: { icon: Circle, color: "text-slate-500", label: "Pending", bgColor: "bg-slate-50" },
  in_progress: { icon: PlayCircle, color: "text-blue-600", label: "In Progress", bgColor: "bg-blue-50" },
  completed: { icon: CheckCircle2, color: "text-green-600", label: "Completed", bgColor: "bg-green-50" },
};

const WorkerDashboard = ({ projectId, projectName }: WorkerDashboardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Fetch worker's tasks
  const fetchMyTasks = useCallback(async () => {
    if (!projectId || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .eq("assigned_to", user.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchMyTasks();

    // Subscribe to realtime updates for this user's tasks
    const channel = supabase
      .channel(`worker_tasks_${projectId}_${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Only update if it affects current user's tasks
          const newRecord = payload.new as Task | undefined;
          const oldRecord = payload.old as { id: string; assigned_to?: string } | undefined;
          
          if (newRecord?.assigned_to === user?.id || oldRecord?.assigned_to === user?.id) {
            fetchMyTasks();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user?.id, fetchMyTasks]);

  // Notify owner when task is completed
  const notifyOwnerOfCompletion = async (taskId: string, taskTitle: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-task-completed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            taskId,
            taskTitle,
            projectId,
            projectName,
          }),
        }
      );

      if (!response.ok) {
        console.warn("Failed to notify owner:", await response.text());
      }
    } catch (err) {
      console.error("Error notifying owner:", err);
    }
  };

  // Update task status
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    const task = tasks.find(t => t.id === taskId);
    
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));

      const statusLabel = STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus;
      toast.success(t("workerDashboard.statusUpdated", `Task marked as ${statusLabel}`));

      // If task was marked as completed, notify owner
      if (newStatus === "completed" && task) {
        notifyOwnerOfCompletion(taskId, task.title);
      }
    } catch (err: any) {
      console.error("Error updating status:", err);
      toast.error(err.message || t("workerDashboard.updateError", "Failed to update task"));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    isPast(startOfDay(new Date(t.due_date))) && 
    !isToday(new Date(t.due_date)) && 
    t.status !== "completed"
  ).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed border-slate-300">
        <CardContent className="py-12 text-center">
          <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t("workerDashboard.noTasks", "No tasks assigned to you")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("workerDashboard.waitAssignment", "Wait for the project owner to assign tasks")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-cyan-600" />
              <span>{t("workerDashboard.myTasks", "My Tasks")}</span>
              {projectName && (
                <Badge variant="secondary" className="text-xs">
                  {projectName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {overdueTasks > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueTasks} {t("workerDashboard.overdue", "overdue")}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {completedTasks}/{totalTasks} {t("workerDashboard.completed", "completed")}
            </span>
            <span className="text-sm font-bold text-cyan-700">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 mb-4" />

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/40">
              <Circle className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground">{t("workerDashboard.pending", "Pending")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/40">
              <PlayCircle className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{inProgressTasks}</p>
                <p className="text-xs text-muted-foreground">{t("workerDashboard.inProgress", "In Progress")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/40">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{completedTasks}</p>
                <p className="text-xs text-muted-foreground">{t("workerDashboard.done", "Done")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task list - simplified cards */}
      <div className="space-y-2">
        {tasks
          .sort((a, b) => {
            // Sort: In Progress first, then Pending, then Completed
            const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
            return (statusOrder[a.status as keyof typeof statusOrder] || 1) - 
                   (statusOrder[b.status as keyof typeof statusOrder] || 1);
          })
          .map((task) => {
            const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const isOverdue = task.due_date && 
              isPast(startOfDay(new Date(task.due_date))) && 
              !isToday(new Date(task.due_date)) && 
              task.status !== "completed";
            const isUpdating = updatingTaskId === task.id;
            const isCompleted = task.status === "completed";

            return (
              <Card 
                key={task.id} 
                className={cn(
                  "transition-all duration-200",
                  isCompleted && "opacity-60 bg-green-50/50 dark:bg-green-950/20",
                  isOverdue && !isCompleted && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {/* Status icon button */}
                    <button
                      onClick={() => {
                        if (isCompleted) return;
                        const nextStatus = task.status === "pending" ? "in_progress" : "completed";
                        handleUpdateStatus(task.id, nextStatus);
                      }}
                      disabled={isUpdating || isCompleted}
                      className={cn(
                        "flex-shrink-0 p-1.5 rounded-full transition-colors",
                        !isCompleted && "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
                        isCompleted && "cursor-default"
                      )}
                      title={isCompleted ? t("workerDashboard.alreadyComplete", "Already completed") : t("workerDashboard.clickToProgress", "Click to progress")}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                      ) : (
                        <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
                      )}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        isCompleted && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Right side - badges and actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Priority badge */}
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] h-5", PRIORITY_COLORS[task.priority])}
                      >
                        <Flag className="h-2.5 w-2.5 mr-0.5" />
                        {task.priority}
                      </Badge>

                      {/* Due date */}
                      {task.due_date && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] h-5",
                            isOverdue && !isCompleted && "border-red-300 text-red-600 bg-red-50"
                          )}
                        >
                          <Calendar className="h-2.5 w-2.5 mr-0.5" />
                          {format(new Date(task.due_date), "MMM d")}
                        </Badge>
                      )}

                      {/* Quick actions */}
                      {!isCompleted && (
                        <div className="flex gap-1">
                          {task.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                              onClick={() => handleUpdateStatus(task.id, "in_progress")}
                              disabled={isUpdating}
                            >
                              <PlayCircle className="h-3.5 w-3.5 mr-1" />
                              {t("workerDashboard.start", "Start")}
                            </Button>
                          )}
                          {task.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                              onClick={() => handleUpdateStatus(task.id, "completed")}
                              disabled={isUpdating}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              {t("workerDashboard.complete", "Complete")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Completion celebration */}
      {progressPercent === 100 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-300">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="text-lg font-bold text-green-700 dark:text-green-300 mb-1">
              {t("workerDashboard.allComplete", "All Tasks Complete!")}
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("workerDashboard.greatWork", "Great work! All your assigned tasks are done.")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkerDashboard;
