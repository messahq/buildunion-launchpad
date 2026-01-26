import { useState, useMemo, useCallback, useEffect } from "react";
import {
  format,
  differenceInDays,
  addDays,
  startOfDay,
  isToday,
  isPast,
  isFuture,
  min,
  max,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
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
  Lock,
  Unlock,
  ArrowRight,
  AlertOctagon,
  MapPin,
  Users,
  Zap,
  Circle,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ConstructionAlert, ForecastDay } from "@/hooks/useWeather";
import { toast } from "sonner";

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
  assigned_to?: string;
  assignee_name?: string;
  assignee_avatar?: string;
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
  verificationProgress: number;
  locked: boolean;
  lockReason?: string;
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
  delayDays?: number;
  dependencies?: string[];
  conflictStatus?: "none" | "weather" | "gps" | "both";
  conflictMessage?: string;
}

interface TeamMemberLocation {
  userId: string;
  name: string;
  isOnSite: boolean;
  lastSeen?: string;
}

interface HierarchicalTimelineProps {
  tasks: Task[];
  materials?: Array<{ item: string; quantity: number; unit: string }>;
  weatherForecast?: ForecastDay[];
  projectAddress?: string;
  teamLocations?: TeamMemberLocation[];
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  onBulkStatusChange?: (taskIds: string[], newStatus: string) => void;
  onAutoShift?: (shiftedTasks: Array<{ taskId: string; newDueDate: string; shiftDays: number }>) => void;
  // Project timeline integration
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  onProjectDatesChange?: (startDate: Date | null, endDate: Date | null, tasksToShift: Array<{ taskId: string; newDueDate: string; shiftDays: number }>) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const PHASE_CONFIG = [
  { id: "preparation", name: "Preparation", icon: <ClipboardCheck className="h-4 w-4" />, color: "blue" },
  { id: "execution", name: "Execution", icon: <Wrench className="h-4 w-4" />, color: "amber" },
  { id: "verification", name: "Verification", icon: <CheckCircle2 className="h-4 w-4" />, color: "green" },
];

const PHASE_ORDER: Record<string, number> = {
  preparation: 0,
  execution: 1,
  verification: 2,
};

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

// Check if weather conditions conflict with task requirements
function checkWeatherConflict(
  task: Task,
  weatherForecast: ForecastDay[]
): { hasConflict: boolean; alert?: ConstructionAlert } {
  if (!task.due_date) return { hasConflict: false };
  
  const taskDate = format(new Date(task.due_date), "yyyy-MM-dd");
  const forecast = weatherForecast.find(f => f.date === taskDate);
  
  if (!forecast?.alerts?.length) return { hasConflict: false };
  
  const dangerAlert = forecast.alerts.find(a => a.severity === "danger");
  if (dangerAlert) {
    return { hasConflict: true, alert: dangerAlert };
  }
  
  return { hasConflict: false };
}

// Calculate auto-shift for dependent tasks
function calculateAutoShift(
  delayedTask: Task,
  allTasks: Task[],
  delayDays: number
): Array<{ taskId: string; newDueDate: string; shiftDays: number }> {
  if (!delayedTask.due_date || delayDays <= 0) return [];
  
  const delayedDate = new Date(delayedTask.due_date);
  const affectedTasks: Array<{ taskId: string; newDueDate: string; shiftDays: number }> = [];
  
  // Find tasks that come after the delayed task
  allTasks.forEach(task => {
    if (task.id === delayedTask.id || !task.due_date) return;
    
    const taskDate = new Date(task.due_date);
    if (taskDate > delayedDate && task.status !== "completed") {
      const newDate = addDays(taskDate, delayDays);
      affectedTasks.push({
        taskId: task.id,
        newDueDate: format(newDate, "yyyy-MM-dd"),
        shiftDays: delayDays,
      });
    }
  });
  
  return affectedTasks;
}

// ============================================
// MAIN COMPONENT
// ============================================

const HierarchicalTimeline = ({
  tasks,
  materials = [],
  weatherForecast = [],
  projectAddress,
  teamLocations = [],
  onTaskClick,
  onTaskStatusChange,
  onBulkStatusChange,
  onAutoShift,
  projectStartDate,
  projectEndDate,
  onProjectDatesChange,
}: HierarchicalTimelineProps) => {
  const { t } = useTranslation();
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    preparation: true,
    execution: true,
    verification: false,
  });
  const [expandedSubTimelines, setExpandedSubTimelines] = useState<Record<string, boolean>>({});
  const [autoShiftPending, setAutoShiftPending] = useState<Array<{ taskId: string; newDueDate: string; shiftDays: number }>>([]);
  const [showAutoShiftAlert, setShowAutoShiftAlert] = useState(false);
  const [projectDateShiftPending, setProjectDateShiftPending] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    shiftDays: number;
    tasksToShift: Array<{ taskId: string; newDueDate: string; shiftDays: number }>;
  } | null>(null);
  const [showProjectDateShiftAlert, setShowProjectDateShiftAlert] = useState(false);

  // Track previous dates to detect changes
  const [prevProjectDates, setPrevProjectDates] = useState<{ start: Date | null; end: Date | null }>({
    start: projectStartDate || null,
    end: projectEndDate || null,
  });

  // Detect project date changes and calculate task shifts
  useEffect(() => {
    if (!projectStartDate || !prevProjectDates.start) {
      setPrevProjectDates({ start: projectStartDate || null, end: projectEndDate || null });
      return;
    }

    const startChanged = prevProjectDates.start && 
      format(projectStartDate, "yyyy-MM-dd") !== format(prevProjectDates.start, "yyyy-MM-dd");
    
    if (startChanged) {
      const shiftDays = differenceInDays(projectStartDate, prevProjectDates.start);
      
      if (shiftDays !== 0 && tasks.length > 0) {
        // Calculate new dates for all tasks
        const tasksToShift = tasks
          .filter(task => task.due_date && task.status !== "completed")
          .map(task => {
            const currentDate = new Date(task.due_date!);
            const newDate = addDays(currentDate, shiftDays);
            return {
              taskId: task.id,
              newDueDate: format(newDate, "yyyy-MM-dd"),
              shiftDays,
            };
          });

        if (tasksToShift.length > 0) {
          setProjectDateShiftPending({
            startDate: projectStartDate,
            endDate: projectEndDate || null,
            shiftDays,
            tasksToShift,
          });
          setShowProjectDateShiftAlert(true);
        }
      }
    }

    setPrevProjectDates({ start: projectStartDate, end: projectEndDate || null });
  }, [projectStartDate, projectEndDate, tasks]);

  // Handle applying project date shift to tasks
  const handleApplyProjectDateShift = useCallback(() => {
    if (!projectDateShiftPending) return;

    if (onProjectDatesChange) {
      onProjectDatesChange(
        projectDateShiftPending.startDate,
        projectDateShiftPending.endDate,
        projectDateShiftPending.tasksToShift
      );
      toast.success(t("timeline.tasksShifted", "All tasks shifted by {{days}} days", {
        days: projectDateShiftPending.shiftDays > 0 
          ? `+${projectDateShiftPending.shiftDays}` 
          : projectDateShiftPending.shiftDays
      }));
    } else if (onAutoShift) {
      // Fallback to onAutoShift if onProjectDatesChange not provided
      onAutoShift(projectDateShiftPending.tasksToShift);
      toast.success(t("timeline.tasksShifted", "All tasks shifted by {{days}} days", {
        days: projectDateShiftPending.shiftDays
      }));
    }

    setProjectDateShiftPending(null);
    setShowProjectDateShiftAlert(false);
  }, [projectDateShiftPending, onProjectDatesChange, onAutoShift, t]);

  const handleDismissProjectDateShift = useCallback(() => {
    setProjectDateShiftPending(null);
    setShowProjectDateShiftAlert(false);
  }, []);
  // Build hierarchical structure with dependency locks
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

    // Calculate phase dates from project timeline
    // Divide project duration into 3 phases: Preparation (40%), Execution (40%), Verification (20%)
    const getPhaseDate = (phaseIndex: number, isEnd: boolean): Date | null => {
      if (!projectStartDate || !projectEndDate) return null;
      
      const totalDays = differenceInDays(projectEndDate, projectStartDate);
      const phaseDurations = [0.4, 0.4, 0.2]; // 40%, 40%, 20%
      
      let startOffset = 0;
      for (let i = 0; i < phaseIndex; i++) {
        startOffset += phaseDurations[i];
      }
      
      const endOffset = startOffset + phaseDurations[phaseIndex];
      const startDay = Math.floor(totalDays * startOffset);
      const endDay = Math.floor(totalDays * endOffset);
      
      return isEnd ? addDays(projectStartDate, endDay) : addDays(projectStartDate, startDay);
    };

    // Calculate verification progress for each phase
    const getVerificationProgress = (phaseTasks: Task[]): number => {
      // For checklist mode, simply use overall completion
      const completed = phaseTasks.filter(t => t.status === "completed").length;
      return phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0;
    };

    // Create material categories
    const materialCategories = [...new Set(materials.map(m => categorizeMaterial(m.item)))];

    let previousPhaseVerification = 100; // First phase is always unlocked

    return PHASE_CONFIG.map((phaseConfig, phaseIndex) => {
      const phaseTasks = tasksByPhase[phaseConfig.id];
      const verificationProgress = getVerificationProgress(phaseTasks);
      
      // Dependency Lock Logic: Lock phase if previous phase verification < 100%
      const isLocked = phaseIndex > 0 && previousPhaseVerification < 100;
      const lockReason = isLocked 
        ? t("timeline.lockReason", "Previous phase verification not complete ({{percent}}%)", { percent: previousPhaseVerification })
        : undefined;
      
      // Create sub-timelines for each material category
      const subTimelines: SubTimeline[] = materialCategories.map(category => {
        const categoryTasks = phaseTasks.filter(t => {
          const materialForTask = materials.find(m => 
            t.title.toLowerCase().includes(m.item.toLowerCase().split(" ")[0])
          );
          return materialForTask ? categorizeMaterial(materialForTask.item) === category : false;
        });

        const tasksForSub = categoryTasks.length > 0 ? categoryTasks : [];
        
        const datesWithTasks = tasksForSub.filter(t => t.due_date).map(t => new Date(t.due_date!));
        const subStart = datesWithTasks.length > 0 ? min(datesWithTasks) : null;
        const subEnd = datesWithTasks.length > 0 ? max(datesWithTasks) : null;
        
        const completedCount = tasksForSub.filter(t => t.status === "completed").length;
        const progress = tasksForSub.length > 0 ? Math.round((completedCount / tasksForSub.length) * 100) : 0;
        
        // Check delays
        let maxDelayDays = 0;
        const delayed = tasksForSub.some(t => {
          if (t.due_date && isPast(startOfDay(new Date(t.due_date))) && 
              !isToday(new Date(t.due_date)) && 
              t.status !== "completed") {
            const daysDiff = differenceInDays(new Date(), new Date(t.due_date));
            maxDelayDays = Math.max(maxDelayDays, daysDiff);
            return true;
          }
          return false;
        });

        // Check weather/GPS conflicts
        let hasWeatherConflict = false;
        let hasGpsConflict = false;
        let conflictMessage: string | undefined;
        
        tasksForSub.forEach(task => {
          const weatherConflict = checkWeatherConflict(task, weatherForecast);
          if (weatherConflict.hasConflict) {
            hasWeatherConflict = true;
            conflictMessage = weatherConflict.alert?.message;
          }
        });

        // Check GPS/team location conflicts (if team not on site for execution tasks)
        if (phaseConfig.id === "execution" && teamLocations.length > 0) {
          const onSiteCount = teamLocations.filter(m => m.isOnSite).length;
          if (onSiteCount === 0 && tasksForSub.some(t => 
            t.status === "in_progress" || 
            (t.due_date && isToday(new Date(t.due_date)))
          )) {
            hasGpsConflict = true;
            if (!conflictMessage) {
              conflictMessage = t("timeline.noTeamOnSite", "No team members on site");
            }
          }
        }

        // Determine conflict status
        const conflictStatus: "none" | "weather" | "gps" | "both" = 
          hasWeatherConflict && hasGpsConflict ? "both" :
          hasWeatherConflict ? "weather" :
          hasGpsConflict ? "gps" : "none";

        return {
          id: `${phaseConfig.id}-${category}`,
          name: category.charAt(0).toUpperCase() + category.slice(1),
          materialType: category,
          tasks: tasksForSub,
          startDate: subStart,
          endDate: subEnd,
          progress,
          delayed,
          delayDays: maxDelayDays,
          conflictStatus,
          conflictMessage,
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
          name: t("timeline.generalTasks", "General Tasks"),
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

      // Use project dates for phase timeline instead of task dates
      const phaseStart = getPhaseDate(phaseIndex, false);
      const phaseEnd = getPhaseDate(phaseIndex, true);
      
      const totalTasks = phaseTasks.length;
      const completedTasks = phaseTasks.filter(t => t.status === "completed").length;
      const phaseProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Update for next iteration
      previousPhaseVerification = verificationProgress;

      return {
        id: phaseConfig.id,
        name: phaseConfig.name,
        icon: phaseConfig.icon,
        color: phaseConfig.color,
        startDate: phaseStart,
        endDate: phaseEnd,
        subTimelines,
        progress: phaseProgress,
        verificationProgress,
        locked: isLocked,
        lockReason,
      };
    });
  }, [tasks, materials, weatherForecast, teamLocations, t, projectStartDate, projectEndDate]);

  // Detect delays and calculate auto-shift
  useEffect(() => {
    const delayedSubTimelines = phases.flatMap(p => p.subTimelines).filter(s => s.delayed && s.delayDays && s.delayDays > 0);
    
    if (delayedSubTimelines.length > 0) {
      const allShifts: Array<{ taskId: string; newDueDate: string; shiftDays: number }> = [];
      
      delayedSubTimelines.forEach(sub => {
        const delayedTask = sub.tasks.find(t => 
          t.due_date && isPast(startOfDay(new Date(t.due_date))) && 
          !isToday(new Date(t.due_date)) && 
          t.status !== "completed"
        );
        
        if (delayedTask && sub.delayDays) {
          const shifts = calculateAutoShift(delayedTask, tasks, sub.delayDays);
          allShifts.push(...shifts);
        }
      });
      
      if (allShifts.length > 0 && autoShiftPending.length === 0) {
        setAutoShiftPending(allShifts);
        setShowAutoShiftAlert(true);
      }
    }
  }, [phases, tasks, autoShiftPending.length]);

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
    const phase = phases.find(p => p.id === phaseId);
    if (phase?.locked) {
      toast.warning(phase.lockReason || t("timeline.phaseLocked", "This phase is locked"));
      return;
    }
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const toggleSubTimeline = (subId: string, phaseLocked: boolean) => {
    if (phaseLocked) {
      toast.warning(t("timeline.phaseLocked", "This phase is locked"));
      return;
    }
    setExpandedSubTimelines(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  const handleApplyAutoShift = () => {
    if (onAutoShift && autoShiftPending.length > 0) {
      onAutoShift(autoShiftPending);
      toast.success(t("timeline.autoShiftApplied", "Dependent tasks shifted by {{count}} days", { 
        count: autoShiftPending[0]?.shiftDays || 0 
      }));
    }
    setAutoShiftPending([]);
    setShowAutoShiftAlert(false);
  };

  const handleDismissAutoShift = () => {
    setAutoShiftPending([]);
    setShowAutoShiftAlert(false);
  };

  // Bulk complete all tasks in a phase
  const handleBulkCompletePhase = (phaseId: string, complete: boolean) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase || phase.locked) return;
    
    const taskIds = phase.subTimelines.flatMap(sub => sub.tasks.map(t => t.id));
    const newStatus = complete ? "completed" : "pending";
    
    if (onBulkStatusChange && taskIds.length > 0) {
      onBulkStatusChange(taskIds, newStatus);
      toast.success(
        complete 
          ? t("timeline.phaseCompleted", "All {{count}} tasks in {{phase}} marked complete!", { count: taskIds.length, phase: phase.name })
          : t("timeline.phaseReset", "All tasks in {{phase}} reset", { phase: phase.name })
      );
    }
  };

  // Bulk complete all tasks in a material category
  const handleBulkCompleteCategory = (subId: string, phaseId: string, complete: boolean) => {
    const phase = phases.find(p => p.id === phaseId);
    const sub = phase?.subTimelines.find(s => s.id === subId);
    if (!sub || phase?.locked) return;
    
    const taskIds = sub.tasks.map(t => t.id);
    const newStatus = complete ? "completed" : "pending";
    
    if (onBulkStatusChange && taskIds.length > 0) {
      onBulkStatusChange(taskIds, newStatus);
      toast.success(
        complete 
          ? t("timeline.categoryCompleted", "All {{count}} {{category}} tasks complete!", { count: taskIds.length, category: sub.name })
          : t("timeline.categoryReset", "{{category}} tasks reset", { category: sub.name })
      );
    }
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
      {/* Project Date Shift Alert - triggered when project timeline changes */}
      {showProjectDateShiftAlert && projectDateShiftPending && (
        <Alert className="border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30">
          <CalendarIcon className="h-4 w-4 text-cyan-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-cyan-800 dark:text-cyan-200">
              {t("timeline.projectDatesChanged", "Project timeline changed: Shift {{count}} tasks by {{days}} days?", { 
                count: projectDateShiftPending.tasksToShift.length,
                days: projectDateShiftPending.shiftDays > 0 
                  ? `+${projectDateShiftPending.shiftDays}` 
                  : projectDateShiftPending.shiftDays
              })}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDismissProjectDateShift}>
                {t("common.keepOriginal", "Keep Original")}
              </Button>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleApplyProjectDateShift}>
                <ArrowRight className="h-3 w-3 mr-1" />
                {t("timeline.shiftAll", "Shift All Tasks")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Shift Alert - triggered by task delays */}
      {showAutoShiftAlert && autoShiftPending.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/30">
          <Zap className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              {t("timeline.autoShiftDetected", "Delay detected: {{count}} dependent tasks need to shift", { 
                count: autoShiftPending.length 
              })}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDismissAutoShift}>
                {t("common.dismiss", "Dismiss")}
              </Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={handleApplyAutoShift}>
                <ArrowRight className="h-3 w-3 mr-1" />
                {t("timeline.applyShift", "Apply Shift")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">
            {t("timeline.hierarchical", "Project Phases")}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{tasks.length} {t("common.tasks", "tasks")}</span>
          <span>•</span>
          <span>{materials.length} {t("common.materials", "materials")}</span>
          {teamLocations.length > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {teamLocations.filter(m => m.isOnSite).length}/{teamLocations.length} {t("timeline.onSite", "on site")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Dependency Flow Indicator */}
      <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-muted/30 text-xs">
        {phases.map((phase, idx) => (
          <div key={phase.id} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded",
              phase.locked 
                ? "bg-muted text-muted-foreground opacity-50" 
                : phase.verificationProgress === 100 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
            )}>
              {phase.locked ? <Lock className="h-3 w-3" /> : phase.verificationProgress === 100 ? <CheckCircle2 className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              <span>{phase.name}</span>
              <span className="font-medium">{phase.verificationProgress}%</span>
            </div>
            {idx < phases.length - 1 && (
              <ArrowRight className={cn(
                "h-4 w-4",
                phases[idx + 1]?.locked ? "text-muted-foreground opacity-30" : "text-amber-500"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Phase Timelines */}
      <div className="space-y-3">
        {phases.map(phase => {
          const isExpanded = expandedPhases[phase.id];
          const hasDelayed = phase.subTimelines.some(s => s.delayed);
          const hasConflict = phase.subTimelines.some(s => s.conflictStatus !== "none");

          return (
            <Collapsible key={phase.id} open={isExpanded && !phase.locked} onOpenChange={() => togglePhase(phase.id)}>
              {/* Phase Header */}
              <CollapsibleTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    phase.locked && "opacity-60 cursor-not-allowed",
                    hasConflict && !phase.locked && "border-red-500 ring-1 ring-red-200",
                    !phase.locked && phase.color === "blue" && "bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 hover:bg-blue-100/50",
                    !phase.locked && phase.color === "amber" && "bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 hover:bg-amber-100/50",
                    !phase.locked && phase.color === "green" && "bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800 hover:bg-green-100/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {phase.locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div className={cn(
                      "p-1.5 rounded",
                      phase.locked && "bg-muted text-muted-foreground",
                      !phase.locked && phase.color === "blue" && "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
                      !phase.locked && phase.color === "amber" && "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
                      !phase.locked && phase.color === "green" && "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200"
                    )}>
                      {phase.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{phase.name}</span>
                        {phase.locked && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Lock className="h-3 w-3 mr-0.5" />
                            {t("timeline.locked", "Locked")}
                          </Badge>
                        )}
                        {hasDelayed && !phase.locked && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            {t("timeline.delayed", "Delayed")}
                          </Badge>
                        )}
                        {hasConflict && !phase.locked && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-600">
                            <AlertOctagon className="h-3 w-3 mr-0.5" />
                            {t("timeline.conflict", "Conflict")}
                          </Badge>
                        )}
                      </div>
                      {phase.startDate && phase.endDate && !phase.locked && (
                        <span className="text-xs text-muted-foreground">
                          {format(phase.startDate, "MMM d")} - {format(phase.endDate, "MMM d")}
                        </span>
                      )}
                      {phase.locked && phase.lockReason && (
                        <span className="text-xs text-muted-foreground">
                          {phase.lockReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!phase.locked && (
                      <>
                        {/* Bulk Action Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-7 px-2 gap-1",
                                  phase.progress === 100 
                                    ? "text-green-600 hover:text-amber-600" 
                                    : "text-muted-foreground hover:text-green-600"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBulkCompletePhase(phase.id, phase.progress < 100);
                                }}
                              >
                                {phase.progress === 100 ? (
                                  <>
                                    <Square className="h-3.5 w-3.5" />
                                    <span className="text-xs hidden sm:inline">{t("timeline.resetAll", "Reset")}</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckSquare className="h-3.5 w-3.5" />
                                    <span className="text-xs hidden sm:inline">{t("timeline.completeAll", "Complete All")}</span>
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {phase.progress === 100 
                                ? t("timeline.resetAllTooltip", "Reset all tasks in this phase")
                                : t("timeline.completeAllTooltip", "Mark all tasks complete")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{t("common.progress", "Progress")}</span>
                            <span className="font-medium">{phase.progress}%</span>
                          </div>
                          <Progress value={phase.progress} className="h-1.5" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {phase.subTimelines.reduce((sum, s) => sum + s.tasks.length, 0)} {t("common.tasks", "tasks")}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Sub-Timelines */}
              <CollapsibleContent>
                <div className="ml-6 mt-2 space-y-2">
                  {phase.subTimelines.map(sub => {
                    const subExpanded = expandedSubTimelines[sub.id];

                    return (
                      <Collapsible key={sub.id} open={subExpanded} onOpenChange={() => toggleSubTimeline(sub.id, phase.locked)}>
                        <CollapsibleTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                              sub.conflictStatus !== "none"
                                ? "bg-red-50/50 border-red-300 dark:bg-red-950/30 dark:border-red-700 ring-1 ring-red-200"
                                : sub.delayed 
                                  ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                                  : "bg-muted/30 border-border hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {subExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{sub.name}</span>
                              {sub.delayed && (
                                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                                  +{sub.delayDays}d
                                </Badge>
                              )}
                              {sub.conflictStatus === "weather" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Cloud className="h-3.5 w-3.5 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-red-600">{sub.conflictMessage}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {sub.conflictStatus === "gps" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <MapPin className="h-3.5 w-3.5 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-red-600">{sub.conflictMessage}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {sub.conflictStatus === "both" && (
                                <Badge variant="destructive" className="text-[10px]">
                                  <AlertOctagon className="h-3 w-3 mr-0.5" />
                                  2 conflicts
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Bulk Action for Category */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-6 w-6 p-0",
                                        sub.progress === 100 
                                          ? "text-green-600 hover:text-amber-600" 
                                          : "text-muted-foreground hover:text-green-600"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBulkCompleteCategory(sub.id, phase.id, sub.progress < 100);
                                      }}
                                    >
                                      {sub.progress === 100 ? (
                                        <Square className="h-3.5 w-3.5" />
                                      ) : (
                                        <CheckSquare className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {sub.progress === 100 
                                      ? t("timeline.resetCategory", "Reset all {{category}} tasks", { category: sub.name })
                                      : t("timeline.completeCategory", "Complete all {{category}} tasks", { category: sub.name })}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <Progress value={sub.progress} className="h-1 w-16" />
                              <Badge variant="outline" className="text-xs">
                                {sub.tasks.length}
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-5 mt-2 space-y-1.5">
                            {sub.tasks.map(task => {
                              const weatherAlert = hasWeatherIssue(task);
                              const isCompleted = task.status === "completed";

                              const handleCheckboxChange = (checked: boolean) => {
                                const newStatus = checked ? "completed" : "pending";
                                if (onTaskStatusChange) {
                                  onTaskStatusChange(task.id, newStatus);
                                  toast.success(
                                    checked 
                                      ? t("timeline.taskChecked", "Task completed!") 
                                      : t("timeline.taskUnchecked", "Task unchecked")
                                  );
                                }
                              };

                              return (
                                <div 
                                  key={task.id}
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer group",
                                    isCompleted 
                                      ? "bg-green-50/70 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                                      : weatherAlert
                                      ? "bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-700"
                                      : "bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-border"
                                  )}
                                  onClick={() => handleCheckboxChange(!isCompleted)}
                                >
                                  {/* Checkbox */}
                                  <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={handleCheckboxChange}
                                    className={cn(
                                      "h-5 w-5 rounded-full border-2 transition-all",
                                      isCompleted 
                                        ? "border-green-500 bg-green-500 text-white data-[state=checked]:bg-green-500" 
                                        : "border-muted-foreground/50 group-hover:border-primary"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  
                                  {/* Task Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-sm font-medium truncate",
                                        isCompleted && "line-through text-muted-foreground"
                                      )}>
                                        {task.title}
                                      </span>
                                      {weatherAlert && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Cloud className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-red-600">⚠ {weatherAlert.message}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                    {task.description && (
                                      <p className={cn(
                                        "text-xs truncate mt-0.5",
                                        isCompleted ? "text-muted-foreground/50" : "text-muted-foreground"
                                      )}>
                                        {task.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Status indicator */}
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 group-hover:text-muted-foreground/50" />
                                  )}
                                </div>
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
          <span className="text-muted-foreground">{t("timeline.preparation", "Preparation")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">{t("timeline.execution", "Execution")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">{t("timeline.verification", "Verification")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t("timeline.dependencyLock", "Dependency Lock")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertOctagon className="h-3 w-3 text-red-500" />
          <span className="text-muted-foreground">{t("timeline.conflictAlert", "Conflict Alert")}</span>
        </div>
      </div>
    </div>
  );
};

export default HierarchicalTimeline;
