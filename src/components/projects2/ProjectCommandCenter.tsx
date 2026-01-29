import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Printer,
  Mail,
  Download,
  Loader2,
  CheckCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileSignature,
  Receipt,
  ClipboardList,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Copy,
  Brain,
  Zap,
  Eye,
  Pencil,
  ExternalLink,
  Keyboard,
  Save,
  Activity,
  Database,
  MapPin,
  FileText,
  CloudSun,
  Calendar,
  Shield,
  AlertTriangle,
  Ruler,
  Package,
  FileCheck,
  UserCheck,
  Clock,
  CircleCheck,
  CircleDashed,
  AlertOctagon,
  Radio,
  CircleAlert,
  Lock,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateProjectReport, generatePDFBlob, ProjectReportParams, ConflictData, buildProjectReportHTML } from "@/lib/pdfGenerator";
import { OperationalTruth } from "@/types/operationalTruth";
import { CitationSource } from "@/types/citation";
import { ProBadge } from "@/components/ui/pro-badge";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import { saveDocumentToProject, saveAIBriefToProject, saveReportToProject } from "@/lib/documentUtils";
import CitationRegistry from "@/components/citations/CitationRegistry";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";

// ============================================
// DATA SOURCE STATUS TYPES
// ============================================

interface DataSourceStatus {
  id: string;
  name: string;
  category: "pillar" | "workflow";
  status: "complete" | "partial" | "pending";
  value?: string | number;
  icon: React.ComponentType<{ className?: string }>;
  missingItems?: string[]; // List of what's missing for tooltip
}

interface DataSourcesInfo {
  taskCount: number;
  completedTasks: number;
  documentCount: number;
  contractCount: number;
  signedContracts: number;
  teamSize: number;
  hasTimeline: boolean;
  hasStartDate: boolean;
  hasEndDate: boolean;
  hasClientInfo: boolean;
}

interface ClientInfoData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

// ============================================
// TYPES
// ============================================

interface DocumentAction {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "report" | "financial" | "legal" | "team";
  isPremium?: boolean;
  previewContent?: string;
  navigateTo?: string;
  action: () => Promise<void> | void;
}


interface ProjectCommandCenterProps {
  projectId: string;
  projectName: string;
  projectAddress?: string;
  projectTrade?: string;
  projectCreatedAt: string;
  projectStatus?: string;
  operationalTruth: OperationalTruth;
  companyBranding?: {
    name?: string;
    logo?: string;
    license?: string;
    wsib?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  conflicts?: ConflictData[];
  isPremium?: boolean;
  subscriptionTier?: "free" | "pro" | "premium" | "enterprise";
  onNavigateToTab?: (tabId: string) => void;
  // Project completion callback
  onCompleteProject?: () => Promise<void>;
  // Extended data sources info
  dataSourcesInfo?: DataSourcesInfo;
  // Client info management
  clientInfo?: ClientInfoData;
  onClientInfoUpdate?: (info: ClientInfoData) => void;
  // Citation Registry
  citations?: CitationSource[];
  onCitationClick?: (citation: CitationSource) => void;
  onLinkCitationToPillar?: (sourceId: string, pillar: string) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const ProjectCommandCenter = ({
  projectId,
  projectName,
  projectAddress,
  projectTrade,
  projectCreatedAt,
  projectStatus,
  operationalTruth,
  companyBranding,
  conflicts = [],
  isPremium = false,
  subscriptionTier = "free",
  onNavigateToTab,
  onCompleteProject,
  dataSourcesInfo,
  clientInfo,
  onClientInfoUpdate,
  citations = [],
  onCitationClick,
  onLinkCitationToPillar,
}: ProjectCommandCenterProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isGeneratingTeamReport, setIsGeneratingTeamReport] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefMetadata, setBriefMetadata] = useState<any>(null);
  const [teamReportContent, setTeamReportContent] = useState<string | null>(null);
  const [teamReportMetadata, setTeamReportMetadata] = useState<any>(null);
  const [isBriefDialogOpen, setIsBriefDialogOpen] = useState(false);
  const [isTeamReportDialogOpen, setIsTeamReportDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [activeDocumentCategory, setActiveDocumentCategory] = useState<string>("all");
  
  
  // Client Info Dialog state
  const [isClientInfoDialogOpen, setIsClientInfoDialogOpen] = useState(false);
  const [editingClientInfo, setEditingClientInfo] = useState<ClientInfoData>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSavingClientInfo, setIsSavingClientInfo] = useState(false);
  
  // Editable content states for reports
  const [editableBriefContent, setEditableBriefContent] = useState<string>("");
  const [editableTeamReportContent, setEditableTeamReportContent] = useState<string>("");
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [isEditingTeamReport, setIsEditingTeamReport] = useState(false);
  const [isSavingBrief, setIsSavingBrief] = useState(false);
  const [isSavingTeamReport, setIsSavingTeamReport] = useState(false);
  
