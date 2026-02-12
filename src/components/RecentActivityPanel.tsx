import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  FileUp,
  MessageSquare,
  Users,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface ActivityItem {
  id: string;
  type: "task" | "document" | "chat" | "team" | "contract";
  title: string;
  detail?: string;
  projectId?: string;
  projectName?: string;
  timestamp: string;
}

interface RecentActivityPanelProps {
  selectedProjectId?: string | null;
  selectedProjectName?: string | null;
  onClearFilter?: () => void;
}

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  task: ClipboardList,
  document: FileUp,
  chat: MessageSquare,
  team: Users,
  contract: FileText,
};

const ACTIVITY_COLORS: Record<string, string> = {
  task: "text-blue-500",
  document: "text-emerald-500",
  chat: "text-purple-500",
  team: "text-teal-500",
  contract: "text-amber-500",
};

const ACTIVITY_BG: Record<string, string> = {
  task: "bg-blue-100 dark:bg-blue-900/30",
  document: "bg-emerald-100 dark:bg-emerald-900/30",
  chat: "bg-purple-100 dark:bg-purple-900/30",
  team: "bg-teal-100 dark:bg-teal-900/30",
  contract: "bg-amber-100 dark:bg-amber-900/30",
};

export function RecentActivityPanel({
  selectedProjectId,
  selectedProjectName,
  onClearFilter,
}: RecentActivityPanelProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchActivity = async () => {
      setLoading(true);

      // Get user's project IDs (owned + member)
      const [ownRes, memberRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", user.id)
          .is("archived_at", null),
        supabase
          .from("project_members")
          .select("project_id, projects!inner(id, name)")
          .eq("user_id", user.id),
      ]);

      const ownProjects = (ownRes.data || []).map((p) => ({
        id: p.id,
        name: p.name,
      }));
      const memberProjects = (memberRes.data || []).map((m: any) => ({
        id: m.projects.id,
        name: m.projects.name,
      }));
      const allProjects = [
        ...ownProjects,
        ...memberProjects.filter(
          (mp) => !ownProjects.some((op) => op.id === mp.id)
        ),
      ];

      if (allProjects.length === 0) {
        setAllActivities([]);
        setLoading(false);
        return;
      }

      const projectIds = allProjects.map((p) => p.id);
      const projectNameMap: Record<string, string> = {};
      allProjects.forEach((p) => (projectNameMap[p.id] = p.name));

      // Fetch recent data from multiple tables in parallel
      const [tasksRes, docsRes, chatRes, membersRes, contractsRes] =
        await Promise.all([
          supabase
            .from("project_tasks")
            .select("id, title, status, project_id, updated_at")
            .in("project_id", projectIds)
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(10),
          supabase
            .from("project_documents")
            .select("id, file_name, project_id, uploaded_at")
            .in("project_id", projectIds)
            .order("uploaded_at", { ascending: false })
            .limit(5),
          supabase
            .from("project_chat_messages")
            .select("id, message, project_id, created_at")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("project_members")
            .select("id, project_id, role, joined_at")
            .in("project_id", projectIds)
            .order("joined_at", { ascending: false })
            .limit(5),
          supabase
            .from("contracts")
            .select("id, contract_number, status, project_id, updated_at")
            .in("project_id", projectIds)
            .order("updated_at", { ascending: false })
            .limit(5),
        ]);

      const items: ActivityItem[] = [];

      // Tasks
      (tasksRes.data || []).forEach((task) => {
        items.push({
          id: `task-${task.id}`,
          type: "task",
          title: task.title,
          detail: task.status === "completed" ? "Completed" : task.status,
          projectId: task.project_id,
          projectName: projectNameMap[task.project_id],
          timestamp: task.updated_at,
        });
      });

      // Documents
      (docsRes.data || []).forEach((doc) => {
        items.push({
          id: `doc-${doc.id}`,
          type: "document",
          title: doc.file_name,
          detail: "Uploaded",
          projectId: doc.project_id,
          projectName: projectNameMap[doc.project_id],
          timestamp: doc.uploaded_at,
        });
      });

      // Chat messages
      (chatRes.data || []).forEach((msg) => {
        items.push({
          id: `chat-${msg.id}`,
          type: "chat",
          title:
            msg.message.length > 60
              ? msg.message.substring(0, 60) + "…"
              : msg.message,
          projectId: msg.project_id,
          projectName: projectNameMap[msg.project_id],
          timestamp: msg.created_at,
        });
      });

      // Team members
      (membersRes.data || []).forEach((m) => {
        items.push({
          id: `team-${m.id}`,
          type: "team",
          title: `New ${m.role} joined`,
          projectId: m.project_id,
          projectName: projectNameMap[m.project_id],
          timestamp: m.joined_at,
        });
      });

      // Contracts
      (contractsRes.data || []).forEach((c) => {
        items.push({
          id: `contract-${c.id}`,
          type: "contract",
          title: `Contract ${c.contract_number}`,
          detail: c.status,
          projectId: c.project_id || undefined,
          projectName: c.project_id ? projectNameMap[c.project_id] : undefined,
          timestamp: c.updated_at,
        });
      });

      // Sort by timestamp descending
      items.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setAllActivities(items.slice(0, 30));
      setLoading(false);
    };

    fetchActivity();
  }, [user, refreshKey]);

  if (!user) return null;

  // Filter activities by selected project
  const activities = selectedProjectId
    ? allActivities.filter((a) => a.projectId === selectedProjectId)
    : allActivities;

  return (
    <div className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-b from-amber-50/30 to-background dark:from-amber-950/10 dark:to-background overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t("workspace.recentActivity", "Recent Activity")}
          </span>
          {activities.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {activities.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Refresh button */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setRefreshKey((k) => k + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                setRefreshKey((k) => k + 1);
              }
            }}
            className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground",
                loading && "animate-spin"
              )}
            />
          </span>
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Active project filter badge */}
      {selectedProjectId && selectedProjectName && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30">
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 truncate flex-1">
              {selectedProjectName}
            </span>
            {onClearFilter && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFilter();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onClearFilter();
                }}
                className="p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1 max-h-[480px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {selectedProjectId
                    ? t(
                        "workspace.noProjectActivity",
                        "No recent activity for this project."
                      )
                    : t(
                        "workspace.noActivity",
                        "No recent activity across your projects."
                      )}
                </p>
              ) : (
                activities.map((item, idx) => {
                  const Icon = ACTIVITY_ICONS[item.type] || Activity;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                          ACTIVITY_BG[item.type]
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3 w-3",
                            ACTIVITY_COLORS[item.type]
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {!selectedProjectId && item.projectName && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              {item.projectName}
                            </span>
                          )}
                          {item.detail && (
                            <>
                              {!selectedProjectId && item.projectName && (
                                <span className="text-[10px] text-muted-foreground">
                                  ·
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {item.detail}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {formatDistanceToNow(parseISO(item.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
