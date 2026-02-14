// ============================================
// ROLE-BASED SIMPLIFIED DASHBOARD
// ============================================
// Shows role-appropriate panels at a glance
// with a "Full Dashboard" button to access Stage 8
// ============================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Cloud,
  FileText,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Maximize2,
  ArrowLeft,
  Shield,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RoleDashboardProps {
  projectId: string;
  role: string;
  userId: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  description: string | null;
}

interface DashboardData {
  project: { name: string; address: string | null; trade: string | null; status: string } | null;
  taskStats: { total: number; completed: number; myTasks: number; myCompleted: number };
  allTasks: TaskItem[];
  myTaskItems: TaskItem[];
  docCount: number;
  teamCount: number;
  weather: { temp: number; description: string; alerts: any[] } | null;
  financials: { total: number; material: number; labor: number } | null;
  timeline: { start: string | null; end: string | null };
  contractStatus: string | null;
  siteLogCount: number;
  deliveryCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  foreman: "Foreman",
  worker: "Worker",
  inspector: "Inspector",
  subcontractor: "Subcontractor",
  supplier: "Supplier",
  client: "Client",
  member: "Member",
};

const ROLE_ACCENT: Record<string, string> = {
  owner: "from-amber-500 to-orange-500",
  foreman: "from-blue-500 to-indigo-500",
  worker: "from-cyan-500 to-teal-500",
  inspector: "from-purple-500 to-violet-500",
  subcontractor: "from-orange-500 to-red-500",
  supplier: "from-green-500 to-emerald-500",
  client: "from-slate-500 to-gray-500",
  member: "from-gray-500 to-slate-500",
};

// Which panels each role can see — all members see ALL tasks (not just their own)
const ROLE_PANELS: Record<string, string[]> = {
  owner: ["tasks", "documents", "team", "weather", "financials", "timeline", "contract", "sitelogs", "deliveries"],
  foreman: ["tasks", "documents", "team", "weather", "timeline", "contract", "sitelogs", "deliveries"],
  worker: ["tasks", "weather", "timeline", "sitelogs"],
  inspector: ["tasks", "documents", "weather", "contract", "sitelogs"],
  subcontractor: ["tasks", "documents", "weather", "timeline", "deliveries"],
  supplier: ["documents", "weather", "timeline", "deliveries"],
  client: ["overview", "documents", "weather", "timeline", "contract"],
  member: ["tasks", "weather", "sitelogs"],
};

