import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarClock, 
  Clock,
  Settings2,
  CalendarDays,
  AlertTriangle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { useTranslation } from "react-i18next";

export interface ProjectTimelineBarProps {
  projectStartDate: Date | null;
  projectEndDate: Date | null;
  onDatesChange?: (startDate: Date | null, endDate: Date | null) => void;
  isEditable?: boolean;
  className?: string;
  /** Task-based completion progress (0-100) - overrides time-based calculation */
  taskProgress?: number;
  /** Number of completed tasks */
  completedTasks?: number;
  /** Total number of tasks */
  totalTasks?: number;
}

export default function ProjectTimelineBar({
  projectStartDate,
  projectEndDate,
  onDatesChange,
  isEditable = false,
  className,
  taskProgress,
  completedTasks = 0,
  totalTasks = 0,
}: ProjectTimelineBarProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState<Date | null>(projectStartDate);
  const [endDate, setEndDate] = useState<Date | null>(projectEndDate);

  useEffect(() => {
    setStartDate(projectStartDate);
    setEndDate(projectEndDate);
  }, [projectStartDate, projectEndDate]);

  const today = new Date();
  
  // Calculate timeline metrics
  const totalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  const daysElapsed = startDate ? Math.max(0, differenceInDays(today, startDate)) : 0;
  const daysRemaining = endDate ? Math.max(0, differenceInDays(endDate, today)) : 0;
  
  // Use task progress if provided, otherwise fall back to time-based progress
  const timeBasedProgress = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0;
  const progressPercent = taskProgress !== undefined ? taskProgress : timeBasedProgress;
  
  const isOverdue = endDate && isAfter(today, endDate);
  const isNotStarted = startDate && isBefore(today, startDate);
  const isActive = startDate && endDate && !isOverdue && !isNotStarted;

  const handleStartDateChange = (date: Date | undefined) => {
    const newStart = date || null;
    setStartDate(newStart);
    onDatesChange?.(newStart, endDate);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    const newEnd = date || null;
    setEndDate(newEnd);
    onDatesChange?.(startDate, newEnd);
  };

  const getStatusColor = () => {
    if (isOverdue) return "border-destructive bg-destructive/10";
    if (isNotStarted) return "border-muted bg-muted/50";
    if (isActive) return "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10";
    return "border-border bg-muted/30";
  };

  const getProgressColor = () => {
    if (isOverdue) return "bg-destructive";
    if (progressPercent > 75) return "bg-amber-500";
    return "bg-gradient-to-r from-cyan-500 to-teal-500";
  };

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 mb-4 transition-all",
      getStatusColor(),
      className
    )}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left side - Timeline info */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isOverdue 
              ? "bg-destructive/20 text-destructive" 
              : "bg-amber-500/20 text-amber-600"
          )}>
            <CalendarClock className="h-5 w-5" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {t("projectTimeline.title", "Project Timeline")}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  OVERDUE
                </Badge>
              )}
              {isNotStarted && startDate && (
                <Badge variant="outline" className="text-[10px]">
                  <Clock className="h-3 w-3 mr-1" />
                  {t("projectTimeline.startsIn", "Starts in")} {Math.abs(differenceInDays(today, startDate))} {t("projectTimeline.days", "days")}
                </Badge>
              )}
              {isActive && (
                <Badge className="text-[10px] bg-amber-500/20 text-amber-600">
                  <Zap className="h-3 w-3 mr-1" />
                  {t("projectTimeline.active", "ACTIVE")}
                </Badge>
              )}
            </div>
            
            {/* Date display or picker */}
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {startDate && endDate ? (
                <>
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    {format(startDate, "MMM d")} → {format(endDate, "MMM d, yyyy")}
                  </span>
                  <span className="text-foreground font-medium">
                    ({totalDays} {t("projectTimeline.days", "days")})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground italic">
                  {t("projectTimeline.noDateSet", "No timeline set")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center - Progress bar (only if dates are set) */}
        {startDate && endDate && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              {totalTasks > 0 ? (
                <>
                  <span>{completedTasks} / {totalTasks} {t("common.tasks", "tasks")}</span>
                  <span>{daysRemaining} {t("projectTimeline.daysRemaining", "remaining")}</span>
                </>
              ) : (
                <>
                  <span>{daysElapsed} {t("projectTimeline.daysElapsed", "days elapsed")}</span>
                  <span>{daysRemaining} {t("projectTimeline.daysRemaining", "remaining")}</span>
                </>
              )}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden relative">
              <div 
                className={cn("h-full rounded-full transition-all duration-500 ease-out", getProgressColor())}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Tick marks for visual reference */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                {[25, 50, 75].map((tick) => (
                  <div 
                    key={tick} 
                    className="w-px h-full bg-background/30" 
                    style={{ marginLeft: `${tick}%`, position: 'absolute', left: 0 }} 
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center mt-1">
              <span className="text-xs font-medium text-foreground">
                {Math.round(progressPercent)}% {t("projectTimeline.complete", "complete")}
              </span>
            </div>
          </div>
        )}

        {/* Right side - Settings gear (editable) */}
        {isEditable && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 hover:bg-amber-500/20"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 z-50" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">{t("projectTimeline.adjustDates", "Adjust Timeline")}</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t("filterQuestions.projectStart", "Project Start")}
                    </label>
                    <Calendar
                      mode="single"
                      selected={startDate || undefined}
                      onSelect={handleStartDateChange}
                      className="p-0 mt-1 pointer-events-auto"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t("filterQuestions.targetEnd", "Target End")}
                    </label>
                    <Calendar
                      mode="single"
                      selected={endDate || undefined}
                      onSelect={handleEndDateChange}
                      disabled={(date) => startDate ? date < startDate : false}
                      className="p-0 mt-1 pointer-events-auto"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