  // Team Report Send to Team state
  const [isSendToTeamDialogOpen, setIsSendToTeamDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ user_id: string; email: string; name: string; role: string }>>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customRecipientEmail, setCustomRecipientEmail] = useState("");
  const [customRecipients, setCustomRecipients] = useState<string[]>([]);
  const [isSendingToTeam, setIsSendingToTeam] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, errors: 0 });
  
  // Preview state
  const [previewDocument, setPreviewDocument] = useState<DocumentAction | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Selected state for visual feedback
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  
  // Double-tap detection for mobile
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  
  // ============================================
  // M.E.S.S.A. BRIEF TRIAL & GATING
  // ============================================
  const {
    remainingTrials: messaTrialsRemaining,
    hasTrialsRemaining: hasMessaTrials,
    useOneTrial: useMessaTrial,
    loading: trialLoading,
  } = useDbTrialUsage("messa_brief");

  // ============================================
  // CONFLICT MONITOR STATE
  // ============================================
  const [conflictMonitorData, setConflictMonitorData] = useState<{
    hasConflict: boolean;
    conflictDetails: string[];
    lastChecked: Date | null;
    severity: "none" | "warning" | "critical";
  }>({
    hasConflict: false,
    conflictDetails: [],
    lastChecked: null,
    severity: "none",
  });

  // ============================================
  // BUILD 16 DATA SOURCES STATUS
  // ============================================
  
  // Determine if Solo Mode for conditional requirements
  const isSoloMode = operationalTruth.projectMode === "solo";
  
  const buildDataSourcesStatus = useCallback((): DataSourceStatus[] => {
    const sources: DataSourceStatus[] = [];
    
    // 8 PILLARS OF OPERATIONAL TRUTH (with missing items for tooltips)
    
    // Area
    const areaMissing: string[] = [];
    if (operationalTruth.confirmedArea === null) areaMissing.push("Area not detected from photos/blueprints");
    
    sources.push({
      id: "area",
      name: "Confirmed Area",
      category: "pillar",
      status: operationalTruth.confirmedArea !== null ? "complete" : "pending",
      value: operationalTruth.confirmedArea ? `${operationalTruth.confirmedArea} ${operationalTruth.areaUnit}` : undefined,
      icon: Ruler,
      missingItems: areaMissing.length > 0 ? areaMissing : undefined,
    });
    
    // Materials - Only show materials-related warnings
    const materialsMissing: string[] = [];
    if (operationalTruth.materialsCount === 0) materialsMissing.push("No materials detected by AI");
    
    sources.push({
      id: "materials",
      name: "Materials Count",
      category: "pillar",
      status: operationalTruth.materialsCount > 0 ? "complete" : "pending",
      value: operationalTruth.materialsCount > 0 ? `${operationalTruth.materialsCount} items` : undefined,
      icon: Package,
      missingItems: materialsMissing.length > 0 ? materialsMissing : undefined,
    });
    
    // Blueprint
    const blueprintMissing: string[] = [];
    if (operationalTruth.blueprintStatus === "pending") blueprintMissing.push("Blueprint not analyzed or validated");
    else if (operationalTruth.blueprintStatus === "none") blueprintMissing.push("No blueprint provided");
    
    sources.push({
      id: "blueprint",
      name: "Blueprint Status",
      category: "pillar",
      status: operationalTruth.blueprintStatus === "analyzed" ? "complete" : operationalTruth.blueprintStatus === "none" ? "partial" : "pending",
      value: operationalTruth.blueprintStatus,
      icon: FileCheck,
      missingItems: blueprintMissing.length > 0 ? blueprintMissing : undefined,
    });
    
    // OBC Compliance
    const obcMissing: string[] = [];
    if (operationalTruth.obcCompliance === "pending") obcMissing.push("OBC compliance check not run");
    
    sources.push({
      id: "obc",
      name: "OBC Compliance",
      category: "pillar",
      status: operationalTruth.obcCompliance !== "pending" ? "complete" : "pending",
      value: operationalTruth.obcCompliance,
      icon: Shield,
      missingItems: obcMissing.length > 0 ? obcMissing : undefined,
    });
    
    // Conflict Status
    const conflictMissing: string[] = [];
    if (operationalTruth.conflictStatus === "pending") conflictMissing.push("Conflict check not run");
    
    sources.push({
      id: "conflict",
      name: "Conflict Status",
      category: "pillar",
      status: operationalTruth.conflictStatus !== "pending" ? "complete" : "pending",
      value: operationalTruth.conflictStatus,
      icon: AlertTriangle,
      missingItems: conflictMissing.length > 0 ? conflictMissing : undefined,
    });
    
    // Project Mode (always complete)
    sources.push({
      id: "mode",
      name: "Project Mode",
      category: "pillar",
      status: "complete",
      value: operationalTruth.projectMode,
      icon: UserCheck,
    });
    
    // Project Size (always complete)
    sources.push({
      id: "size",
      name: "Project Size",
      category: "pillar",
      status: "complete",
      value: operationalTruth.projectSize,
      icon: Activity,
    });
    
    // AI Confidence
    const confidenceMissing: string[] = [];
    if (operationalTruth.confidenceLevel === "low") confidenceMissing.push("Insufficient data for high confidence");
    
    sources.push({
      id: "confidence",
      name: "AI Confidence",
      category: "pillar",
      status: operationalTruth.confidenceLevel !== "low" ? "complete" : "partial",
      value: operationalTruth.confidenceLevel,
      icon: Brain,
      missingItems: confidenceMissing.length > 0 ? confidenceMissing : undefined,
    });
    
    // 8 WORKFLOW DATA SOURCES
    const info = dataSourcesInfo || {
      taskCount: 0,
      completedTasks: 0,
      documentCount: 0,
      contractCount: 0,
      signedContracts: 0,
      teamSize: 1,
      hasTimeline: false,
      hasStartDate: false,
      hasEndDate: false,
      hasClientInfo: false,
    };
    
    // Tasks - check if any exist and if ALL are completed (complete only when 100%)
    const tasksMissing: string[] = [];
    if (info.taskCount === 0) {
      tasksMissing.push("No tasks created");
    } else if (info.completedTasks < info.taskCount) {
      tasksMissing.push(`${info.taskCount - info.completedTasks} tasks remaining`);
    }
    
    // Status: complete = ALL tasks done, partial = some tasks exist/done, pending = none
    const allTasksComplete = info.taskCount > 0 && info.completedTasks === info.taskCount;
    const someTasksExist = info.taskCount > 0;
    
    sources.push({
      id: "tasks",
      name: "Tasks",
      category: "workflow",
      status: allTasksComplete ? "complete" : someTasksExist ? "partial" : "pending",
      value: info.taskCount > 0 ? `${info.completedTasks}/${info.taskCount}` : undefined,
      icon: ClipboardList,
      missingItems: tasksMissing.length > 0 ? tasksMissing : undefined,
    });
    
    // Documents - SOLO MODE: not required, so show as complete if docs exist OR mark as N/A (complete)
    const docsMissing: string[] = [];
    if (!isSoloMode) {
      // Team mode: require at least 1 uploaded document AND 1 contract for complete
      if (info.documentCount === 0) docsMissing.push("No documents uploaded");
      if (info.contractCount === 0) docsMissing.push("No contract created");
    }
    // Solo mode: documents are optional
    
    // Status: complete = has docs AND contracts, partial = has one or the other, pending = neither
    // SOLO MODE: Always "complete" (not a requirement)
    const hasDocs = info.documentCount > 0;
    const hasContracts = info.contractCount > 0;
    const docsStatus = isSoloMode 
      ? "complete" // Solo: not required, auto-complete
      : (hasDocs && hasContracts) 
        ? "complete" 
        : (hasDocs || hasContracts) 
          ? "partial" 
          : "pending";
    
    sources.push({
      id: "documents",
      name: "Documents",
      category: "workflow",
      status: docsStatus,
      value: isSoloMode 
        ? (hasDocs ? `${info.documentCount} files` : t("commandCenter.solo.notRequired", "N/A (Solo)"))
        : hasDocs 
          ? `${info.documentCount} files${hasContracts ? ` + ${info.contractCount} contract${info.contractCount > 1 ? 's' : ''}` : ''}`
          : hasContracts 
            ? `${info.contractCount} contract${info.contractCount > 1 ? 's' : ''} only`
            : undefined,
      icon: FileText,
      missingItems: docsMissing.length > 0 ? docsMissing : undefined,
    });
    
    // Contracts - SOLO MODE: Not required, auto-complete
    const contractsMissing: string[] = [];
    if (!isSoloMode) {
      if (info.contractCount === 0) {
        contractsMissing.push("No contract created");
      } else if (info.signedContracts === 0) {
        contractsMissing.push("Contract not signed by client");
      }
    }
    
    // Status: complete = signed, partial = created but not signed, pending = none
    // SOLO MODE: Always "complete" (not a requirement)
    const contractStatus = isSoloMode
      ? "complete" // Solo: not required
      : info.signedContracts > 0 
        ? "complete" 
        : info.contractCount > 0 
          ? "partial" 
          : "pending";
    
    sources.push({
      id: "contracts",
      name: "Contracts",
      category: "workflow",
      status: contractStatus,
      value: isSoloMode
        ? (info.contractCount > 0 ? `${info.contractCount} created` : t("commandCenter.solo.notRequired", "N/A (Solo)"))
        : info.contractCount > 0 
          ? (info.signedContracts > 0 
              ? `${info.signedContracts}/${info.contractCount} signed` 
              : `${info.contractCount} created (unsigned)`)
          : undefined,
      icon: FileSignature,
      missingItems: contractsMissing.length > 0 ? contractsMissing : undefined,
    });
    
    // Team - SOLO MODE: Not required, auto-complete
    const teamMissing: string[] = [];
    const hasTeamMembers = info.teamSize > 1; // More than just owner
    if (!isSoloMode && !hasTeamMembers) {
      teamMissing.push("No team members added (only owner)");
    }
    
    sources.push({
      id: "team",
      name: "Team",
      category: "workflow",
      status: isSoloMode ? "complete" : (hasTeamMembers ? "complete" : "pending"),
      value: isSoloMode ? t("commandCenter.solo.notRequired", "N/A (Solo)") : (hasTeamMembers ? `${info.teamSize} members` : "Owner only"),
      icon: Users,
      missingItems: teamMissing.length > 0 ? teamMissing : undefined,
    });
    
    // Site Map - requires project address
    const siteMapMissing: string[] = [];
    if (!projectAddress) siteMapMissing.push("No project address set");
    
    sources.push({
      id: "sitemap",
      name: "Site Map",
      category: "workflow",
      status: projectAddress ? "complete" : "pending",
      value: projectAddress ? "Located" : undefined,
      icon: MapPin,
      missingItems: siteMapMissing.length > 0 ? siteMapMissing : undefined,
    });
    
    // Timeline - complete = both dates, partial = only start date, pending = neither
    const timelineMissing: string[] = [];
    if (!info.hasStartDate) timelineMissing.push("Project start date not set");
    if (!info.hasEndDate) timelineMissing.push("Target end date not set");
    
    // Status: complete = both dates, partial = start only, pending = neither
    const timelineStatus = (info.hasStartDate && info.hasEndDate) 
      ? "complete" 
      : info.hasStartDate 
        ? "partial" 
        : "pending";
    
    sources.push({
      id: "timeline",
      name: "Timeline",
      category: "workflow",
      status: timelineStatus,
      value: info.hasTimeline 
        ? "Complete" 
        : info.hasStartDate 
          ? "Start only" 
          : undefined,
      icon: Calendar,
      missingItems: timelineMissing.length > 0 ? timelineMissing : undefined,
    });
    
    // Client Info - requires name or email
    const clientMissing: string[] = [];
    if (!info.hasClientInfo) clientMissing.push("Client name/email missing");
    
    sources.push({
      id: "client",
      name: "Client Info",
      category: "workflow",
      status: info.hasClientInfo ? "complete" : "pending",
      value: info.hasClientInfo ? "Complete" : undefined,
      icon: UserCheck,
      missingItems: clientMissing.length > 0 ? clientMissing : undefined,
    });
    
    // Weather - requires address for location-based weather
    const weatherMissing: string[] = [];
    if (!projectAddress) weatherMissing.push("Add address for weather data");
    
    sources.push({
      id: "weather",
      name: "Weather",
      category: "workflow",
      status: projectAddress ? "complete" : "pending",
      value: projectAddress ? "Available" : undefined,
      icon: CloudSun,
      missingItems: weatherMissing.length > 0 ? weatherMissing : undefined,
    });
    
    return sources;
  }, [operationalTruth, dataSourcesInfo, projectAddress, isSoloMode]);

  const dataSources = buildDataSourcesStatus();
  
  // Calculate Project Health Score
  // Solo mode: exclude N/A sources (documents, contracts, team) from health calculation
  const soloExcludedIds = ["documents", "contracts", "team"];
  const relevantSources = isSoloMode 
    ? dataSources.filter(s => !soloExcludedIds.includes(s.id))
    : dataSources;

  const healthScore = Math.round(
    (relevantSources.filter(s => s.status === "complete").length / relevantSources.length) * 100
  );
  
  const partialCount = dataSources.filter(s => s.status === "partial").length;
  const pendingCount = dataSources.filter(s => s.status === "pending").length;
  const completeCount = dataSources.filter(s => s.status === "complete").length;

  // ============================================
  // M.E.S.S.A. BRIEF GATING LOGIC
  // ============================================
  
  // Calculate separate completion rates for pillars (Op Truth) and workflow (Data Sources)
  const pillarSources = dataSources.filter(s => s.category === "pillar");
  const workflowSources = dataSources.filter(s => s.category === "workflow");
  
  const pillarCompletionRate = Math.round(
    (pillarSources.filter(s => s.status === "complete").length / pillarSources.length) * 100
  );
  
  const workflowCompletionRate = Math.round(
    (workflowSources.filter(s => s.status === "complete").length / workflowSources.length) * 100
  );

  // Tier-based gating for M.E.S.S.A. Brief:
  // Free: 3 trials + 100% Op Truth / 80% Data Sources
  // Pro: Unlimited + 80% both
  // Premium: Unlimited + no threshold
  const messaBriefGating = useMemo(() => {
    const isFree = subscriptionTier === "free";
    const isPro = subscriptionTier === "pro";
    const isPremium = subscriptionTier === "premium" || subscriptionTier === "enterprise";

    // Premium: No restrictions
    if (isPremium) {
      return {
        canGenerate: true,
        reason: null,
        showTrialCounter: false,
        trialsRemaining: Infinity,
      };
    }

    // Pro: Unlimited but needs 80%+ both pillars and workflow
    if (isPro) {
      const meetsThreshold = pillarCompletionRate >= 80 && workflowCompletionRate >= 80;
      return {
        canGenerate: meetsThreshold,
        reason: !meetsThreshold 
          ? `Complete at least 80% of Operational Truth (${pillarCompletionRate}%) and Data Sources (${workflowCompletionRate}%) to generate`
          : null,
        showTrialCounter: false,
        trialsRemaining: Infinity,
      };
    }

    // Free: 3 trials + 100% Op Truth / 80% Data Sources
    const meetsThreshold = pillarCompletionRate >= 100 && workflowCompletionRate >= 80;
    const hasTrials = messaTrialsRemaining > 0;
    
    return {
      canGenerate: meetsThreshold && hasTrials,
      reason: !meetsThreshold
        ? `Free tier requires 100% Operational Truth (${pillarCompletionRate}%) and 80% Data Sources (${workflowCompletionRate}%)`
        : !hasTrials
          ? "No free trials remaining. Upgrade to Pro for unlimited briefs."
          : null,
      showTrialCounter: true,
      trialsRemaining: messaTrialsRemaining,
    };
  }, [subscriptionTier, pillarCompletionRate, workflowCompletionRate, messaTrialsRemaining]);

  // ============================================
  // CONFLICT MONITOR - Cross-Check Logic (5 min interval)
  // ============================================
  const runConflictCheck = useCallback(() => {
    const conflictDetails: string[] = [];
    let severity: "none" | "warning" | "critical" = "none";
    
    // Cross-check critical data sources: Area, Timeline, Weather, GPS
    const areaSource = dataSources.find(s => s.id === "area");
    const timelineSource = dataSources.find(s => s.id === "timeline");
    const weatherSource = dataSources.find(s => s.id === "weather");
    const siteMapSource = dataSources.find(s => s.id === "sitemap");
    const tasksSource = dataSources.find(s => s.id === "tasks");
    const materialsSource = dataSources.find(s => s.id === "materials");
    
    // Check 1: Area vs Materials mismatch
    if (areaSource?.status === "complete" && materialsSource?.status === "pending") {
      conflictDetails.push("Area confirmed but no materials calculated");
      severity = "warning";
    }
    
    // Check 2: Timeline without tasks
    if (timelineSource?.status === "complete" && tasksSource?.status === "pending") {
      conflictDetails.push("Timeline set but no tasks assigned");
      severity = "warning";
    }
    
    // Check 3: GPS/Site without weather monitoring
    if (siteMapSource?.status === "complete" && weatherSource?.status === "pending") {
      conflictDetails.push("Site located but weather data unavailable");
      severity = "warning";
    }
    
    // Check 4: Operational Truth conflicts
    if (operationalTruth.conflictStatus === "conflict_detected") {
      conflictDetails.push("Site-to-Blueprint data conflict detected");
      severity = "critical";
    }
    
    // Check 5: OBC compliance issues (permit_required is a warning, not critical)
    if (operationalTruth.obcCompliance === "permit_required") {
      conflictDetails.push("OBC permit required - ensure compliance before proceeding");
      severity = severity === "critical" ? "critical" : "warning";
    }
    
    // Check 6: AI Confidence too low with high completion
    if (operationalTruth.confidenceLevel === "low" && healthScore > 50) {
      conflictDetails.push("Low AI confidence despite high data completion");
      severity = severity === "critical" ? "critical" : "warning";
    }
    
    // Check 7: Tasks assigned but team incomplete (ONLY for Team Mode)
    if (!isSoloMode && tasksSource?.status !== "pending") {
      const info = dataSourcesInfo || { teamSize: 1, taskCount: 0 };
      if (info.taskCount > 5 && info.teamSize < 2) {
        conflictDetails.push("Multiple tasks but only solo team member");
        severity = severity === "critical" ? "critical" : "warning";
      }
    }
    
    setConflictMonitorData({
      hasConflict: conflictDetails.length > 0,
      conflictDetails,
      lastChecked: new Date(),
      severity,
    });
    
  }, [dataSources, operationalTruth, healthScore, dataSourcesInfo, isSoloMode]);
  
  // Run conflict check on mount and every 5 minutes
  useEffect(() => {
    runConflictCheck();
    const interval = setInterval(runConflictCheck, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [runConflictCheck]);

  // Generate AI Brief and save to documents
  const generateAIBrief = useCallback(async (saveToDocuments = true) => {
    // Check gating first
    if (!messaBriefGating.canGenerate) {
      toast.error(messaBriefGating.reason || "Cannot generate brief at this time");
      return;
    }

    // For free tier, use one trial
    if (subscriptionTier === "free") {
      const trialUsed = await useMessaTrial();
      if (!trialUsed) {
        toast.error("Failed to use trial. Please try again.");
        return;
      }
    }

    setIsGeneratingBrief(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to generate briefs");
        return;
      }

      const response = await supabase.functions.invoke("generate-project-brief", {
        body: { projectId, tier: subscriptionTier },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.brief) {
        setBriefContent(response.data.brief);
        setBriefMetadata(response.data.metadata);
        setIsBriefDialogOpen(true);
        setIsPreviewMode(false);

        // Save to documents
        if (saveToDocuments) {
          const result = await saveAIBriefToProject(
            projectId,
            session.user.id,
            response.data.brief,
            projectName
          );
          if (result.success) {
            toast.success("AI Brief generated & saved to Documents!");
          } else {
            toast.success("AI Brief generated!");
          }
        } else {
          toast.success("AI Brief generated!");
        }
      }
    } catch (error) {
      console.error("Brief generation error:", error);
      toast.error("Failed to generate brief. Please try again.");
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [projectId, projectName, subscriptionTier, messaBriefGating, useMessaTrial]);

  // Generate Team Report and save to documents
  const generateTeamReport = useCallback(async (saveToDocuments = true) => {
    setIsGeneratingTeamReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to generate reports");
        return;
      }

      const response = await supabase.functions.invoke("generate-team-report", {
        body: { projectId, tier: subscriptionTier },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.report) {
        setTeamReportContent(response.data.report);
        setTeamReportMetadata(response.data.metadata);
        setIsTeamReportDialogOpen(true);

        // Save to documents
        if (saveToDocuments) {
          const timestamp = new Date().toISOString().split('T')[0];
          const fileName = `Team_Report_${projectName.replace(/\s+/g, '_')}_${timestamp}.txt`;
          const blob = new Blob([response.data.report], { type: 'text/plain' });
          
          const result = await saveDocumentToProject({
            projectId,
            userId: session.user.id,
            fileName,
            fileBlob: blob,
            documentType: 'team-report'
          });
          
          if (result.success) {
            toast.success("Team Report generated & saved to Documents!");
          } else {
            toast.success("Team Report generated!");
          }
        } else {
          toast.success("Team Report generated!");
        }
      }
    } catch (error) {
      console.error("Team report generation error:", error);
      toast.error("Failed to generate team report. Please try again.");
    } finally {
      setIsGeneratingTeamReport(false);
    }
  }, [projectId, projectName, subscriptionTier]);

  // Generate Project Report PDF and save to documents
  const generateFullReport = useCallback(async (saveToDocuments = true) => {
    toast.loading("Generating Full Project Report...", { id: "report" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to generate reports", { id: "report" });
        return;
      }

      // Build data sources info for the report
      const info = dataSourcesInfo || {
        taskCount: 0,
        completedTasks: 0,
        documentCount: 0,
        contractCount: 0,
        signedContracts: 0,
        teamSize: 1,
        hasTimeline: false,
        hasClientInfo: false,
      };

      const params: ProjectReportParams = {
        projectInfo: {
          name: projectName,
          address: projectAddress || "Address not specified",
          trade: projectTrade || "General",
          createdAt: new Date(projectCreatedAt).toLocaleDateString("en-CA"),
        },
        operationalTruth,
        conflicts,
        companyBranding,
        // Include 8 workflow data sources
        workflowData: {
          tasks: { count: info.taskCount, completed: info.completedTasks },
          documents: { count: info.documentCount },
          contracts: { count: info.contractCount, signed: info.signedContracts },
          team: { size: info.teamSize },
          timeline: { 
            startDate: undefined, // Would need to pass from parent
            endDate: undefined 
          },
          clientInfo: clientInfo || { name: undefined, email: undefined, phone: undefined, address: undefined },
          weather: { 
            available: !!projectAddress,
            location: projectAddress 
          },
        },
      };

      // Generate HTML and convert to PDF blob
      const html = buildProjectReportHTML(params);
      const pdfBlob = await generatePDFBlob(html, {
        filename: `${projectName.replace(/\s+/g, "_")}_FullReport.pdf`,
        pageFormat: 'a4'
      });

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, "_")}_FullReport_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save to documents
      if (saveToDocuments) {
        const result = await saveReportToProject(
          projectId,
          session.user.id,
          pdfBlob,
          'project-report',
          projectName
        );
        if (result.success) {
          toast.success("Full Report downloaded & saved to Documents!", { id: "report" });
        } else {
          toast.success("Full Report downloaded!", { id: "report" });
        }
      } else {
        toast.success("Full Report downloaded!", { id: "report" });
      }
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report", { id: "report" });
    }
  }, [projectId, projectName, projectAddress, projectTrade, projectCreatedAt, operationalTruth, conflicts, companyBranding, dataSourcesInfo, clientInfo]);

  // Copy Brief to Clipboard
  const copyBriefToClipboard = useCallback(async () => {
    if (!briefContent) return;
    try {
      await navigator.clipboard.writeText(briefContent);
      toast.success("Brief copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  }, [briefContent]);

  // Print Brief
  const printBrief = useCallback(() => {
    if (!briefContent) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${projectName} - AI Brief</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            h1 { color: #1e293b; border-bottom: 3px solid #0d9488; padding-bottom: 8px; }
            h2 { color: #334155; margin-top: 24px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
            .meta { color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>🏗️ ${projectName}</h1>
              <p class="meta">${projectAddress || ""}</p>
            </div>
            <div class="meta" style="text-align: right;">
              Generated: ${new Date().toLocaleDateString()}<br/>
              Data Sources: 16
            </div>
          </div>
          ${briefContent.replace(/\n/g, "<br/>")}
          <hr style="margin-top: 40px; border: 1px solid #e2e8f0;" />
          <p class="meta" style="text-align: center;">Generated with BuildUnion AI • Professional Construction Intelligence</p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [briefContent, projectName, projectAddress]);

  // Email Brief
  const emailBrief = useCallback(() => {
    const contentToEmail = isEditingBrief ? editableBriefContent : briefContent;
    if (!contentToEmail) return;
    const subject = encodeURIComponent(`Project Brief: ${projectName}`);
    const body = encodeURIComponent(`Project Brief for ${projectName}\n\n${contentToEmail}\n\n---\nGenerated with BuildUnion AI`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [briefContent, editableBriefContent, isEditingBrief, projectName]);

  // Save edited Brief
  const saveEditedBrief = useCallback(async () => {
    if (!editableBriefContent.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    
    setIsSavingBrief(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to save");
        return;
      }

      // Save to documents
      const result = await saveAIBriefToProject(
        projectId,
        session.user.id,
        editableBriefContent,
        projectName
      );
      
      if (result.success) {
        // Update the main content
        setBriefContent(editableBriefContent);
        setIsEditingBrief(false);
        toast.success("Brief saved to Documents!");
      } else {
        toast.error("Failed to save brief");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save brief");
    } finally {
      setIsSavingBrief(false);
    }
  }, [editableBriefContent, projectId, projectName]);

  // Save edited Team Report
  const saveEditedTeamReport = useCallback(async () => {
    if (!editableTeamReportContent.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    
    setIsSavingTeamReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to save");
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `Team_Report_${projectName.replace(/\s+/g, '_')}_${timestamp}.txt`;
      const blob = new Blob([editableTeamReportContent], { type: 'text/plain' });
      
      const result = await saveDocumentToProject({
        projectId,
        userId: session.user.id,
        fileName,
        fileBlob: blob,
        documentType: 'team-report'
      });
      
      if (result.success) {
        setTeamReportContent(editableTeamReportContent);
        setIsEditingTeamReport(false);
        toast.success("Team Report saved to Documents!");
      } else {
        toast.error("Failed to save report");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save report");
    } finally {
      setIsSavingTeamReport(false);
    }
  }, [editableTeamReportContent, projectId, projectName]);

  // Start editing brief
  const startEditingBrief = useCallback(() => {
    setEditableBriefContent(briefContent || "");
    setIsEditingBrief(true);
  }, [briefContent]);

  // Start editing team report
  const startEditingTeamReport = useCallback(() => {
    setEditableTeamReportContent(teamReportContent || "");
    setIsEditingTeamReport(true);
  }, [teamReportContent]);

  // Cancel editing
  const cancelEditingBrief = useCallback(() => {
    setIsEditingBrief(false);
    setEditableBriefContent("");
  }, []);

  // ============================================
  // CLIENT INFO MANAGEMENT
  // ============================================
  
  // Open client info dialog
  const openClientInfoDialog = useCallback(() => {
    setEditingClientInfo({
      name: clientInfo?.name || "",
      email: clientInfo?.email || "",
      phone: clientInfo?.phone || "",
      address: clientInfo?.address || "",
    });
    setIsClientInfoDialogOpen(true);
  }, [clientInfo]);

  // Save client info
  const saveClientInfo = useCallback(async () => {
    setIsSavingClientInfo(true);
    try {
      // Call the parent update handler
      if (onClientInfoUpdate) {
        await onClientInfoUpdate(editingClientInfo);
      }
      
      setIsClientInfoDialogOpen(false);
      toast.success("Client information saved!");
    } catch (error) {
      console.error("Save client info error:", error);
      toast.error("Failed to save client information");
    } finally {
      setIsSavingClientInfo(false);
    }
  }, [editingClientInfo, onClientInfoUpdate]);

  // ============================================
  // DATA SOURCE NAVIGATION
  // ============================================
  
  const handleDataSourceClick = useCallback((sourceId: string) => {
    // Map data source IDs to navigation actions or dialogs
    const navigationMap: Record<string, () => void> = {
      tasks: () => onNavigateToTab?.("team"),
      documents: () => onNavigateToTab?.("contracts"),
      contracts: () => onNavigateToTab?.("contracts"),
      team: () => onNavigateToTab?.("team"),
      sitemap: () => onNavigateToTab?.("map"),
      timeline: () => onNavigateToTab?.("team"),
      client: openClientInfoDialog,
      weather: () => onNavigateToTab?.("weather"),
      // Pillars navigate to overview
      area: () => onNavigateToTab?.("overview"),
      materials: () => onNavigateToTab?.("materials"),
      blueprint: () => onNavigateToTab?.("overview"),
      obc: () => onNavigateToTab?.("overview"),
      conflicts: () => onNavigateToTab?.("overview"),
      mode: () => onNavigateToTab?.("team"),
      projectSize: () => onNavigateToTab?.("overview"),
      confidence: () => onNavigateToTab?.("overview"),
    };
    
    const action = navigationMap[sourceId];
    if (action) {
      action();
    }
  }, [onNavigateToTab, openClientInfoDialog]);

  const cancelEditingTeamReport = useCallback(() => {
    setIsEditingTeamReport(false);
    setEditableTeamReportContent("");
  }, []);

  // Fetch team members for "Send to Team"
  const fetchTeamMembersForSend = useCallback(async () => {
    try {
      // Get project members
      const { data: members, error: membersError } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Get profiles for these members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Get auth emails (we'll need to get this from bu_profiles or use user_id lookup)
      const { data: buProfiles, error: buError } = await supabase
        .from("bu_profiles")
        .select("user_id, phone, company_name")
        .in("user_id", userIds);

      // Combine data - for email, we'll use the profiles table or fallback
      const combinedMembers = members.map(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        const buProfile = buProfiles?.find(bp => bp.user_id === m.user_id);
        return {
          user_id: m.user_id,
          email: "", // We'll need to get this from auth or have users add it
          name: profile?.full_name || buProfile?.company_name || "Team Member",
          role: m.role
        };
      });

      setTeamMembers(combinedMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembers([]);
    }
  }, [projectId]);

  // Open Send to Team dialog
  const openSendToTeamDialog = useCallback(async () => {
    await fetchTeamMembersForSend();
    setSelectedRecipients([]);
    setCustomRecipients([]);
    setCustomRecipientEmail("");
    setSendProgress({ sent: 0, total: 0, errors: 0 });
    setIsSendToTeamDialogOpen(true);
  }, [fetchTeamMembersForSend]);

  // Add custom recipient
  const addCustomRecipient = useCallback(() => {
    const email = customRecipientEmail.trim().toLowerCase();
    if (!email) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    if (customRecipients.includes(email)) {
      toast.error("Email already added");
      return;
    }
    
    setCustomRecipients(prev => [...prev, email]);
    setCustomRecipientEmail("");
  }, [customRecipientEmail, customRecipients]);

  // Remove custom recipient
  const removeCustomRecipient = useCallback((email: string) => {
    setCustomRecipients(prev => prev.filter(e => e !== email));
  }, []);

  // Send Team Report to selected recipients
  const sendTeamReportToRecipients = useCallback(async () => {
    const allRecipients = [...customRecipients];
    
    // Get emails from selected team members
    for (const userId of selectedRecipients) {
      const member = teamMembers.find(m => m.user_id === userId);
      if (member?.email) {
        allRecipients.push(member.email);
      }
    }
    
    // Deduplicate
    const uniqueRecipients = [...new Set(allRecipients.filter(e => e))];
    
    if (uniqueRecipients.length === 0) {
      toast.error("Please add at least one recipient email");
      return;
    }
    
    setIsSendingToTeam(true);
    setSendProgress({ sent: 0, total: uniqueRecipients.length, errors: 0 });
    
    let sent = 0;
    let errors = 0;
    const contentToSend = isEditingTeamReport ? editableTeamReportContent : teamReportContent;
    
    for (const email of uniqueRecipients) {
      try {
        const { error } = await supabase.functions.invoke("send-admin-email", {
          body: {
            recipientEmail: email,
            recipientName: email.split("@")[0],
            subject: `Team Report: ${projectName}`,
            message: `<h2>Team Performance Report</h2>
              <p><strong>Project:</strong> ${projectName}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              <hr/>
              <div style="white-space: pre-wrap; font-family: system-ui, sans-serif; line-height: 1.6;">
                ${contentToSend?.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || ''}
              </div>
              <hr/>
              <p style="color: #666; font-size: 12px;">Generated with BuildUnion AI • Professional Construction Intelligence</p>
            `,
          },
        });
        
        if (error) throw error;
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err);
        errors++;
      }
      
      setSendProgress({ sent, total: uniqueRecipients.length, errors });
    }
    
    setIsSendingToTeam(false);
    
    if (errors === 0) {
      toast.success(`Team Report sent to ${sent} recipient${sent > 1 ? 's' : ''}!`);
      setIsSendToTeamDialogOpen(false);
    } else {
      toast.warning(`Sent to ${sent}/${uniqueRecipients.length}. ${errors} failed.`);
    }
  }, [customRecipients, selectedRecipients, teamMembers, projectName, teamReportContent, editableTeamReportContent, isEditingTeamReport]);

  // Handle single click - show preview
  const handleSingleClick = useCallback((action: DocumentAction) => {
    setSelectedDocumentId(action.id);
    setPreviewDocument(action);
    setIsPreviewOpen(true);
  }, []);

  // Handle double click - open full/editable view
  const handleDoubleClick = useCallback((action: DocumentAction) => {
    setSelectedDocumentId(action.id);
    
    if (action.id === "ai-brief") {
      if (briefContent) {
        setIsPreviewMode(false);
        setIsBriefDialogOpen(true);
      } else {
        generateAIBrief();
      }
    } else if (action.id === "team-report") {
      if (teamReportContent) {
        setIsTeamReportDialogOpen(true);
      } else {
        generateTeamReport();
      }
    } else if (action.navigateTo && onNavigateToTab) {
      onNavigateToTab(action.navigateTo);
      toast.success(`Navigating to ${action.name}...`);
    } else {
      action.action();
    }
  }, [briefContent, teamReportContent, generateAIBrief, generateTeamReport, onNavigateToTab]);

  // Handle mobile touch with double-tap detection
  const handleTouchEnd = useCallback((action: DocumentAction) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.id === action.id && now - lastTap.time < 300) {
      // Double tap detected
      lastTapRef.current = null;
      handleDoubleClick(action);
    } else {
      // Single tap - show preview
      lastTapRef.current = { id: action.id, time: now };
      handleSingleClick(action);
    }
  }, [handleSingleClick, handleDoubleClick]);

  // Open brief in preview mode
  const openBriefPreview = useCallback(() => {
    if (briefContent) {
      setIsPreviewMode(true);
      setIsBriefDialogOpen(true);
    } else {
      toast.info("Generate a brief first to preview it");
    }
  }, [briefContent]);

  // Open brief in full edit mode
  const openBriefFullView = useCallback(() => {
    if (briefContent) {
      setIsPreviewMode(false);
      setIsBriefDialogOpen(true);
    } else {
      generateAIBrief();
    }
  }, [briefContent, generateAIBrief]);

  // Document Actions with preview content - defined before keyboard handler
  const documentActions: DocumentAction[] = [
    {
      id: "ai-brief",
      name: "AI Project Brief",
      description: "Comprehensive AI analysis from 16 data sources",
      icon: Brain,
      category: "report",
      isPremium: true,
      previewContent: briefContent ? 
        `**AI Project Brief**\n\n${briefContent.substring(0, 500)}...` : 
        "Generate an AI-powered executive summary from all 16 project data sources including the 8 Pillars of Operational Truth, tasks, documents, contracts, and team information.",
      action: generateAIBrief,
    },
    {
      id: "full-report",
      name: "Full Project Report",
      description: "8 Pillars + OBC + Conflicts",
      icon: BarChart3,
      category: "report",
      isPremium: true,
      previewContent: `**Full Project Report**\n\n• Project: ${projectName}\n• Address: ${projectAddress || "Not specified"}\n• Trade: ${projectTrade || "General"}\n\n**8 Pillars Status:**\n• Verified: ${operationalTruth.verifiedPillars}/${operationalTruth.totalPillars}\n• Confidence: ${operationalTruth.confidenceLevel}\n• Area: ${operationalTruth.confirmedArea || "Pending"} ${operationalTruth.areaUnit}`,
      action: generateFullReport,
    },
    {
      id: "quote",
      name: "Quote / Estimate",
      description: "Material & labor cost breakdown",
      icon: FileSpreadsheet,
      category: "financial",
      previewContent: "**Cost Estimate Preview**\n\nNavigate to the Materials tab to:\n• View material costs\n• Add labor items\n• Calculate taxes\n• Generate PDF quote",
      navigateTo: "materials",
      action: async () => { onNavigateToTab?.("materials"); },
    },
    {
      id: "invoice",
      name: "Invoice",
      description: "Client billing document",
      icon: Receipt,
      category: "financial",
      previewContent: "**Invoice Preview**\n\nNavigate to the Materials tab to:\n• Create professional invoices\n• Add payment terms\n• Include deposit amounts\n• Export as PDF",
      navigateTo: "materials",
      action: async () => { onNavigateToTab?.("materials"); },
    },
    {
      id: "contract",
      name: "Contract",
      description: "Legal agreement with client",
      icon: FileSignature,
      category: "legal",
      previewContent: "**Contract Preview**\n\nNavigate to the Contracts tab to:\n• Choose from professional templates\n• Add client information\n• Define scope of work\n• Collect digital signatures",
      navigateTo: "contracts",
      action: async () => { onNavigateToTab?.("contracts"); },
    },
    {
      id: "task-list",
      name: "Task List",
      description: "Exportable task checklist",
      icon: ClipboardList,
      category: "team",
      previewContent: "**Task List Preview**\n\nNavigate to the Team & Tasks tab to:\n• View all project tasks\n• Track completion status\n• Assign to team members\n• Export checklist",
      navigateTo: "team",
      action: async () => { onNavigateToTab?.("team"); },
    },
    {
      id: "team-report",
      name: "Team Report",
      description: isGeneratingTeamReport ? "Generating..." : "Member activity & assignments",
      icon: Users,
      category: "team",
      isPremium: true,
      previewContent: teamReportContent 
        ? `**Team Report**\n\n${teamReportContent.substring(0, 500)}...` 
        : "**Team Report Preview**\n\n• Team size and roles\n• Task assignments per member\n• Completion rates\n• Activity timeline\n• Performance metrics\n• Workload distribution",
      action: async () => { 
        if (!isGeneratingTeamReport) {
          generateTeamReport(); 
        }
      },
    },
  ];
  
  // Finish Project Action - separate from document actions for special styling
  const finishProjectAction: DocumentAction = {
    id: "finish-project",
    name: projectStatus === 'completed' ? t("workspace.reopenProject", "Reopen Project") : t("commandCenter.finishProject", "Finish Project"),
    description: projectStatus === 'completed' 
      ? t("commandCenter.reopenDesc", "Mark project as active again") 
      : t("commandCenter.finishDesc", "Mark this project as complete"),
    icon: projectStatus === 'completed' ? RotateCcw : CheckCircle2,
    category: "team",
    previewContent: projectStatus === 'completed'
      ? "**Reopen Project**\n\nThis will mark the project as 'Active' again.\n\n• Project will appear in active projects list\n• You can continue working on tasks\n• Status will be updated across the app"
      : "**Finish Project**\n\nThis will mark the project as 'Completed'.\n\n• Project will move to completed list\n• All data will be preserved\n• Status updates across Global Fleet View",
    action: async () => { 
      if (onCompleteProject) {
        await onCompleteProject();
      }
    },
  };

  const categories = [
    { id: "all", label: "All Documents" },
    { id: "report", label: "Reports" },
    { id: "financial", label: "Financial" },
    { id: "legal", label: "Legal" },
    { id: "team", label: "Team" },
  ];

  const filteredActions = activeDocumentCategory === "all" 
    ? documentActions 
    : documentActions.filter(a => a.category === activeDocumentCategory);

  // Keyboard shortcuts: Enter = preview, Ctrl+Enter = full view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have a selected document
      if (!selectedDocumentId) return;
      
      // Don't handle if we're in a dialog or input
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        isPreviewOpen ||
        isBriefDialogOpen
      ) {
        return;
      }

      const selectedAction = documentActions.find(a => a.id === selectedDocumentId);
      if (!selectedAction) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Enter: Open full view
          handleDoubleClick(selectedAction);
        } else {
          // Enter: Open preview
          handleSingleClick(selectedAction);
        }
      } else if (e.key === "Escape") {
        // Clear selection
        setSelectedDocumentId(null);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        // Navigate to next document
        e.preventDefault();
        const currentIndex = filteredActions.findIndex(a => a.id === selectedDocumentId);
        const nextIndex = (currentIndex + 1) % filteredActions.length;
        setSelectedDocumentId(filteredActions[nextIndex].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        // Navigate to previous document
        e.preventDefault();
        const currentIndex = filteredActions.findIndex(a => a.id === selectedDocumentId);
        const prevIndex = currentIndex <= 0 ? filteredActions.length - 1 : currentIndex - 1;
        setSelectedDocumentId(filteredActions[prevIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDocumentId, documentActions, filteredActions, handleSingleClick, handleDoubleClick, isPreviewOpen, isBriefDialogOpen]);

  return (
    <>
      {/* Command Center Card */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 dark:from-amber-950/20 dark:via-background dark:to-cyan-950/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-cyan-500 text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Project Command Center
                  <ProBadge tier="pro" size="sm" />
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>Click to preview • Double-click to open</span>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Keyboard className="h-2.5 w-2.5" />
                    Enter / Ctrl+Enter
                  </Badge>
                </CardDescription>
              </div>
            </div>
            
            {/* Project Health Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border cursor-help">
                  <div className={cn(
                    "text-2xl font-bold",
                    healthScore >= 75 && "text-emerald-600",
                    healthScore >= 50 && healthScore < 75 && "text-amber-600",
                    healthScore < 50 && "text-red-600"
                  )}>
                    {healthScore}%
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    <div className="font-medium">Health</div>
                    <div>{completeCount}/16</div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-medium mb-1">Project Health Score</p>
                <p className="text-xs text-muted-foreground">
                  {completeCount} complete, {partialCount} partial, {pendingCount} pending data sources
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Data Sources Status Panel - Always Open */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-amber-600" />
                <span className="font-medium">16 Data Sources</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <CircleCheck className="h-2.5 w-2.5" />
                    {completeCount}
                  </Badge>
                  {partialCount > 0 && (
                    <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                      <CircleDashed className="h-2.5 w-2.5" />
                      {partialCount}
                    </Badge>
                  )}
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="gap-1 bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                      <CircleAlert className="h-2.5 w-2.5" />
                      {pendingCount}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={healthScore} className="w-20 h-2" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 8 Pillars of Operational Truth */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Shield className="h-3.5 w-3.5" />
                    8 Pillars of Operational Truth
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {dataSources.filter(s => s.category === "pillar").map((source) => {
                      const Icon = source.icon;
                      const hasContractWarning = source.id === "materials" && source.missingItems?.some(m => m.includes("Contract not signed"));
                      return (
                        <Tooltip key={source.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDataSourceClick(source.id)}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md text-xs transition-all w-full text-left",
                                "hover:ring-2 hover:ring-offset-1 hover:ring-amber-400 active:scale-95",
                                source.status === "complete" && !hasContractWarning && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
                                source.status === "complete" && hasContractWarning && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-300",
                                source.status === "partial" && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
                                source.status === "pending" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{source.name}</span>
                              {hasContractWarning ? (
                                <AlertTriangle className="h-3 w-3 ml-auto flex-shrink-0 text-amber-500 animate-pulse" />
                              ) : source.status === "complete" ? (
                                <CircleCheck className="h-3 w-3 ml-auto flex-shrink-0" />
                              ) : source.status === "partial" ? (
                                <CircleDashed className="h-3 w-3 ml-auto flex-shrink-0" />
                              ) : (
                                <CircleAlert className="h-3 w-3 ml-auto flex-shrink-0" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p className="font-medium">{source.name}</p>
                            {source.status === "complete" && !hasContractWarning ? (
                              <p className="text-xs text-emerald-600">✓ {source.value || "Verified"}</p>
                            ) : source.missingItems && source.missingItems.length > 0 ? (
                              <div className="text-xs text-amber-600 mt-1">
                                <p className="font-medium text-amber-700 mb-0.5">Missing:</p>
                                {source.missingItems.map((item, i) => (
                                  <p key={i} className="flex items-start gap-1">
                                    <span>•</span> {item}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {source.value || "Not yet verified"}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2">Click to navigate</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
                
                {/* 8 Workflow Data Sources */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-cyan-700 dark:text-cyan-400">
                    <Activity className="h-3.5 w-3.5" />
                    8 Workflow Data Sources
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {dataSources.filter(s => s.category === "workflow").map((source) => {
                      const Icon = source.icon;
                      return (
                        <Tooltip key={source.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDataSourceClick(source.id)}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md text-xs transition-all w-full text-left",
                                "hover:ring-2 hover:ring-offset-1 hover:ring-amber-400 active:scale-95",
                                source.status === "complete" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
                                source.status === "partial" && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
                                source.status === "pending" && "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{source.name}</span>
                              {source.status === "complete" && <CircleCheck className="h-3 w-3 ml-auto flex-shrink-0" />}
                              {source.status === "partial" && <CircleDashed className="h-3 w-3 ml-auto flex-shrink-0" />}
                              {source.status === "pending" && <CircleAlert className="h-3 w-3 ml-auto flex-shrink-0" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p className="font-medium">{source.name}</p>
                            {source.status === "complete" ? (
                              <p className="text-xs text-emerald-600">✓ {source.value || "Complete"}</p>
                            ) : source.missingItems && source.missingItems.length > 0 ? (
                              <div className="text-xs text-amber-600 mt-1">
                                <p className="font-medium text-amber-700 mb-0.5">Missing:</p>
                                {source.missingItems.map((item, i) => (
                                  <p key={i} className="flex items-start gap-1">
                                    <span>•</span> {item}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {source.value || "Click to configure"}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              </div>
          </div>

          {/* Citation Registry Panel */}
          {citations.length > 0 && (
            <CitationRegistry
              citations={citations}
              onCitationClick={onCitationClick}
              onLinkToPillar={onLinkCitationToPillar}
              compact={true}
            />
          )}

          {/* Conflict Monitor Warning Banner */}
          {conflictMonitorData.hasConflict && (
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              conflictMonitorData.severity === "critical" 
                ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800 animate-pulse" 
                : "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
            )}>
              <div className={cn(
                "p-2 rounded-full relative",
                conflictMonitorData.severity === "critical" 
                  ? "bg-red-100 dark:bg-red-900/50" 
                  : "bg-amber-100 dark:bg-amber-900/50"
              )}>
                <Radio className={cn(
                  "h-4 w-4",
                  conflictMonitorData.severity === "critical" 
                    ? "text-red-600" 
                    : "text-amber-600"
                )} />
                {conflictMonitorData.severity === "critical" && (
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
                )}
              </div>
              <div className="flex-1">
                <div className={cn(
                  "font-medium text-sm flex items-center gap-2",
                  conflictMonitorData.severity === "critical" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                )}>
                  <AlertOctagon className="h-4 w-4" />
                  Data conflicts detected - report reliability is low
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {conflictMonitorData.conflictDetails.slice(0, 2).join(" • ")}
                  {conflictMonitorData.conflictDetails.length > 2 && ` (+${conflictMonitorData.conflictDetails.length - 2} more)`}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] cursor-help",
                      conflictMonitorData.severity === "critical" 
                        ? "border-red-400 text-red-600" 
                        : "border-amber-400 text-amber-600"
                    )}
                  >
                    {conflictMonitorData.conflictDetails.length} conflicts
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium mb-1">Conflict Details:</p>
                  <ul className="text-xs space-y-1">
                    {conflictMonitorData.conflictDetails.map((detail, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span>•</span> {detail}
                      </li>
                    ))}
                  </ul>
                  {conflictMonitorData.lastChecked && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Last checked: {conflictMonitorData.lastChecked.toLocaleTimeString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Quick Action: AI Brief - with gradient background wrapper */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 -mx-4 rounded-xl bg-gradient-to-r from-amber-100 via-orange-50 to-cyan-100 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-cyan-900/20 border border-amber-200/50 dark:border-amber-700/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    onClick={() => generateAIBrief()}
                    disabled={isGeneratingBrief || !messaBriefGating.canGenerate}
                    className={cn(
                      "w-full h-auto py-4 text-white shadow-md relative overflow-hidden",
                      !messaBriefGating.canGenerate
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                        : conflictMonitorData.hasConflict
                          ? "bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-700 hover:via-orange-600 hover:to-red-600"
                          : "bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-500 hover:from-amber-600 hover:via-amber-500 hover:to-cyan-600"
                    )}
                  >
                    {/* Lock indicator when gated */}
                    {!messaBriefGating.canGenerate && (
                      <span className="absolute top-2 right-2">
                        <Lock className="h-4 w-4 text-white/80" />
                      </span>
                    )}
                    {/* Flashing conflict indicator */}
                    {conflictMonitorData.hasConflict && messaBriefGating.canGenerate && (
                      <span className="absolute top-2 right-2">
                        <AlertTriangle className="h-4 w-4 text-white animate-pulse" />
                      </span>
                    )}
                    {/* Trial counter badge for Free tier */}
                    {messaBriefGating.showTrialCounter && messaBriefGating.trialsRemaining !== Infinity && (
                      <span className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium">
                        {messaBriefGating.trialsRemaining}/3 trials
                      </span>
                    )}
                    {isGeneratingBrief ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Analyzing 16 Data Sources...
                      </>
                    ) : (
                      <>
                        {!messaBriefGating.canGenerate ? (
                          <Lock className="h-5 w-5 mr-2" />
                        ) : (
                          <Sparkles className="h-5 w-5 mr-2" />
                        )}
                        <div className="text-left">
                          <div className="font-semibold">
                            {!messaBriefGating.canGenerate ? "M.E.S.S.A. Brief Locked" : "Generate M.E.S.S.A. Brief"}
                          </div>
                          <div className="text-xs opacity-90">
                            {!messaBriefGating.canGenerate
                              ? `Complete more data to unlock`
                              : conflictMonitorData.hasConflict 
                                ? "⚠️ Data conflicts detected" 
                                : "Executive summary from all project data"}
                          </div>
                        </div>
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {messaBriefGating.reason && (
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">{messaBriefGating.reason}</p>
                  {subscriptionTier === "free" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrade to Pro for unlimited briefs with 80% threshold
                    </p>
                  )}
                </TooltipContent>
              )}
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                  {conflictMonitorData.severity === "critical" && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => generateFullReport()}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Full Project Report (PDF)
                  {conflictMonitorData.severity === "critical" && (
                    <Badge variant="destructive" className="ml-auto text-[9px]">!</Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigateToTab?.("materials")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Cost Breakdown (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigateToTab?.("contracts")}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Contract (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Document Grid */}
          <div className="space-y-3">
            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeDocumentCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveDocumentCategory(cat.id)}
                  className={cn(
                    "text-xs",
                    activeDocumentCategory === cat.id && "bg-gradient-to-r from-amber-500 to-cyan-500"
                  )}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* Document Cards with Click/Double-Click Logic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                const isSelected = selectedDocumentId === action.id;
                
                const cardContent = (
                  <div
                    key={action.id}
                    onClick={() => !isMobile && handleSingleClick(action)}
                    onDoubleClick={() => !isMobile && handleDoubleClick(action)}
                    onTouchEnd={() => isMobile && handleTouchEnd(action)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all cursor-pointer select-none relative",
                      "bg-white dark:bg-card hover:shadow-md",
                      isSelected && "border-amber-400 ring-2 ring-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
                      !isSelected && "hover:border-amber-300",
                      action.id === "ai-brief" && !isSelected && "ring-1 ring-amber-200",
                      action.id === "ai-brief" && conflictMonitorData.hasConflict && "ring-2 ring-red-300 border-red-300"
                    )}
                  >
                    {/* Conflict flashing indicator for AI Brief */}
                    {action.id === "ai-brief" && conflictMonitorData.hasConflict && (
                      <div className="absolute top-2 right-2">
                        <span className="relative flex h-3 w-3">
                          <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            conflictMonitorData.severity === "critical" ? "bg-red-400" : "bg-amber-400"
                          )} />
                          <span className={cn(
                            "relative inline-flex rounded-full h-3 w-3",
                            conflictMonitorData.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                          )} />
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-transform relative",
                        isSelected && "scale-110",
                        action.category === "report" && "bg-amber-100 text-amber-600",
                        action.category === "financial" && "bg-emerald-100 text-emerald-600",
                        action.category === "legal" && "bg-blue-100 text-blue-600",
                        action.category === "team" && "bg-purple-100 text-purple-600",
                        action.id === "ai-brief" && conflictMonitorData.hasConflict && conflictMonitorData.severity === "critical" && "bg-red-100 text-red-600"
                      )}>
                        {/* Loading spinner for Team Report */}
                        {action.id === "team-report" && isGeneratingTeamReport ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{action.name}</span>
                          {action.isPremium && <ProBadge tier="pro" size="sm" showTooltip={false} />}
                          {action.id === "ai-brief" && conflictMonitorData.hasConflict && (
                            <Badge 
                              variant="destructive" 
                              className="text-[9px] px-1.5 py-0 h-4 animate-pulse"
                            >
                              !
                            </Badge>
                          )}
                          {/* Loading badge for Team Report */}
                          {action.id === "team-report" && isGeneratingTeamReport && (
                            <Badge 
                              variant="secondary" 
                              className="text-[9px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700"
                            >
                              Loading...
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {action.id === "ai-brief" && conflictMonitorData.hasConflict 
                            ? `⚠️ ${conflictMonitorData.conflictDetails.length} data conflicts`
                            : action.description}
                        </p>
                      </div>
                    </div>

                    {/* Selection hint with keyboard shortcuts */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between text-xs text-amber-600">
                        <div className="flex items-center gap-2">
                          <Eye className="h-3 w-3" />
                          <span>Selected</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
                          <span>preview</span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono ml-1">Ctrl+↵</kbd>
                          <span>open</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions - only show on hover/selection */}
                    <div className={cn(
                      "flex gap-1 mt-3 transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.print();
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          const subject = encodeURIComponent(`${action.name}: ${projectName}`);
                          window.location.href = `mailto:?subject=${subject}`;
                        }}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                );

                // Wrap in tooltip for desktop
                if (!isMobile) {
                  return (
                    <Tooltip key={action.id} delayDuration={700}>
                      <TooltipTrigger asChild>
                        <div className="group">{cardContent}</div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs flex flex-col gap-1">
                        <span>Click to preview • Double-click to open</span>
                        <span className="text-muted-foreground">
                          <kbd className="px-1 bg-muted rounded font-mono">Enter</kbd> preview • 
                          <kbd className="px-1 bg-muted rounded font-mono ml-1">Ctrl+Enter</kbd> open
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={action.id} className="group">{cardContent}</div>;
              })}
            </div>
            
            {/* Finish Project - Special Separated Action */}
            <div className="mt-4 pt-4 border-t border-dashed border-muted-foreground/20">
              <div
                onClick={() => !isMobile && handleSingleClick(finishProjectAction)}
                onDoubleClick={() => !isMobile && finishProjectAction.action()}
                onTouchEnd={() => {
                  if (isMobile) {
                    const now = Date.now();
                    const lastTap = lastTapRef.current;
                    if (lastTap && lastTap.id === finishProjectAction.id && now - lastTap.time < 300) {
                      lastTapRef.current = null;
                      finishProjectAction.action();
                    } else {
                      lastTapRef.current = { id: finishProjectAction.id, time: now };
                      handleSingleClick(finishProjectAction);
                    }
                  }
                }}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all cursor-pointer select-none",
                  "bg-muted/30 dark:bg-muted/20",
                  "border-border",
                  "hover:bg-muted/50 dark:hover:bg-muted/30",
                  selectedDocumentId === finishProjectAction.id && "ring-2 ring-primary border-primary"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-transform",
                      "bg-muted text-muted-foreground",
                      selectedDocumentId === finishProjectAction.id && "scale-110"
                    )}>
                      <finishProjectAction.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-base text-foreground">
                        {finishProjectAction.name}
                      </span>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {finishProjectAction.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 bg-white dark:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      finishProjectAction.action();
                    }}
                  >
                    {projectStatus === 'completed' ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-1.5" />
                        {t("workspace.reopen", "Reopen")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {t("workspace.finish", "Finish")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Source Badge */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>Powered by 16 synchronized data sources</span>
            <Badge variant="secondary" className="text-[10px]">
              8 Pillars + 8 Tabs
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {previewDocument && (
                  <>
                    <div className={cn(
                      "p-2 rounded-lg",
                      previewDocument.category === "report" && "bg-amber-100 text-amber-600",
                      previewDocument.category === "financial" && "bg-emerald-100 text-emerald-600",
                      previewDocument.category === "legal" && "bg-blue-100 text-blue-600",
                      previewDocument.category === "team" && "bg-purple-100 text-purple-600"
                    )}>
                      <previewDocument.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        {previewDocument.name}
                      </DialogTitle>
                      <DialogDescription>
                        Preview Mode
                      </DialogDescription>
                    </div>
                  </>
                )}
              </div>
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Preview
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {previewDocument?.previewContent ? (
                <ReactMarkdown>{previewDocument.previewContent}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No preview available</p>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {isMobile ? "Double-tap" : "Double-click"} document to open full view
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button 
                size="sm" 
                className="gap-1 bg-gradient-to-r from-amber-500 to-cyan-500"
                onClick={() => {
                  setIsPreviewOpen(false);
                  if (previewDocument) {
                    handleDoubleClick(previewDocument);
                  }
                }}
              >
                <Pencil className="h-3 w-3" />
                Open Full View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Brief Dialog - Full/Edit Mode */}
      <Dialog open={isBriefDialogOpen} onOpenChange={setIsBriefDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          {/* Loading State */}
          {isGeneratingBrief && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-cyan-500 blur-xl opacity-30 animate-pulse" />
                <div className="relative p-6 rounded-full bg-gradient-to-r from-amber-100 to-cyan-100 dark:from-amber-900/30 dark:to-cyan-900/30">
                  <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                  Generating AI Project Brief
                </h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Analyzing 17 data sources including weather conditions, 8 pillars of operational truth, tasks, documents, and contracts...
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Content - only show when not generating */}
          {!isGeneratingBrief && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-amber-500" />
                      AI Project Brief
                      {isPreviewMode ? (
                        <Badge variant="outline" className="gap-1 ml-2">
                          <Eye className="h-3 w-3" />
                          Preview
                        </Badge>
                      ) : isEditingBrief ? (
                        <Badge className="gap-1 ml-2 bg-gradient-to-r from-green-500 to-emerald-500">
                          <Pencil className="h-3 w-3" />
                          Editing
                        </Badge>
                      ) : (
                        <Badge className="gap-1 ml-2 bg-gradient-to-r from-amber-500 to-cyan-500">
                          <Eye className="h-3 w-3" />
                          Full View
                        </Badge>
                      )}
                      {briefMetadata?.hasWeatherData && (
                        <Badge variant="outline" className="gap-1 ml-1 text-cyan-600 border-cyan-300">
                          🌤️ +Weather
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>
                      {projectName} • Generated from {briefMetadata?.dataSources || 16} data sources
                      {briefMetadata?.weatherAlerts > 0 && (
                        <span className="text-amber-600 ml-2">• ⚠️ {briefMetadata.weatherAlerts} weather alert(s)</span>
                      )}
                    </DialogDescription>
                  </div>
                  {!isPreviewMode && !isEditingBrief && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={startEditingBrief}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={copyBriefToClipboard}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={printBrief}>
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={emailBrief}>
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </div>
                  )}
                  {isEditingBrief && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={cancelEditingBrief}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="gap-1 bg-gradient-to-r from-green-500 to-emerald-500"
                        onClick={saveEditedBrief}
                        disabled={isSavingBrief}
                      >
                        {isSavingBrief ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save & Update
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              <ScrollArea className={cn("pr-4", isPreviewMode ? "max-h-[40vh]" : "max-h-[60vh]")}>
                {!isPreviewMode && briefMetadata && !isEditingBrief && (
                  <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                    <Badge variant="secondary">
                      📊 {briefMetadata.completionRate}% Complete
                    </Badge>
                    <Badge variant="secondary">
                      📝 {briefMetadata.taskCount} Tasks
                    </Badge>
                    <Badge variant="secondary">
                      💰 ${briefMetadata.totalBudget?.toLocaleString()} CAD
                    </Badge>
                    <Badge variant="secondary">
                      📄 {briefMetadata.documentCount} Docs
                    </Badge>
                    <Badge variant="secondary">
                      👥 {briefMetadata.teamSize} Team
                    </Badge>
                    {briefMetadata.hasWeatherData && (
                      <Badge variant="secondary" className="text-cyan-600">
                        🌤️ Weather Data
                      </Badge>
                    )}
                  </div>
                )}

                {isEditingBrief ? (
                  <textarea
                    className="w-full min-h-[400px] p-4 border rounded-lg font-mono text-sm resize-y bg-background"
                    value={editableBriefContent}
                    onChange={(e) => setEditableBriefContent(e.target.value)}
                    placeholder="Edit your brief content here..."
                  />
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {briefContent ? (
                      <ReactMarkdown>
                        {isPreviewMode ? briefContent.substring(0, 800) + "..." : briefContent}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground">No content available</p>
                    )}
                  </div>
                )}
              </ScrollArea>

              {isPreviewMode ? (
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing preview • Click "Open Full View" for complete brief
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsBriefDialogOpen(false)}>
                      Close
                    </Button>
                    <Button 
                      size="sm" 
                      className="gap-1 bg-gradient-to-r from-amber-500 to-cyan-500"
                      onClick={() => setIsPreviewMode(false)}
                    >
                      <Pencil className="h-3 w-3" />
                      Open Full View
                    </Button>
                  </div>
                </div>
              ) : !isEditingBrief && briefMetadata ? (
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(briefMetadata.generatedAt).toLocaleString()} • BuildUnion AI
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click "Edit" to modify before sending or printing
                    </p>
                  </div>
                  
                  {/* Regenerate with Pro Quality upsell for free users */}
                  {subscriptionTier === "free" && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("upsell.regenerateTitle")}</p>
                          <p className="text-xs text-muted-foreground">{t("upsell.regenerateDesc")}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                        onClick={() => {
                          window.location.href = "/buildunion/pricing";
                        }}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {t("upsell.upgradeToPro")}
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Report Dialog */}
      <Dialog open={isTeamReportDialogOpen} onOpenChange={(open) => {
        setIsTeamReportDialogOpen(open);
        if (!open) {
          setIsEditingTeamReport(false);
          setEditableTeamReportContent("");
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Team Report
                  {isEditingTeamReport ? (
                    <Badge className="gap-1 ml-2 bg-gradient-to-r from-green-500 to-emerald-500">
                      <Pencil className="h-3 w-3" />
                      Editing
                    </Badge>
                  ) : (
                    <Badge className="gap-1 ml-2 bg-gradient-to-r from-purple-500 to-pink-500">
                      <Eye className="h-3 w-3" />
                      Full View
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {projectName} • Team Performance Analysis
                </DialogDescription>
              </div>
              {!isEditingTeamReport ? (
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={startEditingTeamReport}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (teamReportContent) {
                      navigator.clipboard.writeText(teamReportContent);
                      toast.success("Report copied!");
                    }
                  }}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (!teamReportContent) return;
                    const subject = encodeURIComponent(`Team Report: ${projectName}`);
                    const body = encodeURIComponent(`Team Report for ${projectName}\n\n${teamReportContent}\n\n---\nGenerated with BuildUnion AI`);
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      if (!teamReportContent) return;
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        toast.error("Please sign in to save");
                        return;
                      }
                      const timestamp = new Date().toISOString().split('T')[0];
                      const fileName = `Team_Report_${projectName.replace(/\s+/g, '_')}_${timestamp}.txt`;
                      const blob = new Blob([teamReportContent], { type: 'text/plain' });
                      const result = await saveDocumentToProject({
                        projectId,
                        userId: session.user.id,
                        fileName,
                        fileBlob: blob,
                        documentType: 'team-report'
                      });
                      if (result.success) {
                        toast.success("Team Report saved to Documents!");
                      } else {
                        toast.error("Failed to save report");
                      }
                    }}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    onClick={() => {
                      if (!teamReportContent) return;
                      // Create a printable window with formatted content
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) {
                        toast.error("Please allow popups to export PDF");
                        return;
                      }
                      const html = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Team Report - ${projectName}</title>
                          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; background: #fff; line-height: 1.6; }
                            h1 { font-size: 24px; color: #1e293b; margin-bottom: 8px; }
                            h2 { font-size: 18px; color: #334155; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                            h3 { font-size: 14px; color: #475569; margin: 16px 0 8px 0; }
                            p, li { font-size: 13px; color: #64748b; margin-bottom: 8px; }
                            ul { padding-left: 20px; }
                            .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 24px; margin: -40px -40px 40px -40px; }
                            .header h1 { color: white; }
                            .header p { color: rgba(255,255,255,0.85); }
                            .meta { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
                            .meta-item { background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 6px; font-size: 12px; }
                            .content { white-space: pre-wrap; }
                            @media print { body { padding: 20px; } .header { margin: -20px -20px 20px -20px; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>Team Performance Report</h1>
                            <p>${projectName}</p>
                            <div class="meta">
                              ${teamReportMetadata ? `
                                <span class="meta-item">👥 ${teamReportMetadata.teamSize} Members</span>
                                <span class="meta-item">📋 ${teamReportMetadata.totalTasks} Tasks</span>
                                <span class="meta-item">✅ ${teamReportMetadata.completionRate}% Complete</span>
                                <span class="meta-item">💰 $${teamReportMetadata.totalBudget?.toLocaleString()} CAD</span>
                              ` : ''}
                            </div>
                          </div>
                          <div class="content">${teamReportContent.replace(/\n/g, '<br/>').replace(/#{1,3}\s/g, '<strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                        </body>
                        </html>
                      `;
                      printWindow.document.write(html);
                      printWindow.document.close();
                      printWindow.print();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export PDF
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={openSendToTeamDialog}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Send to Team
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEditingTeamReport}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="gap-1 bg-gradient-to-r from-green-500 to-emerald-500"
                    onClick={saveEditedTeamReport}
                    disabled={isSavingTeamReport}
                  >
                    {isSavingTeamReport ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save & Update
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {teamReportMetadata && !isEditingTeamReport && (
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                <Badge variant="secondary">
                  👥 {teamReportMetadata.teamSize} Members
                </Badge>
                <Badge variant="secondary">
                  📋 {teamReportMetadata.totalTasks} Tasks
                </Badge>
                <Badge variant="secondary">
                  ✅ {teamReportMetadata.completionRate}% Complete
                </Badge>
                <Badge variant="secondary">
                  💰 ${teamReportMetadata.totalBudget?.toLocaleString()} CAD
                </Badge>
              </div>
            )}

            {isEditingTeamReport ? (
              <textarea
                className="w-full min-h-[400px] p-4 border rounded-lg font-mono text-sm resize-y bg-background"
                value={editableTeamReportContent}
                onChange={(e) => setEditableTeamReportContent(e.target.value)}
                placeholder="Edit your team report content here..."
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {teamReportContent ? (
                  <ReactMarkdown>{teamReportContent}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">No content available</p>
                )}
              </div>
            )}
          </ScrollArea>

          {teamReportMetadata && !isEditingTeamReport && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Generated {new Date(teamReportMetadata.generatedAt).toLocaleString()} • BuildUnion AI
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Edit" to modify before sending or printing
                </p>
              </div>
              
              {/* Regenerate with Pro Quality upsell for free users */}
              {subscriptionTier === "free" && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("upsell.regenerateTitle")}</p>
                      <p className="text-xs text-muted-foreground">{t("upsell.regenerateDesc")}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                    onClick={() => {
                      window.location.href = "/buildunion/pricing";
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {t("upsell.upgradeToPro")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Info Dialog */}
      <Dialog open={isClientInfoDialogOpen} onOpenChange={setIsClientInfoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-cyan-500" />
              Client Information
            </DialogTitle>
            <DialogDescription>
              Edit client details for this project. This information will be used in contracts, invoices, and reports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={editingClientInfo.name}
                onChange={(e) => setEditingClientInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={editingClientInfo.email}
                onChange={(e) => setEditingClientInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                value={editingClientInfo.phone}
                onChange={(e) => setEditingClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (416) 555-0123"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-address">Address</Label>
              <Input
                id="client-address"
                value={editingClientInfo.address}
                onChange={(e) => setEditingClientInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, Toronto, ON"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientInfoDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveClientInfo}
              disabled={isSavingClientInfo}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500"
            >
              {isSavingClientInfo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Client Info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Team Dialog */}
      <Dialog open={isSendToTeamDialogOpen} onOpenChange={setIsSendToTeamDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Send Team Report
            </DialogTitle>
            <DialogDescription>
              Send the Team Report to multiple team members via email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Custom Recipients */}
            <div className="space-y-2">
              <Label>Add Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={customRecipientEmail}
                  onChange={(e) => setCustomRecipientEmail(e.target.value)}
                  placeholder="Enter email address"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomRecipient();
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  onClick={addCustomRecipient}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Added Recipients List */}
            {customRecipients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Recipients ({customRecipients.length})</Label>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-1.5">
                    {customRecipients.map((email) => (
                      <div 
                        key={email} 
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{email}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomRecipient(email)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Team Members (if any have emails) */}
            {teamMembers.length > 0 && teamMembers.some(m => m.email) && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Team Members</Label>
                <div className="space-y-1.5">
                  {teamMembers.filter(m => m.email).map((member) => (
                    <label 
                      key={member.user_id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          className="rounded"
                          checked={selectedRecipients.includes(member.user_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipients(prev => [...prev, member.user_id]);
                            } else {
                              setSelectedRecipients(prev => prev.filter(id => id !== member.user_id));
                            }
                          }}
                        />
                        <span className="text-sm font-medium">{member.name}</span>
                        <Badge variant="outline" className="text-[10px]">{member.role}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* No recipients warning */}
            {customRecipients.length === 0 && selectedRecipients.length === 0 && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Add at least one email address to send the report.
                </p>
              </div>
            )}

            {/* Send Progress */}
            {isSendingToTeam && sendProgress.total > 0 && (
              <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between text-sm">
                  <span>Sending...</span>
                  <span>{sendProgress.sent}/{sendProgress.total}</span>
                </div>
                <Progress value={(sendProgress.sent / sendProgress.total) * 100} />
                {sendProgress.errors > 0 && (
                  <p className="text-xs text-destructive">{sendProgress.errors} failed</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSendToTeamDialogOpen(false)}
              disabled={isSendingToTeam}
            >
              Cancel
            </Button>
            <Button 
              onClick={sendTeamReportToRecipients}
              disabled={isSendingToTeam || (customRecipients.length === 0 && selectedRecipients.length === 0)}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isSendingToTeam ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send to {customRecipients.length + selectedRecipients.length} Recipient{(customRecipients.length + selectedRecipients.length) !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectCommandCenter;
