import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

import { DualEngineOutput, SynthesisResult } from "./AIAnalysisCitation";
import { FilterAnswers, AITriggers } from "./FilterQuestions";
import ConflictStatusIndicator from "./ConflictStatusIndicator";
import TeamMapWidget from "./TeamMapWidget";
import DocumentsPane from "./DocumentsPane";
import OperationalTruthCards, { DataSourceOrigin } from "./OperationalTruthCards";
import { DecisionLogPanel } from "./DecisionLogPanel";
import TeamTab from "./TeamTab";
import ContractsTab from "./ContractsTab";
import EditableAIAnalysisSummary from "./EditableAIAnalysisSummary";
import { MaterialCalculationTab } from "./MaterialCalculationTab";
import { ProjectCommandCenter } from "./ProjectCommandCenter";

import HierarchicalTimeline from "./HierarchicalTimeline";
import TeamMemberTimeline from "./TeamMemberTimeline";
import WorkerDashboard from "./WorkerDashboard";
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
import { useCitationRegistry, getAutoPillarLink } from "@/hooks/useCitationRegistry";
import { CitationSource, generateCitationId } from "@/types/citation";
import { useProjectPermissions, useUserProjectRole, ProjectPermissions } from "@/hooks/useProjectPermissions";
import { useProjectContext } from "@/contexts/ProjectContext";

// ============================================
// HELPER FUNCTIONS
// ============================================

// Default editable demo materials for different project types
function getDefaultDemoMaterials(projectDescription?: string): Array<{ item: string; quantity: number; unit: string }> {
  const desc = (projectDescription || "").toLowerCase();
  
  // Painting project defaults
  if (desc.includes("paint") || desc.includes("festés") || desc.includes("festeni") || desc.includes("fest")) {
    return [
      { item: "Interior Paint (Premium)", quantity: 5, unit: "gallons" },
      { item: "Primer", quantity: 2, unit: "gallons" },
      { item: "Paint Roller Set", quantity: 3, unit: "sets" },
      { item: "Paint Brushes (Assorted)", quantity: 6, unit: "pcs" },
      { item: "Painter's Tape", quantity: 4, unit: "rolls" },
      { item: "Drop Cloth / Floor Protection", quantity: 3, unit: "pcs" },
      { item: "Sandpaper (Various Grits)", quantity: 1, unit: "pack" },
      { item: "Caulk & Filler", quantity: 2, unit: "tubes" },
    ];
  }
  
  // Flooring project defaults
  if (desc.includes("floor") || desc.includes("padló") || desc.includes("laminate") || desc.includes("laminált") || desc.includes("tile") || desc.includes("csempe")) {
    return [
      { item: "Laminate Flooring", quantity: 150, unit: "sq ft" },
      { item: "Underlayment", quantity: 150, unit: "sq ft" },
      { item: "Baseboard Trim", quantity: 60, unit: "linear ft" },
      { item: "Transition Strips", quantity: 3, unit: "pcs" },
      { item: "Flooring Adhesive", quantity: 2, unit: "tubes" },
      { item: "Spacers", quantity: 1, unit: "pack" },
    ];
  }

  // Roofing project defaults
  if (desc.includes("roof") || desc.includes("tető") || desc.includes("shingle") || desc.includes("zsindely")) {
    return [
      { item: "Asphalt Shingles", quantity: 30, unit: "bundles" },
      { item: "Roofing Underlayment", quantity: 500, unit: "sq ft" },
      { item: "Roofing Nails", quantity: 10, unit: "lbs" },
      { item: "Drip Edge", quantity: 100, unit: "linear ft" },
      { item: "Ridge Cap Shingles", quantity: 3, unit: "bundles" },
      { item: "Roofing Cement", quantity: 2, unit: "tubes" },
      { item: "Flashing", quantity: 20, unit: "linear ft" },
      { item: "Ventilation Supplies", quantity: 4, unit: "pcs" },
    ];
  }

  // Electrical project defaults
  if (desc.includes("electr") || desc.includes("villany") || desc.includes("wiring") || desc.includes("vezeték")) {
    return [
      { item: "Electrical Wire (14/2)", quantity: 250, unit: "ft" },
      { item: "Electrical Wire (12/2)", quantity: 100, unit: "ft" },
      { item: "Outlet Boxes", quantity: 12, unit: "pcs" },
      { item: "Switch Boxes", quantity: 6, unit: "pcs" },
      { item: "Circuit Breakers", quantity: 4, unit: "pcs" },
      { item: "Outlets & Switches", quantity: 18, unit: "pcs" },
      { item: "Wire Connectors", quantity: 1, unit: "box" },
      { item: "Electrical Tape", quantity: 3, unit: "rolls" },
    ];
  }

  // Plumbing project defaults
  if (desc.includes("plumb") || desc.includes("vízvezeték") || desc.includes("pipe") || desc.includes("cső") || desc.includes("bathroom") || desc.includes("fürdő")) {
    return [
      { item: "PVC Pipes (Various)", quantity: 50, unit: "linear ft" },
      { item: "Copper Pipes", quantity: 20, unit: "linear ft" },
      { item: "Pipe Fittings", quantity: 25, unit: "pcs" },
      { item: "Shut-off Valves", quantity: 4, unit: "pcs" },
      { item: "Plumber's Tape", quantity: 3, unit: "rolls" },
      { item: "PVC Cement & Primer", quantity: 2, unit: "cans" },
      { item: "Drain Assembly", quantity: 2, unit: "pcs" },
      { item: "Silicone Sealant", quantity: 3, unit: "tubes" },
    ];
  }

  // HVAC project defaults
  if (desc.includes("hvac") || desc.includes("heating") || desc.includes("cooling") || desc.includes("fűtés") || desc.includes("hűtés") || desc.includes("klíma")) {
    return [
      { item: "Ductwork", quantity: 100, unit: "linear ft" },
      { item: "Duct Insulation", quantity: 100, unit: "sq ft" },
      { item: "Vent Registers", quantity: 8, unit: "pcs" },
      { item: "HVAC Tape", quantity: 4, unit: "rolls" },
      { item: "Thermostat", quantity: 1, unit: "pcs" },
      { item: "Air Filters", quantity: 4, unit: "pcs" },
      { item: "Refrigerant Lines", quantity: 25, unit: "ft" },
      { item: "Mounting Brackets", quantity: 2, unit: "sets" },
    ];
  }

  // Masonry/Concrete project defaults
  if (desc.includes("mason") || desc.includes("concrete") || desc.includes("beton") || desc.includes("brick") || desc.includes("tégla") || desc.includes("stone") || desc.includes("kő")) {
    return [
      { item: "Concrete Mix", quantity: 20, unit: "bags" },
      { item: "Rebar", quantity: 100, unit: "linear ft" },
      { item: "Bricks/Blocks", quantity: 200, unit: "pcs" },
      { item: "Mortar Mix", quantity: 10, unit: "bags" },
      { item: "Sand", quantity: 1, unit: "cubic yard" },
      { item: "Gravel", quantity: 1, unit: "cubic yard" },
      { item: "Concrete Forms", quantity: 20, unit: "linear ft" },
      { item: "Rebar Ties", quantity: 1, unit: "box" },
    ];
  }

  // Drywall project defaults
  if (desc.includes("drywall") || desc.includes("gipszkarton") || desc.includes("wall") || desc.includes("fal")) {
    return [
      { item: "Drywall Sheets (4x8)", quantity: 20, unit: "pcs" },
      { item: "Drywall Screws", quantity: 2, unit: "boxes" },
      { item: "Joint Compound", quantity: 3, unit: "buckets" },
      { item: "Drywall Tape", quantity: 4, unit: "rolls" },
      { item: "Corner Bead", quantity: 10, unit: "pcs" },
      { item: "Sanding Sponge", quantity: 5, unit: "pcs" },
      { item: "Primer", quantity: 2, unit: "gallons" },
      { item: "Metal Studs", quantity: 30, unit: "pcs" },
    ];
  }

  // Kitchen project defaults
  if (desc.includes("kitchen") || desc.includes("konyha") || desc.includes("cabinet") || desc.includes("szekrény")) {
    return [
      { item: "Base Cabinets", quantity: 6, unit: "pcs" },
      { item: "Wall Cabinets", quantity: 4, unit: "pcs" },
      { item: "Countertop Material", quantity: 25, unit: "sq ft" },
      { item: "Cabinet Hardware", quantity: 20, unit: "pcs" },
      { item: "Backsplash Tile", quantity: 15, unit: "sq ft" },
      { item: "Tile Adhesive", quantity: 1, unit: "bucket" },
      { item: "Grout", quantity: 2, unit: "bags" },
      { item: "Sink & Faucet", quantity: 1, unit: "set" },
    ];
  }

  // Deck/Outdoor project defaults
  if (desc.includes("deck") || desc.includes("terasz") || desc.includes("patio") || desc.includes("outdoor") || desc.includes("kültéri") || desc.includes("fence") || desc.includes("kerítés")) {
    return [
      { item: "Pressure Treated Lumber (2x6)", quantity: 40, unit: "pcs" },
      { item: "Deck Boards", quantity: 200, unit: "sq ft" },
      { item: "Deck Screws", quantity: 5, unit: "lbs" },
      { item: "Joist Hangers", quantity: 20, unit: "pcs" },
      { item: "Concrete Post Blocks", quantity: 6, unit: "pcs" },
      { item: "Railing System", quantity: 30, unit: "linear ft" },
      { item: "Deck Stain/Sealer", quantity: 3, unit: "gallons" },
      { item: "Post Caps", quantity: 6, unit: "pcs" },
    ];
  }

  // Window/Door project defaults
  if (desc.includes("window") || desc.includes("ablak") || desc.includes("door") || desc.includes("ajtó")) {
    return [
      { item: "Windows", quantity: 6, unit: "pcs" },
      { item: "Doors", quantity: 2, unit: "pcs" },
      { item: "Window Trim", quantity: 50, unit: "linear ft" },
      { item: "Door Trim", quantity: 20, unit: "linear ft" },
      { item: "Insulation Foam", quantity: 4, unit: "cans" },
      { item: "Shims", quantity: 2, unit: "packs" },
      { item: "Caulk", quantity: 6, unit: "tubes" },
      { item: "Hardware (Hinges, Locks)", quantity: 1, unit: "set" },
    ];
  }

  // Insulation project defaults
  if (desc.includes("insul") || desc.includes("szigetel")) {
    return [
      { item: "Fiberglass Batts (R-13)", quantity: 500, unit: "sq ft" },
      { item: "Fiberglass Batts (R-30)", quantity: 300, unit: "sq ft" },
      { item: "Vapor Barrier", quantity: 400, unit: "sq ft" },
      { item: "Spray Foam (Cans)", quantity: 6, unit: "cans" },
      { item: "Insulation Supports", quantity: 50, unit: "pcs" },
      { item: "Staples", quantity: 1, unit: "box" },
      { item: "Tape & Sealant", quantity: 4, unit: "rolls" },
      { item: "Safety Equipment", quantity: 1, unit: "kit" },
    ];
  }

  // Siding/Exterior project defaults
  if (desc.includes("siding") || desc.includes("burkolat") || desc.includes("exterior") || desc.includes("külső")) {
    return [
      { item: "Vinyl Siding", quantity: 500, unit: "sq ft" },
      { item: "House Wrap", quantity: 500, unit: "sq ft" },
      { item: "J-Channel", quantity: 100, unit: "linear ft" },
      { item: "Corner Posts", quantity: 8, unit: "pcs" },
      { item: "Starter Strip", quantity: 50, unit: "linear ft" },
      { item: "Siding Nails", quantity: 5, unit: "lbs" },
      { item: "Trim Pieces", quantity: 20, unit: "pcs" },
      { item: "Caulk & Sealant", quantity: 6, unit: "tubes" },
    ];
  }

  // Office/Commercial project defaults
  if (desc.includes("office") || desc.includes("iroda") || desc.includes("commercial") || desc.includes("kereskedelmi")) {
    return [
      { item: "Ceiling Tiles", quantity: 50, unit: "pcs" },
      { item: "Ceiling Grid", quantity: 100, unit: "linear ft" },
      { item: "Partition Walls", quantity: 4, unit: "panels" },
      { item: "Commercial Flooring", quantity: 500, unit: "sq ft" },
      { item: "Light Fixtures", quantity: 12, unit: "pcs" },
      { item: "Electrical Outlets", quantity: 20, unit: "pcs" },
      { item: "Data Cabling", quantity: 500, unit: "ft" },
      { item: "Fire Safety Equipment", quantity: 4, unit: "pcs" },
    ];
  }

  // Default renovation/general materials (fallback)
  return [
    { item: "Drywall Sheets", quantity: 12, unit: "pcs" },
    { item: "Joint Compound", quantity: 2, unit: "buckets" },
    { item: "Screws & Fasteners", quantity: 1, unit: "box" },
    { item: "Lumber (2x4)", quantity: 20, unit: "pcs" },
    { item: "Electrical Supplies", quantity: 1, unit: "kit" },
    { item: "Plumbing Supplies", quantity: 1, unit: "kit" },
    { item: "Primer & Paint", quantity: 4, unit: "gallons" },
    { item: "Finishing Materials", quantity: 1, unit: "set" },
  ];
}

