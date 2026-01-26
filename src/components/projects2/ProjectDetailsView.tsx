import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MapPin, 
  Wrench, 
  Calendar, 
  FileText, 
  Sparkles,
  Cloud,
  MessageSquare,
  Loader2,
  Map,
  Download,
  Users,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { WeatherWidget } from "@/components/WeatherWidget";

import ProjectSynthesis, { DualEngineOutput, SynthesisResult } from "./ProjectSynthesis";
import { FilterAnswers, AITriggers } from "./FilterQuestions";
import ConflictStatusIndicator from "./ConflictStatusIndicator";
import TeamMapWidget from "./TeamMapWidget";
import DocumentsPane from "./DocumentsPane";
import OperationalTruthCards from "./OperationalTruthCards";
import { DecisionLogPanel } from "./DecisionLogPanel";
import TeamTab from "./TeamTab";
import EditableAIAnalysisSummary from "./EditableAIAnalysisSummary";

import HierarchicalTimeline from "./HierarchicalTimeline";
import TeamMemberTimeline from "./TeamMemberTimeline";
import BaselineLockCard from "./BaselineLockCard";
import ProjectTimelineBar from "./ProjectTimelineBar";
import { buildOperationalTruth, OperationalTruth } from "@/types/operationalTruth";
import { useTranslation } from "react-i18next";
import { useWeather } from "@/hooks/useWeather";
import { useSubscription } from "@/hooks/useSubscription";
import { useSingleProjectConflicts } from "@/hooks/useSingleProjectConflicts";
import { useProjectTeam } from "@/hooks/useProjectTeam";
import { useAuth } from "@/hooks/useAuth";
import { generateProjectReport, ConflictData } from "@/lib/pdfGenerator";
import { ProBadge } from "@/components/ui/pro-badge";

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate demo tasks for the 4 material categories
function generateDemoTasks(
  projectId: string,
  userId: string,
  materials: Array<{ item: string; quantity: number; unit: string }>
): TaskWithBudget[] {
  const now = new Date();
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  };

  // Default material categories if none provided
  const defaultMaterials = [
    { item: "Laminate Flooring", quantity: 1302, unit: "sq ft" },
    { item: "Underlayment", quantity: 1400, unit: "sq ft" },
    { item: "Baseboard Trim", quantity: 280, unit: "linear ft" },
    { item: "Adhesive & Supplies", quantity: 15, unit: "units" }
  ];

  const materialsToUse = materials.length > 0 ? materials : defaultMaterials;

  const demoTasks: TaskWithBudget[] = [];
  let taskCounter = 0;

  // Generate tasks for each material with 3 phases: Preparation, Execution, Verification
  materialsToUse.forEach((material, materialIndex) => {
    const materialName = material.item.split(" ")[0];
    const baseDay = materialIndex * 5; // Stagger each material by 5 days

    // Phase 1: Preparation (Order & Deliver)
    demoTasks.push({
      id: `demo-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Order ${material.item}`,
      description: `Order ${material.quantity} ${material.unit} of ${material.item}`,
      priority: "high",
      status: materialIndex === 0 ? "completed" : "pending",
      due_date: addDays(now, baseDay),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: materialIndex === 0 ? 3.5 : 2.0,
      quantity: material.quantity,
      total_cost: (materialIndex === 0 ? 3.5 : 2.0) * material.quantity,
      assignee_name: "Project Owner",
    });

    demoTasks.push({
      id: `demo-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Deliver ${materialName} to site`,
      description: `Receive delivery of ${material.item}`,
      priority: "medium",
      status: materialIndex === 0 ? "completed" : "pending",
      due_date: addDays(now, baseDay + 2),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 50,
      quantity: 1,
      total_cost: 50,
      assignee_name: "Project Owner",
    });

    // Phase 2: Execution (Install)
    demoTasks.push({
      id: `demo-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Install ${material.item}`,
      description: `Install ${material.quantity} ${material.unit} of ${material.item}`,
      priority: "high",
      status: materialIndex === 0 ? "in_progress" : "pending",
      due_date: addDays(now, baseDay + 4),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 1.5,
      quantity: material.quantity,
      total_cost: 1.5 * material.quantity,
      assignee_name: "Project Owner",
    });

    // Phase 3: Verification (Inspect)
    demoTasks.push({
      id: `demo-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Verify ${materialName} installation`,
      description: `Final inspection of ${material.item} work`,
      priority: "medium",
      status: "pending",
      due_date: addDays(now, baseDay + 6),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 75,
      quantity: 1,
      total_cost: 75,
      assignee_name: "Project Owner",
    });
  });

  return demoTasks;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ProjectData {
  id: string;
  name: string;
  address: string | null;
  trade: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  site_images: string[] | null;
  user_id: string;
}

