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

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Citation, CITATION_TYPES } from "@/types/citation";
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

// ============================================
// VISIBILITY TIERS
// ============================================
type VisibilityTier = 'owner' | 'foreman' | 'worker' | 'public';

interface TierConfig {
  key: VisibilityTier;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  canEdit: boolean;
  description: string;
}

const VISIBILITY_TIERS: TierConfig[] = [
  {
    key: 'owner',
    label: 'Owner Only',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    canEdit: true,
    description: 'Financial data, profit margins, sensitive contracts',
  },
  {
    key: 'foreman',
    label: 'Foreman+',
    icon: Users,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    canEdit: true,
    description: 'Team management, scheduling, documents',
  },
  {
    key: 'worker',
    label: 'All Team',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    canEdit: false,
    description: 'Task details, work instructions, weather alerts',
  },
  {
    key: 'public',
    label: 'Public',
    icon: EyeOff,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    canEdit: false,
    description: 'Client-safe project overview',
  },
];

// ============================================
// DOCUMENT CATEGORIES
// ============================================
type DocumentCategory = 'legal' | 'technical' | 'visual' | 'verification';

const DOCUMENT_CATEGORIES: { key: DocumentCategory; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'legal', label: 'Legal', icon: FileCheck, color: 'text-red-600' },
  { key: 'technical', label: 'Technical', icon: FileText, color: 'text-blue-600' },
  { key: 'visual', label: 'Visual', icon: Image, color: 'text-green-600' },
  { key: 'verification', label: 'Verification', icon: Camera, color: 'text-purple-600' },
];

// ============================================
// 8 PANEL DEFINITIONS
// ============================================
interface PanelConfig {
  id: string;
  panelNumber: number;
  title: string;
  titleKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  visibilityTier: VisibilityTier;
  dataKeys: string[];
  description: string;
}

const PANELS: PanelConfig[] = [
  {
    id: 'panel-1-basics',
    panelNumber: 1,
    title: 'Project Basics',
    titleKey: 'stage8.panel1',
    icon: Building2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    visibilityTier: 'public',
    dataKeys: ['PROJECT_NAME', 'LOCATION', 'WORK_TYPE'],
    description: 'Name, address, work type',
  },
  {
    id: 'panel-2-gfa',
    panelNumber: 2,
    title: 'Area & Dimensions',
    titleKey: 'stage8.panel2',
    icon: Ruler,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    visibilityTier: 'foreman',
    dataKeys: ['GFA_LOCK', 'BLUEPRINT_UPLOAD', 'SITE_CONDITION'],
    description: 'GFA, blueprints, site conditions',
  },
  {
    id: 'panel-3-trade',
    panelNumber: 3,
    title: 'Trade & Template',
    titleKey: 'stage8.panel3',
    icon: Hammer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    visibilityTier: 'foreman',
    dataKeys: ['TRADE_SELECTION', 'TEMPLATE_LOCK', 'EXECUTION_MODE'],
    description: 'Trade, template, execution mode',
  },
  {
    id: 'panel-4-team',
    panelNumber: 4,
    title: 'Team Architecture',
    titleKey: 'stage8.panel4',
    icon: Users,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-300 dark:border-teal-700',
    visibilityTier: 'foreman',
    dataKeys: ['TEAM_STRUCTURE', 'TEAM_MEMBER_INVITE', 'TEAM_PERMISSION_SET', 'TEAM_SIZE'],
    description: 'Members, roles, permissions',
  },
  {
    id: 'panel-5-timeline',
    panelNumber: 5,
    title: 'Execution Timeline',
    titleKey: 'stage8.panel5',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    visibilityTier: 'worker',
    dataKeys: ['TIMELINE', 'END_DATE', 'DNA_FINALIZED'],
    description: 'Start/end dates, tasks, phases',
  },
  {
    id: 'panel-6-documents',
    panelNumber: 6,
    title: 'Documents & Contracts',
    titleKey: 'stage8.panel6',
    icon: FolderOpen,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-300 dark:border-sky-700',
    visibilityTier: 'foreman',
    dataKeys: ['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION'],
    description: 'Blueprints, photos, contracts',
  },
  {
    id: 'panel-7-weather',
    panelNumber: 7,
    title: 'Weather & Conditions',
    titleKey: 'stage8.panel7',
    icon: Cloud,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-300 dark:border-sky-700',
    visibilityTier: 'worker',
    dataKeys: ['WEATHER_ALERT', 'SITE_CONDITION'],
    description: 'Weather alerts, site conditions',
  },
  {
    id: 'panel-8-financial',
    panelNumber: 8,
    title: 'Financial Summary',
    titleKey: 'stage8.panel8',
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700',
    visibilityTier: 'owner',
    dataKeys: ['BUDGET', 'MATERIAL', 'DEMOLITION_PRICE'],
    description: 'Budget, costs, profit (Owner only)',
  },
];