const RoleDashboard = ({ projectId, role, userId }: RoleDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData>({
    project: null,
    taskStats: { total: 0, completed: 0, myTasks: 0, myCompleted: 0 },
    allTasks: [],
    myTaskItems: [],
    docCount: 0,
    teamCount: 0,
    weather: null,
    financials: null,
    timeline: { start: null, end: null },
    contractStatus: null,
    siteLogCount: 0,
    deliveryCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDashboardData();
  }, [projectId, userId]);

  const loadDashboardData = async () => {
    try {
      // Parallel fetch all data
      const [projectRes, tasksRes, docsRes, membersRes, summaryRes, contractsRes, siteLogsRes, deliveriesRes] = await Promise.all([
        supabase.from("projects").select("name, address, trade, status").eq("id", projectId).single(),
        supabase
          .from("project_tasks")
          .select("id, title, status, priority, due_date, assigned_to, description")
          .eq("project_id", projectId)
          .is("archived_at", null),
        supabase.from("project_documents").select("id").eq("project_id", projectId),
        supabase.from("project_members").select("id, user_id, role").eq("project_id", projectId),
        supabase
          .from("project_summaries")
          .select("total_cost, material_cost, labor_cost, verified_facts, project_start_date, project_end_date")
          .eq("project_id", projectId),
        supabase.from("contracts").select("id, status").eq("project_id", projectId).limit(1),
        supabase.from("site_logs").select("id").eq("project_id", projectId),
        supabase.from("material_deliveries").select("id").eq("project_id", projectId),
      ]);

      const tasks = (tasksRes.data || []) as TaskItem[];
      const myTasks = tasks.filter((t) => t.assigned_to === userId);

      // Fetch profile names for all assignees + team members
      const allUserIds = new Set<string>();
      tasks.forEach((t) => { if (t.assigned_to) allUserIds.add(t.assigned_to); });
      (membersRes.data || []).forEach((m: any) => { if (m.user_id) allUserIds.add(m.user_id); });
      
      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, username")
          .in("user_id", Array.from(allUserIds));
        
        const names: Record<string, string> = {};
        (profiles || []).forEach((p) => {
          names[p.user_id] = p.full_name || p.username || "Team Member";
        });
        // Also map member roles
        (membersRes.data || []).forEach((m: any) => {
          if (m.user_id && !names[m.user_id]) {
            names[m.user_id] = "Team Member";
          }
        });
        setMemberNames(names);
      }

      // Extract timeline from verified_facts OR project_summaries columns
      let startDate: string | null = null;
      let endDate: string | null = null;
      if (summaryRes.data && summaryRes.data.length > 0) {
        const summary = summaryRes.data[0];
        const facts = summary.verified_facts as any[];
        if (Array.isArray(facts)) {
          const timelineFact = facts.find((f: any) => f.cite_type === "TIMELINE");
          const endFact = facts.find((f: any) => f.cite_type === "END_DATE");
          if (timelineFact) startDate = timelineFact.answer;
          if (endFact) endDate = endFact.answer;
        }
        // Fallback: use project_summaries date columns if citations missing
        if (!startDate && summary.project_start_date) startDate = summary.project_start_date;
        if (!endDate && summary.project_end_date) endDate = summary.project_end_date;
      }

      // Fetch weather if project has address
      let weatherData = null;
      if (projectRes.data?.address) {
        try {
          const { data: weatherRes } = await supabase.functions.invoke("get-weather", {
            body: { location: projectRes.data.address, days: 1 },
          });
          if (weatherRes?.current) {
            weatherData = weatherRes.current;
          }
        } catch (e) {
          console.error("Weather fetch error:", e);
        }
      }

      setData({
        project: projectRes.data,
        taskStats: {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "completed").length,
          myTasks: myTasks.length,
          myCompleted: myTasks.filter((t) => t.status === "completed").length,
        },
        allTasks: tasks,
        myTaskItems: myTasks,
        docCount: docsRes.data?.length || 0,
        teamCount: (membersRes.data?.length || 0) + 1,
        weather: weatherData,
        financials:
          role === "owner" && summaryRes.data?.[0]
            ? {
                total: summaryRes.data[0].total_cost || 0,
                material: summaryRes.data[0].material_cost || 0,
                labor: summaryRes.data[0].labor_cost || 0,
              }
            : null,
        timeline: { start: startDate, end: endDate },
        contractStatus: contractsRes.data?.[0]?.status || null,
        siteLogCount: siteLogsRes.data?.length || 0,
        deliveryCount: deliveriesRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Dashboard load error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const panels = ROLE_PANELS[role] || ROLE_PANELS.member;
  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.member;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Not set";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Not set";
    }
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-white">
      {/* Header */}
      <div className="border-b border-cyan-900/30 bg-[#0c1120]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/buildunion/workspace")}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("roleDashboard.workspace", "Workspace")}
              </Button>
              <div className="h-6 w-px bg-cyan-800/50" />
              <div>
                <h1 className="text-lg font-semibold text-cyan-100">{data.project?.name || "Project"}</h1>
                {data.project?.address && (
                  <p className="text-xs text-cyan-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {data.project.address}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`bg-gradient-to-r ${accent} text-white border-0 shadow-lg`}>
                <Shield className="h-3 w-3 mr-1" />
                {ROLE_LABELS[role] || role}
              </Badge>
              <Button
                size="sm"
                onClick={() => navigate(`/buildunion/new-project?projectId=${projectId}&stage=8&role=${role}`)}
                className="gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md shadow-cyan-900/30"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {t("roleDashboard.fullDashboard", "Full Dashboard")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Permission Notice */}
        <div className="mb-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-950/30 border border-cyan-800/20 text-xs text-cyan-500">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("roleDashboard.permissionNotice", "Showing")}{" "}
            <strong className="text-cyan-300">{ROLE_LABELS[role]}</strong> {t("roleDashboard.view", "view")} —
            {role === "owner"
              ? ` ${t("roleDashboard.ownerAccess", "full access to all panels")}`
              : role === "foreman"
                ? ` ${t("roleDashboard.foremanAccess", "tasks, documents, team & weather (no financials)")}`
                : role === "worker"
                  ? ` ${t("roleDashboard.workerAccess", "your assigned tasks & weather only")}`
                  : role === "inspector"
                    ? ` ${t("roleDashboard.inspectorAccess", "assigned inspections, documents & weather")}`
                    : role === "subcontractor"
                      ? ` ${t("roleDashboard.subcontractorAccess", "your tasks, documents & timeline")}`
                      : ` ${t("roleDashboard.limitedAccess", "limited view based on your role")}`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tasks Panel - Expanded with Task List */}
          {(panels.includes("tasks") || panels.includes("my-tasks")) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-2 lg:col-span-3"
            >
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-400 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      {t("roleDashboard.allTasks", "All Tasks")}
                    </span>
                    <span className="text-xs text-cyan-600">
                      {data.taskStats.completed}/{data.taskStats.total} {t("roleDashboard.done", "done")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Progress bar */}
                  {(() => {
                    const total = data.taskStats.total;
                    const completed = data.taskStats.completed;
                    return total > 0 ? (
                      <div className="mb-4 h-1.5 rounded-full bg-cyan-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                          style={{ width: `${(completed / total) * 100}%` }}
                        />
                      </div>
                    ) : null;
                  })()}

                  {/* Task List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {(panels.includes("my-tasks") ? data.myTaskItems : data.allTasks).length === 0 ? (
                      <p className="text-sm text-cyan-700 text-center py-4">
                        {t("roleDashboard.noTasks", "No tasks assigned yet")}
                      </p>
                    ) : (
                      data.allTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            task.status === "completed"
                              ? "bg-emerald-950/20 border-emerald-900/30"
                              : task.status === "in_progress"
                                ? "bg-amber-950/20 border-amber-900/30"
                                : "bg-cyan-950/20 border-cyan-900/20"
                          }`}
                        >
                          {/* Status icon */}
                          <div className="shrink-0">
                            {task.status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            ) : task.status === "in_progress" ? (
                              <Clock className="h-5 w-5 text-amber-400" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-cyan-700" />
                            )}
                          </div>

                          {/* Task info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              task.status === "completed" ? "text-cyan-500 line-through" : "text-white"
                            }`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.assigned_to && memberNames[task.assigned_to] && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  task.assigned_to === userId 
                                    ? "bg-cyan-800/40 text-cyan-300 font-medium" 
                                    : "bg-slate-800/40 text-slate-400"
                                }`}>
                                  {task.assigned_to === userId ? "You" : memberNames[task.assigned_to]}
                                </span>
                              )}
                              {task.description && (
                                <p className="text-xs text-cyan-700 truncate">{task.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Priority & date */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 border-0 ${
                                task.priority === "critical"
                                  ? "bg-red-900/40 text-red-300"
                                  : task.priority === "high"
                                    ? "bg-orange-900/40 text-orange-300"
                                    : task.priority === "medium"
                                      ? "bg-amber-900/40 text-amber-300"
                                      : "bg-green-900/40 text-green-300"
                              }`}
                            >
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <span className="text-[10px] text-cyan-600">
                                {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Documents Panel */}
          {panels.includes("documents") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("roleDashboard.documents", "Documents")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{data.docCount}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {role === "foreman"
                      ? t("roleDashboard.viewUpload", "view & upload")
                      : t("roleDashboard.viewOnly", "view only")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Team Panel */}
          {panels.includes("team") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t("roleDashboard.team", "Team")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{data.teamCount}</p>
                  <p className="text-xs text-purple-600 mt-1">{t("roleDashboard.teamMembers", "team members")}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Weather Panel */}
          {panels.includes("weather") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-sky-400 flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    {t("roleDashboard.siteWeather", "Site Weather")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.weather ? (
                    <>
                      <p className="text-3xl font-bold text-white">{data.weather.temp}°C</p>
                      <p className="text-xs text-sky-600 mt-1 capitalize">{data.weather.description}</p>
                      {data.weather.alerts && data.weather.alerts.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[10px]">{data.weather.alerts.length} alert(s)</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-cyan-700">{t("roleDashboard.noData", "No data")}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Timeline Panel */}
          {panels.includes("timeline") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-teal-400 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("roleDashboard.timeline", "Timeline")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-cyan-600">{t("roleDashboard.start", "Start")}</span>
                      <span className="text-white font-medium">{formatDate(data.timeline.start)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-cyan-600">{t("roleDashboard.end", "End")}</span>
                      <span className="text-white font-medium">{formatDate(data.timeline.end)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Financials Panel - Owner Only */}
          {panels.includes("financials") && data.financials && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="bg-[#0c1120] border-amber-900/30 hover:border-amber-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("roleDashboard.financials", "Financials")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">${data.financials.total.toLocaleString()}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-amber-600">{t("roleDashboard.material", "Material")}</span>
                      <span className="text-amber-300">${data.financials.material.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">{t("roleDashboard.labor", "Labor")}</span>
                      <span className="text-amber-300">${data.financials.labor.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Contract Status Panel */}
          {panels.includes("contract") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-rose-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contract
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.contractStatus ? (
                    <Badge className={
                      data.contractStatus === "signed" ? "bg-emerald-600" :
                      data.contractStatus === "sent" ? "bg-amber-600" :
                      "bg-slate-600"
                    }>
                      {data.contractStatus.charAt(0).toUpperCase() + data.contractStatus.slice(1)}
                    </Badge>
                  ) : (
                    <p className="text-sm text-cyan-700">No contract created</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Site Logs Panel */}
          {panels.includes("sitelogs") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Site Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{data.siteLogCount}</p>
                  <p className="text-xs text-emerald-600 mt-1">{data.siteLogCount === 0 ? "No site reports yet" : "reports filed"}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Deliveries Panel */}
          {panels.includes("deliveries") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Deliveries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{data.deliveryCount}</p>
                  <p className="text-xs text-orange-600 mt-1">{data.deliveryCount === 0 ? "No deliveries logged" : "deliveries tracked"}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Overview Panel - Client */}
          {panels.includes("overview") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Project Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={data.project?.status === "active" ? "bg-emerald-600" : "bg-slate-600"}>
                    {data.project?.status || "Unknown"}
                  </Badge>
                  <p className="text-xs text-cyan-600 mt-2">{data.project?.trade || "General"}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Full Dashboard CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Button
            size="lg"
            onClick={() => navigate(`/buildunion/new-project?projectId=${projectId}&stage=8&role=${role}`)}
            className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-900/30"
          >
            <Maximize2 className="h-4 w-4" />
            Open Full Command Center Dashboard
          </Button>
          <p className="text-xs text-cyan-700 mt-2">
            Access the complete 8-panel orbital dashboard with all available features for your role
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleDashboard;
