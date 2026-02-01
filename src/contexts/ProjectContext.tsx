// ============================================
// PROJECT CONTEXT - SINGLE SOURCE OF TRUTH
// Central state management for all 16 Operational Entities
// ============================================

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ProjectContextState,
  ProjectContextActions,
  OperationalTruthState,
  WorkflowDataState,
  Page1State,
  Page2State,
  Page3State,
  Page4State,
  HealthMetrics,
  DataSourceStatus,
  ClientInfoState,
  MaterialItem,
  LineItem,
  BudgetTemplate,
  SyncState,
  CitationEntry,
  CitationSource,
  WORK_TYPE_CATEGORIES,
  detectWorkTypeCategory,
} from "./ProjectContext.types";
import {
  WorkTypeId,
  mapWorkTypeToMaterials,
  getTemplateByWorkType,
  calculateTemplateEstimate,
  TORONTO_WORK_TYPES,
} from "@/lib/workTypeTemplates";

// ============================================
// INITIAL STATES
// ============================================

const initialOperationalTruth: OperationalTruthState = {
  confirmedArea: {
    value: null,
    unit: "sq ft",
    source: "none",
    confidence: "low",
  },
  materials: {
    count: 0,
    items: [],
    source: "ai",
  },
  blueprint: {
    status: "pending",
  },
  obcCompliance: {
    status: "pending",
    acknowledged: false,
  },
  conflict: {
    status: "pending",
    ignored: false,
  },
  projectMode: "solo",
  projectSize: "medium",
  confidenceLevel: "low",
};

const initialWorkflowData: WorkflowDataState = {
  tasks: { total: 0, completed: 0, pending: 0, inProgress: 0 },
  documents: { count: 0, hasBlueprint: false, hasContract: false },
  contracts: { count: 0, signed: 0, pending: 0 },
  team: { size: 1, hasForeman: false, memberIds: [] },
  siteMap: { address: null, isValid: false },
  timeline: { startDate: null, endDate: null, durationDays: null },
  clientInfo: { name: "", email: "", phone: "", address: "", isComplete: false },
  weather: { available: false },
};

const initialPage1: Page1State = {
  workType: null,
  workTypeCategory: null,
  projectName: "",
  description: "",
  address: "",
  images: [],
  documents: [],
  analysisTriggered: false,
  analysisComplete: false,
};

const initialPage2: Page2State = {
  selectedTemplateId: null,
  recommendedTemplates: [],
  calculatorType: null,
  materials: [],
  manualAreaOverride: null,
  manualMaterialOverrides: {},
  estimatedMaterialCost: 0,
  estimatedLaborCost: 0,
  citationRegistry: [],
  lastModifiedSource: null,
};

const initialPage3: Page3State = {
  lineItems: [],
  materialCost: 0,
  laborCost: 0,
  otherCost: 0,
  subtotal: 0,
  taxRate: 0.13, // Default HST
  taxAmount: 0,
  totalCost: 0,
  quoteGenerated: false,
};

const initialPage4: Page4State = {
  contractId: null,
  contractNumber: null,
  contractorSigned: false,
  clientSigned: false,
  sentToClient: false,
};

const initialSync: SyncState = {
  isDirty: false,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  pendingChanges: [],
};

const initialHealthMetrics: HealthMetrics = {
  healthScore: 0,
  pillarCompletion: 0,
  workflowCompletion: 0,
  completeCount: 0,
  partialCount: 0,
  pendingCount: 0,
  relevantSourceCount: 13,
  dataSources: [],
};

const initialState: ProjectContextState = {
  projectId: null,
  summaryId: null,
  userId: null,
  operationalTruth: initialOperationalTruth,
  workflowData: initialWorkflowData,
  page1: initialPage1,
  page2: initialPage2,
  page3: initialPage3,
  page4: initialPage4,
  healthMetrics: initialHealthMetrics,
  sync: initialSync,
  currentPage: 1,
  isInitialized: false,
  isLoading: false,
};

// ============================================
// ACTION TYPES
// ============================================

type ProjectAction =
  | { type: "SET_PROJECT_IDS"; payload: { projectId: string | null; summaryId: string | null } }
  | { type: "SET_USER_ID"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "SET_CURRENT_PAGE"; payload: ProjectContextState["currentPage"] }
  | { type: "SET_PAGE1"; payload: Partial<Page1State> }
  | { type: "SET_PAGE2"; payload: Partial<Page2State> }
  | { type: "SET_PAGE3"; payload: Partial<Page3State> }
  | { type: "SET_PAGE4"; payload: Partial<Page4State> }
  | { type: "SET_OPERATIONAL_TRUTH"; payload: Partial<OperationalTruthState> }
  | { type: "SET_WORKFLOW_DATA"; payload: Partial<WorkflowDataState> }
  | { type: "UPDATE_PILLAR"; payload: { pillar: keyof OperationalTruthState; value: any } }
  | { type: "UPDATE_WORKFLOW"; payload: { workflow: keyof WorkflowDataState; value: any } }
  | { type: "SET_HEALTH_METRICS"; payload: HealthMetrics }
  | { type: "SET_SYNC"; payload: Partial<SyncState> }
  | { type: "MARK_DIRTY"; payload: string }
  | { type: "RESET_PROJECT" }
  | { type: "LOAD_FROM_DATABASE"; payload: Partial<ProjectContextState> };