// Generate tasks from materials (AI-detected or demo defaults) - all editable
function generateTasksFromMaterials(
  projectId: string,
  userId: string,
  materials: Array<{ item: string; quantity: number; unit: string }>,
  projectDescription?: string,
  userName?: string
): TaskWithBudget[] {
  // Use demo materials if no AI-detected ones, but they're fully editable
  const effectiveMaterials = materials && materials.length > 0 
    ? materials 
    : getDefaultDemoMaterials(projectDescription);

  if (effectiveMaterials.length === 0) {
    return [];
  }
  
  // Dynamic assignee name - use provided name or fallback
  const assigneeName = userName || "You (Lead)";

  const now = new Date();
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  };

  const tasks: TaskWithBudget[] = [];
  let taskCounter = 0;

  // Generate tasks for each material with 3 phases: Preparation (Order/Deliver), Execution (Install), Verification (Verify)
  effectiveMaterials.forEach((material, materialIndex) => {
    const materialName = material.item.split(" ")[0];
    const baseDay = materialIndex * 4;

    // Phase 1: Preparation - Order materials
    tasks.push({
      id: `task-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Order ${material.item}`,
      description: `Order ${material.quantity} ${material.unit} of ${material.item}`,
      priority: "high",
      status: "pending",
      due_date: addDays(now, baseDay),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 0,
      quantity: material.quantity,
      total_cost: 0,
      assignee_name: assigneeName,
    });

    // Phase 1: Preparation - Deliver materials
    tasks.push({
      id: `task-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Deliver ${material.item} to site`,
      description: `Receive and inspect delivery of ${material.quantity} ${material.unit} of ${material.item}`,
      priority: "medium",
      status: "pending",
      due_date: addDays(now, baseDay + 1),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 0,
      quantity: material.quantity,
      total_cost: 0,
      assignee_name: assigneeName,
    });

    // Phase 2: Execution - Install materials
    tasks.push({
      id: `task-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Install ${material.item}`,
      description: `Install ${material.quantity} ${material.unit} of ${material.item}`,
      priority: "high",
      status: "pending",
      due_date: addDays(now, baseDay + 2),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 0,
      quantity: material.quantity,
      total_cost: 0,
      assignee_name: assigneeName,
    });

    // Phase 3: Verification - Verify installation
    tasks.push({
      id: `task-${++taskCounter}`,
      project_id: projectId,
      assigned_to: userId,
      assigned_by: userId,
      title: `Verify ${materialName} installation`,
      description: `Final inspection and quality check of ${material.item}`,
      priority: "medium",
      status: "pending",
      due_date: addDays(now, baseDay + 3),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      unit_price: 0,
      quantity: 1,
      total_cost: 0,
      assignee_name: assigneeName,
    });
  });

  return tasks;
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
  client_address: string | null;
  total_cost: number | null;
  line_items: unknown[];
  verified_facts: Record<string, unknown> | null;
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
  initialTab?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

