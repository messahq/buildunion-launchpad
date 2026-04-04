// ============================================
// STAGE 8: FINAL REVIEW & ANALYSIS DASHBOARD
// ============================================
// 8-Panel Summary before AI analysis
// - Each panel represents a key project domain
// - Tier-based visibility (Owner/Foreman/Worker/Public)
// - Inline editing for authorized users
// - Full-screen panel view option
// - AI Analysis, PDF, Summary actions at bottom
// - Panel 5: Granular Tasklist with checklists
// - Panel 6: Document Engine with upload/drag-drop
// - Cross-panel sync for verification photos
// ============================================

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useSiteCheckin } from "@/hooks/useSiteCheckin";
import { motion, AnimatePresence } from "framer-motion";
import torontoCyberpunkSkyline from "@/assets/toronto-cyberpunk-skyline.png";
import engineGeminiImg from "@/assets/engine-gemini.png";
import engineGptImg from "@/assets/engine-gpt.png";
import engineClaudeImg from "@/assets/engine-claude.png";
import engineLovableImg from "@/assets/engine-lovable.png";
import engineGrokImg from "@/assets/engine-grok.png";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { downloadInvoicePDF, InvoiceData } from "@/lib/invoiceGenerator";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X,
  Loader2,
  FileText,
  Sparkles,
  Download,
  MapPin,
  Users,
  Calendar,
  Shield,
  Eye,
  Lock,
  AlertTriangle,
  Settings,
  FileCheck,
  FolderOpen,
  Maximize2,
  Upload,
  Image,
  FileImage,
  Camera,
  Check,
  Circle,
  Plus,
  ChevronUp,
  User,
  FileUp,
  Unlock,
  MessageSquare,
  Mail,
  Send,
  Trash2,
  Brain,
  Crown,
  Zap,
  ShieldCheck,
  MessageCircle,
  Info,
  Receipt,
  Clock,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { RequestModificationDialog } from "@/components/projects/RequestModificationDialog";
import { Citation, CITATION_TYPES, createCitation } from "@/types/citation";
import { useTranslation } from "react-i18next";
import {
  restoreProjectFromLocalStorage,
  syncCitationsToLocalStorage,
  logCriticalError,
} from "@/lib/projectPersistence";
import { WeatherWidget } from "@/components/WeatherWidget";
import { WeatherMapModal } from "@/components/WeatherMapModal";
import {
  downloadContractPDF, 
  buildContractHTML,
  type ContractTemplateData 
} from "@/lib/pdfGenerator";
import { usePendingBudgetChanges } from "@/hooks/usePendingBudgetChanges";
import { PendingApprovalModal } from "@/components/projects/PendingApprovalModal";
import { PendingChangeBadge } from "@/components/projects/PendingChangeBadge";
import { Stage8CommandBar } from "@/components/project-wizard/Stage8CommandBar";
import { ConflictMapModal } from "@/components/project-wizard/ConflictMapModal";
import { TeamChatPanel } from "@/components/project-wizard/TeamChatPanel";
import { MaterialTracker } from "@/components/materials/MaterialTracker";
import { MaterialsLaborPreview } from "@/components/project-wizard/MaterialsLaborPreview";
import { ProjectMessaChat } from "@/components/project-wizard/ProjectMessaChat";
import { OwnerLockModal } from "@/components/OwnerLockModal";
import { PanelHelpButton } from "@/components/project-wizard/PanelHelpButton";
import { HardHatSpinner } from "@/components/ui/loading-states";
import BlueprintOverlay from "@/components/project-wizard/BlueprintOverlay";
import { useMessaInsights } from "@/hooks/useMessaInsights";
import { AIEngineReportModal, type AIEngineType } from "@/components/project-wizard/AIEngineReportModal";

// ✓ REFACTORED: Types, constants, and helpers extracted to stage8/ subfolder
import type {
  VisibilityTier,
  TierConfig,
  DocumentCategory,
  PanelConfig,
  TaskWithChecklist,
  DocumentWithCategory,
  Stage8FinalReviewProps,
} from "./stage8/types";
import {
  VISIBILITY_TIERS,
  DOCUMENT_CATEGORIES,
  PANELS,
  TASK_PHASES,
} from "./stage8/constants";
import { SignedImage, SignedIframe } from "./stage8/SignedMedia";
import { GrokInsightsPanel } from "./stage8/GrokInsightsPanel";
import { DnaAuditPanel } from "./stage8/DnaAuditPanel";
import { Panel5Timeline } from "./stage8/Panel5Timeline";
import { Panel6Documents } from "./stage8/Panel6Documents";
import { Panel7Weather } from "./stage8/Panel7Weather";
import { Panel8Financial } from "./stage8/Panel8Financial";
import { Panel1Basics } from "./stage8/Panel1Basics";
import { Panel2GFA } from "./stage8/Panel2GFA";
import { Panel3Trade } from "./stage8/Panel3Trade";
import { Panel4Team } from "./stage8/Panel4Team";
import { ContractPreviewDialog } from "./stage8/ContractPreviewDialog";
import { InvoicePreviewDialog } from "./stage8/InvoicePreviewDialog";
import { SummaryPreviewDialog } from "./stage8/SummaryPreviewDialog";
import { MessaSynthesisDialog } from "./stage8/MessaSynthesisDialog";
import { buildMessaSynthesisHTML as buildMessaSynthesisHTMLFn, buildSummaryHTML, buildDnaReportHTML, buildSiteIntelHTML } from "./stage8/htmlBuilders";
import type { DnaPillar } from "./stage8/htmlBuilders";
import { AIEnginePipelineStrip } from "./stage8/AIEnginePipelineStrip";
import { AIExecutionFlow } from "./stage8/AIExecutionFlow";
import { AITerritoryGrid } from "./stage8/AITerritoryGrid";
import { useStage8Reports } from "./stage8/useStage8Reports";
import { useStage8DataLoader } from "./stage8/useStage8DataLoader";
import { useStage8Handlers } from "./stage8/useStage8Handlers";
import { useStage8Realtime } from "./stage8/useStage8Realtime";
import { DocumentPreviewDialog } from "./stage8/DocumentPreviewDialog";
import { TaskCompletionDialog } from "./stage8/TaskCompletionDialog";
import { ContractEmailDialog } from "./stage8/ContractEmailDialog";
import { ContractDeleteDialog } from "./stage8/ContractDeleteDialog";
import { DnaReportPreviewDialog } from "./stage8/DnaReportPreviewDialog";
import { SiteIntelPreviewDialog } from "./stage8/SiteIntelPreviewDialog";
import { MobileTerritoryLayout } from "./stage8/MobileTerritoryLayout";
import { SlideOverDrawer } from "./stage8/SlideOverDrawer";
import { Panel6Fullscreen } from "./stage8/Panel6Fullscreen";
import { Stage8TopBar } from "./stage8/Stage8TopBar";

