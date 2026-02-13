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

interface DashboardData {
  project: { name: string; address: string | null; trade: string | null; status: string } | null;
  taskStats: { total: number; completed: number; myTasks: number; myCompleted: number };
  docCount: number;
  teamCount: number;
  weather: { temp: number; description: string; alerts: any[] } | null;
  financials: { total: number; material: number; labor: number } | null;
  timeline: { start: string | null; end: string | null };
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

// Which panels each role can see
const ROLE_PANELS: Record<string, string[]> = {
  owner: ["tasks", "documents", "team", "weather", "financials", "timeline"],
  foreman: ["tasks", "documents", "team", "weather", "timeline"],
  worker: ["my-tasks", "weather", "timeline"],
  inspector: ["my-tasks", "documents", "weather"],
  subcontractor: ["my-tasks", "documents", "weather", "timeline"],
  supplier: ["documents", "weather", "timeline"],
  client: ["overview", "documents", "weather", "timeline"],
  member: ["my-tasks", "weather"],
};

const RoleDashboard = ({ projectId, role, userId }: RoleDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData>({
    project: null,
    taskStats: { total: 0, completed: 0, myTasks: 0, myCompleted: 0 },
    docCount: 0,
    teamCount: 0,
    weather: null,
    financials: null,
    timeline: { start: null, end: null },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [projectId, userId]);

  const loadDashboardData = async () => {
    try {
      // Parallel fetch all data
      const [projectRes, tasksRes, docsRes, membersRes, summaryRes] = await Promise.all([
        supabase.from("projects").select("name, address, trade, status").eq("id", projectId).single(),
        supabase
          .from("project_tasks")
          .select("id, status, assigned_to")
          .eq("project_id", projectId)
          .is("archived_at", null),
        supabase.from("project_documents").select("id").eq("project_id", projectId),
        supabase.from("project_members").select("id").eq("project_id", projectId),
        supabase
          .from("project_summaries")
          .select("total_cost, material_cost, labor_cost, verified_facts, project_start_date, project_end_date")
          .eq("project_id", projectId),
      ]);

      const tasks = tasksRes.data || [];
      const myTasks = tasks.filter((t) => t.assigned_to === userId);

      // Extract timeline from verified_facts
      let startDate: string | null = null;
      let endDate: string | null = null;
      if (summaryRes.data && summaryRes.data.length > 0) {
        const facts = summaryRes.data[0].verified_facts as any[];
        if (Array.isArray(facts)) {
          const timelineFact = facts.find((f: any) => f.cite_type === "TIMELINE");
          const endFact = facts.find((f: any) => f.cite_type === "END_DATE");
          if (timelineFact) startDate = timelineFact.answer;
          if (endFact) endDate = endFact.answer;
        }
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
        docCount: docsRes.data?.length || 0,
        teamCount: (membersRes.data?.length || 0) + 1, // +1 for owner
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
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          {/* Tasks Panel */}
          {(panels.includes("tasks") || panels.includes("my-tasks")) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-[#0c1120] border-cyan-900/30 hover:border-cyan-700/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    {panels.includes("my-tasks")
                      ? t("roleDashboard.myTasks", "My Tasks")
                      : t("roleDashboard.allTasks", "All Tasks")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {panels.includes("my-tasks") ? (
                    <>
                      <p className="text-3xl font-bold text-white">
                        {data.taskStats.myCompleted}/{data.taskStats.myTasks}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">
                        {t("roleDashboard.assignedToYou", "assigned to you")}
                      </p>
                      {data.taskStats.myTasks > 0 && (
                        <div className="mt-3 h-1.5 rounded-full bg-cyan-950 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all"
                            style={{ width: `${(data.taskStats.myCompleted / data.taskStats.myTasks) * 100}%` }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-white">
                        {data.taskStats.completed}/{data.taskStats.total}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">
                        {t("roleDashboard.tasksCompleted", "tasks completed")}
                      </p>
                      {data.taskStats.total > 0 && (
                        <div className="mt-3 h-1.5 rounded-full bg-cyan-950 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                            style={{ width: `${(data.taskStats.completed / data.taskStats.total) * 100}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
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
