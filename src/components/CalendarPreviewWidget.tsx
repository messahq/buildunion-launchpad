import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeather, getWeatherIconUrl } from "@/hooks/useWeather";

interface Task {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
}

interface CalendarPreviewWidgetProps {
  projectId: string | null;
  projectAddress?: string | null;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-300",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
};

const CalendarPreviewWidget = ({ projectId, projectAddress }: CalendarPreviewWidgetProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Weather integration
  const { getWeatherForDate, loading: weatherLoading } = useWeather({
    location: projectAddress || undefined,
    days: 5,
    enabled: !!projectAddress
  });

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    } else {
      setTasks([]);
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchTasks = async () => {
    if (!projectId) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, project_id, title, priority, status, due_date")
        .eq("project_id", projectId)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      if (!error && data) {
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching tasks for calendar:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`calendar-preview-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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

  if (!projectId) {
    return (
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Task Calendar</h3>
          </div>
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <CalendarDays className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a project</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">to view its calendar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Task Calendar</h3>
          </div>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Task Calendar</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="font-medium text-xs min-w-[80px] text-center">
              {format(currentMonth, "MMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[10px] mb-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-slate-500">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-500">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-slate-500">Done</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
            <span className="text-slate-500">Overdue</span>
          </div>
        </div>

        {/* Mini Calendar Grid */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
            {WEEKDAYS.map((day, i) => (
              <div
                key={`${day}-${i}`}
                className="py-1 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400"
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
                className="h-8 bg-slate-50/50 dark:bg-slate-800/50 border-b border-r border-slate-100 dark:border-slate-700"
              />
            ))}

            {/* Actual days */}
            {days.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isPastDay = isPast(startOfDay(day)) && !isToday(day);
              const hasOverdue = dayTasks.some(
                t => t.status !== "completed" && isPast(startOfDay(new Date(t.due_date!))) && !isToday(new Date(t.due_date!))
              );
              
              // Get weather for this day
              const dateStr = format(day, "yyyy-MM-dd");
              const dayWeather = getWeatherForDate(dateStr);

              return (
                <TooltipProvider key={day.toISOString()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-8 p-0.5 border-b border-r border-slate-100 dark:border-slate-700 transition-colors relative",
                          !isCurrentMonth && "bg-slate-50/50 dark:bg-slate-800/50",
                          isToday(day) && "bg-amber-50 dark:bg-amber-900/20",
                          hasOverdue && "bg-red-50/50 dark:bg-red-900/20"
                        )}
                      >
                        {/* Day Number */}
                        <div className="flex items-start justify-between">
                          <span
                            className={cn(
                              "text-[10px] font-medium w-4 h-4 flex items-center justify-center rounded-full",
                              isToday(day)
                                ? "bg-amber-600 text-white"
                                : isCurrentMonth
                                ? "text-slate-700 dark:text-slate-300"
                                : "text-slate-400 dark:text-slate-500"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {/* Weather mini icon */}
                          {dayWeather && (
                            <img 
                              src={getWeatherIconUrl(dayWeather.icon)}
                              alt=""
                              className="h-3 w-3 opacity-60"
                            />
                          )}
                        </div>

                        {/* Task dots */}
                        {dayTasks.length > 0 && (
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayTasks.slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  hasOverdue && task.status !== "completed"
                                    ? "bg-red-500"
                                    : STATUS_COLORS[task.status] || "bg-slate-300"
                                )}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[8px] text-slate-400">+</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {dayTasks.length > 0 && (
                      <TooltipContent side="top" className="max-w-[180px]">
                        <div className="space-y-1">
                          <p className="text-xs font-medium">{format(day, "MMM d, yyyy")}</p>
                          {dayTasks.slice(0, 4).map((task) => (
                            <div key={task.id} className="flex items-center gap-1.5 text-[10px]">
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                              ) : task.status === "in_progress" ? (
                                <Clock className="h-2.5 w-2.5 text-blue-500" />
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                              )}
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                          {dayTasks.length > 4 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{dayTasks.length - 4} more
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Task count summary */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>{tasks.filter(t => t.status !== "completed").length} tasks pending</span>
          <span>{tasks.filter(t => t.status === "completed").length} completed</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarPreviewWidget;
