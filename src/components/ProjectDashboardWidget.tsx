import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  TrendingUp,
  Loader2,
  Briefcase,
  Timer,
  ChevronDown,
  Globe,
  ArrowLeft,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addDays, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProjectStats {
  total: number;
  draft: number;
  active: number;
  completed: number;
}

interface GlobalStats {
  totalProjects: number;
  activeProjects: number; // Unfinished projects (draft + active + in_progress)
  completedProjects: number; // Completed projects
  pendingTasks: number; // Tasks not yet completed
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
}

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  project_id: string;
  project_name: string;
  status?: string;
}

interface ProjectDashboardWidgetProps {
  onTaskClick?: (projectId: string, navigateToTasks?: boolean) => void;
  selectedProjectId?: string | null;
  onClearSelection?: () => void;
}

const ProjectDashboardWidget = ({ onTaskClick, selectedProjectId, onClearSelection }: ProjectDashboardWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProjectStats>({ total: 0, draft: 0, active: 0, completed: 0 });
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ totalProjects: 0, activeProjects: 0, completedProjects: 0, pendingTasks: 0 });
  const [taskStats, setTaskStats] = useState<TaskStats>({ totalTasks: 0, completedTasks: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<UpcomingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedProjectId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Always fetch ALL projects for global stats
      const { data: allProjects, error: allProjectsError } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("user_id", user.id);

      if (allProjectsError) throw allProjectsError;

      // Calculate global stats (always based on all projects)
      // Active = unfinished (draft + active + in_progress), Completed = finished
      const globalProjectStats: GlobalStats = {
        totalProjects: allProjects?.length || 0,
        activeProjects: allProjects?.filter(p => p.status !== 'completed').length || 0,
        completedProjects: allProjects?.filter(p => p.status === 'completed').length || 0,
        pendingTasks: 0, // Will be calculated from tasks
      };

      setGlobalStats(globalProjectStats);

      // If a project is selected, filter to that project
      let filteredProjects = allProjects;
      if (selectedProjectId) {
        filteredProjects = allProjects?.filter(p => p.id === selectedProjectId) || [];
      }

      // Set selected project name
      if (selectedProjectId && filteredProjects && filteredProjects.length > 0) {
        setSelectedProjectName(filteredProjects[0].name);
      } else {
        setSelectedProjectName(null);
      }

      const projectStats: ProjectStats = {
        total: filteredProjects?.length || 0,
        draft: filteredProjects?.filter(p => p.status === 'draft').length || 0,
        active: filteredProjects?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0,
        completed: filteredProjects?.filter(p => p.status === 'completed').length || 0
      };
      setStats(projectStats);

      // Determine which project IDs to fetch tasks for
      const projectIdsForTasks = selectedProjectId 
        ? [selectedProjectId] 
        : (allProjects?.map(p => p.id) || []);

      const projectMap = Object.fromEntries((allProjects || []).map(p => [p.id, p.name]));

      // Fetch ALL tasks for task-based completion rate
      if (projectIdsForTasks.length > 0) {
        const { data: allTasks, error: allTasksError } = await supabase
          .from("project_tasks")
          .select("id, title, due_date, priority, project_id, status")
          .in("project_id", projectIdsForTasks);

        if (!allTasksError && allTasks) {
          // Calculate task-based completion stats
          const completedCount = allTasks.filter(t => t.status === 'completed').length;
          const pendingCount = allTasks.filter(t => t.status !== 'completed').length;
          setTaskStats({
            totalTasks: allTasks.length,
            completedTasks: completedCount
          });
          
          // Update global stats with pending tasks
          setGlobalStats(prev => ({ ...prev, pendingTasks: pendingCount }));

          // Filter for upcoming tasks (not completed, has due date)
          const upcomingOnly = allTasks
            .filter(t => t.due_date && t.status !== 'completed')
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
            .slice(0, 10)
            .map(t => ({
              ...t,
              due_date: t.due_date!,
              project_name: projectMap[t.project_id] || "Unknown"
            }));
          
          // Separate today's tasks for Global Fleet View
          const today = upcomingOnly.filter(t => isToday(new Date(t.due_date)));
          setTodaysTasks(today);
          setUpcomingTasks(upcomingOnly.slice(0, 5));
        } else {
          setTaskStats({ totalTasks: 0, completedTasks: 0 });
          setUpcomingTasks([]);
          setTodaysTasks([]);
        }
      } else {
        setTaskStats({ totalTasks: 0, completedTasks: 0 });
        setUpcomingTasks([]);
        setTodaysTasks([]);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const isOverdue = (dueDate: string) => {
    return isBefore(new Date(dueDate), new Date());
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    return isAfter(due, new Date()) && isBefore(due, addDays(new Date(), 3));
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  // Calculate completion rate based on TASKS, not project status
  const completionRate = taskStats.totalTasks > 0 
    ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) 
    : 0;

  // Determine if we're in Global Fleet View mode
  const isGlobalView = !selectedProjectId;

  return (
    <Card className="bg-white dark:bg-card border-slate-200 dark:border-border overflow-hidden">
      {/* Header with Clock */}
      <CardHeader className={cn(
        "pb-3 border-b",
        isGlobalView 
          ? "bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-cyan-200 dark:border-cyan-800/30"
          : "bg-gradient-to-r from-amber-50 via-amber-100 to-orange-50 dark:from-amber-900/20 dark:via-amber-800/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/30"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedProjectId && onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="mb-1 -ml-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Fleet View
              </Button>
            )}
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-foreground">
              {isGlobalView ? (
                <>
                  <Globe className="h-5 w-5 text-cyan-600" />
                  Global Fleet View
                </>
              ) : (
                <>
                  <Briefcase className="h-5 w-5 text-amber-600" />
                  <span className="truncate">{selectedProjectName}</span>
                </>
              )}
            </CardTitle>
            <p className="text-slate-500 dark:text-muted-foreground text-xs mt-1">
              {isGlobalView ? "Company-wide overview" : format(currentTime, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={cn(
              "flex items-center gap-2 text-2xl font-mono font-bold",
              isGlobalView ? "text-cyan-600" : "text-amber-600"
            )}>
              <Clock className="h-5 w-5" />
              {format(currentTime, "HH:mm")}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Global Fleet View Stats */}
        {isGlobalView ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl p-3 border border-cyan-100 dark:border-cyan-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Projects</span>
                <FileText className="h-4 w-4 text-cyan-500" />
              </div>
              <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mt-1">{globalStats.totalProjects}</p>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Active</span>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{globalStats.activeProjects}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{globalStats.completedProjects}</p>
            </div>

            {globalStats.pendingTasks > 0 && (
              <div className="col-span-2 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Pending Tasks</span>
                  <Timer className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">{globalStats.pendingTasks}</p>
              </div>
            )}
          </div>
        ) : (
          /* Project-specific Stats Grid */
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total</span>
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.total}</p>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Active</span>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{stats.active + stats.draft}</p>
            </div>
          </div>
        )}

        {/* Today's Priority Tasks - Only in Global View */}
        {isGlobalView && todaysTasks.length > 0 && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Today's Priority</h3>
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                {todaysTasks.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {todaysTasks.slice(0, 3).map(task => (
                <div 
                  key={task.id}
                  onClick={() => onTaskClick?.(task.project_id, true)}
                  className="flex items-center justify-between p-2 bg-white/60 dark:bg-background/40 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-background/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground">{task.project_name}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs shrink-0 ml-2", getPriorityColor(task.priority))}
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Ring - Collapsible */}
        <Collapsible defaultOpen={true}>
          <div className="bg-slate-50 dark:bg-muted/50 rounded-xl border border-slate-100 dark:border-border overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-cyan-50/60 hover:via-sky-50/40 hover:to-blue-50/30 dark:hover:from-cyan-950/20 dark:hover:via-sky-950/15 dark:hover:to-blue-950/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-slate-200 dark:text-slate-600"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${completionRate * 1.005} 100.5`}
                      strokeLinecap="round"
                      className="text-green-500 transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{completionRate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Task Completion</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    {taskStats.completedTasks} of {taskStats.totalTasks} tasks done
                  </p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-0">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-slate-200 dark:text-slate-600"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${completionRate * 1.76} 176`}
                        strokeLinecap="round"
                        className="text-green-500 transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{completionRate}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{taskStats.completedTasks} Done</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{taskStats.totalTasks - taskStats.completedTasks} Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Upcoming Deadlines */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isGlobalView ? "All Upcoming Deadlines" : "Project Deadlines"}
            </h3>
          </div>
          
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No upcoming deadlines</p>
              <p className="text-xs text-slate-400 mt-0.5">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => {
                    if (onTaskClick) {
                      onTaskClick(task.project_id, true);
                    } else {
                      navigate(`/buildunion/project/${task.project_id}`);
                    }
                  }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                    isOverdue(task.due_date) 
                      ? 'bg-red-50 border-red-200 hover:border-red-300' 
                      : isDueSoon(task.due_date)
                        ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                        : 'bg-white dark:bg-card border-slate-200 dark:border-border hover:bg-gradient-to-r hover:from-cyan-50/60 hover:via-sky-50/40 hover:to-blue-50/30 dark:hover:from-cyan-950/20 dark:hover:via-sky-950/15 dark:hover:to-blue-950/10 hover:border-cyan-200 dark:hover:border-cyan-800/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{task.project_name}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs shrink-0 ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Timer className="h-3 w-3 text-slate-400" />
                    <span className={`text-xs ${
                      isOverdue(task.due_date) 
                        ? 'text-red-600 font-medium' 
                        : isDueSoon(task.due_date) 
                          ? 'text-amber-600' 
                          : 'text-slate-500'
                    }`}>
                      {isOverdue(task.due_date) 
                        ? `Overdue by ${formatDistanceToNow(new Date(task.due_date))}` 
                        : `Due ${formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectDashboardWidget;
