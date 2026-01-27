import { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Timer, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isBefore, isAfter, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  project_id: string;
  project_name: string;
  status: string;
}

interface UpcomingDeadlinesWidgetProps {
  projectId?: string | null;
  onTaskClick?: (projectId: string, navigateToTasks?: boolean) => void;
}

const UpcomingDeadlinesWidget = ({ projectId, onTaskClick }: UpcomingDeadlinesWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUpcomingTasks();
    }
  }, [user, projectId]);

  const fetchUpcomingTasks = async () => {
    if (!user) return;

    try {
      // If projectId is provided, fetch only that project's tasks
      if (projectId) {
        const { data: project } = await supabase
          .from("projects")
          .select("id, name")
          .eq("id", projectId)
          .single();

        if (project) {
          const { data: tasks, error: tasksError } = await supabase
            .from("project_tasks")
            .select("id, title, due_date, priority, project_id, status")
            .eq("project_id", projectId)
            .not("due_date", "is", null)
            .neq("status", "completed")
            .order("due_date", { ascending: true })
            .limit(5);

          if (!tasksError && tasks) {
            setUpcomingTasks(tasks.map(t => ({
              ...t,
              project_name: project.name
            })));
          }
        }
      } else {
        // Fetch all projects
        const { data: projects, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, status")
          .eq("user_id", user.id);

        if (projectsError) throw projectsError;

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
      }
    } catch (err) {
      console.error("Error fetching upcoming tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 bg-red-100 border-red-300';
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

  const handleTaskClick = (projectId: string) => {
    if (onTaskClick) {
      onTaskClick(projectId, true);
    } else {
      navigate(`/buildunion/workspace?project=${projectId}&tab=tasks`);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming Deadlines</h3>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming Deadlines</h3>
              {upcomingTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {upcomingTasks.length}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming deadlines</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => handleTaskClick(task.project_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isOverdue(task.due_date) 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-300' 
                        : isDueSoon(task.due_date)
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.project_name}</p>
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
                          ? 'text-red-600 dark:text-red-400 font-medium' 
                          : isDueSoon(task.due_date) 
                            ? 'text-amber-600 dark:text-amber-400' 
                            : 'text-slate-500 dark:text-slate-400'
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
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default UpcomingDeadlinesWidget;