const ProjectDetailsView = ({ projectId, onBack, initialTab }: ProjectDetailsViewProps) => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [flashingTab, setFlashingTab] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [tasks, setTasks] = useState<TaskWithBudget[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [totalTaskBudget, setTotalTaskBudget] = useState(0);
  const [timelineView, setTimelineView] = useState<"hierarchical" | "myTasks">("hierarchical");
  const [documentCount, setDocumentCount] = useState(0);
  const [contractCount, setContractCount] = useState(0);
  const [signedContracts, setSignedContracts] = useState(0);
  const [manuallyValidatedBlueprint, setManuallyValidatedBlueprint] = useState(false);
  const [manuallyIgnoredConflicts, setManuallyIgnoredConflicts] = useState(false);
  const [obcAcknowledged, setObcAcknowledged] = useState(false);
  const [forceCalendarView, setForceCalendarView] = useState(false);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>("You (Lead)");
  const [baselineState, setBaselineState] = useState<{
    snapshot: OperationalTruth | null;
    lockedAt: string | null;
    lockedBy: string | null;
  }>({ snapshot: null, lockedAt: null, lockedBy: null });
  const [companyBranding, setCompanyBranding] = useState<{
    name?: string;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  }>({});
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscription, isDevOverride } = useSubscription();
  const { members } = useProjectTeam(projectId);
  
  // Central state for materials/financials - single source of truth for Dashboard
  const { state: projectState, actions: projectActions } = useProjectContext();
  
  // Citation Registry for tracking document references
  const { 
    citations, 
    registerMultipleCitations, 
    linkCitationToPillar,
    refreshCitations,
    totalCitations,
    linkedCitations,
    getCitationsForPillar
  } = useCitationRegistry(projectId);
  
  // Compute pillar citations for display on Operational Truth cards
  const pillarCitations = useMemo(() => {
    const pillarMap: Record<string, string[]> = {
      area: [],
      materials: [],
      blueprint: [],
      obc: [],
      conflict: [],
      mode: [],
      size: [],
      confidence: [],
    };
    
    citations.forEach(citation => {
      if (citation.linkedPillar && pillarMap[citation.linkedPillar]) {
        pillarMap[citation.linkedPillar].push(citation.sourceId);
      }
    });
    
    return pillarMap;
  }, [citations]);
  
  // Document list for citation auto-registration
  const [projectDocuments, setProjectDocuments] = useState<{ id: string; file_name: string; file_path: string; uploaded_at: string }[]>([]);
  
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
  
  // Get user's role in project and compute permissions
  const userRole = useUserProjectRole(projectId, members);
  const permissions = useProjectPermissions({ 
    projectOwnerId: project?.user_id, 
    memberRole: userRole || undefined 
  });
  
  // Map team members for the map widget - include GPS from bu_profiles
  const teamMembersForMap = members.map(m => ({
    user_id: m.user_id,
    full_name: m.full_name || "Team Member",
    avatar_url: m.avatar_url,
    role: m.role,
    // GPS location from bu_profiles
    latitude: m.latitude || undefined,
    longitude: m.longitude || undefined,
    // Determine status based on location freshness (if updated within last 30 min = on_site)
    status: (m.latitude && m.longitude && m.location_updated_at)
      ? (new Date().getTime() - new Date(m.location_updated_at).getTime() < 30 * 60 * 1000)
        ? "on_site" as const
        : "away" as const
      : undefined,
  }));

  // Weather data for timeline integration
  const { forecast: weatherForecast } = useWeather({
    location: project?.address || undefined,
    days: 5,
    enabled: !!project?.address,
  });

  // Store projectActions in a ref to avoid dependency issues
  const projectActionsRef = useRef(projectActions);
  projectActionsRef.current = projectActions;

  // Fetch project and summary
  useEffect(() => {
    let isMounted = true;
    
    const loadProject = async () => {
      if (!projectId) return;
      
      setLoading(true);
      
      // CRITICAL: Reset central data to neutral state BEFORE loading new project
      // This ensures no data from previous projects persists
      projectActionsRef.current.setCentralMaterials([], "template");
      projectActionsRef.current.setCentralFinancials({
        materialCost: 0,
        laborCost: 0,
        otherCost: 0,
        subtotal: 0,
        taxAmount: 0,
        grandTotal: 0,
        markupPercent: 0,
        markupAmount: 0,
        grandTotalWithMarkup: 0,
        isDraft: true,
      });
      
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

        if (!isMounted) return;

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
          
          // Load manual overrides from verified_facts
          const verifiedFacts = (summaryResult.data as any).verified_facts as {
            manuallyValidatedBlueprint?: boolean;
            manuallyIgnoredConflicts?: boolean;
          } | null;
          
          if (verifiedFacts) {
            if (verifiedFacts.manuallyValidatedBlueprint) {
              setManuallyValidatedBlueprint(true);
            }
            if (verifiedFacts.manuallyIgnoredConflicts) {
              setManuallyIgnoredConflicts(true);
            }
          }
          
          // Load OBC acknowledged from ai_workflow_config
          const aiConfig = (summaryResult.data as any).ai_workflow_config as {
            obcResult?: { acknowledged?: boolean };
          } | null;
          
          if (aiConfig?.obcResult?.acknowledged) {
            setObcAcknowledged(true);
          }
        }
      } catch (error: any) {
        if (!isMounted) return;
        console.error("Error loading project:", error);
        toast.error("Failed to load project");
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsLoadingOverrides(false);
        }
      }
    };

    loadProject();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // Removed onBack - it's not stable and doesn't need to trigger reload

  // Fetch user's company branding and name from bu_profiles
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        // Fetch from both profiles and bu_profiles for comprehensive name resolution
        const [profileResult, buProfileResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("bu_profiles")
            .select("company_name, company_logo_url, phone, company_website")
            .eq("user_id", user.id)
            .maybeSingle()
        ]);

        // Set user's display name - prefer profile full_name, then metadata, then email prefix
        const displayName = profileResult.data?.full_name 
          || user.user_metadata?.full_name 
          || user.email?.split("@")[0] 
          || "You (Lead)";
        setCurrentUserName(displayName);

        if (buProfileResult.data) {
          setCompanyBranding({
            name: buProfileResult.data.company_name || undefined,
            logoUrl: buProfileResult.data.company_logo_url,
            phone: buProfileResult.data.phone,
            email: user.email || undefined,
            website: buProfileResult.data.company_website,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);

  // ==========================================
  // SYNC: Populate centralMaterials from DB on project load
  // This ensures Materials tab and Dashboard read from the same source
  // Priority: 1. Saved line_items, 2. AI photo_estimate, 3. Work Type Template
  // ==========================================
  useEffect(() => {
    if (!summary || loading) return;
    
    // Helper to check if material is essential
    const essentialKeywords = ["flooring", "laminate", "tile", "drywall", "underlayment", "baseboard", "trim", "hardwood"];
    const checkEssential = (item: string) => essentialKeywords.some(k => item.toLowerCase().includes(k));
    
    // Priority 1: Use saved line_items (manual overrides from previous session)
    const savedLineItems = summary.line_items as { 
      materials?: Array<{ item: string; quantity: number; unit: string; unitPrice?: number; baseQuantity?: number; isEssential?: boolean }>;
      labor?: Array<{ item: string; quantity: number; unit: string; unitPrice?: number }>;
      other?: Array<{ item: string; quantity: number; unit: string; unitPrice?: number }>;
    } | null;
    
    if (savedLineItems?.materials && savedLineItems.materials.length > 0) {
      const centralItems = savedLineItems.materials.map((m, index) => ({
        id: `saved-mat-${index}-${Date.now()}`,
        item: m.item,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unitPrice || 0,
        source: "manual" as const, // Saved data counts as manual
        citationSource: "manual_override" as const,
        citationId: `[SAVED-${index + 1}]`,
        isEssential: m.isEssential ?? checkEssential(m.item),
        wastePercentage: m.isEssential ?? checkEssential(m.item) ? 10 : 0,
      }));
      
      console.log("[ProjectDetailsView] Loading saved materials to centralMaterials:", centralItems.length);
      projectActionsRef.current.setCentralMaterials(centralItems, "manual");
      
      // Also load saved labor/other costs to centralFinancials
      if (savedLineItems.labor && savedLineItems.labor.length > 0) {
        const laborTotal = savedLineItems.labor.reduce((sum, l) => sum + (l.quantity * (l.unitPrice || 0)), 0);
        projectActionsRef.current.setCentralFinancials({ laborCost: laborTotal });
      }
      if (savedLineItems.other && savedLineItems.other.length > 0) {
        const otherTotal = savedLineItems.other.reduce((sum, o) => sum + (o.quantity * (o.unitPrice || 0)), 0);
        projectActionsRef.current.setCentralFinancials({ otherCost: otherTotal });
      }
      return;
    }
    
    // Priority 2: Use AI-detected materials from photo_estimate
    const photoEstimate = summary.photo_estimate as PhotoEstimateData | undefined;
    const workflowConfig = summary.ai_workflow_config as { userEdits?: { wastePercent?: number; editedArea?: number } } | undefined;
    
    if (photoEstimate?.materials && photoEstimate.materials.length > 0) {
      // Get wastePercent from userEdits (Power Modal saves here) or default to 10%
      const savedWastePercent = workflowConfig?.userEdits?.wastePercent ?? (photoEstimate as { wastePercent?: number }).wastePercent ?? 10;
      const detectedArea = photoEstimate.area || workflowConfig?.userEdits?.editedArea;
      
      const centralItems = photoEstimate.materials.map((m, index) => ({
        id: `ai-mat-${index}-${Date.now()}`,
        item: m.item,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: 0, // AI doesn't provide unit prices, will be enriched later
        source: "ai" as const,
        citationSource: "ai_photo" as const,
        citationId: `[AI-${index + 1}]`,
        isEssential: checkEssential(m.item),
        wastePercentage: checkEssential(m.item) ? savedWastePercent : 0,
      }));
      
      console.log("[ProjectDetailsView] Loading AI materials to centralMaterials:", centralItems.length, "wastePercent:", savedWastePercent);
      projectActionsRef.current.setCentralMaterials(centralItems, "ai_analysis");
      
      // IMPORTANT: Set wastePercent and baseArea AFTER materials are loaded
      if (detectedArea) {
        projectActionsRef.current.setWasteAndArea(savedWastePercent, detectedArea);
      } else {
        projectActionsRef.current.setWasteAndArea(savedWastePercent, undefined);
      }
      
      // Also sync confirmed area if available
      if (detectedArea) {
        const rawConfidence = photoEstimate.areaConfidence || "medium";
        const confidence = (rawConfidence === "high" || rawConfidence === "medium" || rawConfidence === "low") 
          ? rawConfidence 
          : "medium" as const;
        
        projectActionsRef.current.updatePillar("confirmedArea", {
          value: detectedArea,
          unit: photoEstimate.areaUnit || "sq ft",
          source: "ai-photo",
          confidence,
          detectedAt: new Date().toISOString(),
        });
      }
      return;
    }
    
    // Priority 3: centralMaterials stays empty (will be loaded from Work Type template when selected)
    // This is the "neutral" state for new projects without AI analysis
    console.log("[ProjectDetailsView] No saved or AI materials - centralMaterials stays neutral");
  }, [summary, loading]);

  // Extract stable values from summary for dependency tracking
  // This prevents infinite re-fetching when summary object reference changes
  const summaryId = summary?.id;
  const photoEstimateMaterialsCount = (summary?.photo_estimate as PhotoEstimateData | undefined)?.materials?.length || 0;
  
  // Fetch tasks with budget data - wait for summary to load first
  useEffect(() => {
    // Don't run until we have summary data loaded (to check for AI materials)
    // The summary contains photo_estimate.materials which we need for auto-generation
    if (loading || !summaryId) return;
    
    // Use isMounted flag to prevent state updates after unmount
    let isMounted = true;
    
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
        
        if (!isMounted) return;

        // Fetch team members for enrichment
        const { data: membersData } = await supabase
          .from("project_members")
          .select("user_id, role")
          .eq("project_id", projectId);

        if (!isMounted) return;

        // Get profile info for each member
        const memberProfiles: Record<string, { full_name: string; avatar_url?: string }> = {};
        if (membersData) {
          for (const member of membersData) {
            if (!isMounted) return;
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

        if (!isMounted) return;

        // Enrich tasks
        const enrichedTasks = (tasksData || []).map((task) => ({
          ...task,
          unit_price: task.unit_price || 0,
          quantity: task.quantity || 1,
          total_cost: task.total_cost || 0,
          assignee_name: memberProfiles[task.assigned_to]?.full_name || "Unknown",
          assignee_avatar: memberProfiles[task.assigned_to]?.avatar_url,
        }));

        // If no tasks from DB, auto-generate from AI materials and save to DB
        // This ensures users always see their project tasks immediately
        if (enrichedTasks.length === 0) {
          // Check if we have AI materials to generate from
          const photoEst = summary?.photo_estimate as PhotoEstimateData | undefined;
          const aiMats = photoEst?.materials || [];
          
          if (aiMats.length > 0 && user?.id) {
            console.log(`[TaskAutoGen] Auto-generating ${aiMats.length * 3} tasks from AI materials...`);
            
            // Generate tasks from AI materials
            const generatedTasks = generateTasksFromMaterials(
              projectId,
              user.id,
              aiMats,
              project?.description || undefined,
              currentUserName
            );
            
            if (generatedTasks.length > 0 && isMounted) {
              // Save to database
              const tasksToInsert = generatedTasks.map(t => ({
                project_id: t.project_id,
                assigned_to: t.assigned_to,
                assigned_by: t.assigned_by,
                title: t.title,
                description: t.description,
                priority: t.priority,
                status: t.status,
                due_date: t.due_date,
                quantity: t.quantity,
                unit_price: t.unit_price,
                total_cost: t.total_cost,
              }));
              
              const { data: insertedTasks, error: insertError } = await supabase
                .from("project_tasks")
                .insert(tasksToInsert)
                .select();
              
              if (!isMounted) return;
              
              if (insertError) {
                console.error("[TaskAutoGen] Error saving tasks:", insertError);
                // Still show generated tasks in memory as fallback
                setTasks(generatedTasks);
              } else {
                console.log(`[TaskAutoGen] Saved ${insertedTasks?.length || 0} tasks to DB`);
                // Use the DB-returned tasks (they have real IDs)
                const enrichedInserted = (insertedTasks || []).map((task) => ({
                  ...task,
                  unit_price: task.unit_price || 0,
                  quantity: task.quantity || 1,
                  total_cost: task.total_cost || 0,
                  assignee_name: currentUserName,
                  assignee_avatar: undefined,
                }));
                setTasks(enrichedInserted);
              }
            } else if (isMounted) {
              setTasks([]);
            }
          } else if (isMounted) {
            setTasks([]);
          }
          if (isMounted) setTotalTaskBudget(0);
        } else {
          if (isMounted) {
            setTasks(enrichedTasks);
            
            // Calculate total budget
            const total = enrichedTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
            setTotalTaskBudget(total);
          }
        }
      } catch (err: any) {
        // Ignore abort errors - they're expected on cleanup
        if (err?.message?.includes('abort') || err?.name === 'AbortError') return;
        console.error("Error fetching tasks:", err);
      } finally {
        if (isMounted) setTasksLoading(false);
      }
    };

    fetchTasks();

    // Subscribe to realtime updates - handle INSERT/DELETE/UPDATE events
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
              assignee_name: currentUserName,
              assignee_avatar: undefined,
            } as TaskWithBudget;
            return [...prev, newTask];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Update the specific task's status/data in-place for real-time sync
          setTasks(prev => prev.map(t => {
            if (t.id === payload.new.id) {
              return {
                ...t,
                status: payload.new.status,
                priority: payload.new.priority,
                title: payload.new.title,
                description: payload.new.description,
                due_date: payload.new.due_date,
                assigned_to: payload.new.assigned_to,
                unit_price: payload.new.unit_price || 0,
                quantity: payload.new.quantity || 1,
                total_cost: payload.new.total_cost || 0,
              };
            }
            return t;
          }));
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
      isMounted = false;
      supabase.removeChannel(channel);
    };
  // Use stable primitive values instead of object references to prevent infinite loops
  }, [projectId, user?.id, summaryId, photoEstimateMaterialsCount, project?.description, loading]);

  // Fetch document and contract counts for Data Sources synchronization
  useEffect(() => {
    const fetchCounts = async () => {
      if (!projectId) return;
      
      try {
        // Fetch document count
        const { count: docCount } = await supabase
          .from("project_documents")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId);
        
        setDocumentCount(docCount || 0);
        
        // Fetch contract count and signed contracts
        const { data: contractsData } = await supabase
          .from("contracts")
          .select("id, status, client_signed_at")
          .eq("project_id", projectId);
        
        if (contractsData) {
          setContractCount(contractsData.length);
          setSignedContracts(contractsData.filter(c => c.client_signed_at || c.status === "signed").length);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    fetchCounts();

    // Subscribe to document changes
    const docChannel = supabase
      .channel(`project_documents_count_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_documents",
          filter: `project_id=eq.${projectId}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    // Subscribe to contract changes
    const contractChannel = supabase
      .channel(`contracts_count_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contracts",
          filter: `project_id=eq.${projectId}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(docChannel);
      supabase.removeChannel(contractChannel);
    };
  }, [projectId]);

  // Fetch documents list for citation auto-registration
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!projectId) return;
      
      try {
        const { data: docs } = await supabase
          .from("project_documents")
          .select("id, file_name, file_path, uploaded_at")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: true });
        
        if (docs) {
          setProjectDocuments(docs);
        }
      } catch (error) {
        console.error("Error fetching documents for citations:", error);
      }
    };

    fetchDocuments();

    // Subscribe to document changes for real-time citation updates
    const channel = supabase
      .channel(`project_docs_citations_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_documents",
          filter: `project_id=eq.${projectId}`,
        },
        () => fetchDocuments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Auto-register citations when documents or site images change
  useEffect(() => {
    if (!projectId || !project) return;

    const citationsToRegister: Omit<CitationSource, 'id' | 'registeredAt' | 'registeredBy'>[] = [];

    // Register site photos with auto-link to Area
    project.site_images?.forEach((path, index) => {
      const sourceId = generateCitationId('P', index);
      if (!citations.some(c => c.sourceId === sourceId)) {
        const fileName = path.split('/').pop() || `Site Photo ${index + 1}`;
        const autoPillar = getAutoPillarLink(fileName, 'site_photo');
        
        citationsToRegister.push({
          sourceId,
          documentName: `Site Photo ${index + 1}`,
          documentType: 'site_photo',
          contextSnippet: 'Site photo uploaded during project creation',
          filePath: path,
          timestamp: new Date().toISOString(),
          linkedPillar: autoPillar,
        });
      }
    });

    // Register documents with auto-link based on file name
    projectDocuments.forEach((doc, index) => {
      const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
      const isBlueprint = doc.file_name.toLowerCase().includes('blueprint') || 
                          doc.file_name.toLowerCase().includes('plan') ||
                          doc.file_name.toLowerCase().includes('drawing');
      const sourceId = isBlueprint 
        ? generateCitationId('B', index) 
        : generateCitationId('D', index);
      
      if (!citations.some(c => c.sourceId === sourceId)) {
        const docType: CitationSource['documentType'] = isBlueprint ? 'blueprint' : (isPdf ? 'pdf' : 'image');
        const autoPillar = getAutoPillarLink(doc.file_name, docType);
        
        citationsToRegister.push({
          sourceId,
          documentName: doc.file_name,
          documentType: docType,
          contextSnippet: `Uploaded document: ${doc.file_name}`,
          filePath: doc.file_path,
          timestamp: doc.uploaded_at,
          linkedPillar: autoPillar,
        });
      }
    });

    // Register AI analysis citations (MAT-AI for materials, linked to materials pillar)
    const photoEstimate = summary?.photo_estimate;
    const aiConfig = summary?.ai_workflow_config;
    const materials = photoEstimate?.materials || aiConfig?.aiAnalysis?.materials || [];
    const detectedArea = photoEstimate?.area || aiConfig?.aiAnalysis?.area;
    
    // Register Materials AI citation if materials exist
    if (materials.length > 0 && !citations.some(c => c.sourceId === 'MAT-AI')) {
      citationsToRegister.push({
        sourceId: 'MAT-AI',
        documentName: 'Material Estimation Report',
        documentType: 'log',
        contextSnippet: `AI calculated ${materials.length} material items using BASE AREA of ${detectedArea?.toLocaleString() || 'detected'} sq ft. Essential materials use base quantity with +10% waste buffer applied in Materials tab.`,
        timestamp: new Date().toISOString(),
        linkedPillar: 'materials', // Link to Materials pillar
      });
    }

    // Register all new citations
    if (citationsToRegister.length > 0) {
      registerMultipleCitations(citationsToRegister);
    }
  }, [projectId, project?.site_images, projectDocuments, citations, registerMultipleCitations, summary?.photo_estimate, summary?.ai_workflow_config]);

  // Handle citation click - open source proof panel
  const handleCitationClick = useCallback((citation: CitationSource) => {
    // Navigate to Documents tab if it's a document citation
    if (citation.documentType !== 'site_photo') {
      setActiveTab("documents");
    }
    toast.info(`Citation ${citation.sourceId}: ${citation.documentName}`);
  }, []);

  // Handle linking citation to operational truth pillar
  const handleLinkCitationToPillar = useCallback(async (sourceId: string, pillar: string) => {
    try {
      await linkCitationToPillar(sourceId, pillar as CitationSource['linkedPillar']);
      toast.success(`Citation linked to ${pillar} pillar`);
    } catch (error) {
      console.error("Error linking citation:", error);
      toast.error("Failed to link citation");
    }
  }, [linkCitationToPillar]);

  // ============================================
  // CLIENT INFO MANAGEMENT
  // ============================================
  
  const handleClientInfoUpdate = useCallback(async (newClientInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  }) => {
    if (!summary?.id) {
      toast.error("No summary available to update");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("project_summaries")
        .update({
          client_name: newClientInfo.name || null,
          client_email: newClientInfo.email || null,
          client_phone: newClientInfo.phone || null,
          client_address: newClientInfo.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", summary.id);
        
      if (error) throw error;
      
      // Update local state
      setSummary(prev => prev ? {
        ...prev,
        client_name: newClientInfo.name || null,
        client_email: newClientInfo.email || null,
        client_phone: newClientInfo.phone || null,
        client_address: newClientInfo.address || null,
      } : null);
      
    } catch (error) {
      console.error("Error updating client info:", error);
      throw error;
    }
  }, [summary?.id]);

  // ============================================
  // PROJECT COMPLETION HANDLER
  // ============================================
  
  const handleCompleteProject = useCallback(async () => {
    if (!project?.id) {
      toast.error(t("workspace.statusUpdateFailed", "Failed to update status"));
      return;
    }
    
    try {
      const newStatus = project.status === 'completed' ? 'active' : 'completed';
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", project.id);
      
      if (error) throw error;
      
      // Update local state
      setProject(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast.success(
        newStatus === 'completed' 
          ? t("workspace.projectCompleted", "Project marked as completed!") 
          : t("workspace.projectReopened", "Project reopened")
      );
    } catch (error) {
      console.error("Error updating project status:", error);
      toast.error(t("workspace.statusUpdateFailed", "Failed to update status"));
    }
  }, [project?.id, project?.status, t]);

  // ============================================
  // MANUAL OVERRIDE PERSISTENCE (Blueprint & Conflicts)
  // ============================================
  
  // Persist manual blueprint validation to database
  const handleBlueprintValidated = useCallback(async (validated: boolean) => {
    setManuallyValidatedBlueprint(validated);
    
    if (!summary?.id) return;
    
    try {
      // Get current verified_facts
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("verified_facts")
        .eq("id", summary.id)
        .maybeSingle();
      
      const currentFacts = (currentData?.verified_facts as Record<string, unknown>) || {};
      
      // Update with new blueprint validation state
      const updatedFacts = {
        ...currentFacts,
        manuallyValidatedBlueprint: validated,
        blueprintValidatedAt: validated ? new Date().toISOString() : null,
      };
      
      const { error } = await supabase
        .from("project_summaries")
        .update({
          verified_facts: updatedFacts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", summary.id);
        
      if (error) throw error;
      
      console.log("[OP-Truth] Blueprint validation saved:", validated);
    } catch (error) {
      console.error("Error saving blueprint validation:", error);
      toast.error("Failed to save blueprint validation");
    }
  }, [summary?.id]);

  // Persist manual conflict ignore to database
  const handleConflictsIgnored = useCallback(async (ignored: boolean) => {
    setManuallyIgnoredConflicts(ignored);
    
    if (!summary?.id) return;
    
    try {
      // Get current verified_facts
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("verified_facts")
        .eq("id", summary.id)
        .maybeSingle();
      
      const currentFacts = (currentData?.verified_facts as Record<string, unknown>) || {};
      
      // Update with new conflict ignore state
      const updatedFacts = {
        ...currentFacts,
        manuallyIgnoredConflicts: ignored,
        conflictsIgnoredAt: ignored ? new Date().toISOString() : null,
      };
      
      const { error } = await supabase
        .from("project_summaries")
        .update({
          verified_facts: updatedFacts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", summary.id);
        
      if (error) throw error;
      
      console.log("[OP-Truth] Conflict ignore saved:", ignored);
    } catch (error) {
      console.error("Error saving conflict ignore:", error);
      toast.error("Failed to save conflict status");
    }
  }, [summary?.id]);

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

  // Helper to categorize tasks by phase (used by both Timeline and OperationalTruth)
  // MUST match TaskAssignment.tsx getPhaseForTask exactly for consistency
  const getPhaseForTask = useCallback((task: TaskWithBudget): "preparation" | "execution" | "verification" => {
    const titleLower = task.title.toLowerCase();
    const descLower = (task.description || "").toLowerCase();
    const combined = titleLower + " " + descLower;
    
    // Preparation phase - ordering, planning, measuring, setup tasks
    if (combined.includes("order") || combined.includes("deliver") || combined.includes("measure") || 
        combined.includes("prep") || combined.includes("plan") || combined.includes("schedule") ||
        combined.includes("permit") || combined.includes("survey") || combined.includes("quote") ||
        combined.includes("buy") || combined.includes("purchase") || combined.includes("setup") ||
        combined.includes("protect") || combined.includes("tape") || combined.includes("drop cloth") ||
        combined.includes("primer") || combined.includes("sand")) {
      return "preparation";
    }
    
    // Verification phase - inspection, testing, cleanup, final touches
    if (combined.includes("inspect") || combined.includes("verify") || combined.includes("test") ||
        combined.includes("final") || combined.includes("clean") || combined.includes("review") ||
        combined.includes("check") || combined.includes("approve") || combined.includes("sign off") ||
        combined.includes("touch up") || combined.includes("punch list")) {
      return "verification";
    }
    
    // Everything else is execution (install, apply, paint, lay, cut, build, etc.)
    return "execution";
  }, []);

  // Calculate phase-based progress (shared between Timeline and OperationalTruth)
  const phaseProgress = useMemo(() => {
    const preparationTasks = tasks.filter(t => getPhaseForTask(t) === "preparation");
    const executionTasks = tasks.filter(t => getPhaseForTask(t) === "execution");
    const verificationTasks = tasks.filter(t => getPhaseForTask(t) === "verification");

    const calcProgress = (phaseTasks: TaskWithBudget[]) => 
      phaseTasks.length === 0 ? 0 : Math.round((phaseTasks.filter(t => t.status === "completed").length / phaseTasks.length) * 100);

    // Calculate locking status - phases are locked if previous phase is not 100% complete
    const prepProgress = calcProgress(preparationTasks);
    const execProgress = calcProgress(executionTasks);
    const verProgress = calcProgress(verificationTasks);
    
    const executionLocked = prepProgress < 100;
    const verificationLocked = execProgress < 100 || executionLocked;

    return {
      phases: [
        { name: "Preparation", progress: prepProgress, taskCount: preparationTasks.length, color: "bg-blue-500" },
        { name: "Execution", progress: executionLocked ? 0 : execProgress, taskCount: executionTasks.length, color: executionLocked ? "bg-muted" : "bg-amber-500" },
        { name: "Verification", progress: verificationLocked ? 0 : verProgress, taskCount: verificationTasks.length, color: verificationLocked ? "bg-muted" : "bg-green-500" },
      ],
      completedCount: tasks.filter(t => t.status === "completed").length,
      totalCount: tasks.length,
      taskProgressPercent: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100) : 0,
    };
  }, [tasks, getPhaseForTask]);

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
  
  // Helper to extract area from project description (explicit user-provided area)
  const extractAreaFromDescription = (description: string | null | undefined): number | null => {
    if (!description) return null;
    
    // Patterns to extract area - support both comma-separated (1,350) and plain numbers (1350)
    const patterns = [
      // Match numbers with optional comma thousands separator + unit
      /(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet?|sqft)/i,
      /(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*m|m²|square\s*meters?|nm|m2)/i,
      /(\d[\d,]*(?:\.\d+)?)\s*(?:négyzetláb)/i,
      // Match "total area: 1350" or "area is 1350"
      /(?:total\s*)?(?:area|size|terület)\s*(?:is|=|:|-|of)?\s*(\d[\d,]*(?:\.\d+)?)/i,
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match?.[1]) {
        const value = parseFloat(match[1].replace(/,/g, ""));
        if (value > 10 && value < 100000) { // Sanity check
          console.log(`[Area Detection] Extracted from project description: ${value} sq ft`);
          return value;
        }
      }
    }
    return null;
  };

  // Helper to extract area from materials (same logic as buildOperationalTruth)
  const extractAreaFromMaterials = (materials: Array<{ item: string; quantity: number; unit: string }> | undefined): number | null => {
    if (!materials?.length) return null;
    const areaBasedMaterial = materials.find(
      m => m.unit?.toLowerCase().includes("sq") || m.unit?.toLowerCase().includes("ft") || m.unit?.toLowerCase().includes("m²")
    );
    return areaBasedMaterial?.quantity || null;
  };

  // Extract area from tasks (tasks contain material assignments with quantities)
  const extractAreaFromTasks = (tasksList: TaskWithBudget[]): number | null => {
    // Look for tasks that contain area-based material information
    for (const task of tasksList) {
      const titleLower = task.title.toLowerCase();
      const descLower = (task.description || "").toLowerCase();
      
      // Look for patterns like "1302 sq ft" or "1400 sq ft" in title or description
      const patterns = [
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet?|sqft)/i,
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*m|m²|square\s*meters?)/i,
      ];
      
      for (const pattern of patterns) {
        const titleMatch = task.title.match(pattern);
        const descMatch = (task.description || "").match(pattern);
        if (titleMatch) {
          return parseFloat(titleMatch[1].replace(/,/g, ""));
        }
        if (descMatch) {
          return parseFloat(descMatch[1].replace(/,/g, ""));
        }
      }
    }
    return null;
  };

  // Extract materials count from tasks
  const extractMaterialsFromTasks = (tasksList: TaskWithBudget[]): Array<{ item: string; quantity: number; unit: string }> => {
    // Group tasks by material category (from title prefix before first action word)
    const materialMap: Record<string, { item: string; quantity: number; unit: string }> = {};
    
    for (const task of tasksList) {
      // Extract material name from task title
      // e.g., "Order Laminate Flooring" -> "Laminate Flooring"
      // e.g., "Install Underlayment" -> "Underlayment"
      const actionWords = ["order", "install", "lay", "apply", "cut", "deliver", "measure", "prep", "inspect", "verify", "clean", "final"];
      let materialName = task.title;
      for (const action of actionWords) {
        materialName = materialName.replace(new RegExp(`^${action}\\s+`, "i"), "");
      }
      materialName = materialName.trim();
      
      if (materialName && task.quantity && task.quantity > 0) {
        if (!materialMap[materialName]) {
          // Determine unit from quantity range or task context
          let unit = "units";
          if (task.quantity > 100) unit = "sq ft";
          if (task.title.toLowerCase().includes("trim") || task.title.toLowerCase().includes("baseboard")) unit = "linear ft";
          
          materialMap[materialName] = {
            item: materialName,
            quantity: task.quantity,
            unit,
          };
        }
      }
    }
    
    return Object.values(materialMap);
  };

  // Build unified aiAnalysis from photo_estimate (actual AI results)
  // Priority: photo_estimate.area > blueprint_analysis.detectedArea > description_area > calculator_results > tasks fallback > materials fallback
  const rawArea = photoEstimate?.area ?? blueprintAnalysis?.detectedArea ?? null;
  
  // Extract area from project description (user-provided explicit area - HIGH PRIORITY)
  const descriptionArea = extractAreaFromDescription(project?.description);
  
  // Also check calculator_results for detected area
  const calculatorResults = Array.isArray(summary?.calculator_results) ? summary.calculator_results : [];
  const calculatorArea = calculatorResults.length > 0 
    ? (calculatorResults[0] as any)?.detectedArea 
    : null;
  
  // Materials from multiple sources
  const materialsData = photoEstimate?.materials || aiConfig?.aiAnalysis?.materials || [];
  const fallbackArea = extractAreaFromMaterials(materialsData);
  
  // Task-based fallbacks for 16-source synchronization
  const taskBasedArea = extractAreaFromTasks(tasks);
  const taskBasedMaterials = extractMaterialsFromTasks(tasks);
  
  // Final area with all fallbacks - description area is HIGH priority (user explicitly said it)
  // Priority: AI-detected > User description > Calculator > Materials > Tasks
  const finalArea = rawArea ?? descriptionArea ?? calculatorArea ?? fallbackArea ?? taskBasedArea;
  const finalMaterials = materialsData.length > 0 ? materialsData : taskBasedMaterials;
  
  const aiAnalysis = (photoEstimate || aiConfig?.aiAnalysis || finalArea !== null || finalMaterials.length > 0) ? {
    area: finalArea,
    areaUnit: photoEstimate?.areaUnit || blueprintAnalysis?.areaUnit || "sq ft",
    materials: finalMaterials,
    hasBlueprint: !!blueprintAnalysis?.extractedText || !!photoEstimate?.blueprintAnalysis?.extractedText,
    confidence: photoEstimate?.areaConfidence || aiConfig?.aiAnalysis?.confidence || (taskBasedArea ? "medium" : "low"),
  } : null;

  // Status indicators
  const hasPhotoEstimate = !!summary?.photo_estimate && Object.keys(summary.photo_estimate).length > 0;
  const hasClientInfo = !!(summary?.client_name || summary?.client_email);
  const hasLineItems = Array.isArray(summary?.line_items) && summary.line_items.length > 0;
  const totalCost = summary?.total_cost || 0;

  // Build Operational Truth for report - now synchronized across 16 sources
  // Include manual blueprint validation override
  // CRITICAL: Use summary.mode as the source of truth for projectMode (synced with header)
  const operationalTruth: OperationalTruth = useMemo(() => {
    const baseOT = buildOperationalTruth({
      aiAnalysis,
      blueprintAnalysis: blueprintAnalysis ? { analyzed: !!blueprintAnalysis.extractedText } : undefined,
      dualEngineOutput,
      synthesisResult,
      filterAnswers,
      projectSize: photoEstimate?.projectSize || aiConfig?.projectSize,
      obcAcknowledged, // Pass OBC acknowledged status
    });
    
    // SYNC: Override projectMode from summary.mode to ensure header and Operational Truth match
    const syncedMode = summary?.mode === "team" ? "team" : "solo";
    
    // Apply manual blueprint override if set
    if (manuallyValidatedBlueprint && baseOT.blueprintStatus !== "analyzed") {
      return {
        ...baseOT,
        projectMode: syncedMode,
        blueprintStatus: "analyzed" as const,
        // Also apply conflict override if needed
        ...(manuallyIgnoredConflicts && baseOT.conflictStatus !== "aligned" ? { conflictStatus: "aligned" as const } : {})
      };
    }
    
    // Apply manual conflict override if set (without blueprint override)
    if (manuallyIgnoredConflicts && baseOT.conflictStatus !== "aligned") {
      return {
        ...baseOT,
        projectMode: syncedMode,
        conflictStatus: "aligned" as const,
      };
    }
    
    // Always apply synced mode to ensure consistency with header
    return {
      ...baseOT,
      projectMode: syncedMode,
    };
  }, [aiAnalysis, blueprintAnalysis, dualEngineOutput, synthesisResult, filterAnswers, photoEstimate, aiConfig, manuallyValidatedBlueprint, manuallyIgnoredConflicts, obcAcknowledged, summary?.mode]);

  // Determine data source origins for transparency
  const dataSourceOrigins = useMemo(() => {
    const origins: {
      area?: DataSourceOrigin;
      materials?: DataSourceOrigin;
      blueprint?: DataSourceOrigin;
      obc?: DataSourceOrigin;
      conflict?: DataSourceOrigin;
      mode?: DataSourceOrigin;
      size?: DataSourceOrigin;
      confidence?: DataSourceOrigin;
    } = {};

    // Area origin - priority matches final area calculation
    // Priority: AI-detected (rawArea) > User description > Calculator > Materials > Tasks
    if (rawArea) {
      // Check if it came from blueprint analysis or photo analysis
      if (blueprintAnalysis?.detectedArea === rawArea) {
        origins.area = "blueprint";
      } else {
        origins.area = "photo_ai";
      }
    } else if (descriptionArea) {
      origins.area = "description";
    } else if (calculatorArea) {
      origins.area = "config";
    } else if (fallbackArea) {
      origins.area = "photo_ai";
    } else if (taskBasedArea) {
      origins.area = "tasks";
    }

    // Materials origin
    if (materialsData.length > 0) {
      if (photoEstimate?.materials) origins.materials = "photo_ai";
      else origins.materials = "config";
    } else if (taskBasedMaterials.length > 0) {
      origins.materials = "tasks";
    }

    // Blueprint origin - prioritize manual validation
    if (manuallyValidatedBlueprint) origins.blueprint = "manual";
    else if (blueprintAnalysis?.extractedText) origins.blueprint = "blueprint";
    else if (photoEstimate?.blueprintAnalysis) origins.blueprint = "photo_ai";

    // OBC origin (always from OpenAI engine)
    if (dualEngineOutput?.openai) origins.obc = "config";

    // Conflict origin (dual-engine check or manual ignore)
    if (manuallyIgnoredConflicts) origins.conflict = "manual";
    else if (synthesisResult) origins.conflict = "config";

    // Mode origin (from filter answers)
    origins.mode = "config";

    // Size origin
    if (photoEstimate?.projectSize) origins.size = "photo_ai";
    else origins.size = "config";

    // Confidence origin
    if (photoEstimate?.areaConfidence) origins.confidence = "photo_ai";
    else if (taskBasedArea) origins.confidence = "tasks";
    else origins.confidence = "default";

    return origins;
  }, [rawArea, descriptionArea, calculatorArea, fallbackArea, taskBasedArea, materialsData, taskBasedMaterials, photoEstimate, blueprintAnalysis, dualEngineOutput, synthesisResult, manuallyValidatedBlueprint, manuallyIgnoredConflicts]);

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
      <div className="flex flex-col gap-4">
        {/* Top row: Back button + Title */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-0.5 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-[200px] sm:max-w-none">{project.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "capitalize text-xs",
                    isTeamMode 
                      ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                      : "border-amber-500 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {isTeamMode ? t("projects.teamMode") : t("projects.soloMode")}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="capitalize bg-muted/50 text-xs"
                >
                  {project.status}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
              {project.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-none">{project.address}</span>
                </span>
              )}
              {project.trade && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  {project.trade.replace("_", " ")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                {format(new Date(project.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Project Timeline Bar - THE CLOCKWORK */}
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
        taskProgress={phaseProgress.taskProgressPercent}
        completedTasks={phaseProgress.completedCount}
        totalTasks={phaseProgress.totalCount}
        phases={phaseProgress.phases}
      />

      {/* Main Content Tabs - Between Timeline Bar and Phases */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "grid w-full bg-muted/50 h-auto p-1",
          isTeamMode ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-5"
        )}>
          <TabsTrigger 
            value="overview" 
            className={cn(
              "gap-2 transition-all duration-300",
              flashingTab === "overview" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.overview")}</span>
          </TabsTrigger>
          {/* Tasks Tab - Always visible, different label for solo/team */}
          <TabsTrigger 
            value="team" 
            className={cn(
              "gap-2 transition-all duration-300",
              flashingTab === "team" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
            )}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isTeamMode ? t("projects.teamAndTasks", "Team & Tasks") : t("projects.tasks", "Tasks")}
            </span>
            {isTeamMode && members.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {members.length}
              </Badge>
            )}
          </TabsTrigger>
          {/* Documents Tab - Always visible */}
          <TabsTrigger 
            value="documents" 
            className={cn(
              "gap-2 transition-all duration-300",
              flashingTab === "documents" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.documents")}</span>
          </TabsTrigger>
          {/* Contracts Tab - Only for Team Mode */}
          {isTeamMode && (
            <TabsTrigger 
              value="contracts" 
              className={cn(
                "gap-2 transition-all duration-300",
                flashingTab === "contracts" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
              )}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contracts</span>
            </TabsTrigger>
          )}
          {/* Site Map Tab - Available for all users */}
          <TabsTrigger 
            value="map" 
            className={cn(
              "gap-2 transition-all duration-300",
              flashingTab === "map" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
            )}
          >
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.siteMap")}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="materials" 
            className={cn(
              "gap-2 transition-all duration-300",
              flashingTab === "materials" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.materials", "Materials")}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="weather" 
            className={cn(
              "gap-2 transition-all duration-300",
              flashingTab === "weather" && "ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 animate-pulse"
            )}
          >
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">{t("projects.weather")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Operational Truth Verification Cards */}
          <OperationalTruthCards
            operationalTruth={operationalTruth}
            projectId={projectId}
            projectAddress={project.address || undefined}
            dataSourceOrigins={dataSourceOrigins}
            pillarCitations={pillarCitations}
            onBlueprintValidated={handleBlueprintValidated}
            onConflictsIgnored={handleConflictsIgnored}
            initialBlueprintValidated={manuallyValidatedBlueprint}
            initialConflictsIgnored={manuallyIgnoredConflicts}
            onNavigateToTaskTimeline={() => {
              setForceCalendarView(true);
              setActiveTab("team");
            }}
            onUpdate={() => {
              // Reload OBC acknowledged status when reports are updated
              const loadObcStatus = async () => {
                const { data } = await supabase
                  .from("project_summaries")
                  .select("ai_workflow_config")
                  .eq("project_id", projectId)
                  .maybeSingle();
                
                const config = data?.ai_workflow_config as { obcResult?: { acknowledged?: boolean } } | null;
                if (config?.obcResult?.acknowledged && !obcAcknowledged) {
                  setObcAcknowledged(true);
                }
              };
              loadObcStatus();
            }}
          />


          {/* Project Command Center - AI Brief & Document Hub */}
          <ProjectCommandCenter
            projectId={projectId}
            projectName={project.name}
            projectAddress={project.address || undefined}
            projectTrade={project.trade || undefined}
            projectCreatedAt={project.created_at}
            projectStatus={project.status}
            operationalTruth={operationalTruth}
            companyBranding={{
              name: companyBranding.name,
              logo: companyBranding.logoUrl || undefined,
              phone: companyBranding.phone || undefined,
              email: companyBranding.email || undefined,
              website: companyBranding.website || undefined,
            }}
            conflicts={projectConflicts.map(c => ({
              conflictType: c.conflictType,
              severity: c.severity,
              description: c.description,
            }))}
            isPremium={isPremium}
            subscriptionTier={subscription?.tier || "free"}
            onNavigateToTab={(tabId) => {
              // Flash effect before navigating
              setFlashingTab(tabId);
              setTimeout(() => {
                setActiveTab(tabId);
                setFlashingTab(null);
              }, 300);
            }}
            onCompleteProject={handleCompleteProject}
            dataSourcesInfo={{
              taskCount: tasks.length,
              completedTasks: tasks.filter(t => t.status === "completed").length,
              documentCount: documentCount,
              contractCount: contractCount,
              signedContracts: signedContracts,
              teamSize: members.length + 1, // +1 for owner
              hasTimeline: !!(summary?.project_start_date && summary?.project_end_date),
              hasStartDate: !!summary?.project_start_date,
              hasEndDate: !!summary?.project_end_date,
              hasClientInfo: !!(summary?.client_name || summary?.client_email),
            }}
            clientInfo={{
              name: summary?.client_name || "",
              email: summary?.client_email || "",
              phone: summary?.client_phone || "",
              address: summary?.client_address || "",
            }}
            onClientInfoUpdate={handleClientInfoUpdate}
            citations={citations}
            onCitationClick={handleCitationClick}
            onLinkCitationToPillar={handleLinkCitationToPillar}
          />
        </TabsContent>

        {/* Team/Tasks Tab - Always visible */}
        <TabsContent value="team" className="mt-6">
          {/* Show Worker Dashboard for non-owners, TeamTab for owners */}
          {isOwner || permissions.canCreateTasks ? (
            <TeamTab
              projectId={projectId}
              isOwner={isOwner}
              projectAddress={project.address || undefined}
              aiMaterials={aiAnalysis?.materials}
              projectStartDate={summary?.project_start_date ? new Date(summary.project_start_date) : null}
              projectEndDate={summary?.project_end_date ? new Date(summary.project_end_date) : null}
              forceCalendarView={forceCalendarView}
              onCalendarViewActivated={() => setForceCalendarView(false)}
              existingTaskCount={tasks.length}
              isSoloMode={!isTeamMode}
              permissions={{
                canCreateTasks: permissions.canCreateTasks,
                canAssignTasks: permissions.canAssignTasks,
                canInviteMembers: permissions.canInviteMembers,
                canRemoveMembers: permissions.canRemoveMembers,
              }}
            />
          ) : (
            <WorkerDashboard
              projectId={projectId}
              projectName={project.name}
            />
          )}
        </TabsContent>

        {/* Documents Tab - Always visible */}
        <TabsContent value="documents" className="mt-6">
          <DocumentsPane
            projectId={projectId}
            siteImages={project.site_images}
            permissions={permissions}
          />
        </TabsContent>

        {/* Contracts Tab - Only for Team Mode */}
        {isTeamMode && (
          <TabsContent value="contracts" className="mt-6">
            <ContractsTab
              projectId={projectId}
              isOwner={isOwner}
              projectName={project.name}
              projectAddress={project.address || undefined}
              projectDescription={project.description || undefined}
              clientInfo={{
                name: summary?.client_name || undefined,
                email: summary?.client_email || undefined,
                phone: summary?.client_phone || undefined,
                address: summary?.client_address || undefined,
              }}
            />
          </TabsContent>
        )}

        {/* Site Map Tab - Available for all users */}
        <TabsContent value="map" className="mt-6">
          {project.address ? (
            <TeamMapWidget
              projectAddress={project.address}
              projectName={project.name}
              conflicts={projectConflicts}
              isPremium={isPremium}
              teamMembers={isTeamMode ? teamMembersForMap : []}
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

        {/* Materials Tab - Cost Breakdown from AI-analyzed tasks */}
        <TabsContent value="materials" className="mt-6">
          <MaterialCalculationTab 
            materials={(() => {
              // === READ FROM CENTRAL MATERIALS (Single Source of Truth) ===
              // projectState.centralMaterials is populated by:
              // 1. On project load: from saved line_items or AI photo_estimate
              // 2. On AI Analysis: from useProjectAIAnalysis hook
              
              if (projectState.centralMaterials.items.length > 0) {
                // Use central materials - already synced with confirmed area
                return projectState.centralMaterials.items.map(m => ({
                  item: m.item,
                  quantity: m.quantity,
                  unit: m.unit,
                  unitPrice: m.unitPrice || 0,
                  baseQuantity: m.originalValue,
                  isEssential: m.isEssential,
                  totalPrice: m.totalPrice,
                }));
              }
              
              // Fallback: Aggregate materials from "Order" tasks (only if centralMaterials empty)
              type CostEntry = { item: string; quantity: number; unit: string; unitPrice: number };
              const materialMap: Record<string, CostEntry> = {};
              
              tasks.forEach(task => {
                if (task.title.toLowerCase().startsWith('order') && task.quantity) {
                  const materialMatch = task.title.match(/Order\s+(.+?)$/i);
                  const materialName = materialMatch ? materialMatch[1] : task.title;
                  
                  if (!materialMap[materialName]) {
                    materialMap[materialName] = {
                      item: materialName,
                      quantity: task.quantity,
                      unit: task.description?.match(/(\d+)\s+(\w+\s*\w*)\s+of/)?.[2] || "units",
                      unitPrice: task.unit_price || 0,
                    };
                  }
                }
              });
              
              return Object.values(materialMap);
            })()}
            labor={(() => {
              // First check if we have saved line_items in the summary
              // Include totalPrice for proper restoration
              const savedLineItems = summary?.line_items as { 
                labor?: Array<{ 
                  item: string; 
                  quantity: number; 
                  unit: string; 
                  unitPrice: number;
                  totalPrice?: number;
                }> 
              } | null;
              if (savedLineItems?.labor && savedLineItems.labor.length > 0) {
                return savedLineItems.labor;
              }
              
              // Otherwise aggregate labor from "Install" tasks
              type CostEntry = { item: string; quantity: number; unit: string; unitPrice: number };
              const laborMap: Record<string, CostEntry> = {};
              
              tasks.forEach(task => {
                if (task.title.toLowerCase().startsWith('install') && task.quantity) {
                  const laborMatch = task.title.match(/Install\s+(.+?)$/i);
                  const laborName = laborMatch ? `${laborMatch[1]} Installation` : task.title;
                  
                  if (!laborMap[laborName]) {
                    laborMap[laborName] = {
                      item: laborName,
                      quantity: task.quantity,
                      unit: task.description?.match(/(\d+)\s+(\w+\s*\w*)\s+of/)?.[2] || "units",
                      unitPrice: task.unit_price || 0,
                    };
                  }
                }
              });
              
              return Object.values(laborMap);
            })()}
            projectTotal={summary?.total_cost || 0}
            projectId={project.id}
            projectName={project.name}
            projectAddress={project.address || ""}
            confirmedArea={operationalTruth.confirmedArea}
            confirmedAreaUnit={aiAnalysis?.areaUnit || "sq ft"}
            wastePercent={projectState.centralMaterials.wastePercent}
            baseArea={projectState.centralMaterials.baseArea}
            companyName={companyBranding.name}
            companyLogoUrl={companyBranding.logoUrl}
            companyPhone={companyBranding.phone}
            companyEmail={companyBranding.email}
            companyWebsite={companyBranding.website}
            clientInfo={{
              name: summary?.client_name || undefined,
              email: summary?.client_email || undefined,
              phone: summary?.client_phone || undefined,
              address: summary?.client_address || undefined,
            }}
            dataSource={(() => {
              // Determine dataSource based on centralMaterials source:
              // - "manual" or "merged": GROSS values already stored -> 'saved'
              // - "ai_analysis" or "template": BASE values -> 'ai' (apply waste)
              const source = projectState.centralMaterials.source;
              if (source === "manual" || source === "merged") {
                return 'saved' as const;
              }
              if (projectState.centralMaterials.items.length > 0) {
                // AI analysis or template data - apply waste calculation
                return 'ai' as const;
              }
              return 'tasks' as const;
            })()}
            isSoloMode={!isTeamMode}
            onCostsChange={(costs) => {
              // === IMMEDIATE SYNC to centralFinancials (Dashboard reads from here) ===
              const laborTotal = costs.labor.reduce((sum, l) => sum + (l.totalPrice || l.quantity * (l.unitPrice || 0)), 0);
              const otherTotal = costs.other.reduce((sum, o) => sum + (o.totalPrice || o.quantity * (o.unitPrice || 0)), 0);
              
              // Only update if there are actual items or non-zero values
              // This prevents overwriting existing values with 0 on initial mount
              const hasLaborItems = costs.labor.length > 0;
              const hasOtherItems = costs.other.length > 0;
              
              const updates: Partial<{ laborCost: number; otherCost: number }> = {};
              
              // Only update labor if there are items OR the total is non-zero
              if (hasLaborItems || laborTotal > 0) {
                updates.laborCost = laborTotal;
              }
              
              // Only update other if there are items OR the total is non-zero
              if (hasOtherItems || otherTotal > 0) {
                updates.otherCost = otherTotal;
              }
              
              // Only call setCentralFinancials if we have updates
              if (Object.keys(updates).length > 0) {
                projectActions.setCentralFinancials(updates);
              }
            }}
            onGrandTotalChange={(newTotal) => {
              // Update summary.total_cost so header stays in sync
              setSummary(prev => prev ? { ...prev, total_cost: newTotal } : null);
            }}
            onSave={async (costs) => {
              console.log('[Materials Save] Starting save process...', { hasSummary: !!summary, hasUser: !!user });
              if (!summary || !user) {
                console.log('[Materials Save] Missing summary or user, aborting');
                return;
              }
              
              // Serialize to JSON-compatible format
              const lineItemsData = JSON.parse(JSON.stringify({
                materials: costs.materials,
                labor: costs.labor,
                other: costs.other,
              }));
              
              const now = new Date();
              const dateStr = now.toLocaleDateString('en-CA');
              const docFileName = `Cost-Breakdown-${dateStr}.pdf`;
              
              // Get existing verified_facts to update citation registry
              const existingFacts = (summary.verified_facts || {}) as Record<string, unknown>;
              const existingCitations = (existingFacts.citationRegistry || []) as CitationSource[];
              
              // Check if we already have a MAT-EDIT citation, update it or add new one
              const matEditIndex = existingCitations.findIndex(c => c.sourceId === 'MAT-EDIT');
              const newCitation: CitationSource = {
                id: crypto.randomUUID(),
                sourceId: 'MAT-EDIT',
                documentName: docFileName,
                documentType: 'log',
                linkedPillar: 'materials',
                contextSnippet: `Cost breakdown saved: ${costs.materials.length} materials, ${costs.labor.length} labor items, ${costs.other.length} other items. Grand total: $${costs.grandTotal.toLocaleString()}`,
                timestamp: new Date().toISOString(),
                registeredAt: new Date().toISOString(),
                registeredBy: user?.id || 'unknown',
              };
              
              let updatedCitations: CitationSource[];
              if (matEditIndex >= 0) {
                updatedCitations = [...existingCitations];
                updatedCitations[matEditIndex] = newCitation;
              } else {
                updatedCitations = [...existingCitations, newCitation];
              }
              
              const updatedFacts = JSON.parse(JSON.stringify({
                ...existingFacts,
                citationRegistry: updatedCitations,
                citationRegistryUpdatedAt: new Date().toISOString(),
                totalCitations: updatedCitations.length,
              }));
              
              // Save to project_summaries
              const { error } = await supabase
                .from('project_summaries')
                .update({
                  line_items: lineItemsData,
                  total_cost: costs.grandTotal,
                  verified_facts: updatedFacts,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', summary.id);
              
              if (error) throw error;
              
              // === SYNC TO CENTRAL MATERIALS (Dashboard reads from here) ===
              const essentialKeywords = ["flooring", "laminate", "tile", "drywall", "underlayment", "baseboard", "trim", "hardwood"];
              const checkEssential = (item: string) => essentialKeywords.some(k => item.toLowerCase().includes(k));
              
              const savedCentralItems = costs.materials.map((m, index) => ({
                id: `saved-mat-${index}-${Date.now()}`,
                item: m.item,
                quantity: m.quantity,
                unit: m.unit,
                unitPrice: m.unitPrice || 0,
                totalPrice: m.totalPrice || (m.quantity * (m.unitPrice || 0)),
                source: "manual" as const,
                citationSource: "manual_override" as const,
                citationId: `[SAVED-${index + 1}]`,
                isEssential: m.isEssential ?? checkEssential(m.item),
                wastePercentage: m.isEssential ?? checkEssential(m.item) ? 10 : 0,
              }));
              
              console.log('[Materials Save] Syncing to centralMaterials:', savedCentralItems.length);
              projectActions.setCentralMaterials(savedCentralItems, "manual");
              
              // === SYNC LABOR AND OTHER COSTS TO centralFinancials ===
              const laborTotal = costs.labor.reduce((sum, l) => sum + (l.totalPrice || l.quantity * (l.unitPrice || 0)), 0);
              const otherTotal = costs.other.reduce((sum, o) => sum + (o.totalPrice || o.quantity * (o.unitPrice || 0)), 0);
              
              console.log('[Materials Save] Syncing to centralFinancials:', { laborTotal, otherTotal });
              projectActions.setCentralFinancials({
                laborCost: laborTotal,
                otherCost: otherTotal,
              });
              
              setSummary(prev => prev ? {
                ...prev,
                line_items: lineItemsData as unknown[],
                total_cost: costs.grandTotal,
                verified_facts: updatedFacts as Record<string, unknown>,
              } : null);
              
              await refreshCitations();
              toast.success('Cost breakdown saved to Documents tab');
            }}
          />
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



    </div>
  );
};

export default ProjectDetailsView;