interface PhotoEstimateData {
  area?: number | null;
  areaUnit?: string;
  areaConfidence?: string;
  materials?: Array<{ item: string; quantity: number; unit: string; notes?: string }>;
  summary?: string;
  recommendations?: string[];
  surfaceType?: string;
  surfaceCondition?: string;
  roomType?: string;
  projectSize?: string;
  projectSizeReason?: string;
  blueprintAnalysis?: {
    detectedArea?: number | null;
    areaUnit?: string;
    extractedText?: string;
  };
}

interface ProjectSummaryData {
  id: string;
  mode: string;
  status: string;
  photo_estimate: PhotoEstimateData | null;
  blueprint_analysis: {
    detectedArea?: number | null;
    areaUnit?: string;
    extractedText?: string;
  } | null;
  calculator_results: unknown[];
  ai_workflow_config: {
    filterAnswers?: FilterAnswers;
    aiTriggers?: AITriggers;
    projectSize?: string;
    projectSizeReason?: string;
    aiAnalysis?: {
      area: number | null;
      areaUnit: string;
      materials: Array<{ item: string; quantity: number; unit: string }>;
      hasBlueprint: boolean;
      confidence: string;
    };
    dualEngineOutput?: DualEngineOutput;
    synthesisResult?: SynthesisResult;
  } | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  total_cost: number | null;
  line_items: unknown[];
  baseline_snapshot: OperationalTruth | null;
  baseline_locked_at: string | null;
  baseline_locked_by: string | null;
  // Project timeline dates
  project_start_date: string | null;
  project_end_date: string | null;
}

interface TaskWithBudget {
  id: string;
  project_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  unit_price?: number;
  quantity?: number;
  total_cost?: number;
  assignee_name?: string;
  assignee_avatar?: string;
}

interface ProjectDetailsViewProps {
  projectId: string;
  onBack: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

const ProjectDetailsView = ({ projectId, onBack }: ProjectDetailsViewProps) => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [tasks, setTasks] = useState<TaskWithBudget[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [totalTaskBudget, setTotalTaskBudget] = useState(0);
  const [timelineView, setTimelineView] = useState<"hierarchical" | "myTasks">("hierarchical");
  const [baselineState, setBaselineState] = useState<{
    snapshot: OperationalTruth | null;
    lockedAt: string | null;
    lockedBy: string | null;
  }>({ snapshot: null, lockedAt: null, lockedBy: null });
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, isDevOverride } = useSubscription();
  const { members } = useProjectTeam(projectId);
  
  // Derive tier status - check for Pro or higher
  const isPro = isDevOverride || 
    subscription?.tier === "pro" || 
    subscription?.tier === "premium" || 
    subscription?.tier === "enterprise";
  
  // Check for Premium (for conflict visualization and reports)
  const isPremium = isDevOverride || 
    subscription?.tier === "premium" || 
    subscription?.tier === "enterprise";

  // Fetch single project conflicts for map visualization
  const { conflicts: projectConflicts } = useSingleProjectConflicts(projectId);
  
  // Determine if current user is owner
  const isOwner = project?.user_id === user?.id;
  
  // Map team members for the map widget
  const teamMembersForMap = members.map(m => ({
    user_id: m.user_id,
    full_name: m.full_name || "Team Member",
    avatar_url: (m as any).avatar_url,
    role: m.role,
    // Note: Real location would come from bu_profiles if implemented
    latitude: undefined,
    longitude: undefined,
    status: undefined as "on_site" | "en_route" | "away" | undefined,
  }));

  // Weather data for timeline integration
  const { forecast: weatherForecast } = useWeather({
    location: project?.address || undefined,
    days: 5,
    enabled: !!project?.address,
  });

