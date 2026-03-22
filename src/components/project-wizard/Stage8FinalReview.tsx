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
import holographicTimerImg from "@/assets/holographic-timer.png";
import torontoCyberpunkRight from "@/assets/toronto-cyberpunk-skyline-right.png";
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
  LayoutDashboard,
  MapPin,
  Ruler,
  Hammer,
  Users,
  Calendar,
  Shield,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  Settings,
  Briefcase,
  ClipboardList,
  FileCheck,
  Cloud,
  FolderOpen,
  DollarSign,
  Building2,
  Thermometer,
  Maximize2,
  Minimize2,
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
  LockKeyhole,
  Unlock,
  MessageSquare,
  Mail,
  Send,
  Trash2,
  Pencil,
  Brain,
  Truck,
  Package,
  Crown,
  Zap,
  ShieldCheck,
  UserPlus,
  MessageCircle,
  Search,
  RefreshCw,
  ExternalLink,
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
import { buildMessaSynthesisHTML as buildMessaSynthesisHTMLFn, buildSummaryHTML } from "./stage8/htmlBuilders";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Project data
  const [projectData, setProjectData] = useState<{
    name: string;
    address: string;
    status: string;
    trade: string | null;
  } | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [teamMembers, setTeamMembers] = useState<{id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string}[]>([]);
  const [contractStep, setContractStep] = useState<'select_member' | 'preview'>('select_member');
  const [selectedContractMember, setSelectedContractMember] = useState<{id: string; role: string; name: string; userId: string; primary_trade?: string; hst_number?: string} | null>(null);
  const [tasks, setTasks] = useState<TaskWithChecklist[]>([]);
  const [documents, setDocuments] = useState<DocumentWithCategory[]>([]);
  const [contracts, setContracts] = useState<{id: string; contract_number: string; status: string; total_amount: number | null; share_token?: string | null; project_name?: string | null; client_name?: string | null; client_email?: string | null; contractor_name?: string | null; contractor_email?: string | null; start_date?: string | null; estimated_end_date?: string | null; contractor_signature?: unknown; client_signature?: unknown; client_signed_at?: string | null; sent_to_client_at?: string | null; client_viewed_at?: string | null}[]>([]);
  
  // Financial summary data from project_summaries
  const [financialSummary, setFinancialSummary] = useState<{
    material_cost: number | null;
    labor_cost: number | null;
    total_cost: number | null;
  } | null>(null);
  const [weatherData, setWeatherData] = useState<{temp?: number; condition?: string; alerts?: string[]} | null>(null);
  
  // User profile data for contractor fields in contracts
  const [userProfile, setUserProfile] = useState<{
    company_name: string | null;
    phone: string | null;
    email: string | null;
    service_area: string | null;
  } | null>(null);
  
  // Project Owner profile (Client in contracts) — always fetched from project owner
  const [ownerProfile, setOwnerProfile] = useState<{
    full_name: string | null;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    service_area: string | null;
  } | null>(null);
  
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
  
  const [isFinancialLocked, setIsFinancialLocked] = useState(true);
  const [ownerLockOpen, setOwnerLockOpen] = useState(false);
  const [ownerLockAction, setOwnerLockAction] = useState<'finish' | 'material_edit' | 'material_table_edit' | null>(null);
  const [editingMaterialIdx, setEditingMaterialIdx] = useState<number | null>(null);
  const [editMaterialQty, setEditMaterialQty] = useState<string>('');
  const [pendingMaterialEdit, setPendingMaterialEdit] = useState<{idx: number; qty: string} | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'localStorage' | 'mixed'>('supabase');
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
   
   // Load active check-in status on mount + all active team check-ins
   const loadAllCheckins = useCallback(async () => {
     // Own status
     const { data: ownData } = await supabase
       .from('site_checkins')
       .select('id')
       .eq('project_id', projectId)
       .eq('user_id', userId)
       .is('checked_out_at', null)
       .order('checked_in_at', { ascending: false })
       .limit(1);
     if (ownData && ownData.length > 0) {
       setIsCheckedIn(true);
       setActiveCheckinId(ownData[0].id);
     } else {
       setIsCheckedIn(false);
       setActiveCheckinId(null);
     }
     // All active team check-ins
     const { data: teamData } = await supabase
       .from('site_checkins')
       .select('user_id, checked_in_at')
       .eq('project_id', projectId)
       .is('checked_out_at', null)
       .order('checked_in_at', { ascending: false });
     if (teamData && teamData.length > 0) {
       const userIds = [...new Set(teamData.map(c => c.user_id))];
       const { data: profs } = await supabase
         .from('profiles')
         .select('user_id, full_name, avatar_url')
         .in('user_id', userIds);
       const nameMap = new Map(profs?.map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
       setActiveTeamCheckins(teamData.map(c => ({
         user_id: c.user_id,
         full_name: nameMap.get(c.user_id)?.full_name || 'Unknown',
         avatar_url: nameMap.get(c.user_id)?.avatar_url || null,
         checked_in_at: c.checked_in_at,
       })));
     } else {
       setActiveTeamCheckins([]);
     }
   }, [projectId, userId]);

   useEffect(() => {
     loadAllCheckins();
     // Realtime: refresh when any check-in changes
     const ch = supabase
       .channel(`team-checkins-${projectId}`)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'site_checkins', filter: `project_id=eq.${projectId}` }, () => {
         loadAllCheckins();
       })
       .subscribe();
     return () => { supabase.removeChannel(ch); };
   }, [projectId, userId, loadAllCheckins]);
   
   const handleSiteCheckin = useCallback(async () => {
     setIsCheckingIn(true);
     try {
        if (isCheckedIn && activeCheckinId) {
          // Check out
          const { error: checkoutError } = await supabase
            .from('site_checkins')
            .update({ checked_out_at: new Date().toISOString() })
            .eq('id', activeCheckinId)
            .eq('user_id', userId);
          if (checkoutError) {
            console.error('Checkout error:', checkoutError);
            toast.error('Failed to check out: ' + checkoutError.message);
            return;
          }
          setIsCheckedIn(false);
          setActiveCheckinId(null);
          toast.success('Checked out from site');
          await loadAllCheckins();
       } else {
         // Check in — fetch weather snapshot
         let weatherSnapshot: any = {};
         const locationCit = citations.find(c => c.cite_type === 'LOCATION');
         if (locationCit?.answer) {
           try {
             const { data: weatherRes } = await supabase.functions.invoke('get-weather', {
               body: { location: locationCit.answer, days: 1 },
             });
             if (weatherRes?.current) {
               weatherSnapshot = {
                 temp: weatherRes.current.temp,
                 description: weatherRes.current.description,
                 humidity: weatherRes.current.humidity,
                 wind_speed: weatherRes.current.wind_speed,
                 timestamp: new Date().toISOString(),
               };
             }
           } catch (e) { console.warn('Weather snapshot failed:', e); }
         }
         
         const { data: newCheckin, error } = await supabase
           .from('site_checkins')
           .insert({
             project_id: projectId,
             user_id: userId,
             weather_snapshot: weatherSnapshot,
           })
           .select('id')
           .single();
         
         if (error) throw error;
         setIsCheckedIn(true);
         setActiveCheckinId(newCheckin.id);
         
          // Create SITE_PRESENCE citation and persist immediately
          const presenceCitation = createCitation({
            cite_type: 'SITE_PRESENCE',
            question_key: 'site_checkin',
            answer: new Date().toLocaleString(),
            value: newCheckin.id,
            metadata: {
              userId,
              weather: weatherSnapshot,
              action: 'check_in',
            },
          });
          
          // Read current verified_facts from DB to avoid stale state
          const { data: currentSummary } = await supabase
            .from('project_summaries')
            .select('verified_facts')
            .eq('project_id', projectId)
            .single();
          
          const currentFacts = Array.isArray(currentSummary?.verified_facts) ? currentSummary.verified_facts : [];
          const updatedFacts = [...currentFacts, presenceCitation];
          
          await supabase
            .from('project_summaries')
            .update({ verified_facts: updatedFacts as unknown as any })
            .eq('project_id', projectId);
          
          setCitations(updatedFacts as unknown as Citation[]);
         
         toast.success('Checked in to site', {
           description: weatherSnapshot.temp ? `${Math.round(weatherSnapshot.temp)}° — ${weatherSnapshot.description}` : undefined,
         });
       }
     } catch (err) {
       console.error('Check-in error:', err);
       toast.error('Failed to check in/out');
     } finally {
       setIsCheckingIn(false);
     }
   }, [isCheckedIn, activeCheckinId, projectId, userId, citations]);



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
  
  // Categorize document based on file name, file path, AND uploader role
  const categorizeDocument = useCallback((fileName: string, filePath?: string, uploadedByRole?: string | null): DocumentCategory => {
    const lowerName = fileName.toLowerCase();
    const lowerPath = (filePath || '').toLowerCase();
    
    // ✓ OBC Pending documents (system-generated placeholders)
    if (lowerPath.includes('/pending/obc-') || lowerName.includes('(pending)') || lowerName.includes('⏳')) {
      return 'obc_pending';
    }
    
    // ✓ ANY team member upload (non-owner) → Verification
    // Team members photograph work progress, so their uploads are verification evidence
    if (uploadedByRole && uploadedByRole !== 'owner') {
      return 'verification';
    }
    
    // ✓ Chat-uploaded files (team verification photos) → Verification
    if (lowerPath.includes('/chat/')) {
      return 'verification';
    }
    
    // ✓ Task verification photos (stored in /verification/ path) → Verification
    if (lowerPath.includes('/verification/')) {
      return 'verification';
    }
    
    // ✓ Explicit verification keywords
    if (lowerName.includes('verification') || lowerName.includes('inspect') || lowerName.includes('qc')) {
      return 'verification';
    }
    
    // Legal documents
    if (lowerName.includes('contract') || lowerName.includes('legal') || lowerName.includes('agreement')) {
      return 'legal';
    }
    
    // Technical documents (blueprints, PDFs, DNA reports)
    if (lowerName.includes('blueprint') || lowerName.includes('plan') || lowerName.includes('drawing') || lowerName.includes('dna') || lowerName.includes('audit') || lowerName.match(/\.pdf$/i)) {
      return 'technical';
    }
    
    // Images uploaded via wizard stages → Visual
    if (lowerName.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|svg)$/i)) {
      return 'visual';
    }
    
    return 'technical';
  }, []);
  
  // Load all project data with localStorage fallback
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      let usedLocalStorage = false;
      
      try {
        // 1. Load project - ALSO load trade field for fallback
        const { data: project } = await supabase
          .from('projects')
          .select('name, address, status, trade, user_id')
          .eq('id', projectId)
          .single();
        
        if (project) {
          setProjectData(project);
          
          if (project.address) {
            fetchWeather(project.address);
          }
        }
        
        // Store project trade for fallback use if no TRADE_SELECTION citation
        const projectTrade = project?.trade || null;
        
        // 2. Load citations AND financial data from project_summaries
        const { data: summary } = await supabase
          .from('project_summaries')
          .select('verified_facts, material_cost, labor_cost, total_cost, line_items, template_items, project_start_date, project_end_date')
          .eq('project_id', projectId)
          .maybeSingle();
        
        // Store financial summary for Owner view
        // ✓ FALLBACK: If total_cost is 0 but template_items has data, compute from items
        if (summary) {
          // ── STRICT DYNAMIC LINKING: Always recalculate from item-level data ──
          const liveLineItems: any[] = Array.isArray(summary.line_items) ? summary.line_items as any[] : [];
          const liveTemplateItems: any[] = Array.isArray(summary.template_items) ? summary.template_items as any[] : [];
          const recalcSource = liveLineItems.length > 0 ? liveLineItems : liveTemplateItems;
          
          let matCostVal: number;
          let labCostVal: number;
          let totCostVal: number;
          
          if (recalcSource.length > 0) {
            matCostVal = 0;
            labCostVal = 0;
            let demoCostVal = 0;
            
            // ── INVOICE-ALIGNED CLASSIFICATION ──
            // Must match generate-invoice edge function EXACTLY:
            // The edge function strips the `category` field, so the invoice
            // classifies ONLY by description keywords. We must do the same.
            // DO NOT use item.category — it causes mismatches.
            const isLaborByKeyword = (desc: string): boolean => {
              const d = desc.toLowerCase();
              return d.includes('labor') || d.includes('installation') || d.includes('preparation') ||
                d.includes('cleanup') || d.includes('grinding') ||
                d.includes('floor preparation') || d.includes('prep work') || d.includes('site prep');
            };
            const isDemoByKeyword = (desc: string): boolean => {
              const d = desc.toLowerCase();
              return d.includes('demolition') || d.includes('demo ') || d.includes('removal');
            };
            
            for (const item of recalcSource) {
              const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) || Number(item.total) || Number(item.totalPrice) || 0;
              const desc = item.name || item.description || '';
              
              // Priority: Demolition > Labor (keyword ONLY, no category field) > Material (default)
              if (isDemoByKeyword(desc)) {
                demoCostVal += itemTotal;
              } else if (isLaborByKeyword(desc)) {
                labCostVal += itemTotal;
              } else {
                matCostVal += itemTotal;
              }
            }
            totCostVal = matCostVal + labCostVal;
            console.log('[Stage8] ✓ Financial data recalculated from items:', { matCostVal, labCostVal, totCostVal, source: liveLineItems.length > 0 ? 'line_items' : 'template_items' });
            
            // Persist corrected values if they differ from stored (check ALL pillars, not just total)
            const storedTotal = summary.total_cost ?? 0;
            const storedMat = Number(summary.material_cost) || 0;
            const storedLab = Number(summary.labor_cost) || 0;
            if (Math.abs(totCostVal - Number(storedTotal)) > 0.01 || Math.abs(matCostVal - storedMat) > 0.01 || Math.abs(labCostVal - storedLab) > 0.01) {
              console.log('[Stage8] ⚡ Correcting stale financial summary:', { storedMat, storedLab, storedTotal: Number(storedTotal), calcMat: matCostVal, calcLab: labCostVal, calcTotal: totCostVal });
              supabase
                .from('project_summaries')
                .update({ material_cost: matCostVal, labor_cost: labCostVal, total_cost: totCostVal })
                .eq('project_id', projectId)
                .then(({ error }) => {
                  if (error) console.error('[Stage8] Failed to persist corrected financials:', error);
                  else console.log('[Stage8] ✓ Corrected financials persisted to backend');
                });
            }
          } else {
            // No items at all — use stored values
            matCostVal = Number(summary.material_cost) || 0;
            labCostVal = Number(summary.labor_cost) || 0;
            totCostVal = Number(summary.total_cost) || 0;
          }
          
          setFinancialSummary({
            material_cost: matCostVal,
            labor_cost: labCostVal,
            total_cost: totCostVal,
          });
        }
        
        let loadedCitations: Citation[] = [];
        
        if (summary?.verified_facts) {
          const facts = Array.isArray(summary.verified_facts) 
            ? (summary.verified_facts as unknown as Citation[])
            : [];
          
          // ✓ NORMALIZE CITATIONS: Handle both old (questionKey) and new (cite_type) formats
          loadedCitations = facts.map((fact: any) => {
            // If already has cite_type, use as-is
            if (fact.cite_type) {
              return fact as Citation;
            }
            // Convert legacy format (questionKey) to new format (cite_type)
            const questionKey = fact.questionKey || fact.question_key;
            let citeType: string = 'PROJECT_NAME';
            
            switch (questionKey) {
              case 'project_name': citeType = 'PROJECT_NAME'; break;
              case 'project_address': citeType = 'LOCATION'; break;
              case 'work_type': citeType = 'WORK_TYPE'; break;
              case 'gfa': case 'gross_floor_area': citeType = 'GFA_LOCK'; break;
              case 'trade_selection': case 'trade': citeType = 'TRADE_SELECTION'; break;
              case 'template_lock': citeType = 'TEMPLATE_LOCK'; break;
              case 'team_member_invite': citeType = 'TEAM_MEMBER_INVITE'; break;
              case 'team_structure': citeType = 'TEAM_STRUCTURE'; break;
              case 'timeline': case 'start_date': citeType = 'TIMELINE'; break;
              case 'end_date': citeType = 'END_DATE'; break;
              default: citeType = fact.elementType?.toUpperCase() || 'PROJECT_NAME';
            }
            
            return {
              ...fact,
              cite_type: citeType,
              question_key: questionKey,
            } as Citation;
          });
          
          console.log('[Stage8] Loaded & normalized citations from Supabase:', loadedCitations.length);
          loadedCitations.forEach(c => console.log(`  - ${c.cite_type}: ${c.answer}`));
        }
        
        // ✓ FALLBACK: If Supabase has no citations, try localStorage
        if (loadedCitations.length === 0) {
          const localState = restoreProjectFromLocalStorage(projectId);
          if (localState?.citations && localState.citations.length > 0) {
            loadedCitations = localState.citations;
            usedLocalStorage = true;
            console.log('[Stage8] ✓ Restored citations from localStorage:', localState.citations.length);
            toast.info('Data restored from local backup', { duration: 3000 });
            
            // Sync back to Supabase
            try {
              await supabase
                .from('project_summaries')
                .upsert({
                  project_id: projectId,
                  user_id: userId,
                  verified_facts: loadedCitations as any,
                  status: 'active',
                });
              console.log('[Stage8] Citations synced back to Supabase');
            } catch (syncErr) {
              logCriticalError('[Stage8] Failed to sync localStorage to Supabase', syncErr);
            }
          }
        }
        
        // ✓ CRITICAL FALLBACK: If no TRADE_SELECTION citation but projects.trade exists, create synthetic citation
        const hasTradeSelection = loadedCitations.some(c => c.cite_type === 'TRADE_SELECTION');
        if (!hasTradeSelection && projectTrade) {
          // Create label from key (flooring -> Flooring)
          const tradeLabel = projectTrade.charAt(0).toUpperCase() + projectTrade.slice(1).replace(/_/g, ' ');
          
          const syntheticTradeCitation: Citation = {
            id: `synthetic_trade_${Date.now()}`,
            cite_type: 'TRADE_SELECTION',
            question_key: 'trade_selection',
            answer: tradeLabel,
            value: projectTrade,
            timestamp: new Date().toISOString(),
            metadata: { 
              trade_key: projectTrade,
              source: 'projects.trade_fallback',
            },
          };
          
          loadedCitations.push(syntheticTradeCitation);
          console.log('[Stage8] ✓ Created synthetic TRADE_SELECTION from projects.trade:', projectTrade);
          
          // Also persist this to verified_facts to prevent future issues
          try {
            const { data: currentSummary } = await supabase
              .from('project_summaries')
              .select('id, verified_facts')
              .eq('project_id', projectId)
              .maybeSingle();
            
            if (currentSummary?.id) {
              const currentFacts = Array.isArray(currentSummary.verified_facts) ? currentSummary.verified_facts : [];
              const updatedFacts = [...currentFacts, syntheticTradeCitation as unknown as Record<string, unknown>];
              
              await supabase
                .from('project_summaries')
                .update({ verified_facts: updatedFacts as unknown as null })
                .eq('id', currentSummary.id);
              
              console.log('[Stage8] ✓ Persisted synthetic TRADE_SELECTION to verified_facts');
            }
          } catch (persistErr) {
            console.error('[Stage8] Failed to persist synthetic citation:', persistErr);
          }
        }
        
        // ✓ TIMELINE & END_DATE: Use project_summaries DB fields FIRST, then fallback to tasks
        const hasTimeline = loadedCitations.some(c => c.cite_type === 'TIMELINE');
        const hasEndDate = loadedCitations.some(c => c.cite_type === 'END_DATE');
        
        // Priority 1: Use project_start_date / project_end_date from project_summaries (user-saved dates)
        if (!hasTimeline && summary?.project_start_date) {
          const dbStartDate = summary.project_start_date;
          const dbTimelineCitation: Citation = {
            id: `db_timeline_${Date.now()}`,
            cite_type: 'TIMELINE',
            question_key: 'timeline',
            answer: dbStartDate,
            value: 'scheduled',
            timestamp: new Date().toISOString(),
            metadata: {
              start_date: dbStartDate,
              source: 'project_summaries',
            },
          };
          loadedCitations.push(dbTimelineCitation);
          console.log('[Stage8] ✓ Created TIMELINE from project_summaries.project_start_date:', dbStartDate);
        }
        
        if (!hasEndDate && summary?.project_end_date) {
          const dbEndDate = summary.project_end_date;
          const dbEndDateCitation: Citation = {
            id: `db_end_date_${Date.now()}`,
            cite_type: 'END_DATE',
            question_key: 'end_date',
            answer: dbEndDate,
            value: dbEndDate,
            timestamp: new Date().toISOString(),
            metadata: {
              end_date: dbEndDate,
              source: 'project_summaries',
            },
          };
          loadedCitations.push(dbEndDateCitation);
          console.log('[Stage8] ✓ Created END_DATE from project_summaries.project_end_date:', dbEndDate);
        }
        
        // Priority 2: Only if DB fields are also empty, fall back to task due_dates
        const hasTimelineNow = loadedCitations.some(c => c.cite_type === 'TIMELINE');
        const hasEndDateNow = loadedCitations.some(c => c.cite_type === 'END_DATE');
        
        if (!hasTimelineNow || !hasEndDateNow) {
          try {
            const { data: taskDates } = await supabase
              .from('project_tasks')
              .select('due_date')
              .eq('project_id', projectId)
              .is('archived_at', null)
              .order('due_date', { ascending: true });
            
            if (taskDates && taskDates.length > 0) {
              const validDates = taskDates.filter(t => t.due_date).map(t => new Date(t.due_date!));
              const earliest = validDates[0];
              const latest = validDates[validDates.length - 1];
              
              if (!hasTimelineNow && earliest) {
                const syntheticTimeline: Citation = {
                  id: `synthetic_timeline_${Date.now()}`,
                  cite_type: 'TIMELINE',
                  question_key: 'timeline',
                  answer: earliest.toISOString().split('T')[0],
                  value: 'scheduled',
                  timestamp: new Date().toISOString(),
                  metadata: {
                    start_date: earliest.toISOString().split('T')[0],
                    source: 'tasks_fallback',
                  },
                };
                loadedCitations.push(syntheticTimeline);
                console.log('[Stage8] ✓ Fallback TIMELINE from tasks:', earliest.toISOString());
              }
              
              if (!hasEndDateNow && latest) {
                const syntheticEndDate: Citation = {
                  id: `synthetic_end_date_${Date.now()}`,
                  cite_type: 'END_DATE',
                  question_key: 'end_date',
                  answer: latest.toISOString().split('T')[0],
                  value: latest.toISOString().split('T')[0],
                  timestamp: new Date().toISOString(),
                  metadata: {
                    end_date: latest.toISOString().split('T')[0],
                    source: 'tasks_fallback',
                  },
                };
                loadedCitations.push(syntheticEndDate);
                console.log('[Stage8] ✓ Fallback END_DATE from tasks:', latest.toISOString());
              }
            }
          } catch (err) {
            console.error('[Stage8] Failed to recover timeline from tasks:', err);
          }
        }
        
        setCitations(loadedCitations);
        setDataSource(usedLocalStorage ? 'localStorage' : 'supabase');
        
        // 3. Load team members (add owner as well)
        const { data: members } = await supabase
          .from('project_members')
          .select('id, user_id, role')
          .eq('project_id', projectId);
        
        // Always include Owner (the project creator)
        let teamData: {id: string; userId: string; role: string; name: string}[] = [];
        
        // Add owner first
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (ownerProfile) {
          teamData.push({
            id: `owner-${userId}`,
            userId: userId,
            role: 'owner',
            name: ownerProfile.full_name || 'Owner',
          });
        }
        
        if (members && members.length > 0) {
          const userIds = members.map(m => m.user_id).filter(id => id !== userId);
          if (userIds.length > 0) {
            const [{ data: profiles }, { data: buProfiles }] = await Promise.all([
              supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
              supabase.from('bu_profiles').select('user_id, primary_trade, hst_number').in('user_id', userIds),
            ]);
            
            const memberData = members
              .filter(m => m.user_id !== userId)
              .map(m => {
                const profile = profiles?.find(p => p.user_id === m.user_id);
                const buProfile = buProfiles?.find(p => p.user_id === m.user_id);
                return {
                  id: m.id,
                  userId: m.user_id,
                  role: m.role,
                  name: profile?.full_name || 'Team Member',
                  primary_trade: buProfile?.primary_trade || undefined,
                  hst_number: (buProfile as any)?.hst_number || undefined,
                };
              });
            teamData = [...teamData, ...memberData];
          }
        }
        
        // 3b. Load pending email invitations
        const { data: pendingInvites } = await supabase
          .from('team_invitations')
          .select('id, email, role, status')
          .eq('project_id', projectId);
        
        if (pendingInvites && pendingInvites.length > 0) {
          pendingInvites.forEach(invite => {
            // Only add if not already in teamData (already accepted = in project_members)
            const alreadyJoined = teamData.some(m => m.userId === invite.id);
            if (!alreadyJoined && invite.status === 'pending') {
              const emailName = invite.email.split('@')[0];
              const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
              teamData.push({
                id: `invite-${invite.id}`,
                userId: invite.id,
                role: invite.role || 'member',
                name: `${displayName} (Pending)`,
              });
            }
          });
        }
        
        setTeamMembers(teamData);
        
        // 3c. Generate TEAM_MEMBER_INVITE citations for each team member if not already present
        const existingTeamInviteCits = loadedCitations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE');
        const existingTeamMemberIds = new Set(existingTeamInviteCits.map(c => (c.metadata as any)?.member_id || (c.metadata as any)?.userId));
        
        const newTeamCitations: Citation[] = [];
        teamData.forEach(member => {
          if (member.role === 'owner') return; // Skip owner
          const memberId = member.userId || member.id;
          if (existingTeamMemberIds.has(memberId)) return; // Already cited
          
          const cit: Citation = {
            id: `cite_team_member_${memberId.slice(0, 8)}_${Date.now()}`,
            cite_type: 'TEAM_MEMBER_INVITE',
            question_key: 'team_member',
            answer: `${member.name} — ${member.role}`,
            value: member.name,
            timestamp: new Date().toISOString(),
            metadata: {
              member_id: memberId,
              role: member.role,
              name: member.name,
              source: member.id.startsWith('invite-') ? 'email_invitation' : 'platform_member',
            },
          };
          newTeamCitations.push(cit);
        });
        
        // Also add pending invitations as citations
        if (pendingInvites) {
          pendingInvites.forEach(invite => {
            if (invite.status !== 'pending') return;
            const inviteId = invite.id;
            if (existingTeamMemberIds.has(inviteId)) return;
            // Check if already added in teamData loop
            if (newTeamCitations.some(c => (c.metadata as any)?.member_id === inviteId)) return;
            
            const emailName = invite.email.split('@')[0];
            const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            const cit: Citation = {
              id: `cite_team_invite_${inviteId.slice(0, 8)}_${Date.now()}`,
              cite_type: 'TEAM_MEMBER_INVITE',
              question_key: 'team_member',
              answer: `${displayName} (${invite.email}) — ${invite.role || 'member'} [Pending]`,
              value: invite.email,
              timestamp: new Date().toISOString(),
              metadata: {
                member_id: inviteId,
                email: invite.email,
                role: invite.role || 'member',
                name: displayName,
                status: 'pending',
                source: 'email_invitation',
              },
            };
            newTeamCitations.push(cit);
          });
        }
        
        if (newTeamCitations.length > 0) {
          loadedCitations.push(...newTeamCitations);
          setCitations([...loadedCitations]);
          
          // Persist new team citations to DB
          try {
            const { data: sumData } = await supabase
              .from('project_summaries')
              .select('id, verified_facts')
              .eq('project_id', projectId)
              .maybeSingle();
            
            if (sumData?.id) {
              const currentFacts = Array.isArray(sumData.verified_facts) ? sumData.verified_facts : [];
              const updatedFacts = [...currentFacts, ...newTeamCitations.map(c => c as unknown as Record<string, unknown>)];
              await supabase
                .from('project_summaries')
                .update({ verified_facts: updatedFacts as unknown as null })
                .eq('id', sumData.id);
              console.log('[Stage8] ✓ Persisted', newTeamCitations.length, 'team member citations');
            }
          } catch (persistErr) {
            console.error('[Stage8] Failed to persist team citations:', persistErr);
          }
        }
        
        // ✓ Compute effective financial values (with template_items fallback)
        let effectiveMatCost = Number(summary?.material_cost || 0);
        let effectiveLabCost = Number(summary?.labor_cost || 0);
        let effectiveTotalCost = Number(summary?.total_cost || 0);
        if (effectiveTotalCost === 0 && Array.isArray(summary?.template_items) && summary!.template_items.length > 0) {
          const items = summary!.template_items as any[];
          effectiveMatCost = items.filter(i => i.category === 'material').reduce((s: number, i: any) => s + (Number(i.totalPrice) || 0), 0);
          effectiveLabCost = items.filter(i => i.category === 'labor').reduce((s: number, i: any) => s + (Number(i.totalPrice) || 0), 0);
          effectiveTotalCost = effectiveMatCost + effectiveLabCost;
        }
        
        // 3d. Generate BUDGET citation from financial data if not present
        const hasBudgetCit = loadedCitations.some(c => c.cite_type === 'BUDGET');
        if (!hasBudgetCit && summary && effectiveTotalCost > 0) {
          const budgetCitation: Citation = {
            id: `cite_budget_${Date.now()}`,
            cite_type: 'BUDGET' as any,
            question_key: 'total_budget',
            answer: `$${effectiveTotalCost.toLocaleString()}`,
            value: effectiveTotalCost,
            timestamp: new Date().toISOString(),
            metadata: {
              material_cost: effectiveMatCost,
              labor_cost: effectiveLabCost,
              total_cost: effectiveTotalCost,
              source: 'project_summaries',
            },
          };
          loadedCitations.push(budgetCitation);
          newTeamCitations.push(budgetCitation);
        }
        
        // 3e. Generate TEMPLATE_LOCK synthetic citation if financial data exists but no template citation
        const hasTemplateLockCit = loadedCitations.some(c => c.cite_type === 'TEMPLATE_LOCK');
        if (!hasTemplateLockCit && summary && (effectiveMatCost > 0 || effectiveLabCost > 0)) {
          const dbTemplateItems = Array.isArray(summary.template_items) && summary.template_items.length > 0
            ? summary.template_items
            : undefined;
          const syntheticTemplateCit: Citation = {
            id: `synthetic_template_lock_${Date.now()}`,
            cite_type: 'TEMPLATE_LOCK',
            question_key: 'template_lock',
            answer: `Materials: $${effectiveMatCost.toLocaleString()} · Labor: $${effectiveLabCost.toLocaleString()}`,
            value: 'locked',
            timestamp: new Date().toISOString(),
            metadata: {
              material_cost: effectiveMatCost,
              labor_cost: effectiveLabCost,
              total_cost: effectiveTotalCost,
              source: 'financial_recovery',
              ...(dbTemplateItems ? { items: dbTemplateItems } : {}),
            },
          };
          loadedCitations.push(syntheticTemplateCit);
          console.log('[Stage8] ✓ Created synthetic TEMPLATE_LOCK from financial data');
        }

        // 4. Load tasks and transform to checklist format
        let { data: tasksData } = await supabase
          .from('project_tasks')
          .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        // Auto-generate tasks if none exist (Stage 7 was skipped or failed)
        if (!tasksData || tasksData.length === 0) {
          const timelineCit = loadedCitations.find(c => c.cite_type === 'TIMELINE');
          const endDateCit = loadedCitations.find(c => c.cite_type === 'END_DATE');
          const siteCondCit = loadedCitations.find(c => c.cite_type === 'SITE_CONDITION');
          
          const startStr = (timelineCit?.metadata as any)?.start_date || (summary as any)?.project_start_date;
          const endStr = endDateCit?.value || (endDateCit?.metadata as any)?.end_date || (summary as any)?.project_end_date;
          
          // Fallback: if no dates exist, use today + 30 days
          const fallbackStart = new Date();
          const fallbackEnd = new Date(fallbackStart.getTime() + 30 * 86400000);
          
          {
            const startD = startStr ? new Date(startStr as string) : fallbackStart;
            const endD = endStr ? new Date(endStr as string) : fallbackEnd;
            const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
            const hasDemolition = siteCondCit?.value === 'demolition';
            
            const phases = [
              ...(hasDemolition ? [{ id: 'demolition', name: 'Demolition Work', pct: 15, pri: 'critical' }] : []),
              { id: 'preparation', name: 'Preparation Work', pct: 25, pri: 'high' },
              { id: 'installation', name: 'Installation Work', pct: 45, pri: 'medium' },
              { id: 'finishing', name: 'Finishing & QC', pct: 15, pri: 'medium' },
            ];
            const totalPct = phases.reduce((s, p) => s + p.pct, 0);
            
            // Get template items for sub-task generation
            const templateLockCitAuto = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
            const templateItemsAuto = (templateLockCitAuto?.metadata as any)?.items as any[] | undefined;
            
            // Categorize helper
            const categorizeName = (name: string): string => {
              const n = name.toLowerCase();
              if (n.includes('demolition') || n.includes('demo') || n.includes('removal')) return 'demolition';
              if (n.includes('prep') || n.includes('primer') || n.includes('underlayment') || 
                  n.includes('tape') || n.includes('compound') || n.includes('mesh') ||
                  n.includes('rebar') || n.includes('forming')) return 'preparation';
              if (n.includes('finish') || n.includes('baseboard') || n.includes('trim') ||
                  n.includes('transition') || n.includes('touch') || n.includes('qc')) return 'finishing';
              return 'installation';
            };
            
            // Group template items by phase
            const itemsByPhase: Record<string, any[]> = {};
            if (templateItemsAuto) {
              templateItemsAuto.forEach((item: any) => {
                const phaseId = categorizeName(item.name || '');
                if (!itemsByPhase[phaseId]) itemsByPhase[phaseId] = [];
                itemsByPhase[phaseId].push(item);
              });
            }
            
            const phaseNames: Record<string, string> = {
              demolition: 'Demolition', preparation: 'Preparation',
              installation: 'Installation', finishing: 'Finishing & QC',
            };
            
            let curDate = startD;
            const autoTasks: { title: string; description: string; priority: string; due_date: string; unit_price?: number; quantity?: number }[] = [];
            
            for (const phase of phases) {
              const days = Math.max(1, Math.round((phase.pct / totalPct) * totalDays));
              const phaseEnd = new Date(curDate.getTime() + days * 86400000);
              
              // Only add the phase parent task if there are NO sub-tasks for this phase
              const phaseItems = itemsByPhase[phase.id] || [];
              if (phaseItems.length === 0) {
                autoTasks.push({
                  title: phase.name,
                  description: `Phase: ${phase.id}`,
                  priority: phase.pri,
                  due_date: phaseEnd.toISOString(),
                });
              }
              
              // Add template sub-tasks for this phase (LAB + MAT items)
              phaseItems.forEach((item: any) => {
                autoTasks.push({
                  title: item.name || 'Template Item',
                  description: `Template sub-task: ${phaseNames[phase.id] || 'Installation'}`,
                  priority: 'medium',
                  due_date: phaseEnd.toISOString(),
                  unit_price: item.unitPrice || item.unit_price || item.totalPrice || item.total_price || 0,
                  quantity: item.quantity || 1,
                });
              });
              
              autoTasks.push({
                title: `${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)} Verification`,
                description: `Verification checkpoint: ${phase.id}`,
                priority: 'critical',
                due_date: phaseEnd.toISOString(),
              });
              curDate = phaseEnd;
            }
            
            const insertRows = autoTasks.map(t => ({
              project_id: projectId,
              assigned_to: userId,
              assigned_by: userId,
              status: 'pending',
              ...t,
            }));
            
            const { data: insertedTasks, error: insertErr } = await supabase
              .from('project_tasks')
              .insert(insertRows)
              .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity');
            
            if (!insertErr && insertedTasks) {
              tasksData = insertedTasks;
              console.log('[Stage8] Auto-generated', insertedTasks.length, 'tasks');
            }
          }
        }
        
        // 4b. Template sub-task recovery: if tasks exist but none are template sub-tasks, backfill
        if (tasksData && tasksData.length > 0) {
          const hasTemplateSubTasks = tasksData.some(t => t.description?.startsWith('Template sub-task:'));
          
          if (!hasTemplateSubTasks) {
            // Find TEMPLATE_LOCK citation with items
            const templateLockCit = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
            const templateItems = (templateLockCit?.metadata as any)?.items as any[] | undefined;
            
            if (templateItems && templateItems.length > 0) {
              console.log('[Stage8] Recovery: Found', templateItems.length, 'template items but 0 sub-tasks in DB. Backfilling...');
              
              // Categorize helper (same logic as Stage 7)
              const categorize = (name: string): string => {
                const n = name.toLowerCase();
                if (n.includes('demolition') || n.includes('demo') || n.includes('removal')) return 'demolition';
                if (n.includes('prep') || n.includes('primer') || n.includes('underlayment') || 
                    n.includes('tape') || n.includes('compound') || n.includes('mesh') ||
                    n.includes('rebar') || n.includes('forming')) return 'preparation';
                if (n.includes('finish') || n.includes('baseboard') || n.includes('trim') ||
                    n.includes('transition') || n.includes('touch') || n.includes('qc')) return 'finishing';
                return 'installation';
              };
              
              const phaseNames: Record<string, string> = {
                demolition: 'Demolition', preparation: 'Preparation',
                installation: 'Installation', finishing: 'Finishing & QC',
              };
              
              // Get a due date from existing tasks as fallback
              const fallbackDueDate = tasksData.find(t => t.due_date)?.due_date || new Date().toISOString();
              
              const subTaskRows = templateItems.map((item: any) => {
                const phase = categorize(item.name || '');
                return {
                  project_id: projectId,
                  title: item.name || 'Template Item',
                  description: `Template sub-task: ${phaseNames[phase] || 'Installation'}`,
                  assigned_to: userId,
                  assigned_by: userId,
                  priority: 'medium',
                  status: 'pending',
                  due_date: fallbackDueDate,
                  unit_price: item.unitPrice || item.unit_price || item.totalPrice || item.total_price || 0,
                  quantity: item.quantity || 1,
                };
              });
              
              const { data: insertedSubTasks, error: subErr } = await supabase
                .from('project_tasks')
                .insert(subTaskRows)
                .select('id, title, status, priority, description, assigned_to, due_date, created_at, total_cost, unit_price, quantity');
              
              if (!subErr && insertedSubTasks) {
                tasksData = [...tasksData, ...insertedSubTasks];
                console.log('[Stage8] ✓ Recovery inserted', insertedSubTasks.length, 'template sub-tasks');
              } else if (subErr) {
                console.error('[Stage8] Recovery insert failed:', subErr);
              }
            }
          }
        }
        
        if (tasksData && tasksData.length > 0) {
          // ✓ Check which tasks have verification photos via loaded citations
          const taskPhotoIds = new Set<string>();
          loadedCitations.forEach((c: Citation) => {
            if (c?.metadata?.taskId && (c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION')) {
              taskPhotoIds.add(c.metadata.taskId as string);
            }
          });
          
          const tasksWithChecklist: TaskWithChecklist[] = tasksData.map(task => {
            // Infer phase from description (Stage 7 format) or title keywords
            let phase = 'installation';
            const descLower = (task.description || '').toLowerCase();
            const titleLower = task.title.toLowerCase();
            
            // Priority 1: Phase from description (set by Stage 7)
            if (descLower.includes('demolition') || descLower.includes('phase: demolition')) {
              phase = 'demolition';
            } else if (descLower.includes('preparation') || descLower.includes('phase: preparation')) {
              phase = 'preparation';
            } else if (descLower.includes('finishing') || descLower.includes('phase: finishing')) {
              phase = 'finishing';
            } else if (descLower.includes('installation') || descLower.includes('phase: installation')) {
              phase = 'installation';
            }
            // Priority 2: Title keyword fallback
            else if (titleLower.includes('demo') || titleLower.includes('remove') || titleLower.includes('tear')) {
              phase = 'demolition';
            } else if (titleLower.includes('prep') || titleLower.includes('measure') || titleLower.includes('setup') || titleLower.includes('primer') || titleLower.includes('underlayment')) {
              phase = 'preparation';
            } else if (titleLower.includes('finish') || titleLower.includes('qc') || titleLower.includes('inspect') || titleLower.includes('clean') || titleLower.includes('baseboard') || titleLower.includes('trim') || titleLower.includes('transition')) {
              phase = 'finishing';
            }
            
            const hasVerificationPhoto = taskPhotoIds.has(task.id);
            const isSubTask = descLower.includes('template sub-task');
            
            // IRON LAW: Derive cost from template_items (qty × unitPrice) as ground truth,
            // NOT from project_tasks.total_cost which may be stale after approvals
            let taskCost: number | null = null;
            if (isSubTask) {
              const templateLockCit = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
              const tplItems = (templateLockCit?.metadata as any)?.items as any[] | undefined;
              const matchedItem = tplItems?.find((item: any) => item.name === task.title);
              if (matchedItem) {
                taskCost = (matchedItem.quantity || 0) * (matchedItem.unitPrice || 0);
              } else {
                // Fallback to DB value if no template match
                taskCost = task.total_cost ? Number(task.total_cost) : null;
              }
            }
            
            return {
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              phase,
              assigned_to: task.assigned_to,
              due_date: task.due_date || null,
              created_at: task.created_at || null,
              isSubTask,
              templateItemCost: taskCost,
              checklist: [
                { id: `${task.id}-start`, text: 'Task started', done: task.status !== 'pending' },
                { id: `${task.id}-complete`, text: 'Task completed', done: task.status === 'completed' || task.status === 'done' },
                { id: `${task.id}-verify`, text: 'Verification photo', done: hasVerificationPhoto },
              ],
            };
          });
          setTasks(tasksWithChecklist);
        }
        
        // 5. Load documents + add document citations from verified_facts
        const { data: docsData } = await supabase
          .from('project_documents')
          .select('id, file_name, file_path, uploaded_at, uploaded_by_name, uploaded_by_role, ai_analysis_status, ai_analysis_result')
          .eq('project_id', projectId);
        
        let docsWithCategory: DocumentWithCategory[] = [];
        
        // First, process document citations to build a map
        const docCitations = loadedCitations.filter(c => 
          ['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION'].includes(c.cite_type)
        );
        
        const citationMap = new Map<string, { citation: Citation; category: DocumentCategory }>();
        docCitations.forEach(c => {
          const fileName = c.metadata?.fileName as string;
          if (fileName) {
            // Get category from citation metadata or derive from cite_type
            const category: DocumentCategory = 
              (c.metadata?.category as DocumentCategory) ||
              (c.cite_type === 'BLUEPRINT_UPLOAD' ? 'technical' : 
               c.cite_type === 'VISUAL_VERIFICATION' ? 'verification' : 'visual');
            citationMap.set(fileName.toLowerCase(), { citation: c, category });
          }
        });
        
        if (docsData) {
          docsWithCategory = docsData.map(doc => {
            // ✓ PRIORITY: Check citation for category first, then fall back to auto-detect
            const citationMatch = citationMap.get(doc.file_name.toLowerCase());
            return {
              id: doc.id,
              file_name: doc.file_name,
              file_path: doc.file_path,
              category: citationMatch?.category || categorizeDocument(doc.file_name, doc.file_path, doc.uploaded_by_role),
              citationId: citationMatch?.citation.id,
              uploadedAt: doc.uploaded_at,
              uploaded_by_name: doc.uploaded_by_name || undefined,
              uploaded_by_role: doc.uploaded_by_role || undefined,
              ai_analysis_status: doc.ai_analysis_status,
              ai_analysis_result: doc.ai_analysis_result as any,
            };
          });
        }
        
        // Add documents from citations that aren't in project_documents table
        docCitations.forEach(c => {
          const fileName = c.metadata?.fileName as string;
          if (fileName && !docsWithCategory.some(d => d.file_name.toLowerCase() === fileName.toLowerCase())) {
            const category: DocumentCategory = 
              (c.metadata?.category as DocumentCategory) ||
              (c.cite_type === 'BLUEPRINT_UPLOAD' ? 'technical' : 
               c.cite_type === 'VISUAL_VERIFICATION' ? 'verification' : 'visual');
            docsWithCategory.push({
              id: c.id,
              file_name: fileName,
              file_path: typeof c.value === 'string' ? c.value : '',
              category,
              citationId: c.id,
              uploadedAt: c.timestamp,
            });
          }
        });
        
        // 5b. Auto-generate template document if missing — ensures it's always in Documents panel
        const hasTemplateDoc = docsWithCategory.some(d => d.file_name.includes('materials-labor'));
        if (!hasTemplateDoc) {
          const tradeCit = loadedCitations.find(c => c.cite_type === 'TRADE_SELECTION');
          const templateLockCit = loadedCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
          const tradeName = (tradeCit?.answer || tradeCit?.value || 'custom') as string;
          const normalizedTrade = tradeName.toLowerCase().replace(/\s+/g, '_');
          const expectedFileName = `materials-labor-${normalizedTrade}.txt`;
          const expectedFilePath = `${projectId}/${expectedFileName}`;
          
          // First: check storage for ANY materials-labor file (may have old space-name)
          const { data: storageCheck } = await supabase.storage
            .from('project-documents')
            .list(projectId, { search: 'materials-labor' });
          
          // Clean up old files with spaces in name (legacy format)
          if (storageCheck && storageCheck.length > 0) {
            const oldFiles = storageCheck.filter(f => f.name !== expectedFileName);
            if (oldFiles.length > 0) {
              await supabase.storage.from('project-documents').remove(
                oldFiles.map(f => `${projectId}/${f.name}`)
              );
            }
          }
          
          // Always (re)create from TEMPLATE_LOCK citation — this is the freshest data
          const templateItems = (templateLockCit?.metadata as any)?.items as any[] | undefined;
          const matCost = Number(summary?.material_cost || (templateLockCit?.metadata as any)?.material_total || 0);
          const labCost = Number(summary?.labor_cost || (templateLockCit?.metadata as any)?.labor_total || 0);
          
          if ((templateItems && templateItems.length > 0) || matCost > 0 || labCost > 0) {
            const materials = (templateItems || []).filter((i: any) => i.category === 'material');
            const labor = (templateItems || []).filter((i: any) => i.category === 'labor');
            
            const documentSnapshot = {
              generated_at: new Date().toISOString(),
              trade: tradeName,
              gfa_sqft: Number((loadedCitations.find(c => c.cite_type === 'GFA_LOCK')?.value) || 0),
              waste_percent: (templateLockCit?.metadata as any)?.waste_percent || 0,
              markup_percent: (templateLockCit?.metadata as any)?.markup_percent || 0,
              demolition_cost: (templateLockCit?.metadata as any)?.demolition_cost || 0,
              source: 'stage8_auto',
              materials: materials.map((m: any) => ({
                name: m.name, category: m.category, quantity: m.quantity,
                baseQuantity: m.baseQuantity, unit: m.unit,
                unitPrice: m.unitPrice, totalPrice: m.totalPrice,
                wasteApplied: m.applyWaste,
              })),
              labor: labor.map((l: any) => ({
                name: l.name, category: l.category, quantity: l.quantity,
                unit: l.unit, unitPrice: l.unitPrice, totalPrice: l.totalPrice,
              })),
              summary: {
                material_total: matCost,
                labor_total: labCost,
                subtotal: (templateLockCit?.metadata as any)?.subtotal || (matCost + labCost),
                markup_amount: (templateLockCit?.metadata as any)?.markup_amount || 0,
                net_total: Number(summary?.total_cost || templateLockCit?.value || 0),
              },
            };
            
            const jsonBlob = new Blob([JSON.stringify(documentSnapshot, null, 2)], { type: 'text/plain' });
            
            await supabase.storage.from('project-documents').remove([expectedFilePath]);
            const { error: uploadErr } = await supabase.storage
              .from('project-documents')
              .upload(expectedFilePath, jsonBlob, { contentType: 'text/plain', upsert: true });
            
            if (!uploadErr) {
              // Clean any old DB records with mismatched names
              const { data: oldDocs } = await supabase
                .from('project_documents')
                .select('id, file_name')
                .eq('project_id', projectId)
                .ilike('file_name', 'materials-labor%');
              
              if (oldDocs && oldDocs.length > 0) {
                await supabase.from('project_documents').delete().in('id', oldDocs.map(d => d.id));
              }
              
              const { data: newDoc } = await supabase
                .from('project_documents')
                .insert({
                  project_id: projectId,
                  file_name: expectedFileName,
                  file_path: expectedFilePath,
                  file_size: jsonBlob.size,
                })
                .select('id, file_name, file_path, uploaded_at')
                .single();
              
              if (newDoc) {
                docsWithCategory.push({
                  id: newDoc.id,
                  file_name: newDoc.file_name,
                  file_path: newDoc.file_path,
                  category: 'financial' as DocumentCategory,
                  uploadedAt: newDoc.uploaded_at,
                });
                console.log('[Stage8] ✓ Auto-generated template document:', expectedFileName);
              }
            }
          }
        }
        
        setDocuments(docsWithCategory);
        
        // 6. Load contracts
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, contract_number, status, total_amount, share_token, project_name, client_name, client_email, contractor_name, contractor_email, start_date, estimated_end_date, contractor_signature, client_signature, client_signed_at, sent_to_client_at, client_viewed_at')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        if (contractsData) {
          setContracts(contractsData);
          
          // 6b. Generate CONTRACT citations for each contract if not present
          const existingContractCits = loadedCitations.filter(c => c.cite_type === 'CONTRACT');
          const existingContractIds = new Set(existingContractCits.map(c => (c.metadata as any)?.contract_id));
          
          contractsData.forEach((contract, idx) => {
            if (!existingContractIds.has(contract.id)) {
              const sigStatus = contract.client_signature && contract.contractor_signature ? 'Fully Signed' 
                : contract.client_signature ? 'Client Signed' 
                : contract.contractor_signature ? 'Contractor Signed' 
                : 'Unsigned';
              const contractCitation: Citation = {
                id: `cite_contract_${contract.id.slice(0, 8)}`,
                cite_type: 'CONTRACT' as any,
                question_key: `contract_${idx + 1}`,
                answer: `#${contract.contract_number} — ${contract.status.toUpperCase()} — ${sigStatus}${contract.total_amount ? ` — $${contract.total_amount.toLocaleString()}` : ''}`,
                value: contract.status,
                timestamp: new Date().toISOString(),
                metadata: {
                  contract_id: contract.id,
                  contract_number: contract.contract_number,
                  status: contract.status,
                  total_amount: contract.total_amount,
                  client_name: contract.client_name,
                  contractor_name: contract.contractor_name,
                  client_signed: !!contract.client_signature,
                  contractor_signed: !!contract.contractor_signature,
                  client_signed_at: contract.client_signed_at,
                  sent_at: contract.sent_to_client_at,
                  source: 'contract_engine',
                },
              };
              loadedCitations.push(contractCitation);
              newTeamCitations.push(contractCitation);
            }
          });
        }
        
        // Financial lock: Only unlocked if owner has financial data
        if (userRole === 'owner') {
          const hasFinancialData = loadedCitations.some(c => 
            ['BUDGET', 'MATERIAL', 'DEMOLITION_PRICE'].includes(c.cite_type)
          ) || (contractsData && contractsData.length > 0);
          
          setIsFinancialLocked(!hasFinancialData);
        } else {
          // Always locked for non-owners
          setIsFinancialLocked(true);
        }
        
        // 7. Load current user profile for contracts
        const { data: profile } = await supabase
          .from('bu_profiles')
          .select('company_name, phone, service_area')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profile) {
          const { data: { user } } = await supabase.auth.getUser();
          setUserProfile({
            company_name: profile.company_name,
            phone: profile.phone,
            email: user?.email || null,
            service_area: profile.service_area,
          });
        }
        
        // 7b. Load PROJECT OWNER profile (Client in contracts)
        // Always fetch the project owner's data, even when Foreman is creating contract
        if (project) {
          const projectOwnerId = project.user_id;
          const { data: ownerBuProfile } = await supabase
            .from('bu_profiles')
            .select('company_name, phone, service_area')
            .eq('user_id', projectOwnerId)
            .maybeSingle();
          const { data: ownerBasicProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', projectOwnerId)
            .maybeSingle();
          // Get owner email from auth admin or fallback
          const ownerEmail = projectOwnerId === userId 
            ? (await supabase.auth.getUser()).data.user?.email || null
            : null; // For non-owner users, email will come from contract flow
          
          setOwnerProfile({
            full_name: ownerBasicProfile?.full_name || null,
            company_name: ownerBuProfile?.company_name || null,
            phone: ownerBuProfile?.phone || null,
            email: ownerEmail,
            service_area: ownerBuProfile?.service_area || null,
          });
        }
        
      } catch (err) {
        console.error('[Stage8] Failed to load data:', err);
        logCriticalError('[Stage8] Data load failed', err);
        
        // ✓ CRITICAL FALLBACK: Try localStorage if Supabase fails completely
        const localState = restoreProjectFromLocalStorage(projectId);
        if (localState?.citations) {
          setCitations(localState.citations);
          setDataSource('localStorage');
          toast.warning('Loaded from offline backup - connection issue detected');
        } else {
          toast.error('Failed to load project data');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [projectId, userId, userRole, categorizeDocument]);
  
  // ✓ PERSISTENCE CHECK: Sync citations to localStorage whenever they change
  // Prevents data loss on Dev Refresh
  // ✓ CRITICAL: No hardcoded fallbacks - only use actual project data
  useEffect(() => {
    if (projectId && citations.length > 0) {
      // Get GFA value from citations for sync - NO DEFAULT FALLBACK
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const gfaValue = typeof gfaCitation?.value === 'number' 
        ? gfaCitation.value 
        : typeof gfaCitation?.metadata?.gfa_value === 'number'
          ? gfaCitation.metadata.gfa_value
          : 0; // ✓ NO HARDCODED FALLBACK - 0 means "not set"
      
      syncCitationsToLocalStorage(projectId, citations, 8, gfaValue);
      console.log('[Stage8] ✓ Citations synced to localStorage:', citations.length);
    }
  }, [projectId, citations]);
  
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
  
  // Fetch weather data + generate WEATHER_ALERT citation
  const fetchWeather = async (address: string) => {
    try {
      const response = await supabase.functions.invoke('get-weather', {
        body: { location: address, days: 5 }
      });
      
      if (response.data?.current) {
        const weatherInfo = {
          temp: response.data.current.temp,
          condition: response.data.current.description,
          alerts: response.data.alerts || [],
        };
        setWeatherData(weatherInfo);
        
        // ✓ Generate WEATHER_ALERT citation from live data
        const hasWeatherCit = citations.some(c => c.cite_type === 'WEATHER_ALERT');
        if (!hasWeatherCit) {
          const alertText = weatherInfo.alerts.length > 0 
            ? `${weatherInfo.alerts.length} alert(s): ${weatherInfo.alerts.join(', ')}`
            : `${weatherInfo.temp}°C — ${weatherInfo.condition}`;
          const weatherCitation: Citation = {
            id: `cite_weather_${Date.now()}`,
            cite_type: 'WEATHER_ALERT' as any,
            question_key: 'weather_alert',
            answer: alertText,
            value: weatherInfo,
            timestamp: new Date().toISOString(),
            metadata: {
              temp: weatherInfo.temp,
              condition: weatherInfo.condition,
              alerts: weatherInfo.alerts,
              source: 'openweathermap',
              checked_at: new Date().toISOString(),
            },
          };
          setCitations(prev => {
            // Don't add if already present (race condition guard)
            if (prev.some(c => c.cite_type === 'WEATHER_ALERT')) return prev;
            const updated = [...prev, weatherCitation];
            // Persist to DB
            supabase.from('project_summaries')
              .select('id, verified_facts')
              .eq('project_id', projectId)
              .maybeSingle()
              .then(({ data: sumData }) => {
                if (sumData?.id) {
                  const currentFacts = Array.isArray(sumData.verified_facts) ? sumData.verified_facts : [];
                  // Only add if not already there
                  if (!currentFacts.some((f: any) => f.cite_type === 'WEATHER_ALERT')) {
                    supabase.from('project_summaries')
                      .update({ verified_facts: [...currentFacts, weatherCitation as unknown as Record<string, unknown>] as unknown as null })
                      .eq('id', sumData.id)
                      .then(() => console.log('[Stage8] ✓ WEATHER_ALERT citation persisted'));
                  }
                }
              });
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('[Stage8] Weather fetch failed:', err);
    }
  };
  
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
  const handleMessaSynthesis = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to use M.E.S.S.A. Synthesis');
        return;
      }
      
      toast.loading('M.E.S.S.A. Synthesis in progress...', { id: 'messa-synth', description: 'Dual Engine Analysis with GPT-5 + Gemini Pro' });
      
      const { data, error } = await supabase.functions.invoke('ai-project-analysis', {
        body: {
          projectId,
          analysisType: 'synthesis',
        },
      });
      
      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please try again in a few minutes.', { id: 'messa-synth' });
        } else if (error.message?.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits to continue.', { id: 'messa-synth' });
        } else {
          throw error;
        }
        return;
      }
      
      if (data) {
        // Build professional HTML preview
        const html = buildMessaSynthesisHTMLMemo(data);
        
        setMessaSynthesisData(data);
        setMessaPreviewHtml(html);
        setShowMessaPreview(true);
        
        toast.success('M.E.S.S.A. Synthesis Complete!', { 
          id: 'messa-synth',
          description: data.dualEngineUsed ? '✓ Dual Engine (GPT-5 + Gemini Pro)' : 'Single Engine Analysis',
          duration: 5000,
        });
        
        console.log('[M.E.S.S.A. Synthesis Result]', data);
      }
    } catch (err) {
      console.error('[Stage8] M.E.S.S.A. Synthesis failed:', err);
      toast.error('M.E.S.S.A. Synthesis failed. Please try again.', { id: 'messa-synth' });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [projectId]);
  
  // Build M.E.S.S.A. Audit Report HTML - extracted to htmlBuilders.ts
  const buildMessaSynthesisHTMLMemo = useCallback((data: any) => {
    return buildMessaSynthesisHTMLFn(data, { citations, tasks });
  }, [citations, tasks]);
  
  // Legacy AI Analysis handler (for backwards compatibility)
  const handleAIAnalysis = handleMessaSynthesis;
  
  // ============================================
  // MESSA DNA REPORT PDF GENERATION
  // ============================================
  const handleDnaReportPdf = useCallback(async () => {
    setIsGeneratingDnaReport(true);
    
    // ============================================
    // STEP 0: Knight Rider Radar Scanner + AI Visual Analysis
    // ============================================
    // Reset scanner state
    setDnaScannedPillars(new Set());
    setDnaScanningPillar(0);
    
    // Pillar keys for sequential scanning  
    const pillarKeys = ['basics', 'area', 'trade', 'team', 'timeline', 'docs', 'weather', 'financial', 'compliance'];
    
    // Auto-switch to DNA audit panel to show the animation
    setActiveOrbitalPanel('messa-deep-audit');
    
    let aiAnalysisData: any = null;
    let obcDetailedResult: any = null;
    try {
      // Scan pillars 0-1 during image fetch
      toast.loading('Step 1/4 — Fetching project images...', { id: 'dna-analysis', description: 'Scanning Project Basics & Area Dimensions' });
      
      await new Promise(r => setTimeout(r, 800));
      setDnaScannedPillars(prev => new Set([...prev, 0]));
      setDnaScanningPillar(1);
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 1]));
      setDnaScanningPillar(2);
      
      // Scan pillars 2-3 during AI analysis
      toast.loading('Step 2/4 — AI Visual Analysis running...', { id: 'dna-analysis', description: 'Scanning Trade & Team Architecture' });

      // Start AI analysis + OBC compliance check in parallel with scanner
      const analysisPromise = supabase.functions.invoke('ai-project-analysis', {
        body: { projectId, analysisType: 'synthesis' },
      });
      
      // OBC Status Check — detailed compliance analysis
      const tradeCitForObc = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const workTypeCitForObc = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCitForObc = citations.find(c => c.cite_type === 'GFA_LOCK');
      const locationCitForObc = citations.find(c => c.cite_type === 'LOCATION');
      const templateCitForObc = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      
      // Build materials list from template citation metadata
      const templateMeta = templateCitForObc?.metadata as any;
      const materialsForObc = Array.isArray(templateMeta?.items)
        ? templateMeta.items.slice(0, 15).map((it: any) => ({ name: it.name || it.item_name || 'Unknown' }))
        : [];
      
      const obcCheckPromise = supabase.functions.invoke('obc-status-check', {
        body: {
          projectData: {
            project_type: workTypeCitForObc?.answer || 'Renovation',
            scope_of_work: workTypeCitForObc?.answer || '',
            confirmed_area_sqft: gfaCitForObc?.answer ? parseFloat(String(gfaCitForObc.answer)) : 0,
            materials: materialsForObc,
            blueprint_status: citations.some(c => c.cite_type === 'BLUEPRINT_UPLOAD') ? 'uploaded' : 'none',
            location: locationCitForObc?.answer || 'Ontario, Canada',
            trade_type: tradeCitForObc?.answer || 'general_contractor',
          }
        }
      });
      
      await new Promise(r => setTimeout(r, 700));
      setDnaScannedPillars(prev => new Set([...prev, 2]));
      setDnaScanningPillar(3);
      
      await new Promise(r => setTimeout(r, 700));
      setDnaScannedPillars(prev => new Set([...prev, 3]));
      setDnaScanningPillar(4);
      
      // Wait for AI analysis + OBC check to complete in parallel
      const [analysisRes, obcRes] = await Promise.allSettled([analysisPromise, obcCheckPromise]);
      
      const analysisResult = analysisRes.status === 'fulfilled' ? analysisRes.value?.data : null;
      const analysisError = analysisRes.status === 'fulfilled' ? analysisRes.value?.error : analysisRes.reason;
      
      if (obcRes.status === 'fulfilled' && obcRes.value?.data?.result) {
        obcDetailedResult = obcRes.value.data.result;
        console.log('[DNA Report] OBC detailed result:', obcDetailedResult);
      } else {
        console.warn('[DNA Report] OBC check failed:', obcRes.status === 'rejected' ? obcRes.reason : obcRes.value?.error);
      }
      
      // Scan pillars 4-5 during compilation
      setDnaScannedPillars(prev => new Set([...prev, 4]));
      setDnaScanningPillar(5);
      
      if (analysisError) {
        console.warn('[DNA Report] AI analysis error:', analysisError);
        toast.loading('Step 3/4 — Compiling report data...', { id: 'dna-analysis', description: 'Scanning Documents & Weather' });
      } else if (analysisResult) {
        aiAnalysisData = analysisResult;
        toast.loading('Step 3/4 — Compiling report data...', { id: 'dna-analysis', description: 'Scanning Documents & Weather' });
      }
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 5]));
      setDnaScanningPillar(6);
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 6]));
      setDnaScanningPillar(7);
      
      // Final pillar scan
      toast.loading('Step 4/4 — Generating PDF...', { id: 'dna-analysis', description: 'Scanning Financial Summary & Building Code Alignment' });
      
      await new Promise(r => setTimeout(r, 700));
      setDnaScannedPillars(prev => new Set([...prev, 7]));
      setDnaScanningPillar(8);
      
      await new Promise(r => setTimeout(r, 600));
      setDnaScannedPillars(prev => new Set([...prev, 8]));
      setDnaScanningPillar(null); // All done scanning
    } catch (analysisErr) {
      console.warn('[DNA Report] AI analysis skipped:', analysisErr);
      // Mark all as scanned on error
      setDnaScannedPillars(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
      setDnaScanningPillar(null);
      toast.loading('Generating PDF...', { id: 'dna-analysis', description: 'AI analysis unavailable, building report from project data' });
    }
    try {
      const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const locationCit = citations.find(c => c.cite_type === 'LOCATION');
      const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const execModeCit = citations.find(c => c.cite_type === 'EXECUTION_MODE');
      const teamStructCit = citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
      const teamInviteCit = citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');
      const teamPermCit = citations.find(c => c.cite_type === 'TEAM_PERMISSION_SET');
      const teamSizeCit = citations.find(c => c.cite_type === 'TEAM_SIZE');
      let timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
      let endDateCit = citations.find(c => c.cite_type === 'END_DATE');
      const dnaCit = citations.find(c => c.cite_type === 'DNA_FINALIZED');
      const photoCits = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');

      // FIX: Contract dates take priority over citation dates (Operational Truth)
      // This prevents timeline drift between DNA report and Contract documents.
      // CRITICAL: Fetch contracts FRESH from DB to avoid stale React state
      let freshContracts = contracts;
      try {
        const { data: freshContractData } = await supabase
          .from('contracts')
          .select('id, contract_number, status, start_date, estimated_end_date')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        if (freshContractData && freshContractData.length > 0) {
          freshContracts = freshContractData as any;
          console.log('[DNA Report] ✓ Fresh contracts fetched:', freshContractData.length);
        }
      } catch (_) { /* fallback to state */ }
      
      const activeContract = freshContracts.find(c => c.status !== 'cancelled' && (c.start_date || c.estimated_end_date));
      if (activeContract) {
        if (activeContract.start_date) {
          timelineCit = {
            id: `contract_timeline_${Date.now()}`,
            cite_type: 'TIMELINE',
            question_key: 'timeline',
            answer: activeContract.start_date,
            value: 'scheduled',
            timestamp: new Date().toISOString(),
            metadata: {
              start_date: activeContract.start_date,
              source: 'contracts',
            },
          } as Citation;
        }
        if (activeContract.estimated_end_date) {
          endDateCit = {
            id: `contract_end_date_${Date.now()}`,
            cite_type: 'END_DATE',
            question_key: 'end_date',
            answer: activeContract.estimated_end_date,
            value: activeContract.estimated_end_date,
            timestamp: new Date().toISOString(),
            metadata: {
              end_date: activeContract.estimated_end_date,
              source: 'contracts',
            },
          } as Citation;
        }
        console.log('[DNA Report] ✓ Timeline overridden from contracts:', activeContract.start_date, '→', activeContract.estimated_end_date);
      }

      // FIX: Cap photo citation timestamps to report generation time (prevent "future date" references)
      const reportGeneratedAt = new Date();
      const cappedPhotoCits = photoCits.map(pc => {
        if (pc.timestamp) {
          const citDate = new Date(pc.timestamp);
          if (citDate > reportGeneratedAt) {
            return { ...pc, timestamp: reportGeneratedAt.toISOString() };
          }
        }
        return pc;
      });
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const demoPriceCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
      const budgetCit = citations.find(c => c.cite_type === 'BUDGET');
      const allTeamInviteCits = citations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE');
      const sitePresenceCits = citations.filter(c => c.cite_type === 'SITE_PRESENCE');

      // Fetch site check-in records AND completed tasks for DNA report
      let siteCheckins: any[] = [];
      let completedTasksByDay: Map<string, { title: string; assignee: string; status: string }[]> = new Map();
      let allProjectTasks: any[] = [];
      try {
        const [checkinRes, tasksRes] = await Promise.all([
          supabase
            .from('site_checkins')
            .select('id, user_id, checked_in_at, checked_out_at, weather_snapshot')
            .eq('project_id', projectId)
            .order('checked_in_at', { ascending: false })
            .limit(20),
          supabase
            .from('project_tasks')
            .select('id, title, status, assigned_to, updated_at, due_date')
            .eq('project_id', projectId)
            .is('archived_at', null)
        ]);
        
        allProjectTasks = tasksRes.data || [];
        
        if (checkinRes.data) {
          // Fetch profile names for both check-ins and tasks
          const allUserIds = [...new Set([
            ...checkinRes.data.map(c => c.user_id),
            ...allProjectTasks.map(t => t.assigned_to)
          ])];
          const { data: checkinProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', allUserIds);
          const nameMap = new Map(checkinProfiles?.map(p => [p.user_id, p.full_name]) || []);
          siteCheckins = checkinRes.data.map(c => ({
            ...c,
            user_name: nameMap.get(c.user_id) || 'Unknown',
          }));
          
          // Group completed/done tasks by their completion day (updated_at date)
          const completedTasks = allProjectTasks.filter(t => t.status === 'completed' || t.status === 'done');
          for (const task of completedTasks) {
            const dayKey = format(new Date(task.updated_at), 'yyyy-MM-dd');
            if (!completedTasksByDay.has(dayKey)) completedTasksByDay.set(dayKey, []);
            completedTasksByDay.get(dayKey)!.push({
              title: task.title,
              assignee: nameMap.get(task.assigned_to) || 'Unassigned',
              status: task.status,
            });
          }
        }
      } catch (_) { /* ignore */ }

      // Fetch user profile for branded header
      let profile: { company_name?: string | null; phone?: string | null; company_website?: string | null } = {};
      try {
        const { data: bp } = await supabase
          .from('bu_profiles')
          .select('company_name, phone, company_website')
          .eq('user_id', userId)
          .maybeSingle();
        if (bp) profile = bp;
      } catch (_) { /* ignore */ }

      // Fetch saved AI visual analysis + line items from project_summaries
      let savedPhotoEstimate: any = null;
      let savedLineItems: any[] = [];
      let savedTemplateItems: any[] = [];
      try {
        const { data: summaryRow } = await supabase
          .from('project_summaries')
          .select('photo_estimate, line_items, template_items')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (summaryRow?.photo_estimate) {
          savedPhotoEstimate = summaryRow.photo_estimate;
        }
        if (Array.isArray(summaryRow?.line_items)) {
          savedLineItems = summaryRow.line_items as any[];
        }
        if (Array.isArray(summaryRow?.template_items)) {
          savedTemplateItems = summaryRow.template_items as any[];
        }
      } catch (_) { /* ignore */ }

      // Fetch user email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email || '';

      interface DnaPillar {
        label: string; sub: string; icon: string; color: string; status: boolean;
        sources: { label: string; cit: Citation | undefined; field: string }[];
      }

      const pillars: DnaPillar[] = [
        { label: '1 — Project Basics', sub: 'Name × Location × Work Type', icon: '🏗️', color: '#10b981', status: !!nameCit && !!locationCit && !!workTypeCit, sources: [
          { label: 'Project Name', cit: nameCit, field: 'PROJECT_NAME' },
          { label: 'Location', cit: locationCit, field: 'LOCATION' },
          { label: 'Work Type', cit: workTypeCit, field: 'WORK_TYPE' },
        ]},
        { label: '2 — Area & Dimensions', sub: 'GFA Lock × Blueprint × Site', icon: '📐', color: '#3b82f6', status: !!gfaCit, sources: [
          { label: 'GFA Lock', cit: gfaCit, field: 'GFA_LOCK' },
          { label: 'Blueprint Upload', cit: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
          { label: 'Site Condition', cit: siteCondCit, field: 'SITE_CONDITION' },
        ]},
        { label: '3 — Trade & Template', sub: 'PDF RAG × Materials Table', icon: '🔬', color: '#f97316', status: !!tradeCit && !!templateCit, sources: [
          { label: 'Trade Selection', cit: tradeCit, field: 'TRADE_SELECTION' },
          { label: 'Template Lock', cit: templateCit, field: 'TEMPLATE_LOCK' },
          { label: 'Execution Mode', cit: execModeCit, field: 'EXECUTION_MODE' },
        ]},
        { label: '4 — Team Architecture', sub: 'Structure × Roles × Permissions', icon: '👥', color: '#14b8a6', status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0, sources: [
          { label: 'Team Structure', cit: teamStructCit, field: 'TEAM_STRUCTURE' },
          { label: 'Team Size', cit: teamSizeCit, field: 'TEAM_SIZE' },
          ...allTeamInviteCits.map((tc, i) => ({ label: `Member: ${tc.answer?.split('—')[0]?.trim() || `#${i+1}`}`, cit: tc, field: 'TEAM_MEMBER_INVITE' })),
          ...(allTeamInviteCits.length === 0 ? [{ label: 'Member Invites', cit: teamInviteCit, field: 'TEAM_MEMBER_INVITE' }] : []),
          { label: 'Permission Set', cit: teamPermCit, field: 'TEAM_PERMISSION_SET' },
        ]},
        { label: '5 — Execution Timeline', sub: 'Start × End × DNA Finalized', icon: '📅', color: '#6366f1', status: !!timelineCit && !!endDateCit, sources: [
          { label: 'Timeline (Start)', cit: timelineCit, field: 'TIMELINE' },
          { label: 'End Date', cit: endDateCit, field: 'END_DATE' },
          { label: 'DNA Finalized', cit: dnaCit, field: 'DNA_FINALIZED' },
        ]},
        { label: '6 — Files & Contracts', sub: 'Site Photos × AI Vision × Blueprint', icon: '📁', color: '#0ea5e9', status: cappedPhotoCits.length > 0 || !!blueprintCit, sources: [
          ...cappedPhotoCits.slice(0, 5).map((pc, i) => ({ label: `Photo ${i + 1}`, cit: pc, field: pc.cite_type || 'SITE_PHOTO' })),
          ...(cappedPhotoCits.length === 0 ? [{ label: 'Site Photo / Visual', cit: undefined as Citation | undefined, field: 'SITE_PHOTO' }] : []),
          { label: 'Blueprint', cit: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
        ]},
        { label: '7 — Site Log & Location', sub: 'Alerts × Site Readiness × Presence', icon: '🌦️', color: '#06b6d4', status: siteCheckins.length > 0 || sitePresenceCits.length > 0, sources: [
          { label: 'Weather Alert', cit: weatherCit, field: 'WEATHER_ALERT' },
          { label: 'Site Condition', cit: siteCondCit, field: 'SITE_CONDITION' },
          ...sitePresenceCits.slice(0, 3).map((sp, i) => ({ label: `Site Presence #${i + 1}`, cit: sp, field: 'SITE_PRESENCE' })),
          ...(sitePresenceCits.length === 0 && siteCheckins.length === 0 ? [{ label: '⚠️ MISSING SITE LOG', cit: undefined as Citation | undefined, field: 'SITE_PRESENCE' }] : []),
          ...(sitePresenceCits.length === 0 && siteCheckins.length > 0 ? [{ label: `Site Check-ins (${siteCheckins.length})`, cit: undefined as Citation | undefined, field: 'SITE_PRESENCE' }] : []),
        ]},
        { label: '8 — Financial Summary', sub: 'Sync + Tax (HST/GST)', icon: '💰', color: '#ef4444', status: (financialSummary?.total_cost ?? 0) > 0 && !!locationCit, sources: [
          { label: 'Location (Tax Region)', cit: locationCit, field: 'LOCATION' },
          { label: 'Demolition Price', cit: demoPriceCit, field: 'DEMOLITION_PRICE' },
          { label: 'Total Budget', cit: budgetCit, field: 'BUDGET' },
        ]},
        { label: '9 — Building Code Alignment', sub: 'OBC Part 9 × Material Specs × Safety', icon: '⚖️', color: '#8b5cf6', status: (() => {
          // ── HARD-BLOCK: Count ONLY verified regulatory docs, reject everything else ──
          const verifiedDocs = documents.filter(d => d.ai_analysis_status === 'verified_regulatory');
          const rejectedDocs = documents.filter(d => d.ai_analysis_status === 'rejected_non_regulatory');
          const pendingDocs = documents.filter(d => d.ai_analysis_status === 'pending');
          
          // If there are rejected docs and NO verified docs → definitive FAIL
          if (rejectedDocs.length > 0 && verifiedDocs.length === 0) return false;
          // If docs are still being scanned → FAIL (wait for classification)
          if (pendingDocs.length > 0 && verifiedDocs.length === 0) return false;
          
          // Gemini OBC compliance result (from ai-project-analysis response)
          const geminiObcStatus = aiAnalysisData?.obcCompliance?.status as string | undefined;
          const geminiObcDocsCount: number = aiAnalysisData?.obcCompliance?.documentsDetected ?? -1;
          
          // If Gemini ran and explicitly returned PASS → trust it
          if (geminiObcStatus === 'PASS') return true;
          // If Gemini ran and returned FAIL, PENDING, or no docs → FAIL
          if (geminiObcStatus === 'FAIL') return false;
          if (geminiObcStatus === 'PENDING') return false;
          if (geminiObcDocsCount === 0) return false;
          
          // Fallback: legacy obc-status-check result
          const hasObcData = obcComplianceResults.sections.length > 0 || !!obcDetailedResult;
          const obcStatusFail = obcDetailedResult?.obc_status === 'FAIL' || obcDetailedResult?.obc_status === 'fail';
          const permitNotObtained = obcDetailedResult?.permitStatus?.obtained === false;
          const missingSources = [
            !obcDetailedResult?.obc_status || obcStatusFail,
            permitNotObtained,
            !templateCit,
          ].filter(Boolean).length;
          return hasObcData && !obcStatusFail && !permitNotObtained && missingSources === 0;
        })(), sources: [
          // Show documents being scanned
          ...(() => {
            const pendingDocs = documents.filter(d => d.ai_analysis_status === 'pending');
            return pendingDocs.length > 0 ? [{
              label: `🔄 ${pendingDocs.length} doc(s) being scanned by AI...`,
              cit: undefined as Citation | undefined,
              field: 'DOC_SCANNING'
            }] : [];
          })(),
          // Show rejected documents warning — docs AI classified as non-regulatory
          ...(() => {
            const rejectedDocs = documents.filter(d => d.ai_analysis_status === 'rejected_non_regulatory');
            return rejectedDocs.map(d => ({
              label: `🚫 REJECTED: "${d.file_name}" — ${(d.ai_analysis_result as any)?.doc_type || 'Not regulatory'} (${(d.ai_analysis_result as any)?.confidence || 'N/A'} confidence)`,
              cit: undefined as Citation | undefined,
              field: 'DOC_AUTHENTICITY'
            }));
          })(),
          // Show verified regulatory docs
          ...(() => {
            const verifiedDocs = documents.filter(d => d.ai_analysis_status === 'verified_regulatory');
            return verifiedDocs.map(d => ({
              label: `✅ ${d.file_name} — AI Verified: ${(d.ai_analysis_result as any)?.doc_type || 'Regulatory'} (${(d.ai_analysis_result as any)?.confidence || ''})`,
              cit: undefined as Citation | undefined,
              field: 'OBC_COMPLIANCE'
            }));
          })(),
          // Show Gemini OBC analysis result if available
          ...(aiAnalysisData?.obcCompliance ? [{ 
            label: `Gemini OBC Scan: ${aiAnalysisData.obcCompliance.status} (${aiAnalysisData.obcCompliance.documentsDetected} doc${aiAnalysisData.obcCompliance.documentsDetected !== 1 ? 's' : ''} found)`, 
            cit: undefined as Citation | undefined, 
            field: 'OBC_STATUS' 
          }] : []),
          ...(aiAnalysisData?.obcCompliance?.documentNames?.slice(0, 3).map((n: string) => ({ 
            label: `📄 ${n}`, cit: undefined as Citation | undefined, field: 'OBC_COMPLIANCE' 
          })) || []),
          ...(obcComplianceResults.sections.slice(0, 3).map(s => ({ label: `§ ${s.section_number} — ${s.section_title}`, cit: undefined as Citation | undefined, field: 'OBC_COMPLIANCE' }))),
          ...(obcComplianceResults.sections.length === 0 && !obcDetailedResult && !aiAnalysisData?.obcCompliance ? [{ label: '⚠️ No OBC / permit documents found', cit: undefined as Citation | undefined, field: 'OBC_COMPLIANCE' }] : []),
          ...(obcDetailedResult?.obc_status ? [{ label: `OBC Status: ${obcDetailedResult.obc_status}`, cit: undefined as Citation | undefined, field: 'OBC_STATUS' }] : []),
          { label: 'Material Specifications', cit: templateCit, field: 'TEMPLATE_LOCK' },
          { label: obcDetailedResult?.permitStatus?.obtained ? 'Building Permit ✓' : 'Building Permit ❌ NOT OBTAINED', cit: undefined as Citation | undefined, field: 'BUILDING_PERMIT' },
          { label: 'Fire Resistance Rating', cit: undefined as Citation | undefined, field: 'FIRE_RESISTANCE' },
        ]},
      ];

      const passCount = pillars.filter(p => p.status).length;
      const totalPillarCount = 9;
      const pct = Math.round((passCount / totalPillarCount) * 100);
      const scoreColor = passCount === totalPillarCount ? '#10b981' : passCount >= 5 ? '#f59e0b' : '#ef4444';
      const nowStr = new Date().toISOString();
      const projName = projectData?.name || 'Project';
      const projAddr = projectData?.address || '';
      const scoreLabel = passCount === totalPillarCount ? 'PERFECT' : passCount >= 5 ? 'PARTIAL' : 'CRITICAL';

      const esc = (v: string | number | null | undefined) => {
        if (v === null || v === undefined) return '';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const buildSourceRow = (s: { label: string; cit: Citation | undefined; field: string }) => {
        const val = s.cit?.answer || (s.cit?.metadata as any)?.value || '—';
        const ts = s.cit?.timestamp ? new Date(s.cit.timestamp).toLocaleDateString() : '—';
        const citeId = s.cit?.id?.slice(0, 8) || '—';
        const statusColor = s.cit ? '#059669' : '#dc2626';
        const statusText = s.cit ? '✓ cite:' + citeId : '✗ Missing';
        const displayVal = typeof val === 'string' ? esc(val.slice(0, 55)) : esc(JSON.stringify(val).slice(0, 55));
        return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
          '<td style="padding:4px 8px;color:#6b7280;">' + esc(s.label) + '</td>' +
          '<td style="padding:4px 8px;font-family:monospace;font-size:10px;color:' + statusColor + ';">' + statusText + '</td>' +
          '<td style="padding:4px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + displayVal + '</td>' +
          '<td style="padding:4px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
          '</tr>';
      };

      // Build pillar HTML blocks - each is a pdf-section to prevent page breaks inside
      const pillarRows = pillars.map(p => {
        const sourcesHtml = p.sources.map(buildSourceRow).join('');
        const bgHex = p.color + '12';
        const statusBg = p.status ? '#dcfce7' : '#fef2f2';
        const statusTxt = p.status ? '#166534' : '#991b1b';
        const statusLabel = p.status ? '✓ PASS' : '✗ FAIL';
        return '<div class="pdf-section" style="border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px;overflow:hidden;">' +
          '<div style="background:' + bgHex + ';padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e5e7eb;">' +
            '<span style="font-size:18px;">' + p.icon + '</span>' +
            '<div style="flex:1;">' +
              '<div style="font-weight:600;font-size:13px;color:#1f2937;">' + esc(p.label) + '</div>' +
              '<div style="font-size:10px;color:#6b7280;">' + esc(p.sub) + '</div>' +
            '</div>' +
            '<span style="background:' + statusBg + ';color:' + statusTxt + ';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;">' + statusLabel + '</span>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:#f9fafb;font-size:9px;text-transform:uppercase;color:#9ca3af;letter-spacing:0.05em;">' +
              '<th style="padding:4px 8px;text-align:left;">Source</th>' +
              '<th style="padding:4px 8px;text-align:left;">Citation</th>' +
              '<th style="padding:4px 8px;text-align:left;">Value</th>' +
              '<th style="padding:4px 8px;text-align:left;">Date</th>' +
            '</tr></thead>' +
            '<tbody>' + sourcesHtml + '</tbody>' +
          '</table>' +
        '</div>';
      }).join('');

      // ============================================
      // OBC 2024 COMPLIANCE SECTION
      // ============================================
      let obcHtml = '';
      if (obcComplianceResults.sections.length > 0) {
        const obcRows = obcComplianceResults.sections.slice(0, 10).map(s => {
          const relevance = Math.round((s.relevance_score || 0) * 100);
          const relColor = relevance >= 70 ? '#059669' : relevance >= 40 ? '#d97706' : '#6b7280';
          const contentPreview = esc((s.content || '').slice(0, 120));
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;font-weight:600;color:#1e40af;white-space:nowrap;">§ ' + esc(s.section_number) + '</td>' +
            '<td style="padding:5px 8px;color:#374151;">' + esc(s.section_title) + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:250px;overflow:hidden;text-overflow:ellipsis;">' + contentPreview + '</td>' +
            '<td style="padding:5px 8px;text-align:center;"><span style="color:' + relColor + ';font-weight:600;font-size:10px;">' + relevance + '%</span></td>' +
          '</tr>';
        }).join('');

        obcHtml = '<div class="pdf-section obc-card" style="margin-top:4px;margin-bottom:4px;">' +
          '<div class="section-header-block">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
              '<span style="font-size:14px;">⚖️</span>' +
              '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">OBC 2024 Part 9 — Compliance Matrix</div>' +
            '</div>' +
            '<div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Trade-specific regulatory requirements retrieved via RAG pipeline (' + esc(tradeCit?.answer || 'N/A') + ')</div>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
            '<thead><tr style="background:#eff6ff;font-size:9px;text-transform:uppercase;color:#3b82f6;letter-spacing:0.05em;">' +
              '<th style="padding:6px 8px;text-align:left;">Section</th>' +
              '<th style="padding:6px 8px;text-align:left;">Title</th>' +
              '<th style="padding:6px 8px;text-align:left;">Excerpt</th>' +
              '<th style="padding:6px 8px;text-align:center;">Relevance</th>' +
            '</tr></thead>' +
            '<tbody>' + obcRows + '</tbody>' +
          '</table>' +
        '</div>';
      }

      // ============================================
      // FILES & CONTRACTS SECTION
      // ============================================
      let visualHtml = '';
      
      // Fetch project document count to determine if files exist
      let projectDocCount = 0;
      try {
        const { count } = await supabase
          .from('project_documents')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId);
        projectDocCount = count || 0;
      } catch (_) { /* ignore */ }

      // AI Visual Analysis — merge on-demand + saved DB data
      const savedVisual = (savedPhotoEstimate as any)?.visual_analysis;
      const savedGeminiFindings = savedVisual?.gemini_findings || {};
      const savedOpenaiFindings = savedVisual?.openai_findings || {};
      
      const geminiVisual = aiAnalysisData?.engines?.gemini?.analysis?.visualAnalysis 
        || savedGeminiFindings?.visualAnalysis 
        || null;
      const conflictAlerts = aiAnalysisData?.conflictAlerts 
        || savedVisual?.conflict_alerts 
        || [];
      const imagesAnalyzedCount = aiAnalysisData?.engines?.gemini?.imagesAnalyzed 
        || savedVisual?.images_analyzed 
        || 0;
      
      // Extract executive summary / risk assessment from AI engines
      // CRITICAL: The edge function returns engines.gemini.analysis as a PLAIN TEXT STRING, not a structured object.
      // Use the full text directly as executive summary.
      const geminiRawAnalysis: string = typeof aiAnalysisData?.engines?.gemini?.analysis === 'string' 
        ? aiAnalysisData.engines.gemini.analysis 
        : '';
      const savedRawAnalysis: string = typeof savedGeminiFindings === 'string' 
        ? savedGeminiFindings 
        : (savedGeminiFindings?.executiveSummary || savedGeminiFindings?.rawAnalysis || savedGeminiFindings?.analysis || '');
      const geminiExecSummary: string = geminiRawAnalysis || savedRawAnalysis || '';
      
      // Risk factors: extract from structured data if available, or build from missing pillars
      const geminiRiskFactors: any[] = (typeof aiAnalysisData?.engines?.gemini?.analysis === 'object' && aiAnalysisData?.engines?.gemini?.analysis?.riskFactors) 
        || savedGeminiFindings?.riskFactors 
        || [];
      
      // OpenAI compliance: also a plain text string from the edge function  
      const openaiRawText: string = typeof aiAnalysisData?.engines?.openai?.analysis === 'string'
        ? aiAnalysisData.engines.openai.analysis
        : '';
      const openaiCompliance: any = openaiRawText 
        ? { rawValidation: openaiRawText, summary: openaiRawText }
        : (savedOpenaiFindings || null);
      
      // Conflict Alerts Section
      let conflictHtml = '';
      if (conflictAlerts.length > 0) {
        const conflictRows = conflictAlerts.map((c: any) => 
          '<tr style="font-size:11px;border-bottom:1px solid #fecaca;">' +
            '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">🔴 ' + (c.type || 'MISMATCH') + '</td>' +
            '<td style="padding:5px 8px;">' + (c.visual_value?.toLocaleString() || '?') + ' sq ft</td>' +
            '<td style="padding:5px 8px;">' + (c.db_value?.toLocaleString() || '?') + ' sq ft</td>' +
            '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">+' + (c.deviation_pct || 0) + '%</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + (c.source || 'AI Vision') + '</td>' +
          '</tr>'
        ).join('');
        
        conflictHtml = '<div class="pdf-section" style="margin-top:10px;margin-bottom:8px;border:2px solid #dc2626;border-radius:6px;overflow:hidden;">' +
          '<div style="background:#fef2f2;padding:10px 14px;border-bottom:1px solid #fecaca;">' +
            '<div style="font-size:14px;font-weight:700;color:#991b1b;">⚠️ CONFLICT DETECTED — Visual Evidence vs Database</div>' +
            '<div style="font-size:10px;color:#dc2626;margin-top:2px;">Automatic conflict detection by M.E.S.S.A. Files & Contracts Engine</div>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:#fff5f5;font-size:9px;text-transform:uppercase;color:#dc2626;letter-spacing:0.05em;">' +
              '<th style="padding:6px 8px;text-align:left;">Conflict</th>' +
              '<th style="padding:6px 8px;text-align:left;">Visual Value</th>' +
              '<th style="padding:6px 8px;text-align:left;">DB Value</th>' +
              '<th style="padding:6px 8px;text-align:left;">Deviation</th>' +
              '<th style="padding:6px 8px;text-align:left;">Source</th>' +
            '</tr></thead>' +
            '<tbody>' + conflictRows + '</tbody>' +
          '</table>' +
        '</div>';
      }

      // AI Vision findings
      let aiVisionHtml = '';
      if (geminiVisual && imagesAnalyzedCount > 0) {
        let bpRows = '';
        if ((geminiVisual.blueprintFindings || []).length > 0) {
          bpRows = '<p style="font-size:11px;color:#0891b2;font-weight:700;margin:12px 0 6px 0;">📐 Blueprint Analysis</p>' +
            '<table><thead><tr><th>File</th><th>Type</th><th>Dimensions</th><th>Key Observations</th></tr></thead><tbody>' +
            (geminiVisual.blueprintFindings || []).map((bp: any) => 
              '<tr><td style="font-weight:600;">' + esc(bp.fileName || 'Blueprint') + '</td>' +
              '<td>' + esc(bp.type || 'Drawing') + '</td>' +
              '<td>' + esc(bp.dimensions || '—') + '</td>' +
              '<td>' + esc((bp.observations || []).slice(0, 3).join('; ') || 'No observations') + '</td></tr>'
            ).join('') + '</tbody></table>';
        }
        
        let photoRows2 = '';
        if ((geminiVisual.sitePhotoFindings || []).length > 0) {
          photoRows2 = '<p style="font-size:11px;color:#0891b2;font-weight:700;margin:12px 0 6px 0;">📷 Site Photo Analysis</p>' +
            '<table><thead><tr><th>Photo</th><th>Stage</th><th>Trades</th><th>Quality</th><th>Observations</th></tr></thead><tbody>' +
            (geminiVisual.sitePhotoFindings || []).map((photo: any) => 
              '<tr><td style="font-weight:600;">' + esc(photo.fileName || 'Photo') + '</td>' +
              '<td>' + esc(photo.stage || '—') + '</td>' +
              '<td>' + esc((photo.tradesVisible || []).join(', ') || '—') + '</td>' +
              '<td><span style="font-weight:700;color:' + ((photo.qualityScore || 0) >= 70 ? '#16a34a' : '#ca8a04') + ';">' + (photo.qualityScore || 0) + '/100</span></td>' +
              '<td>' + esc((photo.observations || []).slice(0, 2).join('; ') || '—') + '</td></tr>'
            ).join('') + '</tbody></table>';
        }
        
        aiVisionHtml = '<div class="pdf-section" style="margin-top:8px;">' +
          '<p style="font-size:12px;color:#374151;margin-bottom:8px;"><strong>AI Files & Contracts Analysis</strong> <span style="background:#06b6d4;color:white;font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700;">🔍 ' + imagesAnalyzedCount + ' images analyzed</span></p>' +
          bpRows + photoRows2 +
          '<table style="margin-top:8px;"><tr><td style="width:40%;font-weight:600;">Overall Visual Score</td><td style="font-weight:700;color:' + ((geminiVisual.overallVisualScore || 0) >= 70 ? '#16a34a' : '#ca8a04') + ';">' + (geminiVisual.overallVisualScore || 0) + '/100</td></tr></table>' +
        '</div>';
      } else if (projectDocCount > 0 && imagesAnalyzedCount === 0) {
        // Files exist but were not analyzed — NEVER say "No images available"
        aiVisionHtml = '<div class="pdf-section" style="margin-top:8px;padding:10px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">' +
          '<p style="font-size:12px;color:#92400e;font-weight:600;">📂 Unresolved Visual Evidence</p>' +
          '<p style="font-size:11px;color:#78350f;margin-top:4px;">' + projectDocCount + ' file(s) found in project documents but AI visual analysis could not process them. This may be due to file format limitations or processing errors. Files are present but unverified.</p>' +
        '</div>';
      }

      if (photoCits.length > 0 || blueprintCit || projectDocCount > 0) {
        // Build AI Vision lookup from multiple sources
        const geminiSiteFindings: any[] = geminiVisual?.sitePhotoFindings || [];
        const savedSiteFindings: any[] = (savedPhotoEstimate as any)?.engines?.gemini?.analysis?.visualAnalysis?.sitePhotoFindings 
          || (savedPhotoEstimate as any)?.visualAnalysis?.sitePhotoFindings 
          || (savedPhotoEstimate as any)?.sitePhotoFindings 
          || [];
        const allSiteFindings = geminiSiteFindings.length > 0 ? geminiSiteFindings : savedSiteFindings;
        
        // Also extract the top-level analysis text if available
        const savedAnalysisText: string = (savedPhotoEstimate as any)?.engines?.gemini?.analysis?.summary 
          || (savedPhotoEstimate as any)?.analysis 
          || (typeof savedPhotoEstimate === 'string' ? savedPhotoEstimate : '') 
          || '';
        
        const photoRows = photoCits.slice(0, 8).map((pc, i) => {
          const ts = pc.timestamp ? new Date(pc.timestamp).toLocaleDateString() : '—';
          const cId = pc.id?.slice(0, 8) || '—';
          const desc = esc((pc.answer || '').slice(0, 80));
          
          // Match AI finding to this photo by index or filename
          const fileName = (pc.answer || '').toLowerCase();
          const matchedFinding = allSiteFindings.find((f: any) => 
            fileName.includes((f.fileName || '').toLowerCase().split('.')[0])
          ) || allSiteFindings[i];
          
          let aiVisionText = '';
          if (matchedFinding) {
            const obs = (matchedFinding.observations || []).slice(0, 2).join('; ');
            const stage = matchedFinding.stage || '';
            const trades = (matchedFinding.tradesVisible || []).join(', ');
            const quality = matchedFinding.qualityScore ? `Quality: ${matchedFinding.qualityScore}/100` : '';
            const parts = [obs, stage ? `Stage: ${stage}` : '', trades ? `Trades: ${trades}` : '', quality].filter(Boolean);
            aiVisionText = parts.join(' · ').slice(0, 160) || '✓ AI Analyzed';
          } else if (savedAnalysisText && i === 0) {
            // Fallback: use top-level analysis text for the first photo
            aiVisionText = savedAnalysisText.slice(0, 160);
            if (savedAnalysisText.length > 160) aiVisionText += '...';
          } else {
            const meta = pc.metadata as any;
            aiVisionText = meta?.ai_analysis ? '✓ AI Analyzed' : '⏳ Pending';
          }
          
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;color:#6b7280;">' + (pc.cite_type === 'VISUAL_VERIFICATION' ? '🔍 Verification' : '📷 Site Photo') + ' #' + (i + 1) + '</td>' +
            '<td style="padding:5px 8px;font-family:monospace;font-size:10px;color:#059669;">cite:' + cId + '</td>' +
            '<td style="padding:5px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + desc + '</td>' +
            '<td style="padding:5px 8px;color:#7c3aed;font-size:10px;max-width:220px;line-height:1.4;word-wrap:break-word;white-space:normal;">' + esc(aiVisionText) + '</td>' +
            '<td style="padding:5px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
          '</tr>';
        }).join('');

        visualHtml = '<div class="pdf-section visual-intel-card" style="margin-top:4px;margin-bottom:3px;">' +
          '<div class="section-header-block">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
              '<span style="font-size:13px;">👁️</span>' +
              '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">Files & Contracts Audit</div>' +
            '</div>' +
            '<div style="font-size:10px;color:#6b7280;margin-bottom:4px;">' + photoCits.length + ' visual asset(s) captured · ' + (blueprintCit ? '1 blueprint uploaded' : 'No blueprint') + ' · ' + projectDocCount + ' document(s) in storage' + (imagesAnalyzedCount > 0 ? ' · <span style="color:#06b6d4;font-weight:600;">🔍 ' + imagesAnalyzedCount + ' AI-analyzed</span>' : '') + '</div>' +
          '</div>' +
          conflictHtml +
          (photoRows ? (
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
              '<thead><tr style="background:#f0fdf4;font-size:9px;text-transform:uppercase;color:#059669;letter-spacing:0.05em;">' +
                '<th style="padding:6px 8px;text-align:left;">Asset</th>' +
                '<th style="padding:6px 8px;text-align:left;">Citation</th>' +
                '<th style="padding:6px 8px;text-align:left;">Description</th>' +
                '<th style="padding:6px 8px;text-align:left;">AI Vision Analysis</th>' +
                '<th style="padding:6px 8px;text-align:left;">Date</th>' +
              '</tr></thead>' +
              '<tbody>' + photoRows + '</tbody>' +
            '</table>'
          ) : '') +
          aiVisionHtml +
        '</div>';
      }

      // ============================================
      // FINANCIAL SNAPSHOT (owner only)
      // ============================================
      let financialHtml = '';
      if (financialSummary && (financialSummary.total_cost ?? 0) > 0) {
        const fmt = (n: number | null) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        
        // Tax Sync Validation: cross-reference Net + HST = Gross
        // FIX: Net total must be derived from LIVE template_items/line_items (fetched fresh above),
        // NOT from financialSummary state which may hold stale Template Lock values.
        const allLiveItems = savedLineItems.length > 0 ? savedLineItems : savedTemplateItems;
        let materialCost = financialSummary.material_cost ?? 0;
        let laborCost = financialSummary.labor_cost ?? 0;
        
        // Override with live item computation if items exist
        if (allLiveItems.length > 0) {
          let liveMat = 0, liveLab = 0;
          for (const i of allLiveItems as any[]) {
            const t = (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) || Number(i.total) || Number(i.totalPrice) || 0;
            const desc = (i.name || i.description || '').toLowerCase();
            if (desc.includes('demolition') || desc.includes('demo ') || desc.includes('removal')) continue;
            // INVOICE-ALIGNED: keyword only, NO category field
            if (desc.includes('labor') || desc.includes('installation') || desc.includes('preparation') ||
                desc.includes('cleanup') || desc.includes('grinding') ||
                desc.includes('floor preparation') || desc.includes('prep work') || desc.includes('site prep')) {
              liveLab += t;
            } else {
              liveMat += t;
            }
          }
          if (liveMat + liveLab > 0) {
            materialCost = liveMat;
            laborCost = liveLab;
            console.log('[DNA Report] ✓ Financial from live items:', { materialCost, laborCost });
          }
        }
        
        const demolitionCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
        const demolitionCost = demolitionCit?.metadata ? Number((demolitionCit.metadata as any).price || 0) : 0;
        const netTotal = materialCost + laborCost + demolitionCost;
        
        // Determine tax rate from region (location citation)
        const locAnswer = (locationCit?.answer || '').toLowerCase();
        let taxLabel = 'HST';
        let taxRate = 0.13; // Ontario default
        if (locAnswer.includes('quebec') || locAnswer.includes('québec') || locAnswer.includes('qc')) {
          taxRate = 0.14975; // GST 5% + QST 9.975%
          taxLabel = 'GST+QST';
        } else if (locAnswer.includes('alberta') || locAnswer.includes('ab') || locAnswer.includes('northwest') || locAnswer.includes('yukon') || locAnswer.includes('nunavut')) {
          taxRate = 0.05; // GST only
          taxLabel = 'GST';
        } else if (locAnswer.includes('british columbia') || locAnswer.includes('bc')) {
          taxRate = 0.12; // GST+PST
          taxLabel = 'GST+PST';
        } else if (locAnswer.includes('saskatchewan') || locAnswer.includes('sk')) {
          taxRate = 0.11; // GST+PST
          taxLabel = 'GST+PST';
        } else if (locAnswer.includes('manitoba') || locAnswer.includes('mb')) {
          taxRate = 0.12; // GST+PST
          taxLabel = 'GST+PST';
        }
        
        const taxAmount = netTotal * taxRate;
        // Gross Total must match Invoice Grand Total (financialSummary.total_cost if available)
        const computedGross = netTotal + taxAmount;
        const invoiceGrandTotal = financialSummary?.total_cost ? Number(financialSummary.total_cost) : 0;
        const grossTotal = invoiceGrandTotal > 0 ? invoiceGrandTotal : computedGross;
        
        // Owner-centric validation: Actual costs (pillars) vs Budget (DB total_cost)
        const pillarsSum = materialCost + laborCost + demolitionCost;
        const budgetValue = financialSummary?.total_cost ? Number(financialSummary.total_cost) : pillarsSum;
        // PASS if actual spending (pillars) doesn't exceed the stored budget (with 2% rounding tolerance)
        const taxSyncPass = pillarsSum <= budgetValue * 1.02;
        const syncStatusBg = taxSyncPass ? '#dcfce7' : '#fef2f2';
        const syncStatusColor = taxSyncPass ? '#166534' : '#991b1b';
        const syncStatusText = taxSyncPass ? '✓ PASS' : '✗ FAIL';
        
        financialHtml = '<div class="pdf-section financial-snapshot-card" style="margin-top:12px;margin-bottom:6px;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
            '<span style="font-size:14px;">💰</span>' +
            '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Financial Snapshot</div>' +
            '<span style="background:' + syncStatusBg + ';color:' + syncStatusColor + ';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;margin-left:auto;">Sync Tax: ' + syncStatusText + '</span>' +
          '</div>' +
          // Line 1: Materials + Labor + Demolition
          '<div style="display:flex;gap:8px;">' +
            '<div class="pdf-section" style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 10px;text-align:center;">' +
              '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Materials</div>' +
              '<div style="font-size:14px;font-weight:700;color:#059669;margin-top:2px;">' + fmt(materialCost) + '</div>' +
            '</div>' +
            '<div class="pdf-section" style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 10px;text-align:center;">' +
              '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Labor</div>' +
              '<div style="font-size:14px;font-weight:700;color:#2563eb;margin-top:2px;">' + fmt(laborCost) + '</div>' +
            '</div>' +
            (demolitionCost > 0 ? (
            '<div class="pdf-section" style="flex:1;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;text-align:center;">' +
              '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Demolition</div>' +
              '<div style="font-size:14px;font-weight:700;color:#b45309;margin-top:2px;">' + fmt(demolitionCost) + '</div>' +
            '</div>'
            ) : '') +
            '<div class="pdf-section" style="flex:1;background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;text-align:center;">' +
              '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Gross Total</div>' +
              '<div style="font-size:14px;font-weight:700;color:#d97706;margin-top:2px;">' + fmt(grossTotal) + '</div>' +
            '</div>' +
          '</div>' +
          // Line 2: HST + Line 3: Gross Total
          '<div style="display:flex;gap:10px;margin-top:8px;">' +
            '<div class="pdf-section" style="flex:1;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:8px 12px;text-align:center;">' +
              '<div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">' + taxLabel + ' (' + (taxRate * 100).toFixed(taxRate === 0.14975 ? 3 : 0) + '%)</div>' +
              '<div style="font-size:14px;font-weight:700;color:#7c3aed;margin-top:3px;">' + fmt(taxAmount) + '</div>' +
            '</div>' +
            '<div class="pdf-section" style="flex:2;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:6px;padding:8px 12px;text-align:center;color:white;">' +
              '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.8;">Gross Total (incl. tax)</div>' +
              '<div style="font-size:17px;font-weight:800;margin-top:3px;">' + fmt(grossTotal) + '</div>' +
            '</div>' +
          '</div>' +
          // Sync validation detail: Net vs Budget
          '<div style="margin-top:8px;padding:8px 12px;background:' + (taxSyncPass ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + (taxSyncPass ? '#bbf7d0' : '#fecaca') + ';border-radius:6px;font-size:10px;color:' + (taxSyncPass ? '#166534' : '#991b1b') + ';">' +
            '🔄 <strong>Budget Sync:</strong> Actual Costs ' + fmt(pillarsSum) + ' vs Budget ' + fmt(budgetValue) + ' → ' + syncStatusText + ' <span style="opacity:0.7;">(Tax is informational only: ' + taxLabel + ' ' + fmt(taxAmount) + ')</span>' +
          '</div>' +
        '</div>';
      }

      // ============================================
      // SITE PRESENCE LOG SECTION
      // ============================================
      let sitePresenceHtml = '';
      if (siteCheckins.length > 0) {
        // Group check-ins by day for task matching
        const checkinsByDay = new Map<string, any[]>();
        for (const c of siteCheckins) {
          const dayKey = format(new Date(c.checked_in_at), 'yyyy-MM-dd');
          if (!checkinsByDay.has(dayKey)) checkinsByDay.set(dayKey, []);
          checkinsByDay.get(dayKey)!.push(c);
        }

        // Also gather due tasks per day for "planned but not done" detection
        const dueDateTasksByDay = new Map<string, any[]>();
        for (const t of allProjectTasks) {
          if (t.due_date) {
            const dueDay = format(new Date(t.due_date), 'yyyy-MM-dd');
            if (!dueDateTasksByDay.has(dueDay)) dueDateTasksByDay.set(dueDay, []);
            dueDateTasksByDay.get(dueDay)!.push(t);
          }
        }

        const checkinRows = siteCheckins.slice(0, 15).map((c: any) => {
          const inTime = new Date(c.checked_in_at);
          const outTime = c.checked_out_at ? new Date(c.checked_out_at) : null;
          const durationMs = (outTime || new Date()).getTime() - inTime.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          const weather = c.weather_snapshot || {};
          const weatherStr = weather.temp != null ? `${Math.round(weather.temp)}° ${weather.description || ''}` : '—';
          const statusBg = !c.checked_out_at ? '#dcfce7' : '#f9fafb';
          const statusColor = !c.checked_out_at ? '#166534' : '#6b7280';
          const statusText = !c.checked_out_at ? '● ACTIVE' : '✓ Completed';
          
          // Get tasks completed on this check-in's day
          const checkinDay = format(inTime, 'yyyy-MM-dd');
          const dayTasks = completedTasksByDay.get(checkinDay) || [];
          const dueTasks = dueDateTasksByDay.get(checkinDay) || [];
          const missedTasks = dueTasks.filter(t => t.status !== 'completed' && t.status !== 'done');
          
          // Task summary sub-row
          let taskSubRow = '';
          if (dayTasks.length > 0 || missedTasks.length > 0) {
            const taskItems = dayTasks.slice(0, 4).map(t =>
              '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:8px;font-size:8px;margin:1px 2px;">✓ ' + esc(t.title) + '</span>'
            ).join('');
            const missedItems = missedTasks.slice(0, 3).map(t =>
              '<span style="display:inline-block;background:#fef2f2;color:#991b1b;padding:1px 6px;border-radius:8px;font-size:8px;margin:1px 2px;">✗ ' + esc(t.title) + '</span>'
            ).join('');
            const overflowText = dayTasks.length > 4 ? '<span style="font-size:8px;color:#6b7280;"> +' + (dayTasks.length - 4) + ' more</span>' : '';
            taskSubRow = '<tr style="background:#f8fafc;"><td colspan="6" style="padding:2px 8px 4px 24px;border-bottom:1px solid #e5e7eb;">' +
              '<div style="font-size:8px;color:#374151;font-weight:600;margin-bottom:1px;">📋 Daily Tasks:</div>' +
              taskItems + overflowText + missedItems +
            '</td></tr>';
          } else {
            // Check-in day with no tasks
            taskSubRow = '<tr style="background:#f8fafc;"><td colspan="6" style="padding:2px 8px 4px 24px;border-bottom:1px solid #e5e7eb;">' +
              '<span style="font-size:8px;color:#9ca3af;font-style:italic;">— No tasks completed this day</span>' +
            '</td></tr>';
          }
          
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;font-weight:500;">' + esc(c.user_name) + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;">' + format(inTime, 'MMM d, HH:mm') + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;">' + (outTime ? format(outTime, 'HH:mm') : '—') + '</td>' +
            '<td style="padding:5px 8px;font-weight:600;">' + duration + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + esc(weatherStr) + '</td>' +
            '<td style="padding:5px 8px;text-align:center;"><span style="background:' + statusBg + ';color:' + statusColor + ';padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;">' + statusText + '</span></td>' +
          '</tr>' + taskSubRow;
        }).join('');

        const totalSessions = siteCheckins.length;
        const completedSessions = siteCheckins.filter((c: any) => c.checked_out_at).length;
        const uniqueWorkers = new Set(siteCheckins.map((c: any) => c.user_id)).size;
        const totalTasksDone = [...completedTasksByDay.values()].reduce((sum, arr) => sum + arr.length, 0);
        
        sitePresenceHtml = '<div class="pdf-section site-presence-card" style="margin-top:4px;margin-bottom:3px;">' +
          '<div class="section-header-block">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
              '<span style="font-size:13px;">📍</span>' +
              '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">Site Presence Log</div>' +
            '</div>' +
            '<div style="font-size:10px;color:#6b7280;margin-bottom:4px;">' + totalSessions + ' check-in session(s) · ' + completedSessions + ' completed · ' + uniqueWorkers + ' unique worker(s) · ' + totalTasksDone + ' task(s) completed during presence</div>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
            '<thead><tr style="background:#ecfdf5;font-size:9px;text-transform:uppercase;color:#059669;letter-spacing:0.05em;">' +
              '<th style="padding:6px 8px;text-align:left;">Worker</th>' +
              '<th style="padding:6px 8px;text-align:left;">Check In</th>' +
              '<th style="padding:6px 8px;text-align:left;">Check Out</th>' +
              '<th style="padding:6px 8px;text-align:left;">Duration</th>' +
              '<th style="padding:6px 8px;text-align:left;">Weather</th>' +
              '<th style="padding:6px 8px;text-align:center;">Status</th>' +
            '</tr></thead>' +
            '<tbody>' + checkinRows + '</tbody>' +
          '</table>' +
        '</div>';
      }

      // ============================================
      // EXECUTIVE SUMMARY (AI-Generated)
      // ============================================
      let execSummaryHtml = '';
      // Use the full Gemini analysis text as executive summary — it's already clean plain text from the edge function
      const execText = geminiExecSummary;
      const dualEngineUsed = aiAnalysisData?.dualEngineUsed || !!openaiRawText || !!savedOpenaiFindings?.rawValidation;
      const geminiModel = aiAnalysisData?.engines?.gemini?.model || (geminiExecSummary ? 'Gemini' : '');
      const openaiModel = aiAnalysisData?.engines?.openai?.model || (openaiRawText || savedOpenaiFindings ? 'GPT-5' : '');
      
      // Helper to clean raw AI text: strip JSON wrappers, markdown fences, etc.
      const cleanAiText = (raw: any): string => {
        if (!raw) return '';
        let text = typeof raw === 'string' ? raw : '';
        if (!text && typeof raw === 'object') {
          // Extract meaningful text from JSON objects
          const obj = raw as Record<string, any>;
          text = obj.executiveSummary || obj.executive_summary || obj.summary || obj.analysis || obj.text || obj.content || '';
          if (!text) {
            // Try to find any long string value
            for (const val of Object.values(obj)) {
              if (typeof val === 'string' && val.length > 40) { text = val; break; }
            }
          }
          if (!text) text = JSON.stringify(raw);
        }
        // Strip markdown JSON fences: ```json ... ```
        text = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
        // Strip leading { "key": " and trailing " }
        const jsonWrapMatch = text.match(/^\s*\{\s*"[^"]+"\s*:\s*"([\s\S]+)"\s*\}\s*$/);
        if (jsonWrapMatch) text = jsonWrapMatch[1];
        // Unescape JSON string escapes
        text = text.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        return text.trim();
      };

      const cleanExecText = cleanAiText(execText);
      if (cleanExecText) {
        execSummaryHtml = '<div class="pdf-section" style="margin-top:10px;margin-bottom:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 12px;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
            '<span style="font-size:14px;">🧠</span>' +
            '<div style="font-size:12px;font-weight:700;color:#064e3b;">M.E.S.S.A. Executive Summary</div>' +
            (dualEngineUsed ? '<span style="background:#7c3aed;color:white;font-size:7px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:auto;">DUAL ENGINE</span>' : '') +
          '</div>' +
          '<div style="font-size:10px;color:#374151;line-height:1.6;margin-bottom:6px;white-space:pre-line;">' + esc(cleanExecText.slice(0, 2500)) + '</div>' +
          '<div style="display:flex;gap:12px;margin-top:8px;font-size:9px;color:#6b7280;">' +
            (geminiModel ? '<span>🔍 ' + esc(String(geminiModel)) + ' — Visual & Site</span>' : '') +
            (openaiModel ? '<span>⚖️ ' + esc(String(openaiModel)) + ' — Regulatory</span>' : '') +
            '<span style="margin-left:auto;">📊 ' + (aiAnalysisData?.citationCount || citations.length) + ' citations verified</span>' +
          '</div>' +
        '</div>';
      }

      // ============================================
      // OBC COMPLIANCE CHECKLIST (Detailed - obc-status-check)
      // ============================================
      let obcChecklistHtml = '';
      
      // Prefer detailed OBC result from obc-status-check; fallback to openaiCompliance
      const obcChecklist: any[] = obcDetailedResult?.complianceChecklist 
        || openaiCompliance?.complianceChecklist 
        || openaiCompliance?.checklist 
        || openaiCompliance?.regulatory_findings 
        || [];
      const obcOverallStatus = obcDetailedResult?.overallStatus || openaiCompliance?.overallStatus || openaiCompliance?.compliance_status || '';
      const obcRecommendations: string[] = obcDetailedResult?.recommendations 
        || openaiCompliance?.recommendations 
        || openaiCompliance?.suggested_actions 
        || [];
      const obcPermitStatus = obcDetailedResult?.permitStatus || null;
      const obcMaterialChecks: any[] = obcDetailedResult?.materialChecks || [];
      const obcSafetyChecks: any[] = obcDetailedResult?.safetyChecks || [];
      
      if (obcChecklist.length > 0 || obcOverallStatus || obcPermitStatus) {
        // Detailed compliance rows with action items, contacts, timelines, penalties
        const checklistRows = obcChecklist.slice(0, 12).map((item: any) => {
          const status = item.status || item.result || 'N/A';
          const isPass = /pass|compliant|ok|yes/i.test(String(status));
          const isFail = /fail|non.?compliant|no/i.test(String(status));
          const statusIcon = isPass ? '✅' : isFail ? '❌' : '⚠️';
          const statusColor = isPass ? '#059669' : isFail ? '#dc2626' : '#d97706';
          
          let detailBlock = '';
          if (!isPass) {
            const details: string[] = [];
            if (item.issueDescription) details.push('⚠️ ' + esc(item.issueDescription));
            if (item.actionRequired) details.push('📋 Action: ' + esc(item.actionRequired));
            if (item.contactInfo) details.push('📞 Contact: ' + esc(item.contactInfo));
            if (item.timeline) details.push('⏱️ Timeline: ' + esc(item.timeline));
            if (item.penalty) details.push('💰 Penalty: ' + esc(item.penalty));
            if (details.length > 0) {
              detailBlock = '<tr style="font-size:10px;background:#fefce8;border-bottom:1px solid #fde68a;">' +
                '<td colspan="5" style="padding:6px 12px;color:#78350f;line-height:1.6;">' +
                details.join('<br/>') +
                '</td></tr>';
            }
          }
          
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;">' + statusIcon + '</td>' +
            '<td style="padding:5px 8px;font-weight:600;color:#1e40af;">' + esc(item.code || item.section || item.obcSection || '—') + '</td>' +
            '<td style="padding:5px 8px;">' + esc(item.requirement || item.title || item.description || '—') + '</td>' +
            '<td style="padding:5px 8px;color:' + statusColor + ';font-weight:600;font-size:10px;">' + esc(String(status)) + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:180px;white-space:normal;line-height:1.3;">' + esc((item.notes || item.recommendation || '').slice(0, 150)) + '</td>' +
          '</tr>' + detailBlock;
        }).join('');

        // Building Permit Status Section
        let permitHtml = '';
        if (obcPermitStatus) {
          const permitObtained = obcPermitStatus.obtained === true;
          const permitBg = permitObtained ? '#f0fdf4' : '#fef2f2';
          const permitBorder = permitObtained ? '#bbf7d0' : '#fecaca';
          const permitIcon = permitObtained ? '✅' : '❌';
          const permitTitle = permitObtained ? 'Building Permit — OBTAINED' : 'Building Permit — NOT OBTAINED';
          
          const permitDetails: string[] = [];
          if (obcPermitStatus.permitSection) permitDetails.push('<strong>OBC Requirement:</strong> ' + esc(obcPermitStatus.permitSection));
          if (!permitObtained && obcPermitStatus.penalty) permitDetails.push('<strong>⚠️ Penalty if ignored:</strong> ' + esc(obcPermitStatus.penalty));
          if (obcPermitStatus.contactInfo) permitDetails.push('<strong>📞 Contact:</strong> ' + esc(obcPermitStatus.contactInfo));
          if (obcPermitStatus.processingTime) permitDetails.push('<strong>⏱️ Processing:</strong> ' + esc(obcPermitStatus.processingTime));
          
          let docsHtml = '';
          if (Array.isArray(obcPermitStatus.documentsNeeded) && obcPermitStatus.documentsNeeded.length > 0) {
            docsHtml = '<div style="margin-top:6px;"><strong>📄 Documents needed:</strong></div>' +
              '<ul style="margin:4px 0 0 16px;padding:0;font-size:10px;line-height:1.5;">' +
              obcPermitStatus.documentsNeeded.map((d: string) => '<li>' + esc(d) + '</li>').join('') +
              '</ul>';
          }
          
          let stepsHtml = '';
          if (Array.isArray(obcPermitStatus.applicationSteps) && obcPermitStatus.applicationSteps.length > 0) {
            stepsHtml = '<div style="margin-top:6px;"><strong>📋 Application steps:</strong></div>' +
              '<ol style="margin:4px 0 0 16px;padding:0;font-size:10px;line-height:1.5;">' +
              obcPermitStatus.applicationSteps.map((s: string) => '<li>' + esc(s) + '</li>').join('') +
              '</ol>';
          }
          
          permitHtml = '<div style="margin-top:10px;padding:10px 14px;background:' + permitBg + ';border:1px solid ' + permitBorder + ';border-radius:8px;">' +
            '<div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:6px;">' + permitIcon + ' ' + permitTitle + '</div>' +
            '<div style="font-size:10px;color:#374151;line-height:1.6;">' +
            permitDetails.join('<br/>') +
            docsHtml +
            stepsHtml +
            '</div>' +
          '</div>';
        }

        // Material Compliance Checks
        let materialCheckHtml = '';
        if (obcMaterialChecks.length > 0) {
          const matRows = obcMaterialChecks.slice(0, 8).map((mc: any) => {
            const isPass = /pass/i.test(mc.status || '');
            const icon = isPass ? '✅' : /fail/i.test(mc.status || '') ? '❌' : '⚠️';
            return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
              '<td style="padding:4px 8px;">' + icon + '</td>' +
              '<td style="padding:4px 8px;font-weight:600;">' + esc(mc.material || '—') + '</td>' +
              '<td style="padding:4px 8px;color:#1e40af;font-size:9px;">' + esc(mc.obcSection || '—') + '</td>' +
              '<td style="padding:4px 8px;color:#6b7280;">' + esc(mc.requirement || mc.specification || '—') + '</td>' +
            '</tr>';
          }).join('');
          
          materialCheckHtml = '<div style="margin-top:10px;">' +
            '<div style="font-size:11px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">🧱 Material Specification Compliance</div>' +
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
              '<thead><tr style="background:#f0f9ff;font-size:9px;text-transform:uppercase;color:#2563eb;">' +
                '<th style="padding:4px 8px;width:30px;">✓</th>' +
                '<th style="padding:4px 8px;text-align:left;">Material</th>' +
                '<th style="padding:4px 8px;text-align:left;">OBC Section</th>' +
                '<th style="padding:4px 8px;text-align:left;">Requirement</th>' +
              '</tr></thead>' +
              '<tbody>' + matRows + '</tbody>' +
            '</table>' +
          '</div>';
        }

        // Safety Checks (Fire, Scaffolding, Moisture, etc.)
        let safetyCheckHtml = '';
        if (obcSafetyChecks.length > 0) {
          const safetyRows = obcSafetyChecks.slice(0, 8).map((sc: any) => {
            const isPass = /pass/i.test(sc.status || '');
            const icon = isPass ? '✅' : /fail/i.test(sc.status || '') ? '❌' : '⚠️';
            return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
              '<td style="padding:4px 8px;">' + icon + '</td>' +
              '<td style="padding:4px 8px;font-weight:600;">' + esc(sc.category || '—') + '</td>' +
              '<td style="padding:4px 8px;color:#1e40af;font-size:9px;">' + esc(sc.regulation || '—') + '</td>' +
              '<td style="padding:4px 8px;color:#6b7280;">' + esc(sc.requirement || '—') + '</td>' +
              (!isPass && sc.actionRequired ? '<td style="padding:4px 8px;color:#dc2626;font-size:9px;">' + esc(sc.actionRequired) + '</td>' : '<td></td>') +
            '</tr>';
          }).join('');
          
          safetyCheckHtml = '<div style="margin-top:10px;">' +
            '<div style="font-size:11px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">🛡️ Safety & Code Requirements</div>' +
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
              '<thead><tr style="background:#fef3c7;font-size:9px;text-transform:uppercase;color:#92400e;">' +
                '<th style="padding:4px 8px;width:30px;">✓</th>' +
                '<th style="padding:4px 8px;text-align:left;">Category</th>' +
                '<th style="padding:4px 8px;text-align:left;">Regulation</th>' +
                '<th style="padding:4px 8px;text-align:left;">Requirement</th>' +
                '<th style="padding:4px 8px;text-align:left;">Action</th>' +
              '</tr></thead>' +
              '<tbody>' + safetyRows + '</tbody>' +
            '</table>' +
          '</div>';
        }

        obcChecklistHtml = '<div class="pdf-section obc-card" style="margin-top:12px;margin-bottom:6px;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
            '<span style="font-size:14px;">⚖️</span>' +
            '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Regulatory Compliance Checklist</div>' +
            (obcOverallStatus ? '<span style="background:' + (/pass|compliant/i.test(obcOverallStatus) ? '#dcfce7;color:#166534' : /fail|non/i.test(obcOverallStatus) ? '#fef2f2;color:#991b1b' : '#fefce8;color:#92400e') + ';padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;margin-left:auto;">' + esc(String(obcOverallStatus)) + '</span>' : '') +
          '</div>' +
          '<div style="font-size:11px;color:#6b7280;margin-bottom:10px;">AI-validated against Ontario Building Code (OBC 2024) via Gemini Regulatory Engine</div>' +
          (checklistRows ? (
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
              '<thead><tr style="background:#eff6ff;font-size:9px;text-transform:uppercase;color:#3b82f6;letter-spacing:0.05em;">' +
                '<th style="padding:6px 8px;text-align:center;width:30px;">Status</th>' +
                '<th style="padding:6px 8px;text-align:left;">OBC Section</th>' +
                '<th style="padding:6px 8px;text-align:left;">Requirement</th>' +
                '<th style="padding:6px 8px;text-align:left;">Result</th>' +
                '<th style="padding:6px 8px;text-align:left;">Notes</th>' +
              '</tr></thead>' +
              '<tbody>' + checklistRows + '</tbody>' +
            '</table>'
          ) : '') +
          permitHtml +
          materialCheckHtml +
          safetyCheckHtml +
          (obcRecommendations.length > 0 ? (
            '<div style="margin-top:12px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;">' +
              '<div style="font-size:11px;font-weight:600;color:#92400e;margin-bottom:6px;">📋 Regulatory Recommendations</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:11px;color:#78350f;line-height:1.6;">' +
                obcRecommendations.slice(0, 8).map((r: string) => '<li>' + esc(String(r)) + '</li>').join('') +
              '</ul>' +
            '</div>'
          ) : '') +
        '</div>';
      }

      // ============================================
      // AI RISK ASSESSMENT
      // ============================================
      let riskHtml = '';
      const risks: any[] = geminiRiskFactors.length > 0 ? geminiRiskFactors 
        : (aiAnalysisData?.engines?.gemini?.analysis?.risks || []);
      const missingPillars = pillars.filter(p => !p.status);
      
      if (risks.length > 0 || missingPillars.length > 0 || conflictAlerts.length > 0) {
        let riskItems = '';
        
        // Missing pillars as risks
        for (const mp of missingPillars) {
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
            '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">HIGH</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">Missing: ' + esc(mp.label) + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">Incomplete pillar data may affect project validation and compliance.</td>' +
          '</tr>';
        }
        
        // Conflict alerts as risks
        for (const ca of conflictAlerts) {
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
            '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">CRITICAL</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">' + esc(ca.type) + ': Visual (' + ca.visual_value + ') vs DB (' + ca.db_value + ')</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">Deviation: ' + ca.deviation_pct + '%. Requires manual verification.</td>' +
          '</tr>';
        }
        
        // OBC-specific risks — detailed permit/penalty info from obc-status-check
        if (obcPermitStatus && !obcPermitStatus.obtained) {
          const penaltyText = obcPermitStatus.penalty ? ' Penalty: ' + esc(obcPermitStatus.penalty) + '.' : '';
          const contactText = obcPermitStatus.contactInfo ? ' Contact: ' + esc(obcPermitStatus.contactInfo) + '.' : '';
          const timelineText = obcPermitStatus.processingTime ? ' Timeline: ' + esc(obcPermitStatus.processingTime) + '.' : '';
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
            '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">CRITICAL</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">Building Permit — NOT OBTAINED</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;line-height:1.4;">OBC ' + esc(obcPermitStatus.permitSection || 'Section 1.3.1.2') + ' — Permit required. No permit number in documentation.' + penaltyText + contactText + timelineText + '</td>' +
          '</tr>';
        } else if (obcComplianceResults.sections.length === 0 && !obcDetailedResult) {
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
            '<td style="padding:5px 8px;"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">CRITICAL</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">Missing Building Code Validation</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">No OBC Part 9 compliance data found. Work cannot legally proceed without building code review.</td>' +
          '</tr>';
        }
        
        // Safety-specific risks from detailed OBC check
        for (const sc of obcSafetyChecks.filter((s: any) => /fail|warning/i.test(s.status || '')).slice(0, 3)) {
          const isFail = /fail/i.test(sc.status || '');
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
            '<td style="padding:5px 8px;"><span style="background:' + (isFail ? '#fef2f2;color:#dc2626' : '#fefce8;color:#d97706') + ';padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">' + (isFail ? 'HIGH' : 'MEDIUM') + '</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">' + esc(sc.category || 'Safety Check') + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + esc(sc.regulation || '') + ' — ' + esc(sc.requirement || '') + (sc.actionRequired ? ' Action: ' + esc(sc.actionRequired) : '') + '</td>' +
          '</tr>';
        }
        
        if (obcSafetyChecks.length === 0 && obcComplianceResults.sections.length === 0) {
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #fef2f2;">' +
            '<td style="padding:5px 8px;"><span style="background:#fefce8;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">MEDIUM</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">Missing Inspector Sign-off</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">Inspector approval required at framing, mechanical, and final stages. Schedule visits accordingly.</td>' +
          '</tr>';
        }
        
        // AI-detected risks
        for (const r of risks.slice(0, 6)) {
          const severity = r.severity || r.level || 'MEDIUM';
          const sevColor = /high|critical/i.test(severity) ? '#dc2626' : /medium/i.test(severity) ? '#d97706' : '#059669';
          const sevBg = /high|critical/i.test(severity) ? '#fef2f2' : /medium/i.test(severity) ? '#fefce8' : '#f0fdf4';
          riskItems += '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;"><span style="background:' + sevBg + ';color:' + sevColor + ';padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">' + esc(String(severity).toUpperCase()) + '</span></td>' +
            '<td style="padding:5px 8px;font-weight:600;">' + esc(r.title || r.factor || r.name || '—') + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:250px;white-space:normal;line-height:1.3;">' + esc((r.description || r.detail || r.mitigation || '').slice(0, 150)) + '</td>' +
          '</tr>';
        }
        
        if (riskItems) {
          riskHtml = '<div class="pdf-section risk-card" style="margin-top:12px;margin-bottom:6px;">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
              '<span style="font-size:14px;">⚠️</span>' +
              '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Risk Assessment Matrix</div>' +
            '</div>' +
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
              '<thead><tr style="background:#fef2f2;font-size:9px;text-transform:uppercase;color:#dc2626;letter-spacing:0.05em;">' +
                '<th style="padding:6px 8px;text-align:left;width:70px;">Severity</th>' +
                '<th style="padding:6px 8px;text-align:left;">Risk Factor</th>' +
                '<th style="padding:6px 8px;text-align:left;">Description / Mitigation</th>' +
              '</tr></thead>' +
              '<tbody>' + riskItems + '</tbody>' +
            '</table>' +
          '</div>';
        }
      }

      // ============================================
      // MATERIAL & LABOR LINE ITEM BREAKDOWN
      // ============================================
      let lineItemHtml = '';
      const allItems = savedLineItems.length > 0 ? savedLineItems : savedTemplateItems;
      
      if (allItems.length > 0 && financialSummary && (financialSummary.total_cost ?? 0) > 0) {
        const fmt = (n: number | null) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        
        const itemRows = allItems.slice(0, 20).map((item: any) => {
          const name = item.name || item.item_name || item.description || '—';
          const qty = item.quantity ?? item.qty ?? '';
          const unit = item.unit || item.unit_type || '';
          const unitPrice = item.unit_price ?? item.unitPrice ?? item.price ?? null;
          const total = item.total ?? item.total_cost ?? (qty && unitPrice ? qty * unitPrice : null);
          const category = item.category || item.type || '';
          const catIcon = /labor|work|install/i.test(category) ? '👷' : '🧱';
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:4px 8px;">' + catIcon + '</td>' +
            '<td style="padding:4px 8px;font-weight:600;">' + esc(String(name).slice(0, 50)) + '</td>' +
            '<td style="padding:4px 8px;text-align:center;color:#6b7280;">' + (qty || '—') + ' ' + esc(String(unit)) + '</td>' +
            '<td style="padding:4px 8px;text-align:right;color:#6b7280;">' + (unitPrice != null ? fmt(unitPrice) : '—') + '</td>' +
            '<td style="padding:4px 8px;text-align:right;font-weight:600;color:#1f2937;">' + (total != null ? fmt(total) : '—') + '</td>' +
          '</tr>';
        }).join('');

        const gfaVal = gfaCit?.metadata ? (gfaCit.metadata as any).gfa_value || 0 : 0;
        const costPerSqFt = gfaVal > 0 && financialSummary.total_cost ? (financialSummary.total_cost / gfaVal).toFixed(2) : null;

        lineItemHtml = '<div class="pdf-section line-item-card" style="margin-top:4px;margin-bottom:3px;">' +
          '<div class="section-header-block" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
            '<span style="font-size:13px;">📋</span>' +
            '<div style="font-size:12px;font-weight:700;color:#1e3a5f;">Material & Labor Breakdown</div>' +
            (costPerSqFt ? '<span style="background:#f0fdf4;color:#059669;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600;margin-left:auto;">$' + costPerSqFt + '/sq ft</span>' : '') +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
            '<thead><tr style="background:#f9fafb;font-size:9px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">' +
              '<th style="padding:6px 8px;text-align:left;width:30px;">Type</th>' +
              '<th style="padding:6px 8px;text-align:left;">Item</th>' +
              '<th style="padding:6px 8px;text-align:center;">Qty</th>' +
              '<th style="padding:6px 8px;text-align:right;">Unit Price</th>' +
              '<th style="padding:6px 8px;text-align:right;">Total</th>' +
            '</tr></thead>' +
            '<tbody>' + itemRows + '</tbody>' +
            '<tfoot><tr style="background:#f0fdf4;font-size:12px;font-weight:700;">' +
              '<td colspan="4" style="padding:8px;text-align:right;color:#064e3b;">Grand Total</td>' +
              '<td style="padding:8px;text-align:right;color:#064e3b;">' + fmt(financialSummary.total_cost) + '</td>' +
            '</tr></tfoot>' +
          '</table>' +
        '</div>';
      }

      // ============================================
      // M.E.S.S.A. DUAL-ENGINE VERDICT
      // ============================================
      let verdictHtml = '';
      const openaiRaw = openaiCompliance?.rawValidation 
        || openaiCompliance?.summary || '';
      
      // Build a data-driven verdict — factor in task completion for realistic grading
      const totalTaskCount = tasks.length;
      const completedTaskCount = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
      const taskCompletionPct = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
      
      // DEMOLITION BONUS: If project included demolition work, treat it as extra effort (bonus)
      // Completed demolition tasks boost the score by up to 12% instead of diluting it
      const demoPriceCitExists = citations.some(c => c.cite_type === 'DEMOLITION_PRICE');
      const siteCondHasDemo = citations.find(c => c.cite_type === 'SITE_CONDITION')?.answer === 'demolition';
      const hasDemolitionWork = demoPriceCitExists || siteCondHasDemo;
      const demoTasks = tasks.filter(t => (t as any).phase === 'demolition');
      const demoCompletedCount = demoTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
      const demoBonus = hasDemolitionWork && demoTasks.length > 0
        ? Math.round((demoCompletedCount / demoTasks.length) * 12) // Up to +12% bonus for completed demo work
        : hasDemolitionWork ? 6 // Flat +6% if demolition is planned (even without tasks yet)
        : 0;
      
      // Weighted score: 50% pillar integrity + 50% task progress + demolition bonus
      const baseEffectivePct = totalTaskCount > 0 ? Math.round((pct * 0.5) + (taskCompletionPct * 0.5)) : pct;
      const effectivePct = Math.min(baseEffectivePct + demoBonus, 100); // Cap at 100
      // STRICT GRADING: "A" requires BOTH high pillar score AND real task completion
      // If tasks exist but <80% done, cap grade at B max; if <50% done, cap at C max
      let healthGrade: string;
      if (totalTaskCount > 0 && taskCompletionPct < 50) {
        // Low task completion — cap at C regardless of pillar score
        healthGrade = effectivePct >= 50 ? 'C' : effectivePct >= 25 ? 'D' : 'F';
      } else if (totalTaskCount > 0 && taskCompletionPct < 80) {
        // Moderate task completion — cap at B
        healthGrade = effectivePct >= 75 ? 'B' : effectivePct >= 50 ? 'C' : effectivePct >= 25 ? 'D' : 'F';
      } else {
        // Tasks fully done (>=80%) or no tasks — normal scale
        healthGrade = effectivePct >= 90 ? 'A' : effectivePct >= 75 ? 'B' : effectivePct >= 50 ? 'C' : effectivePct >= 25 ? 'D' : 'F';
      }
      // Grade cap warning message
      const gradeCapped = totalTaskCount > 0 && taskCompletionPct < 80;
      const demoBonusMsg = demoBonus > 0 ? ' 🔨 Demolition bonus: +' + demoBonus + '%' : '';
      const gradeCapMsg = gradeCapped
        ? (taskCompletionPct < 50 ? '⚠️ Grade capped — task progress ' + taskCompletionPct + '%' + demoBonusMsg : '⚠️ Grade capped at B — tasks ' + taskCompletionPct + '% done' + demoBonusMsg)
        : (demoBonus > 0 ? '🔨 Demolition work bonus: +' + demoBonus + '% applied' : '');
      const gradeColor = effectivePct >= 75 ? '#059669' : effectivePct >= 50 ? '#d97706' : '#dc2626';
      const totalRisks = missingPillars.length + conflictAlerts.length + risks.length;
      const obcPassCount = obcChecklist.filter((item: any) => /pass|compliant|ok|yes/i.test(String(item.status || item.result || ''))).length;
      
      {
        verdictHtml = '<div class="pdf-section verdict-card" style="margin-top:12px;margin-bottom:6px;border:2px solid #7c3aed;border-radius:6px;overflow:hidden;">' +
          '<div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:10px 14px;color:white;">' +
            '<div style="font-size:13px;font-weight:700;">M.E.S.S.A. Dual-Engine Verdict</div>' +
            '<div style="font-size:9px;opacity:0.8;margin-top:2px;">Multi-Engine Synthesis & Structured Analysis — Final Assessment</div>' +
          '</div>' +
          '<div style="padding:12px 14px;">' +
            // Grade + Key Metrics row
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">' +
              '<div style="width:52px;height:52px;border-radius:10px;background:' + gradeColor + ';display:flex;align-items:center;justify-content:center;color:white;font-size:26px;font-weight:800;font-family:monospace;">' + healthGrade + '</div>' +
              '<div style="flex:1;">' +
                  '<div style="font-size:11px;font-weight:700;color:#1f2937;margin-bottom:4px;">Project Health Grade: ' + healthGrade + ' (' + effectivePct + '%)</div>' +
                (gradeCapMsg ? '<div style="font-size:9px;color:#d97706;font-weight:600;margin-bottom:4px;">' + gradeCapMsg + '</div>' : '') +
                '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                  '<span style="font-size:9px;color:#6b7280;">✅ ' + passCount + '/9 Pillars Complete</span>' +
                  '<span style="font-size:9px;color:#6b7280;">⚠️ ' + totalRisks + ' Risk Factors</span>' +
                  (obcChecklist.length > 0 ? '<span style="font-size:9px;color:#6b7280;">⚖️ ' + obcPassCount + '/' + obcChecklist.length + ' OBC Checks Passed</span>' : '') +
                  (totalTaskCount > 0 ? '<span style="font-size:9px;color:#6b7280;">📋 Tasks: ' + completedTaskCount + '/' + totalTaskCount + ' (' + taskCompletionPct + '%)</span>' : '') +
                  (financialSummary?.total_cost ? '<span style="font-size:9px;color:#6b7280;">💰 Budget: $' + financialSummary.total_cost.toLocaleString() + '</span>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            // OpenAI regulatory verdict (unique content, not repeated from exec summary)
            (openaiRaw ? (
              '<div style="margin-bottom:14px;">' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
                  '<span style="background:#8b5cf6;color:white;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;">GPT-5</span>' +
                  '<span style="font-size:11px;font-weight:600;color:#374151;">Regulatory Verdict</span>' +
                '</div>' +
                '<p style="font-size:11px;color:#4b5563;line-height:1.6;margin:0;">' + esc(cleanAiText(openaiRaw).slice(0, 400)) + '</p>' +
              '</div>'
            ) : '') +
            // Actionable next steps
            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-top:10px;">' +
              '<div style="font-size:11px;font-weight:600;color:#334155;margin-bottom:6px;">🎯 Recommended Next Steps</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:10px;color:#475569;line-height:1.7;">' +
                (missingPillars.length > 0 ? '<li>Complete missing data pillars: ' + esc(missingPillars.map(p => p.label).slice(0, 3).join(', ')) + '</li>' : '<li>All data pillars are complete — proceed to project activation</li>') +
                (conflictAlerts.length > 0 ? '<li>Resolve ' + conflictAlerts.length + ' visual conflict alert(s) identified by AI vision</li>' : '') +
                (obcChecklist.length > 0 && obcPassCount < obcChecklist.length ? '<li>Address ' + (obcChecklist.length - obcPassCount) + ' non-compliant OBC item(s) before construction begins</li>' : '') +
                (!financialSummary?.total_cost ? '<li>Lock in a finalized budget to complete financial readiness</li>' : '') +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      // ============================================
      // ASSEMBLE FULL HTML
      // ============================================
      const { buildUnionPdfHeader, buildUnionPdfFooter } = await import('@/lib/pdfGenerator');
      
      const header = buildUnionPdfHeader({
        docType: 'M.E.S.S.A. DNA Integrity Report',
        contractorName: profile.company_name || undefined,
        contractorPhone: profile.phone || undefined,
        contractorEmail: userEmail || undefined,
        contractorWebsite: profile.company_website || undefined,
        dateStr: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      });

      const footer = buildUnionPdfFooter({
        contractorName: profile.company_name || undefined,
        docNumber: 'DNA-' + projectId.slice(0, 8).toUpperCase(),
      });

      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1f2937; padding: 18px 22px; max-width: 800px; margin: 0 auto; font-size: 10.5px; line-height: 1.3; }' +
        // Small cards (financial, verdict, risk) — keep together as one block
        '.financial-snapshot-card, .verdict-card, .risk-card { break-inside: avoid !important; page-break-inside: avoid !important; }' +
        // LARGE sections — allow page breaks inside, JS adjustForPageBreaks handles smart placement
        '.visual-intel-card, .site-presence-card, .line-item-card, .obc-card { break-inside: auto !important; page-break-inside: auto !important; }' +
        // Large tables get allow-page-break class so JS skips them in no-break pass
        '.visual-intel-card table, .site-presence-card table, .line-item-card table, .obc-card table { }' +
        // Section HEADER + first few rows — keep together
        '.section-header-block { break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; page-break-after: avoid !important; margin-bottom: 2px; }' +
        // Section headers — styled for orphan prevention pass
        '.section-header { break-after: avoid !important; page-break-after: avoid !important; }' +
        // Generic section spacing — ultra tight
        '.pdf-section { margin-bottom: 3px; margin-top: 1px; }' +
        // Tables — allow breaking between rows for long tables
        'table { font-size: 10px; border-spacing: 0; margin-bottom: 1px; }' +
        'tr { break-inside: avoid !important; page-break-inside: avoid !important; }' +
        'thead { display: table-header-group; }' +
        // Headers — never orphan a title at page bottom
        'h2, h3, h4, .section-header { page-break-after: avoid !important; break-after: avoid !important; orphans: 3; widows: 3; font-size: 11px; margin-bottom: 2px; margin-top: 0; }' +
        // Site Presence Log — compact font
        '.site-presence-card table { font-size: 8.5px !important; }' +
        '.site-presence-card td, .site-presence-card th { padding: 2px 4px !important; }' +
        // Visual audit — compact
        '.visual-intel-card table { font-size: 9px !important; }' +
        '.visual-intel-card td, .visual-intel-card th { padding: 2px 4px !important; }' +
        // Line item table density
        '.line-item-card table { font-size: 9px !important; }' +
        '.line-item-card td, .line-item-card th { padding: 2px 5px !important; }' +
        // OBC tables
        '.obc-card table { font-size: 9px !important; }' +
        '.obc-card td, .obc-card th { padding: 2px 5px !important; }' +
        // Kill inline style gaps globally
        'div[style*="margin-top:12px"] { margin-top: 3px !important; }' +
        'div[style*="margin-top:8px"] { margin-top: 2px !important; }' +
        'div[style*="margin-bottom:10px"] { margin-bottom: 2px !important; }' +
        'div[style*="margin-bottom:12px"] { margin-bottom: 3px !important; }' +
        'div[style*="margin-bottom:8px"] { margin-bottom: 2px !important; }' +
        'div[style*="padding:10px"] { padding: 5px 8px !important; }' +
        'div[style*="padding:14px"] { padding: 6px 10px !important; }' +
        '</style></head><body>' +
        header +
        // Title block
        '<div class="pdf-section" style="text-align:center;margin-bottom:12px;">' +
          '<div style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:2px;">M.E.S.S.A. DNA Integrity Report</div>' +
          '<div style="font-size:15px;font-weight:700;color:#064e3b;">' + esc(projName) + '</div>' +
          (projAddr ? '<div style="font-size:9px;color:#9ca3af;margin-top:1px;">' + esc(projAddr) + '</div>' : '') +
          '<div style="font-size:8px;color:#9ca3af;margin-top:1px;">Generated: ' + new Date().toLocaleString() + '</div>' +
        '</div>' +
        // Executive Summary (AI)
        execSummaryHtml +
        // Score bar
        '<div class="pdf-section" style="background:linear-gradient(135deg,#064e3b,#065f46);color:white;border-radius:6px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">' +
          '<div style="font-size:24px;font-weight:800;font-family:monospace;">' + passCount + '/9</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:10px;font-weight:600;margin-bottom:3px;">DNA Integrity Score — ' + pct + '%</div>' +
            '<div style="height:5px;background:rgba(255,255,255,0.2);border-radius:999px;overflow:hidden;">' +
              '<div style="height:100%;width:' + pct + '%;background:' + scoreColor + ';border-radius:999px;"></div>' +
            '</div>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:20px;font-size:9px;font-weight:600;">' + scoreLabel + '</div>' +
        '</div>' +
        '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:6px;display:flex;align-items:center;gap:5px;">' +
          '<span style="font-size:13px;">🧬</span> 9-Pillar Validation Matrix' +
        '</div>' +
        pillarRows +
        // Material & Labor Breakdown
        lineItemHtml +
        // Financial Summary
        financialHtml +
        // Dual-Engine Verdict
        verdictHtml +
        // Legal Disclaimer
        '<div class="pdf-section" style="margin-top:12px;margin-bottom:8px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">' +
          '<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px;">⚖️ Disclaimer</div>' +
          '<p style="font-size:9px;color:#78350f;line-height:1.5;margin:0;">This report is for informational purposes only. For detailed OBC compliance and visual site intelligence, generate the MESSA Site Intelligence Report.</p>' +
        '</div>' +
        // Footer
        footer +
      '</body></html>';

      const { generatePDFBlob } = await import('@/lib/pdfGenerator');
      const filename = 'dna-integrity-' + (projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export') + '.pdf';
      
      const blob = await generatePDFBlob(html, {
        filename,
        pageFormat: 'letter',
      });

      // Store HTML for inline preview (srcdoc)
      setDnaReportHtml(html);

      // Create blob URL for download
      const blobUrl = URL.createObjectURL(blob);
      setDnaReportBlobUrl(blobUrl);
      setDnaReportFilename(filename);

      // Auto-save to project documents (overwrite previous DNA report)
      let savedToDocuments = false;
      const reportTimestamp = new Date().toISOString();
      const reportDateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      if (projectId) {
        try {
          const storagePath = `${projectId}/dna-report-latest.pdf`;
          
          // Delete existing file first, then upload fresh (avoids UPDATE policy issues)
          await supabase.storage.from('project-documents').remove([storagePath]);
          const { error: uploadErr } = await supabase.storage
            .from('project-documents')
            .upload(storagePath, blob, { contentType: 'application/pdf' });
          
          if (uploadErr) {
            console.warn('[DNA Report] Storage upload error:', uploadErr);
          } else {
            // Archive existing DNA report records (rename, don't delete)
            const { data: existingDocs } = await supabase
              .from('project_documents')
              .select('id, file_name, uploaded_at')
              .eq('project_id', projectId)
              .eq('file_name', 'DNA Audit Report.pdf')
              .limit(1);

            if (existingDocs && existingDocs.length > 0) {
              const archiveDate = new Date(existingDocs[0].uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              await supabase.from('project_documents')
                .update({ file_name: `DNA Report — ${archiveDate} (archived)` })
                .eq('id', existingDocs[0].id);
            }
            
            const { error: insertErr } = await supabase.from('project_documents').insert({
              project_id: projectId,
              file_name: 'DNA Audit Report.pdf',
              file_path: storagePath,
              file_size: blob.size,
              mime_type: 'application/pdf',
              uploaded_by: userId,
              uploaded_by_name: profile?.company_name || 'Owner',
              uploaded_by_role: 'owner',
            });
            
            if (!insertErr) {
              savedToDocuments = true;
              setDocuments(prev => {
                // Mark old DNA reports as archived in local state
                const updated = prev.map(d => 
                  d.file_name === 'DNA Audit Report.pdf' 
                    ? { ...d, file_name: `DNA Report — archived` }
                    : d
                );
                return [...updated, {
                  id: crypto.randomUUID(),
                  file_name: 'DNA Audit Report.pdf',
                  file_path: storagePath,
                  category: 'technical' as DocumentCategory,
                }];
              });
            }
          }
        } catch (saveErr) {
          console.warn('[DNA Report] Auto-save to documents failed:', saveErr);
        }
      }

      // Count how many previous DNA reports exist (for version tracking)
      let versionNumber = 1;
      const prevDnaCits = citations.filter(c => c.cite_type === 'DNA_FINALIZED');
      versionNumber = prevDnaCits.length + 1;

      // Create DNA_FINALIZED citation — keep previous ones as history
      const dnaCitation: Citation = {
        id: `cite-dna-finalized-${Date.now()}`,
        cite_type: 'DNA_FINALIZED',
        question_key: 'dna_report',
        answer: `DNA Audit Report v${versionNumber} — ${reportDateLabel}`,
        value: `DNA Report v${versionNumber} generated on ${reportDateLabel}`,
        timestamp: reportTimestamp,
        metadata: {
          filename,
          savedToDocuments,
          generatedAt: reportTimestamp,
          version: versionNumber,
          previousVersions: prevDnaCits.map(c => ({
            id: c.id,
            timestamp: c.timestamp,
            version: c.metadata?.version || 1,
          })),
        },
      };
      
      setCitations(prev => {
        // Keep ALL previous DNA_FINALIZED citations as history
        const updated = [...prev, dnaCitation];
        // Persist
        supabase.from('project_summaries')
          .update({ verified_facts: updated as any })
          .eq('project_id', projectId)
          .then(() => {});
        return updated;
      });

      // Show preview dialog
      setShowDnaPreviewDialog(true);
      toast.dismiss('dna-analysis');
      toast.success('DNA Audit Report ready');
    } catch (err) {
      console.error('[DNA Report] Error:', err);
      toast.dismiss('dna-analysis');
      toast.error('Failed to generate DNA report');
    } finally {
      setIsGeneratingDnaReport(false);
    }
   }, [citations, projectData, financialSummary, teamMembers, obcComplianceResults, userId, projectId, contracts]);

  // ============================================
  // SEND DNA REPORT VIA EMAIL
  // ============================================
  const handleSendDnaReportEmail = useCallback(async () => {
    if (!dnaEmailClientEmail || !dnaEmailClientName) {
      toast.error('Please enter client name and email');
      return;
    }
    setIsSendingDnaEmail(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to send reports');
        return;
      }

      // Gather pillar data
      const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const locationCit = citations.find(c => c.cite_type === 'LOCATION');
      const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const teamStructCit = citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
      const teamSizeCit = citations.find(c => c.cite_type === 'TEAM_SIZE');
      const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
      const photoCits = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
      const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');

      const pillars = [
        { label: '1 — Project Basics', icon: '🏗️', status: !!nameCit && !!locationCit && !!workTypeCit, sourceSummary: [nameCit?.answer, locationCit?.answer].filter(Boolean).join(' · ').slice(0, 60) },
        { label: '2 — Area & Dimensions', icon: '📐', status: !!gfaCit, sourceSummary: gfaCit?.answer?.slice(0, 60) || '' },
        { label: '3 — Trade & Template', icon: '🔬', status: !!tradeCit && !!templateCit, sourceSummary: tradeCit?.answer?.slice(0, 60) || '' },
        { label: '4 — Team Architecture', icon: '👥', status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0, sourceSummary: `${teamMembers.length} members` },
        { label: '5 — Execution Timeline', icon: '📅', status: !!timelineCit && !!endDateCit, sourceSummary: [timelineCit?.answer, endDateCit?.answer].filter(Boolean).join(' → ').slice(0, 60) },
        { label: '6 — Files & Contracts', icon: '📁', status: photoCits.length > 0 || !!blueprintCit, sourceSummary: `${photoCits.length} photos${blueprintCit ? ' + blueprint' : ''}` },
        { label: '7 — Site Log & Location', icon: '🌦️', status: !!weatherCit || !!siteCondCit || citations.some(c => c.cite_type === 'SITE_PRESENCE'), sourceSummary: citations.filter(c => c.cite_type === 'SITE_PRESENCE').length > 0 ? `${citations.filter(c => c.cite_type === 'SITE_PRESENCE').length} presence log(s)` : (weatherCit?.answer?.slice(0, 60) || siteCondCit?.answer?.slice(0, 60) || '') },
        { label: '8 — Financial Summary', icon: '💰', status: (financialSummary?.total_cost ?? 0) > 0, sourceSummary: financialSummary?.total_cost ? `$${financialSummary.total_cost.toLocaleString()}` : '' },
        { label: '9 — Building Code Alignment', icon: '⚖️', status: obcComplianceResults.sections.length > 0, sourceSummary: obcComplianceResults.sections.length > 0 ? `${obcComplianceResults.sections.length} OBC sections` : 'Pending' },
      ];

      const passCount = pillars.filter(p => p.status).length;
      const pct = Math.round((passCount / 9) * 100);

      // Get profile
      let profile: { company_name?: string | null; phone?: string | null; company_website?: string | null } = {};
      try {
        const { data: bp } = await supabase.from('bu_profiles').select('company_name, phone, company_website').eq('user_id', userId).maybeSingle();
        if (bp) profile = bp;
      } catch (_) { /* ignore */ }

      const { data: { user: authUser } } = await supabase.auth.getUser();

      const response = await supabase.functions.invoke('send-dna-report', {
        body: {
          clientEmail: dnaEmailClientEmail,
          clientName: dnaEmailClientName,
          projectName: projectData?.name || 'Project',
          projectAddress: projectData?.address || '',
          projectId,
          dnaScore: pct,
          dnaPassCount: passCount,
          pillars,
          contractorName: profile.company_name || undefined,
          contractorPhone: profile.phone || undefined,
          contractorEmail: authUser?.email || undefined,
          contractorWebsite: profile.company_website || undefined,
          financialSummary: financialSummary || undefined,
        },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to send email');

      toast.success(`DNA Report sent to ${dnaEmailClientEmail}`);
      setShowDnaEmailDialog(false);
      setDnaEmailClientName('');
      setDnaEmailClientEmail('');
    } catch (err: any) {
      console.error('[DNA Email] Error:', err);
      toast.error(err.message || 'Failed to send DNA report email');
    } finally {
      setIsSendingDnaEmail(false);
    }
   }, [dnaEmailClientEmail, dnaEmailClientName, citations, projectData, financialSummary, teamMembers, userId, projectId]);
   
  // ============================================
  // MESSA SITE INTELLIGENCE REPORT (OBC + Visual)
  // ============================================
  const handleSiteIntelligenceReport = useCallback(async () => {
    setIsGeneratingSiteIntel(true);
    toast.loading('Generating Site Intelligence Report...', { id: 'site-intel', description: 'Running dual-engine analysis' });
    
    let aiAnalysisData: any = null;
    let obcDetailedResult: any = null;
    
    try {
      // Run AI analysis + OBC check in parallel
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const locationCit = citations.find(c => c.cite_type === 'LOCATION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const photoCits = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const sitePresenceCits = citations.filter(c => c.cite_type === 'SITE_PRESENCE');
      
      const templateMeta = templateCit?.metadata as any;
      const materialsForObc = Array.isArray(templateMeta?.items)
        ? templateMeta.items.slice(0, 15).map((it: any) => ({ name: it.name || it.item_name || 'Unknown' }))
        : [];
      
      toast.loading('Step 1/3 — Running Gemini Visual + OpenAI Regulatory...', { id: 'site-intel' });
      
      const [analysisRes, obcRes] = await Promise.allSettled([
        supabase.functions.invoke('ai-project-analysis', {
          body: { projectId, analysisType: 'synthesis' },
        }),
        supabase.functions.invoke('obc-status-check', {
          body: {
            projectData: {
              project_type: workTypeCit?.answer || 'Renovation',
              scope_of_work: workTypeCit?.answer || '',
              confirmed_area_sqft: gfaCit?.answer ? parseFloat(String(gfaCit.answer)) : 0,
              materials: materialsForObc,
              blueprint_status: blueprintCit ? 'uploaded' : 'none',
              location: locationCit?.answer || 'Ontario, Canada',
              trade_type: tradeCit?.answer || 'general_contractor',
            }
          }
        }),
      ]);
      
      if (analysisRes.status === 'fulfilled' && analysisRes.value?.data) {
        aiAnalysisData = analysisRes.value.data;
      }
      if (obcRes.status === 'fulfilled' && obcRes.value?.data?.result) {
        obcDetailedResult = obcRes.value.data.result;
      }
      
      toast.loading('Step 2/3 — Compiling site data...', { id: 'site-intel' });
      
      // Fetch site check-ins, tasks, documents, profile, photo estimate
      const [checkinRes, tasksRes, docCountRes, profileRes, summaryRes] = await Promise.all([
        supabase.from('site_checkins').select('id, user_id, checked_in_at, checked_out_at, weather_snapshot').eq('project_id', projectId).order('checked_in_at', { ascending: false }).limit(20),
        supabase.from('project_tasks').select('id, title, status, assigned_to, updated_at, due_date').eq('project_id', projectId).is('archived_at', null),
        supabase.from('project_documents').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('bu_profiles').select('company_name, phone, company_website').eq('user_id', userId).maybeSingle(),
        supabase.from('project_summaries').select('photo_estimate, line_items, template_items').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      
      const allProjectTasks = tasksRes.data || [];
      const projectDocCount = docCountRes.count || 0;
      const profile = profileRes.data || {} as { company_name?: string; phone?: string; company_website?: string };
      const savedPhotoEstimate = summaryRes.data?.photo_estimate;
      
      // Build user name map
      const siteCheckins = checkinRes.data || [];
      const allUserIds = [...new Set([
        ...siteCheckins.map(c => c.user_id),
        ...allProjectTasks.map(t => t.assigned_to)
      ])];
      const { data: checkinProfiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', allUserIds);
      const nameMap = new Map(checkinProfiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const namedCheckins = siteCheckins.map(c => ({ ...c, user_name: nameMap.get(c.user_id) || 'Unknown' }));
      
      // Completed tasks by day
      const completedTasksByDay = new Map<string, { title: string; assignee: string; status: string }[]>();
      const completedTasks = allProjectTasks.filter(t => t.status === 'completed' || t.status === 'done');
      for (const task of completedTasks) {
        const dayKey = format(new Date(task.updated_at), 'yyyy-MM-dd');
        if (!completedTasksByDay.has(dayKey)) completedTasksByDay.set(dayKey, []);
        completedTasksByDay.get(dayKey)!.push({
          title: task.title,
          assignee: nameMap.get(task.assigned_to) || 'Unassigned',
          status: task.status,
        });
      }
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email || '';
      
      toast.loading('Step 3/3 — Building PDF...', { id: 'site-intel' });
      
      const esc = (v: string | number | null | undefined) => {
        if (v === null || v === undefined) return '';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };
      
      // ---- DUAL ENGINE HEADER ----
      const geminiModel = aiAnalysisData?.engines?.gemini?.model || 'Gemini';
      const openaiModel = aiAnalysisData?.engines?.openai?.model || 'GPT-5';
      const dualEngineUsed = !!aiAnalysisData?.dualEngineUsed || !!obcDetailedResult;
      
      const dualEngineHeader = '<div class="pdf-section" style="background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;border-radius:8px;padding:14px 18px;margin-bottom:14px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="font-size:14px;font-weight:800;letter-spacing:0.02em;">M.E.S.S.A. Site Intelligence Report</div>' +
            '<div style="font-size:9px;opacity:0.8;margin-top:2px;">Multi-Engine Synthesis & Structured Analysis — Dual AI Validation</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div style="background:rgba(59,130,246,0.3);border:1px solid rgba(59,130,246,0.5);padding:4px 10px;border-radius:6px;text-align:center;">' +
              '<div style="font-size:7px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;">Visual Engine</div>' +
              '<div style="font-size:10px;font-weight:700;">🔍 ' + esc(String(geminiModel)) + '</div>' +
            '</div>' +
            '<div style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);padding:4px 10px;border-radius:6px;text-align:center;">' +
              '<div style="font-size:7px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;">Regulatory Engine</div>' +
              '<div style="font-size:10px;font-weight:700;">⚖️ ' + esc(String(openaiModel)) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
      
      // ---- OBC COMPLIANCE SECTION ----
      let obcHtml = '';
      if (obcComplianceResults.sections.length > 0) {
        const obcRows = obcComplianceResults.sections.slice(0, 15).map(s => {
          const relevance = Math.round((s.relevance_score || 0) * 100);
          const relColor = relevance >= 70 ? '#059669' : relevance >= 40 ? '#d97706' : '#6b7280';
          const contentPreview = esc((s.content || '').slice(0, 180));
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;font-weight:600;color:#1e40af;white-space:nowrap;">§ ' + esc(s.section_number) + '</td>' +
            '<td style="padding:5px 8px;color:#374151;">' + esc(s.section_title) + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;max-width:300px;overflow:hidden;text-overflow:ellipsis;">' + contentPreview + '</td>' +
            '<td style="padding:5px 8px;text-align:center;"><span style="color:' + relColor + ';font-weight:600;font-size:10px;">' + relevance + '%</span></td>' +
          '</tr>';
        }).join('');
        
        obcHtml = '<div class="pdf-section" style="margin-bottom:10px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
            '<span style="font-size:15px;">⚖️</span>' +
            '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">OBC 2024 Part 9 — Compliance Matrix</div>' +
            '<span style="background:rgba(139,92,246,0.15);color:#7c3aed;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">OPENAI ENGINE</span>' +
          '</div>' +
          '<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">Trade-specific regulatory requirements retrieved via RAG pipeline (' + esc(tradeCit?.answer || 'N/A') + ')</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
            '<thead><tr style="background:#eff6ff;font-size:9px;text-transform:uppercase;color:#3b82f6;letter-spacing:0.05em;">' +
              '<th style="padding:6px 8px;text-align:left;">Section</th>' +
              '<th style="padding:6px 8px;text-align:left;">Title</th>' +
              '<th style="padding:6px 8px;text-align:left;">Excerpt</th>' +
              '<th style="padding:6px 8px;text-align:center;">Relevance</th>' +
            '</tr></thead>' +
            '<tbody>' + obcRows + '</tbody>' +
          '</table>' +
        '</div>';
      }
      
      // ---- OBC DETAILED CHECKLIST ----
      let obcChecklistHtml = '';
      const obcChecklist: any[] = obcDetailedResult?.complianceChecklist || [];
      const obcOverallStatus = obcDetailedResult?.overallStatus || '';
      const obcRecommendations: string[] = obcDetailedResult?.recommendations || [];
      const obcPermitStatus = obcDetailedResult?.permitStatus || null;
      const obcMaterialChecks: any[] = obcDetailedResult?.materialChecks || [];
      const obcSafetyChecks: any[] = obcDetailedResult?.safetyChecks || [];
      
      if (obcChecklist.length > 0 || obcOverallStatus || obcPermitStatus) {
        const checklistRows = obcChecklist.slice(0, 15).map((item: any) => {
          const status = item.status || item.result || 'N/A';
          const isPass = /pass|compliant|ok|yes/i.test(String(status));
          const isFail = /fail|non.?compliant|no/i.test(String(status));
          const statusIcon = isPass ? '✅' : isFail ? '❌' : '⚠️';
          const statusColor = isPass ? '#059669' : isFail ? '#dc2626' : '#d97706';
          
          let detailBlock = '';
          if (!isPass) {
            const details: string[] = [];
            if (item.issueDescription) details.push('⚠️ ' + esc(item.issueDescription));
            if (item.actionRequired) details.push('📋 Action: ' + esc(item.actionRequired));
            if (item.contactInfo) details.push('📞 Contact: ' + esc(item.contactInfo));
            if (item.timeline) details.push('⏱️ Timeline: ' + esc(item.timeline));
            if (item.penalty) details.push('💰 Penalty: ' + esc(item.penalty));
            if (details.length > 0) {
              detailBlock = '<tr style="font-size:10px;background:#fefce8;border-bottom:1px solid #fde68a;"><td colspan="5" style="padding:6px 12px;color:#78350f;line-height:1.6;">' + details.join('<br/>') + '</td></tr>';
            }
          }
          
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;">' + statusIcon + '</td>' +
            '<td style="padding:5px 8px;font-weight:600;color:#1e40af;">' + esc(item.code || item.section || '—') + '</td>' +
            '<td style="padding:5px 8px;">' + esc(item.requirement || item.description || '—') + '</td>' +
            '<td style="padding:5px 8px;text-align:center;"><span style="color:' + statusColor + ';font-weight:700;">' + esc(String(status)) + '</span></td>' +
          '</tr>' + detailBlock;
        }).join('');
        
        // Permit status block
        let permitHtml = '';
        if (obcPermitStatus) {
          const obtained = obcPermitStatus.obtained;
          permitHtml = '<div style="margin-top:8px;padding:8px 12px;background:' + (obtained ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + (obtained ? '#bbf7d0' : '#fecaca') + ';border-radius:6px;">' +
            '<div style="font-size:11px;font-weight:700;color:' + (obtained ? '#166534' : '#991b1b') + ';">' + (obtained ? '✅ Building Permit Obtained' : '❌ Building Permit NOT Obtained') + '</div>' +
            (obcPermitStatus.permitSection ? '<div style="font-size:9px;color:#6b7280;margin-top:2px;">OBC ' + esc(obcPermitStatus.permitSection) + '</div>' : '') +
            (obcPermitStatus.penalty ? '<div style="font-size:9px;color:#dc2626;margin-top:2px;">💰 Penalty: ' + esc(obcPermitStatus.penalty) + '</div>' : '') +
          '</div>';
        }
        
        // Material checks
        let materialCheckHtml = '';
        if (obcMaterialChecks.length > 0) {
          const matRows = obcMaterialChecks.slice(0, 10).map((m: any) => {
            const isOk = /pass|ok|compliant/i.test(m.status || '');
            return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
              '<td style="padding:4px 8px;">' + (isOk ? '✅' : '⚠️') + '</td>' +
              '<td style="padding:4px 8px;font-weight:600;">' + esc(m.material || m.name || '—') + '</td>' +
              '<td style="padding:4px 8px;color:#6b7280;">' + esc(m.obcRequirement || m.requirement || '—') + '</td>' +
              '<td style="padding:4px 8px;color:' + (isOk ? '#059669' : '#d97706') + ';font-weight:600;">' + esc(m.status || '—') + '</td>' +
            '</tr>';
          }).join('');
          materialCheckHtml = '<div style="margin-top:10px;">' +
            '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:4px;">🧱 Material Compliance Checks</div>' +
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
              '<thead><tr style="background:#f9fafb;font-size:8px;text-transform:uppercase;color:#6b7280;">' +
                '<th style="padding:4px 8px;width:30px;">✓</th><th style="padding:4px 8px;text-align:left;">Material</th><th style="padding:4px 8px;text-align:left;">OBC Requirement</th><th style="padding:4px 8px;text-align:left;">Status</th>' +
              '</tr></thead><tbody>' + matRows + '</tbody></table>' +
          '</div>';
        }
        
        // Safety checks
        let safetyCheckHtml = '';
        if (obcSafetyChecks.length > 0) {
          const safeRows = obcSafetyChecks.slice(0, 8).map((s: any) => {
            const isOk = /pass|ok/i.test(s.status || '');
            return '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;">' +
              '<td style="padding:4px 8px;">' + (isOk ? '✅' : '❌') + '</td>' +
              '<td style="padding:4px 8px;font-weight:600;">' + esc(s.category || '—') + '</td>' +
              '<td style="padding:4px 8px;color:#6b7280;">' + esc(s.regulation || '—') + ' — ' + esc(s.requirement || '') + '</td>' +
              '<td style="padding:4px 8px;color:' + (isOk ? '#059669' : '#dc2626') + ';font-weight:600;">' + esc(s.status || '—') + '</td>' +
            '</tr>';
          }).join('');
          safetyCheckHtml = '<div style="margin-top:10px;">' +
            '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:4px;">🛡️ Safety Compliance Checks</div>' +
            '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
              '<thead><tr style="background:#fef2f2;font-size:8px;text-transform:uppercase;color:#dc2626;">' +
                '<th style="padding:4px 8px;width:30px;">✓</th><th style="padding:4px 8px;text-align:left;">Category</th><th style="padding:4px 8px;text-align:left;">Regulation & Requirement</th><th style="padding:4px 8px;text-align:left;">Status</th>' +
              '</tr></thead><tbody>' + safeRows + '</tbody></table>' +
          '</div>';
        }
        
        // Recommendations
        let recsHtml = '';
        if (obcRecommendations.length > 0) {
          recsHtml = '<div style="margin-top:10px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">' +
            '<div style="font-size:10px;font-weight:700;color:#166534;margin-bottom:4px;">📋 Recommendations</div>' +
            '<ul style="margin:0;padding-left:16px;font-size:10px;color:#374151;line-height:1.6;">' +
            obcRecommendations.slice(0, 8).map(r => '<li>' + esc(r) + '</li>').join('') +
            '</ul></div>';
        }
        
        const obcPassCount = obcChecklist.filter((item: any) => /pass|compliant|ok|yes/i.test(String(item.status || item.result || ''))).length;
        
        obcChecklistHtml = '<div class="pdf-section" style="margin-bottom:10px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">' +
          '<div style="background:linear-gradient(135deg,#312e81,#4338ca);padding:10px 14px;color:white;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;">' +
              '<div>' +
                '<div style="font-size:12px;font-weight:700;">OBC Compliance Checklist — Detailed Analysis</div>' +
                '<div style="font-size:9px;opacity:0.8;margin-top:2px;">' + obcPassCount + '/' + obcChecklist.length + ' checks passed · Status: ' + esc(obcOverallStatus || 'Analyzing') + '</div>' +
              '</div>' +
              '<span style="background:rgba(139,92,246,0.3);border:1px solid rgba(139,92,246,0.5);padding:2px 8px;border-radius:10px;font-size:8px;font-weight:700;">⚖️ OPENAI ENGINE</span>' +
            '</div>' +
          '</div>' +
          '<div style="padding:10px 14px;">' +
            (checklistRows ? '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">' +
              '<thead><tr style="background:#f9fafb;font-size:9px;text-transform:uppercase;color:#6b7280;">' +
                '<th style="padding:5px 8px;width:30px;">✓</th><th style="padding:5px 8px;text-align:left;">Code</th><th style="padding:5px 8px;text-align:left;">Requirement</th><th style="padding:5px 8px;text-align:center;">Status</th>' +
              '</tr></thead><tbody>' + checklistRows + '</tbody></table>' : '') +
            permitHtml + materialCheckHtml + safetyCheckHtml + recsHtml +
          '</div>' +
        '</div>';
      }
      
      // ---- FILES & CONTRACTS SECTION ----
      let visualHtml = '';
      const geminiVisual = aiAnalysisData?.engines?.gemini?.analysis?.visualAnalysis || (savedPhotoEstimate as any)?.visual_analysis?.gemini_findings?.visualAnalysis || null;
      const imagesAnalyzedCount = aiAnalysisData?.engines?.gemini?.imagesAnalyzed || (savedPhotoEstimate as any)?.visual_analysis?.images_analyzed || 0;
      const conflictAlerts = aiAnalysisData?.conflictAlerts || (savedPhotoEstimate as any)?.visual_analysis?.conflict_alerts || [];
      
      // Conflict HTML
      let conflictHtml = '';
      if (conflictAlerts.length > 0) {
        const conflictRows = conflictAlerts.map((c: any) =>
          '<tr style="font-size:11px;border-bottom:1px solid #fecaca;">' +
            '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">🔴 ' + (c.type || 'MISMATCH') + '</td>' +
            '<td style="padding:5px 8px;">' + (c.visual_value?.toLocaleString() || '?') + '</td>' +
            '<td style="padding:5px 8px;">' + (c.db_value?.toLocaleString() || '?') + '</td>' +
            '<td style="padding:5px 8px;font-weight:700;color:#dc2626;">+' + (c.deviation_pct || 0) + '%</td>' +
          '</tr>'
        ).join('');
        conflictHtml = '<div class="pdf-section" style="margin-bottom:10px;border:2px solid #dc2626;border-radius:6px;overflow:hidden;">' +
          '<div style="background:#fef2f2;padding:10px 14px;border-bottom:1px solid #fecaca;">' +
            '<div style="font-size:13px;font-weight:700;color:#991b1b;">⚠️ CONFLICT DETECTED — Visual vs Database</div>' +
            '<div style="font-size:9px;color:#dc2626;margin-top:2px;">Automatic conflict detection by Gemini Files & Contracts Engine</div>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:#fff5f5;font-size:9px;text-transform:uppercase;color:#dc2626;">' +
              '<th style="padding:6px 8px;text-align:left;">Conflict</th><th style="padding:6px 8px;">Visual</th><th style="padding:6px 8px;">DB</th><th style="padding:6px 8px;">Deviation</th>' +
            '</tr></thead><tbody>' + conflictRows + '</tbody></table></div>';
      }
      
      // Photo evidence table
      if (photoCits.length > 0 || blueprintCit || projectDocCount > 0) {
        const geminiSiteFindings: any[] = geminiVisual?.sitePhotoFindings || (savedPhotoEstimate as any)?.engines?.gemini?.analysis?.visualAnalysis?.sitePhotoFindings || [];
        
        const photoRows = photoCits.slice(0, 12).map((pc, i) => {
          const ts = pc.timestamp ? new Date(pc.timestamp).toLocaleDateString() : '—';
          const cId = pc.id?.slice(0, 8) || '—';
          const desc = esc((pc.answer || '').slice(0, 80));
          const matchedFinding = geminiSiteFindings[i];
          
          let aiVisionText = '';
          if (matchedFinding) {
            const obs = (matchedFinding.observations || []).slice(0, 3).join('; ');
            const stage = matchedFinding.stage || '';
            const trades = (matchedFinding.tradesVisible || []).join(', ');
            const quality = matchedFinding.qualityScore ? `Quality: ${matchedFinding.qualityScore}/100` : '';
            aiVisionText = [obs, stage ? `Stage: ${stage}` : '', trades ? `Trades: ${trades}` : '', quality].filter(Boolean).join(' · ').slice(0, 200) || '✓ Analyzed';
          } else {
            aiVisionText = '⏳ Pending';
          }
          
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;color:#6b7280;">' + (pc.cite_type === 'VISUAL_VERIFICATION' ? '🔍' : '📷') + ' #' + (i + 1) + '</td>' +
            '<td style="padding:5px 8px;font-family:monospace;font-size:10px;color:#059669;">cite:' + cId + '</td>' +
            '<td style="padding:5px 8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + desc + '</td>' +
            '<td style="padding:5px 8px;color:#7c3aed;font-size:10px;max-width:250px;line-height:1.4;white-space:normal;">' + esc(aiVisionText) + '</td>' +
            '<td style="padding:5px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
          '</tr>';
        }).join('');
        
        // AI Vision summary
        let aiVisionSummaryHtml = '';
        if (geminiVisual && imagesAnalyzedCount > 0) {
          let bpRows = '';
          if ((geminiVisual.blueprintFindings || []).length > 0) {
            bpRows = '<div style="margin-top:8px;"><div style="font-size:11px;color:#0891b2;font-weight:700;margin-bottom:4px;">📐 Blueprint Analysis</div>' +
              '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;"><thead><tr style="background:#f0fdfa;font-size:9px;text-transform:uppercase;color:#0d9488;"><th style="padding:4px 8px;">File</th><th style="padding:4px 8px;">Type</th><th style="padding:4px 8px;">Dimensions</th><th style="padding:4px 8px;">Observations</th></tr></thead><tbody>' +
              (geminiVisual.blueprintFindings || []).map((bp: any) =>
                '<tr style="font-size:10px;border-bottom:1px solid #f0f0f0;"><td style="padding:4px 8px;font-weight:600;">' + esc(bp.fileName || 'Blueprint') + '</td>' +
                '<td style="padding:4px 8px;">' + esc(bp.type || 'Drawing') + '</td>' +
                '<td style="padding:4px 8px;">' + esc(bp.dimensions || '—') + '</td>' +
                '<td style="padding:4px 8px;">' + esc((bp.observations || []).slice(0, 3).join('; ')) + '</td></tr>'
              ).join('') + '</tbody></table></div>';
          }
          aiVisionSummaryHtml = '<div style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
              '<span style="font-size:12px;">🔍</span>' +
              '<div style="font-size:11px;font-weight:700;color:#0c4a6e;">AI Files & Contracts Summary</div>' +
              '<span style="background:#06b6d4;color:white;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">' + imagesAnalyzedCount + ' images analyzed</span>' +
            '</div>' +
            (geminiVisual.overallVisualScore ? '<div style="font-size:10px;color:#374151;">Overall Visual Score: <strong style="color:' + ((geminiVisual.overallVisualScore || 0) >= 70 ? '#16a34a' : '#ca8a04') + ';">' + geminiVisual.overallVisualScore + '/100</strong></div>' : '') +
            bpRows +
          '</div>';
        }
        
        visualHtml = '<div class="pdf-section" style="margin-bottom:10px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
            '<span style="font-size:15px;">📁</span>' +
            '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Files & Contracts Audit</div>' +
            '<span style="background:rgba(59,130,246,0.15);color:#3b82f6;font-size:8px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">🔍 GEMINI ENGINE</span>' +
          '</div>' +
          '<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">' + photoCits.length + ' visual asset(s) · ' + (blueprintCit ? '1 blueprint' : 'No blueprint') + ' · ' + projectDocCount + ' doc(s) in storage' + (imagesAnalyzedCount > 0 ? ' · <span style="color:#06b6d4;font-weight:600;">' + imagesAnalyzedCount + ' AI-analyzed</span>' : '') + '</div>' +
          conflictHtml +
          (photoRows ? '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
            '<thead><tr style="background:#f0fdf4;font-size:9px;text-transform:uppercase;color:#059669;">' +
              '<th style="padding:6px 8px;">Asset</th><th style="padding:6px 8px;">Citation</th><th style="padding:6px 8px;">Description</th><th style="padding:6px 8px;">AI Vision Analysis</th><th style="padding:6px 8px;">Date</th>' +
            '</tr></thead><tbody>' + photoRows + '</tbody></table>' : '') +
          aiVisionSummaryHtml +
        '</div>';
      }
      
      // ---- SITE PRESENCE LOG ----
      let sitePresenceHtml = '';
      if (namedCheckins.length > 0) {
        const checkinRows = namedCheckins.slice(0, 15).map((c: any) => {
          const inTime = new Date(c.checked_in_at);
          const outTime = c.checked_out_at ? new Date(c.checked_out_at) : null;
          const durationMs = (outTime || new Date()).getTime() - inTime.getTime();
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          const weather = c.weather_snapshot || {};
          const weatherStr = weather.temp != null ? `${Math.round(weather.temp)}° ${weather.description || ''}` : '—';
          const statusBg = !c.checked_out_at ? '#dcfce7' : '#f9fafb';
          const statusColor = !c.checked_out_at ? '#166534' : '#6b7280';
          const statusText = !c.checked_out_at ? '● ACTIVE' : '✓ Completed';
          
          const checkinDay = format(inTime, 'yyyy-MM-dd');
          const dayTasks = completedTasksByDay.get(checkinDay) || [];
          
          let taskSubRow = '';
          if (dayTasks.length > 0) {
            const taskItems = dayTasks.slice(0, 4).map(t =>
              '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:8px;font-size:8px;margin:1px 2px;">✓ ' + esc(t.title) + '</span>'
            ).join('');
            taskSubRow = '<tr style="background:#f8fafc;"><td colspan="6" style="padding:2px 8px 4px 24px;border-bottom:1px solid #e5e7eb;">' +
              '<div style="font-size:8px;color:#374151;font-weight:600;margin-bottom:1px;">📋 Tasks:</div>' + taskItems + '</td></tr>';
          }
          
          return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
            '<td style="padding:5px 8px;font-weight:500;">' + esc(c.user_name) + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;">' + format(inTime, 'MMM d, HH:mm') + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;">' + (outTime ? format(outTime, 'HH:mm') : '—') + '</td>' +
            '<td style="padding:5px 8px;font-weight:600;">' + duration + '</td>' +
            '<td style="padding:5px 8px;color:#6b7280;font-size:10px;">' + esc(weatherStr) + '</td>' +
            '<td style="padding:5px 8px;text-align:center;"><span style="background:' + statusBg + ';color:' + statusColor + ';padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;">' + statusText + '</span></td>' +
          '</tr>' + taskSubRow;
        }).join('');
        
        const totalSessions = namedCheckins.length;
        const uniqueWorkers = new Set(namedCheckins.map((c: any) => c.user_id)).size;
        const totalTasksDone = [...completedTasksByDay.values()].reduce((sum, arr) => sum + arr.length, 0);
        
        sitePresenceHtml = '<div class="pdf-section" style="margin-bottom:10px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
            '<span style="font-size:15px;">📍</span>' +
            '<div style="font-size:13px;font-weight:700;color:#1e3a5f;">Site Presence Log</div>' +
          '</div>' +
          '<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">' + totalSessions + ' sessions · ' + uniqueWorkers + ' worker(s) · ' + totalTasksDone + ' task(s) completed</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">' +
            '<thead><tr style="background:#ecfdf5;font-size:9px;text-transform:uppercase;color:#059669;">' +
              '<th style="padding:6px 8px;">Worker</th><th style="padding:6px 8px;">In</th><th style="padding:6px 8px;">Out</th><th style="padding:6px 8px;">Duration</th><th style="padding:6px 8px;">Weather</th><th style="padding:6px 8px;text-align:center;">Status</th>' +
            '</tr></thead><tbody>' + checkinRows + '</tbody></table>' +
        '</div>';
      }
      
      // ---- ASSEMBLE HTML ----
      const projName = projectData?.name || 'Project';
      const projAddr = projectData?.address || '';
      
      const { buildUnionPdfHeader, buildUnionPdfFooter } = await import('@/lib/pdfGenerator');
      const header = buildUnionPdfHeader({
        docType: 'M.E.S.S.A. Site Intelligence Report',
        contractorName: profile.company_name || undefined,
        contractorPhone: profile.phone || undefined,
        contractorEmail: userEmail || undefined,
        contractorWebsite: profile.company_website || undefined,
        dateStr: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
      const footer = buildUnionPdfFooter({
        contractorName: profile.company_name || undefined,
        docNumber: 'SI-' + projectId.slice(0, 8).toUpperCase(),
      });
      
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1f2937; padding: 18px 22px; max-width: 800px; margin: 0 auto; font-size: 10.5px; line-height: 1.3; }' +
        '.pdf-section { margin-bottom: 3px; margin-top: 1px; }' +
        'table { font-size: 10px; border-spacing: 0; margin-bottom: 1px; }' +
        'tr { break-inside: avoid !important; page-break-inside: avoid !important; }' +
        'thead { display: table-header-group; }' +
        '</style></head><body>' +
        header +
        '<div class="pdf-section" style="text-align:center;margin-bottom:14px;">' +
          '<div style="font-size:15px;font-weight:700;color:#1e1b4b;">' + esc(projName) + '</div>' +
          (projAddr ? '<div style="font-size:9px;color:#9ca3af;margin-top:1px;">' + esc(projAddr) + '</div>' : '') +
          '<div style="font-size:8px;color:#9ca3af;margin-top:1px;">Generated: ' + new Date().toLocaleString() + '</div>' +
        '</div>' +
        dualEngineHeader +
        obcHtml +
        obcChecklistHtml +
        visualHtml +
        sitePresenceHtml +
        // Legal Disclaimer
        '<div class="pdf-section" style="margin-top:12px;margin-bottom:8px;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;">' +
          '<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px;">⚖️ Building Code Alignment Notice</div>' +
          '<p style="font-size:9px;color:#78350f;line-height:1.5;margin:0;">This automated analysis is for informational purposes only. BuildUnion/MESSA does not replace professional engineering review or municipal building inspector approval. Users are responsible for ensuring full alignment with all applicable building codes, safety regulations, and obtaining required permits before commencing work.</p>' +
        '</div>' +
        footer +
      '</body></html>';
      
      const { generatePDFBlob } = await import('@/lib/pdfGenerator');
      const filename = 'site-intelligence-' + (projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export') + '.pdf';
      const blob = await generatePDFBlob(html, { filename, pageFormat: 'letter' });
      
      setSiteIntelHtml(html);
      const blobUrl = URL.createObjectURL(blob);
      setSiteIntelBlobUrl(blobUrl);
      setSiteIntelFilename(filename);
      
      // Auto-save to project documents
      if (projectId) {
        try {
          const storagePath = `${projectId}/site-intelligence-latest.pdf`;
          await supabase.storage.from('project-documents').remove([storagePath]);
          const { error: uploadErr } = await supabase.storage.from('project-documents').upload(storagePath, blob, { contentType: 'application/pdf' });
          if (!uploadErr) {
            const { data: existingDocs } = await supabase.from('project_documents').select('id').eq('project_id', projectId).eq('file_name', 'Site Intelligence Report.pdf').limit(1);
            if (existingDocs && existingDocs.length > 0) {
              await supabase.from('project_documents').update({ file_name: `Site Intel — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (archived)` }).eq('id', existingDocs[0].id);
            }
            await supabase.from('project_documents').insert({
              project_id: projectId,
              file_name: 'Site Intelligence Report.pdf',
              file_path: storagePath,
              file_size: blob.size,
              mime_type: 'application/pdf',
              uploaded_by: userId,
              uploaded_by_name: profile?.company_name || 'Owner',
              uploaded_by_role: 'owner',
            });
            setDocuments(prev => [...prev, {
              id: crypto.randomUUID(),
              file_name: 'Site Intelligence Report.pdf',
              file_path: storagePath,
              category: 'technical' as DocumentCategory,
            }]);
          }
        } catch (_) { /* ignore */ }
      }
      
      setShowSiteIntelPreviewDialog(true);
      toast.dismiss('site-intel');
      toast.success('Site Intelligence Report ready');
    } catch (err) {
      console.error('[Site Intel] Error:', err);
      toast.dismiss('site-intel');
      toast.error('Failed to generate Site Intelligence report');
    } finally {
      setIsGeneratingSiteIntel(false);
    }
  }, [citations, projectData, obcComplianceResults, userId, projectId, teamMembers, tasks, documents]);
  
  // Generate Invoice - Opens Preview Modal
  const handleGenerateInvoice = useCallback(async () => {
    // Tier gate: Invoice generation requires Pro+
    if (!canGenerateInvoice()) {
      toast.error(getUpgradeMessage('invoiceGenerationEnabled'), {
        action: { label: 'Upgrade', onClick: () => window.location.href = '/buildunion/pricing' },
      });
      return;
    }
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to generate invoices');
        return;
      }
      
      setIsGeneratingInvoice(true);
      toast.loading('Preparing invoice preview...', { id: 'invoice-gen' });
      
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          projectId,
          notes: `Invoice for ${projectData?.name || 'Project'}`,
        },
      });
      
      if (error) throw error;
      
      if (data) {
        // Build HTML for preview
        const { buildInvoiceHTML } = await import('@/lib/invoiceGenerator');
        const html = buildInvoiceHTML(data);
        
        setInvoicePreviewData(data);
        setInvoicePreviewHtml(html);
        setShowInvoicePreview(true);
        
        toast.success('Invoice ready — edit fields then download', { id: 'invoice-gen' });
      }
    } catch (err) {
      console.error('[Stage8] Invoice generation failed:', err);
      toast.error('Failed to generate invoice', { id: 'invoice-gen' });
    } finally {
      setIsGeneratingInvoice(false);
    }
  }, [projectId, projectData]);
  
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
  
  // Generate Project Summary - Comprehensive AI-powered progress report with dual engine, weather, OBC
  const handleGenerateSummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      // Show loading toast
      toast.loading('Generating Comprehensive Project Summary...', { id: 'summary-gen', description: 'Dual AI + Weather + OBC Analysis' });
      
      // Gather all citation data from project
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
      const workTypeCitation = citations.find(c => c.cite_type === 'WORK_TYPE');
      const projectNameCitation = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const executionModeCitation = citations.find(c => c.cite_type === 'EXECUTION_MODE');
      const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const demolitionCitation = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
      const timelineCitation = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCitation = citations.find(c => c.cite_type === 'END_DATE');
      const teamCitations = citations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE' || c.cite_type === 'TEAM_STRUCTURE' || c.cite_type === 'TEAM_SIZE');
      const docCitations = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'BLUEPRINT_UPLOAD' || c.cite_type === 'VISUAL_VERIFICATION');
      const dnaFinalizedCitation = citations.find(c => c.cite_type === 'DNA_FINALIZED');
      
      const gfaValue = typeof gfaCitation?.value === 'number' ? gfaCitation.value : (typeof gfaCitation?.metadata?.gfa_value === 'number' ? gfaCitation.metadata.gfa_value : 0);
      const trade = tradeCitation?.answer || projectData?.trade || 'Not set';
      const address = locationCitation?.answer || projectData?.address || '';
      const workType = workTypeCitation?.answer || (workTypeCitation?.metadata as any)?.work_type_key || 'Not set';
      const executionMode = executionModeCitation?.answer || 'Solo';
      const siteCondition = siteConditionCitation?.answer || 'Not assessed';
      const hasDemolition = demolitionCitation && (typeof demolitionCitation.value === 'number' && demolitionCitation.value > 0);
      const startDate = timelineCitation?.answer || '';
      const endDate = endDateCitation?.answer || '';
      
      // Calculate waste percentage from template
      const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number' ? templateCitation.metadata.waste_percent : 10;
      const grossArea = gfaValue > 0 ? Math.round(gfaValue * (1 + wastePercent / 100)) : 0;
      
      // Fetch weather data for project location
      let weatherData: any = null;
      let weatherAlerts: any[] = [];
      if (address && address.length > 5) {
        try {
          const { data: weatherResult } = await supabase.functions.invoke('get-weather', {
            body: { location: address, days: 5 }
          });
          if (weatherResult && !weatherResult.error) {
            weatherData = weatherResult;
            weatherAlerts = weatherResult.current?.alerts || [];
          }
        } catch (err) {
          console.log('[Summary] Weather fetch skipped:', err);
        }
      }
      
      // Call AI for OBC compliance and project assessment
      let aiInsights: any = null;
      try {
        const { data: aiResult } = await supabase.functions.invoke('ai-project-analysis', {
          body: {
            projectId,
            analysisType: 'synthesis',
          },
        });
        if (aiResult && !aiResult.error) {
          aiInsights = aiResult;
        }
      } catch (err) {
        console.log('[Summary] AI assessment skipped:', err);
      }
      
      // Extract AI insights
      const geminiInsight = aiInsights?.engines?.gemini?.analysis || {};
      const openaiInsight = aiInsights?.engines?.openai?.analysis || {};
      const obcStatus = openaiInsight?.obcCompliance || geminiInsight?.obcCompliance || 'Pending Review';
      const riskLevel = openaiInsight?.riskLevel || geminiInsight?.riskLevel || 'Medium';
      const aiRecommendations = geminiInsight?.recommendations || openaiInsight?.recommendations || [];
      const conflictStatus = geminiInsight?.conflictStatus || 'No conflicts detected';
      const materialCount = geminiInsight?.materialCount || templateCitation?.metadata?.materials_count || 0;
      
      // Calculate 8-PILLAR STATUS (mirrors M.E.S.S.A. 8 orbital panels)
      const pillars = [
        {
          id: 1, name: 'Project Basics', icon: '🏗️', color: '#059669',
          status: (!!projectNameCitation && !!locationCitation && !!workTypeCitation) ? 'COMPLETE' : (!!projectNameCitation || !!locationCitation) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Project Name', value: projectData?.name || '—', ok: !!projectNameCitation || !!projectData?.name },
            { label: 'Location', value: address ? address.split(',').slice(0, 2).join(',') : '—', ok: !!locationCitation },
            { label: 'Work Type', value: workType, ok: !!workTypeCitation },
          ],
        },
        {
          id: 2, name: 'Area & Dimensions', icon: '📐', color: '#2563eb',
          status: (!!gfaCitation && gfaValue > 0) ? 'COMPLETE' : 'MISSING',
          items: [
            { label: 'GFA Locked', value: gfaValue > 0 ? `${gfaValue.toLocaleString()} sq ft` : '—', ok: !!gfaCitation && gfaValue > 0 },
            { label: 'Gross Area (+' + wastePercent + '% waste)', value: grossArea > 0 ? `${grossArea.toLocaleString()} sq ft` : '—', ok: grossArea > 0 },
            { label: 'Site Condition', value: siteCondition, ok: !!siteConditionCitation },
          ],
        },
        {
          id: 3, name: 'Trade & Template', icon: '🔨', color: '#ea580c',
          status: (!!tradeCitation && !!templateCitation) ? 'COMPLETE' : (!!tradeCitation || !!templateCitation) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Trade', value: trade, ok: !!tradeCitation },
            { label: 'Template', value: templateCitation ? 'Locked' : '—', ok: !!templateCitation },
            { label: 'Execution Mode', value: executionMode, ok: !!executionModeCitation },
          ],
        },
        {
          id: 4, name: 'Team Architecture', icon: '👥', color: '#0d9488',
          status: (teamMembers.length > 0 || teamCitations.length > 0) ? 'COMPLETE' : executionMode === 'Solo' ? 'N/A' : 'MISSING',
          items: [
            { label: 'Team Size', value: `${teamMembers.length} member(s)`, ok: teamMembers.length > 0 || executionMode === 'Solo' },
            { label: 'Invitations', value: `${teamCitations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE').length} sent`, ok: true },
            { label: 'Mode', value: executionMode, ok: true },
          ],
        },
        {
          id: 5, name: 'Execution Timeline', icon: '📅', color: '#6366f1',
          status: (!!timelineCitation && !!endDateCitation && tasks.length > 0) ? 'COMPLETE' : (!!timelineCitation || tasks.length > 0) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Start Date', value: startDate || '—', ok: !!timelineCitation },
            { label: 'End Date', value: endDate || '—', ok: !!endDateCitation },
            { label: 'Tasks', value: `${tasks.filter(t => t.status === 'completed' || t.status === 'done').length}/${tasks.length} complete`, ok: tasks.length > 0 },
          ],
        },
        {
          id: 6, name: 'Documents & Contracts', icon: '📁', color: '#0284c7',
          status: (documents.length > 0 && contracts.length > 0) ? 'COMPLETE' : (documents.length > 0 || contracts.length > 0) ? 'PARTIAL' : 'MISSING',
          items: [
            { label: 'Documents', value: `${documents.length} file(s)`, ok: documents.length > 0 },
            { label: 'Contracts', value: `${contracts.length} created`, ok: contracts.length > 0 },
            { label: 'Site Photos', value: `${docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length} uploaded`, ok: docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length > 0 },
          ],
        },
        {
          id: 7, name: 'Site Log & Location', icon: '🌤️', color: '#0ea5e9',
          status: address ? 'ACTIVE' : 'MISSING',
          items: [
            { label: 'Location Set', value: address ? 'Yes' : 'No', ok: !!address },
            { label: 'Demolition', value: hasDemolition ? 'Required' : 'None', ok: true },
            { label: 'Site Hazards', value: siteCondition === 'Clear Site' ? 'None' : siteCondition, ok: true },
          ],
        },
        {
          id: 8, name: 'Financial Summary', icon: '💰', color: '#dc2626',
          status: (financialSummary?.total_cost && financialSummary.total_cost > 0) ? 'COMPLETE' : 'MISSING',
          items: [
            { label: 'Material Cost', value: financialSummary?.material_cost ? '$' + financialSummary.material_cost.toLocaleString() : '—', ok: !!(financialSummary?.material_cost && financialSummary.material_cost > 0) },
            { label: 'Labor Cost', value: financialSummary?.labor_cost ? '$' + financialSummary.labor_cost.toLocaleString() : '—', ok: !!(financialSummary?.labor_cost && financialSummary.labor_cost > 0) },
            { label: 'Total Budget', value: financialSummary?.total_cost ? '$' + financialSummary.total_cost.toLocaleString() : '—', ok: !!(financialSummary?.total_cost && financialSummary.total_cost > 0) },
          ],
        },
      ];

      const pillarComplete = pillars.filter(p => p.status === 'COMPLETE' || p.status === 'ACTIVE' || p.status === 'N/A').length;
      const pillarTotal = pillars.filter(p => p.status !== 'N/A').length;
      
      // Legacy checkpoint calculation (kept for readiness metric)
      const checkpoints = [
        { name: 'Project Name', completed: !!projectNameCitation || !!projectData?.name, phase: 'Definition', priority: 'Required' },
        { name: 'Location Verified', completed: !!locationCitation, phase: 'Definition', priority: 'Required' },
        { name: 'Work Type', completed: !!workTypeCitation, phase: 'Definition', priority: 'Required' },
        { name: 'GFA Locked', completed: !!gfaCitation && gfaValue > 0, phase: 'Scope', priority: 'Critical' },
        { name: 'Trade Selection', completed: !!tradeCitation, phase: 'Scope', priority: 'Critical' },
        { name: 'Template Locked', completed: !!templateCitation, phase: 'Scope', priority: 'Important' },
        { name: 'Execution Mode', completed: !!executionModeCitation, phase: 'Execution', priority: 'Required' },
        { name: 'Site Condition', completed: !!siteConditionCitation, phase: 'Execution', priority: 'Required' },
        { name: 'Timeline Set', completed: !!timelineCitation && !!endDateCitation, phase: 'Execution', priority: 'Critical' },
        { name: 'DNA Finalized', completed: !!dnaFinalizedCitation, phase: 'Execution', priority: 'Important' },
        { name: 'Team Invited', completed: teamCitations.length > 0 || teamMembers.length > 0, phase: 'Team', priority: executionMode === 'Team' ? 'Required' : 'Optional' },
        { name: 'Tasks Created', completed: tasks.length > 0, phase: 'Team', priority: 'Important' },
        { name: 'Site Photos', completed: docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length > 0, phase: 'Documentation', priority: 'Required' },
        { name: 'Blueprints Uploaded', completed: docCitations.filter(c => c.cite_type === 'BLUEPRINT_UPLOAD').length > 0, phase: 'Documentation', priority: 'Important' },
        { name: 'Budget Set', completed: !!(financialSummary?.total_cost && financialSummary.total_cost > 0), phase: 'Financial', priority: 'Critical' },
        { name: 'Contract Created', completed: contracts.length > 0, phase: 'Financial', priority: 'Critical' },
      ];
      
      const completedCount = checkpoints.filter(c => c.completed).length;
      const criticalCheckpoints = checkpoints.filter(c => c.priority === 'Critical');
      const criticalCompleted = criticalCheckpoints.filter(c => c.completed).length;
      const completionPercent = Math.round((completedCount / checkpoints.length) * 100);
      const criticalPercent = Math.round((criticalCompleted / criticalCheckpoints.length) * 100);
      const operationalReadiness = Math.round((completionPercent * 0.6) + (criticalPercent * 0.4));
      const readinessGrade = operationalReadiness >= 85 ? 'OPERATIONAL' : operationalReadiness >= 60 ? 'PARTIAL' : 'INCOMPLETE';
      
      // Build rich HTML summary
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Weather section HTML
      const weatherHtml = weatherData ? `
        <div class="section">
           <div class="section-header"><span class="section-number">3.</span> WEATHER CONDITIONS</div>
          <div class="weather-grid">
            <div class="weather-current">
              <div class="weather-temp">${Math.round(weatherData.current?.temp || 0)}°C</div>
              <div class="weather-desc">${weatherData.current?.description || 'N/A'}</div>
              <div class="weather-details">
                <span>💨 ${Math.round(weatherData.current?.wind_speed || 0)} km/h</span>
                <span>💧 ${weatherData.current?.humidity || 0}%</span>
              </div>
            </div>
            <div class="forecast-mini">
              ${(weatherData.forecast || []).slice(0, 5).map((day: any) => `
                <div class="forecast-day">
                  <div class="forecast-date">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div class="forecast-temps">${Math.round(day.temp_max)}° / ${Math.round(day.temp_min)}°</div>
                  ${(day.alerts?.length || 0) > 0 ? '<div class="forecast-alert">⚠️</div>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ${weatherAlerts.length > 0 ? `
            <div class="alert-box warning">
              <strong>⚠️ Construction Alerts:</strong>
              ${weatherAlerts.map((a: any) => `<div>• ${a.message}</div>`).join('')}
            </div>
          ` : '<div class="status-good">✓ No weather alerts - conditions favorable for construction</div>'}
        </div>
      ` : '<div class="section"><div class="section-header"><span class="section-number">3.</span> WEATHER CONDITIONS</div><div class="status-pending">Location required for weather data</div></div>';
      
      // OBC Compliance section HTML
      const obcHtml = `
        <div class="section">
          <div class="section-header"><span class="section-number">4.</span> REGULATORY COMPLIANCE (OBC 2024)</div>
          <table>
            <tr>
              <th>Requirement</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
            <tr>
              <td>Ontario Building Code</td>
              <td class="${obcStatus === 'Compliant' || obcStatus === 'Pass' ? 'status-pass' : 'status-review'}">${obcStatus}</td>
              <td>Based on project scope and trade selection</td>
            </tr>
            <tr>
              <td>Permit Requirements</td>
              <td class="${gfaValue > 500 ? 'status-review' : 'status-pass'}">${gfaValue > 500 ? 'Likely Required' : 'Check Local'}</td>
              <td>${gfaValue > 500 ? 'Projects >500 sq ft typically require permits' : 'Minor work may be exempt'}</td>
            </tr>
            <tr>
              <td>WSIB Coverage</td>
              <td class="status-review">Verify</td>
              <td>Required for all construction workers in Ontario</td>
            </tr>
            <tr>
              <td>Safety Protocols</td>
              <td class="${hasDemolition ? 'status-review' : 'status-pass'}">${hasDemolition ? 'Enhanced Required' : 'Standard'}</td>
              <td>${hasDemolition ? 'Demolition work requires additional safety measures' : 'Standard PPE protocols apply'}</td>
            </tr>
          </table>
        </div>
      `;
      
      // AI Insights section HTML
      const aiHtml = aiInsights ? `
        <div class="section">
           <div class="section-header"><span class="section-number">5.</span> AI ENGINE ANALYSIS</div>
          <div class="dual-engine-status">
            <div class="engine-badge gemini">🔷 Gemini Pro</div>
            <div class="engine-badge openai">🟢 GPT-5</div>
            <div class="engine-status ${aiInsights.dualEngineUsed ? 'active' : 'single'}">
              ${aiInsights.dualEngineUsed ? '✓ Dual Engine Verified' : 'Single Engine'}
            </div>
          </div>
          <table>
            <tr>
              <th>Assessment</th>
              <th>Result</th>
              <th>Confidence</th>
            </tr>
            <tr>
              <td>Risk Level</td>
              <td class="${riskLevel === 'Low' ? 'status-pass' : riskLevel === 'Medium' ? 'status-review' : 'status-fail'}">${riskLevel}</td>
              <td>${aiInsights.dualEngineUsed ? 'High (dual verified)' : 'Medium'}</td>
            </tr>
            <tr>
              <td>Conflict Check</td>
              <td class="${conflictStatus.includes('No conflict') ? 'status-pass' : 'status-review'}">${conflictStatus}</td>
              <td>Automated</td>
            </tr>
            <tr>
              <td>Material Estimation</td>
              <td>${materialCount > 0 ? materialCount + ' items' : 'Pending'}</td>
              <td>${materialCount > 0 ? 'High' : 'N/A'}</td>
            </tr>
          </table>
          ${aiRecommendations.length > 0 ? `
            <div class="recommendations">
              <strong>AI Recommendations:</strong>
              <ul>
                ${aiRecommendations.slice(0, 3).map((r: string) => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      ` : '<div class="section"><div class="section-header"><span class="section-number">5.</span> AI ENGINE ANALYSIS</div><div class="status-pending">AI analysis will run on project activation</div></div>';
      
      const html = buildSummaryHTML(
        { projectData, financialSummary, citations, teamMembers, tasks, documents, contracts },
        {
          pillars, pillarComplete, pillarTotal, operationalReadiness, readinessGrade,
          gfaValue, grossArea, wastePercent, address, trade, workType, executionMode,
          siteCondition, hasDemolition: !!hasDemolition, startDate, endDate,
          weatherHtml, obcHtml, aiHtml,
        }
      );
      
      setSummaryPreviewHtml(html);
      setShowSummaryPreview(true);
      toast.success('Project Summary Generated!', { id: 'summary-gen', description: `${pillarComplete}/${pillarTotal} pillars complete • ${operationalReadiness}% readiness` });
    } catch (err) {
      console.error('[Stage8] Summary generation failed:', err);
      toast.error('Failed to generate summary', { id: 'summary-gen' });
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [projectId, citations, projectData, financialSummary, teamMembers, tasks, documents, contracts]);
  
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
         {/* Left: Invoice + Ask MESSA */}
         <div className="flex items-center gap-1.5 justify-self-start min-w-0">
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
         </div>
       </div>
       {/* ═══ AI ENGINE STRIP + PIPELINE FLOW ═══ */}
       <div className="shrink-0 border-b border-white/5 bg-[#0d1117]/95 backdrop-blur-md group/strip">
          {/* AI Engine Strip - Pipeline Flow */}
             <div className="px-1 sm:px-3 lg:px-4 py-2 sm:py-3 border-b border-white/5 overflow-hidden relative">

                {/* ═══ HOLOGRAPHIC BACKGROUND LAYER — Cityscape Left + Timer Right ═══ */}
                <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden z-0">

                  {/* LEFT: Toronto CN Tower Cyberpunk Hologram — AI-generated etched glass effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-[40%] opacity-80 group-hover/strip:opacity-100 transition-opacity duration-1000 overflow-hidden">
                    {/* Very faint scanline overlay for holographic effect */}
                    <motion.div
                      className="absolute inset-0"
                      style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(6,182,212,0.008) 3px, rgba(6,182,212,0.008) 6px)' }}
                      animate={{ backgroundPositionY: ['0px', '12px'] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Toronto cyberpunk skyline with holographic filters - extended downward */}
                    <img
                      src={torontoCyberpunkSkyline}
                      alt=""
                      className="absolute w-full object-cover object-left-center"
                      style={{
                        top: '-20%',
                        height: '140%',
                        filter: 'brightness(1.2) contrast(1.1) hue-rotate(200deg)',
                        mixBlendMode: 'screen',
                        opacity: 1,
                      }}
                    />
                    {/* Subtle drop shadow for depth */}
                    <div className="absolute inset-0" style={{
                      background: 'radial-gradient(ellipse at 20% 60%, rgba(6,182,212,0.08) 0%, transparent 50%)',
                    }} />
                    {/* Fade-out to center */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d1117]" />
                  </div>

                  {/* RIGHT: Mirrored Toronto Cyberpunk Skyline — panorama continuation */}
                  <div className="absolute right-0 top-0 bottom-0 w-[40%] opacity-80 group-hover/strip:opacity-100 transition-opacity duration-1000 overflow-hidden">
                    {/* Very faint scanline */}
                    <motion.div
                      className="absolute inset-0"
                      style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,92,246,0.008) 3px, rgba(139,92,246,0.008) 6px)' }}
                      animate={{ backgroundPositionY: ['0px', '-12px'] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Same Toronto image, flipped horizontally for panorama effect */}
                    <img
                      src={torontoCyberpunkSkyline}
                      alt=""
                      className="absolute w-full object-cover object-right-center"
                      style={{
                        top: '-20%',
                        height: '140%',
                        filter: 'brightness(1.2) contrast(1.1) hue-rotate(200deg)',
                        mixBlendMode: 'screen',
                        opacity: 1,
                        transform: 'scaleX(-1)',
                      }}
                    />
                    {/* Fade-out to center */}
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0d1117]" />
                  </div>
               </div>

              <div className="flex flex-col items-center gap-1.5 sm:gap-2 relative z-10">
                {/* Engine Icons with Connecting Lines */}
                <div className="relative flex items-center justify-center gap-0 sm:gap-2 overflow-x-auto scrollbar-hide py-1 max-w-full px-1">
                {(() => {
                   const pipelineSteps = ['Visual', 'Core', 'DNA', 'UI', 'Insights'];
                   const engines = [
                     { name: 'Gemini', label: 'Files Report', img: engineGeminiImg, textColor: 'text-cyan-400', badge: 'T', badgeColor: 'bg-cyan-500/20 text-cyan-300', territory: 'Files & Contracts, Weather, Site Log', glowColor: 'rgba(6,182,212,0.35)', accentColor: '#06b6d4', description: 'Gemini: Visual & Site Analysis — Analyzes site photos & blueprints using visual AI.', capabilities: ['📸 Photo & Blueprint Analysis', '🌦️ Weather Integration', '📋 Visual Site Logging'], reportType: 'gemini-visual' as AIEngineType, pipelineLabel: pipelineSteps[0] },
                     { name: 'GPT', label: 'Data Audit', img: engineGptImg, textColor: 'text-emerald-400', badge: 'AI', badgeColor: 'bg-emerald-500/20 text-emerald-300', territory: 'Project Core, Area/GFA, Trade, Financial', glowColor: 'rgba(16,185,129,0.35)', accentColor: '#10b981', description: 'GPT: Core Data Engine — Area calculations, GFA estimates, trade selection, and financial breakdowns.', capabilities: ['📐 Area & GFA Calculations', '🔧 Trade Template Engine', '💰 Financial Analysis'], reportType: 'gpt-audit' as AIEngineType, pipelineLabel: pipelineSteps[1] },
                     { name: 'Claude', label: 'OBC Compliance', img: engineClaudeImg, textColor: 'text-orange-400', badge: 'AI', badgeColor: 'bg-orange-500/20 text-orange-300', territory: 'OBC Alignment, Regulatory', glowColor: 'rgba(251,146,60,0.35)', accentColor: '#fb923c', description: 'Claude: OBC Compliance — Validates against Ontario Building Code 2024, Part 9 compliance.', capabilities: ['⚖️ OBC 2024 Compliance', '🏗️ Part 9 Validation', '🚨 Risk Flagging'], reportType: 'claude-obc' as AIEngineType, pipelineLabel: pipelineSteps[2] },
                     { name: 'Lovable', label: 'DNA Audit', img: engineLovableImg, textColor: 'text-pink-400', badge: 'AI', badgeColor: 'bg-pink-500/20 text-pink-300', territory: 'DNA Audit, Team Architecture', glowColor: 'rgba(236,72,153,0.35)', accentColor: '#ec4899', description: 'Lovable: DNA & UI Engine — Project readiness audit, team roles, execution timeline.', capabilities: ['🧬 DNA Readiness Audit', '👥 Team Architecture', '📅 Execution Timeline'], reportType: 'lovable-dna' as AIEngineType, pipelineLabel: pipelineSteps[3] },
                     { name: 'Grok', label: 'Market & Schedule', img: engineGrokImg, textColor: 'text-amber-300', badge: 'dl', badgeColor: 'bg-amber-500/20 text-amber-300', territory: 'Market Pricing, Scheduling, Affiliate Hub', glowColor: 'rgba(251,191,36,0.5)', accentColor: '#fbbf24', description: 'Grok: Market & Schedule — Real-time market pricing intelligence, weather-aware schedule optimization, affiliate suppliers, and cost-saving strategies.', capabilities: ['📊 Material Price Trends & Supplier Comparison', '📅 Schedule Optimization (weather-aware timing)', '🏪 Affiliate Suppliers & Cost-Saving', '⚡ Real-Time Market Intelligence'], reportType: 'grok-insights' as AIEngineType, pipelineLabel: pipelineSteps[4] },
                   ];
                  return engines.map((engine, i) => {
                    const isActive = i === activePipelineStep;
                    const prevActive = (i - 1) === activePipelineStep;
                    return (
                    <React.Fragment key={engine.name}>
                      {i > 0 && (
                        <div className="relative flex items-center h-10 sm:h-14 lg:h-[68px] shrink-0" style={{ width: 'clamp(12px, 3vw, 48px)' }}>
                          <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full transition-all duration-500"
                            style={{ background: isActive || prevActive
                              ? 'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(255,255,255,0.8), rgba(251,191,36,0.6))'
                              : 'linear-gradient(90deg, rgba(251,146,60,0.15), rgba(255,255,255,0.12), rgba(251,146,60,0.15))'
                            }}
                          />
                          <motion.div
                            className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full"
                            style={{
                              width: '8px',
                              background: isActive || prevActive
                                ? 'linear-gradient(90deg, transparent, #fbbf24, #ffffff, #fbbf24, transparent)'
                                : 'linear-gradient(90deg, transparent, rgba(251,146,60,0.4), rgba(255,255,255,0.3), rgba(251,146,60,0.4), transparent)',
                              boxShadow: isActive || prevActive
                                ? '0 0 8px rgba(251,191,36,0.6)'
                                : '0 0 4px rgba(251,146,60,0.2)',
                            }}
                            animate={{ left: ['-8px', 'calc(100% + 8px)'] }}
                            transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
                          />
                          <div className="absolute top-1/2 right-0 -translate-y-1/2"
                            style={{ width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: isActive ? '5px solid rgba(251,191,36,0.7)' : '4px solid rgba(251,146,60,0.25)' }}
                          />
                          <motion.div
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                            style={{ background: 'rgba(251,146,60,0.3)', boxShadow: '0 0 3px rgba(251,146,60,0.2)' }}
                            animate={{ left: ['100%', '-4px'], opacity: [0, 0.3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.5 + 0.8 }}
                          />
                        </div>
                      )}
                      <Popover open={openEnginePopover === engine.name} onOpenChange={(open) => setOpenEnginePopover(open ? engine.name : null)}>
                        <PopoverTrigger asChild>
                          <motion.div
                            className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-[44px] sm:min-w-[60px] lg:min-w-[72px] cursor-pointer relative"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                          >
                            <span className={cn("absolute -top-1 -right-0.5 text-[7px] font-bold px-1 py-0 rounded-full z-10", engine.badgeColor)}>
                              {engine.badge}
                            </span>
                            <motion.div
                              className={cn(
                                "h-10 w-10 sm:h-14 sm:w-14 lg:h-[68px] lg:w-[68px] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden border transition-all duration-500",
                                isActive ? "border-amber-400/50" : "border-white/10"
                              )}
                              style={{
                                boxShadow: isActive
                                  ? `0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`
                                  : `0 0 24px ${engine.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                                background: isActive
                                  ? `linear-gradient(135deg, rgba(40,30,10,0.95), rgba(50,35,10,0.98))`
                                  : `linear-gradient(135deg, rgba(20,15,10,0.9), rgba(30,20,10,0.95))`,
                              }}
                              animate={{ 
                                boxShadow: isActive
                                  ? [
                                      `0 0 25px rgba(251,191,36,0.3), 0 0 50px rgba(251,191,36,0.1)`,
                                      `0 0 45px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.25)`,
                                      `0 0 25px rgba(251,191,36,0.3), 0 0 50px rgba(251,191,36,0.1)`,
                                    ]
                                  : [
                                      `0 0 18px ${engine.glowColor.replace('0.3', '0.15').replace('0.25', '0.12')}`,
                                      `0 0 35px ${engine.glowColor}`,
                                      `0 0 18px ${engine.glowColor.replace('0.3', '0.15').replace('0.25', '0.12')}`,
                                    ]
                              }}
                              transition={{ duration: isActive ? 2 : 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                            >
                              <img src={engine.img} alt={engine.name} className="h-7 w-7 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain drop-shadow-lg" />
                            </motion.div>
                            <AnimatePresence>
                              {isActive && (
                                <motion.div
                                  className="absolute -inset-0.5 sm:-inset-1 rounded-xl sm:rounded-2xl border-2 border-amber-400/30 pointer-events-none"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.04, 1] }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                />
                              )}
                            </AnimatePresence>
                            <span className={cn("text-[8px] sm:text-[10px] lg:text-[11px] font-bold tracking-wide leading-tight transition-colors duration-500", isActive ? 'text-amber-300' : engine.textColor)} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{engine.name}</span>
                            <span className={cn("text-[7px] sm:text-[8px] lg:text-[9px] font-medium leading-tight transition-colors duration-500 hidden sm:block", isActive ? 'text-amber-200/70' : 'text-white/55')}>{engine.label}</span>
                          </motion.div>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="center" className="bg-[#0c1120]/95 backdrop-blur-xl border-amber-800/40 text-amber-200 text-xs w-[280px] p-3 z-[9999] relative">
                          <button onClick={() => setOpenEnginePopover(null)} className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <p className="font-bold text-amber-400 text-[13px] mb-1">{engine.name} Engine {isActive && <span className="text-[10px] text-amber-300/70 ml-1">● active</span>}</p>
                          <p className="text-[11px] text-gray-300 leading-relaxed mb-2">{engine.description}</p>
                          <div className="space-y-0.5 mb-3">
                            {engine.capabilities.map((cap: string) => (
                              <p key={cap} className="text-[10px] text-gray-400">{cap}</p>
                            ))}
                          </div>
                          <Button size="sm" onClick={() => { setActiveAiEngine(engine.reportType); setAiEngineModalOpen(true); setOpenEnginePopover(null); }} className="w-full h-7 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Generate Report
                          </Button>
                          <p className="text-[9px] text-amber-600/80 mt-2 border-t border-white/5 pt-1.5">Territory: {engine.territory}</p>
                        </PopoverContent>
                      </Popover>
                    </React.Fragment>
                    );
                  });
                })()}
                {/* ═══ MESSA CONDUCTOR BUTTON ═══ */}
                <div className="relative flex items-center h-10 sm:h-14 lg:h-[68px] shrink-0" style={{ width: 'clamp(16px, 4vw, 56px)' }}>
                  <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(251,146,60,0.15), rgba(251,191,36,0.5), rgba(245,158,11,0.8))' }} />
                  <motion.div className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ width: '10px', background: 'linear-gradient(90deg, transparent, #f59e0b, #ffffff, #f59e0b, transparent)', boxShadow: '0 0 10px rgba(245,158,11,0.6)' }} animate={{ left: ['-10px', 'calc(100% + 10px)'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
                </div>
                <Popover open={openEnginePopover === 'MESSA'} onOpenChange={(open) => setOpenEnginePopover(open ? 'MESSA' : null)}>
                  <PopoverTrigger asChild>
                    <motion.div
                      className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-[48px] sm:min-w-[68px] lg:min-w-[80px] cursor-pointer relative"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    >
                      <span className="absolute -top-1.5 -right-0.5 text-[7px] font-bold px-1 py-0 rounded-full z-10 bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-200 border border-amber-400/30">🎼</span>
                      <motion.div
                        className="h-10 w-10 sm:h-14 sm:w-14 lg:h-[68px] lg:w-[68px] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden border border-amber-400/40"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,146,60,0.2), rgba(234,88,12,0.15))', boxShadow: '0 0 30px rgba(245,158,11,0.3), 0 0 60px rgba(251,146,60,0.15), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                        animate={{ boxShadow: ['0 0 20px rgba(245,158,11,0.2), 0 0 40px rgba(251,146,60,0.1)', '0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(251,146,60,0.25)', '0 0 20px rgba(245,158,11,0.2), 0 0 40px rgba(251,146,60,0.1)'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <span className="text-xl sm:text-2xl lg:text-3xl">🎼</span>
                      </motion.div>
                      <span className="text-[8px] sm:text-[10px] lg:text-[11px] font-bold tracking-wide leading-tight text-amber-300" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>MESSA</span>
                      <span className="text-[7px] sm:text-[8px] lg:text-[9px] font-medium leading-tight text-amber-200/60 hidden sm:block">Synthesis</span>
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="center" className="bg-[#0c1120]/95 backdrop-blur-xl border-amber-500/40 text-amber-200 text-xs w-[300px] p-3 z-[9999] relative">
                    <button onClick={() => setOpenEnginePopover(null)} className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="font-bold text-amber-400 text-[13px] mb-1">🎼 MESSA Conductor</p>
                    <p className="text-[11px] text-gray-300 leading-relaxed mb-2">The Conductor doesn't play an instrument — it orchestrates all 5 engines into one unified verdict. Cross-validates conflicts, detects contradictions, and delivers a single executive report.</p>
                    <div className="space-y-0.5 mb-3">
                      <p className="text-[10px] text-gray-400">🔀 Cross-Engine Conflict Detection</p>
                      <p className="text-[10px] text-gray-400">🏥 Project Health Score (0-100)</p>
                      <p className="text-[10px] text-gray-400">📊 5-Engine Status Matrix</p>
                      <p className="text-[10px] text-gray-400">🎯 Prioritized Action Items</p>
                      <p className="text-[10px] text-gray-400">🔮 Risk Forecast (next 2 weeks)</p>
                    </div>
                    <Button size="sm" onClick={() => { setActiveAiEngine('messa-synthesis' as AIEngineType); setAiEngineModalOpen(true); setOpenEnginePopover(null); }} className="w-full h-7 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generate MESSA Report
                    </Button>
                    <p className="text-[9px] text-amber-600/80 mt-2 border-t border-white/5 pt-1.5">Territory: All 5 Engines → Unified Synthesis</p>
                  </PopoverContent>
                </Popover>
               </div>
               {/* Pipeline Status Bar — cycles every 3s */}
               <div className="flex items-center gap-0 sm:gap-0.5 px-2">
                 {['Visual', 'Core', 'DNA', 'UI', 'Insights'].map((label, i, arr) => {
                   const stepActive = i === activePipelineStep;
                   return (
                   <React.Fragment key={label}>
                     <motion.span
                       className={cn(
                         "text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full transition-all duration-500",
                         stepActive
                           ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-400/40"
                           : "text-white/35 hover:text-white/50"
                       )}
                       animate={stepActive ? { boxShadow: ['0 0 6px rgba(251,191,36,0.15)', '0 0 12px rgba(251,191,36,0.3)', '0 0 6px rgba(251,191,36,0.15)'] } : { boxShadow: '0 0 0px transparent' }}
                       transition={{ duration: 2, repeat: stepActive ? Infinity : 0, ease: 'easeInOut' }}
                     >
                       {stepActive && <span className="text-[7px] mr-0.5">▸</span>}
                       {label}
                     </motion.span>
                     {i < arr.length - 1 && (
                       <span className={cn("text-[8px] mx-0.5 transition-colors duration-500", i === activePipelineStep ? "text-amber-400/60" : "text-white/15")}>→</span>
                     )}
                   </React.Fragment>
                   );
                 })}
               </div>
             </div>
           </div>
        </div>

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
