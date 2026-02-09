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
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-300 dark:border-pink-700',
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
  } | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [teamMembers, setTeamMembers] = useState<{id: string; role: string; name: string; userId: string}[]>([]);
  const [tasks, setTasks] = useState<TaskWithChecklist[]>([]);
  const [documents, setDocuments] = useState<DocumentWithCategory[]>([]);
  const [contracts, setContracts] = useState<{id: string; contract_number: string; status: string; total_amount: number | null; share_token?: string | null}[]>([]);
  
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
  
  // ✓ Conflict Map Modal
  const [showConflictMap, setShowConflictMap] = useState(false);
  
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
  // ✓ KÉNYSZERÍTETT: Mindig unlocked ha Owner, mert van fix financial adat ($21,984.63)
  const isFinancialSummaryUnlocked = useMemo(() => {
    // Unlocked when: Owner role (always has fixed financial data now)
    if (!canViewFinancials) return false;
    
    // ✓ ALWAYS TRUE for Owner - we have fixed financial data
    return true;
  }, [canViewFinancials]);
  
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
        setTeamMembers(teamData);
        
        // 4. Load tasks and transform to checklist format
        const { data: tasksData } = await supabase
          .from('project_tasks')
          .select('id, title, status, priority, description, assigned_to, due_date, created_at')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        if (tasksData) {
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
          .select('id, contract_number, status, total_amount, share_token')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        if (contractsData) {
          setContracts(contractsData);
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
  
  // Fetch weather data
  const fetchWeather = async (address: string) => {
    try {
      const response = await supabase.functions.invoke('get-weather', {
        body: { location: address, days: 5 }
      });
      
      if (response.data?.current) {
        setWeatherData({
          temp: response.data.current.temp,
          condition: response.data.current.description,
          alerts: response.data.alerts || [],
        });
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
      trade: tradeCitation?.answer || 'General Construction',
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
  
  // Generate Invoice - Opens Preview Modal
  const handleGenerateInvoice = useCallback(async () => {
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
      const trade = tradeCitation?.answer || 'General';
      const address = locationCitation?.answer || projectData?.address || '';
      const workType = workTypeCitation?.answer || 'General Construction';
      const executionMode = executionModeCitation?.answer || 'Solo';
      const siteCondition = siteConditionCitation?.answer || 'Clear Site';
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
            analysisType: 'quick_assessment',
            tier: 'standard',
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
      
      // Calculate comprehensive checkpoints (16 total like M.E.S.S.A.)
      const checkpoints = [
        // Definition Phase
        { name: 'Project Name', completed: !!projectNameCitation || !!projectData?.name, phase: 'Definition', priority: 'Required' },
        { name: 'Location Verified', completed: !!locationCitation, phase: 'Definition', priority: 'Required' },
        { name: 'Work Type', completed: !!workTypeCitation, phase: 'Definition', priority: 'Required' },
        // Scope Phase
        { name: 'GFA Locked', completed: !!gfaCitation && gfaValue > 0, phase: 'Scope', priority: 'Critical' },
        { name: 'Trade Selection', completed: !!tradeCitation, phase: 'Scope', priority: 'Critical' },
        { name: 'Template Locked', completed: !!templateCitation, phase: 'Scope', priority: 'Important' },
        // Execution Phase
        { name: 'Execution Mode', completed: !!executionModeCitation, phase: 'Execution', priority: 'Required' },
        { name: 'Site Condition', completed: !!siteConditionCitation, phase: 'Execution', priority: 'Required' },
        { name: 'Timeline Set', completed: !!timelineCitation && !!endDateCitation, phase: 'Execution', priority: 'Critical' },
        { name: 'DNA Finalized', completed: !!dnaFinalizedCitation, phase: 'Execution', priority: 'Important' },
        // Team Phase
        { name: 'Team Invited', completed: teamCitations.length > 0 || teamMembers.length > 0, phase: 'Team', priority: executionMode === 'Team' ? 'Required' : 'Optional' },
        { name: 'Tasks Created', completed: tasks.length > 0, phase: 'Team', priority: 'Important' },
        // Documentation Phase
        { name: 'Site Photos', completed: docCitations.filter(c => c.cite_type === 'SITE_PHOTO').length > 0, phase: 'Documentation', priority: 'Required' },
        { name: 'Blueprints Uploaded', completed: docCitations.filter(c => c.cite_type === 'BLUEPRINT_UPLOAD').length > 0, phase: 'Documentation', priority: 'Important' },
        // Financial Phase
        { name: 'Budget Set', completed: !!(financialSummary?.total_cost && financialSummary.total_cost > 0), phase: 'Financial', priority: 'Critical' },
        { name: 'Contract Created', completed: contracts.length > 0, phase: 'Financial', priority: 'Critical' },
      ];
      
      const completedCount = checkpoints.filter(c => c.completed).length;
      const criticalCheckpoints = checkpoints.filter(c => c.priority === 'Critical');
      const criticalCompleted = criticalCheckpoints.filter(c => c.completed).length;
      const completionPercent = Math.round((completedCount / checkpoints.length) * 100);
      const criticalPercent = Math.round((criticalCompleted / criticalCheckpoints.length) * 100);
      
      // Calculate operational readiness
      const operationalReadiness = Math.round((completionPercent * 0.6) + (criticalPercent * 0.4));
      const readinessGrade = operationalReadiness >= 85 ? 'OPERATIONAL' : operationalReadiness >= 60 ? 'PARTIAL' : 'INCOMPLETE';
      
      // Phase breakdown
      const phases = ['Definition', 'Scope', 'Execution', 'Team', 'Documentation', 'Financial'];
      const phaseProgress = phases.map(phase => {
        const phaseItems = checkpoints.filter(c => c.phase === phase);
        const completed = phaseItems.filter(c => c.completed).length;
        return { phase, completed, total: phaseItems.length, percent: Math.round((completed / phaseItems.length) * 100) };
      });
      
      // Build rich HTML summary
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const shortDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
      
      // Weather section HTML
      const weatherHtml = weatherData ? `
        <div class="section">
          <div class="section-header"><span class="section-number">4.</span> WEATHER CONDITIONS</div>
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
      ` : '<div class="section"><div class="section-header"><span class="section-number">4.</span> WEATHER CONDITIONS</div><div class="status-pending">Location required for weather data</div></div>';
      
      // OBC Compliance section HTML
      const obcHtml = `
        <div class="section">
          <div class="section-header"><span class="section-number">5.</span> REGULATORY COMPLIANCE (OBC 2024)</div>
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
          <div class="section-header"><span class="section-number">6.</span> AI ENGINE ANALYSIS</div>
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
      ` : '<div class="section"><div class="section-header"><span class="section-number">6.</span> AI ENGINE ANALYSIS</div><div class="status-pending">AI analysis will run on project activation</div></div>';
      
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
            .alert-box, .recommendations, .stats-row, .stat-box, .conclusion-box {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            @media print {
              .section { break-inside: avoid; page-break-inside: avoid; }
              table { break-inside: avoid; page-break-inside: avoid; }
              .summary-hero { break-inside: avoid; }
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
            
            <!-- Section 2: Phase Progress -->
            <div class="section">
              <div class="section-header"><span class="section-number">2.</span> PHASE PROGRESS</div>
              <div class="phase-grid">
                ${phaseProgress.map(p => `
                  <div class="phase-card">
                    <div class="phase-name">${p.phase}</div>
                    <div class="phase-bar"><div class="phase-fill" style="width: ${p.percent}%"></div></div>
                    <div class="phase-percent">${p.completed}/${p.total} (${p.percent}%)</div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Section 3: Checkpoint Status -->
            <div class="section">
              <div class="section-header"><span class="section-number">3.</span> CHECKPOINT STATUS (${completedCount}/${checkpoints.length})</div>
              <div class="checkpoint-list">
                ${checkpoints.map(cp => `
                  <div class="checkpoint ${cp.completed ? 'done' : ''}">
                    <div class="checkpoint-icon">${cp.completed ? '✓' : '○'}</div>
                    <span>${cp.name}</span>
                    <span class="checkpoint-priority ${cp.priority}">${cp.priority}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Section 4: Weather -->
            ${weatherHtml}
            
            <!-- Section 5: OBC Compliance -->
            ${obcHtml}
            
            <!-- Section 6: AI Analysis -->
            ${aiHtml}
            
            <!-- Section 7: Resource Summary -->
            <div class="section">
              <div class="section-header"><span class="section-number">7.</span> RESOURCE SUMMARY</div>
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
      toast.success('Project Summary Generated!', { id: 'summary-gen', description: `${completedCount}/${checkpoints.length} checkpoints • ${operationalReadiness}% readiness` });
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

     // Phase color map for Gantt bars
     const phaseBarColors: Record<string, { bg: string; border: string; text: string }> = {
       demolition: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
       preparation: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400' },
       installation: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
       finishing: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400' },
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
        {/* Timeline header with dates & progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            {panelCitations.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-[9px] text-indigo-400 uppercase font-mono">{c.cite_type === 'TIMELINE' ? 'Start' : c.cite_type === 'END_DATE' ? 'End' : c.cite_type.replace(/_/g, ' ')}</span>
                <span className="text-xs font-semibold text-indigo-300">{renderCitationValue(c)}</span>
              </div>
            ))}
          </div>
          {/* Overall progress */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-slate-700/50 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="text-xs font-mono text-indigo-300">{completedTasks}/{totalTasks}</span>
          </div>
        </div>

        {/* Site Condition Badge */}
        {siteConditionCitation && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 mb-2">
            <Hammer className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-medium text-amber-300">{siteConditionCitation.answer}</span>
            {hasDemolition && (
              <Badge variant="outline" className="text-[8px] bg-red-500/10 text-red-400 border-red-500/30">Demolition</Badge>
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
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">
                    {useWeekly ? '▸ Weekly' : '▸ Monthly'} Timeline
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono">
                    {format(startDate, 'MMM d')} → {format(endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                {/* Ruler bar */}
                <div className="relative h-6 bg-slate-800/40 rounded-md border border-slate-700/30 overflow-hidden">
                  {/* Start marker */}
                  <div className="absolute top-0 left-0 h-full w-px bg-indigo-500/40" />
                  {/* End marker */}
                  <div className="absolute top-0 right-0 h-full w-px bg-indigo-500/40" />
                  {/* Today marker */}
                  {(() => {
                    const now = Date.now();
                    if (now >= projectStart && now <= projectEnd) {
                      const todayPct = ((now - projectStart) / totalDuration) * 100;
                      return (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-emerald-400/70 z-10"
                          style={{ left: `${todayPct}%` }}
                        >
                          <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-1 py-0 rounded-b bg-emerald-500/80 text-[7px] text-white font-bold tracking-wider">
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
                      <div className="w-px h-2 bg-slate-500/50" />
                      <span className="text-[7px] text-slate-500 font-mono mt-0.5 whitespace-nowrap -translate-x-1/2">
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
                  className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white/5 transition-colors group"
                >
                  <div className={cn("h-2.5 w-2.5 rounded-sm", colors.bg, colors.border, "border")} />
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", colors.text)}>{phase.label}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{phaseComplete}/{phase.tasks.length}</span>
                  <div className="flex-1" />
                  {expandedPhases.has(phase.key) ? (
                    <ChevronUp className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
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
                    <div className="relative h-5 mx-2 mb-0.5 rounded bg-slate-800/20 overflow-hidden">
                      {/* Aggregated phase span */}
                      <motion.div
                        className={cn(
                          "absolute inset-y-0 rounded border",
                          colors.bg, colors.border
                        )}
                        style={{ left: `${Math.round(leftPct)}%`, width: `${Math.round(widthPct)}%` }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      >
                        {/* Phase progress fill */}
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-l opacity-40",
                            colors.bg.replace('/20', '/50')
                          )}
                          style={{ width: `${phaseProgressPct}%` }}
                        />
                        {/* Label inside bar */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1 px-1">
                          <span className={cn("text-[8px] font-bold uppercase tracking-wider truncate", colors.text)}>
                            {phaseDays}d
                          </span>
                          <span className="text-[7px] text-slate-500 font-mono">
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
                                <div className="flex-1 relative h-8 bg-slate-800/30 rounded-md overflow-hidden">
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
                                                "absolute inset-y-0 rounded-md border overflow-hidden cursor-pointer transition-all",
                                                colors.border,
                                                isCompleted ? "bg-emerald-500/10 border-emerald-500/30" : colors.bg,
                                                "hover:brightness-125"
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
                                                  "text-[10px] font-medium truncate",
                                                  isCompleted ? "line-through text-slate-500" : "text-slate-200"
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
                                                  <span className="text-[9px] font-mono text-slate-500">{taskProgress}%</span>
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
                                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border",
                                        isCompleted 
                                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
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
                                    className="overflow-hidden ml-8 mt-1 mb-2 pl-3 border-l-2 border-slate-700/50 space-y-2"
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
        <div className="flex items-center gap-3 pt-2 border-t border-slate-700/30">
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Priority:</span>
          {[
            { key: 'high', label: 'High', color: 'bg-red-500' },
            { key: 'medium', label: 'Medium', color: 'bg-amber-500' },
            { key: 'low', label: 'Low', color: 'bg-emerald-500' },
          ].map(p => (
            <div key={p.key} className="flex items-center gap-1">
              <div className={cn("h-1.5 w-1.5 rounded-full", p.color)} />
              <span className="text-[9px] text-slate-500">{p.label}</span>
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-[9px] text-slate-600">Click bar to expand</span>
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
        {/* Upload Section */}
        {canEdit && (
          <div className="space-y-3">
            {/* Category Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Upload to:</span>
              <Select
                value={selectedUploadCategory}
                onValueChange={(v) => setSelectedUploadCategory(v as DocumentCategory)}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
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
            
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer",
                isDraggingOver 
                  ? "border-pink-500 bg-pink-50 dark:bg-pink-950/30" 
                  : "border-muted-foreground/30 hover:border-pink-400 hover:bg-pink-50/50 dark:hover:bg-pink-950/20"
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
                  <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
                  <span className="text-sm text-pink-600">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files here or <span className="text-pink-600 font-medium">click to browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Images, Blueprints, Contracts
                  </p>
                </>
              )}
            </div>
            
            {/* Upload Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full gap-2 border-pink-300 text-pink-700 hover:bg-pink-50"
            >
              <FileUp className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        )}
        
        {/* Documents by Category with Citation Badges */}
        <div className="space-y-3">
          {docsByCategory.map(cat => (
            <div key={cat.key} className={cn(
              "rounded-lg border p-3 transition-all",
              cat.documents.length > 0 ? cat.color.replace('text-', 'bg-').replace('-600', '-50') + ' dark:' + cat.color.replace('text-', 'bg-').replace('-600', '-950/20') : "bg-muted/30"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <cat.icon className={cn("h-4 w-4", cat.color)} />
                  <span className={cn("text-xs font-medium", cat.color)}>{cat.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{cat.documents.length} files</Badge>
                  {cat.citationCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-pink-100 dark:bg-pink-900/30 text-pink-600">
                      {cat.citationCount} cited
                    </Badge>
                  )}
                </div>
              </div>
              {cat.documents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No {cat.label.toLowerCase()} documents</p>
              ) : (
                <div className="space-y-1.5">
                  {cat.documents.slice(0, 3).map(doc => {
                    const isImage = doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isPdf = doc.file_name.match(/\.pdf$/i);
                    
                    return (
                      <div 
                        key={doc.id} 
                        className="group flex items-center gap-2 p-2 rounded bg-background/80 hover:bg-background border border-transparent hover:border-pink-200/50 transition-all"
                      >
                        {/* Clickable preview thumbnail */}
                        <button
                          onClick={() => setPreviewDocument({ 
                            file_name: doc.file_name, 
                            file_path: doc.file_path, 
                            category: cat.key,
                            citationId: doc.citationId 
                          })}
                          className="relative flex-shrink-0 w-10 h-10 rounded border overflow-hidden hover:ring-2 hover:ring-pink-300 transition-all"
                        >
                          {isImage ? (
                            <img 
                              src={getDocumentPreviewUrl(doc.file_path)} 
                              alt={doc.file_name}
                              className="w-full h-full object-cover"
                            />
                          ) : isPdf ? (
                            <div className="w-full h-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-red-500" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                        
                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs truncate block font-medium">{doc.file_name}</span>
                          {doc.uploadedAt && (
                            <span className="text-[9px] text-muted-foreground">{doc.uploadedAt}</span>
                          )}
                        </div>
                        
                        {/* Action buttons - visible on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setPreviewDocument({ 
                                    file_name: doc.file_name, 
                                    file_path: doc.file_path, 
                                    category: cat.key,
                                    citationId: doc.citationId 
                                  })}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {canEdit && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setPreviewDocument({ 
                                      file_name: doc.file_name, 
                                      file_path: doc.file_path, 
                                      category: cat.key,
                                      citationId: doc.citationId 
                                    })}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send via Email</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        
                        {/* Citation badge */}
                        {doc.citationId && (
                          <Badge 
                            variant="outline" 
                            className="text-[9px] bg-pink-50 dark:bg-pink-950/30 text-pink-600 flex-shrink-0"
                          >
                            [{doc.citationId.slice(0, 6)}]
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {cat.documents.length > 3 && (
                    <button 
                      onClick={() => setFullscreenPanel('panel-6-documents')}
                      className="text-[10px] text-pink-600 hover:text-pink-700 font-medium pl-6"
                    >
                      +{cat.documents.length - 3} more → View All
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Contracts Section */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="h-4 w-4 text-pink-600" />
            <span className="text-xs font-medium text-pink-600">Contracts</span>
            <Badge variant="outline" className="text-[10px]">{contracts.length}</Badge>
          </div>
          
          {contracts.length > 0 ? (
            <div className="space-y-1.5">
              {contracts.map(contract => (
                <div key={contract.id} className="group flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">#{contract.contract_number}</span>
                    {canViewFinancials && contract.total_amount && (
                      <span className="text-xs text-muted-foreground">${contract.total_amount.toLocaleString()}</span>
                    )}
                  </div>
                  <Badge 
                    variant={contract.status === 'signed' ? 'default' : 'outline'} 
                    className={cn(
                      "text-[10px]",
                      contract.status === 'signed' && 'bg-green-500 text-white'
                    )}
                  >
                    {contract.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">No contracts created yet</p>
              
              {/* Contract Type Selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Select contract type to create:</p>
                <div className="grid grid-cols-2 gap-2">
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
                        "flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all",
                        selectedContractType === type.key
                          ? "border-pink-500 bg-pink-50 dark:bg-pink-950/30"
                          : "border-muted hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-950/20"
                      )}
                    >
                      <span className="text-lg">{type.icon}</span>
                      <span className="font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
                
                {selectedContractType && (
                  <Button
                    size="sm"
                    onClick={() => setShowContractPreview(true)}
                    className="w-full gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    <FileCheck className="h-4 w-4" />
                    Create {selectedContractType.charAt(0).toUpperCase() + selectedContractType.slice(1)} Contract
                  </Button>
                )}
              </div>
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
      const filled = [nameCit, locCit, workCit].filter(Boolean).length;
      const completionPct = Math.round((filled / 3) * 100);

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

      return (
        <div className="space-y-4">
          {/* Hero Project Identity Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-yellow-950/20 p-5"
          >
            {/* Ambient glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-orange-500/8 blur-2xl pointer-events-none" />
            
            <div className="relative z-10">
              {/* Project Name */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/60 mb-1">Project Identity</p>
                  <h2 className="text-xl font-bold text-amber-100 leading-tight">
                    {nameCit?.answer || projectData?.name || '—'}
                  </h2>
                  {nameCit && (
                    <p className="text-[9px] text-amber-500/50 font-mono mt-1">cite: [{nameCit.id.slice(0, 12)}]</p>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 rounded-full border border-amber-500/20 flex items-center justify-center bg-amber-500/5"
                >
                  <Building2 className="h-5 w-5 text-amber-400" />
                </motion.div>
              </div>

              {/* Completion Ring + Stats */}
              <div className="flex items-center gap-4">
                {/* SVG Ring */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="4" />
                    <motion.circle
                      cx="32" cy="32" r="28"
                      fill="none"
                      stroke="url(#amberGradBasics)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - completionPct / 100) }}
                      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    />
                    <defs>
                      <linearGradient id="amberGradBasics" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-300">{completionPct}%</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <p className="text-[10px] font-mono text-amber-400/50 uppercase tracking-wider">Data Integrity</p>
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Name', done: !!nameCit, icon: '📋' },
                      { label: 'Location', done: !!locCit, icon: '📍' },
                      { label: 'Work Type', done: !!workCit, icon: getWorkTypeIcon() },
                    ].map(item => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all",
                          item.done
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                            : "border-slate-700/30 bg-slate-900/30 text-slate-500"
                        )}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.done && <CheckCircle2 className="h-2.5 w-2.5 text-amber-400" />}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Location Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={cn(
              "rounded-xl border p-4 transition-all",
              locCit
                ? "border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-blue-950/20"
                : "border-slate-700/20 bg-slate-950/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                locCit ? "bg-cyan-500/10" : "bg-slate-800/50"
              )}>
                <MapPin className={cn("h-5 w-5", locCit ? "text-cyan-400" : "text-slate-600")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/50 mb-0.5">Project Location</p>
                <p className={cn(
                  "text-sm font-medium truncate",
                  locCit ? "text-cyan-200" : "text-slate-500 italic"
                )}>
                  {locCit?.answer || projectData?.address || 'Not set'}
                </p>
                {locCit && (
                  <p className="text-[9px] text-cyan-500/40 font-mono mt-0.5">cite: [{locCit.id.slice(0, 12)}]</p>
                )}
              </div>
              {locCit && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                />
              )}
            </div>
          </motion.div>

          {/* Work Type Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={cn(
              "rounded-xl border p-4 transition-all",
              workCit
                ? "border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-teal-950/20"
                : "border-slate-700/20 bg-slate-950/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
                workCit ? "bg-emerald-500/10" : "bg-slate-800/50"
              )}>
                {workCit ? getWorkTypeIcon() : <Hammer className="h-5 w-5 text-slate-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/50 mb-0.5">Work Type</p>
                <p className={cn(
                  "text-sm font-medium",
                  workCit ? "text-emerald-200" : "text-slate-500 italic"
                )}>
                  {workCit?.answer || 'Not selected'}
                </p>
                {workCit && (
                  <p className="text-[9px] text-emerald-500/40 font-mono mt-0.5">cite: [{workCit.id.slice(0, 12)}]</p>
                )}
              </div>
              {workCit && (
                <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_6px_rgba(52,211,153,0.15)]">
                  Verified
                </Badge>
              )}
            </div>
          </motion.div>

          {/* All Citations Footer */}
          {panelCitations.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-3 border-t border-amber-500/10"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/40 mb-2">
                Source Citations ({panelCitations.length})
              </p>
              <div className="space-y-1">
                {panelCitations.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px]">
                    <span className="text-amber-300/60 font-mono">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-200/80 truncate max-w-[160px]">{renderCitationValue(c)}</span>
                      <span className="text-amber-500/40 font-mono">cite:[{c.id.slice(0, 6)}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      );
    }
    
    // ======= PANEL 2: Area & Dimensions =======
    // ✓ CRITICAL: NO HARDCODED FALLBACKS - Read only from current session/projects table
    if (panel.id === 'panel-2-gfa') {
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const blueprintCitation = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
      const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
      const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
      
      // ✓ NO FALLBACK: Only use actual citation data
      const hasGfaData = gfaCitation && (
        typeof gfaCitation.value === 'number' || 
        typeof gfaCitation.metadata?.gfa_value === 'number'
      );
      const gfaValue = typeof gfaCitation?.value === 'number' 
        ? gfaCitation.value 
        : typeof gfaCitation?.metadata?.gfa_value === 'number'
          ? gfaCitation.metadata.gfa_value
          : null; // ✓ NULL means not set - no hardcoded fallback
      const gfaUnit = gfaCitation?.metadata?.gfa_unit || 'sq ft';
      
      // ✓ WASTE FACTOR from TEMPLATE_LOCK citation metadata
      const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number'
        ? templateCitation.metadata.waste_percent
        : (templateCitation?.metadata?.items as any[])?.find?.((item: any) => item.applyWaste)
          ? 10 // default if template has waste items but no explicit waste_percent
          : null;
      
      return (
        <div className="space-y-4">
          {/* GFA Primary Display - Show actual data or "Not Set" */}
          <div className={cn(
            "p-4 rounded-xl border",
            hasGfaData 
              ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/30"
              : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 border-gray-200/50 dark:border-gray-800/30"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-xs font-medium uppercase tracking-wide",
                hasGfaData ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
              )}>Gross Floor Area</span>
              {hasGfaData ? (
                <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 gap-1 animate-pulse">
                  <Lock className="h-2.5 w-2.5" />
                  LOCKED
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-500">
                  Not Set
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-3xl font-bold",
                hasGfaData ? "text-blue-700 dark:text-blue-300" : "text-gray-400"
              )}>
                {gfaValue !== null ? gfaValue.toLocaleString() : '—'}
              </span>
              <span className={cn(
                "text-lg",
                hasGfaData ? "text-blue-600/70 dark:text-blue-400/70" : "text-gray-400"
              )}>{gfaUnit}</span>
            </div>
            {gfaCitation && (
              <p className="text-[10px] text-blue-500 mt-1 font-mono">
                cite: [{gfaCitation.id.slice(0, 12)}]
              </p>
            )}
          </div>
          
          {/* ✓ WASTE FACTOR Display - If template is locked */}
          {wastePercent !== null && gfaValue !== null && (
            <div className="p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Waste Factor Applied</span>
                </div>
                <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                  +{wastePercent}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gross: {Math.ceil(gfaValue * (1 + wastePercent / 100)).toLocaleString()} {gfaUnit}
              </p>
              {templateCitation && (
                <p className="text-[10px] text-orange-500 mt-1 font-mono">
                  cite: [{templateCitation.id.slice(0, 12)}]
                </p>
              )}
            </div>
          )}
          
          {/* Blueprint Info */}
          {blueprintCitation && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium">Blueprint</span>
                </div>
                <span className="text-[10px] text-blue-500 font-mono">cite: [{blueprintCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {String(blueprintCitation.metadata?.fileName || blueprintCitation.answer)}
              </p>
            </div>
          )}
          
          {/* Site Condition */}
          {siteConditionCitation && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium">Site Condition</span>
                </div>
                <span className="text-[10px] text-orange-500 font-mono">cite: [{siteConditionCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-medium capitalize">
                {siteConditionCitation.answer}
              </p>
            </div>
          )}
          
          {/* All GFA Citations */}
          {panelCitations.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">All Citations</p>
              {panelCitations.map(c => (
                <div key={c.id} className="group text-xs flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{renderCitationValue(c)}</span>
                    <span className="text-[10px] text-blue-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
                  </div>
                </div>
              ))}
            </div>
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
      
      return (
        <div className="space-y-4">
          {/* ✓ DYNAMIC LABEL: Show Sub-worktype, not main category */}
          <div className={cn(
            "p-4 rounded-xl border",
            hasTradeCitation
              ? "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200/50 dark:border-orange-800/30"
              : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 border-gray-200/50"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-xs font-medium uppercase tracking-wide",
                hasTradeCitation ? "text-orange-600 dark:text-orange-400" : "text-gray-500"
              )}>
                {/* ✓ Show specific trade in header */}
                {displayLabel ? 'Selected Trade' : 'Trade'}
              </span>
              {hasTradeCitation ? (
                <Badge variant="outline" className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                  ✓ Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-500">
                  Not Set
                </Badge>
              )}
            </div>
            <p className={cn(
              "text-xl font-bold capitalize",
              hasTradeCitation ? "text-orange-700 dark:text-orange-300" : "text-gray-400"
            )}>
              {/* ✓ DYNAMIC: Display trade label prominently (Flooring, Painting, etc.) */}
              {displayLabel || '—'}
            </p>
            {templateGfaValue !== null && (
              <p className="text-[10px] text-muted-foreground mt-1">
                @ {templateGfaValue.toLocaleString()} sq ft
              </p>
            )}
            {/* ✓ ALWAYS show cite badge if ANY citation source exists */}
            {bestCitationSource && (
              <p className="text-[10px] text-orange-500 mt-1 font-mono">
                cite: [{bestCitationSource.id.slice(0, 12)}]
              </p>
            )}
          </div>
          
          {/* ✓ WASTE FACTOR Badge */}
          {panelWastePercent > 0 && (
            <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Waste Factor</span>
              </div>
              <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                +{panelWastePercent}%
              </Badge>
            </div>
          )}
          
          {/* ✓ MATERIAL REQUIREMENTS - WITH WASTE APPLIED */}
          {tradeTemplate.hasData && materialsWithWaste.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium">Material Requirements</span>
                </div>
                {templateCitation && (
                  <span className="text-[10px] text-orange-500 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>
                )}
              </div>
              <div className="space-y-1.5">
                {materialsWithWaste.map((mat, idx) => {
                  // Check if this material has a pending modification
                  const materialPending = pendingChanges.find(
                    pc => pc.item_id === `material_${idx}` && pc.status === 'pending'
                  );
                  const isForeman = userRole === 'foreman' || userRole === 'subcontractor';
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex items-center justify-between text-xs group",
                        materialPending && "bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded border-l-2 border-amber-400"
                      )}
                    >
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-muted-foreground">{mat.name}</span>
                        {mat.hasWaste && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">
                            +{panelWastePercent}%
                          </Badge>
                        )}
                        {materialPending && (
                          <PendingChangeBadge status="pending" compact />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mat.qty.toLocaleString()} {mat.unit}</span>
                        {/* Foreman can request modification on materials */}
                        {isForeman && !materialPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              // Quick prompt for modification
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
          
          {/* Show message when no data */}
          {!tradeTemplate.hasData && (
            <div className="p-3 rounded-lg bg-muted/30 border border-dashed text-center">
              <p className="text-xs text-muted-foreground italic">
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
          
          {/* Template Info */}
          {templateCitation && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">Template Locked</span>
                </div>
                <span className="text-[10px] text-amber-500 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-medium">{templateCitation.answer}</p>
            </div>
          )}
          
          {/* Execution Mode */}
          {executionCitation && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">Execution Mode</span>
                </div>
                <span className="text-[10px] text-amber-500 font-mono">cite: [{executionCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-medium capitalize">{executionCitation.answer}</p>
            </div>
          )}
          
          {/* All Trade Citations */}
          {panelCitations.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">All Citations</p>
              {panelCitations.map(c => (
                <div key={c.id} className="group text-xs flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{renderCitationValue(c)}</span>
                    <span className="text-[10px] text-orange-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
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
        
        return (
          <div className="space-y-3">
            {/* ─── Futuristic Header ─── */}
            <div className="flex items-center justify-between p-2 rounded-lg border border-teal-500/25 bg-gradient-to-r from-teal-950/30 via-cyan-950/20 to-teal-950/30">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ boxShadow: ['0 0 8px rgba(20,184,166,0.2)', '0 0 16px rgba(20,184,166,0.4)', '0 0 8px rgba(20,184,166,0.2)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-7 w-7 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center"
                >
                  <Users className="h-4 w-4 text-white" />
                </motion.div>
                <div>
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-100">Team Command</span>
                  <p className="text-[8px] text-teal-700 dark:text-teal-400/80">{teamMembers.length} operative{teamMembers.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[9px] px-1.5 py-0 gap-0.5">
                <Shield className="h-2 w-2" /> Active
              </Badge>
            </div>
            
            {/* Team Size Citation */}
            {teamSizeCitation && (
              <div className="p-2 rounded-lg border border-teal-500/15 bg-gradient-to-r from-teal-950/15 to-cyan-950/10">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-teal-700 dark:text-teal-300/80 uppercase tracking-widest font-semibold">Team Size</span>
                  <span className="text-[8px] text-teal-600 dark:text-teal-400/60 font-mono">[{teamSizeCitation.id.slice(0, 8)}]</span>
                </div>
                <p className="text-sm font-bold text-teal-900 dark:text-white mt-0.5">{renderCitationValue(teamSizeCitation)}</p>
              </div>
            )}
            
            {/* Member Cards */}
            {teamMembers.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-teal-500/20 text-center bg-teal-950/5 dark:bg-teal-950/10">
                <Users className="h-6 w-6 text-teal-500/40 mx-auto mb-1.5" />
                <p className="text-[10px] text-teal-700 dark:text-teal-400/60">No team members added</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {teamMembers.map((member, idx) => {
                  const roleColors: Record<string, string> = {
                    owner: 'from-amber-400 to-orange-500',
                    foreman: 'from-teal-400 to-cyan-500',
                    worker: 'from-blue-400 to-indigo-500',
                    inspector: 'from-purple-400 to-violet-500',
                    subcontractor: 'from-pink-400 to-rose-500',
                    member: 'from-slate-400 to-slate-500',
                  };
                  const gradient = roleColors[member.role] || roleColors.member;
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-2 rounded-lg border border-teal-500/15 bg-gradient-to-r from-teal-950/10 to-cyan-950/5 hover:from-teal-950/20 hover:to-cyan-950/15 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("h-7 w-7 rounded-md bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shadow-sm", gradient)}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-teal-900 dark:text-white/90">{member.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-teal-700 dark:text-teal-400/70 capitalize font-medium">{member.role}</span>
                            {teamInviteCitation && idx === 0 && (
                              <span className="text-[7px] text-teal-500/60 font-mono">[{teamInviteCitation.id.slice(0, 6)}]</span>
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
                  // Refresh documents from DB
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
            
            {/* Citations */}
            {panelCitations.length > 0 && (
              <div className="pt-2 border-t border-teal-500/10 space-y-1">
                <p className="text-[9px] text-teal-700 dark:text-teal-400/60 uppercase tracking-widest font-semibold mb-1">Citations ({panelCitations.length})</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5 rounded-md bg-teal-950/5 dark:bg-teal-950/10 border border-teal-500/8">
                    <span className="text-[9px] text-teal-700 dark:text-teal-400/70">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-medium text-teal-900 dark:text-white/80">{renderCitationValue(c)}</span>
                      <span className="text-[7px] text-teal-500/50 font-mono">[{c.id.slice(0, 6)}]</span>
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
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-slate-900/60 to-cyan-950/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <span className={cn(
                    "text-xs font-semibold block",
                    hasLocationData ? "text-sky-200" : "text-gray-500"
                  )}>
                    {weatherAddress || 'No location set'}
                  </span>
                  {mapLat && mapLon && (
                    <span className="text-[10px] text-sky-500/70 font-mono">
                      {Number(mapLat).toFixed(4)}°N, {Number(mapLon).toFixed(4)}°W
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {locationCitation && (
                  <span className="text-[10px] text-sky-500/60 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded">cite:[{locationCitation.id.slice(0, 6)}]</span>
                )}
                {siteCondCitationWeather && (
                  <span className="text-[10px] text-amber-400/80 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
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
                  className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/50 to-sky-950/30 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-sky-500/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-sky-400" />
                      <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">Live Weather</span>
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
                  className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-slate-900/50 to-sky-950/30 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-sky-500/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">Site Location</span>
                    </div>
                    <button
                      onClick={() => setWeatherModalOpen(true)}
                      className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
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
                      {/* Scan-line overlay for futuristic feel */}
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-sky-500/5 via-transparent to-cyan-500/5" />
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="text-center text-sky-500/50">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Coordinates not available</p>
                        <p className="text-[10px] mt-1 opacity-60">Map requires lat/lon from geocoding</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-sky-500/20 text-center">
                <Cloud className="h-10 w-10 text-sky-500/30 mx-auto mb-3" />
                <p className="text-sm text-sky-400/60 font-medium">No Location Data</p>
                <p className="text-xs text-sky-500/40 mt-1">Set a project address to enable weather & map</p>
              </div>
            )}
            
            {/* ─── Citations Footer ─── */}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t border-sky-500/10 space-y-1.5">
                <p className="text-[10px] font-semibold text-sky-500/50 uppercase tracking-widest">Data Sources</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-sky-500/5 text-xs">
                    <span className="text-sky-400/60">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sky-300/80">{renderCitationValue(c)}</span>
                      <span className="text-[9px] text-sky-500/40 font-mono">cite:[{c.id.slice(0, 6)}]</span>
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
                    <div className="flex-1 p-2 rounded-lg border border-pink-500/15 bg-pink-950/10 flex items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 text-pink-400/60 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-950 dark:text-white">{contracts.length} contract{contracts.length > 1 ? 's' : ''}</p>
                        {totalContractValue > 0 && <p className="text-[8px] text-pink-700 dark:text-pink-300/60">${totalContractValue.toLocaleString()}</p>}
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
        {panelCitations.length > 0 && (
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
          
          return (
            <div className="space-y-6">
              {/* Trade Header */}
              <div className={cn(
                "p-6 rounded-xl border-2",
                tradeLabel
                  ? "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-300 dark:border-orange-700"
                  : "bg-muted/30 border-dashed"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {tradeLabel || 'No Trade Selected'}
                  </h4>
                  {tradeCitation && (
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      cite: [{tradeCitation.id.slice(0, 8)}]
                    </Badge>
                  )}
                </div>
                {gfaValue && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">{gfaValue.toLocaleString()} sq ft</span>
                    </div>
                    {wastePercent > 0 && (
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600">
                        +{wastePercent}% waste factor
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Materials Grid */}
              {template.hasData && materialsWithWaste.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-orange-500" />
                    Material Requirements
                    {templateCitation && (
                      <span className="text-[10px] text-orange-500 font-mono ml-auto">cite: [{templateCitation.id.slice(0, 8)}]</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {materialsWithWaste.map((mat, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Hammer className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium">{mat.name}</p>
                            {mat.hasWaste && (
                              <p className="text-[10px] text-orange-500">+{wastePercent}% waste included</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm font-bold">
                          {mat.qty.toLocaleString()} {mat.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No Data Message */}
              {!template.hasData && (
                <div className="p-8 rounded-xl border-2 border-dashed text-center">
                  <Hammer className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
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
            className="space-y-4"
          >
            {/* Futuristic Team Header */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-teal-500/25 bg-gradient-to-r from-teal-950/25 via-cyan-950/15 to-teal-950/25">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ boxShadow: ['0 0 10px rgba(20,184,166,0.2)', '0 0 20px rgba(20,184,166,0.4)', '0 0 10px rgba(20,184,166,0.2)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center"
                >
                  <Users className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <h4 className="text-sm font-bold text-teal-900 dark:text-teal-100 tracking-tight">Team Operatives</h4>
                  <p className="text-[10px] text-teal-700 dark:text-teal-400/80">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} deployed</p>
                </div>
              </div>
              <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[10px] px-2 py-0.5 gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                Online
              </Badge>
            </div>

            {/* Role Distribution Bar */}
            {(() => {
              const roleCounts = teamMembers.reduce((acc, m) => { acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);
              const roleColorMap: Record<string, string> = {
                owner: '#f59e0b',
                foreman: '#14b8a6',
                worker: '#3b82f6',
                inspector: '#8b5cf6',
                subcontractor: '#ec4899',
                member: '#94a3b8',
              };
              return (
                <div className="space-y-2">
                  <div className="h-2 rounded-full overflow-hidden flex bg-teal-900/15">
                    {Object.entries(roleCounts).map(([role, count]) => (
                      <div
                        key={role}
                        style={{ width: `${(count / teamMembers.length) * 100}%`, backgroundColor: roleColorMap[role] || '#94a3b8' }}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(roleCounts).map(([role, count]) => (
                      <div key={role} className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: roleColorMap[role] || '#94a3b8' }} />
                        <span className="text-[10px] text-teal-800 dark:text-teal-300/70 capitalize">{role} ({count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Member Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {teamMembers.map((member, idx) => {
                const roleColors: Record<string, string> = {
                  owner: 'from-amber-400 to-orange-500',
                  foreman: 'from-teal-400 to-cyan-500',
                  worker: 'from-blue-400 to-indigo-500',
                  inspector: 'from-purple-400 to-violet-500',
                  subcontractor: 'from-pink-400 to-rose-500',
                  member: 'from-slate-400 to-slate-500',
                };
                const roleBorderColors: Record<string, string> = {
                  owner: 'border-amber-500/20',
                  foreman: 'border-teal-500/20',
                  worker: 'border-blue-500/20',
                  inspector: 'border-purple-500/20',
                  subcontractor: 'border-pink-500/20',
                  member: 'border-slate-500/20',
                };
                const gradient = roleColors[member.role] || roleColors.member;
                const borderColor = roleBorderColors[member.role] || roleBorderColors.member;
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r from-teal-950/10 to-cyan-950/5 hover:from-teal-950/20 hover:to-cyan-950/15 transition-all group",
                      borderColor
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shadow-md", gradient)}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-teal-900 dark:text-white/90 truncate">{member.name}</p>
                      <p className="text-[10px] text-teal-700 dark:text-teal-400/70 capitalize font-medium">{member.role}</p>
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
        
        {panel.id === 'panel-6-documents' && (
          <div className="space-y-6">
            {/* Document Categories Grid - Fullscreen View */}
            <div>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                All Documents ({documents.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_CATEGORIES.map(cat => {
                  const categoryDocs = documents.filter(d => d.category === cat.key);
                  const panelCitations = getCitationsForPanel(['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION']);
                  
                  return (
                    <div 
                      key={cat.key} 
                      className={cn(
                        "rounded-xl border-2 p-4 transition-all",
                        categoryDocs.length > 0 
                          ? "border-pink-200 dark:border-pink-800/50 bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-950/20 dark:to-rose-950/20" 
                          : "border-dashed border-muted-foreground/20 bg-muted/20"
                      )}
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            categoryDocs.length > 0 ? "bg-pink-100 dark:bg-pink-900/50" : "bg-muted"
                          )}>
                            <cat.icon className={cn("h-4 w-4", categoryDocs.length > 0 ? cat.color : "text-muted-foreground")} />
                          </div>
                          <div>
                            <h5 className={cn("text-sm font-medium", categoryDocs.length > 0 ? cat.color : "text-muted-foreground")}>
                              {cat.label}
                            </h5>
                            <p className="text-[10px] text-muted-foreground">
                              {categoryDocs.length} {categoryDocs.length === 1 ? 'file' : 'files'}
                            </p>
                          </div>
                        </div>
                        {categoryDocs.filter(d => d.citationId).length > 0 && (
                          <Badge className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-[10px]">
                            {categoryDocs.filter(d => d.citationId).length} cited
                          </Badge>
                        )}
                      </div>
                      
                      {/* Documents List */}
                      {categoryDocs.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-muted-foreground italic">No documents in this category</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {categoryDocs.map(doc => {
                            // Find citation for this document
                            const matchingCitation = panelCitations.find(c => {
                              const citationFileName = c.metadata?.file_name || c.answer;
                              return citationFileName && doc.file_name.toLowerCase().includes(String(citationFileName).toLowerCase().slice(0, 10));
                            });
                            
                            return (
                              <div 
                                key={doc.id} 
                                className="flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-pink-300 transition-all group cursor-pointer"
                                onClick={() => setPreviewDocument({
                                  file_name: doc.file_name,
                                  file_path: doc.file_path,
                                  category: doc.category,
                                  citationId: doc.citationId || matchingCitation?.id,
                                })}
                              >
                                {/* File Preview/Thumbnail */}
                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border">
                                  {doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img 
                                      src={getDocumentPreviewUrl(doc.file_path)} 
                                      alt={doc.file_name}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = '<div class="h-5 w-5 text-green-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                                      }}
                                    />
                                  ) : doc.file_name.match(/\.pdf$/i) ? (
                                    <FileText className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                
                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:text-pink-600 transition-colors">{doc.file_name}</p>
                                  <div className="flex items-center gap-2">
                                    {doc.uploadedAt && (
                                      <span className="text-[10px] text-muted-foreground">{doc.uploadedAt}</span>
                                    )}
                                    {matchingCitation && (
                                      <span className="text-[10px] text-pink-500">
                                        {matchingCitation.cite_type.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Preview indicator */}
                                <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                
                                {/* Citation Badge */}
                                {(doc.citationId || matchingCitation) && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-[9px] bg-pink-50 dark:bg-pink-950/30 text-pink-600 flex-shrink-0"
                                  >
                                    cite: [{(doc.citationId || matchingCitation?.id || '').slice(0, 8)}]
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
            </div>
            
            {/* Contracts Section - Fullscreen */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Contracts ({contracts.length})
                </h4>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedContractType(null)}
                    className="gap-2 border-pink-300 text-pink-600 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-400"
                  >
                    <Plus className="h-4 w-4" />
                    New Contract
                  </Button>
                )}
              </div>
              
              {/* Contract Template Selector - Fullscreen */}
              {canEdit && !selectedContractType && contracts.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-950/20">
                  <p className="text-sm font-medium text-pink-700 dark:text-pink-300 mb-3">Select contract template:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'residential', label: 'Residential', icon: '🏠' },
                      { key: 'commercial', label: 'Commercial', icon: '🏢' },
                      { key: 'industrial', label: 'Industrial', icon: '🏭' },
                      { key: 'renovation', label: 'Renovation', icon: '🔨' },
                    ].map(type => (
                      <button
                        key={type.key}
                        onClick={() => {
                          setSelectedContractType(type.key);
                          setShowContractPreview(true);
                        }}
                        className="flex items-center gap-2 p-3 rounded-lg border text-left transition-all hover:border-pink-500 hover:bg-pink-100/50 dark:hover:bg-pink-950/30"
                      >
                        <span className="text-2xl">{type.icon}</span>
                        <span className="font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {contracts.length === 0 ? (
                <div className="p-6 rounded-xl border-2 border-dashed text-center">
                  <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No contracts created yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Select a template above to create your first contract</p>
                  
                  {/* Contract Template Selector for empty state */}
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
                          onClick={() => {
                            setSelectedContractType(type.key);
                            setShowContractPreview(true);
                          }}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-all hover:border-pink-500 hover:bg-pink-100/50 dark:hover:bg-pink-950/30"
                        >
                          <span className="text-3xl">{type.icon}</span>
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contracts.map(contract => (
                    <div 
                      key={contract.id} 
                      className="group p-4 rounded-xl border-2 border-pink-200 dark:border-pink-800/50 bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-950/20 dark:to-rose-950/20 cursor-pointer hover:border-pink-400 transition-all"
                      onClick={() => {
                        // Open contract view page in new tab
                        if (contract.share_token) {
                          window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                        } else {
                          toast.info('Contract preview not available - no share token');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-pink-500" />
                          <span className="font-medium">#{contract.contract_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* View contract button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (contract.share_token) {
                                      window.open(`/contract/sign?token=${contract.share_token}`, '_blank');
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View contract</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/* Send to recipients button - Only for non-signed contracts */}
                          {contract.status !== 'signed' && canEdit && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedContractForEmail({
                                        id: contract.id,
                                        contract_number: contract.contract_number,
                                        total_amount: contract.total_amount,
                                        status: contract.status,
                                        share_token: contract.share_token,
                                      });
                                      setContractRecipients([{ email: '', name: '' }]);
                                      setShowContractEmailDialog(true);
                                    }}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send to recipients</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Badge 
                            variant={contract.status === 'signed' ? 'default' : 'outline'}
                            className={contract.status === 'signed' ? 'bg-green-500' : ''}
                          >
                            {contract.status}
                          </Badge>
                        </div>
                      </div>
                      {canViewFinancials && contract.total_amount && (
                        <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                          ${contract.total_amount.toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to view contract
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Related Citations */}
            {panelCitations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-pink-500" />
                  Verified Citations ({panelCitations.length})
                </h4>
                <div className="grid gap-2">
                  {panelCitations.map(citation => (
                    <div
                      key={citation.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">
                          {citation.cite_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-sm">{renderCitationValue(citation)}</span>
                      </div>
                      <span className="text-[10px] text-pink-500 font-mono">cite: [{citation.id.slice(0, 8)}]</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {panel.id === 'panel-7-weather' && weatherData && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Current Conditions
            </h4>
            <div className="p-6 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30">
              <div className="flex items-center gap-4">
                <Thermometer className="h-12 w-12 text-sky-600" />
                <div>
                  <p className="text-4xl font-bold text-sky-700 dark:text-sky-300">
                    {weatherData.temp !== undefined ? `${Math.round(weatherData.temp)}°C` : 'N/A'}
                  </p>
                  <p className="text-lg text-sky-600/80 dark:text-sky-400/80 capitalize">
                    {weatherData.condition || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
    return PANELS.find(p => p.id === fullscreenPanel);
  }, [fullscreenPanel]);
  
  // Get the active panel config
  const activePanelConfig = useMemo(() => {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-cyan-300">
                {t('stage8.title', 'Command Center')}
              </h2>
              <p className="text-[10px] text-cyan-500/60">
                {projectData?.name || 'Project'} • Stage 8
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {/* Edit Mode Toggle */}
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

        {/* Desktop: Panels around central canvas */}
        <div className="hidden lg:grid h-full grid-cols-[280px_1fr_280px] grid-rows-[1fr_1fr_1fr_1fr] gap-2 p-3">
          
          {/* Left column - 4 panels */}
          {PANELS.slice(0, 4).map((panel) => {
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
                return projectData?.name || 'No name set';
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
                className={cn(
                  "relative rounded-xl border text-left transition-all duration-200 overflow-hidden group",
                  isActive
                    ? "border-cyan-400/60 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    : "border-cyan-900/20 bg-[#0c1120]/70 hover:border-cyan-700/40 hover:bg-[#0c1120]/90",
                  !hasAccess && "opacity-40 cursor-not-allowed"
                )}
                onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                whileHover={hasAccess ? { scale: 1.02 } : undefined}
                whileTap={hasAccess ? { scale: 0.98 } : undefined}
              >
                <div className="p-3 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center",
                        isActive ? "bg-cyan-500/20" : "bg-cyan-950/50"
                      )}>
                        {hasAccess ? (
                          <Icon className={cn("h-3.5 w-3.5", isActive ? "text-cyan-300" : "text-cyan-600")} />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-semibold",
                        isActive ? "text-cyan-200" : "text-cyan-500"
                      )}>
                        {displayTitle}
                      </span>
                    </div>
                    {dataCount > 0 && hasAccess && (
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                        isActive ? "bg-cyan-400/20 text-cyan-300" : "bg-cyan-950/50 text-cyan-700"
                      )}>
                        {dataCount}
                      </span>
                    )}
                    {/* Unread chat badge for Team panel */}
                    {panel.id === 'panel-4-team' && unreadChatCount > 0 && !isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
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
                {/* Active glow bar */}
                {isActive && (
                  <motion.div
                    className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 to-blue-500"
                    layoutId="activePanelIndicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Central Canvas - spans middle column, all 4 rows */}
          <motion.div
            className="row-span-4 relative rounded-2xl border border-cyan-800/30 bg-[#0c1120]/90 backdrop-blur-sm overflow-hidden flex flex-col"
            layout
          >
            {/* Canvas header */}
            <div className="px-4 py-3 border-b border-cyan-900/30 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-blue-950/40 shrink-0">
              <div className="flex items-center gap-2">
                <activePanelConfig.icon className="h-4 w-4 text-cyan-400" />
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
                className="flex-1 p-4 overflow-y-auto [&_*]:text-foreground dark:[&_*]:text-foreground"
                ref={canvasContentRef}
                style={{ colorScheme: 'light' }}
              >
                <div className="[&_.text-muted-foreground]:text-slate-500 [&_h3]:text-slate-800 [&_span]:text-slate-700 [&_p]:text-slate-600 [&_.font-medium]:text-slate-800 [&_.font-semibold]:text-slate-900 bg-background rounded-xl p-3 min-h-full">
                  {renderPanelContent(activePanelConfig)}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Right column - 4 panels */}
          {PANELS.slice(4, 8).map((panel) => {
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
                        <span className="text-lg font-bold text-indigo-300 leading-none">{completedTasks}</span>
                        <span className="text-[9px] text-indigo-500 mb-0.5">/{totalTasks}</span>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-400">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cyan-950/50 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
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
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                      <FileText className="h-2.5 w-2.5 text-pink-400" />
                      <span className="text-[9px] font-mono text-pink-300">{docCount}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                      <FileCheck className="h-2.5 w-2.5 text-pink-400" />
                      <span className="text-[9px] font-mono text-pink-300">{conCount}</span>
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
                className={cn(
                  "relative rounded-xl border text-left transition-all duration-200 overflow-hidden group",
                  isActive
                    ? "border-cyan-400/60 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    : "border-cyan-900/20 bg-[#0c1120]/70 hover:border-cyan-700/40 hover:bg-[#0c1120]/90",
                  !hasAccess && "opacity-40 cursor-not-allowed"
                )}
                onClick={() => hasAccess && setActiveOrbitalPanel(panel.id)}
                whileHover={hasAccess ? { scale: 1.02 } : undefined}
                whileTap={hasAccess ? { scale: 0.98 } : undefined}
              >
                <div className="p-3 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center",
                        isActive ? "bg-cyan-500/20" : "bg-cyan-950/50"
                      )}>
                        {hasAccess ? (
                          <Icon className={cn("h-3.5 w-3.5", isActive ? "text-cyan-300" : "text-cyan-600")} />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-semibold",
                        isActive ? "text-cyan-200" : "text-cyan-500"
                      )}>
                        {panel.title}
                      </span>
                    </div>
                    {dataCount > 0 && hasAccess && (
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                        isActive ? "bg-cyan-400/20 text-cyan-300" : "bg-cyan-950/50 text-cyan-700"
                      )}>
                        {dataCount}
                      </span>
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
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 to-blue-500"
                    layoutId="activePanelIndicatorRight"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
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
                  const filled = ['PROJECT_NAME', 'LOCATION', 'WORK_TYPE'].filter(k => panelCitations.some(c => c.cite_type === k)).length;
                  return <span className="text-[8px] font-mono opacity-70">{filled}/3</span>;
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
                  {renderFullscreenContent(fullscreenPanelConfig)}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      {/* Contract Template Dialog - Full Preview with PDF & Send */}
      <Dialog open={showContractPreview} onOpenChange={setShowContractPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b bg-gradient-to-r from-pink-50/80 to-rose-50/80 dark:from-pink-950/30 dark:to-rose-950/30 -mx-6 -mt-6 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-pink-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg text-pink-700 dark:text-pink-300">
                  {selectedContractType ? 
                    `${selectedContractType.charAt(0).toUpperCase() + selectedContractType.slice(1)} Contract Template` :
                    'Contract Template'
                  }
                </DialogTitle>
                <p className="text-sm text-muted-foreground">Contract #{generateContractPreviewData.contractNumber}</p>
              </div>
              <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                {selectedContractType === 'residential' ? '🏠' : 
                 selectedContractType === 'commercial' ? '🏢' :
                 selectedContractType === 'industrial' ? '🏭' : '🔨'}
                {selectedContractType?.toUpperCase()}
              </Badge>
            </div>
          </DialogHeader>
          
          {/* Contract Preview Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Project Details */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-3">Project Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Project Name</p><p className="font-medium">{generateContractPreviewData.projectName}</p></div>
                <div><p className="text-xs text-muted-foreground">Trade / Service</p><p className="font-medium">{generateContractPreviewData.trade}</p></div>
                <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{generateContractPreviewData.projectAddress}</p></div>
                <div><p className="text-xs text-muted-foreground">Gross Floor Area</p><p className="font-medium">{String(generateContractPreviewData.gfa)} {generateContractPreviewData.gfaUnit}</p></div>
              </div>
            </div>
            
            {/* Timeline & Resources */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-3">Timeline & Resources</h4>
              <div className="grid grid-cols-4 gap-4">
                <div><p className="text-xs text-muted-foreground">Start Date</p><p className="font-medium">{String(generateContractPreviewData.startDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">End Date</p><p className="font-medium">{String(generateContractPreviewData.endDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Team Size</p><p className="font-medium">{generateContractPreviewData.teamSize} members</p></div>
                <div><p className="text-xs text-muted-foreground">Tasks</p><p className="font-medium">{generateContractPreviewData.taskCount} scheduled</p></div>
              </div>
            </div>
            
            {/* Client Info for Contract */}
            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50">
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Client Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Client Name *</label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Client Email *</label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                * Client will receive an email with a secure link to view and sign the contract
              </p>
            </div>
            
            {/* Team Members to notify (optional) */}
            {teamMembers.length > 0 && (
              <div className="p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50">
                <h4 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Notify Team Members (Optional)</h4>
                <div className="space-y-2">
                  {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{member.name}</span>
                        <Badge variant="outline" className="text-[9px]">{member.role}</Badge>
                      </div>
                      <Checkbox defaultChecked className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Standard Terms Preview */}
            <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Standard Terms (Preview)</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Warranty: {selectedContractType === 'commercial' ? '2 years' : selectedContractType === 'industrial' ? '3 years' : selectedContractType === 'renovation' ? '6 months' : '1 year'} from completion</p>
                <p>• Payment: {selectedContractType === 'commercial' ? '30% deposit, 40% midpoint, 30% completion' : selectedContractType === 'industrial' ? '25% phases' : '50% deposit, 50% completion'}</p>
                <p>• Changes must be agreed in writing by both parties</p>
                <p>• Contractor maintains liability insurance and WSIB coverage</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowContractPreview(false)}>
              Cancel
            </Button>
            
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
                  };
                  await downloadContractPDF(contractData);
                  toast.success('Contract PDF downloaded!');
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
            
            {/* Send Contract to Client */}
            <Button 
              className="gap-2 bg-pink-600 hover:bg-pink-700"
              disabled={isSendingContract || !clientEmail || !clientName}
              onClick={async () => {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(clientEmail)) {
                  toast.error('Please enter a valid email address');
                  return;
                }
                
                setIsSendingContract(true);
                try {
                  // 1. Create contract in database with client info
                  const { data: newContract, error: contractError } = await supabase.from('contracts').insert({
                    user_id: userId,
                    project_id: projectId,
                    contract_number: generateContractPreviewData.contractNumber,
                    template_type: selectedContractType || 'residential',
                    project_name: generateContractPreviewData.projectName,
                    project_address: generateContractPreviewData.projectAddress,
                    client_name: clientName,
                    client_email: clientEmail,
                    start_date: typeof generateContractPreviewData.startDate === 'string' && generateContractPreviewData.startDate !== 'Not set' 
                      ? (() => { try { return new Date(generateContractPreviewData.startDate as string).toISOString().split('T')[0]; } catch { return null; } })()
                      : null,
                    estimated_end_date: typeof generateContractPreviewData.endDate === 'string' && generateContractPreviewData.endDate !== 'Not set'
                      ? (() => { try { return new Date(generateContractPreviewData.endDate as string).toISOString().split('T')[0]; } catch { return null; } })()
                      : null,
                    status: 'pending_client',
                  }).select().single();
                  
                  if (contractError) throw contractError;
                  
                  // 2. Build the signing URL
                  const baseUrl = window.location.origin;
                  const contractUrl = `${baseUrl}/contract/sign?token=${newContract.share_token}`;
                  
                   // 3. Get current user's profile for contractor name
                   // Use already loaded userProfile from state
                   const contractorName = userProfile?.company_name || 'Your Contractor';
                   const contractorPhone = userProfile?.phone || '';
                   const contractorEmail = userProfile?.email || '';
                   
                   // 4. Send email via edge function
                   const { data: session } = await supabase.auth.getSession();
                   const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-contract-email', {
                     body: {
                       clientEmail: clientEmail,
                       clientName: clientName,
                       contractorName: contractorName,
                       projectName: generateContractPreviewData.projectName,
                       contractUrl: contractUrl,
                       contractId: newContract.id,
                     },
                   });
                   
                   if (emailError) {
                     console.error('Email send failed:', emailError);
                     // Contract created but email failed - still show partial success
                     toast.warning('Contract created but email failed to send. Share the link manually.');
                   } else {
                     // Update contract with sent timestamp and contractor data from bu_profiles
                     await supabase.from('contracts').update({
                       sent_to_client_at: new Date().toISOString(),
                       contractor_name: contractorName,
                       contractor_phone: contractorPhone,
                       contractor_email: contractorEmail,
                     }).eq('id', newContract.id);
                     
                     toast.success(`Contract sent to ${clientName}!`);
                   }
                  
                  setShowContractPreview(false);
                  setClientEmail('');
                  setClientName('');
                  
                  // Refresh contracts list
                  const { data: updatedContracts } = await supabase
                    .from('contracts')
                    .select('id, contract_number, status, total_amount')
                    .eq('project_id', projectId);
                  if (updatedContracts) setContracts(updatedContracts);
                  
                } catch (err) {
                  console.error('Contract creation failed:', err);
                  toast.error('Failed to create contract');
                } finally {
                  setIsSendingContract(false);
                }
              }}
            >
              {isSendingContract ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {clientEmail && clientName ? 'Create & Send to Client' : 'Enter Client Info'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Action Bar - Command Center Theme */}
      <div className="border-t border-cyan-900/30 bg-[#0c1120]/95 backdrop-blur-sm p-3 shrink-0">
        <div className="max-w-7xl mx-auto">
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
                onClick={() => setShowConflictMap(true)}
                className="gap-1.5 text-xs border-purple-800/50 text-purple-400 hover:bg-purple-950/30 hover:text-purple-300 bg-transparent"
              >
                <MapPin className="h-3.5 w-3.5" />
                Map
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
        onOpenChange={setShowPendingApprovalModal}
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
    </div>
  );
}
