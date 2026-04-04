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
import { useStage8Reports } from "./stage8/useStage8Reports";
import { useStage8DataLoader } from "./stage8/useStage8DataLoader";

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
  
   // ✓ Unread chat messages indicator for Team panel
   const [unreadChatCount, setUnreadChatCount] = useState(0);
   const lastSeenChatRef = useRef<string | null>(null);
   
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


    const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
    
    useEffect(() => {
      const fetchDeliveryLogs = async () => {
        const { data } = await supabase
          .from('site_logs')
          .select('id, notes, created_at, report_name, tasks_data')
          .eq('project_id', projectId)
          .eq('template_type', 'delivery')
          .order('created_at', { ascending: false })
          .limit(50);
        if (data) setDeliveryLogs(data);
      };
      fetchDeliveryLogs();

      // Realtime subscription for instant refresh on new deliveries
      const channel = supabase
        .channel(`delivery-logs-${projectId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'site_logs',
          filter: `project_id=eq.${projectId}`,
        }, (payload) => {
          if ((payload.new as any)?.template_type === 'delivery') {
            setDeliveryLogs(prev => [payload.new as any, ...prev]);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, [projectId]);
   


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
  
  // ✓ REALTIME SYNC: Subscribe to task status changes for bidirectional updates
  // Owner sees foreman's changes, foreman sees owner's changes - instantly
  useEffect(() => {
    if (!projectId) return;
    
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('[Stage8] ✓ Realtime task update received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as { id: string; status: string; assigned_to: string; title: string; priority: string };
            setTasks(prev => prev.map(t => 
              t.id === updatedTask.id 
                ? { ...t, status: updatedTask.status, assigned_to: updatedTask.assigned_to }
                : t
            ));
            // Show toast for status changes from other users
            if (payload.old && (payload.old as any).status !== updatedTask.status) {
              const teamMember = teamMembers.find(m => m.userId === updatedTask.assigned_to);
              toast.info(`Task "${updatedTask.title}" ${updatedTask.status === 'completed' ? 'completed' : 'reopened'}`, {
                description: teamMember ? `By ${teamMember.name}` : undefined,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            const newTask = payload.new as { id: string; title: string; status: string; priority: string; assigned_to: string };
            // Infer phase from title
            let phase = 'installation';
            const titleLower = newTask.title.toLowerCase();
            if (titleLower.includes('demo') || titleLower.includes('remove')) phase = 'demolition';
            else if (titleLower.includes('prep') || titleLower.includes('setup')) phase = 'preparation';
            else if (titleLower.includes('finish') || titleLower.includes('qc')) phase = 'finishing';
            
            setTasks(prev => [...prev, {
              id: newTask.id,
              title: newTask.title,
              status: newTask.status,
              priority: newTask.priority,
              phase,
              assigned_to: newTask.assigned_to,
              due_date: (newTask as any).due_date || null,
              created_at: (newTask as any).created_at || null,
              checklist: [
                { id: `${newTask.id}-start`, text: 'Task started', done: newTask.status !== 'pending' },
                { id: `${newTask.id}-complete`, text: 'Task completed', done: newTask.status === 'completed' },
                { id: `${newTask.id}-verify`, text: 'Verification photo', done: false },
              ],
            }]);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setTasks(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Stage8] Realtime subscription status:', status);
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, teamMembers]);

  // ✓ REALTIME SYNC: Subscribe to project_summaries changes
  // When Owner approves a budget modification, Foreman/Worker views auto-refresh
  // Updates: citations, financials, template_items (Material Tracker expected quantities)
  useEffect(() => {
    if (!projectId) return;
    
    const channel = supabase
      .channel(`summaries-sync-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_summaries',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          console.log('[Stage8] ✓ Realtime project_summaries update received');
          
          // Refresh citations from verified_facts
          if (updated.verified_facts && Array.isArray(updated.verified_facts)) {
            setCitations(updated.verified_facts as unknown as Citation[]);
          }
          
          // ── STRICT DYNAMIC LINKING: Recalculate from the freshest item-level data ──
          // Priority: line_items > template_items > stored cost fields
          const liveLineItems: any[] = Array.isArray(updated.line_items) ? updated.line_items : [];
          const liveTemplateItems: any[] = Array.isArray(updated.template_items) ? updated.template_items : [];
          const recalcSource = liveLineItems.length > 0 ? liveLineItems : liveTemplateItems;
          
          let rtMat: number;
          let rtLab: number;
          let rtTot: number;
          
          if (recalcSource.length > 0) {
            // ── INVOICE-ALIGNED KEYWORD CLASSIFICATION (realtime) ──
            // Must match initial-load logic and generate-invoice edge function exactly
            const rtIsLaborByKeyword = (desc: string): boolean => {
              const d = desc.toLowerCase();
              return d.includes('labor') || d.includes('installation') || d.includes('preparation') ||
                d.includes('cleanup') || d.includes('grinding') ||
                d.includes('floor preparation') || d.includes('prep work') || d.includes('site prep');
            };
            const rtIsDemoByKeyword = (desc: string): boolean => {
              const d = desc.toLowerCase();
              return d.includes('demolition') || d.includes('demo ') || d.includes('removal');
            };
            
            rtMat = 0;
            rtLab = 0;
            let rtDemo = 0;
            for (const item of recalcSource) {
              const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) || Number(item.total) || Number(item.totalPrice) || 0;
              const desc = item.description || item.name || '';
              if (rtIsDemoByKeyword(desc)) {
                rtDemo += itemTotal;
              } else if (rtIsLaborByKeyword(desc)) {
                rtLab += itemTotal;
              } else {
                rtMat += itemTotal;
              }
            }
            rtTot = rtMat + rtLab;
            console.log('[Stage8] ✓ Financials recalculated from items (realtime):', { rtMat, rtLab, rtDemo, rtTot, source: liveLineItems.length > 0 ? 'line_items' : 'template_items', itemCount: recalcSource.length });
          } else {
            // Fallback to stored cost fields
            rtMat = updated.material_cost ?? 0;
            rtLab = updated.labor_cost ?? 0;
            rtTot = updated.total_cost ?? (rtMat + rtLab);
          }
          
          setFinancialSummary({ material_cost: rtMat, labor_cost: rtLab, total_cost: rtTot });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);
  
  // ✓ REALTIME: Unread chat message counter for Team panel badge
  useEffect(() => {
    if (!projectId) return;
    
    // Fetch initial count of recent messages (last seen = now on mount)
    lastSeenChatRef.current = new Date().toISOString();
    
    const chatChannel = supabase
      .channel(`chat-unread-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const msg = payload.new as { user_id: string };
          // Only count messages from OTHER users
          if (msg.user_id !== userId) {
            // If the team panel is currently active, don't increment
            if (activeOrbitalPanel === 'panel-4-team') {
              lastSeenChatRef.current = new Date().toISOString();
            } else {
              setUnreadChatCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [projectId, userId]);
  
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
       setUnreadChatCount(0);
       lastSeenChatRef.current = new Date().toISOString();
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
  
  // Start editing a field
  const startEditing = useCallback((fieldId: string, currentValue: string) => {
    if (!canEdit) return;
    // ── GFA IMMUTABILITY GUARD: Block edit UI for immutable citations ──
    const targetCitation = citations.find(c => c.id === fieldId);
    if (targetCitation && IMMUTABLE_CITATION_TYPES.includes(targetCitation.cite_type)) {
      toast.error("GFA cannot be modified mid-project. Please create a new project if the area has changed.");
      return;
    }
    setEditingField(fieldId);
    setEditValue(currentValue);
  }, [canEdit, citations]);

  // Gate material edits through owner lock
  const requestSaveWithLock = useCallback(() => {
    if (!editingField) return;
    // Check if the edited field is a material/financial citation
    const editedCitation = citations.find(c => c.id === editingField);
    const isMaterialField = editedCitation && ['TEMPLATE_LOCK', 'GFA_LOCK', 'DEMOLITION_PRICE', 'MATERIAL_OVERRIDE'].includes(editedCitation.cite_type);
    if (isMaterialField && userRole === 'owner') {
      setOwnerLockAction('material_edit');
      setOwnerLockOpen(true);
      return;
    }
    // Non-material edits proceed directly
    saveEdit();
  }, [editingField, citations, userRole]);
  
  // ── IMMUTABLE CITATION TYPES: Cannot be edited mid-project ──
  const IMMUTABLE_CITATION_TYPES = ['GFA_LOCK'];

  // Save edited field
  const saveEdit = useCallback(async () => {
    if (!editingField || !editValue) return;
    
    // ── GFA IMMUTABILITY GUARD ──
    const editedCitation = citations.find(c => c.id === editingField);
    if (editedCitation && IMMUTABLE_CITATION_TYPES.includes(editedCitation.cite_type)) {
      toast.error("GFA cannot be modified mid-project. Please create a new project if the area has changed.");
      setEditingField(null);
      setEditValue('');
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedCitations = citations.map(c => {
        if (c.id === editingField) {
          return { ...c, answer: editValue, value: editValue };
        }
        return c;
      });
      
      const { error } = await supabase
        .from('project_summaries')
        .update({ verified_facts: updatedCitations as any })
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      setCitations(updatedCitations);
      toast.success('Updated successfully');
    } catch (err) {
      console.error('[Stage8] Failed to save:', err);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setEditValue('');
    }
  }, [editingField, editValue, citations, projectId]);
  
  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);
  
  // ✓ Download document from storage
  const handleDownloadDocument = useCallback(async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(filePath);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded: ${fileName}`);
    } catch (err) {
      console.error('[Stage8] Download failed:', err);
      toast.error('Failed to download file');
    }
  }, []);
  
  // ✓ Get signed URL for document preview (bucket is private)
  const getDocumentPreviewUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry
      if (error || !data?.signedUrl) {
        console.error('[Stage8] Failed to create preview signed URL:', error);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error('[Stage8] Preview URL error:', err);
      return null;
    }
  }, []);
  
  // ✓ Get signed URL for document sharing (long expiry for message attachments)
  const getDocumentSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      // Create signed URL with 1 year expiry for shared documents
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 365 days
      
      if (error || !data?.signedUrl) {
        console.error('[Stage8] Failed to create signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (err) {
      console.error('[Stage8] Signed URL error:', err);
      return null;
    }
  }, []);
  
  // ✓ Send document via email
  const handleSendDocument = useCallback(async (doc: { file_name: string; file_path: string }) => {
    if (!clientEmail) {
      toast.error('Please enter client email first');
      return;
    }
    
    setIsSendingDocument(true);
    try {
      const publicUrl = getDocumentPreviewUrl(doc.file_path);
      
      const response = await supabase.functions.invoke('send-contract-email', {
        body: {
          recipientEmail: clientEmail,
          recipientName: clientName || 'Client',
          subject: `Document: ${doc.file_name}`,
          projectName: projectData?.name || 'Project',
          documentUrl: publicUrl,
          documentName: doc.file_name,
        }
      });
      
      if (response.error) throw response.error;
      
      toast.success(`Document sent to ${clientEmail}`);
      setPreviewDocument(null);
    } catch (err) {
      console.error('[Stage8] Send document failed:', err);
      toast.error('Failed to send document');
    } finally {
      setIsSendingDocument(false);
    }
  }, [clientEmail, clientName, projectData, getDocumentPreviewUrl]);
  
  // ✓ Send contract to multiple recipients
  const handleSendContractToMultiple = useCallback(async () => {
    if (!selectedContractForEmail) {
      toast.error('No contract selected');
      return;
    }
    
    const validRecipients = contractRecipients.filter(r => r.email && r.email.includes('@'));
    if (validRecipients.length === 0) {
      toast.error('Please add at least one valid email recipient');
      return;
    }
    
    setIsSendingToMultiple(true);
    try {
      // Get the contract's share token
      const { data: contract } = await supabase
        .from('contracts')
        .select('share_token, contractor_name')
        .eq('id', selectedContractForEmail.id)
        .single();
      
      if (!contract?.share_token) {
        toast.error('Contract share link not found');
        return;
      }
      
      const contractUrl = `${window.location.origin}/contract/sign?token=${contract.share_token}`;
      
      // Send to each recipient
      const results = await Promise.allSettled(
        validRecipients.map(recipient => 
          supabase.functions.invoke('send-contract-email', {
            body: {
              clientEmail: recipient.email,
              clientName: recipient.name || 'Client',
              contractorName: contract.contractor_name || 'Contractor',
              projectName: projectData?.name || 'Project',
              contractUrl,
              totalAmount: selectedContractForEmail.total_amount,
              contractId: selectedContractForEmail.id,
            }
          })
        )
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (failCount === 0) {
        toast.success(`Contract sent to ${successCount} recipient${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Sent to ${successCount}, failed for ${failCount}`);
      } else {
        toast.error('Failed to send contract');
      }
      
      // Update sent_to_client_at timestamp
      await supabase
        .from('contracts')
        .update({ sent_to_client_at: new Date().toISOString() })
        .eq('id', selectedContractForEmail.id);
      
      setShowContractEmailDialog(false);
      setSelectedContractForEmail(null);
      setContractRecipients([{ email: '', name: '' }]);
    } catch (err) {
      console.error('[Stage8] Send to multiple failed:', err);
      toast.error('Failed to send contract');
    } finally {
      setIsSendingToMultiple(false);
    }
  }, [selectedContractForEmail, contractRecipients, projectData]);
  
  // Update task checklist item — persists status changes to DB + generates citations for DNA tracking
  const updateChecklistItem = useCallback(async (taskId: string, checklistItemId: string, done: boolean) => {
    // For verification photo: don't allow manual check — must upload a photo
    if (checklistItemId.includes('-verify')) {
      if (done) {
        toast.info('Upload a verification photo using the 📷 button to verify this task');
        return;
      }
      // Allow unchecking — but verification stays based on citations
      return;
    }
    
    // For start/complete items, persist to DB
    const isStartItem = checklistItemId.includes('-start');
    const isCompleteItem = checklistItemId.includes('-complete');
    
    let newStatus: string | null = null;
    if (isCompleteItem && done) {
      newStatus = 'completed';
    } else if (isCompleteItem && !done) {
      newStatus = 'in_progress';
    } else if (isStartItem && done) {
      newStatus = 'in_progress';
    } else if (isStartItem && !done) {
      newStatus = 'pending';
    }
    
    // Get task info for citation metadata
    const taskInfo = tasks.find(t => t.id === taskId);
    const memberName = teamMembers.find(m => m.userId === (taskInfo?.assigned_to || userId))?.name || 'Unknown';
    
    // Update local state
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: newStatus || task.status,
          checklist: task.checklist.map(item => 
            item.id === checklistItemId ? { ...item, done } : item
          ),
        };
      }
      return task;
    }));
    
    // Persist to DB
    if (newStatus) {
      try {
        const { error } = await supabase
          .from('project_tasks')
          .update({ status: newStatus })
          .eq('id', taskId);
        if (error) throw error;
        console.log(`[Stage8] ✓ Task ${taskId} status → ${newStatus}`);
        
        // ✓ Generate citation for DNA visual analysis tracking
        if (done && taskInfo) {
          const citeType = isStartItem ? 'TASK_STARTED' : 'TASK_COMPLETED';
          const eventLabel = isStartItem ? 'started' : 'completed';
          const now = new Date().toISOString();
          
          const progressCitation: Citation = {
            id: `cite_${citeType.toLowerCase()}_${taskId}_${Date.now()}`,
            cite_type: citeType as any,
            question_key: 'task_progress',
            answer: `${taskInfo.title} ${eventLabel} by ${memberName}`,
            value: taskId,
            timestamp: now,
            metadata: {
              taskId,
              taskTitle: taskInfo.title,
              phase: taskInfo.phase,
              eventType: eventLabel,
              performedBy: taskInfo.assigned_to || userId,
              performedByName: memberName,
              eventTimestamp: now,
            },
          };
          
          setCitations(prev => {
            const updated = [...prev, progressCitation];
            // Persist citations to project_summaries for DNA analysis
            supabase
              .from('project_summaries')
              .update({ verified_facts: updated as any })
              .eq('project_id', projectId)
              .then(({ error: persistErr }) => {
                if (persistErr) console.error('[Stage8] Failed to persist task citation:', persistErr);
                else console.log(`[Stage8] ✓ ${citeType} citation persisted for "${taskInfo.title}"`);
              });
            return updated;
          });
        }
      } catch (err) {
        console.error('[Stage8] Failed to update task status:', err);
        toast.error('Failed to save task status');
      }
    }
  }, [tasks, teamMembers, userId, projectId]);
  
  // Confirm task completion — called from dialog (with or without photo)
  const confirmTaskCompletion = useCallback(async (taskId: string) => {
    const newStatus = 'completed';
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (error) throw error;
      
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      // Generate TASK_COMPLETED citation for DNA tracking
      const taskInfo = tasks.find(t => t.id === taskId);
      if (taskInfo) {
        const memberName = teamMembers.find(m => m.userId === taskInfo.assigned_to)?.name || 'Unknown';
        const now = new Date().toISOString();
        const progressCitation: Citation = {
          id: `cite_task_completed_${taskId}_${Date.now()}`,
          cite_type: 'TASK_COMPLETED' as any,
          question_key: 'task_progress',
          answer: `${taskInfo.title} completed by ${memberName}`,
          value: taskId,
          timestamp: now,
          metadata: {
            taskId,
            taskTitle: taskInfo.title,
            phase: taskInfo.phase,
            eventType: 'completed',
            performedBy: taskInfo.assigned_to || userId,
            performedByName: memberName,
            eventTimestamp: now,
          },
        };
        setCitations(prev => {
          const updated = [...prev, progressCitation];
          supabase
            .from('project_summaries')
            .update({ verified_facts: updated as any })
            .eq('project_id', projectId)
            .then(({ error: persistErr }) => {
              if (persistErr) console.error('[Stage8] Failed to persist task citation:', persistErr);
              else console.log(`[Stage8] ✓ TASK_COMPLETED citation for "${taskInfo.title}"`);
            });
          return updated;
        });
      }
      
      toast.success(`Task "${taskInfo?.title || ''}" completed ✓`);
    } catch (err) {
      console.error('[Stage8] Failed to complete task:', err);
      toast.error('Failed to complete task');
    }
  }, [tasks, teamMembers, userId, projectId]);
  
  // Update task assignee
  const updateTaskAssignee = useCallback(async (taskId: string, assigneeId: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ assigned_to: assigneeId })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, assigned_to: assigneeId } : task
      ));
      
      toast.success('Assignee updated');
    } catch (err) {
      console.error('[Stage8] Failed to update assignee:', err);
      toast.error('Failed to update assignee');
    }
  }, []);
  
  // Handle file upload - auto-categorize images to Visual
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    const canUpload = userRole === 'owner' || userRole === 'foreman' || userRole === 'subcontractor' || userRole === 'worker' || userRole === 'inspector' || userRole === 'supplier';
    if (!files || files.length === 0 || !canUpload) return;
    
    setIsUploading(true);
    try {
      const newCitations: Citation[] = [];
      
      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${projectId}/${fileName}`;
        
        // ✓ AUTO-CATEGORIZE: Images always go to Visual
        const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|svg)$/i);
        const finalCategory: DocumentCategory = isImage ? 'visual' : selectedUploadCategory;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Create document record
        const { data: docRecord, error: insertError } = await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            ai_analysis_status: 'pending',
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        // ── INSTANT AI CLASSIFICATION — fire-and-forget, updates local state when done ──
        const docId = docRecord.id;
        supabase.functions.invoke('classify-document', {
          body: { documentId: docId, fileName: file.name, filePath, mimeType: file.type },
        }).then(({ data: classifyResult }) => {
          if (classifyResult?.success) {
            console.log(`[Stage8] ✓ AI classified "${file.name}": ${classifyResult.ai_analysis_status} (${classifyResult.doc_type})`);
            // Update local document state with classification result
            setDocuments(prev => prev.map(d => 
              d.id === docId 
                ? { 
                    ...d, 
                    ai_analysis_status: classifyResult.ai_analysis_status,
                    ai_analysis_result: {
                      is_regulatory: classifyResult.is_regulatory,
                      doc_type: classifyResult.doc_type,
                      confidence: classifyResult.confidence,
                      key_details: classifyResult.key_details,
                    },
                  } 
                : d
            ));
            // Show toast for rejected documents
            if (classifyResult.ai_analysis_status === 'rejected_non_regulatory') {
              toast.error(`⚠ "${file.name}" rejected — ${classifyResult.doc_type}`, { duration: 6000 });
            } else {
              toast.success(`✓ "${file.name}" verified: ${classifyResult.doc_type}`, { duration: 4000 });
            }
          }
        }).catch(err => {
          console.warn('[Stage8] Classification failed for', file.name, err);
        });
        
        // ✓ Determine citation type based on category
        const getCiteType = (cat: DocumentCategory): string => {
          switch (cat) {
            case 'visual': return 'SITE_PHOTO';
            case 'verification': return 'VISUAL_VERIFICATION';
            case 'technical': return 'BLUEPRINT_UPLOAD';
            case 'legal': return 'BLUEPRINT_UPLOAD'; // legal docs as technical for now
            default: return 'SITE_PHOTO';
          }
        };
        
        // ✓ Get human-readable category label
        const getCategoryLabel = (cat: DocumentCategory): string => {
          const categoryInfo = DOCUMENT_CATEGORIES.find(c => c.key === cat);
          return categoryInfo?.label || cat;
        };
        
        // Create citation for cross-panel sync with CATEGORY info
        const newCitation: Citation = {
          id: `doc-${docRecord.id}`,
          cite_type: getCiteType(finalCategory) as any,
          question_key: 'document_upload',
          answer: `Uploaded: ${file.name}`,
          value: filePath,
          timestamp: new Date().toISOString(),
          metadata: {
            category: finalCategory,
            categoryLabel: getCategoryLabel(finalCategory),
            fileName: file.name,
            fileSize: file.size,
            uploadedBy: userId,
          },
        };
        
        newCitations.push(newCitation);
        
        // Add to local state with auto-determined category
        const newDoc: DocumentWithCategory = {
          id: docRecord.id,
          file_name: file.name,
          file_path: filePath,
          category: finalCategory,
          citationId: newCitation.id,
          uploadedAt: new Date().toISOString(),
        };
        
        setDocuments(prev => [...prev, newDoc]);
      }
      
      // Update citations state and persist to Supabase
      if (newCitations.length > 0) {
        setCitations(prev => {
          const updated = [...prev, ...newCitations];
          
          // ✓ PERSIST: Save citations to project_summaries
          supabase
            .from('project_summaries')
            .update({ verified_facts: updated as any })
            .eq('project_id', projectId)
            .then(({ error }) => {
              if (error) console.error('[Stage8] Failed to persist citations:', error);
              else console.log('[Stage8] ✓ Citations persisted to Supabase');
            });
          
          return updated;
        });
      }
      
      toast.success(`Uploaded ${files.length} file(s) - ${newCitations.filter(c => c.metadata?.category === 'visual').length} images added to Visual`);
    } catch (err) {
      console.error('[Stage8] Upload failed:', err);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [projectId, selectedUploadCategory, canEdit]);
  
  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);
  
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
        
        {panel.id === 'panel-6-documents' && (() => {
          const fsCatColors = [
            { border: 'border-cyan-200 dark:border-cyan-700/30', bg: 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/20', text: 'text-cyan-700 dark:text-cyan-300', icon: 'bg-cyan-100 dark:bg-cyan-900/50', iconText: 'text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
            { border: 'border-violet-200 dark:border-violet-700/30', bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20', text: 'text-violet-700 dark:text-violet-300', icon: 'bg-violet-100 dark:bg-violet-900/50', iconText: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
            { border: 'border-emerald-200 dark:border-emerald-700/30', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
            { border: 'border-amber-200 dark:border-amber-700/30', bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20', text: 'text-amber-700 dark:text-amber-300', icon: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
          ];

          return (
            <div className="space-y-6">
              {/* ─── Header (compact, no redundant upload) ─── */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h4 className="text-sm font-bold text-sky-700 dark:text-sky-300">Document Vault</h4>
                </div>
                {(userRole === 'owner' || userRole === 'foreman') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                )}
              </div>

              {/* ─── Summary line ─── */}
              <p className="text-[10px] text-sky-500 dark:text-sky-400 font-mono px-1">{documents.length} files · {contracts.length} contracts</p>

              {/* ─── Documents Grid ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_CATEGORIES.map((cat, catIdx) => {
                  const categoryDocs = documents.filter(d => d.category === cat.key);
                  const fsColors = fsCatColors[catIdx % fsCatColors.length];
                  const fsPanelCitations = getCitationsForPanel(['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION']);
                  
                  return (
                    <div key={cat.key} className={cn(
                      "rounded-xl border-2 p-4 transition-all",
                      categoryDocs.length > 0 ? `${fsColors.border} ${fsColors.bg}` : "border-dashed border-gray-200 dark:border-gray-700/30 bg-gray-50/30 dark:bg-gray-900/20"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", categoryDocs.length > 0 ? fsColors.icon : "bg-gray-100 dark:bg-gray-800")}>
                            <cat.icon className={cn("h-4 w-4", categoryDocs.length > 0 ? fsColors.iconText : "text-gray-400")} />
                          </div>
                          <div>
                            <h5 className={cn("text-sm font-semibold", categoryDocs.length > 0 ? fsColors.text : "text-gray-400")}>{cat.label}</h5>
                            <p className="text-[10px] text-gray-400">{categoryDocs.length} {categoryDocs.length === 1 ? 'file' : 'files'}</p>
                          </div>
                        </div>
                        {categoryDocs.filter(d => d.citationId).length > 0 && (
                          <Badge variant="outline" className={cn("text-[10px]", fsColors.badge)}>
                            {categoryDocs.filter(d => d.citationId).length} cited
                          </Badge>
                        )}
                      </div>
                      
                      {categoryDocs.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-gray-400 italic">No documents</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {categoryDocs.map(doc => {
                            const isImage = doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            const isPdf = doc.file_name.match(/\.pdf$/i);
                            const matchingCit = fsPanelCitations.find(c => {
                              const fn = c.metadata?.file_name || c.answer;
                              return fn && doc.file_name.toLowerCase().includes(String(fn).toLowerCase().slice(0, 10));
                            });
                            
                            return (
                              <div 
                                key={doc.id} 
                                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/80 dark:bg-white/5 border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-700/30 transition-all group cursor-pointer hover:shadow-sm"
                                onClick={() => setPreviewDocument({
                                  file_name: doc.file_name,
                                  file_path: doc.file_path,
                                  category: doc.category,
                                  citationId: doc.citationId || matchingCit?.id,
                                  uploaded_by_name: doc.uploaded_by_name,
                                  uploaded_by_role: doc.uploaded_by_role,
                                  uploadedAt: doc.uploadedAt,
                                })}
                              >
                                {/* Thumbnail */}
                                <div className="h-12 w-12 rounded-lg flex-shrink-0 overflow-hidden border bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                  {isImage ? (
                                    <SignedImage 
                                      filePath={doc.file_path}
                                      alt={doc.file_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : isPdf ? (
                                    <FileText className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.file_name}</p>
                                  <div className="flex items-center gap-2">
                                    {doc.uploadedAt && <span className="text-[10px] text-gray-400">{doc.uploadedAt}</span>}
                                    {matchingCit && <span className="text-[10px] text-indigo-500 dark:text-indigo-400">{matchingCit.cite_type.replace(/_/g, ' ')}</span>}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewDocument({ file_name: doc.file_name, file_path: doc.file_path, category: doc.category, citationId: doc.citationId || matchingCit?.id, uploaded_by_name: doc.uploaded_by_name, uploaded_by_role: doc.uploaded_by_role, uploadedAt: doc.uploadedAt }); }}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc.file_path, doc.file_name); }}>
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                
                                {(doc.citationId || matchingCit) && (
                                  <Badge variant="outline" className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex-shrink-0 px-1.5">
                                    [{(doc.citationId || matchingCit?.id || '').slice(0, 6)}]
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* ─── Contracts Section ─── */}
              <div className="pt-4 border-t-2 border-indigo-200 dark:border-indigo-700/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <h4 className="text-sm font-bold text-violet-700 dark:text-violet-300">Contracts</h4>
                    <Badge variant="outline" className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{contracts.length}</Badge>
                  </div>
                  {(userRole === 'owner' || userRole === 'foreman') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setContractStep('select_member'); setSelectedContractMember(null); setSelectedContractType(null); setShowContractPreview(true); }}
                      className="gap-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Contract
                    </Button>
                  )}
                </div>
                
                {contracts.length === 0 ? (
                  <div className="p-8 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-700/30 text-center bg-violet-50/30 dark:bg-violet-950/10">
                    <FileCheck className="h-10 w-10 text-violet-300 dark:text-violet-600 mx-auto mb-3" />
                    <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">No contracts yet</p>
                    <p className="text-xs text-violet-400 dark:text-violet-500 mt-1 mb-4">Select a template to create your first contract</p>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setContractStep('select_member'); setSelectedContractMember(null); setSelectedContractType(null); setShowContractPreview(true); }}
                        className="gap-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Contract for Team Member
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {contracts.map(contract => {
                      const statusColorFs = contract.status === 'signed' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : contract.status === 'sent'
                        ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
                      return (
                        <div 
                          key={contract.id} 
                          className="group p-4 rounded-xl border-2 border-violet-200 dark:border-violet-700/30 bg-gradient-to-br from-violet-50/80 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/15 cursor-pointer hover:border-violet-400 hover:shadow-md transition-all"
                          onClick={() => {
                            if (contract.share_token) {
                              window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                            } else {
                              toast.info('Contract preview not available');
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                              <span className="font-semibold text-gray-800 dark:text-gray-200">#{contract.contract_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); if (contract.share_token) window.open(`/contract/sign?token=${contract.share_token}`, '_blank'); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {contract.status !== 'signed' && canEdit && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContractForEmail({ id: contract.id, contract_number: contract.contract_number, total_amount: contract.total_amount, status: contract.status, share_token: contract.share_token });
                                  setContractRecipients([{ email: '', name: '' }]);
                                  setShowContractEmailDialog(true);
                                }}>
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Badge variant="outline" className={cn("text-[10px] border", statusColorFs)}>
                                {contract.status}
                              </Badge>
                            </div>
                          </div>
                          {canViewFinancials && contract.total_amount && (
                            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                              ${contract.total_amount.toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view contract</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* ─── Citations ─── */}
              {panelCitations.length > 0 && (
                <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700/30 space-y-1.5">
                  <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Data Sources</p>
                  {panelCitations.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-700/30 text-xs">
                      <span className="text-indigo-600 dark:text-indigo-400">{c.cite_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-indigo-800 dark:text-indigo-300">{renderCitationValue(c)}</span>
                        <span className="text-[9px] text-indigo-500 dark:text-indigo-500/60 font-mono">cite:[{c.id.slice(0, 6)}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        
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
          
          {/* ═══ AI TERRITORY GRID — 4 Column Engine Layout ═══ */}
          <div className="shrink-0">
            <div className="grid grid-cols-4 gap-4">
              
              {/* ═══ COLUMN 1: GEMINI — Files & Contracts ═══ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0 }}
                className="relative rounded-2xl border border-cyan-400/20 overflow-hidden bg-[#111827]/90 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.12)] hover:shadow-[0_0_25px_rgba(34,211,238,0.2)] hover:border-cyan-400/40 transition-all duration-300"
              >
                {/* Gradient top border */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
                {/* Engine Header */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
                  <motion.div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(34,211,238,0.1))' }}
                    animate={{ boxShadow: ['0 0 8px rgba(34,211,238,0.1)', '0 0 16px rgba(34,211,238,0.25)', '0 0 8px rgba(34,211,238,0.1)'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="text-cyan-400">◆</span>
                  </motion.div>
                  <div>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Gemini</span>
                    <p className="text-[9px] text-orange-400/70">Visual · Weather · Site</p>
                  </div>
                </div>
                {/* Panel Cards */}
                <div className="p-3 space-y-1">
                  {[
                    { panel: PANELS.find(p => p.id === 'panel-6-documents')!, label: 'Files & Contracts', sub: `${documents.length} docs` },
                    { panel: PANELS.find(p => p.id === 'panel-7-weather')!, label: 'Site Log & Weather', sub: weatherData?.temp != null ? `${weatherData.temp}° ${weatherData.condition || ''}` : 'Active' },
                  ].map(({ panel, label, sub }) => {
                    const hasAccess = hasAccessToTier(panel.visibilityTier, panel.id);
                    const isActive = activeOrbitalPanel === panel.id;
                    return (
                      <motion.button
                        key={panel.id}
                        onClick={() => { if (hasAccess) { setActiveOrbitalPanel(panel.id); setSlideOverPanel(panel.id); } }}
                        className={cn(
                          "w-full rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                          "hover:bg-cyan-400/[0.05]",
                          isActive ? "bg-cyan-400/[0.08] border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]" : "border border-transparent",
                          !hasAccess && "opacity-40 cursor-not-allowed"
                        )}
                        whileHover={hasAccess ? { x: 2 } : undefined}
                      >
                        <span className="text-sm font-semibold text-white block truncate">{label}</span>
                        <span className="text-xs text-orange-400/70">{sub}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* ═══ COLUMN 2: GPT — Project Core ═══ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="relative rounded-2xl border border-emerald-400/20 overflow-hidden bg-[#111827]/90 backdrop-blur-md shadow-[0_0_15px_rgba(52,211,153,0.12)] hover:shadow-[0_0_25px_rgba(52,211,153,0.2)] hover:border-emerald-400/40 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
                  <motion.div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))' }}
                    animate={{ boxShadow: ['0 0 8px rgba(52,211,153,0.1)', '0 0 16px rgba(52,211,153,0.25)', '0 0 8px rgba(52,211,153,0.1)'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <span className="text-emerald-400">✦</span>
                  </motion.div>
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">GPT</span>
                    <p className="text-[9px] text-orange-400/70">Core · GFA · Trade · Finance</p>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {(() => {
                    const gptItems = [
                      { panel: PANELS.find(p => p.id === 'panel-1-basics')!, label: 'Project Basics', sub: projectData?.name || '—' },
                      { panel: PANELS.find(p => p.id === 'panel-2-gfa')!, label: 'Area & GFA', sub: (() => { const g = getCitationsForPanel(['GFA_LOCK']).find(c => c.cite_type === 'GFA_LOCK'); return g ? `${parseFloat(g.answer).toLocaleString()} sqft` : '—'; })(), badge: 'GFA' },
                      { panel: PANELS.find(p => p.id === 'panel-3-trade')!, label: 'Trade & Template', sub: (() => { const t = citations.find(c => c.cite_type === 'TRADE_SELECTION'); return t?.answer || '—'; })() },
                      { panel: PANELS.find(p => p.id === 'panel-8-financial')!, label: 'Financial Summary', sub: (() => { if (!canViewFinancials) return '🔒 Owner'; const tot = financialSummary?.total_cost || 0; return tot > 0 ? `$${Math.round(tot).toLocaleString()}` : '—'; })() },
                    ];
                    return gptItems.map(({ panel, label, sub, badge }) => {
                      const hasAccess = hasAccessToTier(panel.visibilityTier, panel.id);
                      const isActive = activeOrbitalPanel === panel.id;
                      return (
                        <motion.button
                          key={panel.id}
                          onClick={() => { if (hasAccess) { setActiveOrbitalPanel(panel.id); setSlideOverPanel(panel.id); } }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                            "hover:bg-emerald-400/[0.05]",
                            isActive ? "bg-emerald-400/[0.08] border border-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.1)]" : "border border-transparent",
                            !hasAccess && "opacity-40 cursor-not-allowed"
                          )}
                          whileHover={hasAccess ? { x: 2 } : undefined}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-white truncate">{label}</span>
                            <span className="text-xs text-orange-400/70 truncate">{sub}</span>
                          </div>
                          {badge && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 shrink-0">
                              {badge}
                            </span>
                          )}
                        </motion.button>
                      );
                    });
                  })()}
                </div>
              </motion.div>

              {/* ═══ COLUMN 3: MESSA/Lovable — Synthesis ═══ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                className="relative rounded-2xl border border-violet-400/20 overflow-hidden bg-[#111827]/90 backdrop-blur-md shadow-[0_0_15px_rgba(167,139,250,0.12)] hover:shadow-[0_0_25px_rgba(167,139,250,0.2)] hover:border-violet-400/40 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
                <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
                  <motion.div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(139,92,246,0.1))' }}
                    animate={{ boxShadow: ['0 0 8px rgba(167,139,250,0.1)', '0 0 16px rgba(167,139,250,0.25)', '0 0 8px rgba(167,139,250,0.1)'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  >
                    <span className="text-violet-400">▲</span>
                  </motion.div>
                  <div>
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">MESSA</span>
                    <p className="text-[9px] text-orange-400/70">DNA · Timeline · Team</p>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {/* DNA Audit */}
                  <motion.button
                    onClick={() => { setActiveOrbitalPanel('messa-deep-audit'); setSlideOverPanel('messa-deep-audit'); }}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                      "hover:bg-violet-400/[0.05]",
                      activeOrbitalPanel === 'messa-deep-audit' ? "bg-violet-400/[0.08] border border-violet-400/30 shadow-[0_0_12px_rgba(167,139,250,0.1)]" : "border border-transparent",
                    )}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-white">DNA Audit</span>
                      <span className="text-xs text-orange-400/70">
                        {(() => {
                          const passCount = [
                            !!citations.find(c => c.cite_type === 'PROJECT_NAME') && !!citations.find(c => c.cite_type === 'LOCATION'),
                            !!citations.find(c => c.cite_type === 'GFA_LOCK'),
                            !!citations.find(c => c.cite_type === 'TRADE_SELECTION') && !!citations.find(c => c.cite_type === 'TEMPLATE_LOCK'),
                            !!citations.find(c => c.cite_type === 'TEAM_STRUCTURE') || teamMembers.length > 0,
                            !!citations.find(c => c.cite_type === 'TIMELINE'),
                            !!citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'BLUEPRINT_UPLOAD'),
                            !!citations.find(c => c.cite_type === 'WEATHER_ALERT' || c.cite_type === 'SITE_CONDITION'),
                            (financialSummary?.total_cost ?? 0) > 0,
                          ].filter(Boolean).length;
                          return `${passCount}/8 Pillars`;
                        })()}
                      </span>
                    </div>
                    <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  </motion.button>
                  
                  {/* Execution Timeline */}
                  <motion.button
                    onClick={() => { setActiveOrbitalPanel('panel-5-timeline'); setSlideOverPanel('panel-5-timeline'); }}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                      "hover:bg-violet-400/[0.05]",
                      activeOrbitalPanel === 'panel-5-timeline' ? "bg-violet-400/[0.08] border border-violet-400/30 shadow-[0_0_12px_rgba(167,139,250,0.1)]" : "border border-transparent",
                    )}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">Timeline</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/15 text-violet-300 border border-violet-400/30">{tasks.length}</span>
                    </div>
                    {/* Mini Gantt */}
                    <div className="space-y-1">
                      {['demolition', 'preparation', 'installation', 'finishing'].map((phase, i) => {
                        const phaseTasks = tasks.filter(t => (t as any).phase === phase || (!t.phase && phase === 'installation'));
                        const completed = phaseTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
                        const pct = Math.round((completed / (phaseTasks.length || 1)) * 100);
                        return (
                          <div key={phase} className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(pct, 6)}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </motion.button>
                  
                  {/* Team Architecture */}
                  {(() => {
                    const teamPanel = PANELS.find(p => p.id === 'panel-4-team')!;
                    const hasAccess = hasAccessToTier(teamPanel.visibilityTier, teamPanel.id);
                    const isActive = activeOrbitalPanel === teamPanel.id;
                    return (
                      <motion.button
                        onClick={() => { if (hasAccess) { setActiveOrbitalPanel(teamPanel.id); setSlideOverPanel(teamPanel.id); } }}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                          "hover:bg-violet-400/[0.05]",
                          isActive ? "bg-violet-400/[0.08] border border-violet-400/30" : "border border-transparent",
                          !hasAccess && "opacity-40 cursor-not-allowed"
                        )}
                        whileHover={hasAccess ? { x: 2 } : undefined}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-white">Team Architecture</span>
                          <span className="text-xs text-orange-400/70">{teamMembers.length} members</span>
                        </div>
                        {unreadChatCount > 0 && !isActive && (
                          <motion.span
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-violet-500 text-white text-[9px] font-bold"
                          >
                            {unreadChatCount > 99 ? '99+' : unreadChatCount}
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })()}
                </div>
              </motion.div>

              {/* ═══ COLUMN 4: CLAUDE/GROK — External ═══ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="relative rounded-2xl border border-red-400/20 overflow-hidden bg-[#111827]/90 backdrop-blur-md shadow-[0_0_15px_rgba(248,113,113,0.12)] hover:shadow-[0_0_25px_rgba(248,113,113,0.2)] hover:border-red-400/40 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
                <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
                  <motion.div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1))' }}
                    animate={{ boxShadow: ['0 0 8px rgba(248,113,113,0.1)', '0 0 16px rgba(248,113,113,0.25)', '0 0 8px rgba(248,113,113,0.1)'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                  >
                    <span className="text-red-400">✚</span>
                  </motion.div>
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Claude / Grok</span>
                    <p className="text-[9px] text-orange-400/70">OBC · Affiliate · External</p>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {/* OBC Compliance Summary — Claude Territory */}
                  <div className="rounded-xl border border-red-500/25 bg-red-900/15 overflow-hidden">
                    <motion.button
                      onClick={() => {
                        setObcSummaryExpanded(prev => !prev);
                        if (!obcComplianceResults.lastCheckedAt && !obcComplianceResults.loading) {
                          runObcComplianceCheck();
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-red-900/30 transition-all duration-200"
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-md bg-red-500/20 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-red-300" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-red-300">OBC Compliance</span>
                          <span className="text-[10px] text-red-300/60 font-medium">
                            {obcComplianceResults.sections.length > 0
                              ? `${obcComplianceResults.sections.length} relevant sections`
                              : 'Building Code Evidence'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {obcComplianceResults.sections.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-200 border border-amber-500/30">
                            Unverified
                          </span>
                        )}
                        {obcSummaryExpanded ? <ChevronUp className="h-4 w-4 text-red-300/70" /> : <ChevronDown className="h-4 w-4 text-red-300/70" />}
                      </div>
                    </motion.button>

                    <AnimatePresence>
                      {obcSummaryExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-1.5 border-t border-red-500/15 space-y-1.5">
                            {obcComplianceResults.loading && (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-300" />
                                <span className="text-xs text-red-300/80 font-medium">Checking OBC sections…</span>
                              </div>
                            )}
                            {obcComplianceResults.error && (
                              <p className="text-xs text-red-300/90 py-1 font-medium">⚠️ {obcComplianceResults.error}</p>
                            )}
                            {obcComplianceResults.sections.slice(0, 5).map((s, i) => {
                              const rel = Math.round((s.relevance_score || 0) * 100);
                              return (
                                <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-black/30 border border-white/5">
                                  <span className="text-[11px] text-gray-200 truncate flex-1 font-medium" title={s.section_title}>
                                    §{s.section_number} — {s.section_title}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Relevance bar */}
                                    <div className="w-10 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full",
                                          rel >= 70 ? "bg-red-400" : rel >= 40 ? "bg-amber-400" : "bg-gray-500"
                                        )}
                                        style={{ width: `${rel}%` }}
                                      />
                                    </div>
                                    <span className={cn("text-[10px] font-bold font-mono",
                                      rel >= 70 ? "text-red-300" : rel >= 40 ? "text-amber-300" : "text-gray-400"
                                    )}>
                                      {rel}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {obcComplianceResults.sections.length > 5 && (
                              <p className="text-[10px] text-gray-400 text-center font-medium">+{obcComplianceResults.sections.length - 5} more sections</p>
                            )}
                            {obcComplianceResults.sections.length === 0 && !obcComplianceResults.loading && !obcComplianceResults.error && (
                              <p className="text-xs text-gray-400 py-1.5 text-center font-medium">No OBC sections found yet</p>
                            )}
                            <div className="flex items-center justify-center gap-1.5 mt-1.5 py-1.5 opacity-70">
                              <img src={engineClaudeImg} alt="Claude" className="w-3.5 h-3.5 rounded-full" />
                              <span className="text-[11px] text-amber-200/80 font-medium">Full report → click the Claude AI icon above</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                   {/* Phase 4: Grok Insights Affiliate Card */}
                   <motion.div
                     className="rounded-xl px-3 py-2.5 border border-amber-500/25 bg-gradient-to-br from-[#0c1a2e]/90 to-[#0d1525]/80 hover:border-amber-400/40 transition-all cursor-pointer group"
                     whileHover={{ scale: 1.01 }}
                     onClick={() => { setGrokInsightsLoading(true); setTimeout(() => setGrokInsightsLoading(false), 1200); setSlideOverPanel('grok-insights'); }}
                   >
                     <div className="flex items-center gap-2 mb-1.5">
                       <img src={engineGrokImg} alt="Grok" className="w-4 h-4 rounded-full" />
                       <span className="text-sm font-semibold text-amber-200 group-hover:text-amber-100 transition-colors">Grok Insights</span>
                       <Badge className="text-[8px] bg-cyan-500/15 text-cyan-300 border-cyan-500/30 px-1.5 py-0 ml-auto">
                         {(() => {
                           const trade = citations.find(c => c.cite_type === 'TRADE_SELECTION')?.answer?.toLowerCase() || '';
                           const hasObcWarnings = obcComplianceResults.sections.length > 0;
                           const count = hasObcWarnings ? Math.min(obcComplianceResults.sections.length + 1, 5) : (trade ? 3 : 1);
                           return `${count} deals`;
                         })()}
                       </Badge>
                     </div>
                     <p className="text-[10px] text-orange-400/70 mb-1.5">Smart Material Recommendations</p>
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-300">Based on your trade + OBC flags</span>
                       <ChevronRight className="h-3.5 w-3.5 text-amber-400/60 group-hover:text-amber-300 transition-colors" />
                     </div>
                   </motion.div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* ═══ AI EXECUTION FLOW — Model Processing Timeline ═══ */}
          {(() => {
            // Derive status for each AI engine step from real project data
            const photoCitsCount = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'BLUEPRINT_UPLOAD' || c.cite_type === 'VISUAL_VERIFICATION').length;
            const hasGFA = !!citations.find(c => c.cite_type === 'GFA_LOCK');
            const hasTrade = !!citations.find(c => c.cite_type === 'TRADE_SELECTION');
            const hasTemplate = !!citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
            const hasObc = obcComplianceResults.sections.length > 0;
            const hasDna = !!citations.find(c => c.cite_type === 'DNA_FINALIZED');
            const hasTeam = !!citations.find(c => c.cite_type === 'TEAM_STRUCTURE') || !!citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');
            const hasContract = !!citations.find(c => c.cite_type === 'CONTRACT');
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
            // Demolition bonus: exclude demolition tasks from denominator if they exist but aren't blocking
            const hasDemolition = !!citations.find(c => c.cite_type === 'DEMOLITION_PRICE') || !!citations.find(c => c.cite_type === 'SITE_CONDITION' && String(c.answer).toLowerCase().includes('demolition'));
            const demolitionTasks = tasks.filter(t => (t as any).phase === 'demolition' || String(t.title || '').toLowerCase().includes('demolition'));
            const nonDemoTotal = totalTasks - demolitionTasks.length;
            const nonDemoCompleted = completedTasks - demolitionTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
            // If demolition exists, calculate based on non-demolition tasks, then add bonus
            const basePct = nonDemoTotal > 0 ? Math.round((nonDemoCompleted / nonDemoTotal) * 100) : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
            const demoBonusPct = hasDemolition && demolitionTasks.length > 0 ? 12 : 0;
            const overallPct = Math.min(100, basePct + demoBonusPct);

            // Each step maps to an AI engine from the top cards
            const getStepStatus = (done: boolean, partial: boolean): 'completed' | 'current' | 'upcoming' => {
              if (done) return 'completed';
              if (partial) return 'current';
              return 'upcoming';
            };

            const aiSteps = [
              {
                engine: 'Gemini',
                title: 'Files Report',
                icon: Sparkles,
                description: photoCitsCount > 0 ? `${photoCitsCount} docs analyzed` : 'Visual intelligence',
                status: getStepStatus(photoCitsCount >= 1, false),
                accent: { from: '#14b8a6', to: '#06b6d4', glow: 'rgba(20,184,166,0.4)' },
                img: engineGeminiImg,
              },
              {
                engine: 'GPT',
                title: 'Data Audit',
                icon: Settings,
                description: hasGFA && hasTrade ? 'GFA + Trade locked' : hasGFA ? 'GFA locked' : 'Core data check',
                status: getStepStatus(hasGFA && hasTrade, hasGFA || hasTrade),
                accent: { from: '#8b5cf6', to: '#a78bfa', glow: 'rgba(139,92,246,0.4)' },
                img: engineGptImg,
              },
              {
                engine: 'Claude',
                title: 'OBC Compliance',
                icon: Brain,
                description: hasObc ? `${obcComplianceResults.sections.length} sections checked` : hasTrade ? 'Ready to audit' : 'Building code audit',
                status: getStepStatus(hasObc, hasTrade),
                accent: { from: '#f97316', to: '#fb923c', glow: 'rgba(249,115,22,0.4)' },
                img: engineClaudeImg,
              },
              {
                engine: 'Lovable',
                title: 'DNA Audit',
                icon: Crown,
                description: hasDna ? 'DNA finalized' : hasTeam ? 'Team set up' : 'Project health',
                status: getStepStatus(hasDna, hasTeam || citations.length > 5),
                accent: { from: '#ec4899', to: '#f472b6', glow: 'rgba(236,72,153,0.4)' },
                img: engineLovableImg,
              },
              {
                engine: 'Grok',
                title: 'Cost Insights',
                icon: Zap,
                description: hasContract ? 'Contract ready' : totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks` : 'Optimization',
                status: getStepStatus(hasContract || overallPct >= 50, totalTasks > 0 || overallPct > 0),
                accent: { from: '#3b82f6', to: '#60a5fa', glow: 'rgba(59,130,246,0.4)' },
                img: engineGrokImg,
              },
            ];

            // MESSA is the synthesis conductor — not counted as an engine
            const messaStep = {
              engine: 'M.E.S.S.A.',
              title: 'Synthesis',
              icon: ShieldCheck,
              description: overallPct === 100 ? '🎉 All done!' : `${overallPct}% overall`,
              status: getStepStatus(overallPct === 100, overallPct >= 50),
              accent: { from: '#10b981', to: '#34d399', glow: 'rgba(16,185,129,0.4)' },
              img: null,
            };

            const allFlowSteps = [...aiSteps, messaStep];
            const completedSteps = aiSteps.filter(s => s.status === 'completed').length;
            const flowPct = Math.round((completedSteps / aiSteps.length) * 100);

            return (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="shrink-0 rounded-2xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(145deg, #0c0f1a 0%, #141831 40%, #1a1040 70%, #0c0f1a 100%)',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 30,
                }}
              >
                {/* Animated top edge glow */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, #14b8a6 15%, #8b5cf6 35%, #f97316 55%, #ec4899 75%, #3b82f6 90%, transparent 100%)' }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Bottom subtle edge */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                {/* Floating particles effect */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 2 + Math.random() * 3,
                      height: 2 + Math.random() * 3,
                      background: ['#14b8a6', '#8b5cf6', '#f97316', '#ec4899', '#3b82f6', '#10b981'][i],
                      left: `${10 + i * 16}%`,
                      top: `${20 + (i % 3) * 25}%`,
                      opacity: 0.15,
                    }}
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                  />
                ))}

                {/* Header with Clock & Timer */}
                <div className="px-4 pt-2 pb-1.5 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="h-7 w-7 rounded-lg flex items-center justify-center border border-purple-400/30"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))' }}
                      animate={{ boxShadow: ['0 0 8px rgba(139,92,246,0.15)', '0 0 20px rgba(139,92,246,0.35)', '0 0 8px rgba(139,92,246,0.15)'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                    </motion.div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">AI Execution Flow</h3>
                      <p className="text-[10px] text-purple-300/70 font-medium">
                        {completedSteps}/{aiSteps.length} engines complete · {flowPct}% pipeline
                      </p>
                    </div>
                  </div>


                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setActiveOrbitalPanel('panel-5-timeline'); setSlideOverPanel('panel-5-timeline'); }}
                    className="h-7 px-2.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 text-[10px] font-semibold gap-1"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Expand
                  </Button>
                </div>

                {/* ═══ DESKTOP: Horizontal AI Flow ═══ */}
                <div className="hidden md:block px-4 pb-3 relative z-10">
                  <div className="relative flex items-start justify-between">
                    {/* Gradient connector line */}
                    <div className="absolute top-[22px] left-[22px] right-[22px] h-[2px] z-0 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-white/[0.04] rounded-full" />
                      <motion.div
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.max(flowPct, 3)}%` }}
                        transition={{ duration: 1.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                      {/* Shimmer on the line */}
                      <motion.div
                        className="absolute top-0 h-full w-[60px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
                        animate={{ left: ['-60px', '110%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 2 }}
                      />
                    </div>

                    {allFlowSteps.map((step, i) => {
                      const StepIcon = step.icon;
                      const isCompleted = step.status === 'completed';
                      const isCurrent = step.status === 'current';

                      return (
                        <TooltipProvider key={step.engine} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.4 + i * 0.12 }}
                                className="flex flex-col items-center relative z-10 flex-1 group cursor-pointer"
                                onClick={() => {
                                  if (i < 5) {
                                    setActiveAiEngine(['gemini-visual', 'gpt-audit', 'claude-obc', 'lovable-dna', 'grok-insights'][i] as AIEngineType);
                                    setAiEngineModalOpen(true);
                                  } else {
                                    setActiveOrbitalPanel('panel-5-timeline');
                                    setSlideOverPanel('panel-5-timeline');
                                  }
                                }}
                              >
                                {/* Circle node */}
                                <motion.div
                                  className="h-11 w-11 rounded-xl flex items-center justify-center relative transition-all duration-300"
                                  style={{
                                    background: isCompleted
                                      ? `linear-gradient(135deg, ${step.accent.from}30, ${step.accent.to}18)`
                                      : isCurrent
                                      ? `linear-gradient(135deg, ${step.accent.from}18, ${step.accent.to}0a)`
                                      : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                    border: isCompleted
                                      ? `2px solid ${step.accent.from}50`
                                      : isCurrent
                                      ? `2px solid ${step.accent.from}30`
                                      : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: isCompleted
                                      ? `0 0 28px ${step.accent.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                                      : isCurrent
                                      ? `0 0 16px ${step.accent.glow.replace('0.4', '0.2')}`
                                      : '0 0 6px rgba(255,255,255,0.02)',
                                  }}
                                  whileHover={{ scale: 1.12, boxShadow: `0 0 36px ${step.accent.glow}` }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                  {/* Engine avatar thumbnail */}
                                  {step.img && (
                                    <img
                                      src={step.img}
                                      alt={step.engine}
                                      className={cn(
                                        "absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity",
                                        isCompleted ? "opacity-15" : isCurrent ? "opacity-10" : "opacity-[0.04]"
                                      )}
                                    />
                                  )}
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400 drop-shadow-lg relative z-10" />
                                  ) : (
                                    <StepIcon
                                      className={cn(
                                        "h-4 w-4 relative z-10 transition-colors",
                                        isCurrent ? 'text-white' : 'text-white/25'
                                      )}
                                      style={isCurrent ? { filter: `drop-shadow(0 0 6px ${step.accent.from})` } : {}}
                                    />
                                  )}

                                  {/* Pulse ring for current */}
                                  {isCurrent && (
                                    <>
                                      <motion.div
                                        className="absolute inset-0 rounded-xl"
                                        style={{ border: `2px solid ${step.accent.from}40` }}
                                        animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                      />
                                      <motion.div
                                        className="absolute inset-0 rounded-xl"
                                        style={{ border: `1px solid ${step.accent.from}20` }}
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                                      />
                                    </>
                                  )}

                                  {/* Glow effect for completed */}
                                  {isCompleted && (
                                    <motion.div
                                      className="absolute inset-0 rounded-2xl pointer-events-none"
                                      animate={{ boxShadow: [`inset 0 0 12px ${step.accent.glow.replace('0.4', '0.1')}`, `inset 0 0 20px ${step.accent.glow.replace('0.4', '0.2')}`, `inset 0 0 12px ${step.accent.glow.replace('0.4', '0.1')}`] }}
                                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                  )}

                                  {/* Step number */}
                                  <span
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{
                                      background: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.06)',
                                      color: isCompleted || isCurrent ? '#fff' : 'rgba(255,255,255,0.25)',
                                      border: `1px solid ${isCompleted || isCurrent ? step.accent.from + '70' : 'rgba(255,255,255,0.08)'}`,
                                      boxShadow: isCompleted ? `0 0 8px ${step.accent.glow}` : 'none',
                                    }}
                                  >
                                    {isCompleted ? '✓' : i + 1}
                                  </span>
                                </motion.div>

                                {/* Engine Label */}
                                <motion.p
                                  className="mt-2.5 text-[10px] font-extrabold tracking-wider uppercase text-center"
                                  style={{
                                    color: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.25)',
                                    textShadow: isCompleted ? `0 0 8px ${step.accent.glow}` : 'none',
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  {step.engine}
                                </motion.p>
                                <p className="text-[11px] font-bold text-amber-300 mt-0.5 text-center">
                                  {step.title}
                                </p>
                                <p className={cn(
                                  "text-[9px] mt-0.5 text-center max-w-[85px] font-medium",
                                  isCompleted ? 'text-amber-200/70' : isCurrent ? 'text-amber-300/60' : 'text-white/35'
                                )}>
                                  {step.description}
                                </p>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="text-xs bg-[#1a1f36] border-white/10 text-white/80 max-w-[200px]"
                            >
                              <p className="font-bold" style={{ color: step.accent.from }}>{step.engine} — {step.title}</p>
                              <p className="text-white/50 mt-0.5">{step.description}</p>
                              <p className="text-white/30 mt-1 text-[10px]">
                                {isCompleted ? '✅ Complete' : isCurrent ? '🔄 In Progress' : '⏳ Pending'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>

                  {/* Overall progress bar */}
                  <div className="mt-5 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.18em]">Pipeline Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/50">{completedSteps}/{aiSteps.length}</span>
                        <span className="text-[12px] font-extrabold" style={{
                          background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #ec4899)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}>{flowPct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{ background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(flowPct, 2)}%` }}
                        transition={{ duration: 1.5, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                      {/* Shimmer on progress bar */}
                      <motion.div
                        className="absolute top-0 h-full w-[40px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
                        animate={{ left: ['-40px', '100%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 3 }}
                      />
                    </div>
                  </div>
                </div>

                {/* ═══ MOBILE: Vertical AI Flow ═══ */}
                <div className="md:hidden px-4 pb-4 relative z-10">
                  <div className="relative">
                    {/* Vertical gradient connector */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-[3px] rounded-full overflow-hidden z-0">
                      <div className="w-full h-full bg-white/[0.04]" />
                      <motion.div
                        className="absolute top-0 w-full rounded-full"
                        style={{ background: 'linear-gradient(180deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
                        initial={{ height: '0%' }}
                        animate={{ height: `${Math.max(flowPct, 3)}%` }}
                        transition={{ duration: 1.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                    </div>

                    <div className="space-y-2.5">
                      {allFlowSteps.map((step, i) => {
                        const StepIcon = step.icon;
                        const isCompleted = step.status === 'completed';
                        const isCurrent = step.status === 'current';

                        return (
                          <motion.div
                            key={step.engine}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                            className="flex items-center gap-3 relative z-10 cursor-pointer"
                            onClick={() => {
                              if (i < 5) {
                                setActiveAiEngine(['gemini-visual', 'gpt-audit', 'claude-obc', 'lovable-dna', 'grok-insights'][i] as AIEngineType);
                                setAiEngineModalOpen(true);
                              }
                            }}
                          >
                            {/* Node */}
                            <motion.div
                              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
                              style={{
                                background: isCompleted
                                  ? `linear-gradient(135deg, ${step.accent.from}28, ${step.accent.to}14)`
                                  : isCurrent
                                  ? `linear-gradient(135deg, ${step.accent.from}14, ${step.accent.to}08)`
                                  : 'rgba(255,255,255,0.02)',
                                border: isCompleted
                                  ? `2px solid ${step.accent.from}45`
                                  : isCurrent
                                  ? `1.5px solid ${step.accent.from}30`
                                  : '1px solid rgba(255,255,255,0.06)',
                                boxShadow: isCompleted ? `0 0 16px ${step.accent.glow}` : isCurrent ? `0 0 10px ${step.accent.glow.replace('0.4', '0.15')}` : 'none',
                              }}
                              whileHover={{ scale: 1.08 }}
                            >
                              {step.img && (
                                <img src={step.img} alt="" className={cn("absolute inset-0 w-full h-full object-cover rounded-xl", isCompleted ? "opacity-10" : "opacity-[0.04]")} />
                              )}
                              {isCompleted ? (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 relative z-10" />
                              ) : (
                                <StepIcon className={cn("h-4 w-4 relative z-10", isCurrent ? 'text-white' : 'text-white/20')} style={isCurrent ? { filter: `drop-shadow(0 0 4px ${step.accent.from})` } : {}} />
                              )}
                              {isCurrent && (
                                <motion.div
                                  className="absolute inset-0 rounded-xl"
                                  style={{ border: `1.5px solid ${step.accent.from}30` }}
                                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                            </motion.div>
                            {/* Card */}
                            <div className={cn(
                              "flex-1 rounded-xl px-3 py-2 border transition-all",
                              isCompleted ? "bg-white/[0.03]" : isCurrent ? "bg-white/[0.02]" : "bg-white/[0.01]"
                            )} style={{
                              borderColor: isCompleted ? step.accent.from + '35' : isCurrent ? step.accent.from + '20' : 'rgba(255,255,255,0.04)',
                            }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: isCompleted || isCurrent ? step.accent.from : 'rgba(255,255,255,0.3)' }}>
                                    {step.engine}
                                  </span>
                                  <span className="text-[11px] font-bold text-amber-300">
                                    {step.title}
                                  </span>
                                </div>
                                <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full")}
                                  style={{
                                    background: isCompleted ? step.accent.from + '18' : isCurrent ? step.accent.from + '10' : 'rgba(255,255,255,0.03)',
                                    color: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.2)',
                                    border: `1px solid ${isCompleted ? step.accent.from + '30' : isCurrent ? step.accent.from + '18' : 'rgba(255,255,255,0.06)'}`,
                                  }}
                                >
                                  {isCompleted ? '✓ Done' : isCurrent ? '● Active' : 'Pending'}
                                </span>
                              </div>
                              <p className={cn("text-[10px] mt-0.5 font-medium", isCompleted ? 'text-amber-200/60' : isCurrent ? 'text-amber-300/50' : 'text-white/20')}>
                                {step.description}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile progress */}
                  <div className="mt-3 pt-2 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-white/35 uppercase tracking-widest">Pipeline</span>
                      <span className="text-[11px] font-extrabold" style={{
                        background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>{flowPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(flowPct, 2)}%` }}
                        transition={{ duration: 1.2, delay: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}


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

        {/* ═══ Mobile Layout ═══ */}
        <div className="flex flex-col lg:hidden h-full p-2 gap-1.5 relative" style={{ overflow: 'hidden' }}>
          {/* ─── Mobile Engine Territory Grid ─── */}
          <div className="grid grid-cols-2 gap-1.5 shrink-0 overflow-hidden" style={{ maxHeight: '38%' }}>
            {/* Gemini Territory */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0 }}
              className="relative rounded-xl border border-cyan-400/25 overflow-hidden bg-[#111827]/90 backdrop-blur-md"
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <div className="px-2 pt-2 pb-1 flex items-center gap-1.5 border-b border-white/5">
                <img src={engineGeminiImg} alt="" className="w-3.5 h-3.5 rounded-full" />
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Gemini</span>
              </div>
              <div className="p-1 space-y-0">
                {[
                  { panel: PANELS.find(p => p.id === 'panel-6-documents')!, label: 'Files', sub: `${documents.length} docs` },
                  { panel: PANELS.find(p => p.id === 'panel-7-weather')!, label: 'Site Log', sub: weatherData?.temp != null ? `${weatherData.temp}°` : '—' },
                ].map(({ panel, label, sub }) => {
                  const hasAccess = hasAccessToTier(panel.visibilityTier, panel.id);
                  const isActive = activeOrbitalPanel === panel.id;
                  return (
                    <button
                      key={panel.id}
                      onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs",
                        isActive ? "bg-cyan-400/[0.1] border border-cyan-400/30" : "border border-transparent hover:bg-cyan-400/[0.04]",
                        !hasAccess && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span className="font-semibold text-white truncate">{label}</span>
                      <span className="text-[10px] font-bold text-cyan-300 shrink-0 ml-1">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* GPT Territory */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="relative rounded-xl border border-emerald-400/25 overflow-hidden bg-[#111827]/90 backdrop-blur-md"
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              <div className="px-2 pt-2 pb-1 flex items-center gap-1.5 border-b border-white/5">
                <img src={engineGptImg} alt="" className="w-3.5 h-3.5 rounded-full" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">GPT</span>
              </div>
              <div className="p-1 space-y-0">
                {[
                  { panel: PANELS.find(p => p.id === 'panel-1-basics')!, label: 'Basics', sub: projectData?.name?.slice(0, 8) || '—' },
                  { panel: PANELS.find(p => p.id === 'panel-2-gfa')!, label: 'GFA', sub: (() => { const g = getCitationsForPanel(['GFA_LOCK']).find(c => c.cite_type === 'GFA_LOCK'); return g ? `${parseFloat(g.answer).toLocaleString()}` : '—'; })() },
                  { panel: PANELS.find(p => p.id === 'panel-3-trade')!, label: 'Trade', sub: (() => { const t = citations.find(c => c.cite_type === 'TRADE_SELECTION'); return t?.answer?.slice(0, 8) || '—'; })() },
                  { panel: PANELS.find(p => p.id === 'panel-8-financial')!, label: 'Finance', sub: (() => { if (!canViewFinancials) return '🔒'; const tot = financialSummary?.total_cost || 0; return tot > 0 ? `$${Math.round(tot/1000)}k` : '—'; })() },
                ].map(({ panel, label, sub }) => {
                  const hasAccess = hasAccessToTier(panel.visibilityTier, panel.id);
                  const isActive = activeOrbitalPanel === panel.id;
                  return (
                    <button
                      key={panel.id}
                      onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs",
                        isActive ? "bg-emerald-400/[0.1] border border-emerald-400/30" : "border border-transparent hover:bg-emerald-400/[0.04]",
                        !hasAccess && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span className="font-semibold text-white truncate">{label}</span>
                      <span className="text-[10px] font-bold text-emerald-300 shrink-0 ml-1">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* MESSA Territory */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="relative rounded-xl border border-violet-400/25 overflow-hidden bg-[#111827]/90 backdrop-blur-md flex flex-col"
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
              <div className="px-2 pt-2 pb-1 flex items-center gap-1.5 border-b border-white/5 shrink-0">
                <img src={engineLovableImg} alt="" className="w-3.5 h-3.5 rounded-full" />
                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">MESSA</span>
              </div>
              <div className="p-1 space-y-0 min-h-0 overflow-hidden">
                <button
                  onClick={() => setActiveOrbitalPanel('messa-deep-audit')}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs",
                    activeOrbitalPanel === 'messa-deep-audit' ? "bg-violet-400/[0.1] border border-violet-400/30" : "border border-transparent hover:bg-violet-400/[0.04]"
                  )}
                >
                  <span className="font-semibold text-white">DNA Audit</span>
                  <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
                </button>
                {(() => {
                  const timelinePanel = PANELS.find(p => p.id === 'panel-5-timeline')!;
                  const teamPanel = PANELS.find(p => p.id === 'panel-4-team')!;
                  return (
                    <div className="flex gap-1">
                      <button
                        onClick={() => hasAccessToTier(timelinePanel.visibilityTier, timelinePanel.id) && setActiveOrbitalPanel(timelinePanel.id)}
                        className={cn(
                          "flex-1 flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs",
                          activeOrbitalPanel === timelinePanel.id ? "bg-violet-400/[0.1] border border-violet-400/30" : "border border-transparent hover:bg-violet-400/[0.04]"
                        )}
                      >
                        <span className="font-semibold text-white text-[10px]">Timeline</span>
                        <span className="text-[9px] font-bold text-violet-300">{tasks.length}</span>
                      </button>
                      <button
                        onClick={() => hasAccessToTier(teamPanel.visibilityTier, teamPanel.id) && setActiveOrbitalPanel(teamPanel.id)}
                        className={cn(
                          "flex-1 flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs",
                          activeOrbitalPanel === teamPanel.id ? "bg-violet-400/[0.1] border border-violet-400/30" : "border border-transparent hover:bg-violet-400/[0.04]"
                        )}
                      >
                        <span className="font-semibold text-white text-[10px]">Team</span>
                        <span className="text-[9px] font-bold text-violet-300">{teamMembers.length}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>

            {/* Claude / Grok Territory */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="relative rounded-xl border border-red-400/25 overflow-hidden bg-[#111827]/90 backdrop-blur-md"
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
              <div className="px-2 pt-2 pb-1 flex items-center gap-1.5 border-b border-white/5">
                <img src={engineClaudeImg} alt="" className="w-3.5 h-3.5 rounded-full" />
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Claude / Grok</span>
              </div>
              <div className="p-1 space-y-0">
                <button
                  onClick={() => {
                    if (!obcComplianceResults.lastCheckedAt && !obcComplianceResults.loading) runObcComplianceCheck();
                    setActiveOrbitalPanel('panel-3-trade');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs",
                    "border border-transparent hover:bg-red-400/[0.04]"
                  )}
                >
                  <span className="font-semibold text-white">OBC</span>
                  <span className="text-[10px] font-bold text-red-300 shrink-0">
                    {obcComplianceResults.sections.length > 0 ? `${obcComplianceResults.sections.length}§` : '—'}
                  </span>
                </button>
                <button
                  onClick={() => { setGrokInsightsLoading(true); setTimeout(() => setGrokInsightsLoading(false), 1200); setSlideOverPanel('grok-insights'); }}
                  className="w-full flex items-center justify-between rounded-md px-2 py-1 text-left transition-all text-xs border border-transparent hover:bg-amber-400/[0.04]"
                >
                  <div className="flex items-center gap-1">
                    <img src={engineGrokImg} alt="" className="w-3 h-3 rounded-full" />
                    <span className="font-semibold text-amber-200">Grok</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-amber-400/50 shrink-0" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Knight Rider mobile sweep line */}
          <div className="h-[2px] rounded-full overflow-hidden relative shrink-0">
            <div className="w-full h-full bg-white/[0.03]" />
            <motion.div
              className="absolute top-0 h-full w-1/4 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), rgba(139,92,246,0.6), transparent)' }}
              animate={{ left: ['-25%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Mobile canvas content */}
          <div className="flex-[3] min-h-0 rounded-xl border border-cyan-400/20 overflow-hidden flex flex-col shadow-[0_0_15px_rgba(34,211,238,0.08)] dark" style={{ background: '#0a1628', colorScheme: 'dark' }}>
            <style>{`
.mcv-dark { background: #0a1628 !important; }
.mcv-dark *, .mcv-dark *::before, .mcv-dark *::after { color: #e2e8f0 !important; border-color: #1e3a5f !important; }
.mcv-dark h1, .mcv-dark h2, .mcv-dark h3, .mcv-dark h4, .mcv-dark h5, .mcv-dark h6 { color: #fbbf24 !important; }
.mcv-dark [class*="bg-white"], .mcv-dark [class*="bg-gray"], .mcv-dark [class*="bg-slate"], .mcv-dark [class*="bg-zinc"], .mcv-dark [class*="bg-card"], .mcv-dark [class*="bg-background"], .mcv-dark [class*="bg-muted"], .mcv-dark [class*="bg-popover"], .mcv-dark [class*="bg-secondary"] { background: #0f2240 !important; }
.mcv-dark input, .mcv-dark textarea, .mcv-dark select { background: #132d56 !important; color: #f1f5f9 !important; }
.mcv-dark .text-green-600, .mcv-dark .text-green-500, .mcv-dark .text-emerald-600, .mcv-dark .text-emerald-500 { color: #34d399 !important; }
.mcv-dark .text-red-600, .mcv-dark .text-red-500 { color: #f87171 !important; }
.mcv-dark .text-blue-600, .mcv-dark .text-blue-500 { color: #60a5fa !important; }
.mcv-dark .text-amber-500, .mcv-dark .text-yellow-500 { color: #fbbf24 !important; }
.mcv-dark svg { color: #94a3b8 !important; }
.mcv-dark [class*="shadow"] { box-shadow: none !important; }
            `}</style>
            <div className="flex-1 p-3 overflow-y-auto mcv-dark">
              {renderFullscreenContent(activePanelConfig)}
            </div>
          </div>
        </div>
      </div>

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
      
      {/* Document Preview Modal */}
      {previewDocument && (
        <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-[9999]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewDocument.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <FileImage className="h-5 w-5 text-green-500" />
                ) : (
                  <FileText className="h-5 w-5 text-red-500" />
                )}
                {previewDocument.file_name}
                {previewDocument.citationId && (
                  <Badge variant="outline" className="text-[10px] ml-2">
                    cite: [{previewDocument.citationId.slice(0, 8)}]
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {/* Metadata bar */}
            {(previewDocument.uploaded_by_name || previewDocument.uploadedAt || previewDocument.uploaded_by_role) && (
              <div className="flex flex-wrap items-center gap-3 px-1 py-2 border-b text-xs text-muted-foreground">
                {previewDocument.uploaded_by_name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {previewDocument.uploaded_by_name}
                  </span>
                )}
                {previewDocument.uploaded_by_role && (
                  <Badge variant="outline" className="text-[10px] h-5 capitalize">
                    {previewDocument.uploaded_by_role}
                  </Badge>
                )}
                {previewDocument.uploadedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {(() => {
                      try { return format(new Date(previewDocument.uploadedAt), 'MMM dd, yyyy HH:mm'); }
                      catch { return previewDocument.uploadedAt; }
                    })()}
                  </span>
                )}
                {previewDocument.category === 'verification' && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] h-5 border-emerald-300 dark:border-emerald-700">
                    ✓ Verified
                  </Badge>
                )}
              </div>
            )}
            
            {/* Preview content */}
            <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 min-h-[400px]">
              {previewDocument.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div 
                  className="cursor-zoom-in flex items-center justify-center h-full"
                  onClick={() => setFullscreenImagePath(previewDocument.file_path)}
                  title="Click to view fullscreen"
                >
                  <SignedImage 
                    filePath={previewDocument.file_path}
                    alt={previewDocument.file_name}
                    className="max-w-full max-h-[60vh] mx-auto object-contain rounded-lg shadow-lg hover:shadow-2xl transition-shadow"
                  />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium opacity-0 hover:opacity-100 pointer-events-none transition-opacity">
                    Click to view fullscreen
                  </div>
                </div>
              ) : previewDocument.file_name.match(/\.pdf$/i) ? (
                <SignedIframe
                  filePath={previewDocument.file_path}
                  className="w-full h-[60vh] rounded-lg border"
                  title={previewDocument.file_name}
                />
              ) : previewDocument.file_name.includes('materials-labor') && previewDocument.file_name.match(/\.txt$/i) ? (
                // Materials-Labor Template Preview
                <MaterialsLaborPreview 
                  filePath={previewDocument.file_path} 
                  fileName={previewDocument.file_name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <p className="text-xs mt-1">Click Download to view the file</p>
                </div>
              )}
            </div>
            
            {/* Send to Team Members via In-App Messages */}
            {canEdit && teamMembers.length > 0 && (
              <div className="pt-4 border-t space-y-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send to Team Members
                </p>
                
                {/* Team Members Selection */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select recipients to send via in-app messages</p>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.filter(m => m.userId !== userId).map(member => {
                      // Track selected team members by userId
                      const isSelected = selectedTeamRecipients.includes(member.userId);
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTeamRecipients(prev => prev.filter(id => id !== member.userId));
                            } else {
                              setSelectedTeamRecipients(prev => [...prev, member.userId]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-all",
                            isSelected 
                              ? "bg-teal-100 border-teal-400 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" 
                              : "bg-muted/50 border-muted-foreground/20 hover:border-teal-400"
                          )}
                        >
                          <div className="h-5 w-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{member.name}</span>
                          <Badge variant="outline" className="text-[8px] h-4 px-1">{member.role}</Badge>
                          {isSelected && <Check className="h-3.5 w-3.5 text-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTeamRecipients.length > 0 && (
                    <p className="text-[10px] text-teal-600">
                      {selectedTeamRecipients.length} team member{selectedTeamRecipients.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
                
                {/* Optional message */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Message (optional)</label>
                  <Input
                    type="text"
                    placeholder="Add a note about this file..."
                    value={documentMessageNote}
                    onChange={(e) => setDocumentMessageNote(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                
                {/* Send Button */}
                <Button
                  onClick={async () => {
                    if (selectedTeamRecipients.length === 0) {
                      toast.error('Please select at least one team member');
                      return;
                    }
                    
                    setIsSendingDocument(true);
                    try {
                      // Get signed URL for better access control (1 year expiry)
                      const attachmentUrl = await getDocumentSignedUrl(previewDocument.file_path);
                      if (!attachmentUrl) {
                        toast.error('Failed to generate document link');
                        setIsSendingDocument(false);
                        return;
                      }
                      
                      const messageText = documentMessageNote 
                        ? `${documentMessageNote}\n\n📎 ${previewDocument.file_name}`
                        : `📎 Shared file: ${previewDocument.file_name}`;
                      
                      // Send message to each selected team member via team_messages
                      const results = await Promise.allSettled(
                        selectedTeamRecipients.map(recipientId =>
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
                      const failCount = selectedTeamRecipients.length - successCount;
                      
                      if (failCount === 0) {
                        toast.success(`File sent to ${successCount} team member${successCount > 1 ? 's' : ''}`, {
                          description: 'They will see it in their Messages',
                        });
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
                  disabled={selectedTeamRecipients.length === 0 || isSendingDocument}
                  className="w-full gap-2"
                >
                  {isSendingDocument ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Send to {selectedTeamRecipients.length} Team Member{selectedTeamRecipients.length !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              {previewDocument.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <Button
                  variant="outline"
                  onClick={() => setFullscreenImagePath(previewDocument.file_path)}
                  className="gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleDownloadDocument(previewDocument.file_path, previewDocument.file_name)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="ghost" onClick={() => setPreviewDocument(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
      
      {/* Multi-recipient Contract Email Dialog */}
      <Dialog open={showContractEmailDialog} onOpenChange={setShowContractEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-pink-500" />
              Send Contract to Multiple Recipients
            </DialogTitle>
          </DialogHeader>
          
          {selectedContractForEmail && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium">#{selectedContractForEmail.contract_number}</p>
                {selectedContractForEmail.total_amount && (
                  <p className="text-lg font-bold text-pink-600">
                    ${selectedContractForEmail.total_amount.toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Team Members Quick Select */}
              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Quick Add Team Members</p>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map(member => {
                      const isSelected = contractRecipients.some(r => 
                        r.name === member.name && r.email
                      );
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            if (isSelected) {
                              setContractRecipients(prev => prev.filter(r => r.name !== member.name));
                            } else {
                              setContractRecipients(prev => {
                                const hasEmpty = prev.some(r => !r.email && !r.name);
                                if (hasEmpty) {
                                  return prev.map(r => (!r.email && !r.name) ? { name: member.name, email: '' } : r);
                                }
                                return [...prev, { name: member.name, email: '' }];
                              });
                              toast.info(`Add email for ${member.name} below`);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-all",
                            isSelected 
                              ? "bg-pink-100 border-pink-400 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" 
                              : "bg-muted/50 border-muted-foreground/20 hover:border-pink-400"
                          )}
                        >
                          <div className="h-4 w-4 rounded-full bg-pink-500 flex items-center justify-center text-white text-[8px] font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          {member.name}
                          <Badge variant="outline" className="text-[8px] h-4 px-1">{member.role}</Badge>
                          {isSelected && <Check className="h-3 w-3 text-pink-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Recipients</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setContractRecipients(prev => [...prev, { email: '', name: '' }])}
                    className="h-7 gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
                
                {contractRecipients.map((recipient, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Name"
                      value={recipient.name}
                      onChange={(e) => {
                        const newRecipients = [...contractRecipients];
                        newRecipients[idx].name = e.target.value;
                        setContractRecipients(newRecipients);
                      }}
                      className="w-28 h-9 text-sm"
                    />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={recipient.email}
                      onChange={(e) => {
                        const newRecipients = [...contractRecipients];
                        newRecipients[idx].email = e.target.value;
                        setContractRecipients(newRecipients);
                      }}
                      className="flex-1 h-9 text-sm"
                    />
                    {contractRecipients.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => {
                          setContractRecipients(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowContractEmailDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendContractToMultiple}
              disabled={isSendingToMultiple || contractRecipients.every(r => !r.email)}
              className="gap-2 bg-pink-600 hover:bg-pink-700"
            >
              {isSendingToMultiple ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to {contractRecipients.filter(r => r.email).length} Recipient{contractRecipients.filter(r => r.email).length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
      {/* Contract Delete Confirmation */}
      <AlertDialog open={!!contractToDelete} onOpenChange={(open) => { if (!open) setContractToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Contract #{contractToDelete?.contract_number}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this contract? This action will archive the contract and remove it from your active documents.</p>
              {contractToDelete?.status === 'signed' && (
                <p className="text-red-500 font-semibold">⚠️ Warning: This contract has been signed. Deleting a signed contract may have legal implications.</p>
              )}
              {contractToDelete?.status === 'sent' && (
                <p className="text-amber-500 font-medium">⚠️ This contract has already been sent to clients. They will no longer be able to access it.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingContract}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingContract}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!contractToDelete) return;
                setIsDeletingContract(true);
                try {
                  const { error } = await supabase
                    .from('contracts')
                    .update({ archived_at: new Date().toISOString() })
                    .eq('id', contractToDelete.id);
                  
                  if (error) throw error;
                  
                  setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
                  // Remove contract citation
                  setCitations(prev => prev.filter(c => !(c.cite_type === 'CONTRACT' && (c.metadata as any)?.contract_id === contractToDelete.id)));
                  toast.success(`Contract #${contractToDelete.contract_number} deleted`);
                  setContractToDelete(null);
                } catch (err) {
                  toast.error('Failed to delete contract');
                } finally {
                  setIsDeletingContract(false);
                }
              }}
            >
              {isDeletingContract ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Yes, Delete Contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* DNA Report Preview Dialog */}
      <Dialog open={showDnaPreviewDialog} onOpenChange={(open) => {
        setShowDnaPreviewDialog(open);
        if (!open) {
          if (dnaReportBlobUrl) {
            URL.revokeObjectURL(dnaReportBlobUrl);
            setDnaReportBlobUrl(null);
          }
          setDnaReportHtml('');
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-background border-border p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5 text-emerald-500" />
              M.E.S.S.A. DNA Audit Report
            </DialogTitle>
          </DialogHeader>
          
          {/* HTML Preview (inline - no Chrome blocking) */}
          <div className="flex-1 overflow-hidden" style={{ height: '60vh' }}>
            {dnaReportHtml ? (
              <iframe
                srcDoc={dnaReportHtml}
                className="w-full h-full border-0 bg-white"
                title="DNA Audit Report Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Generating preview...
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="px-6 py-4 border-t border-border bg-muted/30">
            {!showDnaEmailDialog ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  ✅ Auto-saved to project documents
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (dnaReportBlobUrl) {
                        const a = document.createElement('a');
                        a.href = dnaReportBlobUrl;
                        a.download = dnaReportFilename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        toast.success('PDF downloaded');
                      }
                    }}
                    className="gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowDnaEmailDialog(true)}
                    className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send via Email
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Send className="h-4 w-4 text-sky-500" />
                  Send DNA Report via Email
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Name</label>
                    <Input
                      placeholder="e.g. John Smith"
                      value={dnaEmailClientName}
                      onChange={(e) => setDnaEmailClientName(e.target.value)}
                      className="bg-muted/50 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Email</label>
                    <Input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={dnaEmailClientEmail}
                      onChange={(e) => setDnaEmailClientEmail(e.target.value)}
                      className="bg-muted/50 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDnaEmailDialog(false)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSendDnaReportEmail}
                    disabled={isSendingDnaEmail || !dnaEmailClientEmail || !dnaEmailClientName}
                    size="sm"
                    className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {isSendingDnaEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isSendingDnaEmail ? 'Sending...' : 'Send Report'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MESSA Site Intelligence Preview Dialog */}
      <Dialog open={showSiteIntelPreviewDialog} onOpenChange={(open) => {
        setShowSiteIntelPreviewDialog(open);
        if (!open) {
          if (siteIntelBlobUrl) {
            URL.revokeObjectURL(siteIntelBlobUrl);
            setSiteIntelBlobUrl(null);
          }
          setSiteIntelHtml('');
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-background border-border p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Brain className="h-5 w-5 text-indigo-500" />
              M.E.S.S.A. Site Intelligence Report
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium ml-1">Dual-Engine AI</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden" style={{ height: '60vh' }}>
            {siteIntelHtml ? (
              <iframe
                srcDoc={siteIntelHtml}
                className="w-full h-full border-0 bg-white"
                title="Site Intelligence Report Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Generating preview...
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                ✅ Auto-saved to project documents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (siteIntelBlobUrl) {
                      const a = document.createElement('a');
                      a.href = siteIntelBlobUrl;
                      a.download = siteIntelFilename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      toast.success('PDF downloaded');
                    }
                  }}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
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
      
      {/* Task Completion Confirmation Dialog - must render above slide-over drawer */}
      <AlertDialog 
        open={!!taskCompletionDialog?.open} 
        onOpenChange={(open) => { if (!open) setTaskCompletionDialog(null); }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Complete Task
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {!taskCompletionDialog?.showUploader ? (
                <p>
                  <span className="font-semibold text-foreground">"{taskCompletionDialog?.taskTitle}"</span>
                  <br />
                  Would you like to upload a verification photo?
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">Upload a photo to verify completion:</p>
                  <label 
                    htmlFor="task-completion-photo-input"
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    <Camera className="h-10 w-10 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Tap to take or select photo</span>
                  </label>
                  <input
                    id="task-completion-photo-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0 || !taskCompletionDialog) return;
                      const taskId = taskCompletionDialog.taskId;
                      setIsUploading(true);
                      try {
                        const file = files[0];
                        const fileName = `${Date.now()}-${file.name}`;
                        const filePath = `${projectId}/verification/${fileName}`;
                        const { error: uploadError } = await supabase.storage
                          .from('project-documents')
                          .upload(filePath, file);
                        if (uploadError) throw uploadError;
                        
                        const uploaderName = teamMembers.find(m => m.userId === userId)?.name || 'Unknown';
                        const uploaderRole = userRole || 'member';
                        const { data: docRecord, error: insertError } = await supabase
                          .from('project_documents')
                          .insert({
                            project_id: projectId,
                            file_name: file.name,
                            file_path: filePath,
                            file_size: file.size,
                            uploaded_by: userId,
                            uploaded_by_name: uploaderName,
                            uploaded_by_role: uploaderRole,
                            mime_type: file.type || 'image/jpeg',
                            ai_analysis_status: 'pending',
                          })
                          .select()
                          .single();
                        if (insertError) throw insertError;
                        
                        // ── INSTANT AI CLASSIFICATION for verification photos ──
                        supabase.functions.invoke('classify-document', {
                          body: { documentId: docRecord.id, fileName: file.name, filePath, mimeType: file.type || 'image/jpeg' },
                        }).then(({ data: classifyResult }) => {
                          if (classifyResult?.success) {
                            console.log(`[Stage8] ✓ Verification photo classified: ${classifyResult.ai_analysis_status}`);
                            setDocuments(prev => prev.map(d => 
                              d.id === docRecord.id 
                                ? { ...d, ai_analysis_status: classifyResult.ai_analysis_status, ai_analysis_result: { is_regulatory: classifyResult.is_regulatory, doc_type: classifyResult.doc_type, confidence: classifyResult.confidence, key_details: classifyResult.key_details } } 
                                : d
                            ));
                            if (classifyResult.ai_analysis_status === 'rejected_non_regulatory') {
                              toast.error(`⚠ Verification photo rejected: ${classifyResult.doc_type}`, { duration: 6000 });
                            }
                          }
                        }).catch(() => {});

                        const taskInfo = tasks.find(t => t.id === taskId);
                        const phaseInfo = taskInfo ? TASK_PHASES.find(p => p.key === taskInfo.phase) : null;
                        const newCitation: Citation = {
                          id: `doc-${docRecord.id}`,
                          cite_type: 'VISUAL_VERIFICATION' as any,
                          question_key: 'task_photo_upload',
                          answer: `Task Verification Photo: ${taskInfo?.title || ''}`,
                          value: filePath,
                          timestamp: new Date().toISOString(),
                          metadata: {
                            category: 'verification',
                            fileName: file.name,
                            fileSize: file.size,
                            taskId,
                            taskTitle: taskInfo?.title,
                            phase: taskInfo?.phase,
                            phaseLabel: phaseInfo?.label || taskInfo?.phase,
                            uploadedBy: uploaderName,
                            uploadedByRole: uploaderRole,
                          },
                        };
                        const newDoc: DocumentWithCategory = {
                          id: docRecord.id,
                          file_name: file.name,
                          file_path: filePath,
                          category: 'verification',
                          citationId: newCitation.id,
                          uploadedAt: new Date().toISOString(),
                          uploaded_by_name: uploaderName,
                          uploaded_by_role: uploaderRole,
                        };
                        setDocuments(prev => [...prev, newDoc]);
                        setCitations(prev => {
                          const updated = [...prev, newCitation];
                          supabase
                            .from('project_summaries')
                            .update({ verified_facts: updated as any })
                            .eq('project_id', projectId)
                            .then(({ error }) => {
                              if (error) console.error('[Stage8] Failed to persist citation:', error);
                            });
                          return updated;
                        });
                        setTasks(prev => prev.map(t => {
                          if (t.id === taskId) {
                            return {
                              ...t,
                              checklist: t.checklist.map(item =>
                                item.id === `${taskId}-verify` ? { ...item, done: true } : item
                              ),
                            };
                          }
                          return t;
                        }));
                        
                        // Auto-complete task after photo upload
                        await confirmTaskCompletion(taskId);
                        setTaskCompletionDialog(null);
                        toast.success(`Photo uploaded & task completed ✓`);
                      } catch (err) {
                        console.error('[Stage8] Task photo upload failed:', err);
                        toast.error('Failed to upload photo');
                      } finally {
                        setIsUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!taskCompletionDialog?.showUploader ? (
              <>
                <AlertDialogCancel onClick={() => setTaskCompletionDialog(null)}>Cancel</AlertDialogCancel>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (taskCompletionDialog) {
                      confirmTaskCompletion(taskCompletionDialog.taskId);
                      setTaskCompletionDialog(null);
                    }
                  }}
                >
                  No
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    setTaskCompletionDialog(prev => prev ? { ...prev, showUploader: true } : null);
                  }}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Yes, upload photo
                </Button>
              </>
            ) : (
              <AlertDialogCancel onClick={() => setTaskCompletionDialog(null)}>Cancel</AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Slide-over Drawer ─── */}
      <AnimatePresence>
        {slideOverPanel && (() => {
          const drawerPanelConfig = slideOverPanel === 'grok-insights'
            ? {
                id: 'grok-insights',
                panelNumber: 10,
                title: 'Grok Insights',
                titleKey: 'stage8.grokInsights',
                icon: Zap,
                color: 'text-amber-500',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30',
                borderColor: 'border-amber-300 dark:border-amber-700',
                visibilityTier: 'owner' as VisibilityTier,
                dataKeys: [] as string[],
                description: 'Smart Material Recommendations & Affiliate Deals',
              }
            : slideOverPanel === 'messa-deep-audit'
            ? {
                id: 'messa-deep-audit',
                panelNumber: 9,
                title: 'MESSA DNA Deep Audit',
                titleKey: 'stage8.messaAudit',
                icon: Sparkles,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
                borderColor: 'border-emerald-300 dark:border-emerald-700',
                visibilityTier: 'owner' as VisibilityTier,
                dataKeys: [] as string[],
                description: '8-Pillar Synthesis Validation',
              }
            : PANELS.find(p => p.id === slideOverPanel) || PANELS[0];
          const DrawerIcon = drawerPanelConfig.icon;
          return (
            <>
              {/* Overlay backdrop */}
              <motion.div
                key="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                onClick={() => setSlideOverPanel(null)}
              />
              {/* Drawer panel */}
              <motion.div
                key="drawer-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed top-0 right-0 z-[61] h-full w-[70%] max-w-3xl sm:w-[65%] flex flex-col bg-black/70 backdrop-blur-md border-l border-white/10 shadow-2xl"
              >
                {/* Drawer Header */}
                <div className={cn("flex items-center justify-between px-5 py-4 border-b border-white/10", drawerPanelConfig.bgColor, "bg-opacity-30")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", drawerPanelConfig.bgColor)}>
                      <DrawerIcon className={cn("h-5 w-5", drawerPanelConfig.color)} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {drawerPanelConfig.title.split(' ').map((word: string, i: number) => (
                          <span key={i} className={i === 0 ? "text-white" : "text-amber-400"}>{i > 0 ? ' ' : ''}{word}</span>
                        ))}
                      </h2>
                      <p className="text-xs text-white/50">{drawerPanelConfig.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSlideOverPanel(null)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {drawerPanelConfig.id === 'grok-insights' ? renderGrokInsightsContent() : drawerPanelConfig.id === 'messa-deep-audit' ? renderDnaAuditContent() : drawerPanelConfig.id === 'panel-8-financial' ? renderFullscreenContent(drawerPanelConfig) : renderPanelContent(drawerPanelConfig)}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

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