// ============================================
// REDUCER
// ============================================

function projectReducer(state: ProjectContextState, action: ProjectAction): ProjectContextState {
  switch (action.type) {
    case "SET_PROJECT_IDS":
      return { ...state, projectId: action.payload.projectId, summaryId: action.payload.summaryId };
    
    case "SET_USER_ID":
      return { ...state, userId: action.payload };
    
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    
    case "SET_INITIALIZED":
      return { ...state, isInitialized: action.payload };
    
    case "SET_CURRENT_PAGE":
      return { ...state, currentPage: action.payload };
    
    case "SET_PAGE1":
      return { ...state, page1: { ...state.page1, ...action.payload } };
    
    case "SET_PAGE2":
      return { ...state, page2: { ...state.page2, ...action.payload } };
    
    case "SET_PAGE3":
      return { ...state, page3: { ...state.page3, ...action.payload } };
    
    case "SET_PAGE4":
      return { ...state, page4: { ...state.page4, ...action.payload } };
    
    case "SET_OPERATIONAL_TRUTH":
      return { ...state, operationalTruth: { ...state.operationalTruth, ...action.payload } };
    
    case "SET_WORKFLOW_DATA":
      return { ...state, workflowData: { ...state.workflowData, ...action.payload } };
    
    case "UPDATE_PILLAR":
      return {
        ...state,
        operationalTruth: {
          ...state.operationalTruth,
          [action.payload.pillar]: typeof action.payload.value === "object"
            ? { ...(state.operationalTruth[action.payload.pillar] as object), ...action.payload.value }
            : action.payload.value,
        },
      };
    
    case "UPDATE_WORKFLOW":
      return {
        ...state,
        workflowData: {
          ...state.workflowData,
          [action.payload.workflow]: typeof action.payload.value === "object"
            ? { ...(state.workflowData[action.payload.workflow] as object), ...action.payload.value }
            : action.payload.value,
        },
      };
    
    case "SET_HEALTH_METRICS":
      return { ...state, healthMetrics: action.payload };
    
    case "SET_SYNC":
      return { ...state, sync: { ...state.sync, ...action.payload } };
    
    case "MARK_DIRTY":
      return {
        ...state,
        sync: {
          ...state.sync,
          isDirty: true,
          pendingChanges: [...new Set([...state.sync.pendingChanges, action.payload])],
        },
      };
    
    case "RESET_PROJECT":
      return { ...initialState, userId: state.userId };
    
    case "LOAD_FROM_DATABASE":
      return { ...state, ...action.payload, isInitialized: true, isLoading: false };
    
    default:
      return state;
  }
}

// ============================================
// HEALTH SCORE CALCULATOR
// ============================================

