import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  Package,
  Wrench,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ConstructionAlert, ForecastDay } from "@/hooks/useWeather";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  material_category?: string;
}

interface TimelinePhase {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  startDate: Date | null;
  endDate: Date | null;
  subTimelines: SubTimeline[];
  progress: number;
}

interface SubTimeline {
  id: string;
  name: string;
  materialType?: string;
  tasks: Task[];
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  delayed: boolean;
}

interface HierarchicalTimelineProps {
  tasks: Task[];
  materials?: Array<{ item: string; quantity: number; unit: string }>;
  weatherForecast?: ForecastDay[];
  projectAddress?: string;
  onTaskClick?: (task: Task) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const PHASE_CONFIG = [
  { id: "preparation", name: "Preparation", icon: <ClipboardCheck className="h-4 w-4" />, color: "blue" },
  { id: "execution", name: "Execution", icon: <Wrench className="h-4 w-4" />, color: "amber" },
  { id: "verification", name: "Verification", icon: <CheckCircle2 className="h-4 w-4" />, color: "green" },
];

const MATERIAL_CATEGORIES: Record<string, string[]> = {
  flooring: ["Laminate Flooring", "Hardwood Flooring", "Vinyl Flooring", "Tile", "Carpet"],
  underlayment: ["Underlayment", "Vapor Barrier", "Padding"],
  trim: ["Baseboard", "Molding", "Transition Strips", "Quarter Round"],
  supplies: ["Adhesive", "Nails", "Screws", "Spacers"],
};

function categorizeMaterial(item: string): string {
  const itemLower = item.toLowerCase();
  for (const [category, keywords] of Object.entries(MATERIAL_CATEGORIES)) {
    if (keywords.some(k => itemLower.includes(k.toLowerCase()))) {
      return category;
    }
  }
  return "other";
}

function getPhaseForTask(task: Task): string {
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
}

// ============================================
// MAIN COMPONENT
// ============================================

const HierarchicalTimeline = ({
  tasks,
  materials = [],
  weatherForecast = [],
  projectAddress,
  onTaskClick,
}: HierarchicalTimelineProps) => {
  const { t } = useTranslation();
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    preparation: true,
    execution: true,
    verification: false,
  });
  const [expandedSubTimelines, setExpandedSubTimelines] = useState<Record<string, boolean>>({});

  // Build hierarchical structure
  const phases = useMemo<TimelinePhase[]>(() => {
    // Group tasks by phase
    const tasksByPhase: Record<string, Task[]> = {
      preparation: [],
      execution: [],
      verification: [],
    };

    tasks.forEach(task => {
      const phase = getPhaseForTask(task);
      tasksByPhase[phase].push(task);
    });

    // Create sub-timelines based on materials
    const materialCategories = [...new Set(materials.map(m => categorizeMaterial(m.item)))];

    return PHASE_CONFIG.map(phaseConfig => {
      const phaseTasks = tasksByPhase[phaseConfig.id];
      
      // Create sub-timelines for each material category
      const subTimelines: SubTimeline[] = materialCategories.map(category => {
        const categoryTasks = phaseTasks.filter(t => {
          const materialForTask = materials.find(m => 
            t.title.toLowerCase().includes(m.item.toLowerCase().split(" ")[0])
          );
          return materialForTask ? categorizeMaterial(materialForTask.item) === category : false;
        });

        // If no specific material tasks, include general tasks
        const tasksForSub = categoryTasks.length > 0 ? categoryTasks : [];
        
        const datesWithTasks = tasksForSub.filter(t => t.due_date).map(t => new Date(t.due_date!));
        const subStart = datesWithTasks.length > 0 ? min(datesWithTasks) : null;
        const subEnd = datesWithTasks.length > 0 ? max(datesWithTasks) : null;
        
        const completedCount = tasksForSub.filter(t => t.status === "completed").length;
        const progress = tasksForSub.length > 0 ? Math.round((completedCount / tasksForSub.length) * 100) : 0;
        
        // Check if any task is overdue
        const delayed = tasksForSub.some(t => 
          t.due_date && isPast(startOfDay(new Date(t.due_date))) && 
          !isToday(new Date(t.due_date)) && 
          t.status !== "completed"
        );

        return {
          id: `${phaseConfig.id}-${category}`,
          name: category.charAt(0).toUpperCase() + category.slice(1),
          materialType: category,
          tasks: tasksForSub,
          startDate: subStart,
          endDate: subEnd,
          progress,
          delayed,
        };
      }).filter(sub => sub.tasks.length > 0);

      // Add uncategorized tasks
      const uncategorizedTasks = phaseTasks.filter(t => {
        const hasCategory = subTimelines.some(sub => sub.tasks.includes(t));
        return !hasCategory;
      });

      if (uncategorizedTasks.length > 0) {
        const datesWithTasks = uncategorizedTasks.filter(t => t.due_date).map(t => new Date(t.due_date!));
        const subStart = datesWithTasks.length > 0 ? min(datesWithTasks) : null;
        const subEnd = datesWithTasks.length > 0 ? max(datesWithTasks) : null;
        const completedCount = uncategorizedTasks.filter(t => t.status === "completed").length;
        const progress = uncategorizedTasks.length > 0 ? Math.round((completedCount / uncategorizedTasks.length) * 100) : 0;

        subTimelines.push({
          id: `${phaseConfig.id}-general`,
          name: "General Tasks",
          tasks: uncategorizedTasks,
          startDate: subStart,
          endDate: subEnd,
          progress,
          delayed: uncategorizedTasks.some(t => 
            t.due_date && isPast(startOfDay(new Date(t.due_date))) && 
            !isToday(new Date(t.due_date)) && 
            t.status !== "completed"
          ),
        });
      }

      // Calculate phase dates and progress
      const allSubDates = subTimelines.flatMap(s => [s.startDate, s.endDate].filter(Boolean) as Date[]);
      const phaseStart = allSubDates.length > 0 ? min(allSubDates) : null;
      const phaseEnd = allSubDates.length > 0 ? max(allSubDates) : null;
      
      const totalTasks = phaseTasks.length;
      const completedTasks = phaseTasks.filter(t => t.status === "completed").length;
      const phaseProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: phaseConfig.id,
        name: phaseConfig.name,
        icon: phaseConfig.icon,
        color: phaseConfig.color,
        startDate: phaseStart,
        endDate: phaseEnd,
        subTimelines,
        progress: phaseProgress,
      };
    });
  }, [tasks, materials]);

  // Get weather alerts for a date
  const getWeatherAlertsForDate = (date: Date): ConstructionAlert[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const forecast = weatherForecast.find(f => f.date === dateStr);
    return forecast?.alerts || [];
  };

  // Check if a task has weather issues
  const hasWeatherIssue = (task: Task): ConstructionAlert | null => {
    if (!task.due_date) return null;
    const alerts = getWeatherAlertsForDate(new Date(task.due_date));
    return alerts.find(a => a.severity === "danger") || null;
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const toggleSubTimeline = (subId: string) => {
    setExpandedSubTimelines(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">
            {t("timeline.hierarchical", "Project Phases")}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{tasks.length} tasks</span>
          <span>•</span>
          <span>{materials.length} materials</span>
        </div>
      </div>

      {/* Phase Timelines */}
      <div className="space-y-3">
        {phases.map(phase => {
          const isExpanded = expandedPhases[phase.id];
          const hasDelayed = phase.subTimelines.some(s => s.delayed);

          return (
            <Collapsible key={phase.id} open={isExpanded} onOpenChange={() => togglePhase(phase.id)}>
              {/* Phase Header */}
              <CollapsibleTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    phase.color === "blue" && "bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 hover:bg-blue-100/50",
                    phase.color === "amber" && "bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 hover:bg-amber-100/50",
                    phase.color === "green" && "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800 hover:bg-green-100/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div className={cn(
                      "p-1.5 rounded",
                      phase.color === "blue" && "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
                      phase.color === "amber" && "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
                      phase.color === "green" && "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200"
                    )}>
                      {phase.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{phase.name}</span>
                        {hasDelayed && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            Delayed
                          </Badge>
                        )}
                      </div>
                      {phase.startDate && phase.endDate && (
                        <span className="text-xs text-muted-foreground">
                          {format(phase.startDate, "MMM d")} - {format(phase.endDate, "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{phase.progress}%</span>
                      </div>
                      <Progress value={phase.progress} className="h-1.5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {phase.subTimelines.reduce((sum, s) => sum + s.tasks.length, 0)} tasks
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Sub-Timelines */}
              <CollapsibleContent>
                <div className="ml-6 mt-2 space-y-2">
                  {phase.subTimelines.map(sub => {
                    const subExpanded = expandedSubTimelines[sub.id];

                    return (
                      <Collapsible key={sub.id} open={subExpanded} onOpenChange={() => toggleSubTimeline(sub.id)}>
                        <CollapsibleTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                              sub.delayed 
                                ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {subExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{sub.name}</span>
                              {sub.delayed && (
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={sub.progress} className="h-1 w-16" />
                              <Badge variant="outline" className="text-xs">
                                {sub.tasks.length}
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-5 mt-1 space-y-1">
                            {sub.tasks.map(task => {
                              const weatherAlert = hasWeatherIssue(task);
                              const isOverdue = task.due_date && 
                                isPast(startOfDay(new Date(task.due_date))) && 
                                !isToday(new Date(task.due_date)) && 
                                task.status !== "completed";

                              return (
                                <TooltipProvider key={task.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => onTaskClick?.(task)}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors",
                                          task.status === "completed" 
                                            ? "bg-green-50/50 dark:bg-green-950/20 text-muted-foreground line-through"
                                            : isOverdue
                                            ? "bg-red-50/50 dark:bg-red-950/20 border-l-2 border-red-500"
                                            : "bg-muted/20 hover:bg-muted/40"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          {task.status === "completed" ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                          ) : isOverdue ? (
                                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                          ) : (
                                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                          )}
                                          <span className="truncate max-w-[200px]">{task.title}</span>
                                          {weatherAlert && (
                                            <Cloud className="h-3.5 w-3.5 text-amber-500" />
                                          )}
                                        </div>
                                        {task.due_date && (
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(task.due_date), "MMM d")}
                                          </span>
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <p className="font-medium">{task.title}</p>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground max-w-[250px]">{task.description}</p>
                                        )}
                                        {weatherAlert && (
                                          <div className="flex items-center gap-1 text-amber-600 text-xs">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>⚠ {weatherAlert.message}</span>
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs pt-2 border-t">
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
          <Cloud className="h-3 w-3 text-amber-500" />
          <span className="text-muted-foreground">Weather Warning</span>
        </div>
      </div>
    </div>
  );
};

export default HierarchicalTimeline;