// ============================================
// MAIN COMPONENT
// ============================================
export default function Stage8FinalReview({
  projectId,
  userId,
  userRole = 'owner',
  onComplete,
  className,
}: Stage8FinalReviewProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // ✓ REFACTORED: Data loading extracted to useStage8DataLoader hook
  const {
    isLoading,
    projectData,
    citations, setCitations,
    teamMembers, setTeamMembers,
    tasks, setTasks,
    documents, setDocuments,
    contracts, setContracts,
    financialSummary, setFinancialSummary,
    userProfile, ownerProfile,
    dataSource,
    isFinancialLocked, setIsFinancialLocked,
    categorizeDocument,
    weatherData, setWeatherData,
  } = useStage8DataLoader({ projectId, userId, userRole });
  const [contractStep, setContractStep] = useState<'select_member' | 'preview'>('select_member');
  const [selectedContractMember, setSelectedContractMember] = useState<{id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string} | null>(null);
  
  // UI state
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set([
    'citations-panel-1-basics',
    'citations-panel-2-gfa',
    'citations-panel-3-trade',
    'citations-panel-4-team',
    'citations-panel-5-timeline',
    'citations-panel-6-documents',
    'citations-panel-7-weather',
    'citations-panel-8-financial',
    'citations-all-source',
    'citations-fullscreen',
    'citations-additional',
    'all-source-citations',
    'extra-citations',
  ]));
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  const [activeOrbitalPanel, setActiveOrbitalPanel] = useState<string>('panel-1-basics');
  const [slideOverPanel, setSlideOverPanel] = useState<string | null>(null);
  const [grokInsightsLoading, setGrokInsightsLoading] = useState(false);
  const [affiliateProducts, setAffiliateProducts] = useState<any[]>([]);
  const [affiliateProductsLoaded, setAffiliateProductsLoaded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [modificationDialog, setModificationDialog] = useState<{ open: boolean; material?: any } | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['demolition', 'preparation', 'installation', 'finishing']));
  const [verifiedDataExpanded, setVerifiedDataExpanded] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<DocumentCategory>('technical');
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isSendingContract, setIsSendingContract] = useState(false);
  
  // Task completion confirmation dialog state
  const [taskCompletionDialog, setTaskCompletionDialog] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
    showUploader: boolean;
  } | null>(null);
  
  const [ownerLockOpen, setOwnerLockOpen] = useState(false);
  const [ownerLockAction, setOwnerLockAction] = useState<'finish' | 'material_edit' | 'material_table_edit' | null>(null);
  const [editingMaterialIdx, setEditingMaterialIdx] = useState<number | null>(null);
  const [editMaterialQty, setEditMaterialQty] = useState<string>('');
  const [pendingMaterialEdit, setPendingMaterialEdit] = useState<{idx: number; qty: string} | null>(null);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [weatherModalTab, setWeatherModalTab] = useState<string>("sitelog");
  const openWeatherMapModal = useCallback((tab: string = "sitelog") => {
    setFullscreenPanel(null);
    setSlideOverPanel(null);
    setWeatherModalTab(tab);
    setWeatherModalOpen(true);
  }, []);
  const [selectedContractType, setSelectedContractType] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [contractClientPhone, setContractClientPhone] = useState('');
  const [contractClientAddress, setContractClientAddress] = useState('');
  const [contractScopeOfWork, setContractScopeOfWork] = useState('');
  const [contractPaymentTerms, setContractPaymentTerms] = useState('');
  const [contractAdditionalTerms, setContractAdditionalTerms] = useState('');
  const [contractDeposit, setContractDeposit] = useState('50');
  const [contractorSignatureData, setContractorSignatureData] = useState<string | null>(null);
  
  // ✓ Document preview modal state
  const [previewDocument, setPreviewDocument] = useState<{
    file_name: string;
    file_path: string;
    category: string;
    citationId?: string;
    uploaded_by_name?: string;
    uploaded_by_role?: string;
    uploadedAt?: string;
  } | null>(null);
  const [isSendingDocument, setIsSendingDocument] = useState(false);
  const [fullscreenImagePath, setFullscreenImagePath] = useState<string | null>(null);
  
  // ✓ Multi-recipient contract email dialog state
  const [showContractEmailDialog, setShowContractEmailDialog] = useState(false);
  const [selectedContractForEmail, setSelectedContractForEmail] = useState<{
    id: string;
    contract_number: string;
    share_token?: string;
    total_amount?: number | null;
    status?: string;
  } | null>(null);
  const [contractRecipients, setContractRecipients] = useState<{email: string; name: string}[]>([
    { email: '', name: '' }
  ]);
  const [isSendingToMultiple, setIsSendingToMultiple] = useState(false);
  
  // ✓ Contract delete confirmation state
  const [contractToDelete, setContractToDelete] = useState<{id: string; contract_number: string; status: string} | null>(null);
  const [isDeletingContract, setIsDeletingContract] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isRunningAIAnalysis, setIsRunningAIAnalysis] = useState(false);
  
  // ✓ Invoice Preview Modal State (extracted to InvoicePreviewDialog)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState<InvoiceData | null>(null);
  const [invoicePreviewHtml, setInvoicePreviewHtml] = useState<string>('');
  
  // ✓ Project Summary Preview Modal State (extracted to SummaryPreviewDialog)
  const [showSummaryPreview, setShowSummaryPreview] = useState(false);
  const [summaryPreviewHtml, setSummaryPreviewHtml] = useState<string>('');
  
  // ✓ M.E.S.S.A. Synthesis Preview Modal State (extracted to MessaSynthesisDialog)
  const [showMessaPreview, setShowMessaPreview] = useState(false);
  const [messaSynthesisData, setMessaSynthesisData] = useState<{
    synthesisId: string;
    synthesisVersion: string;
    dualEngineUsed: boolean;
    generatedAt: string;
    engines: {
      gemini: { model: string; analysis: any };
      openai: { model: string; analysis: any } | null;
    };
    projectSnapshot: any;
    region: string;
  } | null>(null);
  const [messaPreviewHtml, setMessaPreviewHtml] = useState<string>('');
  
  // ✓ Pending Budget Changes - Foreman Modification Loop
  const [showPendingApprovalModal, setShowPendingApprovalModal] = useState(false);
  const pendingApprovalShownRef = useRef(false);
  
  // ✓ Conflict Map Modal
  const [showConflictMap, setShowConflictMap] = useState(false);
   
   // ✓ DNA Report PDF + Preview
   const [isGeneratingDnaReport, setIsGeneratingDnaReport] = useState(false);
   const [showDnaPreviewDialog, setShowDnaPreviewDialog] = useState(false);
   const [dnaReportBlobUrl, setDnaReportBlobUrl] = useState<string | null>(null);
   const [dnaReportFilename, setDnaReportFilename] = useState('');
   const [dnaReportHtml, setDnaReportHtml] = useState<string>('');
   
   // ✓ Knight Rider Radar Scanner for DNA generation
    const [dnaScanningPillar, setDnaScanningPillar] = useState<number | null>(null);
    const [dnaScannedPillars, setDnaScannedPillars] = useState<Set<number>>(new Set());
    const [expandedRiskPillars, setExpandedRiskPillars] = useState<Set<string>>(new Set());
   
   // ✓ DNA Report Email
   const [showDnaEmailDialog, setShowDnaEmailDialog] = useState(false);
   const [dnaEmailClientName, setDnaEmailClientName] = useState('');
   const [dnaEmailClientEmail, setDnaEmailClientEmail] = useState('');
    const [isSendingDnaEmail, setIsSendingDnaEmail] = useState(false);
   
   // ✓ MESSA Site Intelligence Report
   const [isGeneratingSiteIntel, setIsGeneratingSiteIntel] = useState(false);
   const [showSiteIntelPreviewDialog, setShowSiteIntelPreviewDialog] = useState(false);
   const [siteIntelBlobUrl, setSiteIntelBlobUrl] = useState<string | null>(null);
   const [siteIntelFilename, setSiteIntelFilename] = useState('');
   const [siteIntelHtml, setSiteIntelHtml] = useState<string>('');
  
  // ✓ OBC RAG Compliance Check
  const [obcComplianceResults, setObcComplianceResults] = useState<{
    sections: Array<{
      section_number: string;
      section_title: string;
      content: string;
      relevance_score: number;
      source: string;
    }>;
    loading: boolean;
    error: string | null;
    lastCheckedAt: string | null;
  }>({ sections: [], loading: false, error: null, lastCheckedAt: null });
  
   // ✓ REFACTORED: Unread chat count moved to useStage8Realtime hook
   
    // ✓ Project MESSA Chat
    const [showProjectMessa, setShowProjectMessa] = useState(false);
    const messaInsights = useMessaInsights(projectId, userId, userRole === 'owner');
    
     // ✓ REFACTORED: Site Check-In/Out extracted to useSiteCheckin hook
     const {
       isCheckedIn,
       isCheckingIn,
       activeTeamCheckins,
       handleSiteCheckin,
     } = useSiteCheckin({ projectId, userId, citations, setCitations });
   // ✓ OBC Summary inline expand (Claude territory)
     const [obcSummaryExpanded, setObcSummaryExpanded] = useState(false);

   // ✓ AI Engine Report Modal State
     const [aiEngineModalOpen, setAiEngineModalOpen] = useState(false);
    const [activeAiEngine, setActiveAiEngine] = useState<AIEngineType | null>(null);
    const [openEnginePopover, setOpenEnginePopover] = useState<string | null>(null);
    const [activePipelineStep, setActivePipelineStep] = useState(0);

    // Cycling pipeline animation — rotates active engine every 3s
    useEffect(() => {
      const interval = setInterval(() => {
        setActivePipelineStep(prev => (prev + 1) % 5);
      }, 3000);
      return () => clearInterval(interval);
    }, []);

    // Live clock for top action bar
    const [liveNow, setLiveNow] = useState(() => new Date());
    useEffect(() => {
      const timer = window.setInterval(() => setLiveNow(new Date()), 1000);
      return () => window.clearInterval(timer);
    }, []);

    const projectEndDate = useMemo(() => {
      const endCit = citations.find((c: Citation) => c.cite_type === 'END_DATE');
      const rawDate =
        (typeof endCit?.answer === 'string' && endCit.answer) ||
        (typeof endCit?.value === 'string' && endCit.value) ||
        (typeof endCit?.metadata?.end_date === 'string' && endCit.metadata.end_date) ||
        null;

      if (!rawDate) return null;
      const parsed = new Date(rawDate);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }, [citations]);

    const topBarCountdown = useMemo(() => {
      if (!projectEndDate) return null;

      const diffMs = Math.max(0, projectEndDate.getTime() - liveNow.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    }, [projectEndDate, liveNow]);


    // ✓ REFACTORED: Delivery logs + realtime subscriptions moved to useStage8Realtime hook
    const {
      deliveryLogs,
      unreadChatCount,
      resetUnreadChat,
    } = useStage8Realtime({
      projectId,
      userId,
      activeOrbitalPanel,
      teamMembers,
      setTasks,
      setCitations,
      setFinancialSummary,
    });
   


  // ✓ OBC RAG Compliance: Auto-fetch when DNA panel is active
  const runObcComplianceCheck = useCallback(async () => {
    if (obcComplianceResults.loading) return;
    
    const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
    const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
    const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
    const locationCit = citations.find(c => c.cite_type === 'LOCATION');
    
    if (!tradeCit && !workTypeCit) {
      setObcComplianceResults(prev => ({ ...prev, error: 'Trade or Work Type citation required', sections: [] }));
      return;
    }
    
    setObcComplianceResults(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Build context from verified_facts
      const contextParts: string[] = [];
      if (gfaCit) contextParts.push(`GFA: ${gfaCit.answer}`);
      if (workTypeCit) contextParts.push(`Work Type: ${workTypeCit.answer}`);
      if (locationCit) contextParts.push(`Location: ${locationCit.answer}`);
      
      const tradeValue = tradeCit?.answer?.toLowerCase()?.replace(/\s+/g, '_') || '';
      
      const { data, error } = await supabase.functions.invoke('obc-rag-query', {
        body: {
          trade_type: tradeValue,
          query: `${workTypeCit?.answer || ''} residential building code requirements`,
          project_context: contextParts.join(', '),
          top_k: 8,
        },
      });
      
      if (error) throw error;
      
      setObcComplianceResults({
        sections: data?.sections || [],
        loading: false,
        error: null,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[OBC RAG] Compliance check failed:', err);
      setObcComplianceResults(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to check OBC compliance',
      }));
    }
  }, [citations, obcComplianceResults.loading]);
  
  // ═══ Fetch affiliate products from DB ═══
  useEffect(() => {
    if (affiliateProductsLoaded) return;
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        setAffiliateProducts(data);
      }
      setAffiliateProductsLoaded(true);
    };
    fetchProducts();
  }, [affiliateProductsLoaded]);

  // Auto-trigger OBC check when DNA panel is activated
  useEffect(() => {
    if (activeOrbitalPanel === 'messa-deep-audit' && !obcComplianceResults.lastCheckedAt && !obcComplianceResults.loading) {
      runObcComplianceCheck();
    }
  }, [activeOrbitalPanel, obcComplianceResults.lastCheckedAt, obcComplianceResults.loading, runObcComplianceCheck]);

  const { tier, canGenerateInvoice, canUseAIAnalysis, getUpgradeMessage } = useTierFeatures();
  
  // ✓ Foreman Modification Loop - Pending Budget Changes Hook
  // onApproved: force-refresh local citations & financials after Owner approves a change
  const refreshSummaryAfterApproval = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data: fresh } = await supabase
        .from('project_summaries')
        .select('verified_facts, material_cost, labor_cost, total_cost, line_items, template_items')
        .eq('project_id', projectId)
        .maybeSingle();
      if (!fresh) return;

      // Refresh citations
      if (Array.isArray(fresh.verified_facts)) {
        setCitations(fresh.verified_facts as unknown as Citation[]);
      }

      // Recalculate financials with keyword logic (same as realtime handler)
      const src: any[] = Array.isArray(fresh.line_items) && fresh.line_items.length > 0
        ? fresh.line_items as any[]
        : Array.isArray(fresh.template_items) ? fresh.template_items as any[] : [];
      
      if (src.length > 0) {
        const isLab = (d: string) => {
          const l = d.toLowerCase();
          return l.includes('labor') || l.includes('installation') || l.includes('preparation') ||
            l.includes('cleanup') || l.includes('grinding') || l.includes('floor preparation') ||
            l.includes('prep work') || l.includes('site prep');
        };
        let mat = 0, lab = 0;
        for (const item of src) {
          const t = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) || Number(item.total) || Number(item.totalPrice) || 0;
          const desc = item.description || item.name || '';
          if (isLab(desc)) lab += t; else mat += t;
        }
        setFinancialSummary({ material_cost: mat, labor_cost: lab, total_cost: mat + lab });
      } else {
        setFinancialSummary({
          material_cost: fresh.material_cost ?? 0,
          labor_cost: fresh.labor_cost ?? 0,
          total_cost: fresh.total_cost ?? 0,
        });
      }
      // ── CRITICAL: Re-derive templateItemCost from TEMPLATE_LOCK (ground truth) ──
      const freshTemplateLock = (Array.isArray(fresh.verified_facts) ? fresh.verified_facts : []).find((c: any) => c.cite_type === 'TEMPLATE_LOCK') as any;
      const freshTplItems = freshTemplateLock?.metadata?.items as any[] | undefined;
      
      const { data: freshTasks } = await supabase
        .from('project_tasks')
        .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity')
        .eq('project_id', projectId)
        .is('archived_at', null);
      
      if (freshTasks && freshTasks.length > 0) {
        setTasks(prev => prev.map(existing => {
          const dbTask = freshTasks.find(ft => ft.id === existing.id);
          if (dbTask && existing.isSubTask) {
            // IRON LAW: derive from template_items qty × unitPrice
            const matchedItem = freshTplItems?.find((item: any) => item.name === dbTask.title);
            const derivedCost = matchedItem 
              ? (matchedItem.quantity || 0) * (matchedItem.unitPrice || 0)
              : (dbTask.total_cost ? Number(dbTask.total_cost) : existing.templateItemCost);
            return { ...existing, templateItemCost: derivedCost };
          }
          return existing;
        }));
      }

      console.log('[Stage8] ✓ Owner UI force-refreshed after approval (citations + financials + tasks)');
    } catch (e) {
      console.error('[Stage8] Failed to refresh after approval:', e);
    }
  }, [projectId]);

  const {
    pendingChanges,
    pendingCount,
    hasPending,
    myPendingChanges,
    createPendingChange,
    approveChange,
    rejectChange,
    cancelChange,
    loading: pendingChangesLoading,
  } = usePendingBudgetChanges({ projectId, enabled: true, onApproved: refreshSummaryAfterApproval });
  
  // ✓ AUTO-POPUP: Show approval modal when Owner loads dashboard with pending changes
  // Also triggers on realtime updates (new pending change from Foreman)
  useEffect(() => {
    if (userRole !== 'owner') return;
    if (!hasPending) {
      pendingApprovalShownRef.current = false;
      return;
    }
    // Auto-open on first load or when new pending changes arrive
    if (!pendingApprovalShownRef.current && !showPendingApprovalModal) {
      pendingApprovalShownRef.current = true;
      // Small delay so dashboard renders first
      const timer = setTimeout(() => {
        setShowPendingApprovalModal(true);
        toast.info(`${pendingCount} pending modification${pendingCount > 1 ? 's' : ''} require your approval`, {
          description: 'Review team changes before they take effect',
          action: {
            label: 'Review Now',
            onClick: () => setShowPendingApprovalModal(true),
          },
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [userRole, hasPending, pendingCount]);
  
  // ✓ Team member document sharing state (in-app messages)
  const [selectedTeamRecipients, setSelectedTeamRecipients] = useState<string[]>([]);
  const [documentMessageNote, setDocumentMessageNote] = useState('');
  
   // ✓ UNIVERSAL READ-ONLY DEFAULT: Owner must explicitly enable edit mode
   const [isEditModeEnabled, setIsEditModeEnabled] = useState(false);
   
   // ✓ REFACTORED: Centralized role access hook
   const {
     canEdit,
     canViewFinancials,
     canUploadTaskPhotos,
     canToggleTaskStatus,
     hasAccessToTier,
     isOwner,
     canManageContracts,
     canGenerateReports,
     canFinishProject,
   } = useRoleAccess({ userRole, userId, isEditModeEnabled });
   
   // Check if Financial Summary is unlocked for navigation
   // ✓ Unlocked for Owner when any financial data exists (dynamic, no hardcoded values)
   const isFinancialSummaryUnlocked = useMemo(() => {
     if (!canViewFinancials) return false;
     const hasFinancialData = citations.some(c => 
       ['DEMOLITION_PRICE', 'TEMPLATE_LOCK'].includes(c.cite_type || '')
     ) || contracts.length > 0;
     return hasFinancialData;
   }, [canViewFinancials, citations, contracts]);
  
  // Toggle panel collapse
  const togglePanelCollapse = useCallback((panelId: string) => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  }, []);
  
  // Toggle phase expansion
  const togglePhaseExpansion = useCallback((phaseKey: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseKey)) {
        next.delete(phaseKey);
      } else {
        next.add(phaseKey);
      }
      return next;
    });
  }, []);
  
  // ✓ REFACTORED: categorizeDocument moved to useStage8DataLoader
  
  // ✓ REFACTORED: Data loading, citations, localStorage sync all moved to useStage8DataLoader hook
  
  // ✓ REFACTORED: Task, summary, and chat realtime subscriptions moved to useStage8Realtime hook
  
  // Reset unread count when Team panel becomes active
  // Also scroll canvas to top when switching panels
   const canvasContentRef = useRef<HTMLDivElement>(null);
   const mobileContentRef = useRef<HTMLDivElement>(null);
   const [scrollProgress, setScrollProgress] = useState(0);
   
   // Track scroll progress on both desktop canvas and mobile content
   useEffect(() => {
     const handleScroll = (e: Event) => {
       const el = e.target as HTMLElement;
       if (!el) return;
       const progress = el.scrollHeight - el.clientHeight > 0
         ? (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100
         : 0;
       setScrollProgress(Math.min(100, Math.max(0, progress)));
     };
     const canvas = canvasContentRef.current;
     const mobile = mobileContentRef.current;
     canvas?.addEventListener('scroll', handleScroll, { passive: true });
     mobile?.addEventListener('scroll', handleScroll, { passive: true });
     return () => {
       canvas?.removeEventListener('scroll', handleScroll);
       mobile?.removeEventListener('scroll', handleScroll);
     };
   }, []);

   useEffect(() => {
     if (activeOrbitalPanel === 'panel-4-team') {
       resetUnreadChat();
     }
     // Scroll canvas content to top
     canvasContentRef.current?.scrollTo({ top: 0 });
     mobileContentRef.current?.scrollTo({ top: 0 });
     setScrollProgress(0);
   }, [activeOrbitalPanel]);
  
  // ✓ REFACTORED: fetchWeather moved to useStage8DataLoader hook
  
  // Get citations for a specific panel
  const getCitationsForPanel = useCallback((dataKeys: string[]): Citation[] => {
    return citations.filter(c => dataKeys.includes(c.cite_type));
  }, [citations]);
  
  // ✓ REFACTORED: Document, task, edit, and upload handlers extracted to useStage8Handlers
  const {
    handleDownloadDocument,
    getDocumentPreviewUrl,
    getDocumentSignedUrl,
    handleSendDocument,
    handleSendContractToMultiple: handleSendContractToMultipleFn,
    updateChecklistItem,
    confirmTaskCompletion,
    updateTaskAssignee,
    handleFileUpload,
    startEditing,
    saveEdit,
    cancelEdit,
    handleDragOver: handleDragOverBase,
    handleDragLeave: handleDragLeaveBase,
    handleDrop: handleDropBase,
    IMMUTABLE_CITATION_TYPES,
  } = useStage8Handlers({
    projectId, userId, userRole,
    citations, setCitations,
    tasks, setTasks,
    documents, setDocuments,
    teamMembers,
    canEdit,
    selectedUploadCategory,
    setIsUploading, setIsSaving,
    editingField, setEditingField,
    editValue, setEditValue,
    clientEmail, clientName, projectData,
  });

  // Drag/drop wrappers that also manage isDraggingOver state
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
    handleDragOverBase(e);
  }, [handleDragOverBase]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleDragLeaveBase(e);
  }, [handleDragLeaveBase]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    setIsDraggingOver(false);
    handleDropBase(e);
  }, [handleDropBase]);

  // Gate material edits through owner lock
  const requestSaveWithLock = useCallback(() => {
    if (!editingField) return;
    const editedCitation = citations.find(c => c.id === editingField);
    const isMaterialField = editedCitation && ['TEMPLATE_LOCK', 'GFA_LOCK', 'DEMOLITION_PRICE', 'MATERIAL_OVERRIDE'].includes(editedCitation.cite_type);
    if (isMaterialField && userRole === 'owner') {
      setOwnerLockAction('material_edit');
      setOwnerLockOpen(true);
      return;
    }
    saveEdit();
  }, [editingField, citations, userRole, saveEdit]);

  // Wrapper for sending contract to multiple recipients with local state
  const handleSendContractToMultiple = useCallback(() => {
    handleSendContractToMultipleFn(
      selectedContractForEmail,
      contractRecipients,
      setIsSendingToMultiple,
      setShowContractEmailDialog,
      setSelectedContractForEmail,
      setContractRecipients,
    );
  }, [handleSendContractToMultipleFn, selectedContractForEmail, contractRecipients]);

  // Generate contract preview data - includes bu_profiles data for contractor fields
  const generateContractPreviewData = useMemo(() => {
    const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
    const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
    const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
    const timelineCitation = citations.find(c => c.cite_type === 'TIMELINE');
    const endDateCitation = citations.find(c => c.cite_type === 'END_DATE');
    
    // Generate a unique contract number
    const contractNumber = `BU-${projectId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    
    // Get GFA as number
    const gfaValue = typeof gfaCitation?.value === 'number' 
      ? gfaCitation.value 
      : typeof gfaCitation?.metadata?.gfa_value === 'number'
        ? gfaCitation.metadata.gfa_value
        : 0;
    
    return {
      contractNumber,
      projectName: projectData?.name || 'Untitled Project',
      projectAddress: locationCitation?.answer || projectData?.address || 'Address not set',
      gfa: gfaValue,
      gfaUnit: (gfaCitation?.metadata?.gfa_unit as string) || 'sq ft',
      trade: tradeCitation?.answer || projectData?.trade || 'Not set',
      startDate: timelineCitation?.metadata?.start_date || 'Not set',
      endDate: endDateCitation?.value || 'Not set',
      teamSize: teamMembers.length,
      taskCount: tasks.length,
      // Client = Project Owner (who hires)
      clientOwnerName: ownerProfile?.full_name || ownerProfile?.company_name || '',
      clientOwnerCompany: ownerProfile?.company_name || '',
      clientOwnerPhone: ownerProfile?.phone || '',
      clientOwnerEmail: ownerProfile?.email || '',
      clientOwnerAddress: ownerProfile?.service_area || '',
      // Contractor = Selected team member (who is hired)
      contractorName: userProfile?.company_name || '',
      contractorPhone: userProfile?.phone || '',
      contractorEmail: userProfile?.email || '',
      contractorAddress: userProfile?.service_area || '',
    };
  }, [citations, projectData, teamMembers.length, tasks.length, projectId, userProfile, ownerProfile]);
  
  // ============================================
  // M.E.S.S.A. SYNTHESIS - Grand Dual Engine Analysis
  // ============================================
  // ✓ REFACTORED: Report handlers extracted to useStage8Reports hook
  const {
    handleMessaSynthesis,
    handleAIAnalysis,
    handleDnaReportPdf,
    handleSendDnaReportEmail,
    handleSiteIntelligenceReport,
    handleGenerateInvoice,
    handleGenerateSummary,
    buildMessaSynthesisHTMLMemo,
  } = useStage8Reports({
    projectId, userId, userRole,
    citations, projectData, financialSummary, teamMembers, tasks, documents, contracts,
    obcComplianceResults,
    canGenerateInvoice, getUpgradeMessage,
    setIsGeneratingAI, setIsGeneratingSummary, setIsGeneratingDnaReport, setIsGeneratingSiteIntel, setIsGeneratingInvoice,
    setMessaSynthesisData, setMessaPreviewHtml, setShowMessaPreview,
    setSummaryPreviewHtml, setShowSummaryPreview,
    setDnaReportHtml, setDnaReportBlobUrl, setDnaReportFilename, setShowDnaPreviewDialog,
    setDnaScannedPillars, setDnaScanningPillar, setActiveOrbitalPanel,
    setSiteIntelHtml, setSiteIntelBlobUrl, setSiteIntelFilename, setShowSiteIntelPreviewDialog,
    setInvoicePreviewData, setInvoicePreviewHtml, setShowInvoicePreview,
    setCitations, setDocuments,
    dnaEmailClientEmail, dnaEmailClientName,
    setIsSendingDnaEmail, setShowDnaEmailDialog, setDnaEmailClientName, setDnaEmailClientEmail,
  });

  // ═══ Invoice edit/download/save logic moved to InvoicePreviewDialog ═══
  // Documents reload helper for extracted dialogs
  const reloadDocuments = useCallback(async () => {
    if (!projectId) return;
    const { data: newDocs } = await supabase
      .from('project_documents')
      .select('id, file_name, file_path, file_size, uploaded_at')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    if (newDocs) {
      setDocuments(newDocs.map(doc => ({
        ...doc,
        category: categorizeDocument(doc.file_name, doc.file_path),
      })));
    }
  }, [projectId, categorizeDocument]);

  // ═══ Summary download/save logic moved to SummaryPreviewDialog ═══
  
  // Owner-lock gate for Finish
  const requestFinishWithLock = useCallback(() => {
    if (userRole === 'owner' && !isFinancialSummaryUnlocked) {
      toast.error('Financial Summary must be active before activation', {
        description: 'Add budget or contract data to unlock the Financial panel',
        duration: 5000,
      });
      return;
    }
    setOwnerLockAction('finish');
    setOwnerLockOpen(true);
  }, [userRole, isFinancialSummaryUnlocked]);

  // Complete and go to dashboard (called after owner lock passes)
  const executeComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      if (projectId) {
        syncCitationsToLocalStorage(projectId, citations, 8, 0);
      }
      
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', projectId);
      
      if (projectError) throw projectError;

      await supabase
        .from('site_checkins')
        .update({ checked_out_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .is('checked_out_at', null);
      
      toast.success('Project completed!');
      onComplete();
    } catch (err) {
      console.error('[Stage8] Failed to complete:', err);
      logCriticalError('[Stage8] Failed to complete project', err);
      toast.error('Failed to finalize project');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, onComplete, citations]);

  // Execute material table edit after owner lock
  const executeMaterialTableEdit = useCallback(async () => {
    if (!pendingMaterialEdit) return;
    const { idx, qty } = pendingMaterialEdit;
    const newQty = Number(qty);
    if (isNaN(newQty) || newQty <= 0) {
      toast.error('Invalid quantity');
      setPendingMaterialEdit(null);
      return;
    }
    setIsSaving(true);
    try {
      const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      if (!templateCitation?.metadata?.items) throw new Error('No template data');
      
      const items = [...(templateCitation.metadata.items as any[])];
      // Find only material items to match the displayed index
      const materialItems = items.filter((item: any) => item.category === 'material');
      if (idx >= materialItems.length) throw new Error('Invalid material index');
      
      const targetItem = materialItems[idx];
      const globalIdx = items.indexOf(targetItem);
      items[globalIdx] = { ...targetItem, quantity: newQty, baseQuantity: newQty };
      
      // Update citation metadata
      const updatedCitations = citations.map(c => {
        if (c.id === templateCitation.id) {
          return { ...c, metadata: { ...c.metadata, items } };
        }
        return c;
      });
      
      const { error } = await supabase
        .from('project_summaries')
        .update({ verified_facts: updatedCitations as any })
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      setCitations(updatedCitations);
      toast.success(`Material quantity updated to ${newQty}`, { description: 'Owner-authorized override applied' });
    } catch (err) {
      console.error('[Stage8] Material table edit failed:', err);
      toast.error('Failed to update material');
    } finally {
      setIsSaving(false);
      setEditingMaterialIdx(null);
      setEditMaterialQty('');
      setPendingMaterialEdit(null);
    }
  }, [pendingMaterialEdit, citations, projectId]);

  // Owner lock callback dispatcher
  const handleOwnerLockAuthorized = useCallback(() => {
    if (ownerLockAction === 'finish') {
      executeComplete();
    } else if (ownerLockAction === 'material_edit') {
      saveEdit();
    } else if (ownerLockAction === 'material_table_edit') {
      executeMaterialTableEdit();
    }
    setOwnerLockAction(null);
  }, [ownerLockAction, executeComplete, saveEdit, executeMaterialTableEdit]);
  
  // Render citation value
  const renderCitationValue = useCallback((citation: Citation) => {
    const isEditing = editingField === citation.id;
    
    let displayValue = citation.answer;
    
    if (citation.cite_type === 'TIMELINE' && citation.metadata?.start_date) {
      try {
        displayValue = format(parseISO(citation.metadata.start_date as string), 'MMM dd, yyyy');
      } catch {
        displayValue = citation.metadata.start_date as string;
      }
    }
    
    if (citation.cite_type === 'END_DATE' && typeof citation.value === 'string') {
      try {
        displayValue = format(parseISO(citation.value), 'MMM dd, yyyy');
      } catch {
        displayValue = citation.value;
      }
    }
    
    if (citation.cite_type === 'GFA_LOCK' && typeof citation.value === 'number') {
      displayValue = `${citation.value.toLocaleString()} ${citation.metadata?.gfa_unit || 'sq ft'}`;
    }
    
    if (citation.cite_type === 'DEMOLITION_PRICE' && typeof citation.value === 'number') {
      displayValue = `$${citation.value.toFixed(2)}/sq ft`;
    }
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={requestSaveWithLock}
            disabled={isSaving}
            className="h-8 w-8 p-0"
          >
            {isSaving ? <HardHatSpinner size="sm" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelEdit}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">{displayValue}</span>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEditing(citation.id, citation.answer)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }, [editingField, editValue, isSaving, canEdit, requestSaveWithLock, cancelEdit, startEditing]);
  
  // Get tier badge
  const getTierBadge = useCallback((tier: VisibilityTier) => {
    const config = VISIBILITY_TIERS.find(t => t.key === tier);
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("text-[10px] gap-1 px-1.5 py-0", config.color, config.bgColor)}>
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, []);
  
  // Get member name by userId
  const getMemberName = useCallback((memberId: string) => {
    const member = teamMembers.find(m => m.userId === memberId);
    return member?.name || 'Unassigned';
  }, [teamMembers]);
  
   // Render Panel 5 - Timeline with Granular Tasklist
   // ✓ GANTT-STYLE EXECUTION TIMELINE
   // ═══ Panel 5 — now extracted to Panel5Timeline ═══
   const renderPanel5Content = useCallback(() => {
     return (
       <Panel5Timeline
         citations={citations}
         tasks={tasks}
         userId={userId}
         userRole={userRole}
         projectId={projectId}
         expandedPhases={expandedPhases}
         teamMembers={teamMembers}
         isUploading={isUploading}
         canEdit={canEdit}
         canViewFinancials={canViewFinancials}
         canUploadTaskPhotos={canUploadTaskPhotos}
         canToggleTaskStatus={canToggleTaskStatus}
         getCitationsForPanel={getCitationsForPanel}
         renderCitationValue={renderCitationValue}
         togglePhaseExpansion={togglePhaseExpansion}
         updateTaskAssignee={updateTaskAssignee}
         updateChecklistItem={updateChecklistItem}
         onCitationsChange={setCitations}
         onTasksChange={setTasks}
         onTaskCompletionDialog={setTaskCompletionDialog}
       />
     );
   }, [
     getCitationsForPanel,
     citations,
     tasks,
     userId,
     userRole,
     expandedPhases,
     togglePhaseExpansion,
     teamMembers,
     canEdit,
     canUploadTaskPhotos,
     canToggleTaskStatus,
     updateTaskAssignee,
     updateChecklistItem,
     renderCitationValue,
     projectId,
     isUploading,
     canViewFinancials,
   ]);
   
   // Render Panel 6 - Documents (extracted to Panel6Documents)
   const renderPanel6Content = useCallback(() => {
     return (
       <Panel6Documents
         documents={documents}
         contracts={contracts}
         userRole={userRole}
         canEdit={canEdit}
         canViewFinancials={canViewFinancials}
         isUploading={isUploading}
         isDraggingOver={isDraggingOver}
         selectedUploadCategory={selectedUploadCategory}
         obcComplianceResults={obcComplianceResults}
         fileInputRef={fileInputRef}
         setSelectedUploadCategory={setSelectedUploadCategory}
         handleDragOver={handleDragOver}
         handleDragLeave={handleDragLeave}
         handleDrop={handleDrop}
         handleDownloadDocument={handleDownloadDocument}
         setFullscreenPanel={setFullscreenPanel}
         setPreviewDocument={setPreviewDocument}
         setContractStep={setContractStep}
         setSelectedContractMember={setSelectedContractMember}
         setSelectedContractType={setSelectedContractType}
         setShowContractPreview={setShowContractPreview}
         setSelectedContractForEmail={setSelectedContractForEmail}
         setContractRecipients={setContractRecipients}
         setShowContractEmailDialog={setShowContractEmailDialog}
         setContractToDelete={setContractToDelete}
         getCitationsForPanel={getCitationsForPanel}
         toast={toast}
       />
     );
   }, [
     documents, contracts, userRole, canEdit, canViewFinancials,
     isUploading, isDraggingOver, selectedUploadCategory, obcComplianceResults,
     handleDragOver, handleDragLeave, handleDrop, handleDownloadDocument,
     getCitationsForPanel, setFullscreenPanel,
   ]);
  
  // Contract type options for new contract selection
  const CONTRACT_TYPE_OPTIONS = [
    { key: 'residential', label: 'Residential', icon: '🏠' },
    { key: 'commercial', label: 'Commercial', icon: '🏢' },
    { key: 'industrial', label: 'Industrial', icon: '🏭' },
    { key: 'renovation', label: 'Renovation', icon: '🔨' },
  ];
  
  // Render panel content based on panel ID
  const renderPanelContent = useCallback((panel: PanelConfig | undefined | null) => {
    if (!panel) return null;
    const panelCitations = getCitationsForPanel(panel.dataKeys || []);

    // ======= PANEL 1: Project Basics — Extracted to Panel1Basics =======
    if (panel.id === 'panel-1-basics') {
      return (
        <Panel1Basics
          mode="card"
          citations={citations}
          projectData={projectData}
          teamMembers={teamMembers}
          collapsedPanels={collapsedPanels}
          setCollapsedPanels={setCollapsedPanels}
          renderCitationValue={renderCitationValue}
        />
      );
    }
    
    // ======= PANEL 2: Area & Dimensions — Extracted to Panel2GFA =======
    if (panel.id === 'panel-2-gfa') {
      return (
        <Panel2GFA
          mode="card"
          citations={citations}
          financialSummary={financialSummary}
          collapsedPanels={collapsedPanels}
          setCollapsedPanels={setCollapsedPanels}
          renderCitationValue={renderCitationValue}
        />
      );
    }
    
    // ======= PANEL 3: Trade & Template — Extracted to Panel3Trade =======
    // ✓ CRITICAL: NO HARDCODED FALLBACKS - Dynamic label shows Sub-worktype from citations
    if (panel.id === 'panel-3-trade') {
      return (
        <Panel3Trade
          mode="card"
          citations={citations}
          panelCitations={panelCitations}
          renderCitationValue={renderCitationValue}
          userRole={userRole}
          pendingChanges={pendingChanges}
          onRequestModification={(material) => {
            setModificationDialog({ open: true, material });
          }}
        />
      );
    }
    
    switch (panel.id) {
      case 'panel-4-team':
        return (
          <Panel4Team
            mode="card"
            citations={citations}
            panelCitations={panelCitations}
            teamMembers={teamMembers}
            projectId={projectId}
            userId={userId}
            userRole={userRole}
            canEdit={canEdit}
            collapsedPanels={collapsedPanels}
            setCollapsedPanels={setCollapsedPanels}
            activeOrbitalPanel={activeOrbitalPanel}
            renderCitationValue={renderCitationValue}
            categorizeDocument={categorizeDocument}
            setDocuments={setDocuments}
          />
        );
      
      case 'panel-5-timeline':
        return renderPanel5Content();
      
      case 'panel-6-documents':
        return renderPanel6Content();
      
      case 'panel-7-weather':
        return (
          <Panel7Weather
            citations={citations}
            tasks={tasks}
            projectData={projectData}
            weatherData={weatherData}
            isCheckedIn={isCheckedIn}
            isCheckingIn={isCheckingIn}
            activeTeamCheckins={activeTeamCheckins}
            deliveryLogs={deliveryLogs}
            panelCitations={panelCitations}
            handleSiteCheckin={handleSiteCheckin}
            openWeatherMapModal={openWeatherMapModal}
            renderCitationValue={renderCitationValue}
          />
        );
      
      case 'panel-8-financial':
        return (
          <Panel8Financial
            mode="card"
            citations={citations}
            panelCitations={panelCitations}
            contracts={contracts}
            financialSummary={financialSummary}
            tasks={tasks}
            canViewFinancials={canViewFinancials}
            userRole={userRole}
            myPendingChanges={myPendingChanges}
          />
        );


      default:
        return (
          <div className="space-y-2">
            {panelCitations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No data recorded for this panel
              </p>
            ) : (
              panelCitations.map(citation => (
                <div
                  key={citation.id}
                  className="group flex items-start justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {citation.cite_type.replace(/_/g, ' ')}
                    </p>
                    {renderCitationValue(citation)}
                  </div>
                </div>
              ))
            )}
          </div>
        );
    }
  }, [
    getCitationsForPanel,
    teamMembers,
    projectData,
    citations,
    contracts,
    canViewFinancials,
    userRole,
    dataSource,
    renderCitationValue,
    renderPanel5Content,
    renderPanel6Content,
    financialSummary,
    collapsedPanels,
  ]);

  // ═══ Grok Insights — now extracted to GrokInsightsPanel ═══
  const renderGrokInsightsContent = useCallback(() => {
    return (
      <GrokInsightsPanel
        citations={citations}
        obcSections={obcComplianceResults.sections || []}
        affiliateProducts={affiliateProducts}
        grokInsightsLoading={grokInsightsLoading}
        projectId={projectId}
        onRegenerate={() => {
          setAffiliateProductsLoaded(false);
          setAffiliateProducts([]);
        }}
      />
    );
  }, [citations, obcComplianceResults.sections, grokInsightsLoading, affiliateProducts, projectId]);

  // ═══ DNA Audit — now extracted to DnaAuditPanel ═══
  const renderDnaAuditContent = useCallback(() => {
    return (
      <DnaAuditPanel
        citations={citations}
        teamMembers={teamMembers}
        financialSummary={financialSummary}
        obcComplianceResults={obcComplianceResults}
        dnaScanningPillar={dnaScanningPillar}
        dnaScannedPillars={dnaScannedPillars}
        expandedRiskPillars={expandedRiskPillars}
        onToggleRiskPillar={(key) => {
          setExpandedRiskPillars(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
          });
        }}
        onRunObcComplianceCheck={runObcComplianceCheck}
      />
    );
  }, [citations, teamMembers, financialSummary, obcComplianceResults, dnaScanningPillar, dnaScannedPillars, expandedRiskPillars, runObcComplianceCheck]);

  // Render fullscreen panel content
  const renderFullscreenContent = useCallback((panel: PanelConfig | undefined | null) => {
    if (!panel) return null;
    const panelCitations = getCitationsForPanel(panel.dataKeys || []);
    
    return (
      <div className="space-y-6">
        {/* ✓ PANEL 1: Project Basics — Extracted to Panel1Basics */}
        {panel.id === 'panel-1-basics' && (
          <Panel1Basics
            mode="fullscreen"
            citations={citations}
            projectData={projectData}
            teamMembers={teamMembers}
            collapsedPanels={collapsedPanels}
            setCollapsedPanels={setCollapsedPanels}
            renderCitationValue={renderCitationValue}
          />
        )}

        {/* ✓ PANEL 2: Area & Dimensions — Extracted to Panel2GFA */}
        {panel.id === 'panel-2-gfa' && (
          <Panel2GFA
            mode="fullscreen"
            citations={citations}
            financialSummary={financialSummary}
            collapsedPanels={collapsedPanels}
            setCollapsedPanels={setCollapsedPanels}
            renderCitationValue={renderCitationValue}
          />
        )}

        {/* Generic citations for non-basics/non-gfa panels */}
        {panel.id !== 'panel-1-basics' && panel.id !== 'panel-2-gfa' && panelCitations.length > 0 && (
          <div>
            <button
              onClick={() => setVerifiedDataExpanded(prev => !prev)}
              className="w-full text-sm font-semibold mb-1 flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <FileText className="h-4 w-4" />
              Verified Data ({panelCitations.length})
              {verifiedDataExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              )}
            </button>
            <AnimatePresence>
              {verifiedDataExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-3 mt-2">
                    {panelCitations.map(citation => (
                      <div
                        key={citation.id}
                        className="group flex items-start justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {citation.cite_type.replace(/_/g, ' ')}
                          </p>
                          {renderCitationValue(citation)}
                          {citation.metadata && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(citation.timestamp), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          [{citation.id.slice(0, 8)}]
                        </Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {/* ✓ PANEL 3: Trade & Template — Extracted to Panel3Trade */}
        {panel.id === 'panel-3-trade' && (
          <Panel3Trade
            mode="fullscreen"
            citations={citations}
            panelCitations={panelCitations}
            renderCitationValue={renderCitationValue}
            userRole={userRole}
            canEdit={canEdit}
            editingMaterialIdx={editingMaterialIdx}
            setEditingMaterialIdx={setEditingMaterialIdx}
            editMaterialQty={editMaterialQty}
            setEditMaterialQty={setEditMaterialQty}
            onMaterialEditConfirm={(idx, qty) => {
              setPendingMaterialEdit({ idx, qty });
              setOwnerLockAction('material_table_edit');
              setOwnerLockOpen(true);
            }}
            projectId={projectId}
            userId={userId}
          />
        )}
        
        {/* ✓ PANEL 4: Team Architecture — Extracted to Panel4Team */}
        {panel.id === 'panel-4-team' && (
          <Panel4Team
            mode="fullscreen"
            citations={citations}
            panelCitations={panelCitations}
            teamMembers={teamMembers}
            projectId={projectId}
            userId={userId}
            userRole={userRole}
            canEdit={canEdit}
            collapsedPanels={collapsedPanels}
            setCollapsedPanels={setCollapsedPanels}
            renderCitationValue={renderCitationValue}
            categorizeDocument={categorizeDocument}
            setDocuments={setDocuments}
          />
        )}
        
        {panel.id === 'panel-5-timeline' && (
          <div className="overflow-y-auto max-h-[50vh]">
            {renderPanel5Content()}
          </div>
        )}
        
        {panel.id === 'panel-6-documents' && (
          <Panel6Fullscreen
            documents={documents}
            contracts={contracts}
            userRole={userRole}
            canEdit={canEdit}
            canViewFinancials={canViewFinancials}
            panelCitations={panelCitations}
            fileInputRef={fileInputRef}
            getCitationsForPanel={getCitationsForPanel}
            handleDownloadDocument={handleDownloadDocument}
            setPreviewDocument={setPreviewDocument}
            setContractStep={setContractStep}
            setSelectedContractMember={setSelectedContractMember}
            setSelectedContractType={setSelectedContractType}
            setShowContractPreview={setShowContractPreview}
            setSelectedContractForEmail={setSelectedContractForEmail}
            setContractRecipients={setContractRecipients}
            setShowContractEmailDialog={setShowContractEmailDialog}
            renderCitationValue={renderCitationValue}
          />
        )}
        
        {panel.id === 'panel-7-weather' && (
          <Panel7Weather
            citations={citations}
            tasks={tasks}
            projectData={projectData}
            weatherData={weatherData}
            isCheckedIn={isCheckedIn}
            isCheckingIn={isCheckingIn}
            activeTeamCheckins={activeTeamCheckins}
            deliveryLogs={deliveryLogs}
            panelCitations={panelCitations}
            handleSiteCheckin={handleSiteCheckin}
            openWeatherMapModal={openWeatherMapModal}
            renderCitationValue={renderCitationValue}
          />
        )}
        
        {panel.id === 'panel-8-financial' && canViewFinancials && (
          <Panel8Financial
            mode="fullscreen"
            citations={citations}
            panelCitations={panelCitations}
            contracts={contracts}
            financialSummary={financialSummary}
            tasks={tasks}
            canViewFinancials={canViewFinancials}
            userRole={userRole}
            myPendingChanges={myPendingChanges}
          />
        )}
        
        {panelCitations.length === 0 && !['panel-1-basics', 'panel-2-gfa', 'panel-3-trade', 'panel-4-team', 'panel-5-timeline', 'panel-6-documents', 'panel-7-weather', 'panel-8-financial'].includes(panel.id) && (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No data recorded for this panel yet</p>
          </div>
        )}
      </div>
    );
  }, [getCitationsForPanel, renderCitationValue, teamMembers, weatherData, contracts, canViewFinancials, renderPanel5Content, documents, DOCUMENT_CATEGORIES, verifiedDataExpanded]);
  
  // Render single panel
  const renderPanel = useCallback((panel: PanelConfig) => {
    const hasAccess = hasAccessToTier(panel.visibilityTier, panel.id);
    const isCollapsed = collapsedPanels.has(panel.id);
    const Icon = panel.icon;
    const panelCitations = getCitationsForPanel(panel.dataKeys);
    const dataCount = panelCitations.length + 
      (panel.id === 'panel-4-team' ? teamMembers.length : 0) +
      (panel.id === 'panel-5-timeline' ? tasks.length : 0) +
      (panel.id === 'panel-6-documents' ? documents.length + contracts.length : 0);
    
    // ✓ DYNAMIC TITLE: Panel 3 shows the selected subwork type (Flooring, Painting, etc.)
    const getDynamicTitle = () => {
      if (panel.id === 'panel-3-trade') {
        const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
        const tradeLabel = tradeCitation?.answer; // "Flooring", "Painting", "Drywall"
        if (tradeLabel) {
          return `${tradeLabel} Template`;
        }
      }
      return t(panel.titleKey, panel.title);
    };
    
    const dynamicTitle = getDynamicTitle();
    
    if (!hasAccess) {
      return (
        <motion.div
          key={panel.id}
          className={cn(
            "relative rounded-xl border-2 overflow-hidden cursor-not-allowed",
            "bg-muted/30 border-dashed border-muted-foreground/20"
          )}
          whileHover={{ scale: 1.01 }}
        >
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {panel.title.split(' ').map((word, i) => (
                      <span key={i} className={i === 0 ? "" : "text-amber-500"}>{i > 0 ? ' ' : ''}{word}</span>
                    ))}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Restricted</p>
                </div>
              </div>
              {getTierBadge(panel.visibilityTier)}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center">
                Requires {panel.visibilityTier} access
              </p>
            </div>
          </div>
        </motion.div>
      );
    }
    
    return (
      <motion.div
        key={panel.id}
        className={cn(
          "relative rounded-xl border-2 overflow-hidden transition-all duration-200",
          panel.borderColor
        )}
        whileHover={{ scale: 1.01 }}
        layout
      >
        {/* Fullscreen Button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 z-10 h-7 w-7 p-0 opacity-70 hover:opacity-100"
           onClick={(e) => {
            e.stopPropagation();
            setFullscreenPanel(panel.id);
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        
        {/* Panel Header - Clickable to open in canvas */}
        <div 
          className={cn("p-3 border-b cursor-pointer select-none", panel.bgColor)}
          onClick={() => { setActiveOrbitalPanel(panel.id); setSlideOverPanel(panel.id); }}
        >
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", panel.bgColor)}>
                <Icon className={cn("h-4 w-4", panel.color)} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {dynamicTitle.split(' ').map((word, i) => (
                    <span key={i} className={i === 0 ? "text-foreground" : "text-amber-500"}>{i > 0 ? ' ' : ''}{word}</span>
                  ))}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {dataCount > 0 ? `${dataCount} items` : panel.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); togglePanelCollapse(panel.id); }}
                className="p-0.5 rounded hover:bg-muted/50 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className={cn("h-4 w-4", panel.color)} />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Panel Content - Collapsible */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-background max-h-80 overflow-y-auto">
                {renderPanelContent(panel)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [
    hasAccessToTier,
    collapsedPanels,
    getCitationsForPanel,
    citations, // ✓ Added for dynamic Panel 3 title
    teamMembers,
    tasks,
    documents,
    contracts,
    getTierBadge,
    renderPanelContent,
    togglePanelCollapse,
    t,
  ]);
  
  // Get current fullscreen panel config
  const fullscreenPanelConfig = useMemo(() => {
    if (fullscreenPanel === 'messa-deep-audit') {
      return {
        id: 'messa-deep-audit',
        panelNumber: 9,
        title: 'MESSA DNA Deep Audit',
        titleKey: 'stage8.messaAudit',
        icon: Sparkles,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-300 dark:border-emerald-700',
        visibilityTier: 'owner' as VisibilityTier,
        dataKeys: [],
        description: '8-Pillar Synthesis Validation',
      };
    }
    return PANELS.find(p => p.id === fullscreenPanel);
  }, [fullscreenPanel]);
  
  // Get the active panel config
  const activePanelConfig = useMemo(() => {
    if (activeOrbitalPanel === 'messa-deep-audit') {
      return {
        id: 'messa-deep-audit',
        panelNumber: 9,
        title: 'MESSA DNA Deep Audit',
        titleKey: 'stage8.messaAudit',
        icon: Sparkles,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-300 dark:border-emerald-700',
        visibilityTier: 'owner' as VisibilityTier,
        dataKeys: [],
        description: '8-Pillar Synthesis Validation',
      };
    }
    return PANELS.find(p => p.id === activeOrbitalPanel) || PANELS[0];
  }, [activeOrbitalPanel]);

  // Orbital positions for 8 panels around center (angles in degrees)
  const getOrbitalPosition = useCallback((index: number, total: number) => {
    const angle = (index * 360) / total - 90; // Start from top
    const rad = (angle * Math.PI) / 180;
    return { angle, rad };
  }, []);

  if (isLoading) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-4">
          <HardHatSpinner size="md" />
          <p className="text-sm text-muted-foreground">Loading project summary...</p>
        </div>
      </div>
    );
  }

  return (
     <div className={cn("h-full flex flex-col overflow-hidden bg-[#0a0e1a] relative", className)}>
       {/* Scroll Progress Bar */}
       <div className="absolute top-0 left-0 right-0 h-[2px] z-50 bg-transparent">
         <motion.div
           className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400"
           style={{ width: `${scrollProgress}%` }}
           initial={false}
           animate={{ width: `${scrollProgress}%` }}
           transition={{ duration: 0.1, ease: "linear" }}
         />
       </div>
       {/* ═══ TOP ACTION BUTTONS ═══ */}
       <div className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-4 py-1.5 bg-[#0d1117]/90 border-b border-white/5 gap-2">
          {/* Left: Invoice (Owner only) + Ask MESSA (all) */}
          <div className="flex items-center gap-1.5 justify-self-start min-w-0">
            {canGenerateReports && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateInvoice}
                    className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Receipt className="h-3.5 w-3.5 mr-1" />
                    <span className="text-[10px] font-medium hidden sm:inline">Invoice</span>
                  </Button>
                </TooltipTrigger>
                <Tooltip>
                  <TooltipContent side="bottom" className="text-xs">Generate Invoice</TooltipContent>
                </Tooltip>
              </Tooltip>
            </TooltipProvider>
            )}
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setShowProjectMessa(true)}
                   className="h-7 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                 >
                   <MessageCircle className="h-3.5 w-3.5 mr-1" />
                   <span className="text-[10px] font-medium hidden sm:inline">M.E.S.S.A.</span>
                 </Button>
               </TooltipTrigger>
               <Tooltip>
                 <TooltipContent side="bottom" className="text-xs">Ask M.E.S.S.A.</TooltipContent>
               </Tooltip>
             </Tooltip>
           </TooltipProvider>
         </div>

         {/* Center: Live Clock + Active Countdown */}
         <div className="justify-self-center flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/40 border border-white/10">
           <div className="flex items-center gap-1 text-cyan-400">
             <Clock className="h-3 w-3" />
             <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider">
               {liveNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
             </span>
           </div>
           <span className="text-white/20">•</span>
           <div className="flex items-center gap-1 text-purple-300">
             <Timer className="h-3 w-3" />
             <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider whitespace-nowrap">
               {topBarCountdown
                 ? `${topBarCountdown.days > 0 ? `${topBarCountdown.days}d ` : ''}${String(topBarCountdown.hours).padStart(2, '0')}:${String(topBarCountdown.minutes).padStart(2, '0')}:${String(topBarCountdown.seconds).padStart(2, '0')}`
                 : 'No END_DATE'}
             </span>
           </div>
         </div>

         {/* Right: Check-in + Finish */}
         <div className="flex items-center gap-1.5 justify-self-end min-w-0">
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={handleSiteCheckin}
                   disabled={isCheckingIn}
                   className={cn(
                     "h-7 px-2",
                     isCheckedIn
                       ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                       : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                   )}
                 >
                   <MapPin className="h-3.5 w-3.5 mr-1" />
                   <span className="text-[10px] font-medium hidden sm:inline">{isCheckedIn ? 'Check Out' : 'Check In'}</span>
                 </Button>
               </TooltipTrigger>
               <Tooltip>
                 <TooltipContent side="bottom" className="text-xs">{isCheckedIn ? 'Site Check-Out' : 'Site Check-In'}</TooltipContent>
               </Tooltip>
             </Tooltip>
           </TooltipProvider>
            {canFinishProject && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={requestFinishWithLock}
                    disabled={isSaving}
                    className="h-7 px-2 text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    <span className="text-[10px] font-medium hidden sm:inline">Finish</span>
                  </Button>
                </TooltipTrigger>
                <Tooltip>
                  <TooltipContent side="bottom" className="text-xs">Finish Project</TooltipContent>
                </Tooltip>
              </Tooltip>
            </TooltipProvider>
            )}
         </div>
       </div>
        <AIEnginePipelineStrip
          activePipelineStep={activePipelineStep}
          openEnginePopover={openEnginePopover}
          setOpenEnginePopover={setOpenEnginePopover}
          onEngineReport={(engineType) => { setActiveAiEngine(engineType); setAiEngineModalOpen(true); }}
        />

      {/* Orbital Command Center Layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* City Skyline Background */}
         <div className="absolute inset-0 pointer-events-none">
           <img 
             src={torontoCyberpunkSkyline} 
             alt="" 
             className="absolute bottom-0 left-0 right-0 w-full h-auto opacity-[0.18] object-cover object-bottom"
             style={{ maxHeight: '35%', filter: 'hue-rotate(200deg) brightness(1.2)' }}
           />
           <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-[#0a0e1a]/80" />
        </div>
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(251,146,60,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Ambient floating particles - hidden on mobile for performance */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-orange-400/20"
              initial={{ 
                x: `${15 + i * 15}%`, 
                y: `${10 + (i % 3) * 30}%`,
                opacity: 0 
              }}
              animate={{ 
                y: [`${10 + (i % 3) * 30}%`, `${5 + (i % 3) * 30}%`, `${10 + (i % 3) * 30}%`],
                opacity: [0, 0.6, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 4 + i * 0.7,
                repeat: Infinity,
                delay: i * 0.8,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Desktop: AI Territory Grid Layout */}
        <div className="hidden lg:flex h-full flex-col gap-3 p-3 relative">
          
           {/* ═══ AI TERRITORY GRID — 4 Column Engine Layout (Extracted) ═══ */}
           <AITerritoryGrid
             citations={citations}
             documents={documents}
             tasks={tasks}
             teamMembers={teamMembers}
             contracts={contracts}
             weatherData={weatherData}
             projectData={projectData}
             financialSummary={financialSummary}
             obcComplianceResults={obcComplianceResults}
             activeOrbitalPanel={activeOrbitalPanel}
             unreadChatCount={unreadChatCount}
             canViewFinancials={canViewFinancials}
             obcSummaryExpanded={obcSummaryExpanded}
             setObcSummaryExpanded={setObcSummaryExpanded}
             grokInsightsLoading={grokInsightsLoading}
             setGrokInsightsLoading={setGrokInsightsLoading}
             setActiveOrbitalPanel={setActiveOrbitalPanel}
             setSlideOverPanel={setSlideOverPanel}
             hasAccessToTier={hasAccessToTier}
             getCitationsForPanel={getCitationsForPanel}
             runObcComplianceCheck={runObcComplianceCheck}
             setAffiliateProductsLoaded={setAffiliateProductsLoaded}
             setAffiliateProducts={setAffiliateProducts}
           />

          {/* ═══ AI EXECUTION FLOW — Extracted to AIExecutionFlow ═══ */}
          <AIExecutionFlow
            citations={citations}
            tasks={tasks}
            financialSummary={financialSummary}
            obcComplianceResults={obcComplianceResults}
            liveNow={liveNow}
            topBarCountdown={topBarCountdown}
            onEngineReport={(engine) => { setActiveAiEngine(engine); setAiEngineModalOpen(true); }}
            onExpandTimeline={() => { setActiveOrbitalPanel('panel-5-timeline'); setSlideOverPanel('panel-5-timeline'); }}
            teamMembers={teamMembers}
          />


          {/* ═══ FULL-WIDTH CANVAS ═══ */}
          <motion.div
            className="flex-1 relative rounded-2xl border border-orange-400/20 bg-[#111827]/90 backdrop-blur-md overflow-hidden flex flex-col shadow-[0_0_20px_rgba(251,146,60,0.1)]"
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Knight Rider Radar Sweep during DNA generation */}
            {isGeneratingDnaReport && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '25%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, hsla(160,80%,50%,0.08), hsla(160,80%,50%,0.2), hsla(160,80%,50%,0.08), transparent)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
                animate={{ left: ['-25%', '100%', '-25%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {/* Canvas content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOrbitalPanel}
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex-1 p-4 overflow-y-auto [&_*]:text-foreground dark:[&_*]:text-foreground"
                ref={canvasContentRef}
                style={{ colorScheme: 'light' }}
              >
                {/* Canvas Content */}
                {renderFullscreenContent(fullscreenPanelConfig)}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ═══ Mobile Layout (Extracted) ═══ */}
        <MobileTerritoryLayout
          PANELS={PANELS}
          activeOrbitalPanel={activeOrbitalPanel}
          setActiveOrbitalPanel={setActiveOrbitalPanel}
          setSlideOverPanel={setSlideOverPanel}
          hasAccessToTier={hasAccessToTier}
          getCitationsForPanel={getCitationsForPanel}
          citations={citations}
          documents={documents}
          tasks={tasks}
          teamMembers={teamMembers}
          weatherData={weatherData}
          projectData={projectData}
          financialSummary={financialSummary}
          canViewFinancials={canViewFinancials}
          obcComplianceResults={obcComplianceResults}
          grokInsightsLoading={grokInsightsLoading}
          setGrokInsightsLoading={setGrokInsightsLoading}
          runObcComplianceCheck={runObcComplianceCheck}
          activePanelConfig={activePanelConfig}
          renderFullscreenContent={renderFullscreenContent}
          mobileContentRef={mobileContentRef}
        />

      {/* ═══ GLOBAL HIDDEN FILE INPUT (always in DOM for mobile + desktop) ═══ */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleFileUpload(e.target.files); if (e.target) e.target.value = ''; }} />

      {/* ═══ FULLSCREEN PANEL DIALOG ═══ */}
      <Dialog open={!!fullscreenPanel} onOpenChange={(open) => { if (!open) setFullscreenPanel(null); }}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 z-[9999]">
          {fullscreenPanelConfig && renderFullscreenContent(fullscreenPanelConfig)}
        </DialogContent>
      </Dialog>
      
      {/* ✓ REFACTORED: Contract dialog extracted to stage8/ContractPreviewDialog */}
      <ContractPreviewDialog
        open={showContractPreview}
        onOpenChange={(open) => { setShowContractPreview(open); if (!open) { setContractStep('select_member'); setSelectedContractMember(null); } }}
        contractStep={contractStep}
        setContractStep={setContractStep}
        selectedContractMember={selectedContractMember}
        setSelectedContractMember={setSelectedContractMember}
        selectedContractType={selectedContractType}
        setSelectedContractType={setSelectedContractType}
        teamMembers={teamMembers}
        generateContractPreviewData={generateContractPreviewData}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        clientName={clientName}
        setClientName={setClientName}
        contractScopeOfWork={contractScopeOfWork}
        setContractScopeOfWork={setContractScopeOfWork}
        contractPaymentTerms={contractPaymentTerms}
        setContractPaymentTerms={setContractPaymentTerms}
        contractAdditionalTerms={contractAdditionalTerms}
        setContractAdditionalTerms={setContractAdditionalTerms}
        contractDeposit={contractDeposit}
        setContractDeposit={setContractDeposit}
        contractorSignatureData={contractorSignatureData}
        setContractorSignatureData={setContractorSignatureData}
        contractClientPhone={contractClientPhone}
        setContractClientPhone={setContractClientPhone}
        contractClientAddress={contractClientAddress}
        setContractClientAddress={setContractClientAddress}
        isGeneratingContract={isGeneratingContract}
        setIsGeneratingContract={setIsGeneratingContract}
        isSendingContract={isSendingContract}
        setIsSendingContract={setIsSendingContract}
        financialSummary={financialSummary}
        ownerProfile={ownerProfile}
        userProfile={userProfile}
        projectId={projectId}
        userId={userId}
        citations={citations}
        setCitations={setCitations}
        setContracts={setContracts}
        />
      </div>

      {/* Site Log & Location Modal */}
      {weatherModalOpen && (
        <WeatherMapModal
          open={weatherModalOpen}
          onOpenChange={setWeatherModalOpen}
          initialTab={weatherModalTab}
          location={
            citations.find(c => c.cite_type === 'LOCATION')?.answer || undefined
          }
          lat={
            (citations.find(c => c.cite_type === 'LOCATION')?.metadata?.coordinates as any)?.lat || undefined
          }
          lon={
            (citations.find(c => c.cite_type === 'LOCATION')?.metadata?.coordinates as any)?.lng || undefined
          }
          projectName={projectData?.name || 'Project'}
          projectId={projectId}
        />
      )}
      
      {/* ✓ REFACTORED: Document Preview Modal extracted to DocumentPreviewDialog */}
      <DocumentPreviewDialog
        previewDocument={previewDocument}
        onClose={() => setPreviewDocument(null)}
        onFullscreenImage={(path) => setFullscreenImagePath(path)}
        onDownload={handleDownloadDocument}
        onSendDocument={async (recipients, note) => {
          if (recipients.length === 0 || !previewDocument) {
            toast.error('Please select at least one team member');
            return;
          }
          setIsSendingDocument(true);
          try {
            const attachmentUrl = await getDocumentSignedUrl(previewDocument.file_path);
            if (!attachmentUrl) {
              toast.error('Failed to generate document link');
              setIsSendingDocument(false);
              return;
            }
            const messageText = note
              ? `${note}\n\n📎 ${previewDocument.file_name}`
              : `📎 Shared file: ${previewDocument.file_name}`;
            const results = await Promise.allSettled(
              recipients.map(recipientId =>
                supabase.from('team_messages').insert({
                  sender_id: userId,
                  recipient_id: recipientId,
                  message: messageText,
                  attachment_url: attachmentUrl,
                  attachment_name: previewDocument.file_name,
                })
              )
            );
            const successCount = results.filter(r => r.status === 'fulfilled' && !(r.value as any).error).length;
            const failCount = recipients.length - successCount;
            if (failCount === 0) {
              toast.success(`File sent to ${successCount} team member${successCount > 1 ? 's' : ''}`, { description: 'They will see it in their Messages' });
            } else if (successCount > 0) {
              toast.warning(`Sent to ${successCount}, failed for ${failCount}`);
            } else {
              toast.error('Failed to send file');
            }
            setPreviewDocument(null);
            setSelectedTeamRecipients([]);
            setDocumentMessageNote('');
          } catch (err) {
            console.error('[Stage8] Send document to team failed:', err);
            toast.error('Failed to send document');
          } finally {
            setIsSendingDocument(false);
          }
        }}
        canEdit={canEdit}
        teamMembers={teamMembers}
        userId={userId}
        isSendingDocument={isSendingDocument}
        selectedTeamRecipients={selectedTeamRecipients}
        setSelectedTeamRecipients={setSelectedTeamRecipients}
        documentMessageNote={documentMessageNote}
        setDocumentMessageNote={setDocumentMessageNote}
      />

      {/* ═══ FULLSCREEN IMAGE LIGHTBOX ═══ */}
      {fullscreenImagePath && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center cursor-zoom-out"
          onClick={() => setFullscreenImagePath(null)}
        >
          <button 
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setFullscreenImagePath(null)}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <SignedImage 
            filePath={fullscreenImagePath}
            alt="Full preview"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
          />
        </div>
      )}
      
      {/* ✓ REFACTORED: Contract Email Dialog extracted to ContractEmailDialog */}
      <ContractEmailDialog
        open={showContractEmailDialog}
        onOpenChange={setShowContractEmailDialog}
        selectedContract={selectedContractForEmail}
        contractRecipients={contractRecipients}
        setContractRecipients={setContractRecipients}
        teamMembers={teamMembers}
        isSendingToMultiple={isSendingToMultiple}
        onSend={handleSendContractToMultiple}
      />
      
      {/* Invoice Preview Modal (Extracted) */}
      {showInvoicePreview && invoicePreviewData && (
        <InvoicePreviewDialog
          open={showInvoicePreview}
          onOpenChange={setShowInvoicePreview}
          invoiceData={invoicePreviewData}
          invoiceHtml={invoicePreviewHtml}
          projectId={projectId}
          userId={userId}
          onInvoiceUpdate={(data, html) => {
            setInvoicePreviewData(data);
            setInvoicePreviewHtml(html);
          }}
          onDocumentsReload={reloadDocuments}
          categorizeDocument={categorizeDocument}
        />
      )}
      
      {/* Project Summary Preview Modal (Extracted) */}
      {showSummaryPreview && summaryPreviewHtml && (
        <SummaryPreviewDialog
          open={showSummaryPreview}
          onOpenChange={setShowSummaryPreview}
          summaryHtml={summaryPreviewHtml}
          projectId={projectId}
          userId={userId}
          projectName={projectData?.name || ''}
          onDocumentsReload={reloadDocuments}
          categorizeDocument={categorizeDocument}
        />
      )}
      
      {/* M.E.S.S.A. Synthesis Preview Modal (Extracted) */}
      {showMessaPreview && messaSynthesisData && (
        <MessaSynthesisDialog
          open={showMessaPreview}
          onOpenChange={setShowMessaPreview}
          data={messaSynthesisData}
          previewHtml={messaPreviewHtml}
          projectId={projectId}
        />
      )}
      
      {/* Foreman Modification Dialog */}
      {modificationDialog?.open && modificationDialog.material && (
        <RequestModificationDialog
          open={modificationDialog.open}
          onOpenChange={(open) => {
            if (!open) setModificationDialog(null);
          }}
          itemName={modificationDialog.material.name}
          currentValue={modificationDialog.material.qty}
          unit={modificationDialog.material.unit}
          onSubmit={async (newValue: number, reason: string) => {
            await createPendingChange({
              itemType: 'material',
              itemId: `material_${modificationDialog.material.idx}`,
              itemName: modificationDialog.material.name,
              originalQuantity: modificationDialog.material.qty,
              newQuantity: newValue,
              changeReason: reason,
            });
          }}
        />
      )}
      
      {/* Pending Approval Modal - Owner approves Foreman modifications */}
      <PendingApprovalModal
        open={showPendingApprovalModal}
        onOpenChange={(open) => {
          setShowPendingApprovalModal(open);
          // Reset ref when modal is closed so next new change triggers auto-popup
          if (!open) pendingApprovalShownRef.current = false;
        }}
        pendingChanges={pendingChanges}
        onApprove={approveChange}
        onReject={rejectChange}
        loading={false}
      />
      
      {/* Conflict Map Modal */}
      <ConflictMapModal
        open={showConflictMap}
        onOpenChange={setShowConflictMap}
        citations={citations}
        projectData={projectData}
      />
      {/* ✓ REFACTORED: Contract Delete Dialog extracted to ContractDeleteDialog */}
      <ContractDeleteDialog
        contract={contractToDelete}
        onClose={() => setContractToDelete(null)}
        setContracts={setContracts}
        setCitations={setCitations}
      />

      {/* ✓ REFACTORED: DNA Report Preview Dialog extracted to DnaReportPreviewDialog */}
      <DnaReportPreviewDialog
        open={showDnaPreviewDialog}
        onOpenChange={setShowDnaPreviewDialog}
        dnaReportHtml={dnaReportHtml}
        dnaReportBlobUrl={dnaReportBlobUrl}
        setDnaReportBlobUrl={setDnaReportBlobUrl}
        setDnaReportHtml={setDnaReportHtml}
        dnaReportFilename={dnaReportFilename}
        showDnaEmailDialog={showDnaEmailDialog}
        setShowDnaEmailDialog={setShowDnaEmailDialog}
        dnaEmailClientName={dnaEmailClientName}
        setDnaEmailClientName={setDnaEmailClientName}
        dnaEmailClientEmail={dnaEmailClientEmail}
        setDnaEmailClientEmail={setDnaEmailClientEmail}
        isSendingDnaEmail={isSendingDnaEmail}
        onSendDnaReportEmail={handleSendDnaReportEmail}
      />

      {/* ✓ REFACTORED: Site Intel Preview Dialog extracted to SiteIntelPreviewDialog */}
      <SiteIntelPreviewDialog
        open={showSiteIntelPreviewDialog}
        onOpenChange={setShowSiteIntelPreviewDialog}
        siteIntelHtml={siteIntelHtml}
        siteIntelBlobUrl={siteIntelBlobUrl}
        setSiteIntelBlobUrl={setSiteIntelBlobUrl}
        setSiteIntelHtml={setSiteIntelHtml}
        siteIntelFilename={siteIntelFilename}
      />
      
      {/* Project-Specific MESSA Chat */}
       <ProjectMessaChat
        open={showProjectMessa}
        onClose={() => setShowProjectMessa(false)}
        messaInsights={messaInsights}
        projectContext={(() => {
          // Build detailed task data for MESSA
          const orderedTasks = tasks.filter(t => t.status === 'ordered');
          const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress');
          const completedTasksList = tasks.filter(t => t.status === 'completed' || t.status === 'done');
          const onHoldTasks = tasks.filter(t => t.status === 'on_hold' || t.status === 'on-hold');
          const pendingTasksList = tasks.filter(t => t.status === 'pending');
          
          const tasksByStatus = [
            pendingTasksList.length > 0 ? `Pending: ${pendingTasksList.length}` : '',
            orderedTasks.length > 0 ? `Ordered (📦): ${orderedTasks.length}` : '',
            inProgressTasks.length > 0 ? `In Progress (🔨): ${inProgressTasks.length}` : '',
            completedTasksList.length > 0 ? `Completed (✅): ${completedTasksList.length}` : '',
            onHoldTasks.length > 0 ? `On Hold (⏸): ${onHoldTasks.length}` : '',
          ].filter(Boolean).join(', ');

          const phaseGroups: Record<string, number> = {};
          tasks.forEach(t => {
            const phase = (t as any).phase || 'installation';
            phaseGroups[phase] = (phaseGroups[phase] || 0) + 1;
          });
          const tasksByPhase = Object.entries(phaseGroups).map(([p, c]) => `${p}: ${c}`).join(', ');

          const spentAmount = completedTasksList
            .filter(t => t.isSubTask && t.templateItemCost)
            .reduce((s, t) => s + (t.templateItemCost || 0), 0);
          const committedAmount = [...orderedTasks, ...inProgressTasks]
            .filter(t => t.isSubTask && t.templateItemCost)
            .reduce((s, t) => s + (t.templateItemCost || 0), 0);
          const totalBudget = financialSummary?.total_cost || 0;
          const remainingAmount = Math.max(0, totalBudget - spentAmount - committedAmount);

          const taskDetails = tasks.slice(0, 15).map(t => 
            `• "${t.title}" [${t.status}] ${(t as any).phase ? `(${(t as any).phase})` : ''} ${t.isSubTask && t.templateItemCost ? `$${t.templateItemCost.toLocaleString()}` : ''}`
          ).join('\n');

          return {
            projectName: projectData?.name || "",
            address: projectData?.address || "",
            trade: projectData?.trade || null,
            status: projectData?.status || "",
            workType: citations.find(c => c.cite_type === 'WORK_TYPE')?.answer || "",
            materialCost: financialSummary?.material_cost || null,
            laborCost: financialSummary?.labor_cost || null,
            totalCost: financialSummary?.total_cost || null,
            teamSize: teamMembers.length,
            teamMembers: teamMembers.map(m => `${m.name} (${m.role})`).join(", ") || "None",
            totalTasks: tasks.length,
            completedTasks: completedTasksList.length,
            pendingTasks: tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length,
            documentCount: documents.length,
            contractCount: contracts.length,
            citationCount: citations.length,
            citationTypes: [...new Set(citations.map(c => c.cite_type))].join(", ") || "None",
            startDate: citations.find(c => c.cite_type === 'TIMELINE')?.answer || "",
            endDate: citations.find(c => c.cite_type === 'END_DATE')?.answer || "",
            gfa: (() => {
              const g = citations.find(c => c.cite_type === 'GFA_LOCK');
              return g ? `${g.value} sq ft` : "Not locked";
            })(),
            executionMode: citations.find(c => c.cite_type === 'EXECUTION_MODE')?.answer || "Not set",
            siteCondition: citations.find(c => c.cite_type === 'SITE_CONDITION')?.answer || "Not assessed",
            currentUserRole: userRole,
            currentUserName: teamMembers.find(m => m.userId === userId)?.name || "Unknown",
            projectId: projectId,
            tasksByStatus,
            tasksByPhase,
            taskDetails,
            spentAmount,
            committedAmount,
            remainingAmount,
          };
        })()}
      />
      
      {/* OWNER-LOCK MODAL */}
      <OwnerLockModal
        open={ownerLockOpen}
        onOpenChange={setOwnerLockOpen}
        onAuthorized={handleOwnerLockAuthorized}
        title="Owner Authorization Required"
        description={
          ownerLockAction === 'finish'
            ? "You are completing this project. This will mark all work as done and close open sessions."
            : "You are modifying Operational Truth data. Owner Authorization Required."
        }
      />
      
      {/* ✓ REFACTORED: Task Completion Dialog extracted to TaskCompletionDialog */}
      <TaskCompletionDialog
        dialog={taskCompletionDialog}
        onClose={() => setTaskCompletionDialog(null)}
        onShowUploader={() => setTaskCompletionDialog(prev => prev ? { ...prev, showUploader: true } : null)}
        onConfirmTaskCompletion={confirmTaskCompletion}
        projectId={projectId}
        userId={userId}
        userRole={userRole}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        teamMembers={teamMembers}
        tasks={tasks}
        setTasks={setTasks}
        setDocuments={setDocuments}
        citations={citations}
        setCitations={setCitations}
      />

      {/* ─── Slide-over Drawer (Extracted) ─── */}
      <SlideOverDrawer
        slideOverPanel={slideOverPanel}
        setSlideOverPanel={setSlideOverPanel}
        PANELS={PANELS}
        renderGrokInsightsContent={renderGrokInsightsContent}
        renderDnaAuditContent={renderDnaAuditContent}
        renderFullscreenContent={renderFullscreenContent}
        renderPanelContent={renderPanelContent}
      />

      {/* AI Engine Report Modal */}
      {activeAiEngine && (
        <AIEngineReportModal
          isOpen={aiEngineModalOpen}
          onClose={() => {
            setAiEngineModalOpen(false);
            setActiveAiEngine(null);
          }}
          engineType={activeAiEngine}
          projectId={projectId}
          projectContext={{
            projectName: projectData?.name,
            address: projectData?.address,
            trade: projectData?.trade,
            status: projectData?.status,
            workType: citations.find(c => c.cite_type === 'WORK_TYPE')?.answer,
            gfa: citations.find(c => c.cite_type === 'GFA_LOCK')?.answer,
            siteCondition: citations.find(c => c.cite_type === 'SITE_CONDITION')?.answer,
            startDate: citations.find(c => c.cite_type === 'TIMELINE')?.metadata?.start_date,
            endDate: citations.find(c => c.cite_type === 'END_DATE')?.answer || citations.find(c => c.cite_type === 'END_DATE')?.metadata?.end_date,
            teamSize: teamMembers.length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            pendingTasks: tasks.filter(t => t.status !== 'completed').length,
            documentCount: documents.length,
            citationCount: citations.length,
            citationTypes: [...new Set(citations.map(c => c.cite_type))].join(', '),
            materialCost: financialSummary?.material_cost,
            laborCost: financialSummary?.labor_cost,
            totalCost: financialSummary?.total_cost,
            hasBlueprint: citations.some(c => c.cite_type === 'BLUEPRINT_UPLOAD'),
            sitePhotoCount: citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION').length,
            templateLocked: citations.some(c => c.cite_type === 'TEMPLATE_LOCK'),
            hasDemolition: citations.find(c => c.cite_type === 'SITE_CONDITION')?.answer === 'demolition',
          }}
        />
      )}
    </div>
  );
}