function calculateHealthMetrics(state: ProjectContextState): HealthMetrics {
  const isSoloMode = state.operationalTruth.projectMode === "solo";
  const { operationalTruth: ot, workflowData: wd } = state;

  // Build 16 data sources
  const dataSources: DataSourceStatus[] = [
    // 8 PILLARS
    {
      id: "area",
      name: "Confirmed Area",
      category: "pillar",
      status: ot.confirmedArea.value !== null ? "complete" : "pending",
      value: ot.confirmedArea.value ? `${ot.confirmedArea.value} ${ot.confirmedArea.unit}` : null,
      missingItems: ot.confirmedArea.value === null ? ["Area not detected"] : undefined,
    },
    {
      id: "materials",
      name: "Materials",
      category: "pillar",
      status: ot.materials.count > 0 ? "complete" : "pending",
      value: ot.materials.count > 0 ? `${ot.materials.count} items` : null,
      missingItems: ot.materials.count === 0 ? ["No materials detected"] : undefined,
    },
    {
      id: "blueprint",
      name: "Blueprint",
      category: "pillar",
      status: ot.blueprint.status === "analyzed" ? "complete" : ot.blueprint.status === "none" ? "partial" : "pending",
      value: ot.blueprint.status,
      missingItems: ot.blueprint.status === "pending" ? ["Blueprint not analyzed"] : undefined,
    },
    {
      id: "obc",
      name: "OBC Compliance",
      category: "pillar",
      status: ot.obcCompliance.status !== "pending" || ot.obcCompliance.acknowledged ? "complete" : "pending",
      value: ot.obcCompliance.status,
      missingItems: ot.obcCompliance.status === "pending" && !ot.obcCompliance.acknowledged ? ["OBC check pending"] : undefined,
    },
    {
      id: "conflict",
      name: "Conflict Check",
      category: "pillar",
      status: ot.conflict.status !== "pending" || ot.conflict.ignored ? "complete" : "pending",
      value: ot.conflict.status,
      missingItems: ot.conflict.status === "pending" && !ot.conflict.ignored ? ["Conflict check pending"] : undefined,
    },
    {
      id: "mode",
      name: "Project Mode",
      category: "pillar",
      status: "complete",
      value: ot.projectMode,
    },
    {
      id: "size",
      name: "Project Size",
      category: "pillar",
      status: "complete",
      value: ot.projectSize,
    },
    {
      id: "confidence",
      name: "AI Confidence",
      category: "pillar",
      status: ot.confidenceLevel !== "low" ? "complete" : "partial",
      value: ot.confidenceLevel,
      missingItems: ot.confidenceLevel === "low" ? ["Insufficient data"] : undefined,
    },
    
    // 8 WORKFLOWS
    {
      id: "tasks",
      name: "Tasks",
      category: "workflow",
      status: wd.tasks.total > 0 && wd.tasks.completed === wd.tasks.total
        ? "complete"
        : wd.tasks.total > 0
          ? "partial"
          : "pending",
      value: wd.tasks.total > 0 ? `${wd.tasks.completed}/${wd.tasks.total}` : null,
      missingItems: wd.tasks.total === 0 ? ["No tasks created"] : wd.tasks.completed < wd.tasks.total ? [`${wd.tasks.total - wd.tasks.completed} tasks remaining`] : undefined,
    },
    {
      id: "documents",
      name: "Documents",
      category: "workflow",
      status: isSoloMode ? "complete" : wd.documents.count > 0 ? "complete" : "pending",
      value: isSoloMode ? "N/A (Solo)" : wd.documents.count > 0 ? `${wd.documents.count} files` : null,
      isExcludedInSolo: isSoloMode,
      missingItems: !isSoloMode && wd.documents.count === 0 ? ["No documents uploaded"] : undefined,
    },
    {
      id: "contracts",
      name: "Contracts",
      category: "workflow",
      status: isSoloMode ? "complete" : wd.contracts.signed > 0 ? "complete" : wd.contracts.count > 0 ? "partial" : "pending",
      value: isSoloMode ? "N/A (Solo)" : wd.contracts.count > 0 ? `${wd.contracts.signed}/${wd.contracts.count} signed` : null,
      isExcludedInSolo: isSoloMode,
      missingItems: !isSoloMode && wd.contracts.signed === 0 ? ["No signed contracts"] : undefined,
    },
    {
      id: "team",
      name: "Team",
      category: "workflow",
      status: isSoloMode ? "complete" : wd.team.size > 1 ? "complete" : "pending",
      value: isSoloMode ? "N/A (Solo)" : wd.team.size > 1 ? `${wd.team.size} members` : "Owner only",
      isExcludedInSolo: isSoloMode,
      missingItems: !isSoloMode && wd.team.size <= 1 ? ["No team members added"] : undefined,
    },
    {
      id: "sitemap",
      name: "Site Map",
      category: "workflow",
      status: wd.siteMap.address ? "complete" : "pending",
      value: wd.siteMap.address ? "Located" : null,
      missingItems: !wd.siteMap.address ? ["No address set"] : undefined,
    },
    {
      id: "timeline",
      name: "Timeline",
      category: "workflow",
      status: wd.timeline.startDate && wd.timeline.endDate ? "complete" : wd.timeline.startDate ? "partial" : "pending",
      value: wd.timeline.startDate && wd.timeline.endDate ? "Complete" : wd.timeline.startDate ? "Start only" : null,
      missingItems: !wd.timeline.startDate ? ["Start date not set"] : !wd.timeline.endDate ? ["End date not set"] : undefined,
    },
    {
      id: "client",
      name: "Client Info",
      category: "workflow",
      status: wd.clientInfo.isComplete ? "complete" : (wd.clientInfo.name || wd.clientInfo.email) ? "partial" : "pending",
      value: wd.clientInfo.isComplete ? "Complete" : (wd.clientInfo.name || wd.clientInfo.email) ? "Partial" : null,
      missingItems: !wd.clientInfo.name && !wd.clientInfo.email ? ["Client info missing"] : undefined,
    },
    {
      id: "weather",
      name: "Weather",
      category: "workflow",
      status: wd.siteMap.address ? "complete" : "pending",
      value: wd.siteMap.address ? "Available" : null,
      missingItems: !wd.siteMap.address ? ["Add address for weather"] : undefined,
    },
  ];

  // Solo mode: exclude documents, contracts, team from calculation
  const soloExcludedIds = ["documents", "contracts", "team"];
  const relevantSources = isSoloMode
    ? dataSources.filter(s => !soloExcludedIds.includes(s.id))
    : dataSources;

  const completeCount = relevantSources.filter(s => s.status === "complete").length;
  const partialCount = relevantSources.filter(s => s.status === "partial").length;
  const pendingCount = relevantSources.filter(s => s.status === "pending").length;

  const pillarSources = dataSources.filter(s => s.category === "pillar");
  const workflowSources = dataSources.filter(s => s.category === "workflow");
  const relevantWorkflows = isSoloMode
    ? workflowSources.filter(s => !soloExcludedIds.includes(s.id))
    : workflowSources;

  const pillarCompletion = Math.round(
    (pillarSources.filter(s => s.status === "complete").length / pillarSources.length) * 100
  );
  const workflowCompletion = Math.round(
    (relevantWorkflows.filter(s => s.status === "complete").length / relevantWorkflows.length) * 100
  );

  const healthScore = Math.round((completeCount / relevantSources.length) * 100);

  return {
    healthScore,
    pillarCompletion,
    workflowCompletion,
    completeCount,
    partialCount,
    pendingCount,
    relevantSourceCount: relevantSources.length,
    dataSources,
  };
}

