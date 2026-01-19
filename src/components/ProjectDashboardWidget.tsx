import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  TrendingUp,
  Loader2,
  Briefcase,
  Timer
} from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProjectStats {
  total: number;
  draft: number;
  active: number;
  completed: number;
}

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  project_id: string;
  project_name: string;
}

const ProjectDashboardWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProjectStats>({ total: 0, draft: 0, active: 0, completed: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch project stats
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("user_id", user.id);

      if (projectsError) throw projectsError;

      const projectStats: ProjectStats = {
        total: projects?.length || 0,
        draft: projects?.filter(p => p.status === 'draft').length || 0,
        active: projects?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0
      };
      setStats(projectStats);

      // Fetch upcoming tasks with due dates
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

        const { data: tasks, error: tasksError } = await supabase
          .from("project_tasks")
          .select("id, title, due_date, priority, project_id, status")
          .in("project_id", projectIds)
          .not("due_date", "is", null)
          .neq("status", "completed")
          .order("due_date", { ascending: true })
          .limit(5);

        if (!tasksError && tasks) {
          setUpcomingTasks(tasks.map(t => ({
            ...t,
            project_name: projectMap[t.project_id] || "Unknown"
          })));
        }
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

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      {/* Header with Clock */}
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 via-amber-100 to-orange-50 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <Briefcase className="h-5 w-5 text-amber-600" />
              Project Overview
            </CardTitle>
            <p className="text-slate-500 text-xs mt-1">
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-amber-600">
              <Clock className="h-5 w-5" />
              {format(currentTime, "HH:mm")}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Project Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total</span>
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Active</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.active + stats.draft}</p>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                  className="text-slate-200"
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
                <span className="text-sm font-bold text-slate-700">{completionRate}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Completion Rate</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {stats.completed} of {stats.total} projects completed
              </p>
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-600">{stats.completed} Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-600">{stats.draft} Draft</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">Upcoming Deadlines</h3>
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
                  onClick={() => navigate(`/buildunion/project/${task.project_id}`)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isOverdue(task.due_date) 
                      ? 'bg-red-50 border-red-200 hover:border-red-300' 
                      : isDueSoon(task.due_date)
                        ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
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
