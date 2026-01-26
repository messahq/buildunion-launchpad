import { useState, useCallback, useMemo } from "react";
import {
  format,
  differenceInDays,
  addDays,
  startOfDay,
  isToday,
  isPast,
  min,
  max,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  unit_price?: number;
  quantity?: number;
  total_cost?: number;
  assignee_name?: string;
  assignee_avatar?: string;
}

interface TaskGanttTimelineProps {
  tasks: Task[];
  isOwner: boolean;
  onTaskClick?: (task: Task) => void;
  onBudgetUpdate?: (taskId: string, unitPrice: number, quantity: number) => void;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "opacity-60",
  in_progress: "opacity-100 ring-2 ring-blue-400",
  completed: "opacity-40 line-through",
};

const TaskGanttTimeline = ({
  tasks,
  isOwner,
  onTaskClick,
  onBudgetUpdate,
  projectStartDate,
  projectEndDate,
}: TaskGanttTimelineProps) => {
  const { t } = useTranslation();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [tempUnitPrice, setTempUnitPrice] = useState<number>(0);
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Calculate timeline range
  const { timelineStart, timelineEnd, totalDays, dayWidth } = useMemo(() => {
    const tasksWithDates = tasks.filter((t) => t.due_date);
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 30),
        totalDays: 30,
        dayWidth: 40,
      };
    }

    const dates = tasksWithDates.map((t) => new Date(t.due_date!));
    const earliest = projectStartDate || min(dates);
    const latest = projectEndDate || max(dates);
    
    // Add padding
    const start = addDays(startOfDay(earliest), -3);
    const end = addDays(startOfDay(latest), 7);
    const days = differenceInDays(end, start) + 1;

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: days,
      dayWidth: Math.max(30, Math.min(60, 800 / days)),
    };
  }, [tasks, projectStartDate, projectEndDate]);

  // Calculate total budget
  const totalBudget = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
  }, [tasks]);

  // Get position for a date
  const getDatePosition = useCallback(
    (date: Date) => {
      const days = differenceInDays(startOfDay(date), timelineStart);
      return days * dayWidth;
    },
    [timelineStart, dayWidth]
  );

  // Handle budget save
  const handleBudgetSave = async (taskId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          unit_price: tempUnitPrice,
          quantity: tempQuantity,
        })
        .eq("id", taskId);

      if (error) throw error;

      onBudgetUpdate?.(taskId, tempUnitPrice, tempQuantity);
      toast.success(t("timeline.budgetUpdated", "Budget updated"));
      setEditingBudget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update budget");
    } finally {
      setSaving(false);
    }
  };

  // Generate day headers
  const dayHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(timelineStart, i);
      headers.push(date);
    }
    return headers;
  }, [timelineStart, totalDays]);

  // Sort tasks by due date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>{t("timeline.noTasks", "No tasks to display on timeline")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Total Budget */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">
            {t("timeline.ganttView", "Gantt Timeline")}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-semibold gap-1.5",
              totalBudget > 0
                ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30"
                : "border-muted"
            )}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Total: ${totalBudget.toLocaleString()}
          </Badge>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded bg-slate-400" />
          <span className="text-muted-foreground">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded bg-amber-500" />
          <span className="text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded bg-orange-500" />
          <span className="text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded bg-red-500" />
          <span className="text-muted-foreground">Urgent</span>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalDays * dayWidth + 280 }}>
            {/* Date Header Row */}
            <div className="flex border-b border-border bg-muted/30">
              {/* Task info column */}
              <div className="w-[280px] flex-shrink-0 px-3 py-2 font-medium text-sm border-r border-border">
                {t("timeline.tasks", "Tasks")} ({tasks.length})
              </div>
              
              {/* Date columns */}
              <div className="flex">
                {dayHeaders.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isTodayDate = isToday(date);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 text-center py-1 border-r border-border/50 text-xs",
                        isWeekend && "bg-muted/50",
                        isTodayDate && "bg-amber-100 dark:bg-amber-950/50"
                      )}
                      style={{ width: dayWidth }}
                    >
                      <div className="font-medium">
                        {format(date, "d")}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {format(date, "EEE")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Rows */}
            {sortedTasks.map((task) => {
              const isOverdue =
                task.due_date &&
                isPast(startOfDay(new Date(task.due_date))) &&
                !isToday(new Date(task.due_date)) &&
                task.status !== "completed";

              const barPosition = task.due_date
                ? getDatePosition(new Date(task.due_date))
                : 0;

              return (
                <div
                  key={task.id}
                  className="flex border-b border-border/50 hover:bg-muted/20 transition-colors group"
                >
                  {/* Task Info Column */}
                  <div className="w-[280px] flex-shrink-0 px-3 py-2 border-r border-border flex items-center gap-2">
                    {/* Drag handle */}
                    {isOwner && (
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab" />
                    )}
                    
                    {/* Avatar */}
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={task.assignee_avatar} />
                      <AvatarFallback className="text-xs">
                        {task.assignee_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Task Title */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onTaskClick?.(task)}
                        className="text-sm font-medium truncate block text-left hover:text-primary transition-colors"
                      >
                        {task.title}
                      </button>
                    </div>

                    {/* Budget Edit */}
                    {editingBudget === task.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={tempUnitPrice}
                          onChange={(e) =>
                            setTempUnitPrice(parseFloat(e.target.value) || 0)
                          }
                          className="h-6 w-16 text-xs"
                          placeholder="$/unit"
                        />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          type="number"
                          value={tempQuantity}
                          onChange={(e) =>
                            setTempQuantity(parseFloat(e.target.value) || 1)
                          }
                          className="h-6 w-12 text-xs"
                          placeholder="qty"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleBudgetSave(task.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                if (isOwner) {
                                  setEditingBudget(task.id);
                                  setTempUnitPrice(task.unit_price || 0);
                                  setTempQuantity(task.quantity || 1);
                                }
                              }}
                              className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded",
                                task.total_cost && task.total_cost > 0
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                  : "bg-muted text-muted-foreground",
                                isOwner && "hover:ring-1 hover:ring-primary/50 cursor-pointer"
                              )}
                            >
                              ${(task.total_cost || 0).toLocaleString()}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {task.unit_price && task.quantity
                              ? `$${task.unit_price} × ${task.quantity}`
                              : isOwner
                              ? t("timeline.clickToAddBudget", "Click to add budget")
                              : t("timeline.noBudget", "No budget set")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Timeline Bar Area */}
                  <div className="flex-1 relative h-10">
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {dayHeaders.map((date, i) => {
                        const isWeekend =
                          date.getDay() === 0 || date.getDay() === 6;
                        const isTodayDate = isToday(date);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "h-full border-r border-border/30",
                              isWeekend && "bg-muted/30",
                              isTodayDate && "bg-amber-100/50 dark:bg-amber-950/30"
                            )}
                            style={{ width: dayWidth }}
                          />
                        );
                      })}
                    </div>

                    {/* Task Bar */}
                    {task.due_date && (
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium px-3 shadow-sm transition-all cursor-pointer hover:scale-105",
                          PRIORITY_COLORS[task.priority] || "bg-slate-500",
                          STATUS_COLORS[task.status],
                          isOverdue && "ring-2 ring-red-500"
                        )}
                        style={{
                          left: barPosition,
                          minWidth: dayWidth * 2,
                        }}
                        onClick={() => onTaskClick?.(task)}
                      >
                        {isOverdue && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {task.status === "completed" && (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        <span className="truncate max-w-[100px]">
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      </div>
                    )}

                    {/* Today line */}
                    {isToday(new Date()) && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: getDatePosition(new Date()) + dayWidth / 2 }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks */}
      {tasks.filter((t) => !t.due_date).length > 0 && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-sm font-medium mb-2 text-muted-foreground">
            {t("timeline.unscheduled", "Unscheduled Tasks")} (
            {tasks.filter((t) => !t.due_date).length})
          </div>
          <div className="flex flex-wrap gap-2">
            {tasks
              .filter((t) => !t.due_date)
              .map((task) => (
                <Badge
                  key={task.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => onTaskClick?.(task)}
                >
                  {task.title}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskGanttTimeline;
