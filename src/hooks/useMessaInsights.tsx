import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MessaInsight {
  type: "overdue_tasks" | "budget_variance" | "idle_project" | "pending_changes" | "no_checkin";
  message: string;
  priority: "low" | "medium" | "high";
}

export function useMessaInsights(projectId: string | undefined, userId: string | undefined, isOwner: boolean) {
  const [insights, setInsights] = useState<MessaInsight[]>([]);
  const [hasInsight, setHasInsight] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("messa-proactive-enabled");
    return stored !== "false";
  });

  const dismiss = useCallback(() => setDismissed(true), []);
  
  const toggleEnabled = useCallback((val: boolean) => {
    setEnabled(val);
    localStorage.setItem("messa-proactive-enabled", String(val));
    if (!val) setDismissed(true);
  }, []);

  useEffect(() => {
    if (!projectId || !userId || !enabled) {
      setInsights([]);
      setHasInsight(false);
      return;
    }

    const checkInsights = async () => {
      const found: MessaInsight[] = [];
      const now = new Date();

      try {
        // 1. Check overdue tasks
        const { data: overdueTasks } = await supabase
          .from("project_tasks")
          .select("id, title, due_date")
          .eq("project_id", projectId)
          .eq("status", "pending")
          .not("due_date", "is", null)
          .lt("due_date", now.toISOString())
          .limit(5);

        if (overdueTasks && overdueTasks.length > 0) {
          found.push({
            type: "overdue_tasks",
            message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} need attention`,
            priority: "high",
          });
        }

        // 2. Check pending budget changes (owner only)
        if (isOwner) {
          const { count } = await supabase
            .from("pending_budget_changes")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("status", "pending");

          if (count && count > 0) {
            found.push({
              type: "pending_changes",
              message: `${count} pending budget change${count > 1 ? "s" : ""} awaiting review`,
              priority: "medium",
            });
          }
        }

        // 3. Check idle project (no task updates in 3+ days)
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentTasks } = await supabase
          .from("project_tasks")
          .select("id")
          .eq("project_id", projectId)
          .gt("updated_at", threeDaysAgo)
          .limit(1);

        if (!recentTasks || recentTasks.length === 0) {
          // Verify project actually has tasks
          const { count: taskCount } = await supabase
            .from("project_tasks")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId);

          if (taskCount && taskCount > 0) {
            found.push({
              type: "idle_project",
              message: "No task activity in 3+ days",
              priority: "low",
            });
          }
        }

        // 4. Check if no recent check-in (owner/worker)
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentCheckins } = await supabase
          .from("site_checkins")
          .select("id")
          .eq("project_id", projectId)
          .gt("checked_in_at", oneDayAgo)
          .limit(1);

        if (!recentCheckins || recentCheckins.length === 0) {
          found.push({
            type: "no_checkin",
            message: "No site check-ins today",
            priority: "low",
          });
        }
      } catch (err) {
        console.error("[MessaInsights] Error:", err);
      }

      setInsights(found);
      setHasInsight(found.length > 0);
      setDismissed(false);
    };

    checkInsights();
    const interval = setInterval(checkInsights, 5 * 60 * 1000); // re-check every 5 min
    return () => clearInterval(interval);
  }, [projectId, userId, isOwner, enabled]);

  const topInsight = insights.length > 0 ? insights.sort((a, b) => {
    const p = { high: 3, medium: 2, low: 1 };
    return p[b.priority] - p[a.priority];
  })[0] : null;

  return {
    insights,
    hasInsight: hasInsight && !dismissed && enabled,
    topInsight,
    dismiss,
    enabled,
    toggleEnabled,
    insightCount: insights.length,
  };
}