// ============================================
// TASK PHASES FOR PANEL 5
// ============================================
const TASK_PHASES = [
  { key: 'demolition', label: 'Demolition', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  { key: 'preparation', label: 'Preparation', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  { key: 'installation', label: 'Installation', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'finishing', label: 'Finishing & QC', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30' },
];

// ============================================
// PROPS
// ============================================
interface Stage8FinalReviewProps {
  projectId: string;
  userId: string;
  userRole: 'owner' | 'foreman' | 'worker' | 'inspector' | 'subcontractor' | 'member';
  onComplete: () => void;
  className?: string;
}

// ============================================
// TASK WITH CHECKLIST INTERFACE
// ============================================
interface TaskWithChecklist {
  id: string;
  title: string;
  status: string;
  priority: string;
  phase: string;
  assigned_to: string;
  due_date: string | null;
  created_at: string | null;
  checklist: { id: string; text: string; done: boolean; photoUrl?: string }[];
}

// ============================================
// DOCUMENT WITH CATEGORY
// ============================================
interface DocumentWithCategory {
  id: string;
  file_name: string;
  file_path: string;
  category: DocumentCategory;
  citationId?: string;
  uploadedAt?: string;
}

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
  const [teamMembers, setTeamMembers] = useState<{id: string; role: string; name: string; userId: string}[]>([]);
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
  
  // UI state
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  const [activeOrbitalPanel, setActiveOrbitalPanel] = useState<string>('panel-1-basics');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [modificationDialog, setModificationDialog] = useState<{ open: boolean; material?: any } | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['demolition', 'preparation', 'installation', 'finishing']));
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<DocumentCategory>('technical');
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isSendingContract, setIsSendingContract] = useState(false);
  
  const [isFinancialLocked, setIsFinancialLocked] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'localStorage' | 'mixed'>('supabase');
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
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
  } | null>(null);
  const [isSendingDocument, setIsSendingDocument] = useState(false);
  
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
  
  // ✓ Invoice Preview Modal State
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState<InvoiceData | null>(null);
  const [invoicePreviewHtml, setInvoicePreviewHtml] = useState<string>('');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  
  // ✓ Project Summary Preview Modal State
  const [showSummaryPreview, setShowSummaryPreview] = useState(false);
  const [summaryPreviewHtml, setSummaryPreviewHtml] = useState<string>('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  
  // ✓ M.E.S.S.A. Synthesis Preview Modal State
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
  const [isSavingMessa, setIsSavingMessa] = useState(false);
  const [isSendingMessa, setIsSendingMessa] = useState(false);
  
  // ✓ Pending Budget Changes - Foreman Modification Loop
  const [showPendingApprovalModal, setShowPendingApprovalModal] = useState(false);
  const pendingApprovalShownRef = useRef(false);
  
  // ✓ Conflict Map Modal
  const [showConflictMap, setShowConflictMap] = useState(false);
  
  // ✓ DNA Report PDF
  const [isGeneratingDnaReport, setIsGeneratingDnaReport] = useState(false);
  
  // ✓ Unread chat messages indicator for Team panel
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const lastSeenChatRef = useRef<string | null>(null);



  const { canGenerateInvoice, canUseAIAnalysis, getUpgradeMessage } = useTierFeatures();
  
  // ✓ Foreman Modification Loop - Pending Budget Changes Hook
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
  } = usePendingBudgetChanges({ projectId, enabled: true });
  
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
  
  // Check user permissions - Owner sees everything, others are blocked from financials
  // ✓ CRITICAL: canEdit is now gated by isEditModeEnabled for Owner
  const canEdit = useMemo(() => {
    const hasPermission = userRole === 'owner' || userRole === 'foreman';
    // Owner must explicitly enable edit mode; Foreman can always edit
    return hasPermission && (userRole === 'foreman' || isEditModeEnabled);
  }, [userRole, isEditModeEnabled]);
  
  // ✓ NEW: Allow all team members to upload task photos (visual verification)
  // Workers, inspectors, subcontractors can upload photos for tasks assigned to them
  const canUploadTaskPhotos = useMemo(() => {
    // Owner and foreman can always upload
    if (userRole === 'owner' || userRole === 'foreman') return true;
    // All team members can upload photos for verification
    return ['worker', 'inspector', 'subcontractor', 'member'].includes(userRole);
  }, [userRole]);
  
  // ✓ FIXED: Task status toggle - simpler logic
  // Owner can ALWAYS toggle tasks (no edit mode required for task completion)
  // Foreman can always toggle, workers can toggle their assigned tasks
  const canToggleTaskStatus = useCallback((taskAssignedTo: string) => {
    // Owner can toggle ANY task - this is the main use case
    if (userRole === 'owner') return true;
    // Foreman can toggle any task
    if (userRole === 'foreman') return true;
    // Workers can toggle tasks assigned to them
    if (['worker', 'inspector', 'subcontractor'].includes(userRole)) {
      return taskAssignedTo === userId;
    }
    return false;
  }, [userRole, userId]);
  
  // CRITICAL: Only Owner can view financial data - Foreman/Subcontractor are blocked
  const canViewFinancials = useMemo(() => {
    // Strictly Owner only - no exceptions
    return userRole === 'owner';
  }, [userRole]);
  
  // Check if Financial Summary is unlocked for navigation
  // ✓ Unlocked for Owner when any financial data exists (dynamic, no hardcoded values)
  const isFinancialSummaryUnlocked = useMemo(() => {
    if (!canViewFinancials) return false;
    // Unlocked when Owner has any financial citations, contracts, or cost data
    const hasFinancialData = citations.some(c => 
      ['DEMOLITION_PRICE', 'TEMPLATE_LOCK'].includes(c.cite_type || '')
    ) || contracts.length > 0;
    return hasFinancialData;
  }, [canViewFinancials, citations, contracts]);
  
  // Determine visibility tier access
  const hasAccessToTier = useCallback((tier: VisibilityTier): boolean => {
    const tierHierarchy: Record<VisibilityTier, number> = {
      'owner': 4,
      'foreman': 3,
      'worker': 2,
      'public': 1,
    };
    
    const roleToTier: Record<string, VisibilityTier> = {
      'owner': 'owner',
      'foreman': 'foreman',
      'worker': 'worker',
      'inspector': 'worker',
      'subcontractor': 'worker',
      'member': 'public',
    };
    
    const userTier = roleToTier[userRole] || 'public';
    return tierHierarchy[userTier] >= tierHierarchy[tier];
  }, [userRole]);
  
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
  
  // Categorize document based on file name - images ALWAYS go to visual
  const categorizeDocument = useCallback((fileName: string): DocumentCategory => {
    const lowerName = fileName.toLowerCase();
    
    // ✓ IMAGES ALWAYS GO TO VISUAL - prioritize this check
    if (lowerName.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|svg)$/i)) {
      return 'visual';
    }
    
    if (lowerName.includes('contract') || lowerName.includes('legal') || lowerName.includes('agreement')) {
      return 'legal';
    }
    if (lowerName.includes('blueprint') || lowerName.includes('plan') || lowerName.includes('drawing') || lowerName.match(/\.pdf$/i)) {
      return 'technical';
    }
    if (lowerName.includes('verification') || lowerName.includes('inspect') || lowerName.includes('qc')) {
      return 'verification';
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
          .select('name, address, status, trade')
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
          .select('verified_facts, material_cost, labor_cost, total_cost')
          .eq('project_id', projectId)
          .maybeSingle();
        
        // Store financial summary for Owner view
        if (summary) {
          setFinancialSummary({
            material_cost: summary.material_cost,
            labor_cost: summary.labor_cost,
            total_cost: summary.total_cost,
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
        
        // ✓ TIMELINE & END_DATE: Keep synthetic recovery as initial fallback only if no user-set citations exist
        const hasTimeline = loadedCitations.some(c => c.cite_type === 'TIMELINE');
        const hasEndDate = loadedCitations.some(c => c.cite_type === 'END_DATE');
        
        if (!hasTimeline || !hasEndDate) {
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
              
              if (!hasTimeline && earliest) {
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
                console.log('[Stage8] ✓ Created synthetic TIMELINE from tasks:', earliest.toISOString());
              }
              
              if (!hasEndDate && latest) {
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
                console.log('[Stage8] ✓ Created synthetic END_DATE from tasks:', latest.toISOString());
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
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', userIds);
            
            const memberData = members
              .filter(m => m.user_id !== userId)
              .map(m => {
                const profile = profiles?.find(p => p.user_id === m.user_id);
                return {
                  id: m.id,
                  userId: m.user_id,
                  role: m.role,
                  name: profile?.full_name || 'Team Member',
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
        
        // 3d. Generate BUDGET citation from financial data if not present
        const hasBudgetCit = loadedCitations.some(c => c.cite_type === 'BUDGET');
        if (!hasBudgetCit && summary && (summary.total_cost ?? 0) > 0) {
          const budgetCitation: Citation = {
            id: `cite_budget_${Date.now()}`,
            cite_type: 'BUDGET' as any,
            question_key: 'total_budget',
            answer: `$${Number(summary.total_cost).toLocaleString()}`,
            value: Number(summary.total_cost),
            timestamp: new Date().toISOString(),
            metadata: {
              material_cost: Number(summary.material_cost || 0),
              labor_cost: Number(summary.labor_cost || 0),
              total_cost: Number(summary.total_cost),
              source: 'project_summaries',
            },
          };
          loadedCitations.push(budgetCitation);
          newTeamCitations.push(budgetCitation); // piggyback on persist block
        }

        // 4. Load tasks and transform to checklist format
        let { data: tasksData } = await supabase
          .from('project_tasks')
          .select('id, title, status, priority, description, assigned_to, due_date, created_at')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        // Auto-generate tasks if none exist (Stage 7 was skipped or failed)
        if (!tasksData || tasksData.length === 0) {
          const timelineCit = loadedCitations.find(c => c.cite_type === 'TIMELINE');
          const endDateCit = loadedCitations.find(c => c.cite_type === 'END_DATE');
          const siteCondCit = loadedCitations.find(c => c.cite_type === 'SITE_CONDITION');
          
          const startStr = (timelineCit?.metadata as any)?.start_date || (summary as any)?.project_start_date;
          const endStr = endDateCit?.value || (endDateCit?.metadata as any)?.end_date || (summary as any)?.project_end_date;
          
          if (startStr && endStr) {
            const startD = new Date(startStr as string);
            const endD = new Date(endStr as string);
            const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
            const hasDemolition = siteCondCit?.value === 'demolition';
            
            const phases = [
              ...(hasDemolition ? [{ id: 'demolition', name: 'Demolition Work', pct: 15, pri: 'critical' }] : []),
              { id: 'preparation', name: 'Preparation Work', pct: 25, pri: 'high' },
              { id: 'installation', name: 'Installation Work', pct: 45, pri: 'medium' },
              { id: 'finishing', name: 'Finishing & QC', pct: 15, pri: 'medium' },
            ];
            const totalPct = phases.reduce((s, p) => s + p.pct, 0);
            
            let curDate = startD;
            const autoTasks: { title: string; description: string; priority: string; due_date: string }[] = [];
            
            for (const phase of phases) {
              const days = Math.max(1, Math.round((phase.pct / totalPct) * totalDays));
              const phaseEnd = new Date(curDate.getTime() + days * 86400000);
              autoTasks.push({
                title: phase.name,
                description: `Phase: ${phase.id}`,
                priority: phase.pri,
                due_date: phaseEnd.toISOString(),
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
              .select('id, title, status, priority, description, assigned_to, due_date, created_at');
            
            if (!insertErr && insertedTasks) {
              tasksData = insertedTasks;
              console.log('[Stage8] Auto-generated', insertedTasks.length, 'tasks');
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
            // Infer phase from priority/title
            let phase = 'installation';
            const titleLower = task.title.toLowerCase();
            if (titleLower.includes('demo') || titleLower.includes('remove') || titleLower.includes('tear')) {
              phase = 'demolition';
            } else if (titleLower.includes('prep') || titleLower.includes('measure') || titleLower.includes('setup')) {
              phase = 'preparation';
            } else if (titleLower.includes('finish') || titleLower.includes('qc') || titleLower.includes('inspect') || titleLower.includes('clean')) {
              phase = 'finishing';
            }
            
            const hasVerificationPhoto = taskPhotoIds.has(task.id);
            
            return {
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              phase,
              assigned_to: task.assigned_to,
              due_date: (task as any).due_date || null,
              created_at: (task as any).created_at || null,
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
          .select('id, file_name, file_path, uploaded_at')
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
              category: citationMatch?.category || categorizeDocument(doc.file_name),
              citationId: citationMatch?.citation.id,
              uploadedAt: doc.uploaded_at,
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
        
        // 7. Load user profile for contractor fields in contracts
        const { data: profile } = await supabase
          .from('bu_profiles')
          .select('company_name, phone, service_area')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profile) {
          // Fetch user email from auth
          const { data: { user } } = await supabase.auth.getUser();
          setUserProfile({
            company_name: profile.company_name,
            phone: profile.phone,
            email: user?.email || null,
            service_area: profile.service_area,
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
  useEffect(() => {
    if (activeOrbitalPanel === 'panel-4-team') {
      setUnreadChatCount(0);
      lastSeenChatRef.current = new Date().toISOString();
    }
    // Scroll canvas content to top
    canvasContentRef.current?.scrollTo({ top: 0 });
    mobileContentRef.current?.scrollTo({ top: 0 });
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
    setEditingField(fieldId);
    setEditValue(currentValue);
  }, [canEdit]);
  
  // Save edited field
  const saveEdit = useCallback(async () => {
    if (!editingField || !editValue) return;
    
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
  
  // ✓ Get public URL for document preview (bucket is now public)
  const getDocumentPreviewUrl = useCallback((filePath: string) => {
    // Use public URL for the now-public bucket
    const { data } = supabase.storage
      .from('project-documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
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
        // Fallback to public URL
        const { data: publicData } = supabase.storage
          .from('project-documents')
          .getPublicUrl(filePath);
        return publicData.publicUrl;
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
  
  // Update task checklist item — persists status changes to DB
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
      } catch (err) {
        console.error('[Stage8] Failed to update task status:', err);
        toast.error('Failed to save task status');
      }
    }
  }, []);
  
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
    if (!files || files.length === 0 || !canEdit) return;
    
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
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
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
      // Contractor fields - will be populated from bu_profiles
      contractorName: userProfile?.company_name || '',
      contractorPhone: userProfile?.phone || '',
      contractorEmail: userProfile?.email || '',
      contractorAddress: userProfile?.service_area || '',
    };
  }, [citations, projectData, teamMembers.length, tasks.length, projectId, userProfile]);
  
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
          tier: 'messa', // Use top models
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
        const html = buildMessaSynthesisHTML(data);
        
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
  
  // Build M.E.S.S.A. Audit Report HTML - Professional Light Theme
  const buildMessaSynthesisHTML = useCallback((data: any) => {
    const gemini = data.engines?.gemini?.analysis || {};
    const openai = data.engines?.openai?.analysis || {};
    const snapshot = data.projectSnapshot || {};
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const shortDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
    
    // Calculate data sources count and operational readiness
    const dataSources = data.citationCount || 0;
    const verifiedSources = Math.min(dataSources, Math.floor(dataSources * ((gemini.healthScore || 50) / 100)));
    const operationalReadiness = gemini.healthScore || 38;
    const healthGrade = gemini.healthGrade || (operationalReadiness >= 80 ? 'COMPLETE' : operationalReadiness >= 50 ? 'PARTIAL' : 'INCOMPLETE');
    const auditVerdict = operationalReadiness >= 70 ? 'PASS' : 'FAIL';
    const riskClass = openai?.riskLevel || (operationalReadiness >= 70 ? 'LOW' : operationalReadiness >= 40 ? 'MEDIUM' : 'CRITICAL');
    
    // Build workflow status matrix
    const workflowItems = [
      { source: 'Tasks', status: snapshot.taskProgress?.total > 0 ? 'Active' : 'Missing', updated: currentDate, notes: `${snapshot.taskProgress?.completed || 0}/${snapshot.taskProgress?.total || 0} tasks; ${snapshot.taskProgress?.percent || 0}% complete` },
      { source: 'Documents', status: snapshot.documents > 0 ? 'Available' : 'Missing', updated: snapshot.documents > 0 ? currentDate : 'N/A', notes: `${snapshot.documents || 0} files uploaded` },
      { source: 'Contracts', status: snapshot.contracts ? 'Active' : 'Missing', updated: snapshot.contracts ? currentDate : 'N/A', notes: snapshot.contracts ? 'Contract generated' : 'No contracts; legal risk maximum' },
      { source: 'Team', status: snapshot.teamSize > 1 ? 'Active' : 'Partial', updated: currentDate, notes: `${snapshot.teamSize || 1} member(s) assigned` },
      { source: 'Timeline', status: snapshot.timeline?.startDate ? 'Set' : 'Missing', updated: currentDate, notes: snapshot.timeline?.startDate ? `${snapshot.timeline.startDate} - ${snapshot.timeline.endDate || 'TBD'}` : 'Dates not configured' },
      { source: 'Budget', status: snapshot.budget?.total > 0 ? 'Set' : 'Missing', updated: currentDate, notes: `$${(snapshot.budget?.total || 0).toLocaleString()} CAD total` },
      { source: 'Site Map', status: snapshot.address ? 'Available' : 'Missing', updated: currentDate, notes: snapshot.address || 'Location not set' },
    ];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #ffffff; 
      color: #1f2937; 
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    
    /* ✓ PAGINATION CONTROL: Prevent mid-block page breaks */
    .section, .pillar-section, table, .summary-table, .pillars-grid, 
    .rec-list, .conclusion-box, .audit-header {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      .section { break-inside: avoid; page-break-inside: avoid; }
      table { break-inside: avoid; page-break-inside: avoid; }
    }
    
    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px 32px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-date {
      font-size: 12px;
      color: #6b7280;
    }
    .header-right {
      text-align: right;
    }
    .project-title {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
    }
    .project-location {
      font-size: 12px;
      color: #6b7280;
    }
    .data-sources {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: #f3f4f6;
      border-radius: 12px;
      font-size: 11px;
      color: #4b5563;
    }
    
    /* Main Content */
    .content {
      padding: 24px 32px;
      max-width: 900px;
    }
    
    /* Audit Header */
    .audit-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #1f2937;
    }
    .audit-icon { font-size: 24px; margin-bottom: 8px; }
    .audit-title {
      font-size: 20px;
      font-weight: 800;
      color: #1f2937;
      letter-spacing: 1px;
    }
    .audit-meta {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
    }
    .classification {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 16px;
      background: ${healthGrade === 'COMPLETE' ? '#dcfce7' : healthGrade === 'PARTIAL' ? '#fef3c7' : '#fee2e2'};
      color: ${healthGrade === 'COMPLETE' ? '#166534' : healthGrade === 'PARTIAL' ? '#92400e' : '#991b1b'};
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 1px;
    }
    
    /* Section Headers */
    .section-header {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
      margin: 28px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .section-number {
      color: #6b7280;
      font-weight: 400;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border: 1px solid #e5e7eb;
      font-size: 12px;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    td { color: #4b5563; }
    
    .status-available, .status-set, .status-active { color: #166534; font-weight: 600; }
    .status-partial { color: #92400e; font-weight: 600; }
    .status-missing { color: #991b1b; font-weight: 600; }
    
    /* Summary Table */
    .summary-table td:first-child { font-weight: 500; color: #374151; width: 40%; }
    .summary-table td:last-child { font-weight: 600; }
    
    /* Pillar Boxes */
    .pillars-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .pillar-section {
      margin-bottom: 16px;
    }
    .pillar-title {
      font-size: 12px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pillar-icon { font-size: 14px; }
    .pillar-list {
      list-style: none;
      padding-left: 24px;
    }
    .pillar-list li {
      padding: 6px 0;
      font-size: 12px;
      color: #4b5563;
      border-bottom: 1px solid #f3f4f6;
    }
    .pillar-list li:last-child { border-bottom: none; }
    .pillar-list strong { color: #1f2937; }
    
    /* Risk Matrix */
    .risk-matrix th:first-child { width: 25%; }
    .risk-matrix .severity-critical { color: #dc2626; font-weight: 700; }
    .risk-matrix .severity-high { color: #ea580c; font-weight: 700; }
    .risk-matrix .severity-medium { color: #ca8a04; font-weight: 700; }
    .risk-matrix .severity-low { color: #16a34a; font-weight: 700; }
    
    /* Recommendations */
    .rec-list {
      list-style: none;
    }
    .rec-list li {
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      gap: 12px;
    }
    .rec-list li:last-child { border-bottom: none; }
    .rec-number {
      width: 24px;
      height: 24px;
      background: #1f2937;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .rec-text { font-size: 12px; color: #374151; line-height: 1.6; }
    
    /* Conclusion */
    .conclusion-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
    }
    .verdict {
      font-size: 18px;
      font-weight: 800;
      color: ${auditVerdict === 'PASS' ? '#166534' : '#991b1b'};
      margin-bottom: 8px;
    }
    .confidence {
      font-size: 13px;
      color: #6b7280;
    }
    
    /* Footer */
    .footer {
      margin-top: 32px;
      padding: 16px 32px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #9ca3af;
    }
    .footer-brand {
      font-weight: 700;
      color: #f59e0b;
    }
    .synthesis-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #1f2937;
      color: #e5e7eb;
      border-radius: 4px;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <!-- Page Header -->
  <div class="page-header">
    <div class="header-left">
      <div class="header-date">${shortDate}</div>
    </div>
    <div class="header-right">
      <div class="project-title">🏗️ ${snapshot.name || 'Project'}</div>
      <div class="project-location">${snapshot.address?.split(',')[0] || 'Location'}</div>
      <div class="data-sources">Generated: ${currentDate} • Data Sources: ${dataSources}</div>
    </div>
  </div>
  
  <div class="content">
    <!-- Audit Report Header -->
    <div class="audit-header">
      <div class="audit-icon">🔬</div>
      <div class="audit-title">M.E.S.S.A. AUDIT REPORT</div>
      <div class="audit-meta">
        Project: ${snapshot.name || 'N/A'}<br/>
        Audit Date: ${currentDate} (Current Real-Time Audit)<br/>
        <span class="classification">Classification: ${healthGrade}</span>
      </div>
    </div>
    
    <!-- 1. EXECUTIVE AUDIT SUMMARY -->
    <div class="section-header"><span class="section-number">1.</span> EXECUTIVE AUDIT SUMMARY</div>
    <table class="summary-table">
      <tr><td>Data Completeness</td><td>${verifiedSources}/${dataSources} sources verified</td></tr>
      <tr><td>Operational Readiness</td><td>${operationalReadiness}%</td></tr>
      <tr><td>Risk Classification</td><td>${riskClass}</td></tr>
      <tr><td>Audit Verdict</td><td>${auditVerdict}</td></tr>
    </table>
    <p style="font-size: 12px; color: #4b5563; line-height: 1.7; margin-bottom: 20px;">
      <strong>Summary Statement:</strong><br/>
      ${gemini.executiveSummary || `Project "${snapshot.name}" is currently in a ${healthGrade.toLowerCase()} state. ${operationalReadiness < 50 ? 'Critical data gaps identified in financial and documentation areas require immediate attention.' : 'Core project parameters established with minor gaps to address.'}`}
    </p>
    
    <!-- 2. OPERATIONAL TRUTH VERIFICATION -->
    <div class="section-header"><span class="section-number">2.</span> OPERATIONAL TRUTH VERIFICATION (8 Pillars)</div>
    
    <div class="pillar-section">
      <div class="pillar-title"><span class="pillar-icon">✅</span> Confirmed Data Points</div>
      <ul class="pillar-list">
        <li><strong>Pillar 1:</strong> Confirmed Area: ${(snapshot.gfa || 0).toLocaleString()} sq ft ${snapshot.gfa ? '(Verified via Citation)' : '(Not set)'}</li>
        <li><strong>Pillar 2:</strong> Materials Count: ${gemini.verificationStatus?.documentsReviewed || 0} items verified</li>
        <li><strong>Pillar 6:</strong> Project Mode: ${snapshot.teamSize > 1 ? 'TEAM' : 'SOLO'} (${snapshot.teamSize} member${snapshot.teamSize > 1 ? 's' : ''})</li>
        <li><strong>Pillar 7:</strong> Project Size: ${snapshot.gfa >= 1000 ? 'LARGE' : snapshot.gfa >= 500 ? 'MEDIUM' : 'SMALL'} (AI Classification based on ${(snapshot.gfa || 0).toLocaleString()} sq ft scope)</li>
      </ul>
    </div>
    
    <div class="pillar-section">
      <div class="pillar-title"><span class="pillar-icon">⚠️</span> Pending Verification</div>
      <ul class="pillar-list">
        <li><strong>Pillar 8:</strong> AI Confidence: Reported as "${gemini.healthScore >= 70 ? 'High' : gemini.healthScore >= 40 ? 'Medium' : 'Low'}," ${gemini.verificationStatus?.completeness || 0}% verification on performance benchmarks</li>
      </ul>
    </div>
    
    <div class="pillar-section">
      <div class="pillar-title"><span class="pillar-icon">❌</span> Missing/Conflicting Data</div>
      <ul class="pillar-list">
        ${(gemini.verificationStatus?.gapsIdentified || ['Blueprint documentation incomplete', 'OBC compliance pending', 'Conflict detection requires review']).map((gap: string) => `<li>${gap}</li>`).join('')}
      </ul>
    </div>
    
    <!-- 3. WORKFLOW STATUS MATRIX -->
    <div class="section-header"><span class="section-number">3.</span> WORKFLOW STATUS MATRIX</div>
    <table>
      <thead>
        <tr>
          <th>Data Source</th>
          <th>Status</th>
          <th>Last Updated</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${workflowItems.map(item => `
          <tr>
            <td>${item.source}</td>
            <td class="status-${item.status.toLowerCase()}">${item.status}</td>
            <td>${item.updated}</td>
            <td>${item.notes}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- 4. STRUCTURAL ANALYSIS -->
    <div class="section-header"><span class="section-number">4.</span> STRUCTURAL ANALYSIS</div>
    <p style="font-size: 12px; color: #374151; margin-bottom: 12px;"><strong>4.1 Area & Material Assessment</strong></p>
    <ul class="pillar-list" style="padding-left: 0; margin-bottom: 16px;">
      <li>Confirmed Area: ${(snapshot.gfa || 0).toLocaleString()} sq ft (${snapshot.gfa ? 'High' : 'Low'} Confidence)</li>
      <li>Material Budget: $${(snapshot.budget?.materials || 0).toLocaleString()} CAD</li>
      <li>Labor Budget: $${(snapshot.budget?.labor || 0).toLocaleString()} CAD</li>
      <li>Cost per sq ft: $${snapshot.budget?.perSqFt?.toFixed(2) || '0.00'} CAD</li>
    </ul>
    
    ${data.dualEngineUsed && openai ? `
    <!-- 5. REGULATORY ALIGNMENT -->
    <div class="section-header"><span class="section-number">5.</span> REGULATORY ALIGNMENT (${data.region?.toUpperCase() || 'Ontario'} Building Code)</div>
    <table>
      <tr><td style="width: 30%;"><strong>OBC Status</strong></td><td>${openai.codeCompliance?.structural?.status || 'REQUIRES REVIEW'}</td></tr>
      <tr><td><strong>Risk Level</strong></td><td>${openai.riskLevel || 'MEDIUM'}</td></tr>
      <tr><td><strong>Compliance Score</strong></td><td>${openai.complianceScore || '—'}%</td></tr>
    </table>
    
    ${openai.codeCompliance ? `
    <p style="font-size: 12px; color: #374151; margin: 16px 0 8px 0;"><strong>Compliance Notes:</strong></p>
    <ul class="pillar-list" style="padding-left: 16px;">
      <li><strong>Structural:</strong> ${openai.codeCompliance.structural?.notes || 'Review required'}</li>
      <li><strong>Fire Safety:</strong> ${openai.codeCompliance.fireSafety?.notes || 'Review required'}</li>
      <li><strong>Accessibility:</strong> ${openai.codeCompliance.accessibility?.notes || 'Review required'}</li>
    </ul>
    ` : ''}
    ` : ''}
    
    <!-- 6. CONFLICT DETECTION LOG -->
    <div class="section-header"><span class="section-number">6.</span> CONFLICT DETECTION LOG</div>
    <p style="font-size: 12px; color: #374151; margin-bottom: 12px;"><strong>Data Consistency Check:</strong></p>
    <ul class="pillar-list" style="padding-left: 0;">
      ${(gemini.progressAnalysis?.criticalItems || [
        snapshot.budget?.total === 0 ? 'FINANCIAL CONFLICT: Budget set to $0.00 CAD' : null,
        snapshot.teamSize === 1 ? 'RESOURCE CONFLICT: Only 1 team member assigned' : null,
        !snapshot.timeline?.startDate ? 'TIMELINE CONFLICT: Project dates not configured' : null,
      ]).filter(Boolean).map((item: string, i: number) => `<li><strong>${i + 1}.</strong> ${item}</li>`).join('') || '<li>No critical conflicts detected</li>'}
    </ul>
    
    <!-- 7. RISK ASSESSMENT MATRIX -->
    <div class="section-header"><span class="section-number">7.</span> RISK ASSESSMENT MATRIX</div>
    <table class="risk-matrix">
      <thead>
        <tr>
          <th>Risk Factor</th>
          <th>Severity</th>
          <th>Impact</th>
          <th>Mitigation</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Budget Accuracy</td>
          <td class="${snapshot.budget?.total > 0 ? 'severity-low' : 'severity-critical'}">${snapshot.budget?.total > 0 ? 'LOW' : 'CRITICAL'}</td>
          <td>${snapshot.budget?.total > 0 ? 'Budget established' : 'Project insolvency risk'}</td>
          <td>${snapshot.budget?.total > 0 ? 'Monitor spending' : 'Populate line-item costs'}</td>
        </tr>
        <tr>
          <td>Legal Liability</td>
          <td class="${snapshot.contracts ? 'severity-low' : 'severity-high'}">${snapshot.contracts ? 'LOW' : 'HIGH'}</td>
          <td>${snapshot.contracts ? 'Contract active' : 'No signed contract'}</td>
          <td>${snapshot.contracts ? 'Maintain documentation' : 'Generate and sign contract'}</td>
        </tr>
        <tr>
          <td>Schedule Adherence</td>
          <td class="${snapshot.timeline?.startDate ? 'severity-medium' : 'severity-high'}">${snapshot.timeline?.startDate ? 'MEDIUM' : 'HIGH'}</td>
          <td>${snapshot.timeline?.startDate ? 'Timeline configured' : 'No dates set'}</td>
          <td>${snapshot.timeline?.startDate ? 'Monitor milestones' : 'Set project timeline'}</td>
        </tr>
      </tbody>
    </table>
    
    <!-- 8. ACTIONABLE RECOMMENDATIONS -->
    <div class="section-header"><span class="section-number">8.</span> ACTIONABLE RECOMMENDATIONS</div>
    <ol class="rec-list">
      ${(gemini.recommendations || [
        'Complete project documentation and upload all relevant files',
        'Configure team structure and assign roles',
        'Set project timeline with start and end dates',
        'Generate and send client contract for signature',
        'Review and confirm material/labor budgets',
      ]).slice(0, 5).map((rec: string, i: number) => `
        <li>
          <span class="rec-number">${i + 1}</span>
          <span class="rec-text">${rec}</span>
        </li>
      `).join('')}
    </ol>
    
    <!-- AUDIT CONCLUSION -->
    <div class="section-header"><span class="section-number">9.</span> AUDIT CONCLUSION</div>
    <div class="conclusion-box">
      <div class="verdict">Final Verdict: ${auditVerdict} / ${healthGrade}</div>
      <div class="confidence">Confidence Level: ${operationalReadiness}% (Based on ${verifiedSources} verified data sources)</div>
      <div class="confidence" style="margin-top: 8px;">Next Audit Recommended: Upon completion of missing data entries or at 50% task completion</div>
    </div>
    
    <p style="text-align: center; font-size: 11px; color: #6b7280; margin-top: 24px;">
      <strong>M.E.S.S.A. Audit Report</strong> generated by BuildUnion AI Engine<br/>
      Report Classification: Engineering-Grade Project Intelligence
    </p>
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <div>
      <span class="footer-brand">M.E.S.S.A.</span> • ${data.synthesisVersion || 'v3.0'}
    </div>
    <div class="synthesis-badge">
      ${data.dualEngineUsed ? '⚡ Dual Engine' : 'Single Engine'} • ${data.synthesisId?.slice(0, 12) || 'MESSA'}
    </div>
    <div>
      Generated with BuildUnion AI • ${currentDate}
    </div>
  </div>
</body>
</html>`;
  }, []);
  
  // Legacy AI Analysis handler (for backwards compatibility)
  const handleAIAnalysis = handleMessaSynthesis;
  
  // ============================================
  // MESSA DNA REPORT PDF GENERATION
  // ============================================
  const handleDnaReportPdf = useCallback(async () => {
    setIsGeneratingDnaReport(true);
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
      const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
      const dnaCit = citations.find(c => c.cite_type === 'DNA_FINALIZED');
      const photoCit = citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
      const demoPriceCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
      const budgetCit = citations.find(c => c.cite_type === 'BUDGET');
      const allTeamInviteCits = citations.filter(c => c.cite_type === 'TEAM_MEMBER_INVITE');

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
        { label: '6 — Documents & Visual', sub: 'AI Vision × Trade Sync', icon: '👁️', color: '#0ea5e9', status: !!photoCit || !!blueprintCit, sources: [
          { label: 'Site Photo / Visual', cit: photoCit, field: photoCit?.cite_type || 'SITE_PHOTO' },
          { label: 'Blueprint', cit: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
        ]},
        { label: '7 — Weather & Conditions', sub: 'Alerts × Site Readiness', icon: '🌦️', color: '#06b6d4', status: !!weatherCit || !!siteCondCit, sources: [
          { label: 'Weather Alert', cit: weatherCit, field: 'WEATHER_ALERT' },
          { label: 'Site Condition', cit: siteCondCit, field: 'SITE_CONDITION' },
        ]},
        { label: '8 — Financial Summary', sub: 'Sync + Tax (HST/GST)', icon: '💰', color: '#ef4444', status: (financialSummary?.total_cost ?? 0) > 0 && !!locationCit, sources: [
          { label: 'Location (Tax Region)', cit: locationCit, field: 'LOCATION' },
          { label: 'Demolition Price', cit: demoPriceCit, field: 'DEMOLITION_PRICE' },
          { label: 'Total Budget', cit: budgetCit, field: 'BUDGET' },
        ]},
      ];

      const passCount = pillars.filter(p => p.status).length;
      const pct = Math.round((passCount / 8) * 100);
      const scoreColor = passCount === 8 ? '#10b981' : passCount >= 5 ? '#f59e0b' : '#ef4444';
      const nowStr = new Date().toISOString();
      const projName = projectData?.name || 'Project';
      const projAddr = projectData?.address || '';
      const scoreLabel = passCount === 8 ? 'PERFECT' : passCount >= 5 ? 'PARTIAL' : 'CRITICAL';

      const buildSourceRow = (s: { label: string; cit: Citation | undefined; field: string }) => {
        const val = s.cit?.answer || (s.cit?.metadata as any)?.value || '—';
        const ts = s.cit?.timestamp ? new Date(s.cit.timestamp).toLocaleDateString() : '—';
        const citeId = s.cit?.id?.slice(0, 8) || '—';
        const statusColor = s.cit ? '#059669' : '#dc2626';
        const statusText = s.cit ? '✓ cite:' + citeId : '✗ Missing';
        const displayVal = typeof val === 'string' ? val.slice(0, 60) : JSON.stringify(val).slice(0, 60);
        return '<tr style="font-size:11px;border-bottom:1px solid #f0f0f0;">' +
          '<td style="padding:5px 8px;color:#6b7280;">' + s.label + '</td>' +
          '<td style="padding:5px 8px;font-family:monospace;font-size:10px;color:' + statusColor + ';">' + statusText + '</td>' +
          '<td style="padding:5px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + displayVal + '</td>' +
          '<td style="padding:5px 8px;color:#9ca3af;font-size:10px;">' + ts + '</td>' +
          '</tr>';
      };

      const pillarRows = pillars.map(p => {
        const sourcesHtml = p.sources.map(buildSourceRow).join('');
        const bgHex = p.color + '15';
        const borderHex = p.color + '30';
        const statusBg = p.status ? '#dcfce7' : '#fef2f2';
        const statusTxt = p.status ? '#166534' : '#991b1b';
        const statusLabel = p.status ? '✓ PASS' : '✗ FAIL';
        return '<div class="pdf-section" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;overflow:hidden;break-inside:avoid;">' +
          '<div style="background:' + bgHex + ';padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid ' + borderHex + ';">' +
            '<span style="font-size:20px;">' + p.icon + '</span>' +
            '<div style="flex:1;">' +
              '<div style="font-weight:600;font-size:14px;color:#1f2937;">' + p.label + '</div>' +
              '<div style="font-size:11px;color:#6b7280;">' + p.sub + '</div>' +
            '</div>' +
            '<span style="background:' + statusBg + ';color:' + statusTxt + ';padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">' + statusLabel + '</span>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:#f9fafb;font-size:10px;text-transform:uppercase;color:#9ca3af;letter-spacing:0.05em;">' +
              '<th style="padding:6px 8px;text-align:left;">Source</th>' +
              '<th style="padding:6px 8px;text-align:left;">Citation</th>' +
              '<th style="padding:6px 8px;text-align:left;">Value</th>' +
              '<th style="padding:6px 8px;text-align:left;">Date</th>' +
            '</tr></thead>' +
            '<tbody>' + sourcesHtml + '</tbody>' +
          '</table>' +
        '</div>';
      }).join('');

      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Segoe UI", system-ui, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }' +
        '.pdf-section { break-inside: avoid; }' +
        '</style></head><body>' +
        '<div style="text-align:center;margin-bottom:32px;">' +
          '<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:6px;">M.E.S.S.A. DNA Deep Audit</div>' +
          '<div style="font-size:22px;font-weight:700;color:#064e3b;">' + projName + '</div>' +
          '<div style="font-size:12px;color:#9ca3af;margin-top:4px;">Generated: ' + new Date().toLocaleString() + ' · ' + projAddr + '</div>' +
        '</div>' +
        '<div class="pdf-section" style="background:linear-gradient(135deg,#064e3b,#065f46);color:white;border-radius:12px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;gap:16px;">' +
          '<div style="font-size:36px;font-weight:800;font-family:monospace;">' + passCount + '/8</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:6px;">DNA Integrity Score — ' + pct + '%</div>' +
            '<div style="height:10px;background:rgba(255,255,255,0.2);border-radius:999px;overflow:hidden;">' +
              '<div style="height:100%;width:' + pct + '%;background:' + scoreColor + ';border-radius:999px;"></div>' +
            '</div>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">' + scoreLabel + '</div>' +
        '</div>' +
        pillarRows +
        '<div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;">' +
          'BuildUnion · M.E.S.S.A. DNA Deep Audit Report v1.0 · ' + nowStr +
        '</div>' +
      '</body></html>';

      const { downloadPDF } = await import('@/lib/pdfGenerator');
      await downloadPDF(html, {
        filename: 'dna-audit-' + (projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export') + '.pdf',
        pageFormat: 'letter',
      });

      toast.success('DNA Audit Report downloaded');
    } catch (err) {
      console.error('[DNA Report] Error:', err);
      toast.error('Failed to generate DNA report');
    } finally {
      setIsGeneratingDnaReport(false);
    }
  }, [citations, projectData, financialSummary, teamMembers]);
  
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
        
        toast.success('Invoice ready for preview', { id: 'invoice-gen' });
      }
    } catch (err) {
      console.error('[Stage8] Invoice generation failed:', err);
      toast.error('Failed to generate invoice', { id: 'invoice-gen' });
    } finally {
      setIsGeneratingInvoice(false);
    }
  }, [projectId, projectData]);
  
  // Download invoice PDF
  const handleDownloadInvoice = useCallback(async () => {
    if (!invoicePreviewData) return;
    
    try {
      const { generateInvoicePDF } = await import('@/lib/invoiceGenerator');
      const blob = await generateInvoicePDF(invoicePreviewData);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoicePreviewData.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded!');
    } catch (err) {
      console.error('[Stage8] Invoice download failed:', err);
      toast.error('Failed to download invoice');
    }
  }, [invoicePreviewData]);
  
  // Save invoice to project documents
  const handleSaveInvoiceToDocuments = useCallback(async () => {
    if (!invoicePreviewData || !projectId || !userId) return;
    
    setIsSavingInvoice(true);
    try {
      const { generateInvoicePDF } = await import('@/lib/invoiceGenerator');
      const blob = await generateInvoicePDF(invoicePreviewData);
      
      const fileName = `invoice-${invoicePreviewData.invoiceNumber}.pdf`;
      const filePath = `${projectId}/${Date.now()}-${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, blob, { contentType: 'application/pdf' });
      
      if (uploadError) throw uploadError;
      
      // Save to database
      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          file_name: fileName,
          file_path: filePath,
          file_size: blob.size,
        });
      
      if (dbError) throw dbError;
      
      // Reload documents
      const { data: newDocs } = await supabase
        .from('project_documents')
        .select('id, file_name, file_path, file_size, uploaded_at')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });
      
      if (newDocs) {
        setDocuments(newDocs.map(doc => ({
          ...doc,
          category: categorizeDocument(doc.file_name),
        })));
      }
      
      toast.success('Invoice saved to Documents!', { description: 'Find it in Panel 6' });
      setShowInvoicePreview(false);
    } catch (err) {
      console.error('[Stage8] Save invoice failed:', err);
      toast.error('Failed to save invoice');
    } finally {
      setIsSavingInvoice(false);
    }
  }, [invoicePreviewData, projectId, userId, categorizeDocument]);
  
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
      const workType = workTypeCitation?.answer || projectData?.trade || 'Not set';
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
            tier: 'messa',
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
          id: 7, name: 'Weather & Conditions', icon: '🌤️', color: '#0ea5e9',
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
      const shortDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
      
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
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              background: #ffffff; 
              color: #1f2937; 
              padding: 0;
              font-size: 12px;
              line-height: 1.5;
            }
            
            /* ✓ PAGINATION CONTROL: Prevent content breaks mid-block */
            .section, .hero-card, .phase-card, .checkpoint-list, table, .weather-grid, 
            .alert-box, .recommendations, .stats-row, .stat-box, .conclusion-box, .pillar-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            @media print {
              .section { break-inside: avoid; page-break-inside: avoid; }
              table { break-inside: avoid; page-break-inside: avoid; }
              .summary-hero { break-inside: avoid; }
              .pillar-card { break-inside: avoid; page-break-inside: avoid; }
            }
            
            .page-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 20px 28px;
              border-bottom: 2px solid #1f2937;
              background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .brand { font-size: 22px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px; }
            .header-date { font-size: 11px; color: #6b7280; }
            .header-right { text-align: right; }
            .doc-type { 
              display: inline-block;
              padding: 6px 16px;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              border-radius: 4px;
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 1px;
            }
            .project-title { font-size: 16px; font-weight: 700; color: #1f2937; margin-top: 8px; }
            .project-location { font-size: 11px; color: #6b7280; }
            
            .content { padding: 20px 28px; }
            
            .summary-hero {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
              break-inside: avoid;
            }
            .hero-card {
              background: linear-gradient(135deg, #f8fafc, #f1f5f9);
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 16px 12px;
              text-align: center;
              break-inside: avoid;
            }
            /* ✓ REFINED TYPOGRAPHY: Elegant, not overwhelming */
            .hero-value { 
              font-size: 24px; 
              font-weight: 600; 
              color: #3b82f6;
              letter-spacing: -0.5px;
            }
            .hero-value.green { color: #059669; }
            .hero-value.amber { color: #d97706; }
            .hero-value.red { color: #dc2626; }
            .hero-label { font-size: 10px; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.75px; font-weight: 500; }
            
            .readiness-bar {
              background: #e5e7eb;
              height: 12px;
              border-radius: 6px;
              overflow: hidden;
              margin: 16px 0;
            }
            .readiness-fill {
              height: 100%;
              background: linear-gradient(90deg, ${operationalReadiness >= 85 ? '#22c55e, #16a34a' : operationalReadiness >= 60 ? '#f59e0b, #d97706' : '#ef4444, #dc2626'});
              width: ${operationalReadiness}%;
              transition: width 0.3s;
            }
            .readiness-label {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #6b7280;
            }
            .readiness-grade {
              display: inline-block;
              padding: 4px 12px;
              background: ${readinessGrade === 'OPERATIONAL' ? '#dcfce7' : readinessGrade === 'PARTIAL' ? '#fef3c7' : '#fee2e2'};
              color: ${readinessGrade === 'OPERATIONAL' ? '#166534' : readinessGrade === 'PARTIAL' ? '#92400e' : '#991b1b'};
              border-radius: 4px;
              font-weight: 700;
              font-size: 10px;
              letter-spacing: 1px;
            }
            
            .section { margin-bottom: 20px; }
            .section-header {
              font-size: 13px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 10px;
              padding-bottom: 6px;
              border-bottom: 1px solid #e5e7eb;
            }
            .section-number { color: #6b7280; font-weight: 400; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { padding: 8px 10px; text-align: left; border: 1px solid #e5e7eb; font-size: 11px; }
            th { background: #f9fafb; font-weight: 600; color: #374151; }
            td { color: #4b5563; }
            
            .status-pass { color: #166534; background: #dcfce7; font-weight: 600; }
            .status-fail { color: #991b1b; background: #fee2e2; font-weight: 600; }
            .status-review { color: #92400e; background: #fef3c7; font-weight: 600; }
            .status-pending { color: #6b7280; font-style: italic; padding: 12px; background: #f3f4f6; border-radius: 6px; }
            .status-good { color: #166534; padding: 12px; background: #dcfce7; border-radius: 6px; margin-top: 8px; }
            
            .phase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
            .phase-card { 
              background: #f8fafc; 
              border: 1px solid #e5e7eb; 
              border-radius: 6px; 
              padding: 12px; 
            }
            .phase-name { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 6px; }
            .phase-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
            .phase-fill { height: 100%; background: #3b82f6; }
            .phase-percent { font-size: 10px; color: #6b7280; margin-top: 4px; text-align: right; }
            
            /* ✓ CHECKPOINTS: Refined grid with break-inside: avoid */
            .checkpoint-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; break-inside: avoid; }
            .checkpoint { 
              display: flex; 
              align-items: center; 
              gap: 8px; 
              padding: 10px 12px; 
              background: linear-gradient(135deg, #fafafa, #f4f4f5); 
              border: 1px solid #e4e4e7; 
              border-radius: 6px;
              font-size: 11px;
              break-inside: avoid;
            }
            .checkpoint.done { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-color: #86efac; }
            .checkpoint-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
            .checkpoint.done .checkpoint-icon { background: #22c55e; color: white; }
            .checkpoint:not(.done) .checkpoint-icon { background: #d4d4d8; color: #a1a1aa; }
            .checkpoint-priority { margin-left: auto; font-size: 9px; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
            .checkpoint-priority.Critical { background: #fecaca; color: #b91c1c; }
            .checkpoint-priority.Required { background: #bfdbfe; color: #1e40af; }
            .checkpoint-priority.Important { background: #fde68a; color: #92400e; }
            .checkpoint-priority.Optional { background: #e4e4e7; color: #52525b; }
            
            .weather-grid { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; }
            .weather-current { text-align: center; padding: 12px 20px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; border-radius: 8px; }
            .weather-temp { font-size: 28px; font-weight: 700; }
            .weather-desc { font-size: 11px; opacity: 0.9; }
            .weather-details { font-size: 10px; margin-top: 6px; display: flex; gap: 12px; justify-content: center; }
            .forecast-mini { display: flex; gap: 8px; flex: 1; }
            .forecast-day { text-align: center; padding: 8px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; flex: 1; }
            .forecast-date { font-size: 10px; color: #6b7280; }
            .forecast-temps { font-size: 11px; font-weight: 600; color: #1f2937; }
            .forecast-alert { font-size: 10px; color: #dc2626; }
            
            /* ✓ WEATHER ALERTS: Discrete but visible highlighting */
            .alert-box { padding: 14px 16px; border-radius: 8px; margin-top: 12px; break-inside: avoid; }
            .alert-box.warning { 
              background: linear-gradient(135deg, #fffbeb, #fef3c7); 
              border: 1px solid #fcd34d; 
              border-left: 4px solid #f59e0b;
              color: #92400e; 
            }
            .alert-box.warning strong { color: #b45309; }
            .alert-box.warning div { margin-top: 6px; padding-left: 20px; position: relative; }
            .alert-box.warning div::before { content: '⚠'; position: absolute; left: 0; }
            
            .dual-engine-status { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
            .engine-badge { padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .engine-badge.gemini { background: #dbeafe; color: #1e40af; }
            .engine-badge.openai { background: #dcfce7; color: #166534; }
            .engine-status { font-size: 11px; color: #6b7280; }
            .engine-status.active { color: #166534; font-weight: 600; }
            
            .recommendations { margin-top: 12px; padding: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; }
            .recommendations ul { margin: 8px 0 0 16px; }
            .recommendations li { font-size: 11px; color: #1e40af; margin-bottom: 4px; }
            
            .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
            .stat-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: 700; color: #3b82f6; }
            .stat-label { font-size: 10px; color: #6b7280; margin-top: 2px; }
            
            .footer { 
              text-align: center; 
              margin-top: 24px; 
              padding-top: 16px; 
              border-top: 1px solid #e5e7eb; 
              color: #9ca3af; 
              font-size: 10px; 
            }
            .footer-brand { font-weight: 700; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="page-header">
            <div class="header-left">
              <div>
                <div class="brand">BuildUnion</div>
                <div class="header-date">Generated: ${currentDate}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="doc-type">PROJECT SUMMARY v3.0</div>
              <div class="project-title">${projectData?.name || 'Untitled Project'}</div>
              <div class="project-location">📍 ${address.split(',').slice(0, 2).join(',') || 'Location pending'}</div>
            </div>
          </div>
          
          <div class="content">
            <!-- Hero Stats -->
            <div class="summary-hero">
              <div class="hero-card">
                <div class="hero-value ${operationalReadiness >= 85 ? 'green' : operationalReadiness >= 60 ? 'amber' : 'red'}">${operationalReadiness}%</div>
                <div class="hero-label">Operational Readiness</div>
              </div>
              <div class="hero-card">
                <div class="hero-value">${gfaValue > 0 ? gfaValue.toLocaleString() : '—'}</div>
                <div class="hero-label">GFA (sq ft)</div>
              </div>
              <div class="hero-card">
                <div class="hero-value">${financialSummary?.total_cost ? '$' + Math.round(financialSummary.total_cost).toLocaleString() : '—'}</div>
                <div class="hero-label">Budget (CAD)</div>
              </div>
            </div>
            
            <div class="readiness-label">
              <span>Project Readiness</span>
              <span class="readiness-grade">${readinessGrade}</span>
            </div>
            <div class="readiness-bar">
              <div class="readiness-fill"></div>
            </div>
            
            <!-- Section 1: Project Overview -->
            <div class="section">
              <div class="section-header"><span class="section-number">1.</span> PROJECT OVERVIEW</div>
              <table>
                <tr><th width="30%">Field</th><th>Value</th></tr>
                <tr><td>Project Name</td><td><strong>${projectData?.name || 'Untitled'}</strong></td></tr>
                <tr><td>Location</td><td>${address || 'Not Set'}</td></tr>
                <tr><td>Work Type</td><td>${workType}</td></tr>
                <tr><td>Trade</td><td><strong>${trade}</strong></td></tr>
                <tr><td>Execution Mode</td><td>${executionMode}</td></tr>
                <tr><td>Site Condition</td><td>${siteCondition}${hasDemolition ? ' (Demolition Required)' : ''}</td></tr>
                <tr><td>Timeline</td><td>${startDate && endDate ? startDate + ' → ' + endDate : 'Not Set'}</td></tr>
              </table>
            </div>
            
            <!-- Section 2: 8-PILLAR OPERATIONAL STATUS (mirrors M.E.S.S.A.) -->
            <div class="section">
              <div class="section-header"><span class="section-number">2.</span> OPERATIONAL TRUTH VERIFICATION (8 Pillars) — ${pillarComplete}/${pillarTotal} Complete</div>
              
              ${pillars.map(p => {
                const statusColor = p.status === 'COMPLETE' || p.status === 'ACTIVE' ? '#166534' : p.status === 'PARTIAL' ? '#92400e' : p.status === 'N/A' ? '#6b7280' : '#991b1b';
                const statusBg = p.status === 'COMPLETE' || p.status === 'ACTIVE' ? '#dcfce7' : p.status === 'PARTIAL' ? '#fef3c7' : p.status === 'N/A' ? '#f3f4f6' : '#fee2e2';
                return `
                <div class="pillar-card pdf-section" style="border-left: 4px solid ${p.color}; background: #fafafa; border-radius: 6px; padding: 12px 16px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 13px; font-weight: 700; color: #1f2937;">
                      ${p.icon} Pillar ${p.id}: ${p.name}
                    </div>
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; background: ${statusBg}; color: ${statusColor};">
                      ${p.status}
                    </span>
                  </div>
                  <table style="margin-bottom: 0;">
                    <tr><th style="width: 35%;">Data Point</th><th>Value</th><th style="width: 15%; text-align: center;">Status</th></tr>
                    ${p.items.map(item => `
                      <tr>
                        <td>${item.label}</td>
                        <td><strong>${item.value}</strong></td>
                        <td style="text-align: center; color: ${item.ok ? '#166534' : '#991b1b'}; font-weight: 600;">${item.ok ? '✓' : '✗'}</td>
                      </tr>
                    `).join('')}
                  </table>
                </div>
                `;
              }).join('')}
            </div>
            
            <!-- Section 4: Weather -->
            ${weatherHtml}
            
            <!-- Section 5: OBC Compliance -->
            ${obcHtml}
            
            <!-- Section 6: AI Analysis -->
            ${aiHtml}
            
            <!-- Section 7: Resource Summary -->
            <div class="section">
              <div class="section-header"><span class="section-number">6.</span> RESOURCE SUMMARY</div>
              <div class="stats-row">
                <div class="stat-box">
                  <div class="stat-value">${citations.length}</div>
                  <div class="stat-label">Citations</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${teamMembers.length}</div>
                  <div class="stat-label">Team Members</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${tasks.length}</div>
                  <div class="stat-label">Tasks</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${documents.length}</div>
                  <div class="stat-label">Documents</div>
                </div>
              </div>
              ${gfaValue > 0 ? `
              <table>
                <tr><th>Metric</th><th>Value</th><th>Notes</th></tr>
                <tr><td>Net Floor Area</td><td>${gfaValue.toLocaleString()} sq ft</td><td>Locked GFA from wizard</td></tr>
                <tr><td>Gross Area (+${wastePercent}% waste)</td><td>${grossArea.toLocaleString()} sq ft</td><td>Material calculation basis</td></tr>
                <tr><td>Material Cost</td><td>${financialSummary?.material_cost ? '$' + financialSummary.material_cost.toLocaleString() : 'TBD'}</td><td>Based on template</td></tr>
                <tr><td>Labor Cost</td><td>${financialSummary?.labor_cost ? '$' + financialSummary.labor_cost.toLocaleString() : 'TBD'}</td><td>Team allocation</td></tr>
                <tr><td>Total Budget</td><td><strong>${financialSummary?.total_cost ? '$' + financialSummary.total_cost.toLocaleString() : 'TBD'}</strong></td><td>Including taxes</td></tr>
              </table>
              ` : '<div class="status-pending">GFA required for detailed financial breakdown</div>'}
            </div>
            
            <div class="footer">
              <div class="footer-brand">BuildUnion Project Management</div>
              <div>Dual AI Engine • OBC 2024 Compliant • Toronto, Ontario</div>
              <div>Report ID: SUM-${shortDate.replace(/\//g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}</div>
            </div>
          </div>
        </body>
        </html>
      `;
      
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
  
  // Download summary PDF
  const handleDownloadSummary = useCallback(async () => {
    if (!summaryPreviewHtml) return;
    
    try {
      const { downloadPDF } = await import('@/lib/pdfGenerator');
      
      await downloadPDF(summaryPreviewHtml, {
        filename: `project-summary-${projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}.pdf`,
        pageFormat: 'letter',
        margin: 15,
      });
      
      toast.success('Summary PDF downloaded!');
    } catch (err) {
      console.error('[Stage8] Summary download failed:', err);
      toast.error('Failed to download summary');
    }
  }, [summaryPreviewHtml, projectData]);
  
  // Save summary to project documents
  const handleSaveSummaryToDocuments = useCallback(async () => {
    if (!summaryPreviewHtml || !projectId || !userId) return;
    
    setIsSavingSummary(true);
    try {
      const { downloadPDF } = await import('@/lib/pdfGenerator');
      
      // Generate blob using html2canvas + jspdf
      const container = document.createElement('div');
      container.innerHTML = summaryPreviewHtml;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      document.body.appendChild(container);
      
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      document.body.removeChild(container);
      
      const imgWidth = 210;
      const margin = 15;
      const usableWidth = imgWidth - (margin * 2);
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeight);
      
      const blob = pdf.output('blob');
      const fileName = `project-summary-${projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}.pdf`;
      const filePath = `${projectId}/${Date.now()}-${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, blob, { contentType: 'application/pdf' });
      
      if (uploadError) throw uploadError;
      
      // Save to database
      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          file_name: fileName,
          file_path: filePath,
          file_size: blob.size,
        });
      
      if (dbError) throw dbError;
      
      // Reload documents
      const { data: newDocs } = await supabase
        .from('project_documents')
        .select('id, file_name, file_path, file_size, uploaded_at')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });
      
      if (newDocs) {
        setDocuments(newDocs.map(doc => ({
          ...doc,
          category: categorizeDocument(doc.file_name),
        })));
      }
      
      toast.success('Summary saved to Documents!', { description: 'Find it in Panel 6' });
      setShowSummaryPreview(false);
    } catch (err) {
      console.error('[Stage8] Save summary failed:', err);
      toast.error('Failed to save summary');
    } finally {
      setIsSavingSummary(false);
    }
  }, [summaryPreviewHtml, projectId, userId, projectData, categorizeDocument]);
  
  // Complete and go to dashboard
  const handleComplete = useCallback(async () => {
    // NAVIGATION LOCK: Owner must have financial data unlocked to proceed
    if (userRole === 'owner' && !isFinancialSummaryUnlocked) {
      toast.error('Financial Summary must be active before activation', {
        description: 'Add budget or contract data to unlock the Financial panel',
        duration: 5000,
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Sync citations to localStorage one final time
      if (projectId) {
        syncCitationsToLocalStorage(projectId, citations, 8, 0);
      }
      
      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);
      
      toast.success('Project finalized!');
      onComplete();
    } catch (err) {
      console.error('[Stage8] Failed to complete:', err);
      logCriticalError('[Stage8] Failed to complete project', err);
      toast.error('Failed to finalize project');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, onComplete, userRole, isFinancialSummaryUnlocked, citations]);
  
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
            onClick={saveEdit}
            disabled={isSaving}
            className="h-8 w-8 p-0"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
  }, [editingField, editValue, isSaving, canEdit, saveEdit, cancelEdit, startEditing]);
  
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
   // ✓ REAL DB TASKS: Display actual project_tasks with assignee names
   // ✓ VISIBILITY: Worker/subcontractor/inspector only see assigned tasks
   const renderPanel5Content = useCallback(() => {
     const panelCitations = getCitationsForPanel(['TIMELINE', 'END_DATE', 'DNA_FINALIZED']);
     
     // ✓ Check SITE_CONDITION citation for demolition
     const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
     const hasDemolition = siteConditionCitation?.answer?.toLowerCase().includes('demolition') 
       || siteConditionCitation?.metadata?.demolition_needed === true
       || (typeof siteConditionCitation?.value === 'string' && siteConditionCitation.value.toLowerCase().includes('demolition'));
     
     // ✓ Role-based task filtering
     const baseTasks: TaskWithChecklist[] = (userRole === 'owner' || userRole === 'foreman')
       ? tasks
       : tasks.filter(t => t.assigned_to === userId);
     
     // Filter phases
     const activePhasesConfig = hasDemolition 
       ? TASK_PHASES 
       : TASK_PHASES.filter(p => p.key !== 'demolition');
     
     // Priority order
     const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
     
     // Group & sort tasks by phase, then priority
     const tasksByPhase = activePhasesConfig.map(phase => ({
       ...phase,
       tasks: baseTasks
         .filter(t => t.phase === phase.key)
         .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)),
     }));

      // Phase color map for Gantt bars - vibrant light mode
      const phaseBarColors: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
        demolition: { bg: 'bg-red-100 dark:bg-red-500/20', border: 'border-red-300 dark:border-red-500/40', text: 'text-red-600 dark:text-red-400', lightBg: 'from-red-50 to-rose-50' },
        preparation: { bg: 'bg-amber-100 dark:bg-amber-500/20', border: 'border-amber-300 dark:border-amber-500/40', text: 'text-amber-600 dark:text-amber-400', lightBg: 'from-amber-50 to-yellow-50' },
        installation: { bg: 'bg-blue-100 dark:bg-blue-500/20', border: 'border-blue-300 dark:border-blue-500/40', text: 'text-blue-600 dark:text-blue-400', lightBg: 'from-blue-50 to-sky-50' },
        finishing: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', border: 'border-emerald-300 dark:border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', lightBg: 'from-emerald-50 to-teal-50' },
      };

      const priorityColors: Record<string, string> = {
        high: 'bg-red-500',
        medium: 'bg-amber-500',
        low: 'bg-emerald-500',
      };

     const totalTasks = baseTasks.length;
     const completedTasks = baseTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
     const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

     // Get assignee name
     const getAssigneeName = (assigneeId: string) => {
       const member = teamMembers.find(m => m.userId === assigneeId);
       return member?.name || 'Unassigned';
     };
     const getAssigneeInitial = (assigneeId: string) => {
       const name = getAssigneeName(assigneeId);
       return name.charAt(0).toUpperCase();
     };

      // Gantt bar width based on checklist completion
      const getTaskProgress = (task: TaskWithChecklist) => {
        if (task.status === 'completed' || task.status === 'done') return 100;
        if (!task.checklist || task.checklist.length === 0) return task.status === 'in_progress' ? 50 : 0;
        const done = task.checklist.filter(c => c.done).length;
        return Math.round((done / task.checklist.length) * 100);
      };

      // Project timeline boundaries from citations
      const timelineCitation = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCitation = citations.find(c => c.cite_type === 'END_DATE');
      const projectStart = timelineCitation?.answer ? new Date(timelineCitation.answer).getTime() : null;
      const projectEnd = endDateCitation?.answer ? new Date(endDateCitation.answer).getTime() : null;
      const totalDuration = projectStart && projectEnd ? projectEnd - projectStart : null;

      // Calculate proportional left offset and width for a task
      const getGanttBarStyle = (task: TaskWithChecklist) => {
        if (!totalDuration || !projectStart || !projectEnd || totalDuration <= 0) {
          return { left: '0%', width: '100%' }; // Fallback: full width
        }
        const taskStart = task.created_at ? new Date(task.created_at).getTime() : projectStart;
        const taskEnd = task.due_date ? new Date(task.due_date).getTime() : projectEnd;
        const clampedStart = Math.max(taskStart, projectStart);
        const clampedEnd = Math.min(taskEnd, projectEnd);
        const left = ((clampedStart - projectStart) / totalDuration) * 100;
        const width = Math.max(((clampedEnd - clampedStart) / totalDuration) * 100, 5); // min 5%
        return { left: `${Math.round(left)}%`, width: `${Math.round(width)}%` };
      };
      
      // Format date for tooltip
      const formatTaskDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        try { return format(parseISO(dateStr), 'MMM d'); } catch { return null; }
      };
     
    return (
      <div className="space-y-4">
        {/* ─── Vibrant Timeline Header with Editable Dates ─── */}
        <div className="rounded-xl border border-violet-300 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 dark:from-violet-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Calendar className="h-4.5 w-4.5 text-white" />
              </div>
              {/* Editable Start Date */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
                <span className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase font-mono font-bold">▸ Start</span>
                <input
                  type="date"
                  className="text-xs font-bold text-gray-800 dark:text-indigo-200 bg-transparent border-none outline-none cursor-pointer w-[120px]"
                  value={(() => {
                    const tc = panelCitations.find(c => c.cite_type === 'TIMELINE');
                    if (!tc) return '';
                    try { return tc.answer.split('T')[0]; } catch { return tc.answer; }
                  })()}
                  onChange={async (e) => {
                    const newDate = e.target.value;
                    if (!newDate) return;
                    const existingIdx = citations.findIndex(c => c.cite_type === 'TIMELINE');
                    let updatedCitations: Citation[];
                    if (existingIdx >= 0) {
                      updatedCitations = citations.map((c, i) => i === existingIdx ? {
                        ...c, answer: newDate, value: 'scheduled',
                        metadata: { ...c.metadata, start_date: newDate, source: 'user_input' },
                        timestamp: new Date().toISOString(),
                      } : c);
                    } else {
                      const newCit: Citation = {
                        id: `cite_timeline_${Date.now()}`, cite_type: 'TIMELINE', question_key: 'timeline',
                        answer: newDate, value: 'scheduled', timestamp: new Date().toISOString(),
                        metadata: { start_date: newDate, source: 'user_input' },
                      };
                      updatedCitations = [...citations, newCit];
                    }
                    setCitations(updatedCitations);
                    try {
                      await supabase.from('project_summaries')
                        .update({ verified_facts: updatedCitations as any, project_start_date: newDate })
                        .eq('project_id', projectId);
                      toast.success('Start date saved');
                    } catch { toast.error('Failed to save start date'); }
                  }}
                />
                {panelCitations.find(c => c.cite_type === 'TIMELINE') && (
                  <span className="text-[7px] text-indigo-400 font-mono">cite:[{panelCitations.find(c => c.cite_type === 'TIMELINE')!.id.slice(0, 6)}]</span>
                )}
              </div>
              {/* Editable End Date */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
                <span className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase font-mono font-bold">▸ End</span>
                <input
                  type="date"
                  className="text-xs font-bold text-gray-800 dark:text-indigo-200 bg-transparent border-none outline-none cursor-pointer w-[120px]"
                  value={(() => {
                    const ec = panelCitations.find(c => c.cite_type === 'END_DATE');
                    if (!ec) return '';
                    try { return ec.answer.split('T')[0]; } catch { return ec.answer; }
                  })()}
                  onChange={async (e) => {
                    const newDate = e.target.value;
                    if (!newDate) return;
                    const existingIdx = citations.findIndex(c => c.cite_type === 'END_DATE');
                    let updatedCitations: Citation[];
                    if (existingIdx >= 0) {
                      updatedCitations = citations.map((c, i) => i === existingIdx ? {
                        ...c, answer: newDate, value: newDate,
                        metadata: { ...c.metadata, end_date: newDate, source: 'user_input' },
                        timestamp: new Date().toISOString(),
                      } : c);
                    } else {
                      const newCit: Citation = {
                        id: `cite_end_date_${Date.now()}`, cite_type: 'END_DATE', question_key: 'end_date',
                        answer: newDate, value: newDate, timestamp: new Date().toISOString(),
                        metadata: { end_date: newDate, source: 'user_input' },
                      };
                      updatedCitations = [...citations, newCit];
                    }
                    setCitations(updatedCitations);
                    try {
                      await supabase.from('project_summaries')
                        .update({ verified_facts: updatedCitations as any, project_end_date: newDate })
                        .eq('project_id', projectId);
                      toast.success('End date saved');
                    } catch { toast.error('Failed to save end date'); }
                  }}
                />
                {panelCitations.find(c => c.cite_type === 'END_DATE') && (
                  <span className="text-[7px] text-indigo-400 font-mono">cite:[{panelCitations.find(c => c.cite_type === 'END_DATE')!.id.slice(0, 6)}]</span>
                )}
              </div>
            </div>
            {/* Overall progress */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-indigo-950/30 border border-violet-200 dark:border-violet-500/20">
              <div className="w-28 h-2.5 rounded-full bg-violet-100 dark:bg-violet-900/50 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full shadow-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-violet-300">{completedTasks}/{totalTasks}</span>
              <span className="text-[9px] font-mono text-violet-500 dark:text-violet-400">{progressPct}%</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-sky-300 dark:border-sky-500/30 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/40 p-2.5 text-center">
            <p className="text-[9px] font-mono uppercase text-sky-600 dark:text-sky-400 tracking-wide">Total Tasks</p>
            <p className="text-xl font-black text-gray-800 dark:text-white">{totalTasks}</p>
          </div>
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 p-2.5 text-center">
            <p className="text-[9px] font-mono uppercase text-emerald-600 dark:text-emerald-400 tracking-wide">Completed</p>
            <p className="text-xl font-black text-gray-800 dark:text-white">{completedTasks}</p>
          </div>
          <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-2.5 text-center">
            <p className="text-[9px] font-mono uppercase text-amber-600 dark:text-amber-400 tracking-wide">Remaining</p>
            <p className="text-xl font-black text-gray-800 dark:text-white">{totalTasks - completedTasks}</p>
          </div>
        </div>

        {/* Site Condition Badge */}
        {siteConditionCitation && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300 dark:border-amber-500/30">
            <Hammer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-semibold text-gray-800 dark:text-amber-200">{siteConditionCitation.answer}</span>
            {hasDemolition && (
              <Badge className="text-[8px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30">Demolition</Badge>
            )}
          </div>
        )}

        {/* Gantt Chart with Time Scale */}
        <div className="space-y-1">
          {/* ── Time Scale Header ── */}
          {projectStart && projectEnd && totalDuration && totalDuration > 0 && (() => {
            const startDate = new Date(projectStart);
            const endDate = new Date(projectEnd);
            const durationDays = totalDuration / (1000 * 60 * 60 * 24);
            
            // Decide granularity: weekly if <= 90 days, otherwise monthly
            const useWeekly = durationDays <= 90;
            
            const ticks: { label: string; leftPct: number }[] = [];
            
            if (useWeekly) {
              // Generate weekly ticks
              const cursor = new Date(startDate);
              // Align to next Monday
              const dayOfWeek = cursor.getDay();
              if (dayOfWeek !== 1) {
                cursor.setDate(cursor.getDate() + ((8 - dayOfWeek) % 7));
              }
              while (cursor.getTime() <= endDate.getTime()) {
                const pct = ((cursor.getTime() - projectStart) / totalDuration) * 100;
                ticks.push({
                  label: format(cursor, 'MMM d'),
                  leftPct: Math.round(pct * 10) / 10,
                });
                cursor.setDate(cursor.getDate() + 7);
              }
            } else {
              // Generate monthly ticks (1st of each month)
              const cursor = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
              while (cursor.getTime() <= endDate.getTime()) {
                const pct = ((cursor.getTime() - projectStart) / totalDuration) * 100;
                ticks.push({
                  label: format(cursor, 'MMM yyyy'),
                  leftPct: Math.round(pct * 10) / 10,
                });
                cursor.setMonth(cursor.getMonth() + 1);
              }
            }

            return (
              <div className="mb-2">
                {/* Scale type label */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest text-indigo-500 dark:text-indigo-400 font-mono font-bold">
                    {useWeekly ? '▸ Weekly' : '▸ Monthly'} Timeline
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-slate-400 font-mono">
                    {format(startDate, 'MMM d')} → {format(endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                {/* Ruler bar */}
                <div className="relative h-7 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800/40 dark:to-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-700/30 overflow-hidden">
                  {/* Start marker */}
                  <div className="absolute top-0 left-0 h-full w-px bg-indigo-400/50" />
                  {/* End marker */}
                  <div className="absolute top-0 right-0 h-full w-px bg-indigo-400/50" />
                  {/* Today marker */}
                  {(() => {
                    const now = Date.now();
                    if (now >= projectStart && now <= projectEnd) {
                      const todayPct = ((now - projectStart) / totalDuration) * 100;
                      return (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-emerald-500 dark:bg-emerald-400/70 z-10"
                          style={{ left: `${todayPct}%` }}
                        >
                          <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-b bg-emerald-500 text-[7px] text-white font-bold tracking-wider shadow-sm">
                            NOW
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* Tick marks */}
                  {ticks.map((tick, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex flex-col items-center"
                      style={{ left: `${tick.leftPct}%` }}
                    >
                      <div className="w-px h-2.5 bg-indigo-300 dark:bg-indigo-500/50" />
                      <span className="text-[7px] text-gray-500 dark:text-slate-500 font-mono mt-0.5 whitespace-nowrap -translate-x-1/2">
                        {tick.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* Phase header row */}
          {tasksByPhase.map(phase => {
            if (phase.tasks.length === 0 && !expandedPhases.has(phase.key)) return null;
            const colors = phaseBarColors[phase.key] || phaseBarColors.preparation;
            const phaseComplete = phase.tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
            
            return (
              <div key={phase.key} className="space-y-0.5">
                {/* Phase divider */}
                <button
                  onClick={() => togglePhaseExpansion(phase.key)}
                  className={cn("w-full flex items-center gap-2 py-2 px-3 rounded-lg border transition-colors group", colors.bg, colors.border)}
                >
                  <div className={cn("h-3 w-3 rounded", colors.bg, colors.border, "border-2 shadow-sm")} />
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", colors.text)}>{phase.label}</span>
                  <span className="text-[9px] text-gray-500 dark:text-slate-500 font-mono font-bold">{phaseComplete}/{phase.tasks.length}</span>
                  <div className="flex-1" />
                  {expandedPhases.has(phase.key) ? (
                    <ChevronUp className="h-3 w-3 text-gray-400 dark:text-slate-600 group-hover:text-gray-600 dark:group-hover:text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-gray-400 dark:text-slate-600 group-hover:text-gray-600 dark:group-hover:text-slate-400" />
                  )}
                </button>

                {/* ── Phase-level aggregated duration bar ── */}
                {phase.tasks.length > 0 && projectStart && projectEnd && totalDuration && totalDuration > 0 && (() => {
                  // Find earliest start and latest end across all tasks in this phase
                  const phaseTaskStarts = phase.tasks.map(t => 
                    t.created_at ? new Date(t.created_at).getTime() : projectStart
                  );
                  const phaseTaskEnds = phase.tasks.map(t => 
                    t.due_date ? new Date(t.due_date).getTime() : projectEnd
                  );
                  const phaseStart = Math.max(Math.min(...phaseTaskStarts), projectStart);
                  const phaseEnd = Math.min(Math.max(...phaseTaskEnds), projectEnd);
                  const leftPct = ((phaseStart - projectStart) / totalDuration) * 100;
                  const widthPct = Math.max(((phaseEnd - phaseStart) / totalDuration) * 100, 3);
                  const phaseDays = Math.ceil((phaseEnd - phaseStart) / (1000 * 60 * 60 * 24));
                  const phaseProgressPct = phase.tasks.length > 0
                    ? Math.round((phaseComplete / phase.tasks.length) * 100) : 0;

                    return (
                      <div className="relative h-6 mx-2 mb-0.5 rounded-lg bg-gray-100 dark:bg-slate-800/20 overflow-hidden border border-gray-200 dark:border-transparent">
                        {/* Aggregated phase span */}
                        <motion.div
                          className={cn(
                            "absolute inset-y-0 rounded-lg border",
                            colors.bg, colors.border
                          )}
                          style={{ left: `${Math.round(leftPct)}%`, width: `${Math.round(widthPct)}%` }}
                          initial={{ scaleX: 0, originX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                          {/* Phase progress fill */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-l opacity-50 bg-current"
                            style={{ width: `${phaseProgressPct}%` }}
                          />
                          {/* Label inside bar */}
                          <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-1">
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider truncate", colors.text)}>
                              {phaseDays}d
                            </span>
                            <span className={cn("text-[8px] font-mono font-bold", colors.text)}>
                              {phaseProgressPct}%
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    );
                })()}

                {/* Task Gantt bars */}
                <AnimatePresence>
                  {expandedPhases.has(phase.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-1 pl-2"
                    >
                      {phase.tasks.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic py-1 pl-4">No tasks</p>
                      ) : (
                        phase.tasks.map((task, taskIdx) => {
                          const taskProgress = getTaskProgress(task);
                          const isCompleted = task.status === 'completed' || task.status === 'done';
                          const taskFileInputId = `task-photo-${task.id}`;
                          
                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: taskIdx * 0.05 }}
                              className="group"
                            >
                              {/* Gantt row */}
                              <div className="flex items-center gap-2 py-1">
                                {/* Priority dot */}
                                <div className={cn("h-2 w-2 rounded-full shrink-0", priorityColors[task.priority] || 'bg-slate-500')} />
                                
                                {/* Task completion toggle */}
                                <Checkbox
                                  checked={isCompleted}
                                  onCheckedChange={(checked) => {
                                    const newStatus = checked ? 'completed' : 'pending';
                                    supabase
                                      .from('project_tasks')
                                      .update({ status: newStatus })
                                      .eq('id', task.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          toast.error('Failed to update task');
                                        } else {
                                          setTasks(prev => prev.map(t => 
                                            t.id === task.id ? { ...t, status: newStatus } : t
                                          ));
                                        }
                                      });
                                  }}
                                  disabled={!canToggleTaskStatus(task.assigned_to)}
                                  className="h-4 w-4 shrink-0"
                                />

                                {/* Gantt bar container - proportional timeline */}
                                <div className="flex-1 relative h-8 bg-gray-100 dark:bg-slate-800/30 rounded-lg overflow-hidden border border-gray-200 dark:border-transparent">
                                  {(() => {
                                    const barStyle = getGanttBarStyle(task);
                                    const startLabel = formatTaskDate(task.created_at);
                                    const endLabel = formatTaskDate(task.due_date);
                                    return (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={cn(
                                                "absolute inset-y-0 rounded-lg border overflow-hidden cursor-pointer transition-all shadow-sm",
                                                colors.border,
                                                isCompleted ? "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30" : colors.bg,
                                                "hover:brightness-110 dark:hover:brightness-125"
                                              )}
                                              style={{ left: barStyle.left, width: barStyle.width }}
                                              onClick={() => togglePhaseExpansion(`task-${task.id}`)}
                                            >
                                              {/* Progress fill inside the bar */}
                                              <motion.div
                                                className={cn(
                                                  "absolute inset-y-0 left-0 rounded-md",
                                                  isCompleted 
                                                    ? "bg-emerald-500/30" 
                                                    : task.priority === 'high' ? "bg-red-500/20" 
                                                    : task.priority === 'medium' ? "bg-amber-500/20"
                                                    : "bg-blue-500/20"
                                                )}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${taskProgress}%` }}
                                                transition={{ duration: 0.5, delay: taskIdx * 0.05 }}
                                              />
                                              {/* Task name & info */}
                                              <div className="relative h-full flex items-center justify-between px-1.5 gap-1">
                                                <span className={cn(
                                                  "text-[10px] font-semibold truncate",
                                                  isCompleted ? "line-through text-gray-400 dark:text-slate-500" : "text-gray-700 dark:text-slate-200"
                                                )}>
                                                  {task.title}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <span className={cn(
                                                    "text-[8px] font-bold uppercase px-1 py-0.5 rounded",
                                                    task.priority === 'high' ? "bg-red-500/20 text-red-400"
                                                    : task.priority === 'medium' ? "bg-amber-500/20 text-amber-400"
                                                    : "bg-emerald-500/20 text-emerald-400"
                                                  )}>
                                                    {task.priority[0]?.toUpperCase()}
                                                  </span>
                                                  <span className="text-[9px] font-mono font-bold text-gray-500 dark:text-slate-500">{taskProgress}%</span>
                                                </div>
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            <div className="flex flex-col gap-0.5">
                                              <span className="font-semibold">{task.title}</span>
                                              {startLabel && <span className="text-muted-foreground">Start: {startLabel}</span>}
                                              {endLabel && <span className="text-muted-foreground">Due: {endLabel}</span>}
                                              {!startLabel && !endLabel && <span className="text-muted-foreground">No dates set</span>}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })()}
                                </div>

                                {/* Assignee avatar */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={cn(
                                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border shadow-sm",
                                        isCompleted 
                                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                                          : "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30"
                                      )}>
                                        {getAssigneeInitial(task.assigned_to)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-xs">
                                      {getAssigneeName(task.assigned_to)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {/* Photo upload - ALL TEAM */}
                                {canUploadTaskPhotos && (
                                  <>
                                    <input
                                      id={taskFileInputId}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const files = e.target.files;
                                        if (!files || files.length === 0) return;
                                        setIsUploading(true);
                                        try {
                                          const file = files[0];
                                          const fileName = `${Date.now()}-${file.name}`;
                                          const filePath = `${projectId}/${fileName}`;
                                          const { error: uploadError } = await supabase.storage
                                            .from('project-documents')
                                            .upload(filePath, file);
                                          if (uploadError) throw uploadError;
                                          const { data: docRecord, error: insertError } = await supabase
                                            .from('project_documents')
                                            .insert({
                                              project_id: projectId,
                                              file_name: file.name,
                                              file_path: filePath,
                                              file_size: file.size,
                                            })
                                            .select()
                                            .single();
                                          if (insertError) throw insertError;
                                          const phaseInfo = TASK_PHASES.find(p => p.key === task.phase);
                                          const newCitation: Citation = {
                                            id: `doc-${docRecord.id}`,
                                            cite_type: 'SITE_PHOTO' as any,
                                            question_key: 'task_photo_upload',
                                            answer: `Task Photo: ${task.title}`,
                                            value: filePath,
                                            timestamp: new Date().toISOString(),
                                            metadata: {
                                              category: 'visual',
                                              fileName: file.name,
                                              fileSize: file.size,
                                              taskId: task.id,
                                              taskTitle: task.title,
                                              phase: task.phase,
                                              phaseLabel: phaseInfo?.label || task.phase,
                                            },
                                          };
                                          const newDoc: DocumentWithCategory = {
                                            id: docRecord.id,
                                            file_name: file.name,
                                            file_path: filePath,
                                            category: 'visual',
                                            citationId: newCitation.id,
                                            uploadedAt: new Date().toISOString(),
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
                                          // ✓ Auto-mark verification checklist item as done
                                          setTasks(prev => prev.map(t => {
                                            if (t.id === task.id) {
                                              return {
                                                ...t,
                                                checklist: t.checklist.map(item =>
                                                  item.id === `${task.id}-verify` ? { ...item, done: true } : item
                                                ),
                                              };
                                            }
                                            return t;
                                          }));
                                          toast.success(`Photo uploaded for "${task.title}"`, { description: '✓ Verified' });
                                        } catch (err) {
                                          console.error('[Stage8] Task photo upload failed:', err);
                                          toast.error('Failed to upload photo');
                                        } finally {
                                          setIsUploading(false);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => document.getElementById(taskFileInputId)?.click()}
                                      disabled={isUploading}
                                    >
                                      <Camera className="h-3 w-3 text-slate-500" />
                                    </Button>
                                  </>
                                )}
                              </div>

                              {/* Expanded checklist & assignee selector */}
                              <AnimatePresence>
                                {expandedPhases.has(`task-${task.id}`) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden ml-8 mt-1 mb-2 pl-3 border-l-2 border-indigo-200 dark:border-slate-700/50 space-y-2"
                                  >
                                    {/* Assignee Selector */}
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-slate-500" />
                                      <Select
                                        value={task.assigned_to}
                                        onValueChange={(value) => updateTaskAssignee(task.id, value)}
                                        disabled={!canEdit}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] w-36 bg-slate-800/50 border-slate-700">
                                          <SelectValue placeholder="Assign..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                          {teamMembers.map(member => (
                                            <SelectItem key={member.userId} value={member.userId} className="text-[10px] text-slate-200">
                                              {member.name} ({member.role})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {/* Checklist */}
                                    {task.checklist.map(item => (
                                      <div key={item.id} className="flex items-center gap-2">
                                        <Checkbox
                                          id={item.id}
                                          checked={item.done}
                                          onCheckedChange={(checked) => updateChecklistItem(task.id, item.id, !!checked)}
                                          disabled={!canEdit}
                                          className="h-3.5 w-3.5"
                                        />
                                        <label
                                          htmlFor={item.id}
                                          className={cn(
                                            "text-[10px] cursor-pointer",
                                            item.done && "line-through text-slate-600"
                                          )}
                                        >
                                          {item.text}
                                        </label>
                                        {item.id.includes('-verify') && item.done && (
                                          <Camera className="h-2.5 w-2.5 text-purple-400" />
                                        )}
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Priority Legend */}
        <div className="flex items-center gap-3 pt-3 border-t border-indigo-100 dark:border-slate-700/30">
          <span className="text-[9px] text-gray-500 dark:text-slate-600 uppercase tracking-wider font-bold">Priority:</span>
          {[
            { key: 'high', label: 'High', color: 'bg-red-500', bgLight: 'bg-red-50 border-red-200' },
            { key: 'medium', label: 'Medium', color: 'bg-amber-500', bgLight: 'bg-amber-50 border-amber-200' },
            { key: 'low', label: 'Low', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 border-emerald-200' },
          ].map(p => (
            <div key={p.key} className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border", p.bgLight)}>
              <div className={cn("h-2 w-2 rounded-full", p.color)} />
              <span className="text-[9px] text-gray-600 dark:text-slate-400 font-medium">{p.label}</span>
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-[9px] text-gray-400 dark:text-slate-600 italic">Click bar to expand</span>
        </div>
      </div>
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
  ]);
  
  // Render Panel 6 - Documents with Upload and Contract Generator
  const renderPanel6Content = useCallback(() => {
    // Group documents by category with citation linking
    const panelCitations = getCitationsForPanel(['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION']);
    
    const docsByCategory = DOCUMENT_CATEGORIES.map(cat => {
      const categoryDocs = documents.filter(d => d.category === cat.key);
      // Link citations to documents
      const docsWithCitations = categoryDocs.map(doc => {
        // Find matching citation by file name
        const matchingCitation = panelCitations.find(c => {
          const citationFileName = c.metadata?.file_name || c.answer;
          return citationFileName && doc.file_name.toLowerCase().includes(String(citationFileName).toLowerCase().slice(0, 10));
        });
        return {
          ...doc,
          citationId: matchingCitation?.id || doc.citationId,
          citationType: matchingCitation?.cite_type,
          uploadedAt: doc.uploadedAt || (matchingCitation?.timestamp ? format(new Date(matchingCitation.timestamp), 'MMM dd, yyyy') : undefined),
        };
      });
      return {
        ...cat,
        documents: docsWithCitations,
        citationCount: docsWithCitations.filter(d => d.citationId).length,
      };
    });
    
    return (
      <div className="space-y-4">
        {/* ─── Futuristic Header ─── */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300 block">Document Vault</span>
              <span className="text-[10px] text-sky-500 dark:text-sky-400 font-mono">
                {documents.length} files · {contracts.length} contracts
              </span>
            </div>
          </div>
          {panelCitations.length > 0 && (
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono bg-sky-100 dark:bg-sky-900/30 px-1.5 py-0.5 rounded">
              {panelCitations.filter(c => c.id).length} cited
            </span>
          )}
        </div>

        {/* ─── Upload Zone ─── */}
        {canEdit && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono uppercase tracking-wider">Upload to:</span>
              <Select
                value={selectedUploadCategory}
                onValueChange={(v) => setSelectedUploadCategory(v as DocumentCategory)}
              >
                <SelectTrigger className="h-7 w-28 text-[11px] border-indigo-200 dark:border-indigo-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.key} value={cat.key} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer",
                isDraggingOver 
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" 
                  : "border-indigo-300/50 dark:border-indigo-700/50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              {isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-indigo-400 mb-1" />
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    Drop files or <span className="font-semibold">click to browse</span>
                  </p>
                  <p className="text-[10px] text-indigo-400 dark:text-indigo-500 mt-0.5">PDF · Images · Blueprints</p>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* ─── Documents by Category ─── */}
        <div className="space-y-2.5">
          {docsByCategory.map(cat => {
            const catColors = [
              { border: 'border-cyan-200 dark:border-cyan-700/30', bg: 'bg-gradient-to-r from-cyan-50/80 to-sky-50/60 dark:from-cyan-950/30 dark:to-sky-950/20', text: 'text-cyan-700 dark:text-cyan-300', icon: 'text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
              { border: 'border-violet-200 dark:border-violet-700/30', bg: 'bg-gradient-to-r from-violet-50/80 to-purple-50/60 dark:from-violet-950/30 dark:to-purple-950/20', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
              { border: 'border-emerald-200 dark:border-emerald-700/30', bg: 'bg-gradient-to-r from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
              { border: 'border-amber-200 dark:border-amber-700/30', bg: 'bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
            ];
            const catIdx = DOCUMENT_CATEGORIES.findIndex(c => c.key === cat.key);
            const colors = catColors[catIdx % catColors.length];

            return (
              <div key={cat.key} className={cn(
                "rounded-xl border-2 p-2.5 transition-all",
                cat.documents.length > 0 ? `${colors.border} ${colors.bg}` : "border-dashed border-gray-200 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-900/20"
              )}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <cat.icon className={cn("h-3.5 w-3.5", cat.documents.length > 0 ? colors.icon : "text-gray-400")} />
                    <span className={cn("text-[11px] font-semibold", cat.documents.length > 0 ? colors.text : "text-gray-400")}>{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn("text-[9px] px-1.5", cat.documents.length > 0 ? colors.badge : "")}>{cat.documents.length}</Badge>
                    {cat.citationCount > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        {cat.citationCount} cited
                      </Badge>
                    )}
                  </div>
                </div>
                {cat.documents.length === 0 ? (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 italic pl-5">No files</p>
                ) : (
                  <div className="space-y-1">
                    {cat.documents.slice(0, 3).map(doc => {
                      const isImage = doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      const isPdf = doc.file_name.match(/\.pdf$/i);
                      
                      return (
                        <div 
                          key={doc.id} 
                          className="group flex items-center gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-700/30 transition-all cursor-pointer"
                          onClick={() => setPreviewDocument({ 
                            file_name: doc.file_name, 
                            file_path: doc.file_path, 
                            category: cat.key,
                            citationId: doc.citationId 
                          })}
                        >
                          {/* Thumbnail */}
                          <div className="relative flex-shrink-0 w-9 h-9 rounded-lg border overflow-hidden">
                            {isImage ? (
                              <img 
                                src={getDocumentPreviewUrl(doc.file_path)} 
                                alt={doc.file_name}
                                className="w-full h-full object-cover"
                              />
                            ) : isPdf ? (
                              <div className="w-full h-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-red-500" />
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                              <Eye className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          
                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] truncate block font-medium text-gray-800 dark:text-gray-200">{doc.file_name}</span>
                            {doc.uploadedAt && (
                              <span className="text-[9px] text-gray-400">{doc.uploadedAt}</span>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc.file_path, doc.file_name); }}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {doc.citationId && (
                            <Badge variant="outline" className="text-[8px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex-shrink-0 px-1">
                              [{doc.citationId.slice(0, 6)}]
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {cat.documents.length > 3 && (
                      <button 
                        onClick={() => setFullscreenPanel('panel-6-documents')}
                        className={cn("text-[10px] font-medium pl-5", colors.text, "hover:underline")}
                      >
                        +{cat.documents.length - 3} more → View All
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* ─── Contracts Section ─── */}
        <div className="pt-3 border-t border-indigo-200 dark:border-indigo-700/30">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Contracts</span>
            <Badge variant="outline" className="text-[9px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{contracts.length}</Badge>
          </div>
          
          {contracts.length > 0 ? (
            <div className="space-y-2.5">
              {contracts.map(contract => {
                const isSigned = contract.status === 'signed';
                const isSent = contract.status === 'sent';
                const isDraft = contract.status === 'draft';
                const statusColor = isSigned 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : isSent
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
                
                const statusIcon = isSigned ? '✅' : isSent ? '📨' : '📝';
                
                return (
                  <div 
                    key={contract.id} 
                    className="rounded-xl border-2 border-violet-200 dark:border-violet-700/30 bg-gradient-to-r from-violet-50/80 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/15 overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Contract Header */}
                    <div 
                      className="flex items-center justify-between p-2.5 cursor-pointer"
                      onClick={() => {
                        if (contract.share_token) {
                          window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                        } else {
                          toast.info('Contract preview not available');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{statusIcon}</span>
                        <div>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">#{contract.contract_number}</span>
                          {contract.project_name && (
                            <span className="text-[10px] text-violet-500 dark:text-violet-400 ml-1.5">{contract.project_name}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 border font-semibold", statusColor)}>
                        {contract.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Contract Details Grid */}
                    <div className="px-2.5 pb-2 space-y-1.5">
                      {/* Client & Contractor Row */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-violet-100 dark:border-violet-800/30 p-1.5">
                          <p className="text-[9px] text-violet-500 dark:text-violet-400 font-mono uppercase">Client</p>
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {contract.client_name || <span className="italic text-gray-400">Not set</span>}
                          </p>
                          {contract.client_email && (
                            <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{contract.client_email}</p>
                          )}
                        </div>
                        <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-violet-100 dark:border-violet-800/30 p-1.5">
                          <p className="text-[9px] text-violet-500 dark:text-violet-400 font-mono uppercase">Contractor</p>
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {contract.contractor_name || <span className="italic text-gray-400">Not set</span>}
                          </p>
                          {contract.contractor_email && (
                            <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{contract.contractor_email}</p>
                          )}
                        </div>
                      </div>

                      {/* Financial & Timeline Row */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {canViewFinancials && (
                          <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-violet-100 dark:border-violet-800/30 p-1.5 text-center">
                            <p className="text-[9px] text-violet-500 dark:text-violet-400 font-mono uppercase">Total</p>
                            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              {contract.total_amount ? `$${contract.total_amount.toLocaleString()}` : '—'}
                            </p>
                          </div>
                        )}
                        <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-violet-100 dark:border-violet-800/30 p-1.5 text-center">
                          <p className="text-[9px] text-violet-500 dark:text-violet-400 font-mono uppercase">Start</p>
                          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                            {contract.start_date ? format(parseISO(String(contract.start_date)), 'MMM dd') : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-violet-100 dark:border-violet-800/30 p-1.5 text-center">
                          <p className="text-[9px] text-violet-500 dark:text-violet-400 font-mono uppercase">End</p>
                          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                            {contract.estimated_end_date ? format(parseISO(String(contract.estimated_end_date)), 'MMM dd') : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Signature Status */}
                      <div className="rounded-lg border border-violet-200 dark:border-violet-700/40 bg-violet-50/50 dark:bg-violet-950/20 p-1.5">
                        <p className="text-[9px] text-violet-600 dark:text-violet-400 font-mono uppercase mb-1">Signatures</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {contract.contractor_signature ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-3 w-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                            )}
                            <span className={cn("text-[10px]", contract.contractor_signature ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-400 dark:text-gray-500")}>
                              Contractor {contract.contractor_signature ? '✓ Signed' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {contract.client_signature ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-3 w-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                            )}
                            <span className={cn("text-[10px]", contract.client_signature ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-400 dark:text-gray-500")}>
                              Client {contract.client_signature ? '✓ Signed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        {contract.client_signed_at && (
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                            Client signed: {format(new Date(contract.client_signed_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                        {contract.sent_to_client_at && !contract.client_signed_at && (
                          <p className="text-[9px] text-sky-600 dark:text-sky-400 mt-1 font-mono">
                            Sent: {format(new Date(contract.sent_to_client_at), 'MMM dd, yyyy HH:mm')}
                            {contract.client_viewed_at && ` · Viewed: ${format(new Date(contract.client_viewed_at), 'MMM dd HH:mm')}`}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {/* Preview */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px] px-2 gap-1 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 flex-1"
                          onClick={() => {
                            if (contract.share_token) {
                              window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                            }
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                        
                        {/* Send / Resend */}
                        {!isSigned && canEdit && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-[10px] px-2 gap-1 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContractForEmail({ id: contract.id, contract_number: contract.contract_number, total_amount: contract.total_amount, status: contract.status, share_token: contract.share_token });
                              setContractRecipients([{ email: '', name: '' }]);
                              setShowContractEmailDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3" />
                            {isSent ? 'Resend' : 'Send'}
                          </Button>
                        )}
                        
                        {/* Download */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px] px-2 gap-1 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (contract.share_token) {
                              window.open(`/contract/sign?token=${contract.share_token}&download=true`, '_blank');
                            }
                          }}
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </Button>
                        
                        {/* Delete (soft) */}
                        {canEdit && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-[10px] px-2 gap-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContractToDelete({ id: contract.id, contract_number: contract.contract_number, status: contract.status });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">No contracts yet</p>
              {canEdit && (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'residential', label: 'Residential', icon: '🏠' },
                    { key: 'commercial', label: 'Commercial', icon: '🏢' },
                    { key: 'industrial', label: 'Industrial', icon: '🏭' },
                    { key: 'renovation', label: 'Renovation', icon: '🔨' },
                  ].map(type => (
                    <button
                      key={type.key}
                      onClick={() => setSelectedContractType(type.key)}
                      className={cn(
                        "flex items-center gap-1.5 p-2 rounded-lg border text-left text-[11px] transition-all",
                        selectedContractType === type.key
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
                      )}
                    >
                      <span>{type.icon}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{type.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedContractType && canEdit && (
                <Button
                  size="sm"
                  onClick={() => setShowContractPreview(true)}
                  className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Create {selectedContractType.charAt(0).toUpperCase() + selectedContractType.slice(1)} Contract
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [
    documents,
    contracts,
    canEdit,
    canViewFinancials,
    isUploading,
    isDraggingOver,
    selectedUploadCategory,
    selectedContractType,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileUpload,
    getCitationsForPanel,
    setFullscreenPanel,
    getDocumentPreviewUrl,
    handleDownloadDocument,
  ]);
  
  // Contract type options for new contract selection
  const CONTRACT_TYPE_OPTIONS = [
    { key: 'residential', label: 'Residential', icon: '🏠' },
    { key: 'commercial', label: 'Commercial', icon: '🏢' },
    { key: 'industrial', label: 'Industrial', icon: '🏭' },
    { key: 'renovation', label: 'Renovation', icon: '🔨' },
  ];
  
  // Render panel content based on panel ID
  const renderPanelContent = useCallback((panel: PanelConfig) => {
    const panelCitations = getCitationsForPanel(panel.dataKeys);

    // ======= PANEL 1: Project Basics — Futuristic Command Center =======
    if (panel.id === 'panel-1-basics') {
      const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
      const locCit = citations.find(c => c.cite_type === 'LOCATION');
      const workCit = citations.find(c => c.cite_type === 'WORK_TYPE');
      const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
      const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const teamCit = citations.find(c => c.cite_type === 'TEAM_SIZE') || citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
      const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
      const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
      const siteCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const demoCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');

      const allItems = [
        { key: 'Name', cit: nameCit, icon: '📋' },
        { key: 'Location', cit: locCit, icon: '📍' },
        { key: 'Work Type', cit: workCit, icon: '🔨' },
        { key: 'GFA', cit: gfaCit, icon: '📐' },
        { key: 'Trade', cit: tradeCit, icon: '🔧' },
        { key: 'Team', cit: teamCit, icon: '👥' },
        { key: 'Timeline', cit: timelineCit, icon: '📅' },
        { key: 'End Date', cit: endDateCit, icon: '🏁' },
      ];
      const filled = allItems.filter(i => !!i.cit).length;
      const completionPct = Math.round((filled / allItems.length) * 100);

      // Derive work type icon
      const workTypeValue = (workCit?.value as string) || workCit?.answer || '';
      const getWorkTypeIcon = () => {
        if (workTypeValue.includes('renovation') || workTypeValue.includes('Renovation')) return '🔨';
        if (workTypeValue.includes('new_construction') || workTypeValue.includes('New')) return '🏗️';
        if (workTypeValue.includes('demolition') || workTypeValue.includes('Demolition')) return '💥';
        if (workTypeValue.includes('addition') || workTypeValue.includes('Addition')) return '➕';
        if (workTypeValue.includes('repair') || workTypeValue.includes('Repair')) return '🔧';
        if (workTypeValue.includes('electrical') || workTypeValue.includes('Electrical')) return '⚡';
        if (workTypeValue.includes('plumbing') || workTypeValue.includes('Plumbing')) return '🚿';
        if (workTypeValue.includes('roofing') || workTypeValue.includes('Roofing')) return '🏠';
        if (workTypeValue.includes('landscaping') || workTypeValue.includes('Landscaping')) return '🌿';
        if (workTypeValue.includes('interior') || workTypeValue.includes('Interior')) return '🎨';
        if (workTypeValue.includes('exterior') || workTypeValue.includes('Exterior')) return '🧱';
        return '📐';
      };

      // Helper to render a data card — BRIGHT light palette with dark text
      const renderDataCard = (
        label: string,
        cit: Citation | undefined,
        fallback: string,
        icon: React.ReactNode,
        colorScheme: { border: string; bg: string; text: string; label: string; cite: string; glow: string },
        delay: number,
        badge?: React.ReactNode,
      ) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay }}
          className={cn(
            "rounded-xl border p-3.5 transition-all",
            cit
              ? `${colorScheme.border} ${colorScheme.bg}`
              : "border-gray-300/40 bg-gray-100/50 dark:border-slate-600/20 dark:bg-slate-800/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center text-lg",
              cit ? "bg-white/60 dark:bg-white/10 shadow-sm" : "bg-gray-200/50 dark:bg-slate-800/50"
            )}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-[10px] font-mono uppercase tracking-wider mb-0.5", cit ? colorScheme.label : "text-gray-400 dark:text-slate-500/50")}>{label}</p>
              <p className={cn("text-sm font-semibold truncate", cit ? colorScheme.text : "text-gray-400 dark:text-slate-500 italic")}>
                {(() => {
                  if (!cit) return fallback;
                  if (cit.cite_type === 'TIMELINE' && cit.metadata?.start_date) {
                    try { return format(parseISO(cit.metadata.start_date as string), 'MMM dd, yyyy'); } catch { return cit.answer || fallback; }
                  }
                  if (cit.cite_type === 'END_DATE' && typeof cit.value === 'string') {
                    try { return format(parseISO(cit.value), 'MMM dd, yyyy'); } catch { return cit.answer || fallback; }
                  }
                  if (cit.cite_type === 'GFA_LOCK' && typeof cit.value === 'number') {
                    return `${cit.value.toLocaleString()} ${cit.metadata?.gfa_unit || 'sq ft'}`;
                  }
                  return cit.answer || fallback;
                })()}
              </p>
              {cit && <p className={cn("text-[9px] font-mono mt-0.5", colorScheme.cite)}>cite: [{cit.id.slice(0, 12)}]</p>}
            </div>
            {badge}
            {cit && !badge && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn("w-2.5 h-2.5 rounded-full", colorScheme.glow)}
              />
            )}
          </div>
        </motion.div>
      );

      return (
        <div className="space-y-3">
          {/* Hero Project Identity Card — Bright Cyan/White */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-300 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 dark:from-cyan-900/40 dark:via-cyan-800/25 dark:to-sky-900/20 dark:border-cyan-400/30 p-5"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-cyan-200/40 dark:bg-cyan-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-sky-200/30 dark:bg-sky-400/8 blur-2xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300/70 mb-1">Project Identity</p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {nameCit?.answer || projectData?.name || '—'}
                  </h2>
                  {nameCit && (
                    <p className="text-[9px] text-cyan-500/70 dark:text-cyan-400/50 font-mono mt-1">cite: [{nameCit.id.slice(0, 12)}]</p>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 rounded-full border border-cyan-300 dark:border-cyan-400/20 flex items-center justify-center bg-cyan-100/60 dark:bg-cyan-400/5"
                >
                  <Building2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </motion.div>
              </div>

              {/* Completion Ring + All Data Integrity Badges */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="4" />
                    <motion.circle
                      cx="32" cy="32" r="28"
                      fill="none"
                      stroke="url(#brightCyanGrad)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - completionPct / 100) }}
                      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    />
                    <defs>
                      <linearGradient id="brightCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">{completionPct}%</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <p className="text-[10px] font-mono text-cyan-600/70 dark:text-cyan-400/50 uppercase tracking-wider">Data Integrity ({filled}/{allItems.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {allItems.map(item => (
                      <span
                        key={item.key}
                        className={cn(
                          "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[9px] font-medium transition-all",
                          item.cit
                            ? "border-cyan-400/50 bg-cyan-100/60 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                            : "border-gray-300/50 bg-gray-100/50 dark:border-slate-600/30 dark:bg-slate-800/30 text-gray-400 dark:text-slate-500"
                        )}
                      >
                        <span className="text-[8px]">{item.icon}</span>
                        {item.key}
                        {item.cit && <CheckCircle2 className="h-2 w-2 text-cyan-500 dark:text-cyan-400 ml-0.5" />}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Location Card — Bright Cyan */}
          {renderDataCard(
            'Project Location', locCit, projectData?.address || 'Not set',
            <MapPin className={cn("h-5 w-5", locCit ? "text-cyan-600 dark:text-cyan-400" : "text-gray-400")} />,
            { border: 'border-cyan-300 dark:border-cyan-400/25', bg: 'bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 dark:from-cyan-900/30 dark:via-slate-800/40 dark:to-blue-900/20', text: 'text-gray-800 dark:text-cyan-200', label: 'text-cyan-600/70 dark:text-cyan-400/50', cite: 'text-cyan-500/60 dark:text-cyan-500/40', glow: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' },
            0.1
          )}

          {/* Work Type Card — Bright Emerald/Lime */}
          {renderDataCard(
            'Work Type', workCit, 'Not selected',
            workCit ? <span className="text-xl">{getWorkTypeIcon()}</span> : <Hammer className="h-5 w-5 text-gray-400" />,
            { border: 'border-emerald-300 dark:border-emerald-400/25', bg: 'bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:from-emerald-900/30 dark:via-slate-800/40 dark:to-teal-900/20', text: 'text-gray-800 dark:text-emerald-200', label: 'text-emerald-600/70 dark:text-emerald-400/50', cite: 'text-emerald-500/60 dark:text-emerald-500/40', glow: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' },
            0.15,
            workCit ? <Badge className="text-[9px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20">Verified</Badge> : undefined
          )}

          {/* GFA Card — Bright Sky Blue */}
          {renderDataCard(
            'Gross Floor Area', gfaCit, 'Not locked',
            <Ruler className={cn("h-5 w-5", gfaCit ? "text-sky-600 dark:text-blue-400" : "text-gray-400")} />,
            { border: 'border-sky-300 dark:border-blue-400/25', bg: 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-blue-900/30 dark:via-slate-800/40 dark:to-indigo-900/20', text: 'text-gray-800 dark:text-blue-200', label: 'text-sky-600/70 dark:text-blue-400/50', cite: 'text-sky-500/60 dark:text-blue-500/40', glow: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' },
            0.2,
            gfaCit ? <Badge className="text-[9px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 gap-1 animate-pulse"><Lock className="h-2.5 w-2.5" />LOCKED</Badge> : undefined
          )}

          {/* Trade Card — Bright Orange/Fire */}
          {renderDataCard(
            'Trade Selection', tradeCit, 'Not selected',
            <Hammer className={cn("h-5 w-5", tradeCit ? "text-orange-600 dark:text-orange-400" : "text-gray-400")} />,
            { border: 'border-orange-300 dark:border-orange-400/25', bg: 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/30 dark:via-slate-800/40 dark:to-amber-900/20', text: 'text-gray-800 dark:text-orange-200', label: 'text-orange-600/70 dark:text-orange-400/50', cite: 'text-orange-500/60 dark:text-orange-500/40', glow: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' },
            0.25
          )}

          {/* Team Card — Bright Teal */}
          {renderDataCard(
            'Team', teamCit, `${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`,
            <Users className={cn("h-5 w-5", teamCit ? "text-teal-600 dark:text-teal-400" : "text-gray-400")} />,
            { border: 'border-teal-300 dark:border-teal-400/25', bg: 'bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-teal-900/30 dark:via-slate-800/40 dark:to-emerald-900/20', text: 'text-gray-800 dark:text-teal-200', label: 'text-teal-600/70 dark:text-teal-400/50', cite: 'text-teal-500/60 dark:text-teal-500/40', glow: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]' },
            0.3
          )}

          {/* Timeline Card — Bright Lemon/Yellow */}
          {renderDataCard(
            'Start Date', timelineCit, 'Not set',
            <Calendar className={cn("h-5 w-5", timelineCit ? "text-yellow-600 dark:text-indigo-400" : "text-gray-400")} />,
            { border: 'border-yellow-300 dark:border-indigo-400/25', bg: 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-indigo-900/30 dark:via-slate-800/40 dark:to-purple-900/20', text: 'text-gray-800 dark:text-indigo-200', label: 'text-yellow-600/70 dark:text-indigo-400/50', cite: 'text-yellow-500/60 dark:text-indigo-500/40', glow: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' },
            0.35
          )}

          {/* End Date Card — Bright Pink/Rose */}
          {renderDataCard(
            'End Date', endDateCit, 'Not set',
            <span className="text-lg">🏁</span>,
            { border: 'border-pink-300 dark:border-purple-400/25', bg: 'bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 dark:from-purple-900/30 dark:via-slate-800/40 dark:to-pink-900/20', text: 'text-gray-800 dark:text-purple-200', label: 'text-pink-600/70 dark:text-purple-400/50', cite: 'text-pink-500/60 dark:text-purple-500/40', glow: 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]' },
            0.4
          )}

          {/* Site Condition Card (if exists) */}
          {siteCit && renderDataCard(
            'Site Condition', siteCit, '',
            <Settings className="h-5 w-5 text-amber-400" />,
            { border: 'border-amber-400/25', bg: 'bg-gradient-to-br from-amber-900/30 via-slate-800/40 to-yellow-900/20', text: 'text-amber-200', label: 'text-amber-400/50', cite: 'text-amber-500/40', glow: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' },
            0.45
          )}

          {/* Template Lock Card (if exists) */}
          {templateCit && renderDataCard(
            'Template', templateCit, '',
            <ClipboardList className="h-5 w-5 text-pink-400" />,
            { border: 'border-pink-400/25', bg: 'bg-gradient-to-br from-pink-900/30 via-slate-800/40 to-rose-900/20', text: 'text-pink-200', label: 'text-pink-400/50', cite: 'text-pink-500/40', glow: 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]' },
            0.5
          )}

          {/* Demolition Price Card (if exists) */}
          {demoCit && renderDataCard(
            'Demolition Price', demoCit, '',
            <DollarSign className="h-5 w-5 text-red-400" />,
            { border: 'border-red-400/25', bg: 'bg-gradient-to-br from-red-900/30 via-slate-800/40 to-rose-900/20', text: 'text-red-200', label: 'text-red-400/50', cite: 'text-red-500/40', glow: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' },
            0.55
          )}

          {/* All Citations Footer */}
          {panelCitations.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-3 border-t border-cyan-500/10"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/50 mb-2">
                All Source Citations ({citations.length})
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {citations.filter(c => c.cite_type && c.answer).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[10px]">
                    <span className="text-cyan-300/60 font-mono">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cyan-200/80 truncate max-w-[160px]">{renderCitationValue(c)}</span>
                      <span className="text-cyan-500/40 font-mono">cite:[{c.id.slice(0, 6)}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      );
    }
    
    // ======= PANEL 2: Area & Dimensions — Vibrant Bright =======
    if (panel.id === 'panel-2-gfa') {
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const blueprintCitation = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      
      const hasGfaData = gfaCitation && (
        typeof gfaCitation.value === 'number' || 
        typeof gfaCitation.metadata?.gfa_value === 'number'
      );
      const gfaValue = typeof gfaCitation?.value === 'number' 
        ? gfaCitation.value 
        : typeof gfaCitation?.metadata?.gfa_value === 'number'
          ? gfaCitation.metadata.gfa_value
          : null;
      const gfaUnit = gfaCitation?.metadata?.gfa_unit || 'sq ft';
      
      const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number'
        ? templateCitation.metadata.waste_percent
        : (templateCitation?.metadata?.items as any[])?.find?.((item: any) => item.applyWaste)
          ? 10
          : null;

      // Derived metrics
      const grossArea = gfaValue && wastePercent ? Math.ceil(gfaValue * (1 + wastePercent / 100)) : null;
      const metricArea = gfaValue ? Math.round(gfaValue * 0.0929) : null;
      const estPerimeter = gfaValue ? Math.round(4 * Math.sqrt(gfaValue)) : null;
      const estRooms = gfaValue ? Math.max(1, Math.round(gfaValue / 200)) : null;
      const costPerSqFt = gfaValue && financialSummary?.total_cost ? (financialSummary.total_cost / gfaValue) : null;
      
      return (
        <div className="space-y-3">
          {/* GFA Hero Card — Bright Blue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5",
              hasGfaData
                ? "border-sky-300 dark:border-sky-500/30 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-900/40 dark:via-blue-900/30 dark:to-indigo-900/20"
                : "border-gray-200 dark:border-slate-700/30 bg-gray-50 dark:bg-slate-900/30"
            )}
          >
            {hasGfaData && <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-sky-200/50 dark:bg-sky-400/10 blur-3xl pointer-events-none" />}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className={cn("text-[10px] font-mono uppercase tracking-[0.2em]", hasGfaData ? "text-sky-600 dark:text-sky-300/70" : "text-gray-400")}>Gross Floor Area</p>
                {hasGfaData ? (
                  <Badge className="text-[9px] bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 gap-1 animate-pulse">
                    <Lock className="h-2.5 w-2.5" />LOCKED
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-gray-400">Not Set</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={cn("text-4xl font-black", hasGfaData ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-slate-600")}>
                  {gfaValue !== null ? gfaValue.toLocaleString() : '—'}
                </span>
                <span className={cn("text-lg font-medium", hasGfaData ? "text-sky-600/80 dark:text-sky-400/70" : "text-gray-400")}>{gfaUnit}</span>
              </div>
              {gfaCitation && <p className="text-[9px] text-sky-500/60 dark:text-sky-500/40 font-mono">cite: [{gfaCitation.id.slice(0, 12)}]</p>}
            </div>
          </motion.div>

          {/* Derived Metrics Grid — Colorful cards */}
          {gfaValue !== null && (
            <div className="grid grid-cols-2 gap-2.5">
              {/* Metric Conversion — Emerald */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                className="rounded-xl border border-emerald-300 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 p-3">
                <p className="text-[9px] font-mono uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/60 mb-1">Metric</p>
                <p className="text-lg font-bold text-gray-800 dark:text-emerald-200">{metricArea?.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50">sq m (m²)</p>
              </motion.div>

              {/* Estimated Perimeter — Orange */}
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                className="rounded-xl border border-orange-300 dark:border-orange-500/25 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 p-3">
                <p className="text-[9px] font-mono uppercase tracking-wider text-orange-600/70 dark:text-orange-400/60 mb-1">Est. Perimeter</p>
                <p className="text-lg font-bold text-gray-800 dark:text-orange-200">{estPerimeter?.toLocaleString()}</p>
                <p className="text-[10px] text-orange-600/60 dark:text-orange-400/50">linear ft</p>
              </motion.div>

              {/* Estimated Zones — Violet */}
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="rounded-xl border border-violet-300 dark:border-violet-500/25 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20 p-3">
                <p className="text-[9px] font-mono uppercase tracking-wider text-violet-600/70 dark:text-violet-400/60 mb-1">Est. Zones</p>
                <p className="text-lg font-bold text-gray-800 dark:text-violet-200">{estRooms}</p>
                <p className="text-[10px] text-violet-600/60 dark:text-violet-400/50">~200 sqft each</p>
              </motion.div>

              {/* Cost per sqft — Rose/Pink */}
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                className="rounded-xl border border-pink-300 dark:border-pink-500/25 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/20 p-3">
                <p className="text-[9px] font-mono uppercase tracking-wider text-pink-600/70 dark:text-pink-400/60 mb-1">Cost / sqft</p>
                <p className="text-lg font-bold text-gray-800 dark:text-pink-200">{costPerSqFt ? `$${costPerSqFt.toFixed(2)}` : '—'}</p>
                <p className="text-[10px] text-pink-600/60 dark:text-pink-400/50">{costPerSqFt ? 'projected' : 'pending'}</p>
              </motion.div>
            </div>
          )}

          {/* Waste Factor — Amber/Yellow */}
          {wastePercent !== null && gfaValue !== null && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-xl border border-yellow-300 dark:border-yellow-500/25 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/25 dark:to-amber-900/20 p-3.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-yellow-200">Waste Factor</span>
                </div>
                <Badge className="text-[9px] bg-yellow-200/60 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-400/40">+{wastePercent}%</Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-gray-800 dark:text-yellow-200">Gross: {grossArea?.toLocaleString()} {gfaUnit}</span>
                <span className="text-[10px] text-yellow-600/60 dark:text-yellow-400/50">({(grossArea! - gfaValue).toLocaleString()} extra)</span>
              </div>
              {templateCitation && <p className="text-[9px] text-yellow-500/50 font-mono mt-1">cite: [{templateCitation.id.slice(0, 12)}]</p>}
            </motion.div>
          )}
          
          {/* Blueprint — Teal */}
          {blueprintCitation && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="rounded-xl border border-teal-300 dark:border-teal-500/25 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/25 dark:to-cyan-900/20 p-3.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-teal-200">Blueprint</span>
                </div>
                <span className="text-[9px] text-teal-500/60 font-mono">cite: [{blueprintCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-teal-300/80 truncate">{String(blueprintCitation.metadata?.fileName || blueprintCitation.answer)}</p>
            </motion.div>
          )}
          
          {/* Site Condition — Red/Coral */}
          {siteConditionCitation && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="rounded-xl border border-red-300 dark:border-red-500/25 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/25 dark:to-rose-900/20 p-3.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-red-200">Site Condition</span>
                </div>
                <span className="text-[9px] text-red-500/60 font-mono">cite: [{siteConditionCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-red-200 capitalize">{siteConditionCitation.answer}</p>
            </motion.div>
          )}
        </div>
      );
    }
    
    // ======= PANEL 3: Trade & Template =======
    // ✓ CRITICAL: NO HARDCODED FALLBACKS - Dynamic label shows Sub-worktype from citations
    if (panel.id === 'panel-3-trade') {
      const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      const executionCitation = citations.find(c => c.cite_type === 'EXECUTION_MODE');
      const workTypeCitation = citations.find(c => c.cite_type === 'WORK_TYPE');
      
      // Debug log to trace citation data
      console.log('[Stage8] Panel 3 - Trade citations:', {
        tradeCitation: tradeCitation ? { answer: tradeCitation.answer, value: tradeCitation.value, metadata: tradeCitation.metadata } : null,
        templateCitation: templateCitation ? { answer: templateCitation.answer } : null,
        workTypeCitation: workTypeCitation ? { answer: workTypeCitation.answer, metadata: workTypeCitation.metadata } : null,
      });
      
      // ✓ NO DEFAULT FALLBACK: Only use actual citation data
      const hasTradeCitation = tradeCitation || workTypeCitation;
      
      // ✓ FIXED PRIORITY: TRADE_SELECTION answer contains specific trade like "Flooring", "Painting"
      // The value field has the key (flooring), answer field has the label (Flooring)
      const selectedTradeLabel = tradeCitation?.answer || null;  // "Flooring", "Painting", "Drywall"
      const selectedTradeKey = (tradeCitation?.value as string) 
        || (tradeCitation?.metadata?.trade_key as string)
        || null;  // "flooring", "painting", "drywall"
      
      // ✓ CRITICAL FIX: Do NOT use WORK_TYPE for template lookup
      // WORK_TYPE = parent category (e.g. "Interior Finishing")
      // TRADE_SELECTION = specific subwork type (e.g. "Flooring", "Painting")
      // Only TRADE_SELECTION determines which materials to show
      const workTypeAnswer = workTypeCitation?.answer || null;
      
      // ✓ Display label uses TRADE_SELECTION if available, falls back to WORK_TYPE for display only
      const displayLabel = selectedTradeLabel || workTypeAnswer || null;
      
      // ✓ CRITICAL: tradeKey for template lookup ONLY comes from TRADE_SELECTION, NOT WORK_TYPE
      // This ensures we don't show painting materials when user selected flooring
      const tradeKey = selectedTradeKey || null;
      
      console.log('[Stage8] Panel 3 - Resolved trade:', { displayLabel, tradeKey, hasTradeSelection: !!tradeCitation });
      
      // ✓ UNIVERSAL TEMPLATE GENERATOR: Trade-specifikus anyagszükséglet és task lista
      // Only calculate if we have actual TRADE_SELECTION data - NO FALLBACK from WORK_TYPE
      // ✓ GANTT-BASED PHASES: Demolition → Preparation → Installation → Finishing & QC (Stage 7 struktúra)
      
      interface PhaseTask {
        id: string;
        name: string;
        phaseName: string;
        phaseColor: string;
        phaseBgColor: string;
        verificationLabel?: string;
      }
      
      const getTemplateForTrade = (trade: string, gfa: number | null, hasDemolition: boolean = false) => {
        if (gfa === null || gfa === 0) {
          return { materials: [], phases: [], tasks: [], hasData: false };
        }
        
        const tradeLower = trade.toLowerCase().replace(/ /g, '_');
        
        // ✓ PHASE DEFINITIONS (aligned with Stage 7 Gantt)
        const PHASE_META = {
          demolition: { name: 'Demolition', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800' },
          preparation: { name: 'Preparation', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800' },
          installation: { name: 'Installation', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800' },
          finishing: { name: 'Finishing & QC', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30', borderColor: 'border-green-200 dark:border-green-800' },
        };
        
        // ✓ Templates are NEUTRAL - they show what the user selected as TRADE_SELECTION
        // Each template now has 4 phases with specific tasks
        const templates: Record<string, { 
          materials: {name: string; qty: number; unit: string}[]; 
          phases: { phaseId: string; tasks: string[]; verificationLabel: string }[];
        }> = {
          painting: {
            materials: [
              { name: 'Interior Paint (Premium)', qty: Math.ceil(gfa / 350), unit: 'gal' },
              { name: 'Primer', qty: Math.ceil(gfa / 400), unit: 'gal' },
              { name: 'Supplies (Brushes, Rollers, Tape)', qty: 1, unit: 'kit' },
              { name: 'Drop Cloths', qty: Math.ceil(gfa / 500), unit: 'pcs' },
              { name: 'Caulking', qty: Math.ceil(gfa / 300), unit: 'tubes' },
            ],
            phases: [
              { phaseId: 'demolition', tasks: ['Remove old wallpaper', 'Strip existing paint if needed'], verificationLabel: 'Site Clear Photo' },
              { phaseId: 'preparation', tasks: ['Surface cleaning', 'Patch holes & cracks', 'Sand surfaces', 'Mask & tape edges'], verificationLabel: 'Prep Complete Checklist' },
              { phaseId: 'installation', tasks: ['Apply primer coat', 'First paint coat', 'Second paint coat'], verificationLabel: 'Progress Photos' },
              { phaseId: 'finishing', tasks: ['Touch-ups', 'Edge refinement', 'Cleanup & remove covers'], verificationLabel: 'Final Inspection (OBC)' },
            ],
          },
          flooring: {
            materials: [
              { name: 'Hardwood Flooring', qty: gfa, unit: 'sq ft' },
              { name: 'Underlayment', qty: gfa, unit: 'sq ft' },
              { name: 'Transition Strips', qty: Math.ceil(gfa / 200), unit: 'pcs' },
              { name: 'Baseboards', qty: Math.round(4 * Math.sqrt(gfa) * 0.85), unit: 'ln ft' },
            ],
            phases: [
              { phaseId: 'demolition', tasks: ['Remove existing flooring', 'Remove old baseboards', 'Dispose debris'], verificationLabel: 'Site Clear Photo' },
              { phaseId: 'preparation', tasks: ['Inspect subfloor', 'Level & repair subfloor', 'Acclimate flooring materials', 'Install moisture barrier'], verificationLabel: 'Prep Complete Checklist' },
              { phaseId: 'installation', tasks: ['Install underlayment', 'Install flooring planks', 'Install transition strips'], verificationLabel: 'Progress Photos' },
              { phaseId: 'finishing', tasks: ['Install baseboards', 'Apply finishing touches', 'Final cleanup', 'Quality inspection'], verificationLabel: 'Final Inspection (OBC)' },
            ],
          },
          drywall: {
            materials: [
              { name: 'Drywall Sheets (4x8)', qty: Math.ceil(gfa / 32), unit: 'sheets' },
              { name: 'Joint Compound', qty: Math.ceil(gfa / 500), unit: 'buckets' },
              { name: 'Drywall Tape', qty: Math.ceil(gfa / 100), unit: 'rolls' },
              { name: 'Screws', qty: Math.ceil(gfa / 50), unit: 'boxes' },
            ],
            phases: [
              { phaseId: 'demolition', tasks: ['Remove old drywall', 'Clear debris', 'Inspect framing'], verificationLabel: 'Site Clear Photo' },
              { phaseId: 'preparation', tasks: ['Repair framing if needed', 'Install insulation', 'Mark stud locations', 'Prepare sheets'], verificationLabel: 'Prep Complete Checklist' },
              { phaseId: 'installation', tasks: ['Hang drywall sheets', 'Apply tape & first mud coat', 'Second mud coat', 'Third mud coat (finish)'], verificationLabel: 'Progress Photos' },
              { phaseId: 'finishing', tasks: ['Sand surfaces smooth', 'Prime drywall', 'Final inspection', 'Cleanup'], verificationLabel: 'Final Inspection (OBC)' },
            ],
          },
        };
        
        // Try exact match, then partial match
        const result = templates[tradeLower] 
          || templates[tradeLower.replace(/_/g, '')] 
          || Object.entries(templates).find(([key]) => tradeLower.includes(key))?.[1]
          || null;
        
        if (!result) {
          return { materials: [], phases: [], tasks: [], hasData: false };
        }
        
        // Filter out demolition phase if not needed, then build flat task list with phase info
        const activePhases = hasDemolition 
          ? result.phases 
          : result.phases.filter(p => p.phaseId !== 'demolition');
        
        // Build task list with phase metadata for UI rendering
        const allTasks: PhaseTask[] = [];
        activePhases.forEach(phase => {
          const meta = PHASE_META[phase.phaseId as keyof typeof PHASE_META];
          phase.tasks.forEach((taskName, idx) => {
            allTasks.push({
              id: `${phase.phaseId}_${idx}`,
              name: taskName,
              phaseName: meta.name,
              phaseColor: meta.color,
              phaseBgColor: meta.bgColor,
            });
          });
          // Add verification node at end of phase
          allTasks.push({
            id: `${phase.phaseId}_verify`,
            name: phase.verificationLabel,
            phaseName: meta.name,
            phaseColor: meta.color,
            phaseBgColor: meta.bgColor,
            verificationLabel: phase.verificationLabel,
          });
        });
        
        // Legacy flat tasks array for backward compatibility
        const flatTasks = allTasks.map(t => t.name);
          
        return { 
          materials: result.materials, 
          phases: activePhases.map(p => ({ ...p, meta: PHASE_META[p.phaseId as keyof typeof PHASE_META] })),
          tasks: flatTasks, // Legacy compatibility
          phaseTasks: allTasks, // New structured format
          hasData: true,
        };
      };
      
      // Get GFA for template calculation - NO FALLBACK
      const templateGfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const templateGfaValue = typeof templateGfaCitation?.value === 'number' 
        ? templateGfaCitation.value 
        : typeof templateGfaCitation?.metadata?.gfa_value === 'number'
          ? templateGfaCitation.metadata.gfa_value
          : null; // ✓ NO HARDCODED FALLBACK
      
      // ✓ WASTE FACTOR from TEMPLATE_LOCK citation metadata
      const panelWastePercent = typeof templateCitation?.metadata?.waste_percent === 'number'
        ? templateCitation.metadata.waste_percent
        : (templateCitation?.metadata?.items as any[])?.some?.((item: any) => item.applyWaste)
          ? 10 // default if template has waste items but no explicit waste_percent
          : 0;
      
      const tradeTemplate = tradeKey 
        ? getTemplateForTrade(tradeKey, templateGfaValue)
        : { materials: [], tasks: [], hasData: false };
      
      // ✓ APPLY WASTE TO MATERIALS
      const materialsWithWaste = tradeTemplate.materials.map(mat => {
        // Apply waste to area-based materials
        const applyWaste = mat.unit === 'sq ft' || mat.unit === 'ln ft' || mat.unit === 'sheets' || mat.unit === 'rolls';
        if (applyWaste && panelWastePercent > 0) {
          return {
            ...mat,
            qty: Math.ceil(mat.qty * (1 + panelWastePercent / 100)),
            hasWaste: true,
          };
        }
        return { ...mat, hasWaste: false };
      });
      
      // ✓ Get the BEST citation source for the cite badge
      const bestCitationSource = tradeCitation || workTypeCitation;
      
      // ✓ Derived data for richer display
      const materialCount = materialsWithWaste.length;
      const totalUnitsNeeded = materialsWithWaste.reduce((sum, m) => sum + m.qty, 0);
      const wastedMaterials = materialsWithWaste.filter(m => m.hasWaste).length;
      const executionLabel = executionCitation?.answer || null;
      
      return (
        <div className="space-y-3">
          {/* ✓ TRADE HEADER - Vibrant Orange/Amber gradient */}
          <div className={cn(
            "p-4 rounded-xl border-2 relative overflow-hidden",
            hasTradeCitation
              ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-yellow-950/30 border-orange-300 dark:border-orange-500/40"
              : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 border-gray-200/50 border-dashed"
          )}>
            {hasTradeCitation && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-200/40 to-transparent dark:from-orange-500/10 rounded-bl-3xl" />
            )}
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                hasTradeCitation ? "text-orange-600 dark:text-orange-400" : "text-gray-500"
              )}>
                {displayLabel ? '⚡ Selected Trade' : 'Trade'}
              </span>
              {hasTradeCitation ? (
                <Badge className="text-[10px] bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border border-orange-300/50">
                  ✓ Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-500">Not Set</Badge>
              )}
            </div>
            <p className={cn(
              "text-2xl font-black capitalize tracking-tight",
              hasTradeCitation ? "text-gray-900 dark:text-orange-100" : "text-gray-400"
            )}>
              {displayLabel || '—'}
            </p>
            {templateGfaValue !== null && (
              <p className="text-[10px] text-orange-600/70 dark:text-orange-400/60 mt-1 font-medium">
                @ {templateGfaValue.toLocaleString()} sq ft coverage
              </p>
            )}
            {bestCitationSource && (
              <p className="text-[10px] text-orange-500 mt-1 font-mono">
                cite: [{bestCitationSource.id.slice(0, 12)}]
              </p>
            )}
          </div>

          {/* ✓ STATS ROW - Colorful metric cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* Material Count - Lime */}
            <div className="rounded-xl border border-lime-300 dark:border-lime-500/30 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/40 dark:to-green-950/30 p-2.5 text-center">
              <p className="text-[9px] font-mono uppercase text-lime-600 dark:text-lime-400 tracking-wide">Materials</p>
              <p className="text-xl font-black text-gray-900 dark:text-lime-200">{materialCount}</p>
              <p className="text-[8px] text-lime-600/60 dark:text-lime-400/50">items</p>
            </div>
            {/* Total Units - Sky */}
            <div className="rounded-xl border border-sky-300 dark:border-sky-500/30 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/30 p-2.5 text-center">
              <p className="text-[9px] font-mono uppercase text-sky-600 dark:text-sky-400 tracking-wide">Total Qty</p>
              <p className="text-xl font-black text-gray-900 dark:text-sky-200">{totalUnitsNeeded.toLocaleString()}</p>
              <p className="text-[8px] text-sky-600/60 dark:text-sky-400/50">units</p>
            </div>
            {/* Waste Applied - Amber */}
            <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 p-2.5 text-center">
              <p className="text-[9px] font-mono uppercase text-amber-600 dark:text-amber-400 tracking-wide">Waste</p>
              <p className="text-xl font-black text-gray-900 dark:text-amber-200">+{panelWastePercent}%</p>
              <p className="text-[8px] text-amber-600/60 dark:text-amber-400/50">{wastedMaterials} items</p>
            </div>
          </div>
          
          {/* ✓ MATERIAL REQUIREMENTS - Vibrant list */}
          {tradeTemplate.hasData && materialsWithWaste.length > 0 && (
            <div className="rounded-xl border-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50/80 to-indigo-50/80 dark:from-violet-950/30 dark:to-indigo-950/20 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                    <ClipboardList className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 dark:text-violet-200">Material Requirements</span>
                </div>
                {templateCitation && (
                  <span className="text-[10px] text-violet-500 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>
                )}
              </div>
              <div className="space-y-1.5">
                {materialsWithWaste.map((mat, idx) => {
                  const materialPending = pendingChanges.find(
                    pc => pc.item_id === `material_${idx}` && pc.status === 'pending'
                  );
                  const isForeman = userRole === 'foreman' || userRole === 'subcontractor';
                  // Alternate row colors for visual interest
                  const rowColors = [
                    'bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30',
                    'bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-200/50 dark:border-cyan-800/30',
                    'bg-lime-50/60 dark:bg-lime-950/20 border-lime-200/50 dark:border-lime-800/30',
                    'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30',
                    'bg-violet-50/60 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-800/30',
                  ];
                  const rowColor = rowColors[idx % rowColors.length];
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex items-center justify-between text-xs group p-2 rounded-lg border",
                        materialPending ? "bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-400" : rowColor
                      )}
                    >
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{mat.name}</span>
                        {mat.hasWaste && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                            +{panelWastePercent}%
                          </Badge>
                        )}
                        {materialPending && (
                          <PendingChangeBadge status="pending" compact />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{mat.qty.toLocaleString()} {mat.unit}</span>
                        {isForeman && !materialPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newQty = prompt(`Request modification for ${mat.name}\nCurrent: ${mat.qty} ${mat.unit}\nEnter new quantity:`);
                              if (newQty && !isNaN(Number(newQty))) {
                                createPendingChange({
                                  itemType: 'material',
                                  itemId: `material_${idx}`,
                                  itemName: mat.name,
                                  originalQuantity: mat.qty,
                                  newQuantity: Number(newQty),
                                  changeReason: 'Field adjustment by Foreman',
                                });
                              }
                            }}
                          >
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* No Data */}
          {!tradeTemplate.hasData && (
            <div className="p-4 rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800/30 text-center bg-gradient-to-br from-orange-50/30 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/10">
              <Hammer className="h-8 w-8 text-orange-300 dark:text-orange-600 mx-auto mb-2" />
              <p className="text-xs text-orange-600/80 dark:text-orange-400/60 italic">
                {!tradeCitation && workTypeCitation
                  ? 'Select a specific trade (Flooring, Painting, Drywall) in Definition stage' 
                  : !hasTradeCitation 
                    ? 'No trade selected in wizard' 
                    : templateGfaValue === null
                      ? 'GFA required to calculate materials'
                      : 'Template will appear after trade selection'}
              </p>
            </div>
          )}
          
          {/* Template Locked - Teal */}
          {templateCitation && (
            <div className="p-3 rounded-xl border-2 border-teal-200 dark:border-teal-500/30 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-gray-800 dark:text-teal-200">Template Locked</span>
                </div>
                <span className="text-[10px] text-teal-500 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-teal-100">{templateCitation.answer}</p>
            </div>
          )}
          
          {/* Execution Mode - Red/Orange */}
          {executionCitation && (
            <div className="p-3 rounded-xl border-2 border-red-200 dark:border-red-500/30 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-bold text-gray-800 dark:text-red-200">Execution Mode</span>
                </div>
                <span className="text-[10px] text-red-500 font-mono">cite: [{executionCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-bold capitalize text-gray-900 dark:text-red-100">{executionCitation.answer}</p>
            </div>
          )}
          
          {/* All Citations - Indigo */}
          {panelCitations.length > 0 && (
            <div className="pt-3 border-t border-indigo-200/50 dark:border-indigo-800/30 space-y-2">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">All Citations</p>
              {panelCitations.map(c => (
                <div key={c.id} className="group text-xs flex items-center justify-between p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30">
                  <span className="text-indigo-700/70 dark:text-indigo-400/70 font-medium">{c.cite_type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 dark:text-indigo-200">{renderCitationValue(c)}</span>
                    <span className="text-[10px] text-indigo-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    switch (panel.id) {
      case 'panel-4-team':
        // ✓ TEAM TRIGGER PREPARATION: Kommunikációs modul aktiválása
        // ✓ PERSISTENCE GUARD: Force sync before navigation
        const handleTeamCommunication = () => {
          // Force full save before navigating to Messages
          if (projectId && citations.length > 0) {
            const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
            const gfaValue = typeof gfaCitation?.value === 'number' 
              ? gfaCitation.value 
              : typeof gfaCitation?.metadata?.gfa_value === 'number'
                ? gfaCitation.metadata.gfa_value
                : 0;
            syncCitationsToLocalStorage(projectId, citations, 8, gfaValue);
            console.log('[Stage8] ✓ Persistence Guard: Citations synced before navigation');
          }
          // Navigate to messages with project context (fresh chat)
          window.location.href = `/buildunion/messages?project=${projectId}`;
        };
        
        // ✓ PERSISTENCE GUARD for individual member messaging
        const handleMemberMessage = (memberId: string) => {
          if (projectId && citations.length > 0) {
            const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
            const gfaValue = typeof gfaCitation?.value === 'number' 
              ? gfaCitation.value 
              : typeof gfaCitation?.metadata?.gfa_value === 'number'
                ? gfaCitation.metadata.gfa_value
                : 0;
            syncCitationsToLocalStorage(projectId, citations, 8, gfaValue);
            console.log('[Stage8] ✓ Persistence Guard: Citations synced before member message');
          }
          window.location.href = `/buildunion/messages?user=${memberId}&project=${projectId}`;
        };
        
        // Get team-related citations
        const teamStructureCitation = citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
        const teamSizeCitation = citations.find(c => c.cite_type === 'TEAM_SIZE');
        const teamInviteCitation = citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');
        
        // Derived stats
        const roleCounts = teamMembers.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);
        const uniqueRoles = Object.keys(roleCounts).length;
        
        return (
          <div className="space-y-3">
            {/* ─── Header - Vibrant teal/emerald light ─── */}
            <div className="flex items-center justify-between p-3 rounded-xl border-2 border-teal-300 dark:border-teal-700 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/40 shadow-md">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={{ boxShadow: ['0 0 8px rgba(16,185,129,0.3)', '0 0 18px rgba(16,185,129,0.5)', '0 0 8px rgba(16,185,129,0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md"
                >
                  <Users className="h-4 w-4 text-white" />
                </motion.div>
                <div>
                  <span className="text-xs font-black text-teal-800 dark:text-teal-200 tracking-tight">Team Command</span>
                  <p className="text-[8px] text-teal-600 dark:text-teal-400">{teamMembers.length} operative{teamMembers.length !== 1 ? 's' : ''} deployed</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600 text-[9px] px-1.5 py-0 gap-1 shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </Badge>
            </div>
            
            {/* Stats Row - Light vibrant cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border-2 border-cyan-300 dark:border-cyan-700 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 p-2.5 text-center shadow-sm">
                <p className="text-[9px] font-mono uppercase text-cyan-600 dark:text-cyan-400 tracking-wide">Members</p>
                <p className="text-xl font-black text-cyan-800 dark:text-cyan-200">{teamMembers.length}</p>
              </div>
              <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-2.5 text-center shadow-sm">
                <p className="text-[9px] font-mono uppercase text-amber-600 dark:text-amber-400 tracking-wide">Roles</p>
                <p className="text-xl font-black text-amber-800 dark:text-amber-200">{uniqueRoles}</p>
              </div>
              <div className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-2.5 text-center shadow-sm">
                <p className="text-[9px] font-mono uppercase text-violet-600 dark:text-violet-400 tracking-wide">Status</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">Online</p>
              </div>
            </div>
            
            {/* Team Size Citation */}
            {teamSizeCitation && (
              <div className="p-2.5 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold">Team Size</span>
                  <span className="text-[8px] text-indigo-400 dark:text-indigo-500 font-mono">[{teamSizeCitation.id.slice(0, 8)}]</span>
                </div>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 mt-0.5">{renderCitationValue(teamSizeCitation)}</p>
              </div>
            )}
            
            {/* Member Cards - Alternating dark backgrounds */}
            {teamMembers.length === 0 ? (
              <div className="p-4 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-center bg-teal-50/50 dark:bg-teal-950/20">
                <Users className="h-6 w-6 text-teal-400 mx-auto mb-1.5" />
                <p className="text-[10px] text-teal-600 dark:text-teal-400">No team members added</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {teamMembers.map((member, idx) => {
                  const roleColors: Record<string, string> = {
                    owner: 'from-amber-500 to-orange-600',
                    foreman: 'from-emerald-500 to-teal-600',
                    worker: 'from-blue-500 to-indigo-600',
                    inspector: 'from-violet-500 to-purple-600',
                    subcontractor: 'from-cyan-500 to-blue-600',
                    member: 'from-gray-500 to-slate-600',
                  };
                  const rowBgs = [
                    'border-emerald-200 dark:border-emerald-700/30 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/20 dark:to-teal-950/20',
                    'border-cyan-200 dark:border-cyan-700/30 bg-gradient-to-r from-cyan-50/80 to-sky-50/60 dark:from-cyan-950/20 dark:to-sky-950/20',
                    'border-amber-200 dark:border-amber-700/30 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20',
                    'border-violet-200 dark:border-violet-700/30 bg-gradient-to-r from-violet-50/80 to-indigo-50/60 dark:from-violet-950/20 dark:to-indigo-950/20',
                    'border-lime-200 dark:border-lime-700/30 bg-gradient-to-r from-lime-50/80 to-green-50/60 dark:from-lime-950/20 dark:to-green-950/20',
                  ];
                  const gradient = roleColors[member.role] || roleColors.member;
                  const rowBg = rowBgs[idx % rowBgs.length];
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn("flex items-center justify-between p-2 rounded-xl border-2 transition-colors group hover:shadow-md", rowBg)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shadow-md", gradient)}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">{member.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-teal-600 dark:text-teal-400 capitalize font-medium">{member.role}</span>
                            {teamInviteCitation && idx === 0 && (
                              <span className="text-[7px] text-teal-500/60 dark:text-teal-400/50 font-mono">[{teamInviteCitation.id.slice(0, 6)}]</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            
            {/* ─── In-Panel Project Chat ─── */}
            {teamMembers.length > 0 && (
              <TeamChatPanel
                projectId={projectId}
                userId={userId}
                teamMembers={teamMembers}
                compact={true}
                defaultCollapsed={true}
                onDocumentAdded={async () => {
                  const { data: newDocs } = await supabase
                    .from('project_documents')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('uploaded_at', { ascending: false });
                  if (newDocs) {
                    setDocuments(newDocs.map(doc => ({
                      id: doc.id,
                      file_name: doc.file_name,
                      file_path: doc.file_path,
                      category: categorizeDocument(doc.file_name),
                      uploadedAt: doc.uploaded_at,
                    })));
                  }
                }}
              />
            )}
            
            {/* Citations - Light indigo */}
            {panelCitations.length > 0 && (
              <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700/30 space-y-1">
                <p className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold mb-1">Citations ({panelCitations.length})</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700/30">
                    <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-indigo-800 dark:text-indigo-200">{renderCitationValue(c)}</span>
                      <span className="text-[7px] text-indigo-400 dark:text-indigo-500 font-mono">[{c.id.slice(0, 6)}]</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'panel-5-timeline':
        return renderPanel5Content();
      
      case 'panel-6-documents':
        return renderPanel6Content();
      
      case 'panel-7-weather':
        // ✓ Weather widget + Map - Read from LOCATION citation, NO hardcoded fallback
        const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
        const siteCondCitationWeather = citations.find(c => c.cite_type === 'SITE_CONDITION');
        const hasLocationData = locationCitation?.answer || projectData?.address;
        const weatherAddress = locationCitation?.answer || projectData?.address || null;
        const mapLat = (locationCitation?.metadata?.coordinates as any)?.lat;
        const mapLon = (locationCitation?.metadata?.coordinates as any)?.lng;
        
        return (
          <div className="space-y-4">
            {/* ─── Futuristic Header Bar ─── */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <span className={cn(
                    "text-xs font-semibold block",
                    hasLocationData ? "text-sky-700 dark:text-sky-300" : "text-gray-500"
                  )}>
                    {weatherAddress || 'No location set'}
                  </span>
                  {mapLat && mapLon && (
                    <span className="text-[10px] text-sky-500 dark:text-sky-400 font-mono">
                      {Number(mapLat).toFixed(4)}°N, {Number(mapLon).toFixed(4)}°W
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {locationCitation && (
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono bg-sky-100 dark:bg-sky-900/30 px-1.5 py-0.5 rounded">cite:[{locationCitation.id.slice(0, 6)}]</span>
                )}
                {siteCondCitationWeather && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Hammer className="h-2.5 w-2.5" /> {siteCondCitationWeather.answer}
                  </span>
                )}
              </div>
            </div>

            {/* ─── Split View: Weather + Map ─── */}
            {weatherAddress ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left: Weather Data */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border-2 border-sky-200 dark:border-sky-700 bg-gradient-to-b from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-sky-200 dark:border-sky-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Live Weather</span>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  </div>
                  <div className="p-2">
                    <WeatherWidget
                      location={weatherAddress}
                      showForecast={true}
                      className="border-0 shadow-none bg-transparent"
                    />
                  </div>
                </motion.div>

                {/* Right: Map */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border-2 border-sky-200 dark:border-sky-700 bg-gradient-to-b from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-sky-200 dark:border-sky-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Site Location</span>
                    </div>
                    <button
                      onClick={() => setWeatherModalOpen(true)}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors flex items-center gap-1"
                    >
                      <Maximize2 className="h-3 w-3" /> Expand
                    </button>
                  </div>
                  {mapLat && mapLon ? (
                    <div className="relative h-[280px]">
                      <iframe
                        title="Project Location Map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps?q=${mapLat},${mapLon}&z=16&output=embed`}
                      />
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-sky-200/10 via-transparent to-cyan-200/10" />
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/60 dark:from-slate-900/80 to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center bg-sky-50/50 dark:bg-sky-950/20">
                      <div className="text-center text-sky-500 dark:text-sky-400">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Coordinates not available</p>
                        <p className="text-[10px] mt-1 opacity-60">Map requires lat/lon from geocoding</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border-2 border-dashed border-sky-300 dark:border-sky-700 text-center">
                <Cloud className="h-10 w-10 text-sky-400 mx-auto mb-3" />
                <p className="text-sm text-sky-600 dark:text-sky-400 font-medium">No Location Data</p>
                <p className="text-xs text-sky-500 dark:text-sky-500/60 mt-1">Set a project address to enable weather & map</p>
              </div>
            )}
            
            {/* ─── Citations Footer ─── */}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t border-sky-200 dark:border-sky-700/30 space-y-1.5">
                <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-widest">Data Sources</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-700/30 text-xs">
                    <span className="text-sky-600 dark:text-sky-400">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sky-800 dark:text-sky-300">{renderCitationValue(c)}</span>
                      <span className="text-[9px] text-sky-500 dark:text-sky-500/60 font-mono">cite:[{c.id.slice(0, 6)}]</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'panel-8-financial':
        // CRITICAL: Strictly Owner-only - Foreman/Subcontractor see lock
        if (!canViewFinancials) {
          // Foreman/Subcontractor lock screen with pending changes info
          const canRequestModification = userRole === 'foreman' || userRole === 'subcontractor';
          
          return (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-3">
                <LockKeyhole className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Financial Data Locked</p>
              <p className="text-xs text-muted-foreground mt-1">Only the project Owner can view financial information</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                Your role: <span className="font-medium capitalize">{userRole}</span>
              </p>
              
              {/* Show pending changes for Foreman */}
              {canRequestModification && myPendingChanges.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                    Your Pending Modifications
                  </p>
                  <div className="space-y-1">
                    {myPendingChanges.slice(0, 3).map(change => (
                      <div key={change.id} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[150px]">{change.item_name}</span>
                        <PendingChangeBadge status={change.status} compact />
                      </div>
                    ))}
                    {myPendingChanges.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{myPendingChanges.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }
        
        // ✓ Owner view - Read from citations, contracts, AND project_summaries
        const totalContractValue = contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        const budgetCitation = panelCitations.find(c => c.cite_type === 'BUDGET');
        const materialCitation = panelCitations.find(c => c.cite_type === 'MATERIAL');
        const demoPriceCitation = panelCitations.find(c => c.cite_type === 'DEMOLITION_PRICE');
        const financialGfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
        
        // ✓ NO HARDCODED FALLBACK - read actual values
        const financialGfaValue = typeof financialGfaCitation?.value === 'number' 
          ? financialGfaCitation.value 
          : typeof financialGfaCitation?.metadata?.gfa_value === 'number'
            ? financialGfaCitation.metadata.gfa_value
            : null;
        
        // ✓ Calculate totals from project_summaries OR citations
        const storedMaterialCost = financialSummary?.material_cost;
        const storedLaborCost = financialSummary?.labor_cost;
        const storedTotalCost = financialSummary?.total_cost;
        
        const materialCost = storedMaterialCost ?? (
          typeof materialCitation?.value === 'number' 
            ? materialCitation.value 
            : typeof materialCitation?.metadata?.total === 'number'
              ? materialCitation.metadata.total
              : null
        );
        
        const laborCost = storedLaborCost ?? null;
        
        const demoCost = typeof demoPriceCitation?.value === 'number' && financialGfaValue
          ? demoPriceCitation.value * financialGfaValue
          : null;
        
        const budgetTotal = storedTotalCost ?? (
          typeof budgetCitation?.value === 'number'
            ? budgetCitation.value
            : totalContractValue > 0 
              ? totalContractValue 
              : null
        );
        
        // ✗ Profit calculation DISABLED - must be manually set, never auto-calculated
        const calculatedExpenses = (materialCost || 0) + (laborCost || 0) + (demoCost || 0);
        // Profit is always null - no automatic calculation from team data
        const profitMargin: number | null = null;
        const profitPercent: number | null = null;
        
        const hasFinancialData = budgetTotal !== null || materialCost !== null || laborCost !== null || totalContractValue > 0;
        
        // ✓ REGIONAL TAX CALCULATION for card view
        const cardLocationCitation = citations.find(c => c.cite_type === 'LOCATION');
        const cardLocationAddress = typeof cardLocationCitation?.answer === 'string' 
          ? cardLocationCitation.answer 
          : typeof cardLocationCitation?.metadata?.formatted_address === 'string'
            ? cardLocationCitation.metadata.formatted_address
            : '';
        const getCardTaxRate = (address: string): { rate: number; name: string; province: string } => {
          const a = address.toLowerCase();
          if (a.includes('ontario') || a.includes(', on') || a.includes('toronto')) return { rate: 0.13, name: 'HST', province: 'Ontario' };
          if (a.includes('quebec') || a.includes(', qc') || a.includes('montreal')) return { rate: 0.14975, name: 'GST+QST', province: 'Quebec' };
          if (a.includes('british columbia') || a.includes(', bc') || a.includes('vancouver')) return { rate: 0.12, name: 'GST+PST', province: 'BC' };
          if (a.includes('alberta') || a.includes(', ab') || a.includes('calgary') || a.includes('edmonton')) return { rate: 0.05, name: 'GST', province: 'Alberta' };
          return { rate: 0.13, name: 'HST', province: 'Ontario' };
        };
        const cardTax = getCardTaxRate(cardLocationAddress);
        const cardNet = budgetTotal || totalContractValue || 0;
        const cardTaxAmt = cardNet * cardTax.rate;
        const cardGross = cardNet + cardTaxAmt;

        // Simulated trend data from project creation to now
        const trendData = (() => {
          if (!hasFinancialData) return [];
          const mat = materialCost || 0;
          const lab = laborCost || 0;
          const demo = demoCost || 0;
          // Build a simple 5-point cumulative cost curve
          return [
            { label: 'W1', value: 0 },
            { label: 'W2', value: Math.round(mat * 0.3) },
            { label: 'W3', value: Math.round(mat * 0.6 + lab * 0.2) },
            { label: 'W4', value: Math.round(mat * 0.9 + lab * 0.5 + demo * 0.5) },
            { label: 'Now', value: Math.round(mat + lab + demo) },
          ];
        })();

        const costItems = [
          materialCost !== null && { name: 'Materials', value: materialCost, color: 'hsl(200, 80%, 50%)', icon: Hammer },
          laborCost !== null && { name: 'Labor', value: laborCost, color: 'hsl(160, 80%, 45%)', icon: Users },
          demoCost !== null && demoCost > 0 && { name: 'Demo', value: demoCost, color: 'hsl(280, 70%, 55%)', icon: AlertTriangle },
        ].filter(Boolean) as { name: string; value: number; color: string; icon: any }[];
        const costTotal = costItems.reduce((s, i) => s + i.value, 0);
        
        return (
          <div className="space-y-3">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between p-2 rounded-lg border border-amber-500/25 bg-gradient-to-r from-amber-950/30 via-orange-950/20 to-amber-950/30">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ boxShadow: ['0 0 8px rgba(251,191,36,0.2)', '0 0 16px rgba(251,191,36,0.4)', '0 0 8px rgba(251,191,36,0.2)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-7 w-7 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"
                >
                  <DollarSign className="h-4 w-4 text-white" />
                </motion.div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-100">Financial DNA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-amber-700 dark:text-amber-300/80 bg-amber-500/15 px-1.5 py-0.5 rounded font-mono">{cardTax.province}</span>
                <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 text-[9px] px-1.5 py-0 gap-0.5">
                  <Unlock className="h-2 w-2" /> Owner
                </Badge>
                {hasPending && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPendingApprovalModal(true)}
                    className="h-5 px-1.5 text-[9px] text-amber-400 hover:bg-amber-500/10 gap-0.5 animate-pulse"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" /> {pendingCount}
                  </Button>
                )}
              </div>
            </div>

            {hasFinancialData ? (
              <>
                {/* ─── Net / Tax / Gross Row ─── */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-2 rounded-lg border border-amber-500/15 bg-gradient-to-br from-amber-950/20 to-orange-950/10">
                    <span className="text-[8px] text-amber-700 dark:text-amber-200/80 uppercase tracking-widest font-semibold flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-amber-600 dark:bg-amber-300/60" /> Net
                    </span>
                    <p className="text-sm font-bold text-amber-950 dark:text-white font-mono mt-0.5">
                      ${cardNet.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-950/15">
                    <span className="text-[8px] text-amber-700 dark:text-amber-300/80 uppercase tracking-widest font-semibold flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-amber-600 dark:bg-amber-400/50" /> {cardTax.name}
                    </span>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 font-mono mt-0.5">
                      +${cardTaxAmt.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg border border-emerald-500/25 bg-emerald-950/15">
                    <span className="text-[8px] text-emerald-700 dark:text-emerald-300/80 uppercase tracking-widest font-semibold flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" /> Gross
                    </span>
                    <p className="text-sm font-black text-emerald-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-emerald-300 dark:to-teal-300 font-mono mt-0.5">
                      ${cardGross.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* ─── Cost Breakdown Bars ─── */}
                {costItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full overflow-hidden flex bg-amber-900/20">
                      {costItems.map((item) => (
                        <div
                          key={item.name}
                          style={{ width: costTotal > 0 ? `${(item.value / costTotal) * 100}%` : '0%', backgroundColor: item.color }}
                          className="h-full first:rounded-l-full last:rounded-r-full"
                        />
                      ))}
                    </div>
                    {costItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.name} className="flex items-center justify-between p-1.5 rounded-md bg-gradient-to-r from-amber-950/15 to-orange-950/10 border border-amber-500/10">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: `${item.color}22` }}>
                              <Icon className="h-2.5 w-2.5" style={{ color: item.color }} />
                            </div>
                            <span className="text-[10px] font-medium text-amber-900 dark:text-white/90">{item.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-amber-950 dark:text-white font-mono">${item.value.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ─── Cost Trend Mini Chart ─── */}
                {trendData.length > 0 && (() => {
                  const maxVal = Math.max(...trendData.map(d => d.value), 1);
                  const chartPoints = trendData.map((d, i) => ({
                    x: (i / (trendData.length - 1)) * 200,
                    y: 55 - (d.value / maxVal) * 50,
                    ...d,
                  }));
                  return (
                    <div className="p-2.5 rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-orange-950/10 to-yellow-950/15">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-amber-800 dark:text-amber-300/90 uppercase tracking-widest font-semibold">Cost Trend</span>
                        <span className="text-[9px] text-amber-700 dark:text-amber-200/80 font-mono">${(trendData[trendData.length - 1]?.value || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-16 w-full relative group/trend">
                        <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
                          {[0, 20, 40, 60].map(y => (
                            <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(251,191,36,0.08)" strokeWidth="0.5" />
                          ))}
                          <path d={`M0,55 L${chartPoints.map(p => `${p.x},${p.y}`).join(' L')} L200,55 Z`} fill="url(#cardTrendGrad)" opacity="0.35" />
                          <path d={`M${chartPoints.map(p => `${p.x},${p.y}`).join(' L')}`} fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.5" strokeLinecap="round" />
                          {chartPoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={i === chartPoints.length - 1 ? 3 : 1.5}
                                fill={i === chartPoints.length - 1 ? '#f59e0b' : 'rgba(251,191,36,0.5)'}
                                className="transition-all duration-200"
                              />
                              {/* Invisible hover target */}
                              <circle cx={p.x} cy={p.y} r="12" fill="transparent" className="cursor-pointer">
                                <title>{p.label}: ${p.value.toLocaleString()}</title>
                              </circle>
                            </g>
                          ))}
                          <defs>
                            <linearGradient id="cardTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(251,191,36,0.4)" />
                              <stop offset="100%" stopColor="rgba(251,191,36,0)" />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* HTML Tooltip overlays */}
                        <div className="absolute inset-0 flex justify-between items-start pointer-events-none">
                          {chartPoints.map((p, i) => {
                            const leftPct = (p.x / 200) * 100;
                            const topPct = (p.y / 60) * 100;
                            return (
                              <div
                                key={i}
                                className="absolute pointer-events-auto group/dot"
                                style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
                              >
                                <div className="w-6 h-6 rounded-full cursor-pointer" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md bg-amber-900/95 border border-amber-500/40 text-[9px] font-mono text-amber-100 whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150 shadow-lg shadow-amber-900/50 pointer-events-none z-10">
                                  {p.label}: <span className="font-bold text-amber-300">${p.value.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-between mt-0.5">
                        {trendData.map(d => (
                          <span key={d.label} className="text-[7px] text-amber-700 dark:text-amber-300/70 font-mono">{d.label}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ─── GFA + Contract strip ─── */}
                <div className="flex gap-1.5">
                  {financialGfaValue !== null && budgetTotal !== null && (
                    <div className="flex-1 p-2 rounded-lg border border-amber-500/15 bg-amber-950/10 flex items-center gap-2">
                      <Ruler className="h-3.5 w-3.5 text-amber-400/60 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-950 dark:text-white">${(budgetTotal / financialGfaValue).toFixed(2)}<span className="text-[8px] text-amber-700 dark:text-amber-300/70">/sqft</span></p>
                        <p className="text-[8px] text-amber-700 dark:text-amber-300/60">{financialGfaValue.toLocaleString()} sq ft</p>
                      </div>
                    </div>
                  )}
                  {contracts.length > 0 && (
                    <div className="flex-1 p-2 rounded-lg border border-sky-500/15 bg-sky-950/10 flex items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 text-sky-400/60 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-950 dark:text-white">{contracts.length} contract{contracts.length > 1 ? 's' : ''}</p>
                        {totalContractValue > 0 && <p className="text-[8px] text-sky-700 dark:text-sky-300/60">${totalContractValue.toLocaleString()}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 rounded-lg border border-dashed border-slate-700/30 text-center bg-slate-900/20">
                <DollarSign className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-300">No financial data</p>
                <p className="text-[10px] text-slate-400 mt-1">Add budget or contracts to activate</p>
              </div>
            )}
          </div>
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
  ]);
  
  // Render fullscreen panel content
  const renderFullscreenContent = useCallback((panel: PanelConfig) => {
    const panelCitations = getCitationsForPanel(panel.dataKeys);
    
    return (
      <div className="space-y-6">
        {/* ✓ PANEL 1: Project Basics — Fullscreen Command Center */}
        {panel.id === 'panel-1-basics' && (() => {
          const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
          const locCit = citations.find(c => c.cite_type === 'LOCATION');
          const workCit = citations.find(c => c.cite_type === 'WORK_TYPE');
          const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
          const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
          const teamCit = citations.find(c => c.cite_type === 'TEAM_SIZE') || citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
          const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
          const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
          const siteCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
          const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
          const demoCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');

          const allItems = [
            { key: 'Name', cit: nameCit }, { key: 'Location', cit: locCit },
            { key: 'Work Type', cit: workCit }, { key: 'GFA', cit: gfaCit },
            { key: 'Trade', cit: tradeCit }, { key: 'Team', cit: teamCit },
            { key: 'Timeline', cit: timelineCit }, { key: 'End Date', cit: endDateCit },
          ];
          const filled = allItems.filter(i => !!i.cit).length;
          const completionPct = Math.round((filled / allItems.length) * 100);

          const formatCitValue = (cit: Citation | undefined, fallback: string) => {
            if (!cit) return fallback;
            if (cit.cite_type === 'TIMELINE' && cit.metadata?.start_date) {
              try { return format(parseISO(cit.metadata.start_date as string), 'MMM dd, yyyy'); } catch { return cit.answer || fallback; }
            }
            if (cit.cite_type === 'END_DATE' && typeof cit.value === 'string') {
              try { return format(parseISO(cit.value), 'MMM dd, yyyy'); } catch { return cit.answer || fallback; }
            }
            if (cit.cite_type === 'GFA_LOCK' && typeof cit.value === 'number') {
              return `${cit.value.toLocaleString()} ${cit.metadata?.gfa_unit || 'sq ft'}`;
            }
            return cit.answer || fallback;
          };

          const dataRows = [
            { label: 'Project Name', cit: nameCit, fallback: projectData?.name || '—', icon: <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />, color: { border: 'border-cyan-300 dark:border-cyan-400/30', bg: 'bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/50 dark:to-sky-950/30', text: 'text-gray-800 dark:text-cyan-200', glow: 'bg-cyan-400' } },
            { label: 'Location', cit: locCit, fallback: 'Not set', icon: <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, color: { border: 'border-emerald-300 dark:border-emerald-400/30', bg: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-teal-950/30', text: 'text-gray-800 dark:text-emerald-200', glow: 'bg-emerald-400' } },
            { label: 'Work Type', cit: workCit, fallback: 'Not set', icon: <Hammer className="h-4 w-4 text-orange-600 dark:text-amber-400" />, color: { border: 'border-orange-300 dark:border-amber-400/30', bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-amber-950/50 dark:to-orange-950/30', text: 'text-gray-800 dark:text-amber-200', glow: 'bg-orange-400' } },
            { label: 'Gross Floor Area', cit: gfaCit, fallback: 'Not set', icon: <Ruler className="h-4 w-4 text-sky-600 dark:text-blue-400" />, color: { border: 'border-sky-300 dark:border-blue-400/30', bg: 'bg-gradient-to-r from-sky-50 to-blue-50 dark:from-blue-950/50 dark:to-indigo-950/30', text: 'text-gray-800 dark:text-blue-200', glow: 'bg-sky-400' } },
            { label: 'Trade', cit: tradeCit, fallback: 'Not set', icon: <Settings className="h-4 w-4 text-violet-600 dark:text-violet-400" />, color: { border: 'border-violet-300 dark:border-violet-400/30', bg: 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/30', text: 'text-gray-800 dark:text-violet-200', glow: 'bg-violet-400' } },
            { label: 'Team', cit: teamCit, fallback: `${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`, icon: <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />, color: { border: 'border-teal-300 dark:border-teal-400/30', bg: 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/30', text: 'text-gray-800 dark:text-teal-200', glow: 'bg-teal-400' } },
            { label: 'Start Date', cit: timelineCit, fallback: 'Not set', icon: <Calendar className="h-4 w-4 text-yellow-600 dark:text-indigo-400" />, color: { border: 'border-yellow-300 dark:border-indigo-400/30', bg: 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-indigo-950/50 dark:to-blue-950/30', text: 'text-gray-800 dark:text-indigo-200', glow: 'bg-yellow-400' } },
            { label: 'End Date', cit: endDateCit, fallback: 'Not set', icon: <span className="text-sm">🏁</span>, color: { border: 'border-pink-300 dark:border-purple-400/30', bg: 'bg-gradient-to-r from-pink-50 to-rose-50 dark:from-purple-950/50 dark:to-pink-950/30', text: 'text-gray-800 dark:text-purple-200', glow: 'bg-pink-400' } },
            { label: 'Site Condition', cit: siteCit, fallback: null, icon: <Settings className="h-4 w-4 text-rose-600 dark:text-rose-400" />, color: { border: 'border-rose-300 dark:border-rose-400/30', bg: 'bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/50 dark:to-red-950/30', text: 'text-gray-800 dark:text-rose-200', glow: 'bg-rose-400' } },
            { label: 'Template', cit: templateCit, fallback: null, icon: <ClipboardList className="h-4 w-4 text-fuchsia-600 dark:text-pink-400" />, color: { border: 'border-fuchsia-300 dark:border-pink-400/30', bg: 'bg-gradient-to-r from-fuchsia-50 to-pink-50 dark:from-pink-950/50 dark:to-rose-950/30', text: 'text-gray-800 dark:text-pink-200', glow: 'bg-fuchsia-400' } },
            { label: 'Demolition Cost', cit: demoCit, fallback: null, icon: <span className="text-sm">💥</span>, color: { border: 'border-red-300 dark:border-orange-400/30', bg: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-orange-950/50 dark:to-red-950/30', text: 'text-gray-800 dark:text-orange-200', glow: 'bg-red-400' } },
          ].filter(r => r.cit || r.fallback !== null);

          return (
            <div className="space-y-6">
              {/* Completion Header — Bright */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-cyan-300 dark:border-cyan-400/20 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/40 dark:to-sky-950/30">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-cyan-600/80 dark:text-cyan-400/60">Data Integrity</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionPct}%</p>
                  <p className="text-xs text-cyan-600/60 dark:text-cyan-300/50">{filled} of {allItems.length} fields verified</p>
                </div>
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2" className="stroke-cyan-200 dark:stroke-slate-700/50" />
                    <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" className="stroke-cyan-500 dark:stroke-cyan-400" strokeDasharray={`${completionPct} ${100 - completionPct}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-cyan-700 dark:text-cyan-300">{completionPct}%</span>
                </div>
              </div>

              {/* Data Grid — Vibrant Bright Color-Coded Rows */}
              <div className="grid gap-3">
                {dataRows.map(row => (
                  <div key={row.label} className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md",
                    row.cit ? `${row.color.border} ${row.color.bg}` : "border-gray-200 dark:border-slate-700/20 bg-gray-50 dark:bg-slate-900/30"
                  )}>
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shadow-sm",
                      row.cit ? "bg-white/70 dark:bg-white/10" : "bg-gray-100 dark:bg-slate-800/50"
                    )}>{row.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[10px] font-mono uppercase tracking-wider", row.cit ? `${row.color.text} opacity-60` : "text-gray-400 dark:text-muted-foreground/60")}>{row.label}</p>
                      <p className={cn("text-sm font-semibold", row.cit ? row.color.text : "text-gray-400 dark:text-muted-foreground italic")}>
                        {formatCitValue(row.cit, row.fallback || 'Not set')}
                      </p>
                    </div>
                    {row.cit && (
                      <Badge variant="outline" className={cn("text-[9px] font-mono shrink-0", row.color.border, `${row.color.text} opacity-50`)}>
                        [{row.cit.id.slice(0, 10)}]
                      </Badge>
                    )}
                    {row.cit && <div className={cn("w-2.5 h-2.5 rounded-full", row.color.glow, "shadow-[0_0_8px_currentColor]")} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ✓ PANEL 2: Area & Dimensions — Fullscreen */}
        {panel.id === 'panel-2-gfa' && (() => {
          const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
          const blueprintCitation = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
          const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
          const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
          
          const hasGfaData = gfaCitation && (typeof gfaCitation.value === 'number' || typeof gfaCitation.metadata?.gfa_value === 'number');
          const gfaValue = typeof gfaCitation?.value === 'number' ? gfaCitation.value : typeof gfaCitation?.metadata?.gfa_value === 'number' ? gfaCitation.metadata.gfa_value : null;
          const gfaUnit = gfaCitation?.metadata?.gfa_unit || 'sq ft';
          const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number' ? templateCitation.metadata.waste_percent : (templateCitation?.metadata?.items as any[])?.find?.((item: any) => item.applyWaste) ? 10 : null;

          const grossArea = gfaValue && wastePercent ? Math.ceil(gfaValue * (1 + wastePercent / 100)) : null;
          const metricArea = gfaValue ? Math.round(gfaValue * 0.0929) : null;
          const estPerimeter = gfaValue ? Math.round(4 * Math.sqrt(gfaValue)) : null;
          const estRooms = gfaValue ? Math.max(1, Math.round(gfaValue / 200)) : null;
          const costPerSqFt = gfaValue && financialSummary?.total_cost ? (financialSummary.total_cost / gfaValue) : null;
          const metricPerimeter = estPerimeter ? Math.round(estPerimeter * 0.3048) : null;
          const sqFtPerZone = gfaValue && estRooms ? Math.round(gfaValue / estRooms) : null;

          return (
            <div className="space-y-6">
              {/* GFA Hero — Large Format */}
              <div className={cn(
                "relative overflow-hidden rounded-2xl border p-6",
                hasGfaData
                  ? "border-sky-300 dark:border-sky-500/30 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-900/40 dark:via-blue-900/30 dark:to-indigo-900/20"
                  : "border-gray-200 dark:border-slate-700/30 bg-gray-50 dark:bg-slate-900/30"
              )}>
                {hasGfaData && <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-sky-200/60 dark:bg-sky-400/10 blur-3xl pointer-events-none" />}
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className={cn("text-xs font-mono uppercase tracking-[0.15em] mb-2", hasGfaData ? "text-sky-600 dark:text-sky-300/70" : "text-gray-400")}>Gross Floor Area</p>
                    <div className="flex items-baseline gap-3">
                      <span className={cn("text-5xl font-black", hasGfaData ? "text-gray-900 dark:text-white" : "text-gray-300")}>
                        {gfaValue !== null ? gfaValue.toLocaleString() : '—'}
                      </span>
                      <span className={cn("text-xl font-medium", hasGfaData ? "text-sky-600/80 dark:text-sky-400/70" : "text-gray-400")}>{gfaUnit}</span>
                    </div>
                    {metricArea && <p className="text-sm text-sky-600/60 dark:text-sky-400/50 mt-1">= {metricArea.toLocaleString()} m²</p>}
                    {gfaCitation && <p className="text-[9px] text-sky-500/50 font-mono mt-2">cite: [{gfaCitation.id.slice(0, 12)}]</p>}
                  </div>
                  {hasGfaData && (
                    <div className="flex flex-col items-center gap-2">
                      <Badge className="text-xs bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 gap-1 animate-pulse">
                        <Lock className="h-3 w-3" />LOCKED
                      </Badge>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="w-14 h-14 rounded-full border border-sky-300 dark:border-sky-500/20 flex items-center justify-center bg-sky-100/60 dark:bg-sky-500/5"
                      >
                        <Ruler className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>

              {/* Derived Metrics — 2x3 Grid */}
              {gfaValue !== null && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Metric Area', value: `${metricArea?.toLocaleString()} m²`, sub: 'sq meters', border: 'border-emerald-300 dark:border-emerald-500/25', bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20', labelColor: 'text-emerald-600/70 dark:text-emerald-400/60', valueColor: 'text-gray-800 dark:text-emerald-200', subColor: 'text-emerald-500/50' },
                    { label: 'Perimeter', value: `${estPerimeter?.toLocaleString()} ft`, sub: metricPerimeter ? `≈ ${metricPerimeter} m` : '', border: 'border-orange-300 dark:border-orange-500/25', bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20', labelColor: 'text-orange-600/70 dark:text-orange-400/60', valueColor: 'text-gray-800 dark:text-orange-200', subColor: 'text-orange-500/50' },
                    { label: 'Est. Zones', value: `${estRooms}`, sub: sqFtPerZone ? `~${sqFtPerZone} sqft each` : '', border: 'border-violet-300 dark:border-violet-500/25', bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20', labelColor: 'text-violet-600/70 dark:text-violet-400/60', valueColor: 'text-gray-800 dark:text-violet-200', subColor: 'text-violet-500/50' },
                    { label: 'Cost / sqft', value: costPerSqFt ? `$${costPerSqFt.toFixed(2)}` : '—', sub: costPerSqFt ? 'projected' : 'pending budget', border: 'border-pink-300 dark:border-pink-500/25', bg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/20', labelColor: 'text-pink-600/70 dark:text-pink-400/60', valueColor: 'text-gray-800 dark:text-pink-200', subColor: 'text-pink-500/50' },
                    ...(wastePercent !== null ? [{ label: 'Gross w/ Waste', value: `${grossArea?.toLocaleString()} ${gfaUnit}`, sub: `+${wastePercent}% (${(grossArea! - gfaValue).toLocaleString()} extra)`, border: 'border-yellow-300 dark:border-yellow-500/25', bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/20', labelColor: 'text-yellow-600/70 dark:text-yellow-400/60', valueColor: 'text-gray-800 dark:text-yellow-200', subColor: 'text-yellow-500/50' }] : []),
                    ...(costPerSqFt ? [{ label: 'Cost / m²', value: `$${(costPerSqFt * 10.764).toFixed(2)}`, sub: 'metric projected', border: 'border-cyan-300 dark:border-cyan-500/25', bg: 'bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/30 dark:to-sky-900/20', labelColor: 'text-cyan-600/70 dark:text-cyan-400/60', valueColor: 'text-gray-800 dark:text-cyan-200', subColor: 'text-cyan-500/50' }] : []),
                  ].map((m, i) => (
                    <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                      className={cn("rounded-xl border p-4", m.border, m.bg)}>
                      <p className={cn("text-[9px] font-mono uppercase tracking-wider mb-1", m.labelColor)}>{m.label}</p>
                      <p className={cn("text-xl font-bold", m.valueColor)}>{m.value}</p>
                      {m.sub && <p className={cn("text-[10px] mt-0.5", m.subColor)}>{m.sub}</p>}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Blueprint & Site Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {blueprintCitation && (
                  <div className="rounded-xl border border-teal-300 dark:border-teal-500/25 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/25 dark:to-cyan-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileImage className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-semibold text-gray-800 dark:text-teal-200">Blueprint</span>
                      <span className="text-[9px] text-teal-500/50 font-mono ml-auto">cite: [{blueprintCitation.id.slice(0, 8)}]</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-teal-300/80">{String(blueprintCitation.metadata?.fileName || blueprintCitation.answer)}</p>
                  </div>
                )}
                {siteConditionCitation && (
                  <div className="rounded-xl border border-red-300 dark:border-red-500/25 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/25 dark:to-rose-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Hammer className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-semibold text-gray-800 dark:text-red-200">Site Condition</span>
                      <span className="text-[9px] text-red-500/50 font-mono ml-auto">cite: [{siteConditionCitation.id.slice(0, 8)}]</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-red-200 capitalize">{siteConditionCitation.answer}</p>
                  </div>
                )}
              </div>

              {/* All Panel Citations */}
              {panelCitations.length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700/30 space-y-2">
                  <p className="text-xs font-mono text-gray-500 dark:text-slate-500 uppercase tracking-wider">All Citations ({panelCitations.length})</p>
                  {panelCitations.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/30 border border-gray-200/50 dark:border-slate-700/20">
                      <span className="text-xs text-gray-500 dark:text-slate-400">{c.cite_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{renderCitationValue(c)}</span>
                        <span className="text-[9px] text-sky-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Generic citations for non-basics/non-gfa panels */}
        {panel.id !== 'panel-1-basics' && panel.id !== 'panel-2-gfa' && panelCitations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Verified Data ({panelCitations.length})
            </h4>
            <div className="grid gap-3">
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
          </div>
        )}
        
        {/* ✓ PANEL 3: Trade & Template - Fullscreen View */}
        {panel.id === 'panel-3-trade' && (() => {
          const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
          const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
          const workTypeCitation = citations.find(c => c.cite_type === 'WORK_TYPE');
          const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
          
          // ✓ FIXED: Prioritize TRADE_SELECTION (subwork type like "Flooring") over WORK_TYPE (parent like "Interior Finishing")
          // TRADE_SELECTION.answer = "Flooring", TRADE_SELECTION.value = "flooring"
          const tradeLabel = tradeCitation?.answer || null;
          const tradeKey = (tradeCitation?.value as string) 
            || (tradeCitation?.metadata?.trade_key as string) 
            || (templateCitation?.metadata?.trade_key as string)
            || tradeLabel?.toLowerCase().replace(/ /g, '_') 
            || null;
          
          // ✓ ONLY use WORK_TYPE as display fallback, NOT for template lookup
          const displayLabel = tradeLabel || workTypeCitation?.answer || null;
          
          const gfaValue = typeof gfaCitation?.value === 'number' 
            ? gfaCitation.value 
            : typeof gfaCitation?.metadata?.gfa_value === 'number'
              ? gfaCitation.metadata.gfa_value
              : null;
          
          const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number'
            ? templateCitation.metadata.waste_percent
            : 10;
          
          // ✓ SIMPLE MATERIALS-ONLY TEMPLATE for Panel 3 fullscreen (tasks are in Panel 5)
          const getTemplateForTradeFullscreen = (trade: string, gfa: number | null) => {
            if (gfa === null || gfa === 0) return { materials: [], hasData: false };
            
            const tradeLower = trade.toLowerCase().replace(/ /g, '_');
            
            // Material-only templates (tasks handled by Panel 5)
            const templates: Record<string, { name: string; qty: number; unit: string }[]> = {
              painting: [
                { name: 'Interior Paint (Premium)', qty: Math.ceil(gfa / 350), unit: 'gal' },
                { name: 'Primer', qty: Math.ceil(gfa / 400), unit: 'gal' },
                { name: 'Supplies (Brushes, Rollers, Tape)', qty: 1, unit: 'kit' },
                { name: 'Drop Cloths', qty: Math.ceil(gfa / 500), unit: 'pcs' },
                { name: 'Caulking', qty: Math.ceil(gfa / 300), unit: 'tubes' },
              ],
              flooring: [
                { name: 'Hardwood Flooring', qty: gfa, unit: 'sq ft' },
                { name: 'Underlayment', qty: gfa, unit: 'sq ft' },
                { name: 'Transition Strips', qty: Math.ceil(gfa / 200), unit: 'pcs' },
                { name: 'Baseboards', qty: Math.round(4 * Math.sqrt(gfa) * 0.85), unit: 'ln ft' },
              ],
              drywall: [
                { name: 'Drywall Sheets (4x8)', qty: Math.ceil(gfa / 32), unit: 'sheets' },
                { name: 'Joint Compound', qty: Math.ceil(gfa / 500), unit: 'buckets' },
                { name: 'Drywall Tape', qty: Math.ceil(gfa / 100), unit: 'rolls' },
                { name: 'Screws', qty: Math.ceil(gfa / 50), unit: 'boxes' },
              ],
            };
            
            const materials = templates[tradeLower] 
              || Object.entries(templates).find(([key]) => tradeLower.includes(key))?.[1]
              || null;
            
            if (!materials) return { materials: [], hasData: false };
            
            return { materials, hasData: true };
          };
          
          const template = tradeKey 
            ? getTemplateForTradeFullscreen(tradeKey, gfaValue) 
            : { materials: [], hasData: false };
          
          // Apply waste to materials
          const materialsWithWaste = template.materials.map(mat => {
            const applyWaste = mat.unit === 'sq ft' || mat.unit === 'ln ft' || mat.unit === 'sheets' || mat.unit === 'rolls';
            if (applyWaste && wastePercent > 0) {
              return { ...mat, qty: Math.ceil(mat.qty * (1 + wastePercent / 100)), hasWaste: true };
            }
            return { ...mat, hasWaste: false };
          });
          
          // ✓ Derived stats
          const fsMaterialCount = materialsWithWaste.length;
          const fsTotalUnits = materialsWithWaste.reduce((sum, m) => sum + m.qty, 0);
          const fsWastedCount = materialsWithWaste.filter(m => m.hasWaste).length;
          const avgUnitsPerMat = fsMaterialCount > 0 ? Math.round(fsTotalUnits / fsMaterialCount) : 0;
          
          return (
            <div className="space-y-6">
              {/* Trade Header - Fuchsia/Pink */}
              <div className={cn(
                "p-6 rounded-2xl border-2 relative overflow-hidden",
                tradeLabel
                  ? "bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-50 dark:from-fuchsia-950/40 dark:via-pink-950/30 dark:to-rose-950/30 border-fuchsia-300 dark:border-fuchsia-500/40"
                  : "bg-muted/30 border-dashed"
              )}>
                {tradeLabel && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-fuchsia-200/30 to-transparent dark:from-fuchsia-500/10 rounded-bl-[3rem]" />
                )}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-2xl font-black text-gray-900 dark:text-fuchsia-100 tracking-tight">
                    {tradeLabel || 'No Trade Selected'}
                  </h4>
                  {tradeCitation && (
                    <Badge className="bg-gradient-to-r from-fuchsia-100 to-pink-100 dark:from-fuchsia-900/40 dark:to-pink-900/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-300/50">
                      cite: [{tradeCitation.id.slice(0, 8)}]
                    </Badge>
                  )}
                </div>
                {gfaValue && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-fuchsia-500" />
                      <span className="text-sm font-bold text-gray-800 dark:text-fuchsia-200">{gfaValue.toLocaleString()} sq ft</span>
                    </div>
                    {wastePercent > 0 && (
                      <Badge className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300/50">
                        +{wastePercent}% waste factor
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Grid - 4 colorful cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border-2 border-lime-300 dark:border-lime-500/30 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/40 dark:to-green-950/30 p-4 text-center">
                  <p className="text-[10px] font-mono uppercase text-lime-600 dark:text-lime-400 tracking-widest">Materials</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-lime-200">{fsMaterialCount}</p>
                  <p className="text-[10px] text-lime-600/60">line items</p>
                </div>
                <div className="rounded-xl border-2 border-sky-300 dark:border-sky-500/30 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/30 p-4 text-center">
                  <p className="text-[10px] font-mono uppercase text-sky-600 dark:text-sky-400 tracking-widest">Total Qty</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-sky-200">{fsTotalUnits.toLocaleString()}</p>
                  <p className="text-[10px] text-sky-600/60">all units</p>
                </div>
                <div className="rounded-xl border-2 border-amber-300 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 p-4 text-center">
                  <p className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 tracking-widest">Waste</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-amber-200">+{wastePercent}%</p>
                  <p className="text-[10px] text-amber-600/60">{fsWastedCount} items affected</p>
                </div>
                <div className="rounded-xl border-2 border-violet-300 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 p-4 text-center">
                  <p className="text-[10px] font-mono uppercase text-violet-600 dark:text-violet-400 tracking-widest">Avg / Item</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-violet-200">{avgUnitsPerMat.toLocaleString()}</p>
                  <p className="text-[10px] text-violet-600/60">units avg</p>
                </div>
              </div>
              
              {/* Materials Grid - Colorful cards */}
              {template.hasData && materialsWithWaste.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-violet-200">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                      <ClipboardList className="h-4 w-4 text-white" />
                    </div>
                    Material Requirements
                    {templateCitation && (
                      <span className="text-[10px] text-violet-500 font-mono ml-auto">cite: [{templateCitation.id.slice(0, 8)}]</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {materialsWithWaste.map((mat, idx) => {
                      const cardColors = [
                        'border-rose-200 dark:border-rose-500/30 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20',
                        'border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20',
                        'border-lime-200 dark:border-lime-500/30 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/20 dark:to-green-950/20',
                        'border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20',
                        'border-fuchsia-200 dark:border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/20 dark:to-purple-950/20',
                      ];
                      const iconColors = [
                        'from-rose-400 to-red-500',
                        'from-cyan-400 to-blue-500',
                        'from-lime-400 to-green-500',
                        'from-amber-400 to-orange-500',
                        'from-fuchsia-400 to-purple-500',
                      ];
                      return (
                        <div 
                          key={idx} 
                          className={cn("flex items-center justify-between p-4 rounded-xl border-2 hover:shadow-md transition-all", cardColors[idx % cardColors.length])}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", iconColors[idx % iconColors.length])}>
                              <Hammer className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-100">{mat.name}</p>
                              {mat.hasWaste && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">+{wastePercent}% waste included</p>
                              )}
                            </div>
                          </div>
                          <Badge className="text-sm font-black bg-white/80 dark:bg-gray-900/50 text-gray-900 dark:text-white border border-gray-300/50 dark:border-gray-600/50 shadow-sm">
                            {mat.qty.toLocaleString()} {mat.unit}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* No Data */}
              {!template.hasData && (
                <div className="p-8 rounded-2xl border-2 border-dashed border-fuchsia-200 dark:border-fuchsia-800/30 text-center bg-gradient-to-br from-fuchsia-50/30 to-pink-50/30 dark:from-fuchsia-950/10 dark:to-pink-950/10">
                  <Hammer className="h-12 w-12 text-fuchsia-300 dark:text-fuchsia-600 mx-auto mb-3" />
                  <p className="text-fuchsia-600/80 dark:text-fuchsia-400/60">
                    {!tradeCitation && workTypeCitation
                      ? 'Select a specific trade (Flooring, Painting, Drywall) in Definition stage'
                      : !tradeLabel 
                        ? 'No trade selected in wizard' 
                        : gfaValue === null
                          ? 'GFA required to calculate materials'
                          : 'Template will appear after trade selection'}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
        
        {panel.id === 'panel-4-team' && teamMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Vibrant Command Header */}
            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-teal-300 dark:border-teal-700 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/40 shadow-xl">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ boxShadow: ['0 0 10px rgba(16,185,129,0.2)', '0 0 25px rgba(16,185,129,0.5)', '0 0 10px rgba(16,185,129,0.2)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg"
                >
                  <Users className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <h4 className="text-lg font-black text-teal-800 dark:text-teal-200 tracking-tight">Team Operatives</h4>
                  <p className="text-[11px] text-teal-600 dark:text-teal-400">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} deployed</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600 text-[11px] px-2.5 py-1 gap-1.5 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </Badge>
            </div>

            {/* Stats Strip - Vibrant light */}
            {(() => {
              const fsRoleCounts = teamMembers.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);
              return (
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl border-2 border-cyan-300 dark:border-cyan-700 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 p-3 text-center shadow-md">
                    <p className="text-[10px] font-mono uppercase text-cyan-600 dark:text-cyan-400 tracking-widest">Total</p>
                    <p className="text-3xl font-black text-cyan-800 dark:text-cyan-200">{teamMembers.length}</p>
                  </div>
                  <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-3 text-center shadow-md">
                    <p className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 tracking-widest">Roles</p>
                    <p className="text-3xl font-black text-amber-800 dark:text-amber-200">{Object.keys(fsRoleCounts).length}</p>
                  </div>
                  <div className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-3 text-center shadow-md">
                    <p className="text-[10px] font-mono uppercase text-violet-600 dark:text-violet-400 tracking-widest">Owners</p>
                    <p className="text-3xl font-black text-violet-800 dark:text-violet-200">{fsRoleCounts['owner'] || 0}</p>
                  </div>
                  <div className="rounded-xl border-2 border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-3 text-center shadow-md">
                    <p className="text-[10px] font-mono uppercase text-red-600 dark:text-red-400 tracking-widest">Workers</p>
                    <p className="text-3xl font-black text-red-800 dark:text-red-200">{(fsRoleCounts['worker'] || 0) + (fsRoleCounts['subcontractor'] || 0)}</p>
                  </div>
                </div>
              );
            })()}

            {/* Role Distribution Bar */}
            {(() => {
              const roleCounts = teamMembers.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);
              const roleColorMap: Record<string, string> = {
                owner: '#f59e0b',
                foreman: '#10b981',
                worker: '#3b82f6',
                inspector: '#8b5cf6',
                subcontractor: '#06b6d4',
                member: '#94a3b8',
              };
              return (
                <div className="space-y-2 p-3 rounded-xl border-2 border-teal-200 dark:border-teal-700/30 bg-gradient-to-r from-teal-50/50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20">
                  <div className="h-3 rounded-full overflow-hidden flex bg-gray-200 dark:bg-slate-800">
                    {Object.entries(roleCounts).map(([role, count]) => (
                      <div
                        key={role}
                        style={{ width: `${(count / teamMembers.length) * 100}%`, backgroundColor: roleColorMap[role] || '#94a3b8' }}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(roleCounts).map(([role, count]) => (
                      <div key={role} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: roleColorMap[role] || '#94a3b8' }} />
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 capitalize font-medium">{role} ({count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Member Cards - Vibrant with accent borders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {teamMembers.map((member, idx) => {
                const roleColors: Record<string, string> = {
                  owner: 'from-amber-500 to-orange-600',
                  foreman: 'from-emerald-500 to-teal-600',
                  worker: 'from-blue-500 to-indigo-600',
                  inspector: 'from-violet-500 to-purple-600',
                  subcontractor: 'from-cyan-500 to-blue-600',
                  member: 'from-gray-500 to-slate-600',
                };
                const cardBgs = [
                  'border-emerald-200 dark:border-emerald-700/30 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/20 dark:to-teal-950/20',
                  'border-cyan-200 dark:border-cyan-700/30 bg-gradient-to-r from-cyan-50/80 to-sky-50/60 dark:from-cyan-950/20 dark:to-sky-950/20',
                  'border-amber-200 dark:border-amber-700/30 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20',
                  'border-violet-200 dark:border-violet-700/30 bg-gradient-to-r from-violet-50/80 to-indigo-50/60 dark:from-violet-950/20 dark:to-indigo-950/20',
                  'border-lime-200 dark:border-lime-700/30 bg-gradient-to-r from-lime-50/80 to-green-50/60 dark:from-lime-950/20 dark:to-green-950/20',
                ];
                const gradient = roleColors[member.role] || roleColors.member;
                const cardBg = cardBgs[idx % cardBgs.length];
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all group hover:shadow-lg",
                      cardBg
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shadow-lg", gradient)}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{member.name}</p>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 capitalize font-medium">{member.role}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ─── In-Panel Project Chat (Fullscreen) ─── */}
            <TeamChatPanel
              projectId={projectId}
              userId={userId}
              teamMembers={teamMembers}
              compact={false}
              onDocumentAdded={async () => {
                const { data: newDocs } = await supabase
                  .from('project_documents')
                  .select('*')
                  .eq('project_id', projectId)
                  .order('uploaded_at', { ascending: false });
                if (newDocs) {
                  setDocuments(newDocs.map(doc => ({
                    id: doc.id,
                    file_name: doc.file_name,
                    file_path: doc.file_path,
                    category: categorizeDocument(doc.file_name),
                    uploadedAt: doc.uploaded_at,
                  })));
                }
              }}
            />
          </motion.div>
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
              {/* ─── Header ─── */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-sky-700 dark:text-sky-300">Document Vault</h4>
                    <p className="text-[10px] text-sky-500 dark:text-sky-400 font-mono">{documents.length} files · {contracts.length} contracts</p>
                  </div>
                </div>
                {canEdit && (
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

              {/* ─── Upload Zone (Fullscreen) ─── */}
              {canEdit && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                    isDraggingOver 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" 
                      : "border-indigo-300/50 dark:border-indigo-700/50 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                      <span className="text-sm text-indigo-600 dark:text-indigo-400">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-indigo-400 mb-2" />
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">
                        Drop files here or <span className="font-semibold">click to browse</span>
                      </p>
                      <p className="text-xs text-indigo-400 dark:text-indigo-500 mt-1">PDF · Images · Blueprints · Any document</p>
                    </>
                  )}
                </div>
              )}

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
                                })}
                              >
                                {/* Thumbnail */}
                                <div className="h-12 w-12 rounded-lg flex-shrink-0 overflow-hidden border bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                  {isImage ? (
                                    <img 
                                      src={getDocumentPreviewUrl(doc.file_path)} 
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
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewDocument({ file_name: doc.file_name, file_path: doc.file_path, category: doc.category, citationId: doc.citationId || matchingCit?.id }); }}>
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
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedContractType(null)}
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
                        {[
                          { key: 'residential', label: 'Residential', icon: '🏠' },
                          { key: 'commercial', label: 'Commercial', icon: '🏢' },
                          { key: 'industrial', label: 'Industrial', icon: '🏭' },
                          { key: 'renovation', label: 'Renovation', icon: '🔨' },
                        ].map(type => (
                          <button
                            key={type.key}
                            onClick={() => { setSelectedContractType(type.key); setShowContractPreview(true); }}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-violet-200 dark:border-violet-700/30 text-center transition-all hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:shadow-md"
                          >
                            <span className="text-2xl">{type.icon}</span>
                            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{type.label}</span>
                          </button>
                        ))}
                      </div>
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
        
        {panel.id === 'panel-7-weather' && (() => {
          const locationCitFs = citations.find(c => c.cite_type === 'LOCATION');
          const siteCondCitFs = citations.find(c => c.cite_type === 'SITE_CONDITION');
          const hasLocFs = locationCitFs?.answer || projectData?.address;
          const weatherAddrFs = locationCitFs?.answer || projectData?.address || null;
          const mapLatFs = (locationCitFs?.metadata?.coordinates as any)?.lat;
          const mapLonFs = (locationCitFs?.metadata?.coordinates as any)?.lng;

          return (
            <div className="space-y-5">
              {/* ─── Header Bar ─── */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <span className={cn("text-sm font-semibold block", hasLocFs ? "text-sky-700 dark:text-sky-300" : "text-gray-500")}>
                      {weatherAddrFs || 'No location set'}
                    </span>
                    {mapLatFs && mapLonFs && (
                      <span className="text-[10px] text-sky-500 dark:text-sky-400 font-mono">
                        {Number(mapLatFs).toFixed(4)}°N, {Number(mapLonFs).toFixed(4)}°W
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {locationCitFs && (
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono bg-sky-100 dark:bg-sky-900/30 px-1.5 py-0.5 rounded">cite:[{locationCitFs.id.slice(0, 6)}]</span>
                  )}
                  {siteCondCitFs && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Hammer className="h-2.5 w-2.5" /> {siteCondCitFs.answer}
                    </span>
                  )}
                </div>
              </div>

              {/* ─── Weather + Map ─── */}
              {weatherAddrFs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weather */}
                  <div className="rounded-xl border-2 border-sky-200 dark:border-sky-700 bg-gradient-to-b from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 overflow-hidden">
                    <div className="px-3 py-2 border-b border-sky-200 dark:border-sky-700/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Live Weather</span>
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <div className="p-3">
                      <WeatherWidget
                        location={weatherAddrFs}
                        showForecast={true}
                        className="border-0 shadow-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Map */}
                  <div className="rounded-xl border-2 border-sky-200 dark:border-sky-700 bg-gradient-to-b from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 overflow-hidden">
                    <div className="px-3 py-2 border-b border-sky-200 dark:border-sky-700/30 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Site Location</span>
                    </div>
                    {mapLatFs && mapLonFs ? (
                      <div className="relative h-[350px]">
                        <iframe
                          title="Project Location Map"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${mapLatFs},${mapLonFs}&z=16&output=embed`}
                        />
                      </div>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center">
                        <div className="text-center text-sky-500 dark:text-sky-400">
                          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Coordinates not available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-10 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border-2 border-dashed border-sky-300 dark:border-sky-700 text-center">
                  <Cloud className="h-12 w-12 text-sky-400 mx-auto mb-3" />
                  <p className="text-sm text-sky-600 dark:text-sky-400 font-medium">No Location Data</p>
                  <p className="text-xs text-sky-500 dark:text-sky-500/60 mt-1">Set a project address to enable weather & map</p>
                </div>
              )}

              {/* ─── Citations ─── */}
              {panelCitations.length > 0 && (
                <div className="pt-3 border-t border-sky-200 dark:border-sky-700/30 space-y-1.5">
                  <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-widest">Data Sources</p>
                  {panelCitations.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-700/30 text-xs">
                      <span className="text-sky-600 dark:text-sky-400">{c.cite_type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sky-800 dark:text-sky-300">{renderCitationValue(c)}</span>
                        <span className="text-[9px] text-sky-500 dark:text-sky-500/60 font-mono">cite:[{c.id.slice(0, 6)}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        
        {panel.id === 'panel-8-financial' && canViewFinancials && (() => {
          // ✓ FUTURISTIC FINANCIAL SUMMARY - compact elegant command center
          const totalContractValue = contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0);
          const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
          const demoPriceCitation = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
          const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
          
          const gfaValue = typeof gfaCitation?.value === 'number' 
            ? gfaCitation.value 
            : typeof gfaCitation?.metadata?.gfa_value === 'number'
              ? gfaCitation.metadata.gfa_value
              : null;
          
          const storedMaterialCost = financialSummary?.material_cost || 0;
          const storedLaborCost = financialSummary?.labor_cost || 0;
          const storedTotalCost = financialSummary?.total_cost;
          
          const demoCost = typeof demoPriceCitation?.value === 'number' && gfaValue
            ? demoPriceCitation.value * gfaValue
            : 0;
          
          const budgetTotal = storedTotalCost ?? totalContractValue;
          const calculatedExpenses = storedMaterialCost + storedLaborCost + demoCost;
          // ✗ Profit calculation DISABLED - must be manually set, never auto-calculated
          const profitMargin: number | null = null;
          const profitPercent: number | null = null;
          const hasFinancialData = budgetTotal > 0 || storedMaterialCost || storedLaborCost || totalContractValue > 0;
          
          // ✓ REGIONAL TAX CALCULATION (Canadian Provinces)
          const locationAddress = typeof locationCitation?.answer === 'string' 
            ? locationCitation.answer 
            : typeof locationCitation?.metadata?.formatted_address === 'string'
              ? locationCitation.metadata.formatted_address
              : '';
          const getTaxRateByRegion = (address: string): { rate: number; name: string; province: string } => {
            const addressLower = address.toLowerCase();
            if (addressLower.includes('ontario') || addressLower.includes(', on')) return { rate: 0.13, name: 'HST', province: 'Ontario' };
            if (addressLower.includes('quebec') || addressLower.includes(', qc')) return { rate: 0.14975, name: 'GST+QST', province: 'Quebec' };
            if (addressLower.includes('british columbia') || addressLower.includes(', bc')) return { rate: 0.12, name: 'GST+PST', province: 'British Columbia' };
            if (addressLower.includes('alberta') || addressLower.includes(', ab')) return { rate: 0.05, name: 'GST', province: 'Alberta' };
            if (addressLower.includes('manitoba') || addressLower.includes(', mb')) return { rate: 0.12, name: 'GST+PST', province: 'Manitoba' };
            if (addressLower.includes('saskatchewan') || addressLower.includes(', sk')) return { rate: 0.11, name: 'GST+PST', province: 'Saskatchewan' };
            if (addressLower.includes('nova scotia') || addressLower.includes(', ns')) return { rate: 0.15, name: 'HST', province: 'Nova Scotia' };
            if (addressLower.includes('new brunswick') || addressLower.includes(', nb')) return { rate: 0.15, name: 'HST', province: 'New Brunswick' };
            if (addressLower.includes('newfoundland') || addressLower.includes(', nl')) return { rate: 0.15, name: 'HST', province: 'Newfoundland' };
            if (addressLower.includes('prince edward') || addressLower.includes(', pe')) return { rate: 0.15, name: 'HST', province: 'PEI' };
            if (addressLower.includes('toronto')) return { rate: 0.13, name: 'HST', province: 'Ontario' };
            if (addressLower.includes('vancouver')) return { rate: 0.12, name: 'GST+PST', province: 'British Columbia' };
            if (addressLower.includes('montreal')) return { rate: 0.14975, name: 'GST+QST', province: 'Quebec' };
            if (addressLower.includes('calgary') || addressLower.includes('edmonton')) return { rate: 0.05, name: 'GST', province: 'Alberta' };
            return { rate: 0.13, name: 'HST', province: 'Ontario' };
          };
          
          const taxInfo = getTaxRateByRegion(locationAddress);
          const netTotal = budgetTotal || 0;
          const taxAmount = netTotal * taxInfo.rate;
          const grossTotal = netTotal + taxAmount;
          
          const costBreakdownData = [
            { name: 'Materials', value: storedMaterialCost, color: 'hsl(200, 80%, 50%)', icon: Hammer },
            { name: 'Labor', value: storedLaborCost, color: 'hsl(160, 80%, 45%)', icon: Users },
            { name: 'Demolition', value: demoCost, color: 'hsl(280, 70%, 55%)', icon: AlertTriangle },
          ].filter(item => item.value > 0);
          
          const totalForPercentage = costBreakdownData.reduce((sum, item) => sum + item.value, 0);
          
          return (
            <div className="space-y-4">
              {/* ─── Compact Header ─── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-950/30 via-orange-950/20 to-amber-950/30"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ boxShadow: ['0 0 12px rgba(251,191,36,0.2)', '0 0 24px rgba(251,191,36,0.5)', '0 0 12px rgba(251,191,36,0.2)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"
                  >
                    <DollarSign className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 tracking-tight">Financial Command Center</h4>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300/80">Real-time budget analytics</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300/80 bg-amber-500/15 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {taxInfo.province}
                  </span>
                  <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] px-2 py-0.5 gap-1">
                    <Unlock className="h-2.5 w-2.5" /> Owner
                  </Badge>
                </div>
              </motion.div>

              {hasFinancialData ? (
                <>
                  {/* ─── Totals Row: Net → Tax → Gross ─── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-2"
                  >
                    {/* Net */}
                     <div className="p-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/25 to-orange-950/15 relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent" />
                       <div className="relative">
                         <div className="flex items-center gap-1.5 mb-1">
                           <div className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
                           <span className="text-[9px] text-amber-700 dark:text-amber-200/80 uppercase tracking-widest font-semibold">Net</span>
                         </div>
                         <p className="text-lg font-bold text-amber-950 dark:text-white font-mono leading-tight">
                           ${netTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    {/* Tax */}
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-950/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent" />
                      <div className="relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                           <span className="text-[9px] text-amber-700 dark:text-amber-300/80 uppercase tracking-widest font-semibold">{taxInfo.name} {(taxInfo.rate * 100).toFixed(1)}%</span>
                         </div>
                         <p className="text-lg font-bold text-amber-800 dark:text-amber-200 font-mono leading-tight">
                           +${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    {/* Gross */}
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent" />
                      <div className="relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                           <span className="text-[9px] text-emerald-700 dark:text-emerald-300/90 uppercase tracking-widest font-semibold">Gross</span>
                         </div>
                         <p className="text-xl font-black text-emerald-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-emerald-300 dark:to-teal-300 font-mono leading-tight">
                           ${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                         </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* ─── Cost Breakdown: Horizontal Compact Cards + Inline Bar ─── */}
                  {costBreakdownData.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-2"
                    >
                      {/* Stacked bar */}
                      <div className="h-2.5 rounded-full overflow-hidden flex bg-amber-900/25 border border-amber-500/15">
                        {costBreakdownData.map((item, i) => (
                          <motion.div
                            key={item.name}
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / totalForPercentage) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                            style={{ backgroundColor: item.color }}
                            className="h-full first:rounded-l-full last:rounded-r-full"
                          />
                        ))}
                      </div>

                      {/* Compact cost items */}
                      <div className="grid grid-cols-1 gap-1.5">
                        {costBreakdownData.map((item, i) => {
                          const ItemIcon = item.icon;
                          const pct = ((item.value / totalForPercentage) * 100).toFixed(1);
                          return (
                            <motion.div
                              key={item.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.08 }}
                              className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-500/15 bg-gradient-to-r from-amber-950/20 to-orange-950/10 hover:from-amber-950/30 hover:to-orange-950/20 transition-colors group"
                            >
                              <div
                                className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${item.color}22`, borderColor: `${item.color}44`, borderWidth: 1 }}
                              >
                                <ItemIcon className="h-3.5 w-3.5" style={{ color: item.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                   <span className="text-xs font-semibold text-amber-900 dark:text-white/90">{item.name}</span>
                                   <span className="text-sm font-bold text-amber-950 dark:text-white font-mono">${item.value.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="flex-1 h-1 rounded-full bg-amber-900/30 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: item.color }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-amber-700 dark:text-white/60 font-mono w-10 text-right">{pct}%</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Donut Chart + GFA in compact row ─── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {/* Mini Donut */}
                    {costBreakdownData.length > 0 && (
                      <div className="p-3 rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-950/20 to-orange-950/10 flex items-center gap-3">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            {costBreakdownData.map((item, index) => {
                              const previousTotal = costBreakdownData.slice(0, index).reduce((sum, i) => sum + i.value, 0);
                              const startAngle = (previousTotal / totalForPercentage) * 360;
                              const endAngle = ((previousTotal + item.value) / totalForPercentage) * 360;
                              const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                              const startRad = (startAngle - 90) * Math.PI / 180;
                              const endRad = (endAngle - 90) * Math.PI / 180;
                              const x1 = 50 + 40 * Math.cos(startRad);
                              const y1 = 50 + 40 * Math.sin(startRad);
                              const x2 = 50 + 40 * Math.cos(endRad);
                              const y2 = 50 + 40 * Math.sin(endRad);
                              return (
                                <motion.path
                                  key={item.name}
                                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                  fill={item.color}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                                  style={{ transformOrigin: 'center' }}
                                />
                              );
                            })}
                            <circle cx="50" cy="50" r="22" fill="#1c1208" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-amber-900 dark:text-white/90">${(totalForPercentage / 1000).toFixed(0)}K</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {costBreakdownData.map(item => (
                            <div key={item.name} className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-[10px] text-amber-800 dark:text-white/70">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GFA Reference */}
                    {gfaCitation && gfaValue ? (
                      <div className="p-3 rounded-xl border border-amber-500/15 bg-amber-950/10 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                          <Ruler className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-[9px] text-amber-300/80 uppercase tracking-widest">GFA</p>
                           <p className="text-sm font-bold text-amber-950 dark:text-white">{gfaValue.toLocaleString()} <span className="text-[10px] text-amber-700 dark:text-amber-300/70">sq ft</span></p>
                           {budgetTotal > 0 && (
                             <p className="text-[10px] text-amber-700 dark:text-amber-300/70 font-mono">${(budgetTotal / gfaValue).toFixed(2)}/sq ft</p>
                           )}
                        </div>
                      </div>
                     ) : costBreakdownData.length === 0 ? null : (
                       <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-950/10 flex items-center justify-center">
                         <span className="text-[10px] text-amber-400/50">No GFA data</span>
                       </div>
                    )}
                  </motion.div>

                  {/* ─── Cost Trend Chart (Full-screen) ─── */}
                  {totalForPercentage > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="p-4 rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-950/25 via-orange-950/15 to-yellow-950/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-0.5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                           <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider">Cost Trend</span>
                         </div>
                         <span className="text-[10px] text-amber-700 dark:text-amber-300/80 font-mono">${totalForPercentage.toLocaleString()}</span>
                      </div>
                      {(() => {
                        const mat = storedMaterialCost;
                        const lab = storedLaborCost;
                        const dem = demoCost;
                        const pts = [
                          { label: 'W1', value: 0 },
                          { label: 'W2', value: Math.round(mat * 0.3) },
                          { label: 'W3', value: Math.round(mat * 0.6 + lab * 0.2) },
                          { label: 'W4', value: Math.round(mat * 0.9 + lab * 0.5 + dem * 0.5) },
                          { label: 'Now', value: Math.round(mat + lab + dem) },
                        ];
                        const maxV = Math.max(...pts.map(p => p.value), 1);
                        const svgPts = pts.map((p, i) => ({
                          x: (i / (pts.length - 1)) * 280,
                          y: 75 - (p.value / maxV) * 65,
                          ...p,
                        }));
                        return (
                          <div className="relative">
                            <svg viewBox="0 0 280 80" className="w-full h-24" preserveAspectRatio="none">
                              {[0, 25, 50, 75].map(y => (
                                <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(251,191,36,0.06)" strokeWidth="0.5" />
                              ))}
                              <path
                                d={`M0,75 L${svgPts.map(p => `${p.x},${p.y}`).join(' L')} L280,75 Z`}
                                fill="url(#fsTrendGrad)" opacity="0.3"
                              />
                              <path
                                d={`M${svgPts.map(p => `${p.x},${p.y}`).join(' L')}`}
                                fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="2" strokeLinecap="round"
                              />
                              {svgPts.map((p, i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r={i === svgPts.length - 1 ? 4 : 2}
                                    fill={i === svgPts.length - 1 ? '#f59e0b' : 'rgba(251,191,36,0.4)'}
                                    stroke={i === svgPts.length - 1 ? '#d97706' : 'none'} strokeWidth="1"
                                  />
                                  <circle cx={p.x} cy={p.y} r="16" fill="transparent" className="cursor-pointer">
                                    <title>{p.label}: ${p.value.toLocaleString()}</title>
                                  </circle>
                                </g>
                              ))}
                              <defs>
                                <linearGradient id="fsTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="rgba(251,191,36,0.4)" />
                                  <stop offset="100%" stopColor="rgba(251,191,36,0)" />
                                </linearGradient>
                              </defs>
                            </svg>
                            {/* Interactive tooltip overlays */}
                            <div className="absolute inset-0">
                              {svgPts.map((p, i) => {
                                const leftPct = (p.x / 280) * 100;
                                const topPct = (p.y / 80) * 100;
                                return (
                                  <div
                                    key={i}
                                    className="absolute group/dot"
                                    style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
                                  >
                                    <div className="w-8 h-8 rounded-full cursor-pointer" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-amber-900/95 border border-amber-500/50 text-[10px] font-mono text-amber-100 whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150 shadow-lg shadow-amber-900/60 pointer-events-none z-10">
                                      {p.label}: <span className="font-bold text-amber-300">${p.value.toLocaleString()}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between mt-1 px-0.5">
                              {svgPts.map(p => (
                                <span key={p.label} className="text-[9px] text-amber-700 dark:text-amber-300/70 font-mono">{p.label}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* ─── Contracts Strip ─── */}
                  {contracts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center gap-2 px-1">
                        <div className="h-3 w-0.5 bg-gradient-to-b from-pink-400 to-rose-500 rounded-full" />
                        <span className="text-[10px] text-amber-800 dark:text-white/60 uppercase tracking-widest font-semibold">Contracts ({contracts.length})</span>
                      </div>
                      {contracts.map((contract, i) => (
                        <motion.div
                          key={contract.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.55 + i * 0.05 }}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/15 bg-gradient-to-r from-amber-950/15 to-orange-950/10 hover:border-pink-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-3.5 w-3.5 text-pink-400/70" />
                            <span className="font-mono text-xs text-amber-900 dark:text-white/80">#{contract.contract_number}</span>
                            <Badge
                              variant={contract.status === 'signed' ? 'default' : 'outline'}
                              className={cn(
                                "text-[9px] px-1.5 py-0",
                                contract.status === 'signed' && 'bg-green-500/20 text-green-300 border-green-500/30'
                              )}
                            >
                              {contract.status}
                            </Badge>
                          </div>
                          {contract.total_amount != null && (
                            <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 font-mono">
                              ${contract.total_amount.toLocaleString()}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* ─── Profit Section (only if set) ─── */}
                  {profitMargin !== null && profitPercent !== null && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-between p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-950/15"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-emerald-400" />
                        <div>
                          <span className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold block">Profit Margin</span>
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-300 font-mono">
                            ${profitMargin.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-lg text-center",
                        profitPercent >= 20 ? "bg-green-500/20 border border-green-500/30" : profitPercent >= 10 ? "bg-amber-500/20 border border-amber-500/30" : "bg-red-500/20 border border-red-500/30"
                      )}>
                        <span className={cn(
                          "text-sm font-bold",
                          profitPercent >= 20 ? "text-green-300" : profitPercent >= 10 ? "text-amber-300" : "text-red-300"
                        )}>
                          {profitPercent.toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-white/60 block">
                          {profitPercent >= 20 ? 'Excellent' : profitPercent >= 10 ? 'Good' : 'Review'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.97 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="p-10 rounded-xl border border-dashed border-amber-500/20 text-center bg-gradient-to-br from-amber-950/15 to-orange-950/10"
                 >
                   <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                     <DollarSign className="h-12 w-12 text-amber-500/40 mx-auto mb-4" />
                   </motion.div>
                    <p className="text-sm font-medium text-amber-200/80">No Financial Data</p>
                   <p className="text-xs text-amber-300/50 mt-1.5 max-w-xs mx-auto">
                    Add budget, materials, or contracts to activate
                  </p>
                </motion.div>
              )}
            </div>
          );
        })()}
        
        {panelCitations.length === 0 && !['panel-4-team', 'panel-5-timeline', 'panel-6-documents', 'panel-7-weather', 'panel-8-financial'].includes(panel.id) && (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No data recorded for this panel yet</p>
          </div>
        )}
      </div>
    );
  }, [getCitationsForPanel, renderCitationValue, teamMembers, weatherData, contracts, canViewFinancials, renderPanel5Content, documents, DOCUMENT_CATEGORIES]);
  
  // Render single panel
  const renderPanel = useCallback((panel: PanelConfig) => {
    const hasAccess = hasAccessToTier(panel.visibilityTier);
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
                  <h3 className="text-sm font-semibold text-muted-foreground">{panel.title}</h3>
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
        
        {/* Panel Header - Clickable to collapse/expand */}
        <div 
          className={cn("p-3 border-b cursor-pointer select-none", panel.bgColor)}
          onClick={() => togglePanelCollapse(panel.id)}
        >
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", panel.bgColor)}>
                <Icon className={cn("h-4 w-4", panel.color)} />
              </div>
              <div>
                <h3 className={cn("text-sm font-semibold", panel.color)}>
                  {dynamicTitle}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {dataCount > 0 ? `${dataCount} items` : panel.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTierBadge(panel.visibilityTier)}
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className={cn("h-4 w-4", panel.color)} />
              )}
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
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-muted-foreground">Loading project summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col overflow-hidden bg-[#0a0e1a]", className)}>
      {/* Compact Header */}
      <div className="px-4 py-2 border-b border-cyan-900/30 bg-[#0c1120]/90 backdrop-blur-sm shrink-0">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-light tracking-wide">
            <span className="text-white">Build</span>
            <span className="text-amber-500 font-semibold">Union</span>
          </h2>
          <p className="text-[10px] text-cyan-500/60">
            {projectData?.name || 'Project'} • Stage 8
          </p>
          <div className="flex items-center gap-2 mt-1">
            {dataSource !== 'supabase' && (
              <Badge variant="outline" className="bg-amber-950/30 text-amber-400 border-amber-800/50 gap-1 text-[10px]">
                <AlertTriangle className="h-2.5 w-2.5" />
                {dataSource === 'localStorage' ? 'Offline' : 'Mixed'}
              </Badge>
            )}
            {canViewFinancials && (
              <Badge variant="outline" className={cn(
                "gap-1 text-[10px] border-cyan-800/50",
                isFinancialSummaryUnlocked 
                  ? "bg-emerald-950/30 text-emerald-400" 
                  : "bg-red-950/30 text-red-400"
              )}>
                {isFinancialSummaryUnlocked ? <Unlock className="h-2.5 w-2.5" /> : <LockKeyhole className="h-2.5 w-2.5" />}
                {isFinancialSummaryUnlocked ? 'Unlocked' : 'Locked'}
              </Badge>
            )}
            <Badge variant="outline" className="bg-cyan-950/30 text-cyan-300 border-cyan-800/50 text-[10px]">
              {projectData?.status || 'draft'}
            </Badge>
            {userRole === 'owner' && (
              <Button
                variant={isEditModeEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditModeEnabled(!isEditModeEnabled)}
                className={cn(
                  "h-7 gap-1.5 text-[10px]",
                  isEditModeEnabled 
                    ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-500" 
                    : "border-cyan-800/50 text-cyan-400 hover:bg-cyan-950/30"
                )}
              >
                {isEditModeEnabled ? <Edit2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isEditModeEnabled ? 'Editing' : 'View'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Orbital Command Center Layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Ambient floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-cyan-400/20"
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

        {/* Desktop: Panels around central canvas */}
        <div className="hidden lg:grid h-full grid-cols-[280px_1fr_280px] grid-rows-[1fr_1fr_1fr_1fr_auto] gap-2 p-3 relative">
          
          {/* Left column - 4 panels */}
          {PANELS.slice(0, 4).map((panel, idx) => {
            const hasAccess = hasAccessToTier(panel.visibilityTier);
            const Icon = panel.icon;
            const panelCitations = getCitationsForPanel(panel.dataKeys);
            const isActive = activeOrbitalPanel === panel.id;
            const dataCount = panel.id === 'panel-4-team' ? teamMembers.length
              : panel.id === 'panel-5-timeline' ? tasks.length
              : panel.id === 'panel-6-documents' ? documents.length + contracts.length
              : panelCitations.length;

            let displayTitle = panel.title;
            if (panel.id === 'panel-3-trade') {
              const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
              if (tradeCitation?.answer) displayTitle = `${tradeCitation.answer} Template`;
            }

            // Get summary text for the panel
            const getSummaryText = () => {
              if (!hasAccess) return 'Restricted';
              if (panel.id === 'panel-1-basics') {
                const citCount = citations.filter(c => c.cite_type && c.answer).length;
                return `${projectData?.name || 'No name'} · ${citCount} citations`;
              }
              if (panel.id === 'panel-2-gfa') {
                const gfaCitation = panelCitations.find(c => c.cite_type === 'GFA_LOCK');
                return gfaCitation ? `${gfaCitation.answer}` : 'Not set';
              }
              if (panel.id === 'panel-3-trade') {
                const tradeCitation = panelCitations.find(c => c.cite_type === 'TRADE_SELECTION');
                return tradeCitation?.answer || 'No trade selected';
              }
              if (panel.id === 'panel-4-team') {
                return `${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`;
              }
              return `${dataCount} item${dataCount !== 1 ? 's' : ''}`;
            };

            // Rich visual data for left panels
            const renderPanelVisual = () => {
              if (!hasAccess) return null;
              if (panel.id === 'panel-1-basics') {
                const nameCit = panelCitations.find(c => c.cite_type === 'PROJECT_NAME');
                const locCit = panelCitations.find(c => c.cite_type === 'LOCATION');
                const workCit = panelCitations.find(c => c.cite_type === 'WORK_TYPE');
                const filled = [nameCit, locCit, workCit].filter(Boolean).length;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-cyan-950/50 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(filled / 3) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400">{filled}/3</span>
                    </div>
                    <div className="flex gap-1">
                      {[
                        { label: 'Name', done: !!nameCit },
                        { label: 'Loc', done: !!locCit },
                        { label: 'Type', done: !!workCit },
                      ].map(item => (
                        <span key={item.label} className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded-full border",
                          item.done
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-cyan-900/30 bg-cyan-950/30 text-cyan-700"
                        )}>
                          {item.done && <span className="mr-0.5">✓</span>}{item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              if (panel.id === 'panel-2-gfa') {
                const gfaCit = panelCitations.find(c => c.cite_type === 'GFA_LOCK');
                const gfaVal = gfaCit ? parseFloat(gfaCit.answer) : 0;
                const maxGfa = 10000;
                const pct = Math.min((gfaVal / maxGfa) * 100, 100);
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-blue-300 leading-none">{gfaVal > 0 ? gfaVal.toLocaleString() : '—'}</span>
                      <span className="text-[9px] text-blue-500 mb-0.5">sq ft</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cyan-950/50 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                );
              }
              if (panel.id === 'panel-3-trade') {
                const templateCit = panelCitations.find(c => c.cite_type === 'TEMPLATE_LOCK');
                const wastePct = templateCit?.metadata?.waste_percentage ? Number(templateCit.metadata.waste_percentage) : 0;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Hammer className="h-3 w-3 text-orange-400" />
                        <span className="text-[9px] text-orange-400">{templateCit ? 'Locked' : 'Pending'}</span>
                      </div>
                      {wastePct > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-300">
                          +{wastePct}% waste
                        </span>
                      )}
                    </div>
                    {templateCit && (
                      <div className="h-1 rounded-full bg-cyan-950/50 overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.5 }} />
                      </div>
                    )}
                  </div>
                );
              }
              if (panel.id === 'panel-4-team') {
                const roles = teamMembers.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-teal-300 leading-none">{teamMembers.length}</span>
                      <span className="text-[9px] text-teal-500 mb-0.5">members</span>
                    </div>
                    <div className="flex gap-0.5 items-end h-4">
                      {Object.entries(roles).slice(0, 5).map(([role, count]) => (
                        <TooltipProvider key={role}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                className="w-3 bg-gradient-to-t from-teal-500 to-teal-300 rounded-t-sm"
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max((count / teamMembers.length) * 16, 4)}px` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">{role}: {count}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            };

            return (
              <motion.button
                key={panel.id}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={cn(
                  "relative rounded-xl border text-left transition-all duration-200 overflow-hidden group",
                  isActive
                    ? "border-cyan-400/60 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    : "border-cyan-900/20 bg-[#0c1120]/70 hover:border-cyan-700/40 hover:bg-[#0c1120]/90",
                  !hasAccess && "opacity-40 cursor-not-allowed"
                )}
                onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                whileHover={hasAccess ? { scale: 1.02, x: 4 } : undefined}
                whileTap={hasAccess ? { scale: 0.98 } : undefined}
              >
                {/* Breathing glow overlay for active panel */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={{ 
                      boxShadow: [
                        '0 0 15px rgba(34,211,238,0.08)',
                        '0 0 25px rgba(34,211,238,0.18)',
                        '0 0 15px rgba(34,211,238,0.08)',
                      ]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="p-3 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center",
                          isActive ? "bg-cyan-500/20" : "bg-cyan-950/50"
                        )}
                        animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {hasAccess ? (
                          <Icon className={cn("h-3.5 w-3.5", isActive ? "text-cyan-300" : "text-cyan-600")} />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </motion.div>
                      <span className={cn(
                        "text-xs font-semibold",
                        isActive ? "text-cyan-200" : "text-cyan-500"
                      )}>
                        {displayTitle}
                      </span>
                    </div>
                    {dataCount > 0 && hasAccess && (
                      <motion.span 
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded",
                          isActive ? "bg-cyan-400/20 text-cyan-300" : "bg-cyan-950/50 text-cyan-700"
                        )}
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {dataCount}
                      </motion.span>
                    )}
                    {/* Unread chat badge for Team panel */}
                    {panel.id === 'panel-4-team' && unreadChatCount > 0 && !isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[9px] font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)] z-10"
                      >
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </motion.span>
                    )}
                  </div>
                  <p className={cn(
                    "text-[11px] leading-tight line-clamp-1 mb-1",
                    isActive ? "text-cyan-300/80" : "text-cyan-700/60"
                  )}>
                    {getSummaryText()}
                  </p>
                  {/* Rich visual metrics */}
                  {renderPanelVisual()}
                  {/* Tier badge */}
                  <div className="mt-1">
                    {getTierBadge(panel.visibilityTier)}
                  </div>
                </div>
                {/* Active glow bar with pulse */}
                {isActive && (
                  <motion.div
                    className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 to-blue-500"
                    layoutId="activePanelIndicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {/* Pointer arrow to canvas */}
                {isActive && (
                  <motion.div
                    className="absolute right-[-18px] top-1/2 -translate-y-1/2 z-20"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: [0, 4, 0] }}
                    transition={{ x: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.3 } }}
                  >
                    <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
                      <path d="M2 2L12 10L2 18" stroke="rgba(34,211,238,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}

          {/* Central Canvas - spans middle column, all 4 rows */}
          <motion.div
            className="row-span-5 relative rounded-2xl border border-cyan-800/30 bg-[#0c1120]/90 backdrop-blur-sm overflow-hidden flex flex-col"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Canvas header */}
            <div className="px-4 py-3 border-b border-cyan-900/30 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-blue-950/40 shrink-0">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="relative"
                >
                  <activePanelConfig.icon className="h-4 w-4 text-cyan-400" />
                </motion.div>
                <span className="text-sm font-semibold text-cyan-200">
                  {activePanelConfig.id === 'panel-3-trade' 
                    ? (() => { const tc = citations.find(c => c.cite_type === 'TRADE_SELECTION'); return tc?.answer ? `${tc.answer} Template` : activePanelConfig.title; })()
                    : t(activePanelConfig.titleKey, activePanelConfig.title)
                  }
                </span>
                {getTierBadge(activePanelConfig.visibilityTier)}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-950/30"
                  onClick={() => setFullscreenPanel(activePanelConfig.id)}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {/* Canvas content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOrbitalPanel}
                initial={{ opacity: 0, scale: 0.97, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.97, x: -30 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={cn(
                  "flex-1 p-4 overflow-y-auto",
                  activeOrbitalPanel === 'messa-deep-audit'
                    ? ""
                    : "[&_*]:text-foreground dark:[&_*]:text-foreground"
                )}
                ref={canvasContentRef}
                style={activeOrbitalPanel === 'messa-deep-audit' ? {} : { colorScheme: 'light' }}
              >
                {activeOrbitalPanel === 'messa-deep-audit' ? (
                  <div className="space-y-4">
                    {(() => {
                      // All citation lookups
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
                      const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
                      const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
                      const dnaCit = citations.find(c => c.cite_type === 'DNA_FINALIZED');
                      const photoCit = citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
                      const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
                      const demoPriceCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');

                      const pillarDetails = [
                        {
                          key: 'basics', label: '1 — Project Basics', sub: 'Name × Location × Work Type',
                          icon: '🏗️', color: 'border-emerald-500/40', headerBg: 'bg-emerald-500/10', textColor: 'text-emerald-400',
                          status: !!nameCit && !!locationCit && !!workTypeCit,
                          description: 'Validates that the project identity (Name, Address, Work Type) has been defined and cited.',
                          sources: [
                            { label: 'Project Name', citation: nameCit, field: 'PROJECT_NAME' },
                            { label: 'Location', citation: locationCit, field: 'LOCATION' },
                            { label: 'Work Type', citation: workTypeCit, field: 'WORK_TYPE' },
                          ],
                        },
                        {
                          key: 'area', label: '2 — Area & Dimensions', sub: 'GFA Lock × Blueprint × Site',
                          icon: '📐', color: 'border-blue-500/40', headerBg: 'bg-blue-500/10', textColor: 'text-blue-400',
                          status: !!gfaCit,
                          description: 'Geometric precision — AI-estimated vs Owner manually overridden GFA as authoritative source.',
                          sources: [
                            { label: 'GFA Lock', citation: gfaCit, field: 'GFA_LOCK' },
                            { label: 'Blueprint Upload', citation: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
                            { label: 'Site Condition', citation: siteCondCit, field: 'SITE_CONDITION' },
                          ],
                        },
                        {
                          key: 'trade', label: '3 — Trade & Template', sub: 'PDF RAG × Materials Table',
                          icon: '🔬', color: 'border-orange-500/40', headerBg: 'bg-orange-500/10', textColor: 'text-orange-400',
                          status: !!tradeCit && !!templateCit,
                          description: 'Verifies that PDF-extracted technical specs match the locked Materials Table entries.',
                          sources: [
                            { label: 'Trade Selection', citation: tradeCit, field: 'TRADE_SELECTION' },
                            { label: 'Template Lock', citation: templateCit, field: 'TEMPLATE_LOCK' },
                            { label: 'Execution Mode', citation: execModeCit, field: 'EXECUTION_MODE' },
                          ],
                        },
                        {
                          key: 'team', label: '4 — Team Architecture', sub: 'Structure × Roles × Permissions',
                          icon: '👥', color: 'border-teal-500/40', headerBg: 'bg-teal-500/10', textColor: 'text-teal-400',
                          status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0,
                          description: 'Validates team composition, role assignments, and permission structures.',
                          sources: [
                            { label: 'Team Structure', citation: teamStructCit, field: 'TEAM_STRUCTURE' },
                            { label: 'Team Size', citation: teamSizeCit, field: 'TEAM_SIZE' },
                            { label: 'Member Invites', citation: teamInviteCit, field: 'TEAM_MEMBER_INVITE' },
                            { label: 'Permission Set', citation: teamPermCit, field: 'TEAM_PERMISSION_SET' },
                          ],
                        },
                        {
                          key: 'timeline', label: '5 — Execution Timeline', sub: 'Start × End × DNA Finalized',
                          icon: '📅', color: 'border-indigo-500/40', headerBg: 'bg-indigo-500/10', textColor: 'text-indigo-400',
                          status: !!timelineCit && !!endDateCit,
                          description: 'Timeline integrity — start/end dates, DNA finalization, and task phase orchestration.',
                          sources: [
                            { label: 'Timeline (Start)', citation: timelineCit, field: 'TIMELINE' },
                            { label: 'End Date', citation: endDateCit, field: 'END_DATE' },
                            { label: 'DNA Finalized', citation: dnaCit, field: 'DNA_FINALIZED' },
                          ],
                        },
                        {
                          key: 'docs', label: '6 — Documents & Visual', sub: 'AI Vision × Trade Sync',
                          icon: '👁️', color: 'border-sky-500/40', headerBg: 'bg-sky-500/10', textColor: 'text-sky-400',
                          status: !!photoCit || !!blueprintCit,
                          description: 'AI Vision cross-reference: site photo content aligns with selected trade and blueprints.',
                          sources: [
                            { label: 'Site Photo / Visual', citation: photoCit, field: photoCit?.cite_type || 'SITE_PHOTO' },
                            { label: 'Blueprint', citation: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
                          ],
                        },
                        {
                          key: 'weather', label: '7 — Weather & Conditions', sub: 'Alerts × Site Readiness',
                          icon: '🌦️', color: 'border-cyan-500/40', headerBg: 'bg-cyan-500/10', textColor: 'text-cyan-400',
                          status: !!weatherCit || !!siteCondCit,
                          description: 'Weather alerts and site condition assessment for operational readiness.',
                          sources: [
                            { label: 'Weather Alert', citation: weatherCit, field: 'WEATHER_ALERT' },
                            { label: 'Site Condition', citation: siteCondCit, field: 'SITE_CONDITION' },
                          ],
                        },
                        {
                          key: 'financial', label: '8 — Financial Summary', sub: 'Sync + Tax (HST/GST)',
                          icon: '💰', color: 'border-red-500/40', headerBg: 'bg-red-500/10', textColor: 'text-red-400',
                          status: (financialSummary?.total_cost ?? 0) > 0 && !!locationCit,
                          description: 'Validates budget sync and regional tax calculation (HST 13% ON / GST 5%).',
                          sources: [
                            { label: 'Location (Tax Region)', citation: locationCit, field: 'LOCATION' },
                            { label: 'Demolition Price', citation: demoPriceCit, field: 'DEMOLITION_PRICE' },
                            { label: 'Total Budget', citation: null, field: 'FINANCIAL', customValue: financialSummary?.total_cost ? `$${financialSummary.total_cost.toLocaleString()} CAD` : 'Not set' },
                          ],
                        },
                      ];

                      const passCount = pillarDetails.filter(p => p.status).length;
                      const totalPillars = pillarDetails.length;

                      return (
                        <>
                          {/* Score Summary Bar */}
                          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-800/30 bg-emerald-950/20">
                            <div className={cn(
                              "text-2xl font-bold font-mono",
                              passCount === totalPillars ? "text-emerald-400" : passCount >= 5 ? "text-amber-400" : "text-red-400"
                            )}>
                              {passCount}/{totalPillars}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-medium text-emerald-300">DNA Integrity Score</div>
                              <div className="h-2 mt-1 rounded-full bg-emerald-950/50 overflow-hidden">
                                <motion.div
                                  className={cn(
                                    "h-full rounded-full",
                                    passCount === totalPillars ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                      : passCount >= 5 ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                      : "bg-gradient-to-r from-red-500 to-orange-400"
                                  )}
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${(passCount / totalPillars) * 100}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                            </div>
                            <Badge className={cn(
                              "text-[10px] font-mono border",
                              passCount === totalPillars ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : passCount >= 5 ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                            )}>
                              {passCount === totalPillars ? 'VERIFIED' : passCount >= 5 ? 'PARTIAL' : 'INCOMPLETE'}
                            </Badge>
                          </div>

                          {/* Pillar Cards */}
                          {pillarDetails.map((pillar, idx) => (
                            <motion.div
                              key={pillar.key}
                              className={cn("rounded-xl border overflow-hidden", pillar.color)}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.06 }}
                            >
                              <div className={cn("flex items-center gap-3 px-4 py-2.5", pillar.headerBg)}>
                                <span className="text-lg">{pillar.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className={cn("text-sm font-semibold", pillar.textColor)}>{pillar.label}</div>
                                  <div className="text-[10px] text-white/40">{pillar.sub}</div>
                                </div>
                                {pillar.status ? (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] gap-1 border">
                                    <CheckCircle2 className="h-3 w-3" /> PASS
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] gap-1 border">
                                    <Circle className="h-3 w-3" /> PENDING
                                  </Badge>
                                )}
                              </div>

                              <div className="px-4 py-3 space-y-3">
                                <p className="text-[11px] text-white/60 leading-relaxed">{pillar.description}</p>
                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Source References</div>
                                  {pillar.sources.map((src: any, si: number) => (
                                    <div
                                      key={si}
                                      className={cn(
                                        "flex items-start gap-2 px-3 py-2 rounded-lg border text-[11px]",
                                        src.citation ? "border-emerald-800/20 bg-emerald-950/10" : "border-red-800/20 bg-red-950/10"
                                      )}
                                    >
                                      <div className="mt-0.5">
                                        {src.citation ? (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        ) : src.customValue ? (
                                          (financialSummary?.total_cost ?? 0) > 0
                                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                            : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                        ) : (
                                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-white/80">{src.label}</span>
                                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-white/10 text-white/30 font-mono">
                                            {src.field}
                                          </Badge>
                                        </div>
                                        {src.citation ? (
                                          <div className="mt-1 space-y-0.5">
                                            <div className="text-white/60">
                                              <span className="text-white/30">Value: </span>
                                              <span className="text-emerald-300/80">{src.citation.answer || '—'}</span>
                                            </div>
                                            <div className="text-white/30 text-[9px] font-mono">
                                              cite:{src.citation.id} · {new Date(src.citation.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {src.citation.metadata && Object.keys(src.citation.metadata).length > 0 && (
                                              <div className="text-[9px] text-white/20 font-mono truncate">
                                                meta: {JSON.stringify(src.citation.metadata).slice(0, 80)}{JSON.stringify(src.citation.metadata).length > 80 ? '…' : ''}
                                              </div>
                                            )}
                                          </div>
                                        ) : src.customValue ? (
                                          <div className="mt-1 text-white/60">
                                            <span className="text-white/30">Value: </span>
                                            <span className="text-amber-300/80">{src.customValue}</span>
                                          </div>
                                        ) : (
                                          <div className="mt-1 text-amber-400/60 text-[10px]">
                                            ⚠ Citation not found — complete this step in the Wizard
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="[&_.text-muted-foreground]:text-slate-500 [&_h3]:text-slate-800 [&_span]:text-slate-700 [&_p]:text-slate-600 [&_.font-medium]:text-slate-800 [&_.font-semibold]:text-slate-900 bg-background rounded-xl p-3 min-h-full">
                    {renderPanelContent(activePanelConfig)}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Right column - 4 panels */}
          {PANELS.slice(4, 8).map((panel, idx) => {
            const hasAccess = hasAccessToTier(panel.visibilityTier);
            const Icon = panel.icon;
            const panelCitations = getCitationsForPanel(panel.dataKeys);
            const isActive = activeOrbitalPanel === panel.id;
            const dataCount = panel.id === 'panel-4-team' ? teamMembers.length
              : panel.id === 'panel-5-timeline' ? tasks.length
              : panel.id === 'panel-6-documents' ? documents.length + contracts.length
              : panelCitations.length;

            const getSummaryText = () => {
              if (!hasAccess) return 'Restricted';
              if (panel.id === 'panel-5-timeline') {
                const startCitation = panelCitations.find(c => c.cite_type === 'TIMELINE');
                const endCitation = panelCitations.find(c => c.cite_type === 'END_DATE');
                if (startCitation && endCitation) return `${startCitation.answer} → ${endCitation.answer}`;
                return `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
              }
              if (panel.id === 'panel-6-documents') {
                return `${documents.length} doc${documents.length !== 1 ? 's' : ''}, ${contracts.length} contract${contracts.length !== 1 ? 's' : ''}`;
              }
              if (panel.id === 'panel-7-weather') {
                if (weatherData?.temp != null) return `${weatherData.temp}° — ${weatherData.condition || 'Clear'}`;
                return 'Loading weather...';
              }
              if (panel.id === 'panel-8-financial') {
                if (!canViewFinancials) return 'Owner only';
                const total = financialSummary?.total_cost;
                if (total != null) return `$${total.toLocaleString()}`;
                return 'No data yet';
              }
              return `${dataCount} item${dataCount !== 1 ? 's' : ''}`;
            };

            // Rich visual data for right panels
            const renderRightPanelVisual = () => {
              if (!hasAccess) return null;
              if (panel.id === 'panel-5-timeline') {
                const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
                const totalTasks = tasks.length;
                const pct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-end gap-1">
                        <span className="text-lg font-bold text-violet-600 dark:text-indigo-300 leading-none">{completedTasks}</span>
                        <span className="text-[9px] text-violet-400 dark:text-indigo-500 mb-0.5">/{totalTasks}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-violet-500 dark:text-indigo-400">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-violet-100 dark:bg-cyan-950/50 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                );
              }
              if (panel.id === 'panel-6-documents') {
                const docCount = documents.length;
                const conCount = contracts.length;
                return (
                  <div className="flex gap-2 mt-0.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                      <FileText className="h-2.5 w-2.5 text-sky-400" />
                      <span className="text-[9px] font-mono text-sky-300">{docCount}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                      <FileCheck className="h-2.5 w-2.5 text-sky-400" />
                      <span className="text-[9px] font-mono text-sky-300">{conCount}</span>
                    </div>
                  </div>
                );
              }
              if (panel.id === 'panel-7-weather') {
                const temp = weatherData?.temp;
                if (temp == null) return null;
                const tempColor = temp > 30 ? 'from-red-400 to-orange-400' : temp > 15 ? 'from-amber-400 to-yellow-400' : temp > 0 ? 'from-sky-400 to-blue-400' : 'from-blue-400 to-indigo-400';
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-sky-300 leading-none">{temp}°</span>
                      <span className="text-[9px] text-sky-500 mb-0.5">{weatherData?.condition || ''}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cyan-950/50 overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full bg-gradient-to-r", tempColor)}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Math.max(((temp + 10) / 50) * 100, 5), 100)}%` }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              }
              if (panel.id === 'panel-8-financial') {
                if (!canViewFinancials) return null;
                const mat = financialSummary?.material_cost || 0;
                const lab = financialSummary?.labor_cost || 0;
                const total = financialSummary?.total_cost || 0;
                if (total <= 0) return null;
                const matPct = (mat / total) * 100;
                const labPct = (lab / total) * 100;
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-red-300 leading-none">${total > 0 ? total.toLocaleString() : '—'}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-cyan-950/50">
                      <motion.div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" initial={{ width: 0 }} animate={{ width: `${matPct}%` }} transition={{ duration: 0.6 }} />
                      <motion.div className="h-full bg-gradient-to-r from-red-400 to-red-500" initial={{ width: 0 }} animate={{ width: `${labPct}%` }} transition={{ duration: 0.6, delay: 0.1 }} />
                    </div>
                    <div className="flex gap-2 text-[8px]">
                      <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Mat</span>
                      <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Lab</span>
                    </div>
                  </div>
                );
              }
              return null;
            };

            return (
              <motion.button
                key={panel.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 + 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={cn(
                  "relative rounded-xl border text-left transition-all duration-200 overflow-hidden group",
                  isActive
                    ? "border-cyan-400/60 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    : "border-cyan-900/20 bg-[#0c1120]/70 hover:border-cyan-700/40 hover:bg-[#0c1120]/90",
                  !hasAccess && "opacity-40 cursor-not-allowed"
                )}
                onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                whileHover={hasAccess ? { scale: 1.02, x: -4 } : undefined}
                whileTap={hasAccess ? { scale: 0.98 } : undefined}
              >
                {/* Breathing glow overlay for active panel */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={{ 
                      boxShadow: [
                        '0 0 15px rgba(34,211,238,0.08)',
                        '0 0 25px rgba(34,211,238,0.18)',
                        '0 0 15px rgba(34,211,238,0.08)',
                      ]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="p-3 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <motion.div 
                        className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center",
                          isActive ? "bg-sky-500/20" : "bg-sky-950/50"
                        )}
                        animate={isActive ? { rotate: [0, -5, 5, 0] } : {}}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {hasAccess ? (
                          <Icon className={cn("h-3.5 w-3.5", isActive ? "text-sky-300" : "text-sky-500")} />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </motion.div>
                      <span className={cn(
                        "text-xs font-display font-bold tracking-wide",
                        isActive ? "text-white" : "text-gray-300"
                      )}>
                        {panel.title.split(' ').map((word, i) => (
                          <span key={i} className={i === 0 ? "" : "text-amber-500"}>{i > 0 ? ' ' : ''}{word}</span>
                        ))}
                      </span>
                    </div>
                    {dataCount > 0 && hasAccess && (
                      <motion.span 
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded",
                          isActive ? "bg-sky-400/20 text-sky-300" : "bg-sky-950/50 text-sky-400"
                        )}
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {dataCount}
                      </motion.span>
                    )}
                  </div>
                  <p className={cn(
                    "text-[11px] leading-tight line-clamp-1 mb-1",
                    isActive ? "text-cyan-300/80" : "text-cyan-700/60"
                  )}>
                    {getSummaryText()}
                  </p>
                  {/* Rich visual metrics */}
                  {renderRightPanelVisual()}
                  <div className="mt-1">
                    {getTierBadge(panel.visibilityTier)}
                  </div>
                </div>
                {/* Active glow bar */}
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 to-blue-500"
                    layoutId="activePanelIndicatorRight"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {/* Pointer arrow to canvas (pointing LEFT) */}
                {isActive && (
                  <motion.div
                    className="absolute left-[-18px] top-1/2 -translate-y-1/2 z-20"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: [0, -4, 0] }}
                    transition={{ x: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.3 } }}
                  >
                    <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
                      <path d="M12 2L2 10L12 18" stroke="rgba(34,211,238,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}


           {/* MESSA DNA Synthesis Panel - Grid item in right column, row 5 */}
           <motion.button
             className="col-start-3 rounded-xl border border-emerald-800/40 bg-gradient-to-br from-[#0a1628]/95 to-[#0d1f2d]/95 backdrop-blur-sm overflow-hidden cursor-pointer group relative text-left"
             initial={{ opacity: 0, x: 40 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.5, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
             whileHover={{ scale: 1.02, borderColor: 'rgba(16,185,129,0.5)' }}
             onClick={() => setActiveOrbitalPanel('messa-deep-audit')}
           >
             <motion.div
               className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent pointer-events-none"
               animate={{ top: ['0%', '100%', '0%'] }}
               transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
             />
             {activeOrbitalPanel === 'messa-deep-audit' && (
               <motion.div
                 className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400 to-green-500"
                 layoutId="activePanelIndicatorRight"
                 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
               />
             )}
             <div className="p-3 h-full flex flex-col justify-between">
               <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-2">
                   <motion.div
                     className={cn(
                       "h-7 w-7 rounded-lg flex items-center justify-center",
                       activeOrbitalPanel === 'messa-deep-audit' ? "bg-emerald-500/20" : "bg-emerald-950/50"
                     )}
                     animate={activeOrbitalPanel === 'messa-deep-audit' ? { rotate: [0, -5, 5, 0] } : {}}
                     transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                   >
                     <Sparkles className={cn("h-3.5 w-3.5", activeOrbitalPanel === 'messa-deep-audit' ? "text-emerald-300" : "text-emerald-500")} />
                   </motion.div>
                   <span className={cn(
                     "text-xs font-display font-bold tracking-wide",
                     activeOrbitalPanel === 'messa-deep-audit' ? "text-white" : "text-gray-300"
                   )}>
                     MESSA <span className="text-amber-500">DNA</span>
                   </span>
                 </div>
                 {(() => {
                   const passCount = [
                     !!citations.find(c => c.cite_type === 'PROJECT_NAME') && !!citations.find(c => c.cite_type === 'LOCATION') && !!citations.find(c => c.cite_type === 'WORK_TYPE'),
                     !!citations.find(c => c.cite_type === 'GFA_LOCK'),
                     !!citations.find(c => c.cite_type === 'TRADE_SELECTION') && !!citations.find(c => c.cite_type === 'TEMPLATE_LOCK'),
                     !!citations.find(c => c.cite_type === 'TEAM_STRUCTURE') || !!citations.find(c => c.cite_type === 'TEAM_SIZE') || teamMembers.length > 0,
                     !!citations.find(c => c.cite_type === 'TIMELINE') && !!citations.find(c => c.cite_type === 'END_DATE'),
                     !!citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION') || !!citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD'),
                     !!citations.find(c => c.cite_type === 'WEATHER_ALERT') || !!citations.find(c => c.cite_type === 'SITE_CONDITION'),
                     ((financialSummary?.total_cost ?? 0) > 0 && !!citations.find(c => c.cite_type === 'LOCATION')),
                   ].filter(Boolean).length;
                   return (
                     <motion.span
                       className={cn(
                         "text-[10px] font-mono px-1.5 py-0.5 rounded",
                         activeOrbitalPanel === 'messa-deep-audit' ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-950/50 text-emerald-400"
                       )}
                       animate={activeOrbitalPanel === 'messa-deep-audit' ? { scale: [1, 1.1, 1] } : {}}
                       transition={{ duration: 2, repeat: Infinity }}
                     >
                       {passCount}/8
                     </motion.span>
                   );
                 })()}
               </div>
               <p className={cn(
                 "text-[11px] leading-tight line-clamp-1 mb-1",
                 activeOrbitalPanel === 'messa-deep-audit' ? "text-emerald-300/80" : "text-emerald-700/60"
               )}>
                 8-Pillar Validation
               </p>
               {/* Score bar */}
               {(() => {
                 const passCount = [
                   !!citations.find(c => c.cite_type === 'PROJECT_NAME') && !!citations.find(c => c.cite_type === 'LOCATION') && !!citations.find(c => c.cite_type === 'WORK_TYPE'),
                   !!citations.find(c => c.cite_type === 'GFA_LOCK'),
                   !!citations.find(c => c.cite_type === 'TRADE_SELECTION') && !!citations.find(c => c.cite_type === 'TEMPLATE_LOCK'),
                   !!citations.find(c => c.cite_type === 'TEAM_STRUCTURE') || !!citations.find(c => c.cite_type === 'TEAM_SIZE') || teamMembers.length > 0,
                   !!citations.find(c => c.cite_type === 'TIMELINE') && !!citations.find(c => c.cite_type === 'END_DATE'),
                   !!citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION') || !!citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD'),
                   !!citations.find(c => c.cite_type === 'WEATHER_ALERT') || !!citations.find(c => c.cite_type === 'SITE_CONDITION'),
                   ((financialSummary?.total_cost ?? 0) > 0 && !!citations.find(c => c.cite_type === 'LOCATION')),
                 ].filter(Boolean).length;
                 const pct = (passCount / 8) * 100;
                 return (
                   <div className="h-1.5 rounded-full bg-emerald-950/50 overflow-hidden">
                     <motion.div
                       className={cn(
                         "h-full rounded-full",
                         pct === 100 ? "bg-gradient-to-r from-emerald-500 to-green-400"
                           : pct >= 60 ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                           : "bg-gradient-to-r from-red-500 to-orange-400"
                       )}
                       initial={{ width: '0%' }}
                       animate={{ width: `${pct}%` }}
                       transition={{ duration: 1, delay: 1.2, ease: 'easeOut' }}
                     />
                   </div>
                 );
               })()}
             </div>
           </motion.button>
        </div>

        {/* Mobile/Tablet: Tab-based layout */}
        <div className="lg:hidden flex flex-col h-full">
          {/* Tab strip with mini visuals */}
          <div className="flex overflow-x-auto gap-1.5 px-3 py-2 border-b border-cyan-900/30 bg-[#0c1120]/80 shrink-0">
            {PANELS.map((panel) => {
              const isActive = activeOrbitalPanel === panel.id;
              const hasAccess = hasAccessToTier(panel.visibilityTier);
              const Icon = panel.icon;
              const panelCitations = getCitationsForPanel(panel.dataKeys);

              // Mini metric for mobile tab
              const getMobileMetric = () => {
                if (!hasAccess) return null;
                if (panel.id === 'panel-1-basics') {
                  const citCount = citations.filter(c => c.cite_type && c.answer).length;
                  return <span className="text-[8px] font-mono opacity-70">{citCount} cit</span>;
                }
                if (panel.id === 'panel-2-gfa') {
                  const gfa = panelCitations.find(c => c.cite_type === 'GFA_LOCK');
                  return gfa ? <span className="text-[8px] font-mono opacity-70">{parseFloat(gfa.answer).toLocaleString()}</span> : null;
                }
                if (panel.id === 'panel-4-team') {
                  return <span className="text-[8px] font-mono opacity-70">{teamMembers.length}</span>;
                }
                if (panel.id === 'panel-5-timeline') {
                  const done = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
                  return <span className="text-[8px] font-mono opacity-70">{done}/{tasks.length}</span>;
                }
                if (panel.id === 'panel-6-documents') {
                  return <span className="text-[8px] font-mono opacity-70">{documents.length + contracts.length}</span>;
                }
                if (panel.id === 'panel-7-weather') {
                  return weatherData?.temp != null ? <span className="text-[8px] font-mono opacity-70">{weatherData.temp}°</span> : null;
                }
                if (panel.id === 'panel-8-financial') {
                  const total = financialSummary?.total_cost;
                  return total ? <span className="text-[8px] font-mono opacity-70">${(total / 1000).toFixed(0)}k</span> : null;
                }
                return null;
              };

              return (
                <button
                  key={panel.id}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all shrink-0 min-w-[60px]",
                    isActive 
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-cyan-700 hover:text-cyan-400 hover:bg-cyan-950/30",
                    !hasAccess && "opacity-30 cursor-not-allowed"
                  )}
                  onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                  disabled={!hasAccess}
                >
                  <div className="flex items-center gap-1">
                    {hasAccess ? <Icon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    <span className="text-[10px]">{panel.title.split(' ')[0]}</span>
                  </div>
                  {getMobileMetric()}
                  {/* Unread chat badge */}
                  {panel.id === 'panel-4-team' && unreadChatCount > 0 && !isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 h-4 min-w-[16px] px-0.5 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[8px] font-bold shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                    >
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </motion.span>
                  )}
                </button>
              );
            })}
            {/* MESSA DNA Tab */}
            {hasAccessToTier('owner') && (
              <button
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all shrink-0 min-w-[60px]",
                  activeOrbitalPanel === 'messa-deep-audit'
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-emerald-700 hover:text-emerald-400 hover:bg-emerald-950/30"
                )}
                onClick={() => setActiveOrbitalPanel('messa-deep-audit')}
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px]">DNA</span>
                </div>
                {(() => {
                  const passCount = [
                    !!citations.find(c => c.cite_type === 'PROJECT_NAME') && !!citations.find(c => c.cite_type === 'LOCATION') && !!citations.find(c => c.cite_type === 'WORK_TYPE'),
                    !!citations.find(c => c.cite_type === 'GFA_LOCK'),
                    !!citations.find(c => c.cite_type === 'TRADE_SELECTION') && !!citations.find(c => c.cite_type === 'TEMPLATE_LOCK'),
                    !!citations.find(c => c.cite_type === 'TEAM_STRUCTURE') || !!citations.find(c => c.cite_type === 'TEAM_SIZE') || teamMembers.length > 0,
                    !!citations.find(c => c.cite_type === 'TIMELINE') && !!citations.find(c => c.cite_type === 'END_DATE'),
                    !!citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION') || !!citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD'),
                    !!citations.find(c => c.cite_type === 'WEATHER_ALERT') || !!citations.find(c => c.cite_type === 'SITE_CONDITION'),
                    ((financialSummary?.total_cost ?? 0) > 0 && !!citations.find(c => c.cite_type === 'LOCATION')),
                  ].filter(Boolean).length;
                  return <span className="text-[8px] font-mono opacity-70">{passCount}/8</span>;
                })()}
              </button>
            )}
          </div>
          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4" ref={mobileContentRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOrbitalPanel}
                initial={{ opacity: 0, scale: 0.97, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -15 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="bg-background rounded-xl p-4 border border-cyan-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <activePanelConfig.icon className="h-5 w-5 text-cyan-600" />
                      <h3 className="text-sm font-semibold">{t(activePanelConfig.titleKey, activePanelConfig.title)}</h3>
                      {getTierBadge(activePanelConfig.visibilityTier)}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setFullscreenPanel(activePanelConfig.id)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {renderPanelContent(activePanelConfig)}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Fullscreen Panel Dialog */}
      <Dialog open={!!fullscreenPanel} onOpenChange={(open) => !open && setFullscreenPanel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {fullscreenPanelConfig && (() => {
            // ✓ DYNAMIC TITLE for fullscreen Panel 3
            const getFullscreenTitle = () => {
              if (fullscreenPanelConfig.id === 'panel-3-trade') {
                const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
                const tradeLabel = tradeCitation?.answer;
                if (tradeLabel) {
                  return `${tradeLabel} Template`;
                }
              }
              return t(fullscreenPanelConfig.titleKey, fullscreenPanelConfig.title);
            };
            
            return (
              <>
                <DialogHeader className={cn("pb-4 border-b", fullscreenPanelConfig.bgColor)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", fullscreenPanelConfig.bgColor)}>
                      <fullscreenPanelConfig.icon className={cn("h-5 w-5", fullscreenPanelConfig.color)} />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className={cn("text-lg", fullscreenPanelConfig.color)}>
                        {getFullscreenTitle()}
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground">{fullscreenPanelConfig.description}</p>
                    </div>
                    {getTierBadge(fullscreenPanelConfig.visibilityTier)}
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  {fullscreenPanelConfig.id === 'messa-deep-audit' ? (
                    // Deep Audit fullscreen content
                    <div className="space-y-5 px-2">
                      {(() => {
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
                        const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
                        const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
                        const dnaCit = citations.find(c => c.cite_type === 'DNA_FINALIZED');
                        const photoCit = citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
                        const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
                        const demoPriceCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');

                        const pillarDetails = [
                          {
                            key: 'basics', label: '1 — Project Basics', sub: 'Name × Location × Work Type',
                            icon: '🏗️', color: 'border-emerald-300 dark:border-emerald-500/40', headerBg: 'bg-emerald-50 dark:bg-emerald-500/10', textColor: 'text-emerald-700 dark:text-emerald-400',
                            status: !!nameCit && !!locationCit && !!workTypeCit,
                            description: 'Validates that the project identity (Name, Address, Work Type) has been defined and cited.',
                            sources: [
                              { label: 'Project Name', citation: nameCit, field: 'PROJECT_NAME' },
                              { label: 'Location', citation: locationCit, field: 'LOCATION' },
                              { label: 'Work Type', citation: workTypeCit, field: 'WORK_TYPE' },
                            ],
                          },
                          {
                            key: 'area', label: '2 — Area & Dimensions', sub: 'GFA Lock × Blueprint × Site',
                            icon: '📐', color: 'border-blue-300 dark:border-blue-500/40', headerBg: 'bg-blue-50 dark:bg-blue-500/10', textColor: 'text-blue-700 dark:text-blue-400',
                            status: !!gfaCit,
                            description: 'Geometric precision — AI-estimated vs Owner manually overridden GFA as authoritative source.',
                            sources: [
                              { label: 'GFA Lock', citation: gfaCit, field: 'GFA_LOCK' },
                              { label: 'Blueprint Upload', citation: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
                              { label: 'Site Condition', citation: siteCondCit, field: 'SITE_CONDITION' },
                            ],
                          },
                          {
                            key: 'trade', label: '3 — Trade & Template', sub: 'PDF RAG × Materials Table',
                            icon: '🔬', color: 'border-orange-300 dark:border-orange-500/40', headerBg: 'bg-orange-50 dark:bg-orange-500/10', textColor: 'text-orange-700 dark:text-orange-400',
                            status: !!tradeCit && !!templateCit,
                            description: 'Verifies that PDF-extracted technical specs match the locked Materials Table entries.',
                            sources: [
                              { label: 'Trade Selection', citation: tradeCit, field: 'TRADE_SELECTION' },
                              { label: 'Template Lock', citation: templateCit, field: 'TEMPLATE_LOCK' },
                              { label: 'Execution Mode', citation: execModeCit, field: 'EXECUTION_MODE' },
                            ],
                          },
                          {
                            key: 'team', label: '4 — Team Architecture', sub: 'Structure × Roles × Permissions',
                            icon: '👥', color: 'border-teal-300 dark:border-teal-500/40', headerBg: 'bg-teal-50 dark:bg-teal-500/10', textColor: 'text-teal-700 dark:text-teal-400',
                            status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0,
                            description: 'Validates team composition, role assignments, and permission structures.',
                            sources: [
                              { label: 'Team Structure', citation: teamStructCit, field: 'TEAM_STRUCTURE' },
                              { label: 'Team Size', citation: teamSizeCit, field: 'TEAM_SIZE' },
                              { label: 'Member Invites', citation: teamInviteCit, field: 'TEAM_MEMBER_INVITE' },
                              { label: 'Permission Set', citation: teamPermCit, field: 'TEAM_PERMISSION_SET' },
                            ],
                          },
                          {
                            key: 'timeline', label: '5 — Execution Timeline', sub: 'Start × End × DNA Finalized',
                            icon: '📅', color: 'border-indigo-300 dark:border-indigo-500/40', headerBg: 'bg-indigo-50 dark:bg-indigo-500/10', textColor: 'text-indigo-700 dark:text-indigo-400',
                            status: !!timelineCit && !!endDateCit,
                            description: 'Timeline integrity — start/end dates, DNA finalization, and task phase orchestration.',
                            sources: [
                              { label: 'Timeline (Start)', citation: timelineCit, field: 'TIMELINE' },
                              { label: 'End Date', citation: endDateCit, field: 'END_DATE' },
                              { label: 'DNA Finalized', citation: dnaCit, field: 'DNA_FINALIZED' },
                            ],
                          },
                          {
                            key: 'docs', label: '6 — Documents & Visual', sub: 'AI Vision × Trade Sync',
                            icon: '👁️', color: 'border-sky-300 dark:border-sky-500/40', headerBg: 'bg-sky-50 dark:bg-sky-500/10', textColor: 'text-sky-700 dark:text-sky-400',
                            status: !!photoCit || !!blueprintCit,
                            description: 'AI Vision cross-reference: site photo content aligns with selected trade and blueprints.',
                            sources: [
                              { label: 'Site Photo / Visual', citation: photoCit, field: photoCit?.cite_type || 'SITE_PHOTO' },
                              { label: 'Blueprint', citation: blueprintCit, field: 'BLUEPRINT_UPLOAD' },
                            ],
                          },
                          {
                            key: 'weather', label: '7 — Weather & Conditions', sub: 'Alerts × Site Readiness',
                            icon: '🌦️', color: 'border-cyan-300 dark:border-cyan-500/40', headerBg: 'bg-cyan-50 dark:bg-cyan-500/10', textColor: 'text-cyan-700 dark:text-cyan-400',
                            status: !!weatherCit || !!siteCondCit,
                            description: 'Weather alerts and site condition assessment for operational readiness.',
                            sources: [
                              { label: 'Weather Alert', citation: weatherCit, field: 'WEATHER_ALERT' },
                              { label: 'Site Condition', citation: siteCondCit, field: 'SITE_CONDITION' },
                            ],
                          },
                          {
                            key: 'financial', label: '8 — Financial Summary', sub: 'Sync + Tax (HST/GST)',
                            icon: '💰', color: 'border-red-300 dark:border-red-500/40', headerBg: 'bg-red-50 dark:bg-red-500/10', textColor: 'text-red-700 dark:text-red-400',
                            status: (financialSummary?.total_cost ?? 0) > 0 && !!locationCit,
                            description: 'Validates budget sync and regional tax calculation (HST 13% ON / GST 5%).',
                            sources: [
                              { label: 'Location (Tax Region)', citation: locationCit, field: 'LOCATION' },
                              { label: 'Demolition Price', citation: demoPriceCit, field: 'DEMOLITION_PRICE' },
                              { label: 'Total Budget', citation: null, field: 'FINANCIAL', customValue: financialSummary?.total_cost ? `$${financialSummary.total_cost.toLocaleString()} CAD` : 'Not set' },
                            ],
                          },
                        ];

                        const passCount = pillarDetails.filter(p => p.status).length;
                        const totalPillars = pillarDetails.length;

                        return (
                          <>
                            {/* Score Summary */}
                            <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20">
                              <div className={cn(
                                "text-4xl font-bold font-mono",
                                passCount === totalPillars ? "text-emerald-600 dark:text-emerald-400" : passCount >= 5 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {passCount}/{totalPillars}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">DNA Integrity Score</div>
                                <div className="h-3 mt-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 overflow-hidden">
                                  <motion.div
                                    className={cn(
                                      "h-full rounded-full",
                                      passCount === totalPillars ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                        : passCount >= 5 ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                        : "bg-gradient-to-r from-red-500 to-orange-400"
                                    )}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${(passCount / totalPillars) * 100}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>
                              <Badge className={cn(
                                "text-xs font-mono border px-3 py-1",
                                passCount === totalPillars ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                  : passCount >= 5 ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                  : "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
                              )}>
                                {passCount === totalPillars ? 'VERIFIED' : passCount >= 5 ? 'PARTIAL' : 'INCOMPLETE'}
                              </Badge>
                            </div>

                            {/* Pillar Cards - expanded */}
                            {pillarDetails.map((pillar, idx) => (
                              <motion.div
                                key={pillar.key}
                                className={cn("rounded-xl border overflow-hidden", pillar.color)}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                              >
                                <div className={cn("flex items-center gap-3 px-5 py-3", pillar.headerBg)}>
                                  <span className="text-xl">{pillar.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className={cn("text-sm font-bold", pillar.textColor)}>{pillar.label}</div>
                                    <div className="text-xs text-muted-foreground">{pillar.sub}</div>
                                  </div>
                                  {pillar.status ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-xs gap-1.5 border">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 text-xs gap-1.5 border">
                                      <Circle className="h-3.5 w-3.5" /> PENDING
                                    </Badge>
                                  )}
                                </div>

                                <div className="px-5 py-4 space-y-3">
                                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                                  <div className="space-y-2">
                                    <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">Source References</div>
                                    {pillar.sources.map((src: any, si: number) => (
                                      <div
                                        key={si}
                                        className={cn(
                                          "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm",
                                          src.citation ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/20 dark:bg-emerald-950/10" : "border-red-200 bg-red-50/50 dark:border-red-800/20 dark:bg-red-950/10"
                                        )}
                                      >
                                        <div className="mt-0.5">
                                          {src.citation ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                          ) : src.customValue ? (
                                            (financialSummary?.total_cost ?? 0) > 0
                                              ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                              : <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                          ) : (
                                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">{src.label}</span>
                                            <Badge variant="outline" className="text-[9px] px-2 py-0 font-mono">
                                              {src.field}
                                            </Badge>
                                          </div>
                                          {src.citation ? (
                                            <div className="mt-1.5 space-y-1">
                                              <div className="text-muted-foreground">
                                                <span className="text-muted-foreground/60">Value: </span>
                                                <span className="text-emerald-700 dark:text-emerald-300 font-medium">{src.citation.answer || '—'}</span>
                                              </div>
                                              <div className="text-muted-foreground/50 text-xs font-mono">
                                                cite:{src.citation.id} · {new Date(src.citation.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              </div>
                                              {src.citation.metadata && Object.keys(src.citation.metadata).length > 0 && (
                                                <div className="text-xs text-muted-foreground/40 font-mono truncate">
                                                  meta: {JSON.stringify(src.citation.metadata).slice(0, 120)}{JSON.stringify(src.citation.metadata).length > 120 ? '…' : ''}
                                                </div>
                                              )}
                                            </div>
                                          ) : src.customValue ? (
                                            <div className="mt-1.5 text-muted-foreground">
                                              <span className="text-muted-foreground/60">Value: </span>
                                              <span className="text-amber-700 dark:text-amber-300 font-medium">{src.customValue}</span>
                                            </div>
                                          ) : (
                                            <div className="mt-1.5 text-amber-600 dark:text-amber-400 text-sm">
                                              ⚠ Citation not found — complete this step in the Wizard
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  ) : renderFullscreenContent(fullscreenPanelConfig)}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      {/* Contract Template Dialog - Full Professional Contract with Editing & Signatures */}
      <Dialog open={showContractPreview} onOpenChange={setShowContractPreview}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-50/80 to-sky-50/80 dark:from-violet-950/30 dark:to-sky-950/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-violet-700 dark:text-violet-300">
                  {selectedContractType ? `${selectedContractType.charAt(0).toUpperCase() + selectedContractType.slice(1)} Construction Contract` : 'Construction Contract'}
                </h2>
                <p className="text-sm text-muted-foreground">Contract #{generateContractPreviewData.contractNumber}</p>
              </div>
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200">
                {selectedContractType === 'residential' ? '🏠' : selectedContractType === 'commercial' ? '🏢' : selectedContractType === 'industrial' ? '🏭' : '🔨'}
                {' '}{selectedContractType?.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          {/* Scrollable Contract Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Preamble */}
            <div className="p-4 rounded-lg bg-muted/30 border text-sm text-muted-foreground italic leading-relaxed">
              This {selectedContractType || 'Residential'} Construction Contract ("Agreement") is entered into and made effective as of the date set forth below, by and between the parties identified herein. This Agreement shall govern all construction, renovation, and related services to be performed at the property specified.
            </div>

            {/* Section 1: Parties */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                Parties to This Agreement
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Contractor (auto-filled) */}
                <div className="p-4 rounded-lg border-2 border-emerald-200/60 dark:border-emerald-700/30 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" /> Contractor
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-[10px] text-muted-foreground uppercase block">Company / Name</span><span className="font-medium">{generateContractPreviewData.contractorName || 'Not set'}</span></div>
                    <div><span className="text-[10px] text-muted-foreground uppercase block">Address</span><span className="font-medium">{generateContractPreviewData.contractorAddress || '—'}</span></div>
                    <div><span className="text-[10px] text-muted-foreground uppercase block">Phone</span><span className="font-medium">{generateContractPreviewData.contractorPhone || '—'}</span></div>
                    <div><span className="text-[10px] text-muted-foreground uppercase block">Email</span><span className="font-medium">{generateContractPreviewData.contractorEmail || '—'}</span></div>
                  </div>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-500 mt-2 italic">Auto-filled from your business profile</p>
                </div>
                
                {/* Client (editable) */}
                <div className="p-4 rounded-lg border-2 border-amber-200/60 dark:border-amber-700/30 bg-amber-50/30 dark:bg-amber-950/10">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Client (Owner)
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase block mb-1">Full Name *</label>
                      <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John Smith" className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase block mb-1">Email *</label>
                      <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase block mb-1">Phone</label>
                      <Input value={contractClientPhone} onChange={(e) => setContractClientPhone(e.target.value)} placeholder="(555) 123-4567" className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase block mb-1">Address</label>
                      <Input value={contractClientAddress} onChange={(e) => setContractClientAddress(e.target.value)} placeholder="123 Main St, City" className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Project Description */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Project Description
              </h3>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Project Name</p><p className="font-semibold text-sm">{generateContractPreviewData.projectName}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Trade / Service</p><p className="font-semibold text-sm">{generateContractPreviewData.trade}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Project Address</p><p className="font-semibold text-sm">{generateContractPreviewData.projectAddress}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Gross Floor Area</p><p className="font-semibold text-sm">{String(generateContractPreviewData.gfa)} {generateContractPreviewData.gfaUnit}</p></div>
                </div>
              </div>
            </div>

            {/* Section 3: Project Timeline */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                Project Timeline
                <Badge variant="outline" className="text-[8px] ml-auto">FROM CITATIONS</Badge>
              </h3>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="grid grid-cols-4 gap-4">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Commencement</p><p className="font-semibold text-sm">{String(generateContractPreviewData.startDate) !== 'Not set' ? new Date(String(generateContractPreviewData.startDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Completion</p><p className="font-semibold text-sm">{String(generateContractPreviewData.endDate) !== 'Not set' ? new Date(String(generateContractPreviewData.endDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Team Size</p><p className="font-semibold text-sm">{generateContractPreviewData.teamSize} members</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Work Items</p><p className="font-semibold text-sm">{generateContractPreviewData.taskCount} tasks</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  The Contractor shall commence work on or before the Commencement Date and shall use reasonable efforts to achieve substantial completion by the Expected Completion Date, subject to delays caused by force majeure, change orders, or conditions beyond the Contractor's control.
                </p>
              </div>
            </div>

            {/* Section 4: Scope of Work (editable) */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">4</span>
                Scope of Work
                <Badge variant="outline" className="text-[8px] ml-auto gap-1"><Edit2 className="h-2.5 w-2.5" /> EDITABLE</Badge>
              </h3>
              <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                <p className="text-xs text-muted-foreground">The Contractor agrees to furnish all labor, materials, equipment, and supervision necessary to complete the following:</p>
                <textarea
                  value={contractScopeOfWork}
                  onChange={(e) => setContractScopeOfWork(e.target.value)}
                  placeholder={`Complete ${generateContractPreviewData.trade} work at ${generateContractPreviewData.projectAddress}.\nGFA: ${generateContractPreviewData.gfa} ${generateContractPreviewData.gfaUnit}.\n\nInclude detailed description of work to be performed...`}
                  className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Section 5: Contract Value */}
            {financialSummary && (financialSummary.total_cost ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">5</span>
                  Contract Value
                </h3>
                <div className="p-4 rounded-lg border-2 border-violet-200/60 dark:border-violet-700/30 bg-gradient-to-r from-violet-50/50 to-sky-50/50 dark:from-violet-950/10 dark:to-sky-950/10">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Total Value</p>
                      <p className="font-bold text-xl text-violet-700 dark:text-violet-300">${(financialSummary.total_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Materials</p>
                      <p className="font-semibold text-sm">${(financialSummary.material_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Labor</p>
                      <p className="font-semibold text-sm">${(financialSummary.labor_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase block mb-1">Deposit (%)</label>
                      <Input 
                        type="number" value={contractDeposit} onChange={(e) => setContractDeposit(e.target.value)} 
                        placeholder="50" className="h-8 text-sm" min="0" max="100"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Deposit Amount</p>
                      <p className="font-semibold text-sm mt-1">${((financialSummary.total_cost ?? 0) * (Number(contractDeposit) || 50) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 6: Payment Terms (editable) */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">6</span>
                Payment Schedule
                <Badge variant="outline" className="text-[8px] ml-auto gap-1"><Edit2 className="h-2.5 w-2.5" /> EDITABLE</Badge>
              </h3>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <textarea
                  value={contractPaymentTerms}
                  onChange={(e) => setContractPaymentTerms(e.target.value)}
                  placeholder={selectedContractType === 'commercial' ? '30% upon contract execution\n40% upon substantial completion of rough-in work\n30% upon final completion and inspection' : '50% deposit upon contract execution\n50% upon substantial completion and final walkthrough'}
                  className="w-full min-h-[70px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Section 7: Legal Clauses */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">§</span>
                Terms & Conditions
              </h3>
              <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                <div className="text-xs text-muted-foreground space-y-3">
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Warranty:</strong> {selectedContractType === 'commercial' ? '2 years' : selectedContractType === 'industrial' ? '3 years + 10yr structural' : selectedContractType === 'renovation' ? '6 months' : '1 year'} from substantial completion on all workmanship and materials.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Insurance & Liability:</strong> Contractor shall maintain comprehensive general liability, workers' compensation, and professional liability insurance for the duration of the project.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Change Orders:</strong> Any changes to the scope, schedule, or cost must be documented in a written Change Order signed by both parties before work commences.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Dispute Resolution:</strong> Any dispute shall first be submitted to mediation. If mediation fails, the dispute shall be resolved by binding arbitration.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Termination:</strong> Either party may terminate with 14 days written notice. Upon termination, Client shall pay for all work completed and materials ordered.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Permits & Compliance:</strong> Contractor shall obtain all necessary permits and ensure compliance with applicable building codes, safety regulations, and environmental standards.</span></div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Governing Law:</strong> This Agreement shall be governed by the laws of the province/state in which the project is located.</span></div>
                </div>
              </div>
            </div>

            {/* Section 8: Additional Terms (editable) */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">+</span>
                Additional Terms
                <Badge variant="outline" className="text-[8px] ml-auto gap-1"><Edit2 className="h-2.5 w-2.5" /> OPTIONAL</Badge>
              </h3>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <textarea
                  value={contractAdditionalTerms}
                  onChange={(e) => setContractAdditionalTerms(e.target.value)}
                  placeholder="Add any additional terms, special conditions, or notes specific to this project..."
                  className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Section 9: Signatures */}
            <div>
              <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">✎</span>
                Signatures
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Contractor Signature */}
                <div className="p-4 rounded-lg border-2 border-emerald-200/60 dark:border-emerald-700/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Contractor Signature</p>
                  <SignatureCanvas
                    onSignatureChange={(sig) => setContractorSignatureData(sig)}
                    initialSignature={contractorSignatureData}
                    height={120}
                  />
                  <p className="text-xs text-muted-foreground mt-2">{generateContractPreviewData.contractorName || '________________________________'}</p>
                  <p className="text-[10px] text-muted-foreground">Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                
                {/* Client Signature (placeholder - will be signed via link) */}
                <div className="p-4 rounded-lg border-2 border-amber-200/60 dark:border-amber-700/30 bg-amber-50/20 dark:bg-amber-950/10">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Client Signature</p>
                  <div className="h-[120px] rounded-lg border-2 border-dashed border-amber-300/50 flex items-center justify-center bg-amber-50/30 dark:bg-amber-950/20">
                    <div className="text-center">
                      <Mail className="h-6 w-6 text-amber-400 mx-auto mb-1" />
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Client signs via secure link</p>
                      <p className="text-[10px] text-muted-foreground">Sent to their email after creation</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{clientName || '________________________________'}</p>
                  <p className="text-[10px] text-muted-foreground">Date: Pending client signature</p>
                </div>
              </div>
            </div>

            {/* Signature status feedback */}
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                  <p className="font-medium">Signature Status</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      {contractorSignatureData ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                      Contractor: {contractorSignatureData ? 'Signed ✓' : 'Not signed'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                      Client: Pending (via email)
                    </span>
                  </div>
                  <p className="text-muted-foreground">The client will receive a secure link to view, review, and sign this contract electronically.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowContractPreview(false)}>
              Cancel
            </Button>
            
            <div className="flex-1" />
            
            {/* Download PDF */}
            <Button 
              variant="outline"
              className="gap-2"
              disabled={isGeneratingContract}
              onClick={async () => {
                setIsGeneratingContract(true);
                try {
                  const contractData: ContractTemplateData = {
                    contractNumber: generateContractPreviewData.contractNumber,
                    contractType: (selectedContractType as ContractTemplateData['contractType']) || 'residential',
                    projectName: generateContractPreviewData.projectName,
                    projectAddress: generateContractPreviewData.projectAddress,
                    gfa: generateContractPreviewData.gfa,
                    gfaUnit: generateContractPreviewData.gfaUnit,
                    trade: generateContractPreviewData.trade,
                    startDate: String(generateContractPreviewData.startDate),
                    endDate: String(generateContractPreviewData.endDate),
                    teamSize: generateContractPreviewData.teamSize,
                    taskCount: generateContractPreviewData.taskCount,
                    contractorName: generateContractPreviewData.contractorName,
                    contractorPhone: generateContractPreviewData.contractorPhone,
                    contractorEmail: generateContractPreviewData.contractorEmail,
                    contractorAddress: generateContractPreviewData.contractorAddress,
                    clientName: clientName || undefined,
                    clientEmail: clientEmail || undefined,
                    totalAmount: financialSummary?.total_cost || undefined,
                  };
                  await downloadContractPDF(contractData);
                  toast.success('Professional contract PDF downloaded!');
                } catch (err) {
                  console.error('PDF generation failed:', err);
                  toast.error('Failed to generate PDF');
                } finally {
                  setIsGeneratingContract(false);
                }
              }}
            >
              {isGeneratingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </Button>
            
            {/* Create & Send */}
            <Button 
              className="gap-2 bg-violet-600 hover:bg-violet-700"
              disabled={isSendingContract || !clientEmail || !clientName || !contractorSignatureData}
              onClick={async () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(clientEmail)) {
                  toast.error('Please enter a valid email address');
                  return;
                }
                if (!contractorSignatureData) {
                  toast.error('Please sign the contract before sending');
                  return;
                }
                
                setIsSendingContract(true);
                try {
                  const { data: newContract, error: contractError } = await supabase.from('contracts').insert({
                    user_id: userId,
                    project_id: projectId,
                    contract_number: generateContractPreviewData.contractNumber,
                    template_type: selectedContractType || 'residential',
                    project_name: generateContractPreviewData.projectName,
                    project_address: generateContractPreviewData.projectAddress,
                    client_name: clientName,
                    client_email: clientEmail,
                    client_phone: contractClientPhone || null,
                    client_address: contractClientAddress || null,
                    total_amount: financialSummary?.total_cost || 0,
                    deposit_percentage: Number(contractDeposit) || 50,
                    deposit_amount: ((financialSummary?.total_cost ?? 0) * (Number(contractDeposit) || 50) / 100),
                    scope_of_work: contractScopeOfWork || `Complete ${generateContractPreviewData.trade} work at ${generateContractPreviewData.projectAddress}. GFA: ${generateContractPreviewData.gfa} ${generateContractPreviewData.gfaUnit}.`,
                    payment_schedule: contractPaymentTerms || null,
                    additional_terms: contractAdditionalTerms || null,
                    contractor_signature: { data: contractorSignatureData, signed_at: new Date().toISOString() } as any,
                    start_date: typeof generateContractPreviewData.startDate === 'string' && generateContractPreviewData.startDate !== 'Not set' 
                      ? (() => { try { return new Date(generateContractPreviewData.startDate as string).toISOString().split('T')[0]; } catch { return null; } })()
                      : null,
                    estimated_end_date: typeof generateContractPreviewData.endDate === 'string' && generateContractPreviewData.endDate !== 'Not set'
                      ? (() => { try { return new Date(generateContractPreviewData.endDate as string).toISOString().split('T')[0]; } catch { return null; } })()
                      : null,
                    contractor_name: generateContractPreviewData.contractorName,
                    contractor_phone: generateContractPreviewData.contractorPhone,
                    contractor_email: generateContractPreviewData.contractorEmail,
                    status: 'pending_client',
                  }).select().single();
                  
                  if (contractError) throw contractError;
                  
                  const baseUrl = window.location.origin;
                  const contractUrl = `${baseUrl}/contract/sign?token=${newContract.share_token}`;
                  
                  const { error: emailError } = await supabase.functions.invoke('send-contract-email', {
                    body: {
                      clientEmail,
                      clientName,
                      contractorName: generateContractPreviewData.contractorName || 'Your Contractor',
                      projectName: generateContractPreviewData.projectName,
                      contractUrl,
                      contractId: newContract.id,
                    },
                  });
                  
                  if (emailError) {
                    console.error('Email send failed:', emailError);
                    toast.warning('Contract created but email failed to send. Share the link manually.');
                  } else {
                    await supabase.from('contracts').update({
                      sent_to_client_at: new Date().toISOString(),
                    }).eq('id', newContract.id);
                    toast.success(`Contract signed & sent to ${clientName}!`);
                  }
                  
                  setShowContractPreview(false);
                  setClientEmail('');
                  setClientName('');
                  setContractClientPhone('');
                  setContractClientAddress('');
                  setContractScopeOfWork('');
                  setContractPaymentTerms('');
                  setContractAdditionalTerms('');
                  setContractDeposit('50');
                  setContractorSignatureData(null);
                  
                  // Refresh contracts list
                  const { data: updatedContracts } = await supabase
                    .from('contracts')
                    .select('id, contract_number, status, total_amount, share_token, project_name, client_name, client_email, contractor_name, contractor_email, start_date, estimated_end_date, contractor_signature, client_signature, client_signed_at, sent_to_client_at, client_viewed_at')
                    .eq('project_id', projectId)
                    .is('archived_at', null);
                  if (updatedContracts) setContracts(updatedContracts);
                  
                  // Add CONTRACT citation
                  const newContractCitation: Citation = {
                    id: `cite_contract_${newContract.id.slice(0, 8)}`,
                    cite_type: 'CONTRACT' as any,
                    question_key: `contract_new`,
                    answer: `#${newContract.contract_number} — PENDING_CLIENT — Contractor Signed${financialSummary?.total_cost ? ` — $${financialSummary.total_cost.toLocaleString()}` : ''}`,
                    value: 'pending_client',
                    timestamp: new Date().toISOString(),
                    metadata: {
                      contract_id: newContract.id,
                      contract_number: newContract.contract_number,
                      status: 'pending_client',
                      total_amount: financialSummary?.total_cost || 0,
                      client_name: clientName,
                      contractor_name: generateContractPreviewData.contractorName,
                      client_signed: false,
                      contractor_signed: true,
                      sent_at: new Date().toISOString(),
                      source: 'contract_engine',
                    },
                  };
                  const citationsWithContract = [...citations, newContractCitation];
                  setCitations(citationsWithContract);
                  await supabase.from('project_summaries')
                    .update({ verified_facts: citationsWithContract as any })
                    .eq('project_id', projectId);
                  
                } catch (err) {
                  console.error('Contract creation failed:', err);
                  toast.error('Failed to create contract');
                } finally {
                  setIsSendingContract(false);
                }
              }}
            >
              {isSendingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {!contractorSignatureData ? 'Sign First to Send' : clientEmail && clientName ? 'Create & Send to Client' : 'Enter Client Info'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Action Bar - Command Center Theme */}
      <div className="border-t border-cyan-900/30 bg-[#0c1120]/95 backdrop-blur-sm p-3 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          {/* Loading Status Indicator */}
          <AnimatePresence>
            {(isGeneratingAI || isGeneratingSummary || isGeneratingInvoice) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-800/30">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <div className="absolute inset-0 animate-ping opacity-20">
                      <Loader2 className="h-4 w-4 text-cyan-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-cyan-300 truncate">
                      {isGeneratingAI && '🧠 M.E.S.S.A. Dual-Engine Analysis in progress — Gemini & GPT synthesizing...'}
                      {isGeneratingSummary && '📊 Generating comprehensive Project Summary — analyzing all data points...'}
                      {isGeneratingInvoice && '📄 Preparing Invoice — calculating financials...'}
                    </p>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-cyan-950/80 overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          isGeneratingAI && "bg-gradient-to-r from-emerald-500 to-green-400",
                          isGeneratingSummary && "bg-gradient-to-r from-blue-500 to-cyan-400",
                          isGeneratingInvoice && "bg-gradient-to-r from-amber-500 to-yellow-400"
                        )}
                        initial={{ width: '5%' }}
                        animate={{ width: ['5%', '45%', '65%', '80%', '90%'] }}
                        transition={{ duration: 25, ease: 'easeOut', times: [0, 0.2, 0.5, 0.8, 1] }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left - Stats */}
            <div className="text-xs text-cyan-700 flex flex-wrap gap-3 font-mono">
              <span><span className="text-cyan-400 font-medium">{citations.length}</span> citations</span>
              <span><span className="text-teal-400 font-medium">{teamMembers.length}</span> team</span>
              <span><span className="text-blue-400 font-medium">{tasks.length}</span> tasks</span>
              <span><span className="text-pink-400 font-medium">{documents.length}</span> docs</span>
            </div>
            
            {/* Right - Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {canViewFinancials && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInvoice}
                  disabled={isGeneratingInvoice}
                  className="gap-1.5 text-xs border-amber-800/50 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300 bg-transparent"
                >
                  {isGeneratingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Invoice
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="gap-1.5 text-xs border-blue-800/50 text-blue-400 hover:bg-blue-950/30 hover:text-blue-300 bg-transparent"
              >
                {isGeneratingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                Summary
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDnaReportPdf}
                disabled={isGeneratingDnaReport}
                className="gap-1.5 text-xs border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/30 hover:text-emerald-300 bg-transparent"
              >
                {isGeneratingDnaReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                DNA Report
              </Button>

              {(userRole === 'owner' || userRole === 'foreman') && (
                <Button
                  size="sm"
                  onClick={handleMessaSynthesis}
                  disabled={isGeneratingAI}
                  className="gap-1.5 text-xs bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md shadow-emerald-900/30"
                >
                  {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  M.E.S.S.A.
                </Button>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        onClick={handleComplete}
                        disabled={isSaving || (userRole === 'owner' && !isFinancialSummaryUnlocked)}
                        className={cn(
                          "gap-1.5 text-xs shadow-md",
                          userRole === 'owner' && !isFinancialSummaryUnlocked
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-cyan-900/30"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : userRole === 'owner' && !isFinancialSummaryUnlocked ? (
                          <LockKeyhole className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Finish
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {userRole === 'owner' && !isFinancialSummaryUnlocked && (
                    <TooltipContent side="top">
                      <p className="text-xs">Add financial data to unlock</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Weather & Location Modal - Conditional render for build compatibility */}
      {weatherModalOpen && (
        <WeatherMapModal
          open={weatherModalOpen}
          onOpenChange={setWeatherModalOpen}
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
        />
      )}
      
      {/* Document Preview Modal */}
      {previewDocument && (
        <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
            
            {/* Preview content */}
            <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 min-h-[400px]">
              {previewDocument.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img 
                  src={getDocumentPreviewUrl(previewDocument.file_path)} 
                  alt={previewDocument.file_name}
                  className="max-w-full max-h-[60vh] mx-auto object-contain rounded-lg shadow-lg"
                />
              ) : previewDocument.file_name.match(/\.pdf$/i) ? (
                <iframe
                  src={getDocumentPreviewUrl(previewDocument.file_path)}
                  className="w-full h-[60vh] rounded-lg border"
                  title={previewDocument.file_name}
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
      
      {/* Invoice Preview Modal */}
      {showInvoicePreview && invoicePreviewData && (
        <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                Invoice Preview - #{invoicePreviewData.invoiceNumber}
              </DialogTitle>
            </DialogHeader>
            
            {/* Invoice Preview Content */}
            <div className="flex-1 overflow-auto border rounded-lg bg-white">
              <iframe
                srcDoc={invoicePreviewHtml}
                className="w-full h-[500px] border-0"
                title="Invoice Preview"
              />
            </div>
            
            {/* Action Buttons */}
            <DialogFooter className="flex-wrap gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDownloadInvoice}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveInvoiceToDocuments}
                disabled={isSavingInvoice}
                className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300"
              >
                {isSavingInvoice ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                Save to Documents
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setShowInvoicePreview(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Project Summary Preview Modal */}
      {showSummaryPreview && summaryPreviewHtml && (
        <Dialog open={showSummaryPreview} onOpenChange={setShowSummaryPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Project Summary Preview
              </DialogTitle>
            </DialogHeader>
            
            {/* Summary Preview Content */}
            <div className="flex-1 overflow-auto border rounded-lg bg-white">
              <iframe
                srcDoc={summaryPreviewHtml}
                className="w-full h-[500px] border-0"
                title="Summary Preview"
              />
            </div>
            
            {/* Action Buttons */}
            <DialogFooter className="flex-wrap gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDownloadSummary}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveSummaryToDocuments}
                disabled={isSavingSummary}
                className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300"
              >
                {isSavingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                Save to Documents
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setShowSummaryPreview(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* M.E.S.S.A. Synthesis Preview Modal */}
      {showMessaPreview && messaSynthesisData && (
        <Dialog open={showMessaPreview} onOpenChange={setShowMessaPreview}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                M.E.S.S.A. Synthesis - {messaSynthesisData.synthesisId}
                {messaSynthesisData.dualEngineUsed && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-green-600 text-white text-[10px]">
                    Dual Engine
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto border rounded-lg bg-neutral-950">
              <iframe
                srcDoc={messaPreviewHtml}
                className="w-full h-[500px] border-0"
                title="M.E.S.S.A. Synthesis Preview"
              />
            </div>
            
            <DialogFooter className="flex-wrap gap-2 sm:gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const { downloadPDF } = await import('@/lib/pdfGenerator');
                    await downloadPDF(messaPreviewHtml, {
                      filename: `messa-synthesis-${messaSynthesisData.synthesisId}.pdf`,
                      pageFormat: 'letter',
                      margin: 10,
                    });
                    toast.success('M.E.S.S.A. Report downloaded!');
                  } catch (err) {
                    toast.error('Download failed');
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('stage8.messaDownload', 'Download PDF')}
              </Button>
              
              <Button
                variant="outline"
                onClick={async () => {
                  setIsSavingMessa(true);
                  try {
                    const html2canvas = (await import('html2canvas')).default;
                    const jsPDF = (await import('jspdf')).jsPDF;
                    
                    const container = document.createElement('div');
                    container.innerHTML = messaPreviewHtml;
                    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:900px;';
                    document.body.appendChild(container);
                    
                    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
                    document.body.removeChild(container);
                    
                    const pdf = new jsPDF({ format: 'letter', unit: 'mm' });
                    const imgData = canvas.toDataURL('image/png');
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const imgHeight = (canvas.height * pageWidth) / canvas.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
                    
                    const blob = pdf.output('blob');
                    const filePath = `${projectId}/${Date.now()}-messa-synthesis.pdf`;
                    
                    await supabase.storage.from('project-documents').upload(filePath, blob, { contentType: 'application/pdf' });
                    await supabase.from('project_documents').insert({
                      project_id: projectId,
                      file_name: `messa-synthesis-${messaSynthesisData.synthesisId}.pdf`,
                      file_path: filePath,
                      file_size: blob.size,
                    });
                    
                    toast.success('M.E.S.S.A. Report saved to Documents!');
                    setShowMessaPreview(false);
                  } catch (err) {
                    toast.error('Save failed');
                  } finally {
                    setIsSavingMessa(false);
                  }
                }}
                disabled={isSavingMessa}
                className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300"
              >
                {isSavingMessa ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                {t('stage8.messaSave', 'Save to Documents')}
              </Button>
              
              <Button variant="ghost" onClick={() => setShowMessaPreview(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
      
    </div>
  );
}
