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
  
  // UI state
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
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

  const { canGenerateInvoice, canUseAIAnalysis, getUpgradeMessage } = useTierFeatures();
  
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
          .select('id, title, status, priority, description, assigned_to')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        if (tasksData) {
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
            
            return {
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              phase,
              assigned_to: task.assigned_to,
              checklist: [
                { id: `${task.id}-start`, text: 'Task started', done: task.status !== 'pending' },
                { id: `${task.id}-complete`, text: 'Task completed', done: task.status === 'completed' },
                { id: `${task.id}-verify`, text: 'Verification photo', done: false },
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
  
  // Update task checklist item
  const updateChecklistItem = useCallback(async (taskId: string, checklistItemId: string, done: boolean) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          checklist: task.checklist.map(item => 
            item.id === checklistItemId ? { ...item, done } : item
          ),
        };
      }
      return task;
    }));
    
    // If this is a verification photo and it's being checked, show upload prompt
    if (checklistItemId.includes('-verify') && done) {
      toast.info('Verification photo required - please upload via Documents panel');
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
  
  // Generate contract preview data
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
    };
  }, [citations, projectData, teamMembers.length, tasks.length, projectId]);
  
  // Generate AI Analysis - Tier-based with dual engine support
  const handleAIAnalysis = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to use AI Analysis');
        return;
      }
      
      // TODO: Get actual tier from subscription hook
      const tier = 'pro'; // Default to pro for now
      
      const { data, error } = await supabase.functions.invoke('ai-project-analysis', {
        body: {
          projectId,
          analysisType: 'full',
          tier,
        },
      });
      
      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please try again in a few minutes.');
        } else if (error.message?.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          throw error;
        }
        return;
      }
      
      // Display analysis results
      if (data?.analysis) {
        toast.success('AI Analysis Complete!', {
          description: data.dualEngineUsed ? 'Dual engine validation applied' : 'Analysis ready',
          duration: 5000,
        });
        
        // Log the analysis for debugging
        console.log('[AI Analysis Result]', data);
        
        // TODO: Show analysis in a modal or panel
      }
    } catch (err) {
      console.error('[Stage8] AI Analysis failed:', err);
      toast.error('AI Analysis failed. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [projectId]);
  
  // Generate PDF Summary
  const handleGeneratePDF = useCallback(async () => {
    try {
      const { buildProjectSummaryHTML, downloadPDF } = await import('@/lib/pdfGenerator');
      
      // Gather data from citations
      const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
      const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
      const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
      
      const gfaValue = typeof gfaCitation?.value === 'number' ? gfaCitation.value : 0;
      const trade = tradeCitation?.answer || 'General';
      const address = locationCitation?.answer || projectData?.address || '';
      
      // Build line items from financial summary or tasks
      const lineItems = [
        { name: `${trade} Materials`, quantity: gfaValue || 1, unit: gfaValue ? 'sq ft' : 'lot', unit_price: financialSummary?.material_cost ? (financialSummary.material_cost / (gfaValue || 1)) : 0 },
        { name: `${trade} Labor`, quantity: gfaValue || 1, unit: gfaValue ? 'sq ft' : 'lot', unit_price: financialSummary?.labor_cost ? (financialSummary.labor_cost / (gfaValue || 1)) : 0 },
      ].filter(item => item.unit_price > 0);
      
      const html = buildProjectSummaryHTML({
        quoteNumber: `QT-${projectId.slice(0, 8).toUpperCase()}`,
        currentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        clientInfo: {
          name: 'Client',
          email: '',
          phone: '',
          address: address,
        },
        editedItems: lineItems,
        materialTotal: financialSummary?.material_cost || 0,
        grandTotal: financialSummary?.total_cost || 0,
        notes: `Project: ${projectData?.name || 'Untitled'}`,
        formatCurrency: (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        companyName: 'BuildUnion',
      });
      
      await downloadPDF(html, {
        filename: `project-summary-${projectData?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}.pdf`,
        pageFormat: 'letter',
        margin: 15,
      });
      
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error('[Stage8] PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    }
  }, [projectId, citations, projectData, financialSummary]);
  
  // Generate Invoice
  const handleGenerateInvoice = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to generate invoices');
        return;
      }
      
      toast.loading('Generating invoice...', { id: 'invoice-gen' });
      
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          projectId,
          notes: `Invoice for ${projectData?.name || 'Project'}`,
        },
      });
      
      if (error) throw error;
      
      if (data) {
        // Download the invoice as PDF
        const { buildInvoiceHTML, generateInvoicePDF } = await import('@/lib/invoiceGenerator');
        const invoiceBlob = await generateInvoicePDF(data);
        
        const url = URL.createObjectURL(invoiceBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${data.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Invoice ${data.invoiceNumber} generated!`, { id: 'invoice-gen' });
      }
    } catch (err) {
      console.error('[Stage8] Invoice generation failed:', err);
      toast.error('Failed to generate invoice', { id: 'invoice-gen' });
    }
  }, [projectId, projectData]);
  
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
   // ✓ REAL DB TASKS: Display actual project_tasks with assignee names
   // ✓ DEMOLITION: Only show demolition phase if SITE_CONDITION includes demolition
   const renderPanel5Content = useCallback(() => {
     const panelCitations = getCitationsForPanel(['TIMELINE', 'END_DATE', 'DNA_FINALIZED']);
     
     // ✓ Check SITE_CONDITION citation for demolition
     const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
     const hasDemolition = siteConditionCitation?.answer?.toLowerCase().includes('demolition') 
       || siteConditionCitation?.metadata?.demolition_needed === true
       || (typeof siteConditionCitation?.value === 'string' && siteConditionCitation.value.toLowerCase().includes('demolition'));
     
     // ✓ Use REAL DB tasks - no fallback to default phases
     // ✓ VISIBILITY: Worker/subcontractor/inspector only see tasks assigned to them
     // Owner and foreman see all tasks
     const baseTasks: TaskWithChecklist[] = (userRole === 'owner' || userRole === 'foreman')
       ? tasks
       : tasks.filter(t => t.assigned_to === userId);
     
     // ✓ Filter phases - only show demolition if hasDemolition
     const activePhasesConfig = hasDemolition 
       ? TASK_PHASES 
       : TASK_PHASES.filter(p => p.key !== 'demolition');
     
     // Group tasks by phase
     const tasksByPhase = activePhasesConfig.map(phase => ({
       ...phase,
       tasks: baseTasks.filter(t => t.phase === phase.key),
     }));
    
    return (
      <div className="space-y-4">
        {/* Date citations with Citation Badges */}
        {panelCitations.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {panelCitations.map(c => (
              <div key={c.id} className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{c.cite_type.replace(/_/g, ' ')}</p>
                  <span className="text-[9px] text-indigo-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
                </div>
                <span className="text-sm font-medium">{renderCitationValue(c)}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Site Condition Citation Badge */}
        {siteConditionCitation && (
          <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hammer className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {siteConditionCitation.answer}
                </span>
                {hasDemolition && (
                  <Badge variant="outline" className="text-[9px] bg-red-100 text-red-600">Demolition</Badge>
                )}
              </div>
              <span className="text-[9px] text-amber-500 font-mono">cite: [{siteConditionCitation.id.slice(0, 8)}]</span>
            </div>
          </div>
        )}
        
        {/* Task Phases with Checklists */}
        <div className="space-y-3">
          {tasksByPhase.map(phase => (
            <div key={phase.key} className={cn("rounded-lg border overflow-hidden", phase.bgColor)}>
              {/* Phase Header */}
              <button
                onClick={() => togglePhaseExpansion(phase.key)}
                className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-6 w-6 rounded flex items-center justify-center", phase.bgColor)}>
                    <ClipboardList className={cn("h-3.5 w-3.5", phase.color)} />
                  </div>
                  <span className={cn("font-medium text-sm", phase.color)}>{phase.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {phase.tasks.length} tasks
                  </Badge>
                </div>
                {expandedPhases.has(phase.key) ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              {/* Phase Tasks */}
              <AnimatePresence>
                {expandedPhases.has(phase.key) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 pt-0 space-y-2">
                      {phase.tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">No tasks in this phase</p>
                      ) : (
                        phase.tasks.map(task => {
                          // Create ref for file input per task
                          const taskFileInputId = `task-photo-${task.id}`;
                          
                          return (
                            <div key={task.id} className="bg-background rounded-lg border p-3 space-y-2">
                              {/* Task Header with Status Toggle */}
                              <div className="flex items-center justify-between gap-2">
                                {/* Task status toggle - owner/foreman always, workers for assigned tasks */}
                                <div className="flex items-center gap-2 flex-1">
                                  <Checkbox
                                    checked={task.status === 'completed'}
                                    onCheckedChange={(checked) => {
                                      const newStatus = checked ? 'completed' : 'pending';
                                      // Update task status in DB
                                      supabase
                                        .from('project_tasks')
                                        .update({ status: newStatus })
                                        .eq('id', task.id)
                                        .then(({ error }) => {
                                          if (error) {
                                            toast.error('Failed to update task status');
                                          } else {
                                            setTasks(prev => prev.map(t => 
                                              t.id === task.id ? { ...t, status: newStatus } : t
                                            ));
                                            toast.success(checked ? 'Task completed' : 'Task reopened');
                                          }
                                        });
                                    }}
                                    disabled={!canToggleTaskStatus(task.assigned_to)}
                                    className={cn(
                                      "h-5 w-5",
                                      canToggleTaskStatus(task.assigned_to) && "cursor-pointer"
                                    )}
                                  />
                                  <span className={cn(
                                    "text-sm font-medium truncate flex-1",
                                    task.status === 'completed' && "line-through text-muted-foreground"
                                  )}>{task.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Photo Upload Button - ALL TEAM can upload */}
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
                                          
                                          // Upload image to Visuals
                                          setIsUploading(true);
                                          try {
                                            const file = files[0];
                                            const fileName = `${Date.now()}-${file.name}`;
                                            const filePath = `${projectId}/${fileName}`;
                                            
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
                                            
                                            // Create citation for cross-panel sync with PHASE info
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
                                                // ✓ NEW: Include phase information
                                                phase: task.phase,
                                                phaseLabel: phaseInfo?.label || task.phase,
                                              },
                                            };
                                            
                                            // Add to documents state
                                            const newDoc: DocumentWithCategory = {
                                              id: docRecord.id,
                                              file_name: file.name,
                                              file_path: filePath,
                                              category: 'visual',
                                              citationId: newCitation.id,
                                              uploadedAt: new Date().toISOString(),
                                            };
                                            
                                            setDocuments(prev => [...prev, newDoc]);
                                            
                                            // Update citations
                                            setCitations(prev => {
                                              const updated = [...prev, newCitation];
                                              
                                              // Persist to Supabase
                                              supabase
                                                .from('project_summaries')
                                                .update({ verified_facts: updated as any })
                                                .eq('project_id', projectId)
                                                .then(({ error }) => {
                                                  if (error) console.error('[Stage8] Failed to persist citation:', error);
                                                });
                                              
                                              return updated;
                                            });
                                            
                                            toast.success(`Photo uploaded for "${task.title}"`, { 
                                              description: 'Added to Visuals in Documents' 
                                            });
                                          } catch (err) {
                                            console.error('[Stage8] Task photo upload failed:', err);
                                            toast.error('Failed to upload photo');
                                          } finally {
                                            setIsUploading(false);
                                            // Reset input
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => document.getElementById(taskFileInputId)?.click()}
                                        disabled={isUploading}
                                      >
                                        <Plus className="h-4 w-4 text-green-600" />
                                      </Button>
                                    </>
                                  )}
                                  <Badge 
                                    variant={task.status === 'completed' ? 'default' : 'secondary'}
                                    className={cn("text-[10px]", task.status === 'completed' && 'bg-green-500')}
                                  >
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Assignee Selector */}
                               <div className="flex items-center gap-2">
                                 <User className="h-3.5 w-3.5 text-muted-foreground" />
                                 <Select
                                   value={task.assigned_to}
                                   onValueChange={(value) => updateTaskAssignee(task.id, value)}
                                   disabled={!canEdit}
                                 >
                                   <SelectTrigger className="h-7 text-xs w-40">
                                      <SelectValue placeholder="Assign to..." />
                                    </SelectTrigger>
                                   <SelectContent>
                                     {teamMembers.map(member => (
                                       <SelectItem key={member.userId} value={member.userId} className="text-xs">
                                         {member.name} ({member.role})
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                              
                              {/* Checklist */}
                              <div className="pl-2 space-y-1.5 border-l-2 border-muted">
                                {task.checklist.map(item => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={item.id}
                                      checked={item.done}
                                      onCheckedChange={(checked) => updateChecklistItem(task.id, item.id, !!checked)}
                                      disabled={!canEdit}
                                      className="h-4 w-4"
                                    />
                                    <label
                                      htmlFor={item.id}
                                      className={cn(
                                        "text-xs cursor-pointer",
                                        item.done && "line-through text-muted-foreground"
                                      )}
                                    >
                                      {item.text}
                                    </label>
                                    {item.id.includes('-verify') && item.done && (
                                      <Camera className="h-3 w-3 text-purple-500" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    getCitationsForPanel,
    citations,
    tasks,
    userId,
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
                {materialsWithWaste.map((mat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{mat.name}</span>
                      {mat.hasWaste && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">
                          +{panelWastePercent}%
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">{mat.qty.toLocaleString()} {mat.unit}</span>
                  </div>
                ))}
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Team Members ({teamMembers.length})
              </span>
              {/* ✓ COMMUNICATION MODULE TRIGGER */}
              {teamMembers.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTeamCommunication}
                  className="h-7 text-xs gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
                >
                  <MessageSquare className="h-3 w-3" />
                  Team Chat
                </Button>
              )}
            </div>
            
            {/* Team Size Citation Badge */}
            {teamSizeCitation && (
              <div className="p-2 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Team Size</span>
                  <span className="text-[10px] text-teal-500 font-mono">cite: [{teamSizeCitation.id.slice(0, 8)}]</span>
                </div>
                <p className="text-sm font-medium">{renderCitationValue(teamSizeCitation)}</p>
              </div>
            )}
            
            {teamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No team members added</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member, idx) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          {teamInviteCitation && idx === 0 && (
                            <span className="text-[9px] text-teal-500 font-mono">cite: [{teamInviteCitation.id.slice(0, 6)}]</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Individual message button with persistence guard */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMemberMessage(member.userId)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Communication enabled badge */}
            {teamMembers.length > 0 && (
              <div className="p-2 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50">
                <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Team messaging enabled</span>
                </div>
              </div>
            )}
            
            {/* All Team Citations with badges */}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">All Citations</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{renderCitationValue(c)}</span>
                      <span className="text-[10px] text-teal-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
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
        // ✓ Weather widget - Read from LOCATION citation, NO hardcoded fallback
        const locationCitation = citations.find(c => c.cite_type === 'LOCATION');
        const siteCondCitationWeather = citations.find(c => c.cite_type === 'SITE_CONDITION');
        const hasLocationData = locationCitation?.answer || projectData?.address;
        const weatherAddress = locationCitation?.answer || projectData?.address || null;
        
        return (
          <div className="space-y-3">
            {/* Address Display with Citation Badge */}
            <div className={cn(
              "p-2 rounded-lg border",
              hasLocationData 
                ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-200/50 dark:border-sky-800/30"
                : "bg-gray-50 dark:bg-gray-950/20 border-gray-200/50"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className={cn("h-3.5 w-3.5", hasLocationData ? "text-sky-600" : "text-gray-400")} />
                  <span className={cn(
                    "text-xs font-medium truncate",
                    hasLocationData ? "text-sky-700 dark:text-sky-300" : "text-gray-400"
                  )}>
                    {weatherAddress || 'No location set'}
                  </span>
                </div>
                {locationCitation && (
                  <span className="text-[10px] text-sky-500 font-mono">cite: [{locationCitation.id.slice(0, 8)}]</span>
                )}
              </div>
            </div>
            
            {/* Site Condition with Citation Badge */}
            {siteCondCitationWeather && (
              <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Site: {siteCondCitationWeather.answer}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-mono">cite: [{siteCondCitationWeather.id.slice(0, 8)}]</span>
                </div>
              </div>
            )}
            
            {/* Integrated Weather Widget - only if we have an address */}
            {weatherAddress ? (
              <button
                onClick={() => setWeatherModalOpen(true)}
                className="w-full cursor-pointer text-left hover:opacity-90 transition-opacity"
              >
                <WeatherWidget 
                  location={weatherAddress}
                  showForecast={true}
                  className="border-0 shadow-none"
                />
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                <Cloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground italic">
                  Set a project address to enable weather forecasts
                </p>
              </div>
            )}
            
            {/* All Weather/Condition Citations with badges */}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">All Citations</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{renderCitationValue(c)}</span>
                      <span className="text-[10px] text-sky-500 font-mono">cite: [{c.id.slice(0, 6)}]</span>
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
        
        return (
          <div className="space-y-3">
            {/* Owner Unlocked Badge */}
            <div className="flex items-center justify-between">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 gap-1">
                <Unlock className="h-3 w-3" />
                Owner Access
              </Badge>
              {dataSource !== 'supabase' && (
                <Badge variant="outline" className="text-[10px] text-amber-600">
                  ⚠ Local Data
                </Badge>
              )}
            </div>
            
            {/* ✓ Gross Total - From actual data, not hardcoded */}
            {hasFinancialData ? (
              <>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-2 border-emerald-300 dark:border-emerald-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Total</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      Final
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    ${(budgetTotal || totalContractValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Cost Breakdown - Materials, Labor, Demolition */}
                <div className="grid grid-cols-2 gap-3">
                  {materialCost !== null && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200/50 dark:border-blue-800/30">
                      <p className="text-xs text-muted-foreground">Materials</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        ${materialCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {laborCost !== null && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200/50 dark:border-teal-800/30">
                      <p className="text-xs text-muted-foreground">Labor</p>
                      <p className="text-lg font-bold text-teal-700 dark:text-teal-300">
                        ${laborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {demoCost !== null && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-200/50 dark:border-purple-800/30">
                      <p className="text-xs text-muted-foreground">Demolition</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        ${demoCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Profit Margin (Owner Only) */}
                {profitMargin !== null && profitPercent !== null && (
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30 border-2 border-green-300 dark:border-green-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Profit Margin</span>
                      <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        Owner Only
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        ${profitMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <Badge className={cn(
                        "text-xs",
                        profitPercent >= 20 ? "bg-green-500" : profitPercent >= 10 ? "bg-amber-500" : "bg-red-500"
                      )}>
                        {profitPercent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Contract & GFA Info with Citation Badges */}
                <div className="grid grid-cols-2 gap-3">
                  {totalContractValue > 0 && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200/50 dark:border-red-800/30">
                      <p className="text-xs text-muted-foreground">Contract Value</p>
                      <p className="text-lg font-bold text-red-700 dark:text-red-300">
                        ${totalContractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {financialGfaValue !== null && budgetTotal !== null && (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200/50 dark:border-amber-800/30">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Cost per sq ft</p>
                        {financialGfaCitation && (
                          <span className="text-[9px] text-amber-500 font-mono">cite: [{financialGfaCitation.id.slice(0, 6)}]</span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        ${(budgetTotal / financialGfaValue).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        @ {financialGfaValue.toLocaleString()} sq ft
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground italic">
                  No financial data recorded yet
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Add budget, materials, or contracts to see financials
                </p>
              </div>
            )}
            
            {/* All Financial Citations */}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Financial Data Points</p>
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{renderCitationValue(c)}</span>
                  </div>
                ))}
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
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members ({teamMembers.length})
            </h4>
            <div className="grid gap-2">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          // ✓ FUTURISTIC FINANCIAL SUMMARY - with animated charts and visualizations
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
            // Canadian Province Tax Rates (HST/GST+PST)
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
            // Default to Ontario HST
            return { rate: 0.13, name: 'HST', province: 'Ontario' };
          };
          
          const taxInfo = getTaxRateByRegion(locationAddress);
          const netTotal = budgetTotal || 0;
          const taxAmount = netTotal * taxInfo.rate;
          const grossTotal = netTotal + taxAmount;
          
          // Data for pie chart visualization - Profit excluded (never auto-calculated)
          const costBreakdownData = [
            { name: 'Materials', value: storedMaterialCost, color: 'hsl(200, 80%, 50%)' },
            { name: 'Labor', value: storedLaborCost, color: 'hsl(160, 80%, 45%)' },
            { name: 'Demolition', value: demoCost, color: 'hsl(280, 70%, 55%)' },
          ].filter(item => item.value > 0);
          
          const totalForPercentage = costBreakdownData.reduce((sum, item) => sum + item.value, 0);
          
          return (
            <div className="space-y-8">
              {/* Futuristic Header with Glow Effect */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 blur-3xl -z-10" />
                <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 dark:from-slate-950 dark:to-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      animate={{ 
                        boxShadow: ['0 0 20px rgba(251, 191, 36, 0.3)', '0 0 40px rgba(251, 191, 36, 0.6)', '0 0 20px rgba(251, 191, 36, 0.3)']
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"
                    >
                      <DollarSign className="h-8 w-8 text-white" />
                    </motion.div>
                    <div>
                      <h4 className="text-2xl font-bold text-white tracking-tight">Financial Command Center</h4>
                      <p className="text-amber-400/80 text-sm">Real-time budget analytics & projections</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-4 py-2 text-sm gap-2 shadow-lg shadow-green-500/30">
                    <Unlock className="h-4 w-4" />
                    Owner Access Verified
                  </Badge>
                </div>
              </motion.div>
              
              {hasFinancialData ? (
                <>
                  {/* Grand Total Hero Card - Futuristic with Net/Gross */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-teal-500/10" />
                    <div className="relative p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border border-emerald-500/40 shadow-2xl">
                      {/* Animated background grid */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)',
                          backgroundSize: '40px 40px'
                        }} />
                      </div>
                      
                      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex-1">
                          {/* Region & Tax Badge */}
                          <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {taxInfo.province}
                            </Badge>
                            <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1">
                              {taxInfo.name} @ {(taxInfo.rate * 100).toFixed(2)}%
                            </Badge>
                          </div>
                          
                           {/* Net Amount */}
                           <div className="mb-4">
                             <div className="flex items-center gap-2 mb-1">
                               <div className="h-2 w-2 rounded-full bg-white" />
                               <span className="text-white text-sm font-semibold uppercase tracking-wider">Net (Before Tax)</span>
                             </div>
                             <motion.p 
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ duration: 0.6, delay: 0.2 }}
                               className="text-4xl md:text-5xl font-bold text-white"
                             >
                               ${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </motion.p>
                           </div>
                           
                           {/* Tax Amount */}
                           <div className="mb-4 pl-4 border-l-2 border-amber-400">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-amber-200 text-xs font-semibold uppercase tracking-wider">+ {taxInfo.name} Tax</span>
                             </div>
                             <p className="text-2xl font-bold text-amber-200">
                               ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </p>
                           </div>
                           
                           {/* Gross Amount - Hero */}
                           <div className="pt-4 border-t border-emerald-400">
                             <div className="flex items-center gap-3 mb-2">
                               <div className="h-3 w-3 rounded-full bg-emerald-300 animate-pulse" />
                               <span className="text-emerald-200 text-sm font-bold uppercase tracking-wider">Gross Total (With Tax)</span>
                             </div>
                            <motion.p 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.6, delay: 0.4 }}
                              className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400"
                            >
                              ${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </motion.p>
                          </div>
                          
                          {gfaValue && budgetTotal && (
                            <p className="text-emerald-300/80 mt-4 flex items-center gap-2 text-sm">
                              <Ruler className="h-4 w-4" />
                              <span className="font-mono text-white">${(budgetTotal / gfaValue).toFixed(2)}</span>
                              <span className="text-emerald-400/60">/ sq ft</span>
                              <span className="text-emerald-400/40">•</span>
                              <span className="font-mono text-white">{gfaValue.toLocaleString()}</span>
                              <span className="text-emerald-400/60">sq ft</span>
                            </p>
                          )}
                        </div>
                        
                        {/* Circular Progress Ring */}
                        {profitPercent !== null && (
                          <motion.div 
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="relative"
                          >
                            <svg className="w-36 h-36 transform -rotate-90">
                              <circle
                                cx="72"
                                cy="72"
                                r="60"
                                fill="none"
                                stroke="rgba(16, 185, 129, 0.15)"
                                strokeWidth="10"
                              />
                              <motion.circle
                                cx="72"
                                cy="72"
                                r="60"
                                fill="none"
                                stroke={profitPercent >= 20 ? 'url(#profitGradientGreen)' : profitPercent >= 10 ? 'url(#profitGradientAmber)' : 'url(#profitGradientRed)'}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 60}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - Math.min(profitPercent, 100) / 100) }}
                                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                              />
                              <defs>
                                <linearGradient id="profitGradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                                <linearGradient id="profitGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#d97706" />
                                </linearGradient>
                                <linearGradient id="profitGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#ef4444" />
                                  <stop offset="100%" stopColor="#dc2626" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={cn(
                                "text-3xl font-bold",
                                profitPercent >= 20 ? "text-emerald-400" : profitPercent >= 10 ? "text-amber-400" : "text-red-400"
                              )}>
                                {profitPercent.toFixed(1)}%
                              </span>
                              <span className="text-xs text-white/60 uppercase font-medium">Margin</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Cost Breakdown - Animated Cards */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <h5 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                      <div className="h-6 w-1 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                      Cost Breakdown Analysis
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Materials Card */}
                      <motion.div 
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/30 backdrop-blur-sm"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                         <div className="relative">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                               <Hammer className="h-6 w-6 text-white" />
                             </div>
                             <div>
                               <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Materials</span>
                               <div className="h-1.5 w-16 bg-blue-500/40 rounded-full mt-1 overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: totalForPercentage > 0 ? `${(storedMaterialCost / totalForPercentage) * 100}%` : '0%' }}
                                   transition={{ duration: 1, delay: 0.6 }}
                                   className="h-full bg-gradient-to-r from-blue-300 to-cyan-300"
                                 />
                               </div>
                             </div>
                           </div>
                           <p className="text-3xl font-bold text-blue-200">
                             ${storedMaterialCost.toLocaleString()}
                           </p>
                           {totalForPercentage > 0 && (
                             <p className="text-xs text-blue-200/80 mt-1">
                               {((storedMaterialCost / totalForPercentage) * 100).toFixed(1)}% of total
                             </p>
                           )}
                         </div>
                      </motion.div>
                      
                      {/* Labor Card */}
                      <motion.div 
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/30 backdrop-blur-sm"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                               <Users className="h-6 w-6 text-white" />
                             </div>
                             <div>
                               <span className="text-xs text-teal-200 uppercase tracking-wider font-semibold">Labor</span>
                               <div className="h-1.5 w-16 bg-teal-500/40 rounded-full mt-1 overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: totalForPercentage > 0 ? `${(storedLaborCost / totalForPercentage) * 100}%` : '0%' }}
                                   transition={{ duration: 1, delay: 0.7 }}
                                   className="h-full bg-gradient-to-r from-teal-300 to-emerald-300"
                                 />
                               </div>
                             </div>
                           </div>
                           <p className="text-3xl font-bold text-teal-200">
                             ${storedLaborCost.toLocaleString()}
                           </p>
                           {totalForPercentage > 0 && (
                             <p className="text-xs text-teal-200/80 mt-1">
                               {((storedLaborCost / totalForPercentage) * 100).toFixed(1)}% of total
                             </p>
                           )}
                        </div>
                      </motion.div>
                      
                      {/* Demolition Card */}
                      <motion.div 
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/30 backdrop-blur-sm"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                               <AlertTriangle className="h-6 w-6 text-white" />
                             </div>
                             <div>
                               <span className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Demolition</span>
                               <div className="h-1.5 w-16 bg-purple-500/40 rounded-full mt-1 overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: totalForPercentage > 0 ? `${(demoCost / totalForPercentage) * 100}%` : '0%' }}
                                   transition={{ duration: 1, delay: 0.8 }}
                                   className="h-full bg-gradient-to-r from-purple-300 to-violet-300"
                                 />
                               </div>
                             </div>
                           </div>
                           <p className="text-3xl font-bold text-purple-200">
                             ${demoCost.toLocaleString()}
                           </p>
                           {demoPriceCitation && typeof demoPriceCitation.value === 'number' && (
                             <p className="text-xs text-purple-200/80 mt-1">
                               @ ${demoPriceCitation.value}/sq ft
                             </p>
                           )}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  {/* Visual Breakdown Chart */}
                  {costBreakdownData.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border border-slate-600/50"
                    >
                      <h5 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                        <div className="h-6 w-1 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                        Budget Allocation
                      </h5>
                      <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Animated Donut Chart */}
                        <div className="relative w-48 h-48 flex-shrink-0">
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
                                  className="hover:opacity-80 transition-opacity cursor-pointer"
                                  style={{ transformOrigin: 'center' }}
                                />
                              );
                            })}
                            <circle cx="50" cy="50" r="25" fill="#1e293b" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">${(totalForPercentage / 1000).toFixed(0)}K</p>
                              <p className="text-[10px] text-slate-400 uppercase">Total</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          {costBreakdownData.map((item, index) => (
                            <motion.div 
                              key={item.name}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 transition-colors border border-slate-600/30"
                            >
                              <div 
                                className="h-4 w-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                               <div className="flex-1 min-w-0">
                                 <p className="text-sm font-semibold truncate text-white">{item.name}</p>
                                 <p className="text-xs text-slate-300">
                                   {((item.value / totalForPercentage) * 100).toFixed(1)}%
                                 </p>
                               </div>
                               <p className="text-sm font-bold text-white">${item.value.toLocaleString()}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Profit Margin - Futuristic */}
                  {profitMargin !== null && profitPercent !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-2 border-green-500/40"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
                      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <motion.div 
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Shield className="h-6 w-6 text-emerald-400" />
                            </motion.div>
                            <span className="text-emerald-400 text-sm font-medium uppercase tracking-wider">Net Profit Margin</span>
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              Owner Only
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-4">
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5, delay: 0.6 }}
                              className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400"
                            >
                              ${profitMargin.toLocaleString()}
                            </motion.p>
                            <Badge className={cn(
                              "text-lg px-4 py-2 font-bold",
                              profitPercent >= 20 
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 border-0" 
                                : profitPercent >= 10 
                                  ? "bg-gradient-to-r from-amber-500 to-orange-600 border-0" 
                                  : "bg-gradient-to-r from-red-500 to-rose-600 border-0"
                            )}>
                              {profitPercent >= 20 ? '↑' : profitPercent >= 10 ? '→' : '↓'} {profitPercent.toFixed(1)}%
                            </Badge>
                          </div>
                           <p className="text-sm text-slate-300 mt-3">
                             Total Expenses: <span className="font-mono text-white">${calculatedExpenses.toLocaleString()}</span>
                           </p>
                         </div>
                         
                         {/* Status Indicator */}
                         <div className={cn(
                           "p-4 rounded-xl text-center",
                           profitPercent >= 20 
                             ? "bg-green-500/20 border border-green-500/30" 
                             : profitPercent >= 10 
                               ? "bg-amber-500/20 border border-amber-500/30" 
                               : "bg-red-500/20 border border-red-500/30"
                         )}>
                           <p className={cn(
                             "text-lg font-bold",
                             profitPercent >= 20 ? "text-green-300" : profitPercent >= 10 ? "text-amber-300" : "text-red-300"
                           )}>
                             {profitPercent >= 20 ? 'Excellent' : profitPercent >= 10 ? 'Good' : 'Review Needed'}
                           </p>
                           <p className="text-[10px] text-slate-300 mt-1">
                             {profitPercent >= 20 ? 'Above 20% target' : profitPercent >= 10 ? 'Within acceptable range' : 'Below 10% threshold'}
                           </p>
                         </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Contracts Summary - Modern Style */}
                  {contracts.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                     >
                       <h5 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                         <div className="h-6 w-1 bg-gradient-to-b from-pink-400 to-rose-500 rounded-full" />
                         Active Contracts ({contracts.length})
                       </h5>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {contracts.map((contract, index) => (
                           <motion.div 
                             key={contract.id}
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                             whileHover={{ scale: 1.02 }}
                             className="p-5 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-600/50 hover:border-pink-500/50 transition-all"
                           >
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <FileCheck className="h-5 w-5 text-pink-400" />
                                 <span className="font-mono font-medium text-white">#{contract.contract_number}</span>
                               </div>
                              <Badge 
                                variant={contract.status === 'signed' ? 'default' : 'outline'}
                                className={cn(
                                  "text-xs",
                                  contract.status === 'signed' && 'bg-gradient-to-r from-green-500 to-emerald-600 border-0'
                                )}
                              >
                                {contract.status}
                              </Badge>
                            </div>
                            {contract.total_amount !== null && contract.total_amount !== undefined && (
                              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">
                                ${contract.total_amount.toLocaleString()}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* GFA Reference - Compact Footer */}
                  {gfaCitation && gfaValue && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                      className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Ruler className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Project Area (GFA)</p>
                            <p className="text-xl font-bold">{gfaValue.toLocaleString()} sq ft</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 font-mono">
                          cite: [{gfaCitation.id.slice(0, 8)}]
                        </Badge>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-16 rounded-2xl border-2 border-dashed border-slate-700 text-center bg-slate-900/50"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <DollarSign className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                  </motion.div>
                  <p className="text-xl font-medium text-slate-400">No Financial Data Recorded</p>
                  <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto">
                    Add budget information, materials costs, or create contracts to unlock the Financial Command Center
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
    <div className={cn("h-full flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-50/80 via-background to-purple-50/80 dark:from-violet-950/50 dark:via-background dark:to-purple-950/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-violet-700 dark:text-violet-300">
              {t('stage8.title', 'Final Review Dashboard')}
            </h2>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70">
              {t('stage8.subtitle', 'Stage 8 • 8-Panel Summary • Review & Edit before activation')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Data Source Indicator */}
            {dataSource !== 'supabase' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 gap-1 text-[10px]">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {dataSource === 'localStorage' ? 'Offline' : 'Mixed'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Data loaded from local backup</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Financial Lock Status */}
            {canViewFinancials && (
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1 text-[10px]",
                  isFinancialSummaryUnlocked 
                    ? "bg-green-50 dark:bg-green-900/30 text-green-600" 
                    : "bg-red-50 dark:bg-red-900/30 text-red-600"
                )}
              >
                {isFinancialSummaryUnlocked ? <Unlock className="h-2.5 w-2.5" /> : <LockKeyhole className="h-2.5 w-2.5" />}
                {isFinancialSummaryUnlocked ? 'Unlocked' : 'Locked'}
              </Badge>
            )}
            
            <Badge variant="outline" className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
              {projectData?.name || 'Project'}
            </Badge>
            <Badge 
              variant={projectData?.status === 'active' ? 'default' : 'secondary'}
              className={projectData?.status === 'active' ? 'bg-green-500' : ''}
            >
              {projectData?.status || 'draft'}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Visibility Legend & Edit Mode Toggle */}
      <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-2">Visibility:</span>
            {VISIBILITY_TIERS.map((tier) => (
              <TooltipProvider key={tier.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn("text-[10px] gap-1 cursor-help", tier.color, tier.bgColor)}>
                      <tier.icon className="h-2.5 w-2.5" />
                      {tier.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">{tier.description}</p>
                    {tier.canEdit && <p className="text-xs text-green-500 mt-1">✓ Can edit</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          
          {/* ✓ UNIVERSAL READ-ONLY DEFAULT: Owner Edit Mode Toggle */}
          {userRole === 'owner' && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isEditModeEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEditModeEnabled(!isEditModeEnabled)}
                      className={cn(
                        "h-7 gap-1.5 text-xs",
                        isEditModeEnabled 
                          ? "bg-amber-500 hover:bg-amber-600 text-white" 
                          : "border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      )}
                    >
                      {isEditModeEnabled ? (
                        <>
                          <Edit2 className="h-3 w-3" />
                          Edit Mode ON
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          Read-Only
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {isEditModeEnabled 
                        ? "Click to disable editing and return to read-only view" 
                        : "Click to enable editing of project data"
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content - 8 Panel Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {PANELS.map(renderPanel)}
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
                  const { data: userProfile } = await supabase
                    .from('bu_profiles')
                    .select('company_name')
                    .eq('user_id', userId)
                    .single();
                  
                  // 4. Send email via edge function
                  const { data: session } = await supabase.auth.getSession();
                  const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-contract-email', {
                    body: {
                      clientEmail: clientEmail,
                      clientName: clientName,
                      contractorName: userProfile?.company_name || 'Your Contractor',
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
                    // Update contract with sent timestamp
                    await supabase.from('contracts').update({
                      sent_to_client_at: new Date().toISOString(),
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
      
      {/* Bottom Action Bar */}
      <div className="border-t border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-50/80 via-background to-purple-50/80 dark:from-violet-950/50 dark:via-background dark:to-purple-950/50 p-4 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left - Stats */}
            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
              <span>
                <span className="font-medium text-violet-600 dark:text-violet-400">{citations.length}</span> citations
              </span>
              <span>
                <span className="font-medium text-teal-600 dark:text-teal-400">{teamMembers.length}</span> team
              </span>
              <span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{tasks.length}</span> tasks
              </span>
              <span>
                <span className="font-medium text-pink-600 dark:text-pink-400">{documents.length}</span> docs
              </span>
            </div>
            
            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              {/* Invoice Generation - Owner only */}
              {canViewFinancials && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInvoice}
                  disabled={isGeneratingInvoice}
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 disabled:opacity-50"
                >
                  {isGeneratingInvoice ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isGeneratingInvoice ? 'Generating...' : 'Generate Invoice'}
                </Button>
              )}
              
              {/* PDF Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('stage8.exportPDF', 'Export PDF')}
              </Button>
              
              {/* AI Analysis - Owner/Foreman only */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIAnalysis}
                  disabled={isGeneratingAI}
                  className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/50"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t('stage8.aiAnalysis', 'AI Analysis')}
                </Button>
              )}
              
              {/* Complete Button - Requires Financial Unlock for Owner */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={handleComplete}
                        disabled={isSaving || (userRole === 'owner' && !isFinancialSummaryUnlocked)}
                        className={cn(
                          "gap-2",
                          userRole === 'owner' && !isFinancialSummaryUnlocked
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : userRole === 'owner' && !isFinancialSummaryUnlocked ? (
                          <LockKeyhole className="h-4 w-4" />
                        ) : (
                          <LayoutDashboard className="h-4 w-4" />
                        )}
                        {t('stage8.generateDashboard', 'Generate Project Dashboard (8 Panels)')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {userRole === 'owner' && !isFinancialSummaryUnlocked && (
                    <TooltipContent side="top">
                      <p className="text-xs">Add financial data (budget/contracts) to unlock</p>
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
    </div>
  );
}