  // Fetch project and summary
  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      try {
        // Fetch project and summary in parallel
        const [projectResult, summaryResult] = await Promise.all([
          supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .maybeSingle(),
          supabase
            .from("project_summaries")
            .select("*")
            .eq("project_id", projectId)
            .maybeSingle()
        ]);

        if (projectResult.error) throw projectResult.error;
        if (!projectResult.data) {
          toast.error("Project not found");
          onBack();
          return;
        }

        setProject(projectResult.data as ProjectData);
        
        if (summaryResult.data) {
          const summaryData = summaryResult.data as unknown as ProjectSummaryData;
          setSummary(summaryData);
          
          // Set baseline state from summary
          setBaselineState({
            snapshot: summaryData.baseline_snapshot as OperationalTruth | null,
            lockedAt: summaryData.baseline_locked_at,
            lockedBy: summaryData.baseline_locked_by,
          });
        }
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, onBack]);

  // Fetch tasks with budget data
  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectId) return;
      
      setTasksLoading(true);
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("due_date", { ascending: true });

        if (tasksError) throw tasksError;

        // Fetch team members for enrichment
        const { data: membersData } = await supabase
          .from("project_members")
          .select("user_id, role")
          .eq("project_id", projectId);

        // Get profile info for each member
        const memberProfiles: Record<string, { full_name: string; avatar_url?: string }> = {};
        if (membersData) {
          for (const member of membersData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", member.user_id)
              .maybeSingle();
            
            if (profile) {
              memberProfiles[member.user_id] = {
                full_name: profile.full_name || "Team Member",
                avatar_url: profile.avatar_url || undefined,
              };
            }
          }
        }

        // Enrich tasks
        const enrichedTasks = (tasksData || []).map((task) => ({
          ...task,
          unit_price: task.unit_price || 0,
          quantity: task.quantity || 1,
          total_cost: task.total_cost || 0,
          assignee_name: memberProfiles[task.assigned_to]?.full_name || "Unknown",
          assignee_avatar: memberProfiles[task.assigned_to]?.avatar_url,
        }));

        // If no tasks from DB, generate and SAVE demo tasks to the database
        if (enrichedTasks.length === 0 && user?.id) {
          // Get materials from summary for demo task generation
          const { data: summaryForMaterials } = await supabase
            .from("project_summaries")
            .select("photo_estimate, ai_workflow_config")
            .eq("project_id", projectId)
            .maybeSingle();
          
          const aiMaterials = 
            (summaryForMaterials?.ai_workflow_config as any)?.aiAnalysis?.materials ||
            (summaryForMaterials?.photo_estimate as any)?.materials ||
            [];
          
          const demoTasks = generateDemoTasks(projectId, user.id, aiMaterials);
          
          // Prepare tasks for database insertion (remove demo- prefix and use real UUIDs)
          // NOTE: Do NOT include total_cost - it's a generated column (unit_price * quantity)
          const tasksToInsert = demoTasks.map(task => ({
            project_id: task.project_id,
            assigned_to: task.assigned_to,
            assigned_by: task.assigned_by,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            due_date: task.due_date,
            unit_price: task.unit_price,
            quantity: task.quantity,
          }));
          
          // Insert tasks into database
          const { data: insertedTasks, error: insertError } = await supabase
            .from("project_tasks")
            .insert(tasksToInsert)
            .select();
          
          if (insertError) {
            console.error("Failed to save tasks to database:", insertError);
            // Fallback to local demo tasks if insert fails
            setTasks(demoTasks);
            const total = demoTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
            setTotalTaskBudget(total);
          } else if (insertedTasks) {
            // Use the inserted tasks with real IDs
            const savedTasks = insertedTasks.map(task => ({
              ...task,
              unit_price: task.unit_price || 0,
              quantity: task.quantity || 1,
              total_cost: task.total_cost || 0,
              assignee_name: "Project Owner",
              assignee_avatar: undefined,
            }));
            setTasks(savedTasks);
            
            // Calculate total budget
            const total = savedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
            setTotalTaskBudget(total);
            
            toast.success(t("timeline.tasksCreated", "{{count}} tasks created for this project", { count: savedTasks.length }));
          }
        } else {
          setTasks(enrichedTasks);
          
          // Calculate total budget
          const total = enrichedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
          setTotalTaskBudget(total);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();

    // Subscribe to realtime updates - but DON'T refetch on every change
    // to prevent scroll position reset. Only handle INSERT/DELETE events.
    const channel = supabase
      .channel(`project_tasks_budget_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Only add new task if it doesn't already exist (prevents duplicates from our own inserts)
          setTasks(prev => {
            if (prev.some(t => t.id === payload.new.id)) return prev;
            const newTask = {
              ...payload.new,
              unit_price: payload.new.unit_price || 0,
              quantity: payload.new.quantity || 1,
              total_cost: payload.new.total_cost || 0,
              assignee_name: "Team Member",
              assignee_avatar: undefined,
            } as TaskWithBudget;
            return [...prev, newTask];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user?.id]);


  // Calculate global verification rate based on completed verification tasks
  const globalVerificationRate = useMemo(() => {
    const verificationTasks = tasks.filter(t => 
      t.title.toLowerCase().includes("verify") ||
      t.title.toLowerCase().includes("inspect") ||
      t.title.toLowerCase().includes("check") ||
      t.title.toLowerCase().includes("final")
    );
    
    if (verificationTasks.length === 0) {
      // Fallback: use overall task completion
      const completed = tasks.filter(t => t.status === "completed").length;
      return tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    }
    
    const completedVerif = verificationTasks.filter(t => t.status === "completed").length;
    return Math.round((completedVerif / verificationTasks.length) * 100);
  }, [tasks]);

  // Handle task completion (for verification feedback)
  const handleTaskComplete = useCallback(async (taskId: string) => {
    // Refresh tasks list
    const { data } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });
    
    if (data) {
      setTasks(prev => {
        const memberProfiles: Record<string, { full_name: string; avatar_url?: string }> = {};
        prev.forEach(t => {
          if (t.assignee_name) {
            memberProfiles[t.assigned_to] = { 
              full_name: t.assignee_name, 
              avatar_url: t.assignee_avatar 
            };
          }
        });
        
        return data.map(task => ({
          ...task,
          unit_price: task.unit_price || 0,
          quantity: task.quantity || 1,
          total_cost: task.total_cost || 0,
          assignee_name: memberProfiles[task.assigned_to]?.full_name || "Unknown",
          assignee_avatar: memberProfiles[task.assigned_to]?.avatar_url,
        }));
      });
    }
    
    toast.success(t("timeline.verificationUpdated", "Verification rate updated!"));
  }, [projectId, t]);

  // Handle baseline locked callback
  const handleBaselineLocked = useCallback((baseline: OperationalTruth, lockedAt: string) => {
    setBaselineState({
      snapshot: baseline,
      lockedAt,
      lockedBy: user?.id || null,
    });
  }, [user?.id]);

  // Extract data from summary
  const aiConfig = summary?.ai_workflow_config;
  const filterAnswers = aiConfig?.filterAnswers;
  const aiTriggers = aiConfig?.aiTriggers;
  const dualEngineOutput = aiConfig?.dualEngineOutput;
  const synthesisResult = aiConfig?.synthesisResult;
  
  // Extract photo_estimate data - this contains the actual AI analysis results
  const photoEstimate = summary?.photo_estimate;
  const blueprintAnalysis = summary?.blueprint_analysis;
  
  // Helper to extract area from materials (same logic as buildOperationalTruth)
  const extractAreaFromMaterials = (materials: Array<{ item: string; quantity: number; unit: string }> | undefined): number | null => {
    if (!materials?.length) return null;
    const areaBasedMaterial = materials.find(
      m => m.unit?.toLowerCase().includes("sq") || m.unit?.toLowerCase().includes("ft")
    );
    return areaBasedMaterial?.quantity || null;
  };

  // Build unified aiAnalysis from photo_estimate (actual AI results)
  // Priority: photo_estimate.area > blueprint_analysis.detectedArea > materials fallback > ai_workflow_config.aiAnalysis
  const rawArea = photoEstimate?.area ?? blueprintAnalysis?.detectedArea ?? null;
  const materialsData = photoEstimate?.materials || aiConfig?.aiAnalysis?.materials || [];
  const fallbackArea = extractAreaFromMaterials(materialsData);
  
  const aiAnalysis = photoEstimate || aiConfig?.aiAnalysis ? {
    area: rawArea ?? fallbackArea,
    areaUnit: photoEstimate?.areaUnit || blueprintAnalysis?.areaUnit || "sq ft",
    materials: materialsData,
    hasBlueprint: !!blueprintAnalysis?.extractedText || !!photoEstimate?.blueprintAnalysis?.extractedText,
    confidence: photoEstimate?.areaConfidence || aiConfig?.aiAnalysis?.confidence || "medium",
  } : null;

  // Status indicators
  const hasPhotoEstimate = !!summary?.photo_estimate && Object.keys(summary.photo_estimate).length > 0;
  const hasClientInfo = !!(summary?.client_name || summary?.client_email);
  const hasLineItems = Array.isArray(summary?.line_items) && summary.line_items.length > 0;
  const totalCost = summary?.total_cost || 0;

  // Build Operational Truth for report
  const operationalTruth: OperationalTruth = buildOperationalTruth({
    aiAnalysis,
    blueprintAnalysis: blueprintAnalysis ? { analyzed: !!blueprintAnalysis.extractedText } : undefined,
    dualEngineOutput,
    synthesisResult,
    filterAnswers,
    projectSize: photoEstimate?.projectSize || aiConfig?.projectSize,
  });

  // Handle Generate Report
  const handleGenerateReport = async () => {
    if (!isPremium) {
      toast.error(t("report.premiumRequired"));
      return;
    }

    if (!project) return;

    setIsGeneratingReport(true);
    toast.info(t("report.generating"));

    try {
      // Convert project conflicts to ConflictData format
      const conflictsForReport: ConflictData[] = projectConflicts.map(c => ({
        conflictType: c.conflictType,
        severity: c.severity,
        description: c.description,
        photoValue: c.photoValue,
        blueprintValue: c.blueprintValue,
      }));

      await generateProjectReport({
        projectInfo: {
          name: project.name,
          address: project.address || "",
          trade: project.trade || "",
          createdAt: format(new Date(project.created_at), "MMM d, yyyy"),
        },
        operationalTruth,
        obcDetails: operationalTruth.obcDetails,
        conflicts: conflictsForReport,
        dualEngineOutput: dualEngineOutput ? {
          gemini: dualEngineOutput.gemini ? {
            area: aiAnalysis?.area || undefined,
            confidence: aiAnalysis?.confidence,
            materials: aiAnalysis?.materials,
          } : undefined,
          openai: dualEngineOutput.openai ? {
            permitRequired: dualEngineOutput.openai.permitRequired,
            obcReferences: operationalTruth.obcDetails?.references,
          } : undefined,
        } : undefined,
      });

      toast.success(t("report.success"));
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(t("report.error"));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const isTeamMode = summary?.mode === "team";

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <Badge 
                variant="outline" 
                className={cn(
                  "capitalize",
                  isTeamMode 
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-amber-500 text-amber-600 dark:text-amber-400"
                )}
              >
                {isTeamMode ? t("projects.teamMode") : t("projects.soloMode")}
              </Badge>
              <Badge 
                variant="outline" 
                className="capitalize bg-muted/50"
              >
                {project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {project.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.address}
                </span>
              )}
              {project.trade && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {project.trade.replace("_", " ")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(project.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Total Budget Display */}
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-semibold gap-1.5 hidden sm:flex",
              totalTaskBudget > 0
                ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
                : "border-muted"
            )}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Total: ${totalTaskBudget.toLocaleString()}
          </Badge>
          {/* Generate Report Button - Premium Feature */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || !isPremium}
              className={cn(
                "gap-2",
                isPremium 
                  ? "border-amber-500/50 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20" 
                  : "opacity-70"
              )}
            >
              {isGeneratingReport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t("report.generateReport")}</span>
            </Button>
            {!isPremium && (
              <div className="absolute -top-2 -right-2">
                <ProBadge tier="premium" size="sm" />
              </div>
            )}
          </div>

          {/* Conflict Status Indicator */}
          <ConflictStatusIndicator
            synthesisResult={synthesisResult}
            dualEngineOutput={dualEngineOutput}
            size="md"
          />
        </div>
      </div>

      {/* Main Project Timeline Bar - THE CLOCKWORK */}
      {(() => {
        // Calculate task-based progress for the main timeline - tasks now always includes demo tasks when DB is empty
        const completedCount = tasks.filter(t => t.status === "completed").length;
        const totalCount = tasks.length;
        const taskProgressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        return (
          <ProjectTimelineBar
            projectStartDate={summary?.project_start_date ? new Date(summary.project_start_date) : null}
            projectEndDate={summary?.project_end_date ? new Date(summary.project_end_date) : null}
            onDatesChange={async (startDate, endDate) => {
              // Update summary state
              setSummary(prev => prev ? {
                ...prev,
                project_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
                project_end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
              } : null);
              
              // Persist to database
              if (summary?.id) {
                await supabase
                  .from("project_summaries")
                  .update({
                    project_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
                    project_end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
                  })
                  .eq("id", summary.id);
              }
            }}
            isEditable={isOwner}
            taskProgress={taskProgressPercent}
            completedTasks={completedCount}
            totalTasks={totalCount}
          />
        );
      })()}

      {/* Main Content Tabs - Between Timeline Bar and Phases */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "grid w-full bg-muted/50",
          isTeamMode ? "grid-cols-6" : "grid-cols-4"
        )}>
          <TabsTrigger value="overview" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.documents")}</span>
          </TabsTrigger>
          {isTeamMode && (
            <>
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t("projects.team", "Team")}</span>
                {members.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {members.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">{t("projects.siteMap")}</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.timeline")}</span>
          </TabsTrigger>
          <TabsTrigger value="weather" className="gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.weather")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* AI Synthesis Card (if filter answers exist) */}
          {filterAnswers && aiTriggers && (
            <ProjectSynthesis
              filterAnswers={filterAnswers}
              aiTriggers={aiTriggers}
              dualEngineOutput={dualEngineOutput}
              synthesisResult={synthesisResult}
            />
          )}

          {/* Project Description */}
          {project.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Project Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Editable AI Analysis Summary */}
          {summary && (
            <EditableAIAnalysisSummary
              projectId={projectId}
              summaryId={summary.id}
              area={aiAnalysis?.area || null}
              areaUnit={aiAnalysis?.areaUnit || "sq ft"}
              materials={aiAnalysis?.materials || []}
              surfaceType={photoEstimate?.surfaceType}
              surfaceCondition={photoEstimate?.surfaceCondition}
              roomType={photoEstimate?.roomType}
              projectSize={photoEstimate?.projectSize || aiConfig?.projectSize}
              confidence={aiAnalysis?.confidence}
              summary={photoEstimate?.summary}
              recommendations={photoEstimate?.recommendations}
              hasBlueprint={aiAnalysis?.hasBlueprint}
              onUpdate={() => {
                // Reload project data after update
                window.location.reload();
              }}
            />
          )}

          {/* AI Decision Log Panel - Pro+ feature */}
          <DecisionLogPanel
            geminiOutput={dualEngineOutput?.gemini?.rawExcerpt || (dualEngineOutput?.gemini ? JSON.stringify(dualEngineOutput.gemini.visualFindings) : null)}
            openaiOutput={dualEngineOutput?.openai?.rawExcerpt || (dualEngineOutput?.openai ? JSON.stringify(dualEngineOutput.openai.regulatoryNotes) : null)}
            synthesisResult={synthesisResult ? {
              answer: `Area: ${synthesisResult.operationalTruth?.confirmedArea || "N/A"} ${synthesisResult.operationalTruth?.areaUnit || "sq ft"}`,
              verification_status: synthesisResult.verificationStatus === "conflicts_detected" ? "conflict" : synthesisResult.verificationStatus,
              sources: synthesisResult.conflicts,
            } : null}
            detectedArea={aiAnalysis?.area}
            blueprintArea={blueprintAnalysis?.detectedArea}
            materials={aiAnalysis?.materials}
            obcDetails={dualEngineOutput?.openai ? {
              status: (dualEngineOutput.openai.validationStatus as "validated" | "warning" | "pending" | "clear" | "permit_required") || "pending",
              permitRequired: dualEngineOutput.openai.permitRequired || false,
              permitType: (dualEngineOutput.openai.permitType as "building" | "electrical" | "plumbing" | "hvac" | "none") || "none",
              inspectionRequired: dualEngineOutput.openai.inspectionRequired || false,
              estimatedPermitCost: dualEngineOutput.openai.estimatedPermitCost || null,
              complianceScore: dualEngineOutput.openai.complianceScore || 0,
              references: (dualEngineOutput.openai.obcReferences || []).map((ref: any) => 
                typeof ref === "string" ? { code: ref, title: ref, relevance: "informational" as const, summary: "" } : ref
              ),
              recommendations: dualEngineOutput.openai.recommendations || [],
              notes: dualEngineOutput.openai.regulatoryNotes || [],
            } : undefined}
            isPro={isPro}
          />

          {/* Empty state if no AI data */}
          {!filterAnswers && !aiAnalysis && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No AI analysis data available for this project</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab - Enhanced with Materials */}
        <TabsContent value="documents" className="mt-6">
          <DocumentsPane
            projectId={projectId}
            siteImages={project.site_images}
            aiAnalysis={aiAnalysis}
          />
        </TabsContent>

        {/* Team Tab - Only for Team Mode */}
        {isTeamMode && (
          <TabsContent value="team" className="mt-6">
            <TeamTab
              projectId={projectId}
              isOwner={isOwner}
              projectAddress={project.address || undefined}
              aiMaterials={aiAnalysis?.materials}
            />
          </TabsContent>
        )}

        {/* Team Map Tab - Only for Team Mode */}
        {isTeamMode && (
          <TabsContent value="map" className="mt-6">
            {project.address ? (
              <TeamMapWidget
                projectAddress={project.address}
                projectName={project.name}
                conflicts={projectConflicts}
                isPremium={isPremium}
                teamMembers={teamMembersForMap}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Map className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Add a project address to view site map</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Timeline Tab - Shows phases info */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="border-dashed border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
            <CardContent className="py-8 text-center">
              <Calendar className="h-10 w-10 mx-auto text-amber-500 mb-3" />
              <p className="font-medium text-foreground mb-2">
                {t("timeline.movedNotice", "Timeline phases are shown below")}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("timeline.movedDescription", "Scroll down to see the project phases and task timeline.")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value="weather" className="mt-6">
          {project.address ? (
            <WeatherWidget 
              location={project.address}
              showForecast={true}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Cloud className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Add a project address to see weather data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* INTEGRATED TIMELINE SECTION - Directly below Tabs */}
      <div className="space-y-4">
        {/* Timeline View Toggle - Only My Tasks for team members */}
        {!isOwner && user && (
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="border-cyan-300 text-cyan-700 bg-cyan-50/50 dark:bg-cyan-950/30">
              <Users className="h-3 w-3 mr-1" />
              {t("timeline.teamMemberView", "Team Member View")}
            </Badge>
            
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">{t("timeline.viewMode", "View")}:</span>
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={timelineView === "myTasks" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8 text-xs"
                  onClick={() => setTimelineView("myTasks")}
                >
                  {t("timeline.myTasks", "My Tasks")}
                </Button>
                <Button
                  variant={timelineView === "hierarchical" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8 text-xs"
                  onClick={() => setTimelineView("hierarchical")}
                >
                  {t("timeline.phases", "Phases")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Content */}
        {tasksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : timelineView === "myTasks" && user ? (
          <TeamMemberTimeline
            tasks={tasks}
            currentUserId={user.id}
            currentUserName={members.find(m => m.user_id === user.id)?.full_name || user.email?.split('@')[0] || "You"}
            projectId={projectId}
            onTaskComplete={handleTaskComplete}
            onVerificationSubmit={(taskId, photoUrl) => {
              console.log("Verification submitted:", taskId, photoUrl);
              handleTaskComplete(taskId);
            }}
            globalVerificationRate={globalVerificationRate}
          />
        ) : (
          <HierarchicalTimeline
            tasks={tasks}
            materials={aiAnalysis?.materials || [
              { item: "Laminate Flooring", quantity: 1302, unit: "sq ft" },
              { item: "Underlayment", quantity: 1400, unit: "sq ft" },
              { item: "Baseboard Trim", quantity: 280, unit: "linear ft" },
              { item: "Adhesive & Supplies", quantity: 15, unit: "units" }
            ]}
            weatherForecast={weatherForecast}
            projectAddress={project.address || undefined}
            teamLocations={teamMembersForMap.map(m => ({
              userId: m.user_id,
              name: m.full_name,
              isOnSite: m.status === "on_site",
              lastSeen: undefined,
            }))}
            projectStartDate={summary?.project_start_date ? new Date(summary.project_start_date) : null}
            projectEndDate={summary?.project_end_date ? new Date(summary.project_end_date) : null}
            onTaskClick={(task) => console.log("Task clicked:", task)}
            onTaskStatusChange={async (taskId, newStatus) => {
              // Update task status in database
              const { error } = await supabase
                .from("project_tasks")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", taskId);
              
              if (error) {
                console.error("Failed to update task status:", error);
                toast.error(t("timeline.updateFailed", "Failed to update task"));
                return;
              }
              
              // Update local state immediately for instant UI feedback
              setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: newStatus } : t
              ));
              
              // Show success toast after state update
              toast.success(
                newStatus === "completed" 
                  ? t("timeline.taskChecked", "Task completed!") 
                  : t("timeline.taskUnchecked", "Task unchecked")
              );
              
              // Recalculate total budget
              const updatedTasks = tasks.map(t => 
                t.id === taskId ? { ...t, status: newStatus } : t
              );
              const newTotal = updatedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
              setTotalTaskBudget(newTotal);
            }}
            onBulkStatusChange={async (taskIds, newStatus) => {
              // Update tasks in the database
              const { error } = await supabase
                .from("project_tasks")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .in("id", taskIds);
              
              if (error) {
                console.error("Failed to bulk update tasks:", error);
                toast.error(t("timeline.updateFailed", "Failed to update tasks"));
                return;
              }
              
              // Update local state immediately for instant UI feedback
              setTasks(prev => prev.map(t => 
                taskIds.includes(t.id) ? { ...t, status: newStatus } : t
              ));
              
              // Recalculate total budget
              const updatedTasks = tasks.map(t => 
                taskIds.includes(t.id) ? { ...t, status: newStatus } : t
              );
              const newTotal = updatedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
              setTotalTaskBudget(newTotal);
            }}
            onAutoShift={(shiftedTasks) => {
              console.log("Auto-shift tasks:", shiftedTasks);
            }}
            onProjectDatesChange={async (startDate, endDate, tasksToShift) => {
              // Update all task due dates in database
              for (const taskShift of tasksToShift) {
                await supabase
                  .from("project_tasks")
                  .update({ due_date: taskShift.newDueDate })
                  .eq("id", taskShift.taskId);
              }
              
              // Refresh tasks
              const { data } = await supabase
                .from("project_tasks")
                .select("*")
                .eq("project_id", projectId)
                .order("due_date", { ascending: true });
              
              if (data) {
                setTasks(data.map(t => ({
                  ...t,
                  unit_price: t.unit_price || 0,
                  quantity: t.quantity || 1,
                  total_cost: t.total_cost || 0,
                })));
              }
              
              toast.success(`${tasksToShift.length} tasks updated`);
            }}
          />
        )}
      </div>

      {/* Operational Truth Cards - 8 Pillars */}
      <OperationalTruthCards
        operationalTruth={buildOperationalTruth({
          aiAnalysis,
          blueprintAnalysis: blueprintAnalysis ? { analyzed: !!blueprintAnalysis.extractedText } : undefined,
          dualEngineOutput,
          synthesisResult,
          filterAnswers,
          projectSize: photoEstimate?.projectSize || aiConfig?.projectSize,
        })} 
      />

      {/* Baseline Lock Card - ALWAYS VISIBLE */}
      {summary && (
        <BaselineLockCard
          projectId={projectId}
          summaryId={summary.id}
          operationalTruth={operationalTruth}
          currentBaseline={baselineState}
          isOwner={isOwner}
          onBaselineLocked={handleBaselineLocked}
          initialStartDate={summary.project_start_date}
          initialEndDate={summary.project_end_date}
          onDatesChanged={(startDate, endDate) => {
            // Update local summary state - this will automatically sync with:
            // 1. ProjectTimelineBar (above)
            // 2. ProjectTimelineBar in Timeline tab
            // 3. HierarchicalTimeline (receives dates via props)
            setSummary(prev => prev ? {
              ...prev,
              project_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
              project_end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
            } : null);
            
            // Toast notification for sync feedback
            toast.success(t("baseline.datesSynced", "Project dates synced across all timelines"));
          }}
        />
      )}

    </div>
  );
};

export default ProjectDetailsView;
