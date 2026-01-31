import { useState, useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Wrench,
  ShieldCheck,
  Wand2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface PhaseGanttChartProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  onTasksUpdated?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const STATUS_OPACITY: Record<string, string> = {
  pending: "opacity-80",
  in_progress: "ring-2 ring-blue-400",
  completed: "opacity-50",
};

const PHASE_CONFIG = {
  preparation: {
    icon: ClipboardCheck,
    label: "Preparation",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    progressColor: "bg-blue-500",
  },
  execution: {
    icon: Wrench,
    label: "Execution",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    progressColor: "bg-amber-500",
  },
  verification: {
    icon: ShieldCheck,
    label: "Verification",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    progressColor: "bg-green-500",
  },
};

// Categorize task into phase
const getPhaseForTask = (task: Task): "preparation" | "execution" | "verification" => {
  const titleLower = task.title.toLowerCase();
  const descLower = (task.description || "").toLowerCase();
  const combined = titleLower + " " + descLower;

  // Preparation phase
  if (
    combined.includes("order") || combined.includes("deliver") || combined.includes("measure") ||
    combined.includes("prep") || combined.includes("plan") || combined.includes("schedule") ||
    combined.includes("permit") || combined.includes("survey") || combined.includes("quote") ||
    combined.includes("buy") || combined.includes("purchase") || combined.includes("setup") ||
    combined.includes("protect") || combined.includes("tape") || combined.includes("drop cloth") ||
    combined.includes("primer") || combined.includes("sand") || combined.includes("obtain") ||
    combined.includes("set up")
  ) {
    return "preparation";
  }

  // Verification phase
  if (
    combined.includes("inspect") || combined.includes("verify") || combined.includes("test") ||
    combined.includes("final") || combined.includes("clean") || combined.includes("review") ||
    combined.includes("check") || combined.includes("approve") || combined.includes("sign off") ||
    combined.includes("touch up") || combined.includes("punch list")
  ) {
    return "verification";
  }

  return "execution";
};

const PhaseGanttChart = ({ tasks, onTaskClick, projectStartDate, projectEndDate, onTasksUpdated }: PhaseGanttChartProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    preparation: true,
    execution: true,
    verification: true,
  });
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // Count tasks without due dates
  const tasksWithoutDates = useMemo(() => 
    tasks.filter(t => !t.due_date && t.status !== "completed"), 
    [tasks]
  );

  // Auto-schedule tasks based on project dates and phases
  const handleAutoSchedule = async () => {
    if (!projectStartDate || !projectEndDate) {
      toast.error(t("gantt.needProjectDates", "Set project start and end dates first"));
      return;
    }

    if (tasksWithoutDates.length === 0) {
      toast.info(t("gantt.allTasksScheduled", "All tasks already have due dates"));
      return;
    }

    setIsAutoScheduling(true);
    try {
      const totalDuration = differenceInDays(projectEndDate, projectStartDate);
      
      // Phase distribution: Preparation 20%, Execution 60%, Verification 20%
      const phaseRanges = {
        preparation: { start: 0, end: Math.floor(totalDuration * 0.2) },
        execution: { start: Math.floor(totalDuration * 0.2), end: Math.floor(totalDuration * 0.8) },
        verification: { start: Math.floor(totalDuration * 0.8), end: totalDuration },
      };

      // Group unscheduled tasks by phase
      const unscheduledByPhase = {
        preparation: tasksWithoutDates.filter(t => getPhaseForTask(t) === "preparation"),
        execution: tasksWithoutDates.filter(t => getPhaseForTask(t) === "execution"),
        verification: tasksWithoutDates.filter(t => getPhaseForTask(t) === "verification"),
      };

      const updates: { id: string; due_date: string }[] = [];

      // Distribute tasks within each phase
      (["preparation", "execution", "verification"] as const).forEach(phase => {
        const phaseTasks = unscheduledByPhase[phase];
        const { start, end } = phaseRanges[phase];
        const phaseDuration = end - start;

        phaseTasks.forEach((task, index) => {
          // Distribute evenly within the phase
          const offset = phaseDuration > 0 
            ? Math.floor(start + (phaseDuration * (index + 1)) / (phaseTasks.length + 1))
            : start;
          const dueDate = addDays(projectStartDate, offset);
          
          updates.push({
            id: task.id,
            due_date: dueDate.toISOString(),
          });
        });
      });

      // Batch update tasks
      for (const update of updates) {
        const { error } = await supabase
          .from("project_tasks")
          .update({ due_date: update.due_date })
          .eq("id", update.id);
        
        if (error) throw error;
      }

      toast.success(t("gantt.autoScheduleSuccess", `Scheduled ${updates.length} tasks`));
      onTasksUpdated?.();
    } catch (error: any) {
      console.error("Auto-schedule error:", error);
      toast.error(t("gantt.autoScheduleError", "Failed to schedule tasks"));
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Group tasks by phase
  const phaseData = useMemo(() => {
    const preparation = tasks.filter((t) => getPhaseForTask(t) === "preparation");
    const execution = tasks.filter((t) => getPhaseForTask(t) === "execution");
    const verification = tasks.filter((t) => getPhaseForTask(t) === "verification");

    const calcProgress = (phaseTasks: Task[]) => {
      if (phaseTasks.length === 0) return 0;
      return Math.round((phaseTasks.filter((t) => t.status === "completed").length / phaseTasks.length) * 100);
    };

    return {
      preparation: { tasks: preparation, progress: calcProgress(preparation) },
      execution: { tasks: execution, progress: calcProgress(execution) },
      verification: { tasks: verification, progress: calcProgress(verification) },
    };
  }, [tasks]);

  // Calculate timeline range
  const { timelineStart, totalDays, dayWidth } = useMemo(() => {
    const tasksWithDates = tasks.filter((t) => t.due_date);
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return {
        timelineStart: today,
        totalDays: 14,
        dayWidth: isMobile ? 28 : 36,
      };
    }

    const dates = tasksWithDates.map((t) => new Date(t.due_date!));
    const earliest = min(dates);
    const latest = max(dates);

    const start = addDays(startOfDay(earliest), -2);
    const end = addDays(startOfDay(latest), 5);
    const days = differenceInDays(end, start) + 1;

    const baseWidth = isMobile ? 24 : 32;
    const calculatedWidth = Math.max(baseWidth, Math.min(isMobile ? 36 : 44, 500 / days));

    return {
      timelineStart: start,
      totalDays: days,
      dayWidth: calculatedWidth,
    };
  }, [tasks, isMobile]);

  const getDatePosition = useCallback(
    (date: Date) => {
      const days = differenceInDays(startOfDay(date), timelineStart);
      return days * dayWidth;
    },
    [timelineStart, dayWidth]
  );

  const dayHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < totalDays; i++) {
      headers.push(addDays(timelineStart, i));
    }
    return headers;
  }, [timelineStart, totalDays]);

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }));
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>{t("timeline.noTasks", "No tasks to display")}</p>
      </div>
    );
  }

  const taskNameColumnWidth = isMobile ? 100 : 160;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium">{t("timeline.phaseView", "Phase Timeline")}</span>
          {tasksWithoutDates.length > 0 && (
            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              <Clock className="h-3 w-3 mr-1" />
              {tasksWithoutDates.length} {t("gantt.unscheduled", "unscheduled")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-schedule button */}
          {tasksWithoutDates.length > 0 && projectStartDate && projectEndDate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoSchedule}
                    disabled={isAutoScheduling}
                    className="gap-1.5 h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {isAutoScheduling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {!isMobile && t("gantt.autoSchedule", "Auto-schedule")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{t("gantt.autoScheduleHint", "Distribute tasks across project phases")}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(projectStartDate, "MMM d")} - {format(projectEndDate, "MMM d")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Priority legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { color: "bg-slate-400", label: "Low" },
              { color: "bg-amber-500", label: "Med" },
              { color: "bg-orange-500", label: "High" },
              { color: "bg-red-500", label: "Urg" },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-1">
                <div className={cn("w-2.5 h-2 rounded", p.color)} />
                <span className="text-muted-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalDays * dayWidth + taskNameColumnWidth }}>
            {/* Date Header */}
            <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
              <div
                className="flex-shrink-0 px-2 py-1.5 font-medium text-xs border-r border-border bg-muted/50"
                style={{ width: taskNameColumnWidth }}
              >
                {t("timeline.tasks", "Tasks")} ({tasks.length})
              </div>
              <div className="flex">
                {dayHeaders.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isTodayDate = isToday(date);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 text-center py-1 border-r border-border/50 text-[10px]",
                        isWeekend && "bg-muted/50",
                        isTodayDate && "bg-amber-100 dark:bg-amber-950/50"
                      )}
                      style={{ width: dayWidth }}
                    >
                      <div className="font-medium">{format(date, "d")}</div>
                      {!isMobile && (
                        <div className="text-muted-foreground text-[9px]">{format(date, "EEE")}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase Sections */}
            {(["preparation", "execution", "verification"] as const).map((phase) => {
              const config = PHASE_CONFIG[phase];
              const data = phaseData[phase];
              const Icon = config.icon;
              const isExpanded = expandedPhases[phase];

              return (
                <div key={phase} className="border-b border-border last:border-b-0">
                  {/* Phase Header */}
                  <div
                    className={cn(
                      "flex items-center cursor-pointer hover:bg-muted/20 transition-colors",
                      config.bgColor
                    )}
                    onClick={() => togglePhase(phase)}
                  >
                    <div
                      className="flex-shrink-0 px-2 py-2 border-r border-border flex items-center gap-2"
                      style={{ width: taskNameColumnWidth }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className={cn("text-xs font-medium truncate", config.color)}>
                        {t(`phases.${phase}`, config.label)}
                      </span>
                    </div>
                    <div className="flex-1 px-3 py-2 flex items-center gap-3">
                      <Progress value={data.progress} className="h-1.5 flex-1 max-w-[120px]" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {data.progress}% • {data.tasks.filter((t) => t.status === "completed").length}/{data.tasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Phase Tasks */}
                  {isExpanded &&
                    data.tasks.map((task) => {
                      const isOverdue =
                        task.due_date &&
                        isPast(startOfDay(new Date(task.due_date))) &&
                        !isToday(new Date(task.due_date)) &&
                        task.status !== "completed";

                      const barPosition = task.due_date ? getDatePosition(new Date(task.due_date)) : 0;

                      return (
                        <div
                          key={task.id}
                          className="flex border-t border-border/30 hover:bg-muted/10 transition-colors group"
                        >
                          {/* Task Name */}
                          <div
                            className="flex-shrink-0 px-2 py-1.5 border-r border-border flex items-center gap-1.5"
                            style={{ width: taskNameColumnWidth }}
                          >
                            <button
                              onClick={() => onTaskClick?.(task)}
                              className={cn(
                                "text-xs font-medium truncate text-left hover:text-primary transition-colors flex-1",
                                task.status === "completed" && "line-through text-muted-foreground"
                              )}
                            >
                              {task.title}
                            </button>
                          </div>

                          {/* Timeline Bar */}
                          <div className="flex-1 relative h-7">
                            {/* Background grid */}
                            <div className="absolute inset-0 flex">
                              {dayHeaders.map((date, i) => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isTodayDate = isToday(date);
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      "h-full border-r border-border/20",
                                      isWeekend && "bg-muted/20",
                                      isTodayDate && "bg-amber-100/30 dark:bg-amber-950/20"
                                    )}
                                    style={{ width: dayWidth }}
                                  />
                                );
                              })}
                            </div>

                            {/* Task Bar */}
                            {task.due_date && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "absolute top-1/2 -translate-y-1/2 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-medium px-1.5 shadow-sm cursor-pointer hover:scale-105 transition-transform",
                                        PRIORITY_COLORS[task.priority] || "bg-slate-500",
                                        STATUS_OPACITY[task.status],
                                        isOverdue && "ring-2 ring-red-500"
                                      )}
                                      style={{
                                        left: Math.max(0, barPosition),
                                        minWidth: dayWidth * 1.2,
                                      }}
                                      onClick={() => onTaskClick?.(task)}
                                    >
                                      {isOverdue && <AlertTriangle className="h-2 w-2 mr-0.5" />}
                                      {task.status === "completed" && <CheckCircle2 className="h-2 w-2 mr-0.5" />}
                                      <span className="truncate">
                                        {format(new Date(task.due_date), isMobile ? "d" : "MMM d")}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <div className="font-medium">{task.title}</div>
                                    <div className="text-muted-foreground">
                                      {format(new Date(task.due_date), "EEEE, MMM d")}
                                    </div>
                                    {task.assignee_name && (
                                      <div className="text-muted-foreground">→ {task.assignee_name}</div>
                                    )}
                                    <div className="mt-1 text-[10px] text-primary">
                                      {t("timeline.clickToEdit", "Click to edit")}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* No date badge */}
                            {!task.due_date && (
                              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                <Badge variant="outline" className="text-[9px] py-0 px-1 text-muted-foreground">
                                  <Clock className="h-2 w-2 mr-0.5" />
                                  {t("timeline.noDate", "No date")}
                                </Badge>
                              </div>
                            )}

                            {/* Today line */}
                            {dayHeaders.some((d) => isToday(d)) && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                style={{ left: getDatePosition(new Date()) + dayWidth / 2 }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Empty state for phase */}
                  {isExpanded && data.tasks.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground text-center border-t border-border/30">
                      {t("timeline.noTasksInPhase", "No tasks in this phase")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseGanttChart;
