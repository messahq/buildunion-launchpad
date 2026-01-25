import { useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  isPast,
  startOfDay,
  getDay,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flag,
  GripVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface TaskTimelineCalendarProps {
  tasks: Task[];
  isOwner: boolean;
  onTaskClick?: (task: Task) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 border-slate-300 text-slate-700",
  medium: "bg-amber-100 border-amber-300 text-amber-700",
  high: "bg-orange-100 border-orange-300 text-orange-700",
  urgent: "bg-red-100 border-red-300 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-l-slate-400",
  in_progress: "border-l-blue-500",
  completed: "border-l-green-500",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TaskTimelineCalendar = ({
  tasks,
  isOwner,
  onTaskClick,
}: TaskTimelineCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for the start of the month
  const startDayOfWeek = getDay(monthStart);
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => null);

  const getTasksForDay = useCallback(
    (day: Date) => {
      return tasks.filter(
        (task) => task.due_date && isSameDay(new Date(task.due_date), day)
      );
    },
    [tasks]
  );

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!isOwner || task.status === "completed") return;
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    if (!draggedTask || !isOwner) return;
    setDragOverDate(day);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    if (!draggedTask || !isOwner || isUpdating) return;

    const oldDate = draggedTask.due_date
      ? new Date(draggedTask.due_date)
      : null;
    if (oldDate && isSameDay(oldDate, day)) {
      setDraggedTask(null);
      setDragOverDate(null);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ due_date: day.toISOString() })
        .eq("id", draggedTask.id);

      if (error) throw error;
      toast.success(`Task rescheduled to ${format(day, "MMM d, yyyy")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reschedule task");
    } finally {
      setDraggedTask(null);
      setDragOverDate(null);
      setIsUpdating(false);
    }
  };

  const handleDayClick = (day: Date) => {
    const dayTasks = getTasksForDay(day);
    if (dayTasks.length > 0) {
      setSelectedDayTasks(dayTasks);
      setSelectedDate(day);
    }
  };

  const unscheduledTasks = tasks.filter((t) => !t.due_date);

  const handleUnscheduledDrop = async (e: React.DragEvent, day: Date) => {
    // For unscheduled tasks being dropped on calendar
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !isOwner || isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ due_date: day.toISOString() })
        .eq("id", task.id);

      if (error) throw error;
      toast.success(`Task scheduled for ${format(day, "MMM d, yyyy")}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule task");
    } finally {
      setDraggedTask(null);
      setDragOverDate(null);
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-slate-900">Task Timeline</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-200 border-l-2 border-l-slate-400" />
          <span className="text-slate-600">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100 border-l-2 border-l-blue-500" />
          <span className="text-slate-600">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border-l-2 border-l-green-500" />
          <span className="text-slate-600">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-slate-600">Overdue</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-slate-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Padding days */}
          {paddingDays.map((_, index) => (
            <div
              key={`padding-${index}`}
              className="min-h-[100px] bg-slate-50/50 border-b border-r border-slate-100"
            />
          ))}

          {/* Actual days */}
          {days.map((day) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
            const isPastDay = isPast(startOfDay(day)) && !isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] p-1 border-b border-r border-slate-100 transition-colors",
                  !isCurrentMonth && "bg-slate-50/50",
                  isToday(day) && "bg-amber-50/50",
                  isDragOver && "bg-cyan-50 ring-2 ring-inset ring-cyan-400",
                  isPastDay && dayTasks.some((t) => t.status !== "completed") && "bg-red-50/30"
                )}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  handleDrop(e, day);
                  handleUnscheduledDrop(e, day);
                }}
                onClick={() => handleDayClick(day)}
              >
                {/* Day Number */}
                <div
                  className={cn(
                    "text-xs font-medium mb-1 flex items-center justify-between",
                    isToday(day)
                      ? "text-amber-700"
                      : isCurrentMonth
                      ? "text-slate-700"
                      : "text-slate-400"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded-full",
                      isToday(day) && "bg-amber-600 text-white"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      +{dayTasks.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Task Pills */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => {
                    const isOverdue =
                      isPast(startOfDay(new Date(task.due_date!))) &&
                      !isToday(new Date(task.due_date!)) &&
                      task.status !== "completed";

                    return (
                      <TooltipProvider key={task.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              draggable={isOwner && task.status !== "completed"}
                              onDragStart={(e) => handleDragStart(e, task)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskClick?.(task);
                              }}
                              className={cn(
                                "group relative text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer border-l-2 transition-all",
                                STATUS_COLORS[task.status],
                                task.status === "completed"
                                  ? "bg-green-50 text-green-700 opacity-60"
                                  : isOverdue
                                  ? "bg-red-50 text-red-700 border-l-red-500"
                                  : "bg-slate-50 hover:bg-slate-100",
                                isOwner &&
                                  task.status !== "completed" &&
                                  "cursor-grab active:cursor-grabbing"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {isOwner && task.status !== "completed" && (
                                  <GripVertical className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                )}
                                {isOverdue && (
                                  <AlertTriangle className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />
                                )}
                                {task.status === "completed" && (
                                  <CheckCircle2 className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                                )}
                                <span className="truncate">{task.title}</span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-[250px]"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    PRIORITY_COLORS[task.priority]
                                  )}
                                >
                                  <Flag className="h-2 w-2 mr-0.5" />
                                  {task.priority}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {task.assignee_name}
                                </span>
                              </div>
                              {isOwner && task.status !== "completed" && (
                                <p className="text-[10px] text-muted-foreground italic">
                                  Drag to reschedule
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50">
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Unscheduled ({unscheduledTasks.length})
            {isOwner && (
              <span className="text-slate-400 font-normal ml-1">
                — Drag to calendar
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                draggable={isOwner && task.status !== "completed"}
                onDragStart={(e) => handleDragStart(e, task)}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  "text-xs px-2 py-1 rounded border cursor-pointer transition-colors",
                  PRIORITY_COLORS[task.priority],
                  isOwner &&
                    task.status !== "completed" &&
                    "cursor-grab active:cursor-grabbing hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isOwner && task.status !== "completed" && (
                    <GripVertical className="h-3 w-3 text-slate-400" />
                  )}
                  <span>{task.title}</span>
                  {task.assignee_avatar && (
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={task.assignee_avatar} />
                      <AvatarFallback className="text-[8px]">
                        {task.assignee_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Detail Dialog */}
      <Dialog
        open={!!selectedDayTasks}
        onOpenChange={() => {
          setSelectedDayTasks(null);
          setSelectedDate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-amber-600" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {selectedDayTasks?.length} task
              {selectedDayTasks?.length !== 1 ? "s" : ""} scheduled
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedDayTasks?.map((task) => {
              const isOverdue =
                task.due_date &&
                isPast(startOfDay(new Date(task.due_date))) &&
                !isToday(new Date(task.due_date)) &&
                task.status !== "completed";

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    onTaskClick?.(task);
                    setSelectedDayTasks(null);
                  }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm",
                    task.status === "completed"
                      ? "bg-green-50 border-green-200"
                      : isOverdue
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : isOverdue ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                        <p
                          className={cn(
                            "font-medium text-sm truncate",
                            task.status === "completed" && "line-through text-slate-500"
                          )}
                        >
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 pl-6">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] flex-shrink-0", PRIORITY_COLORS[task.priority])}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-6">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee_avatar} />
                      <AvatarFallback className="text-[10px] bg-slate-100">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-slate-500">
                      {task.assignee_name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskTimelineCalendar;
