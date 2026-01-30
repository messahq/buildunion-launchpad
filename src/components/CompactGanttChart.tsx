import { useState, useMemo, useCallback, useRef } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface CompactGanttChartProps {
  tasks: Task[];
  isOwner: boolean;
  onTaskClick?: (task: Task) => void;
  projectAddress?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const STATUS_OPACITY: Record<string, string> = {
  pending: "opacity-70",
  in_progress: "ring-2 ring-blue-400",
  completed: "opacity-50",
};

const CompactGanttChart = ({
  tasks,
  isOwner,
  onTaskClick,
}: CompactGanttChartProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragCurrentX, setDragCurrentX] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Calculate timeline range
  const { timelineStart, timelineEnd, totalDays, dayWidth } = useMemo(() => {
    const tasksWithDates = tasks.filter((t) => t.due_date);
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 14),
        totalDays: 14,
        dayWidth: isMobile ? 32 : 40,
      };
    }

    const dates = tasksWithDates.map((t) => new Date(t.due_date!));
    const earliest = min(dates);
    const latest = max(dates);
    
    // Add padding
    const start = addDays(startOfDay(earliest), -2);
    const end = addDays(startOfDay(latest), 5);
    const days = differenceInDays(end, start) + 1;

    // Adjust day width based on screen size
    const baseWidth = isMobile ? 28 : 36;
    const calculatedWidth = Math.max(baseWidth, Math.min(isMobile ? 40 : 50, 600 / days));

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: days,
      dayWidth: calculatedWidth,
    };
  }, [tasks, isMobile]);

  // Get position for a date
  const getDatePosition = useCallback(
    (date: Date) => {
      const days = differenceInDays(startOfDay(date), timelineStart);
      return days * dayWidth;
    },
    [timelineStart, dayWidth]
  );

  // Handle drag start (desktop only)
  const handleDragStart = (e: React.MouseEvent, task: Task) => {
    if (!isOwner || !task.due_date || isMobile) return;
    e.preventDefault();
    setDraggingTask(task);
    setDragStartX(e.clientX);
    setDragCurrentX(e.clientX);
  };

  // Handle drag move
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!draggingTask) return;
    setDragCurrentX(e.clientX);
  }, [draggingTask]);

  // Handle drag end
  const handleDragEnd = async () => {
    if (!draggingTask || !draggingTask.due_date) {
      setDraggingTask(null);
      return;
    }

    const deltaX = dragCurrentX - dragStartX;
    const deltaDays = Math.round(deltaX / dayWidth);

    if (deltaDays === 0) {
      setDraggingTask(null);
      return;
    }

    const originalDate = new Date(draggingTask.due_date);
    const newDate = addDays(originalDate, deltaDays);

    setSaving(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ due_date: newDate.toISOString() })
        .eq("id", draggingTask.id);

      if (error) throw error;

      toast.success(t("timeline.taskMoved", "Task moved to {{date}}", {
        date: format(newDate, "MMM d"),
      }));
    } catch (err: any) {
      toast.error(err.message || t("timeline.moveFailed", "Failed to move task"));
    } finally {
      setSaving(false);
      setDraggingTask(null);
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

  // Unscheduled tasks
  const unscheduledTasks = tasks.filter((t) => !t.due_date);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>{t("timeline.noTasks", "No tasks to display on timeline")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-foreground">
            {t("timeline.ganttView", "Timeline")}
          </span>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        {!isMobile && isOwner && (
          <Badge variant="outline" className="text-xs gap-1">
            <GripVertical className="h-3 w-3" />
            {t("timeline.dragToMove", "Drag to reschedule")}
          </Badge>
        )}
      </div>

      {/* Priority Legend - Compact for mobile */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { color: "bg-slate-400", label: "Low" },
          { color: "bg-amber-500", label: "Med" },
          { color: "bg-orange-500", label: "High" },
          { color: "bg-red-500", label: "Urgent" },
        ].map((p) => (
          <div key={p.label} className="flex items-center gap-1">
            <div className={cn("w-3 h-2 rounded", p.color)} />
            <span className="text-muted-foreground">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Gantt Chart Container */}
      <div 
        ref={containerRef}
        className="border border-border rounded-lg overflow-hidden bg-card"
        onMouseMove={draggingTask ? handleDragMove : undefined}
        onMouseUp={draggingTask ? handleDragEnd : undefined}
        onMouseLeave={draggingTask ? handleDragEnd : undefined}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalDays * dayWidth + (isMobile ? 120 : 200) }}>
            {/* Date Header Row */}
            <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
              {/* Task name column */}
              <div 
                className={cn(
                  "flex-shrink-0 px-2 py-1.5 font-medium text-xs border-r border-border bg-muted/50",
                  isMobile ? "w-[120px]" : "w-[200px]"
                )}
              >
                {t("timeline.tasks", "Tasks")} ({sortedTasks.filter(t => t.due_date).length})
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
                        "flex-shrink-0 text-center py-1 border-r border-border/50 text-[10px]",
                        isWeekend && "bg-muted/50",
                        isTodayDate && "bg-amber-100 dark:bg-amber-950/50"
                      )}
                      style={{ width: dayWidth }}
                    >
                      <div className="font-medium">{format(date, "d")}</div>
                      {!isMobile && (
                        <div className="text-muted-foreground text-[9px]">
                          {format(date, "EEE")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Rows */}
            {sortedTasks.filter(t => t.due_date).map((task) => {
              const isOverdue =
                task.due_date &&
                isPast(startOfDay(new Date(task.due_date))) &&
                !isToday(new Date(task.due_date)) &&
                task.status !== "completed";

              const isDragging = draggingTask?.id === task.id;
              const dragOffset = isDragging ? dragCurrentX - dragStartX : 0;

              const barPosition = task.due_date
                ? getDatePosition(new Date(task.due_date)) + dragOffset
                : 0;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex border-b border-border/50 hover:bg-muted/20 transition-colors group",
                    isDragging && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  {/* Task Info Column - Compact on mobile */}
                  <div 
                    className={cn(
                      "flex-shrink-0 px-2 py-1.5 border-r border-border flex items-center gap-1.5",
                      isMobile ? "w-[120px]" : "w-[200px]"
                    )}
                  >
                    {/* Drag handle - desktop only */}
                    {!isMobile && isOwner && task.due_date && (
                      <GripVertical 
                        className={cn(
                          "h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab flex-shrink-0",
                          isDragging && "cursor-grabbing text-blue-500"
                        )}
                        onMouseDown={(e) => handleDragStart(e, task)}
                      />
                    )}
                    
                    {/* Avatar - hide on mobile */}
                    {!isMobile && (
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarImage src={task.assignee_avatar} />
                        <AvatarFallback className="text-[10px]">
                          {task.assignee_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Task Title */}
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

                  {/* Timeline Bar Area */}
                  <div className="flex-1 relative h-8">
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {dayHeaders.map((date, i) => {
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium px-2 shadow-sm transition-all cursor-pointer",
                                PRIORITY_COLORS[task.priority] || "bg-slate-500",
                                STATUS_OPACITY[task.status],
                                isOverdue && "ring-2 ring-red-500",
                                isDragging && "cursor-grabbing scale-105 shadow-lg ring-2 ring-blue-400"
                              )}
                              style={{
                                left: Math.max(0, barPosition),
                                minWidth: dayWidth * 1.5,
                              }}
                              onClick={() => !isDragging && onTaskClick?.(task)}
                              onMouseDown={(e) => handleDragStart(e, task)}
                            >
                              {isOverdue && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                              {task.status === "completed" && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                              <span className="truncate max-w-[60px]">
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
                              <div className="text-muted-foreground">
                                Assigned to: {task.assignee_name}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Today line */}
                    {dayHeaders.some(d => isToday(d)) && (
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

      {/* Unscheduled Tasks - Compact */}
      {unscheduledTasks.length > 0 && (
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs font-medium mb-1.5 text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("timeline.unscheduled", "Unscheduled")} ({unscheduledTasks.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unscheduledTasks.map((task) => (
              <Badge
                key={task.id}
                variant="outline"
                className="cursor-pointer hover:bg-muted text-xs py-0.5"
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

export default CompactGanttChart;