// ============================================
// CONTEXT CREATION
// ============================================

const ProjectContext = createContext<{
  state: ProjectContextState;
  actions: ProjectContextActions;
} | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // Update user ID when auth changes
  useEffect(() => {
    dispatch({ type: "SET_USER_ID", payload: user?.id || null });
  }, [user?.id]);

  // Recalculate health metrics whenever relevant state changes
  useEffect(() => {
    const metrics = calculateHealthMetrics(state);
    dispatch({ type: "SET_HEALTH_METRICS", payload: metrics });
  }, [state.operationalTruth, state.workflowData]);

  // ============================================
  // ACTION IMPLEMENTATIONS
  // ============================================

  const initializeProject = useCallback(async (projectId: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      // Load project and summary data
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      const { data: summary, error: summaryError } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      // Load related data
      const [tasksResult, membersResult, documentsResult, contractsResult] = await Promise.all([
        supabase.from("project_tasks").select("status").eq("project_id", projectId),
        supabase.from("project_members").select("user_id, role").eq("project_id", projectId),
        supabase.from("project_documents").select("id").eq("project_id", projectId),
        supabase.from("contracts").select("id, status, client_signed_at").eq("project_id", projectId),
      ]);

      // Build state from database
      const tasks = tasksResult.data || [];
      const members = membersResult.data || [];
      const documents = documentsResult.data || [];
      const contracts = contractsResult.data || [];

      // Parse AI analysis data
      const photoEstimate = summary?.photo_estimate as any || {};
      const aiConfig = summary?.ai_workflow_config as any || {};
      const verifiedFacts = summary?.verified_facts as any || {};

      const newState: Partial<ProjectContextState> = {
        projectId,
        summaryId: summary?.id || null,
        operationalTruth: {
          confirmedArea: {
            value: photoEstimate.area || aiConfig?.aiAnalysis?.area || null,
            unit: photoEstimate.areaUnit || aiConfig?.aiAnalysis?.areaUnit || "sq ft",
            source: photoEstimate.area ? "ai-photo" : "none",
            confidence: aiConfig?.aiAnalysis?.confidence || "low",
          },
          materials: {
            count: photoEstimate.materials?.length || 0,
            items: (photoEstimate.materials || []).map((m: any, i: number) => ({
              id: `mat-${i}-${Date.now()}`,
              item: m.item || m.name,
              quantity: m.quantity,
              unit: m.unit,
              unitPrice: m.unitPrice || m.unit_price || 0,
              totalPrice: m.totalPrice || m.total_price || (m.quantity * (m.unitPrice || m.unit_price || 0)),
              source: m.source || "ai" as const,
              citationSource: (m.citationSource || m.citation_source || "ai_photo") as CitationSource,
              citationId: m.citationId || m.citation_id || `[P-${String(i + 1).padStart(3, "0")}]`,
              isEssential: m.isEssential ?? m.is_essential ?? false,
              wastePercentage: m.wastePercentage || m.waste_percentage || 0,
            })),
            source: "ai",
          },
          blueprint: {
            status: photoEstimate.hasBlueprint ? "analyzed" : "pending",
          },
          obcCompliance: {
            status: verifiedFacts?.obcAcknowledged ? "clear" : "pending",
            acknowledged: verifiedFacts?.obcAcknowledged || false,
          },
          conflict: {
            status: verifiedFacts?.conflictIgnored ? "aligned" : "pending",
            ignored: verifiedFacts?.conflictIgnored || false,
          },
          projectMode: summary?.mode as "solo" | "team" || "solo",
          projectSize: aiConfig?.projectSize || "medium",
          confidenceLevel: aiConfig?.aiAnalysis?.confidence || "low",
        },
        workflowData: {
          tasks: {
            total: tasks.length,
            completed: tasks.filter(t => t.status === "completed").length,
            pending: tasks.filter(t => t.status === "pending").length,
            inProgress: tasks.filter(t => t.status === "in_progress").length,
          },
          documents: {
            count: documents.length,
            hasBlueprint: false,
            hasContract: contracts.length > 0,
          },
          contracts: {
            count: contracts.length,
            signed: contracts.filter(c => c.client_signed_at).length,
            pending: contracts.filter(c => !c.client_signed_at).length,
          },
          team: {
            size: members.length + 1, // +1 for owner
            hasForeman: members.some(m => m.role === "foreman"),
            memberIds: members.map(m => m.user_id),
          },
          siteMap: {
            address: project.address || null,
            isValid: !!project.address,
          },
          timeline: {
            startDate: summary?.project_start_date || null,
            endDate: summary?.project_end_date || null,
            durationDays: null,
          },
          clientInfo: {
            name: summary?.client_name || "",
            email: summary?.client_email || "",
            phone: summary?.client_phone || "",
            address: summary?.client_address || "",
            isComplete: !!(summary?.client_name && summary?.client_email),
          },
          weather: {
            available: !!project.address,
          },
        },
        page1: {
          ...initialPage1,
          projectName: project.name,
          description: project.description || "",
          address: project.address || "",
          workType: project.trade || null,
          workTypeCategory: project.trade ? detectWorkTypeCategory(project.trade) : null,
        },
        page2: {
          ...initialPage2,
          materials: (photoEstimate.materials || []).map((m: any, i: number) => ({
            id: `mat-${i}-${Date.now()}`,
            item: m.item || m.name,
            quantity: m.quantity,
            unit: m.unit,
            unitPrice: m.unitPrice || m.unit_price || 0,
            totalPrice: m.totalPrice || m.total_price || (m.quantity * (m.unitPrice || m.unit_price || 0)),
            source: m.source || "ai" as const,
            citationSource: (m.citationSource || m.citation_source || "ai_photo") as CitationSource,
            citationId: m.citationId || m.citation_id || `[P-${String(i + 1).padStart(3, "0")}]`,
            isEssential: m.isEssential ?? m.is_essential ?? false,
            wastePercentage: m.wastePercentage || m.waste_percentage || 0,
          })),
          estimatedLaborCost: photoEstimate.laborCost || photoEstimate.labor_cost || 0,
        },
        page3: {
          ...initialPage3,
          materialCost: summary?.material_cost || 0,
          laborCost: summary?.labor_cost || 0,
          totalCost: summary?.total_cost || 0,
        },
      };

      dispatch({ type: "LOAD_FROM_DATABASE", payload: newState });
    } catch (error) {
      console.error("Failed to initialize project:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const initializeFromSummary = useCallback(async (summaryId: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      const { data: summary, error } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("id", summaryId)
        .single();

      if (error) throw error;

      if (summary.project_id) {
        await initializeProject(summary.project_id);
      } else {
        // Summary without project (Quick Mode)
        const photoEstimate = summary.photo_estimate as any || {};
        
        dispatch({
          type: "LOAD_FROM_DATABASE",
          payload: {
            summaryId,
            projectId: null,
            operationalTruth: {
              ...initialOperationalTruth,
              confirmedArea: {
                value: photoEstimate.area || null,
                unit: photoEstimate.areaUnit || "sq ft",
                source: photoEstimate.area ? "ai-photo" : "none",
                confidence: photoEstimate.confidence || "low",
              },
              materials: {
                count: photoEstimate.materials?.length || 0,
                items: (photoEstimate.materials || []).map((m: any, i: number) => ({
                  id: `mat-${i}-${Date.now()}`,
                  item: m.item || m.name,
                  quantity: m.quantity,
                  unit: m.unit,
                  unitPrice: m.unitPrice || m.unit_price || 0,
                  totalPrice: m.totalPrice || m.total_price || (m.quantity * (m.unitPrice || m.unit_price || 0)),
                  source: m.source || "ai" as const,
                  citationSource: (m.citationSource || m.citation_source || "ai_photo") as CitationSource,
                  citationId: m.citationId || m.citation_id || `[P-${String(i + 1).padStart(3, "0")}]`,
                  isEssential: m.isEssential ?? m.is_essential ?? false,
                  wastePercentage: m.wastePercentage || m.waste_percentage || 0,
                })),
                source: "ai",
              },
              projectMode: summary.mode as "solo" | "team" || "solo",
            },
            workflowData: {
              ...initialWorkflowData,
              clientInfo: {
                name: summary.client_name || "",
                email: summary.client_email || "",
                phone: summary.client_phone || "",
                address: summary.client_address || "",
                isComplete: !!(summary.client_name && summary.client_email),
              },
            },
          },
        });
      }
    } catch (error) {
      console.error("Failed to initialize from summary:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [initializeProject]);

  const createNewProject = useCallback(() => {
    dispatch({ type: "RESET_PROJECT" });
  }, []);

  const resetProject = useCallback(() => {
    dispatch({ type: "RESET_PROJECT" });
  }, []);

  const setCurrentPage = useCallback((page: ProjectContextState["currentPage"]) => {
    dispatch({ type: "SET_CURRENT_PAGE", payload: page });
  }, []);

  const setPage1Data = useCallback((data: Partial<Page1State>) => {
    dispatch({ type: "SET_PAGE1", payload: data });
    dispatch({ type: "MARK_DIRTY", payload: "page1" });
  }, []);

  const setWorkType = useCallback((workType: string, category: string) => {
    const workTypeCategory = category || detectWorkTypeCategory(workType);
    
    dispatch({
      type: "SET_PAGE1",
      payload: {
        workType,
        workTypeCategory,
      },
    });
    dispatch({ type: "MARK_DIRTY", payload: "workType" });
    
    // Smart mapping: Auto-load materials based on work type
    const workTypeId = workType.toLowerCase() as WorkTypeId;
    const confirmedArea = state.operationalTruth.confirmedArea.value || undefined;
    const materials = mapWorkTypeToMaterials(workTypeId, confirmedArea);
    
    if (materials.length > 0) {
      // Get labor estimate from template
      const template = getTemplateByWorkType(workTypeId);
      const estimate = template ? calculateTemplateEstimate(template) : { laborCost: 0 };
      
      dispatch({
        type: "SET_PAGE2",
        payload: {
          materials,
          estimatedLaborCost: estimate.laborCost,
          lastModifiedSource: materials[0].citationSource,
        },
      });
      
      // Update operational truth materials count
      dispatch({
        type: "UPDATE_PILLAR",
        payload: {
          pillar: "materials",
          value: {
            count: materials.length,
            items: materials,
            source: "template",
          },
        },
      });
    }
  }, [state.operationalTruth.confirmedArea.value]);

  const getRecommendedTemplates = useCallback((): BudgetTemplate[] => {
    const category = state.page1.workTypeCategory || "general";
    const templateIds = WORK_TYPE_CATEGORIES[category] || WORK_TYPE_CATEGORIES["general"];
    
    // Map to BudgetTemplate format using real Toronto work types
    return TORONTO_WORK_TYPES.filter(wt => wt.id !== "other").map(wt => {
      const template = getTemplateByWorkType(wt.id);
      const materials = template 
        ? mapWorkTypeToMaterials(wt.id, state.operationalTruth.confirmedArea.value || undefined)
        : [];
      
      return {
        id: wt.id,
        name: wt.name,
        description: wt.description,
        category: wt.id,
        icon: wt.icon,
        materials,
        estimatedArea: state.operationalTruth.confirmedArea.value || undefined,
        areaUnit: state.operationalTruth.confirmedArea.unit,
      };
    });
  }, [state.page1.workTypeCategory, state.operationalTruth.confirmedArea]);

  const setPage2Data = useCallback((data: Partial<Page2State>) => {
    dispatch({ type: "SET_PAGE2", payload: data });
    dispatch({ type: "MARK_DIRTY", payload: "page2" });
  }, []);

  const applyBudgetTemplate = useCallback((template: BudgetTemplate) => {
    dispatch({
      type: "SET_PAGE2",
      payload: {
        selectedTemplateId: template.id,
        materials: template.materials,
      },
    });
    dispatch({ type: "MARK_DIRTY", payload: "template" });
  }, []);

  const updateMaterial = useCallback((materialId: string, updates: Partial<MaterialItem>) => {
    const newMaterials = state.page2.materials.map(m =>
      m.id === materialId ? { ...m, ...updates, source: "manual" as const } : m
    );
    dispatch({ type: "SET_PAGE2", payload: { materials: newMaterials } });
    dispatch({ type: "MARK_DIRTY", payload: "materials" });
  }, [state.page2.materials]);

  const setManualAreaOverride = useCallback((area: number) => {
    dispatch({ type: "SET_PAGE2", payload: { manualAreaOverride: area } });
    dispatch({
      type: "UPDATE_PILLAR",
      payload: {
        pillar: "confirmedArea",
        value: { value: area, source: "manual", confidence: "high" },
      },
    });
    dispatch({ type: "MARK_DIRTY", payload: "area" });
  }, []);

  const setPage3Data = useCallback((data: Partial<Page3State>) => {
    dispatch({ type: "SET_PAGE3", payload: data });
    dispatch({ type: "MARK_DIRTY", payload: "page3" });
  }, []);

  const addLineItem = useCallback((item: LineItem) => {
    dispatch({
      type: "SET_PAGE3",
      payload: { lineItems: [...state.page3.lineItems, item] },
    });
    dispatch({ type: "MARK_DIRTY", payload: "lineItems" });
  }, [state.page3.lineItems]);

  const updateLineItem = useCallback((itemId: string, updates: Partial<LineItem>) => {
    const newItems = state.page3.lineItems.map(i =>
      i.id === itemId ? { ...i, ...updates } : i
    );
    dispatch({ type: "SET_PAGE3", payload: { lineItems: newItems } });
    dispatch({ type: "MARK_DIRTY", payload: "lineItems" });
  }, [state.page3.lineItems]);

  const removeLineItem = useCallback((itemId: string) => {
    const newItems = state.page3.lineItems.filter(i => i.id !== itemId);
    dispatch({ type: "SET_PAGE3", payload: { lineItems: newItems } });
    dispatch({ type: "MARK_DIRTY", payload: "lineItems" });
  }, [state.page3.lineItems]);

  const calculateTotals = useCallback(() => {
    const { lineItems, taxRate } = state.page3;
    const materialCost = lineItems.filter(i => i.category === "material").reduce((sum, i) => sum + i.totalPrice, 0);
    const laborCost = lineItems.filter(i => i.category === "labor").reduce((sum, i) => sum + i.totalPrice, 0);
    const otherCost = lineItems.filter(i => i.category === "other").reduce((sum, i) => sum + i.totalPrice, 0);
    const subtotal = materialCost + laborCost + otherCost;
    const taxAmount = subtotal * taxRate;
    const totalCost = subtotal + taxAmount;

    dispatch({
      type: "SET_PAGE3",
      payload: { materialCost, laborCost, otherCost, subtotal, taxAmount, totalCost },
    });
  }, [state.page3.lineItems, state.page3.taxRate]);

  const setPage4Data = useCallback((data: Partial<Page4State>) => {
    dispatch({ type: "SET_PAGE4", payload: data });
    dispatch({ type: "MARK_DIRTY", payload: "page4" });
  }, []);

  const updatePillar = useCallback(<K extends keyof OperationalTruthState>(
    pillar: K,
    value: Partial<OperationalTruthState[K]>
  ) => {
    dispatch({ type: "UPDATE_PILLAR", payload: { pillar, value } });
    dispatch({ type: "MARK_DIRTY", payload: `pillar.${pillar}` });
  }, []);

  const updateWorkflow = useCallback(<K extends keyof WorkflowDataState>(
    workflow: K,
    value: Partial<WorkflowDataState[K]>
  ) => {
    dispatch({ type: "UPDATE_WORKFLOW", payload: { workflow, value } });
    dispatch({ type: "MARK_DIRTY", payload: `workflow.${workflow}` });
  }, []);

  const acknowledgeOBC = useCallback(() => {
    dispatch({
      type: "UPDATE_PILLAR",
      payload: { pillar: "obcCompliance", value: { acknowledged: true, status: "clear" } },
    });
    dispatch({ type: "MARK_DIRTY", payload: "obcAcknowledged" });
  }, []);

  const ignoreConflict = useCallback(() => {
    dispatch({
      type: "UPDATE_PILLAR",
      payload: { pillar: "conflict", value: { ignored: true, status: "aligned" } },
    });
    dispatch({ type: "MARK_DIRTY", payload: "conflictIgnored" });
  }, []);

  const verifyBlueprint = useCallback(() => {
    dispatch({
      type: "UPDATE_PILLAR",
      payload: { pillar: "blueprint", value: { status: "analyzed" } },
    });
    dispatch({ type: "MARK_DIRTY", payload: "blueprintVerified" });
  }, []);

  const setManualArea = useCallback((area: number, unit: string) => {
    dispatch({
      type: "UPDATE_PILLAR",
      payload: {
        pillar: "confirmedArea",
        value: { value: area, unit, source: "manual", confidence: "high" },
      },
    });
    dispatch({ type: "MARK_DIRTY", payload: "manualArea" });
  }, []);

  const updateClientInfo = useCallback((info: Partial<ClientInfoState>) => {
    const newInfo = { ...state.workflowData.clientInfo, ...info };
    newInfo.isComplete = !!(newInfo.name && newInfo.email);
    dispatch({ type: "UPDATE_WORKFLOW", payload: { workflow: "clientInfo", value: newInfo } });
    dispatch({ type: "MARK_DIRTY", payload: "clientInfo" });
  }, [state.workflowData.clientInfo]);

  const syncToDatabase = useCallback(async (): Promise<boolean> => {
    if (!state.summaryId || !state.sync.isDirty) return true;

    dispatch({ type: "SET_SYNC", payload: { isSyncing: true, syncError: null } });

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Only sync changed fields
      if (state.sync.pendingChanges.some(c => c.includes("area") || c.includes("materials"))) {
        updateData.photo_estimate = {
          area: state.operationalTruth.confirmedArea.value,
          areaUnit: state.operationalTruth.confirmedArea.unit,
          materials: state.operationalTruth.materials.items,
          confidence: state.operationalTruth.confidenceLevel,
        };
      }

      if (state.sync.pendingChanges.some(c => c.includes("client"))) {
        updateData.client_name = state.workflowData.clientInfo.name;
        updateData.client_email = state.workflowData.clientInfo.email;
        updateData.client_phone = state.workflowData.clientInfo.phone;
        updateData.client_address = state.workflowData.clientInfo.address;
      }

      if (state.sync.pendingChanges.some(c => c.includes("obc") || c.includes("conflict") || c.includes("blueprint"))) {
        const currentFacts = (await supabase
          .from("project_summaries")
          .select("verified_facts")
          .eq("id", state.summaryId)
          .single()).data?.verified_facts as any || {};

        updateData.verified_facts = {
          ...currentFacts,
          obcAcknowledged: state.operationalTruth.obcCompliance.acknowledged,
          conflictIgnored: state.operationalTruth.conflict.ignored,
          blueprintVerified: state.operationalTruth.blueprint.status === "analyzed",
        };
      }

      if (state.sync.pendingChanges.some(c => c.includes("lineItems") || c.includes("page3"))) {
        updateData.line_items = state.page3.lineItems;
        updateData.material_cost = state.page3.materialCost;
        updateData.labor_cost = state.page3.laborCost;
        updateData.total_cost = state.page3.totalCost;
      }

      const { error } = await supabase
        .from("project_summaries")
        .update(updateData)
        .eq("id", state.summaryId);

      if (error) throw error;

      dispatch({
        type: "SET_SYNC",
        payload: {
          isDirty: false,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString(),
          pendingChanges: [],
        },
      });

      return true;
    } catch (error: any) {
      console.error("Sync failed:", error);
      dispatch({
        type: "SET_SYNC",
        payload: { isSyncing: false, syncError: error.message },
      });
      return false;
    }
  }, [state.summaryId, state.sync, state.operationalTruth, state.workflowData, state.page3]);

  const loadFromDatabase = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      await initializeProject(projectId);
      return true;
    } catch {
      return false;
    }
  }, [initializeProject]);

  const markDirty = useCallback((field: string) => {
    dispatch({ type: "MARK_DIRTY", payload: field });
  }, []);

  const recalculateHealth = useCallback(() => {
    const metrics = calculateHealthMetrics(state);
    dispatch({ type: "SET_HEALTH_METRICS", payload: metrics });
  }, [state]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const actions: ProjectContextActions = useMemo(() => ({
    initializeProject,
    initializeFromSummary,
    createNewProject,
    resetProject,
    setCurrentPage,
    setPage1Data,
    setWorkType,
    getRecommendedTemplates,
    setPage2Data,
    applyBudgetTemplate,
    updateMaterial,
    setManualAreaOverride,
    setPage3Data,
    addLineItem,
    updateLineItem,
    removeLineItem,
    calculateTotals,
    setPage4Data,
    updatePillar,
    updateWorkflow,
    acknowledgeOBC,
    ignoreConflict,
    verifyBlueprint,
    setManualArea,
    updateClientInfo,
    syncToDatabase,
    loadFromDatabase,
    markDirty,
    recalculateHealth,
  }), [
    initializeProject,
    initializeFromSummary,
    createNewProject,
    resetProject,
    setCurrentPage,
    setPage1Data,
    setWorkType,
    getRecommendedTemplates,
    setPage2Data,
    applyBudgetTemplate,
    updateMaterial,
    setManualAreaOverride,
    setPage3Data,
    addLineItem,
    updateLineItem,
    removeLineItem,
    calculateTotals,
    setPage4Data,
    updatePillar,
    updateWorkflow,
    acknowledgeOBC,
    ignoreConflict,
    verifyBlueprint,
    setManualArea,
    updateClientInfo,
    syncToDatabase,
    loadFromDatabase,
    markDirty,
    recalculateHealth,
  ]);

  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}

// Convenience hooks for specific parts of the context
export function useOperationalTruth() {
  const { state } = useProjectContext();
  return state.operationalTruth;
}

export function useWorkflowData() {
  const { state } = useProjectContext();
  return state.workflowData;
}

export function useHealthMetrics() {
  const { state } = useProjectContext();
  return state.healthMetrics;
}

export function usePage1State() {
  const { state, actions } = useProjectContext();
  return { data: state.page1, setData: actions.setPage1Data, setWorkType: actions.setWorkType };
}

export function usePage2State() {
  const { state, actions } = useProjectContext();
  return {
    data: state.page2,
    setData: actions.setPage2Data,
    getRecommendedTemplates: actions.getRecommendedTemplates,
    applyTemplate: actions.applyBudgetTemplate,
  };
}
