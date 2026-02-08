// ============================================
// STAGE 8: FINAL REVIEW & ANALYSIS DASHBOARD
// ============================================
// 8-Panel Summary before AI analysis
// - Each panel represents a key project domain
// - Tier-based visibility (Owner/Foreman/Worker/Public)
// - Inline editing for authorized users
// - Full-screen panel view option
// - AI Analysis, PDF, Summary actions at bottom
// ============================================

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Citation, CITATION_TYPES } from "@/types/citation";
import { useTranslation } from "react-i18next";

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
  dataKeys: string[]; // Citation types to include
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Project data
  const [projectData, setProjectData] = useState<{
    name: string;
    address: string;
    status: string;
  } | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [teamMembers, setTeamMembers] = useState<{id: string; role: string; name: string}[]>([]);
  const [tasks, setTasks] = useState<{id: string; title: string; status: string; priority: string}[]>([]);
  const [documents, setDocuments] = useState<{id: string; file_name: string; file_path: string}[]>([]);
  const [contracts, setContracts] = useState<{id: string; contract_number: string; status: string; total_amount: number | null}[]>([]);
  const [weatherData, setWeatherData] = useState<{temp?: number; condition?: string; alerts?: string[]} | null>(null);
  
  // UI state
  const [activePanel, setActivePanel] = useState<string | null>('panel-1-basics');
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Check user permissions
  const canEdit = useMemo(() => {
    return userRole === 'owner' || userRole === 'foreman';
  }, [userRole]);
  
  const canViewFinancials = useMemo(() => {
    return userRole === 'owner';
  }, [userRole]);
  
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
  
  // Load all project data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // 1. Load project
        const { data: project } = await supabase
          .from('projects')
          .select('name, address, status')
          .eq('id', projectId)
          .single();
        
        if (project) {
          setProjectData(project);
          
          // Try to fetch weather if address exists
          if (project.address) {
            fetchWeather(project.address);
          }
        }
        
        // 2. Load citations from project_summaries
        const { data: summary } = await supabase
          .from('project_summaries')
          .select('verified_facts')
          .eq('project_id', projectId)
          .single();
        
        if (summary?.verified_facts) {
          const facts = Array.isArray(summary.verified_facts) 
            ? (summary.verified_facts as unknown as Citation[])
            : [];
          setCitations(facts);
        }
        
        // 3. Load team members
        const { data: members } = await supabase
          .from('project_members')
          .select('id, user_id, role')
          .eq('project_id', projectId);
        
        if (members && members.length > 0) {
          const userIds = members.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          
          const teamData = members.map(m => {
            const profile = profiles?.find(p => p.user_id === m.user_id);
            return {
              id: m.id,
              role: m.role,
              name: profile?.full_name || 'Team Member',
            };
          });
          setTeamMembers(teamData);
        }
        
        // 4. Load tasks
        const { data: tasksData } = await supabase
          .from('project_tasks')
          .select('id, title, status, priority')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        if (tasksData) {
          setTasks(tasksData);
        }
        
        // 5. Load documents
        const { data: docsData } = await supabase
          .from('project_documents')
          .select('id, file_name, file_path')
          .eq('project_id', projectId);
        
        if (docsData) {
          setDocuments(docsData);
        }
        
        // 6. Load contracts
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, contract_number, status, total_amount')
          .eq('project_id', projectId)
          .is('archived_at', null);
        
        if (contractsData) {
          setContracts(contractsData);
        }
        
      } catch (err) {
        console.error('[Stage8] Failed to load data:', err);
        toast.error('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [projectId]);
  
  // Fetch weather data
  const fetchWeather = async (address: string) => {
    try {
      const response = await supabase.functions.invoke('get-weather', {
        body: { address }
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
      // Find and update the citation
      const updatedCitations = citations.map(c => {
        if (c.id === editingField) {
          return { ...c, answer: editValue, value: editValue };
        }
        return c;
      });
      
      // Save to database
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
  
  // Generate AI Analysis
  const handleAIAnalysis = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      // TODO: Call AI analysis edge function
      toast.info('AI Analysis feature coming soon!');
      await new Promise(r => setTimeout(r, 1500));
    } finally {
      setIsGeneratingAI(false);
    }
  }, []);
  
  // Generate PDF Summary
  const handleGeneratePDF = useCallback(async () => {
    toast.info('PDF generation feature coming soon!');
  }, []);
  
  // Complete and go to dashboard
  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      // Update project status
      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);
      
      toast.success('Project finalized!');
      onComplete();
    } catch (err) {
      console.error('[Stage8] Failed to complete:', err);
      toast.error('Failed to finalize project');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, onComplete]);
  
  // Render citation value
  const renderCitationValue = useCallback((citation: Citation) => {
    const isEditing = editingField === citation.id;
    
    // Format based on type
    let displayValue = citation.answer;
    
    if (citation.cite_type === 'TIMELINE' && citation.metadata?.start_date) {
      try {
        displayValue = format(parseISO(citation.metadata.start_date as string), 'MMM dd, yyyy');
      } catch (e) {
        displayValue = citation.metadata.start_date as string;
      }
    }
    
    if (citation.cite_type === 'END_DATE' && typeof citation.value === 'string') {
      try {
        displayValue = format(parseISO(citation.value), 'MMM dd, yyyy');
      } catch (e) {
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
  
  // Render panel content based on panel ID
  const renderPanelContent = useCallback((panel: PanelConfig) => {
    const panelCitations = getCitationsForPanel(panel.dataKeys);
    
    // Special handling for different panels
    switch (panel.id) {
      case 'panel-4-team':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Team Members ({teamMembers.length})
            </div>
            {teamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No team members added</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}: </span>
                    {renderCitationValue(c)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'panel-5-timeline':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Tasks ({tasks.length})
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No tasks created</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm truncate flex-1">{task.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {task.priority}
                      </Badge>
                      <Badge 
                        variant={task.status === 'completed' ? 'default' : 'secondary'} 
                        className={cn("text-[10px]", task.status === 'completed' && 'bg-green-500')}
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{tasks.length - 5} more tasks</p>
                )}
              </div>
            )}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}: </span>
                    {renderCitationValue(c)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'panel-6-documents':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Documents ({documents.length}) • Contracts ({contracts.length})
            </div>
            {documents.length === 0 && contracts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No documents or contracts</p>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 3).map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <FileText className="h-4 w-4 text-pink-500" />
                    <span className="text-sm truncate">{doc.file_name}</span>
                  </div>
                ))}
                {contracts.slice(0, 2).map(contract => (
                  <div key={contract.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-pink-600" />
                      <span className="text-sm">Contract #{contract.contract_number}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{contract.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'panel-7-weather':
        return (
          <div className="space-y-3">
            {weatherData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30">
                  <Thermometer className="h-8 w-8 text-sky-500" />
                  <div>
                    <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                      {weatherData.temp !== undefined ? `${Math.round(weatherData.temp)}°C` : 'N/A'}
                    </p>
                    <p className="text-sm text-sky-600/80 dark:text-sky-400/80 capitalize">
                      {weatherData.condition || 'Unknown'}
                    </p>
                  </div>
                </div>
                {weatherData.alerts && weatherData.alerts.length > 0 && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-medium">Weather Alerts Active</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Cloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No weather data available</p>
                <p className="text-[10px] text-muted-foreground">Set project address to enable</p>
              </div>
            )}
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}: </span>
                    {renderCitationValue(c)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'panel-8-financial':
        if (!canViewFinancials) {
          return (
            <div className="text-center py-6">
              <Lock className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-600">Owner Access Required</p>
              <p className="text-xs text-muted-foreground">Financial data is restricted</p>
            </div>
          );
        }
        
        const totalContractValue = contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
                <p className="text-xs text-muted-foreground">Contract Value</p>
                <p className="text-lg font-bold text-red-700 dark:text-red-300">
                  ${totalContractValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                <p className="text-xs text-muted-foreground">Contracts</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{contracts.length}</p>
              </div>
            </div>
            {panelCitations.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                {panelCitations.map(c => (
                  <div key={c.id} className="group text-xs">
                    <span className="text-muted-foreground">{c.cite_type.replace(/_/g, ' ')}: </span>
                    {renderCitationValue(c)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        // Default: show citations
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
    tasks,
    documents,
    contracts,
    weatherData,
    canViewFinancials,
    renderCitationValue,
  ]);
  
  // Render fullscreen panel content
  const renderFullscreenContent = useCallback((panel: PanelConfig) => {
    const panelCitations = getCitationsForPanel(panel.dataKeys);
    
    return (
      <div className="space-y-6">
        {/* All Citations */}
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
        
        {/* Panel-specific extra content */}
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
        
        {panel.id === 'panel-5-timeline' && tasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              All Tasks ({tasks.length})
            </h4>
            <div className="grid gap-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <span className="font-medium">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{task.priority}</Badge>
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {panel.id === 'panel-6-documents' && (
          <div className="space-y-4">
            {documents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Documents ({documents.length})
                </h4>
                <div className="grid gap-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <FileText className="h-5 w-5 text-pink-500" />
                      <span className="font-medium">{doc.file_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {contracts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Contracts ({contracts.length})
                </h4>
                <div className="grid gap-2">
                  {contracts.map(contract => (
                    <div key={contract.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-5 w-5 text-pink-600" />
                        <span className="font-medium">#{contract.contract_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{contract.status}</Badge>
                        {contract.total_amount && (
                          <span className="font-semibold">${contract.total_amount.toLocaleString()}</span>
                        )}
                      </div>
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
        
        {panel.id === 'panel-8-financial' && canViewFinancials && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Overview
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30">
                <p className="text-sm text-muted-foreground mb-1">Total Contract Value</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                  ${contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                <p className="text-sm text-muted-foreground mb-1">Active Contracts</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {contracts.filter(c => c.status !== 'archived').length}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {panelCitations.length === 0 && !['panel-4-team', 'panel-5-timeline', 'panel-6-documents', 'panel-7-weather', 'panel-8-financial'].includes(panel.id) && (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No data recorded for this panel yet</p>
          </div>
        )}
      </div>
    );
  }, [getCitationsForPanel, renderCitationValue, teamMembers, tasks, documents, contracts, weatherData, canViewFinancials]);
  
  // Render single panel
  const renderPanel = useCallback((panel: PanelConfig) => {
    const hasAccess = hasAccessToTier(panel.visibilityTier);
    const isActive = activePanel === panel.id;
    const Icon = panel.icon;
    const panelCitations = getCitationsForPanel(panel.dataKeys);
    const dataCount = panelCitations.length + 
      (panel.id === 'panel-4-team' ? teamMembers.length : 0) +
      (panel.id === 'panel-5-timeline' ? tasks.length : 0) +
      (panel.id === 'panel-6-documents' ? documents.length + contracts.length : 0);
    
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
          panel.borderColor,
          isActive && "ring-2 ring-offset-2",
          isActive && panel.color.replace('text-', 'ring-')
        )}
        whileHover={{ scale: 1.02 }}
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
        
        {/* Panel Header */}
        <div 
          className={cn("p-3 border-b cursor-pointer", panel.bgColor)}
          onClick={() => setActivePanel(isActive ? null : panel.id)}
        >
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", panel.bgColor)}>
                <Icon className={cn("h-4 w-4", panel.color)} />
              </div>
              <div>
                <h3 className={cn("text-sm font-semibold", panel.color)}>
                  {t(panel.titleKey, panel.title)}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {dataCount > 0 ? `${dataCount} items` : panel.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTierBadge(panel.visibilityTier)}
              {isActive ? (
                <ChevronDown className={cn("h-4 w-4", panel.color)} />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Panel Content - Collapsible */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-background">
                {renderPanelContent(panel)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [
    hasAccessToTier,
    activePanel,
    getCitationsForPanel,
    teamMembers,
    tasks,
    documents,
    contracts,
    getTierBadge,
    renderPanelContent,
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
      
      {/* Visibility Legend */}
      <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
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
          {fullscreenPanelConfig && (
            <>
              <DialogHeader className={cn("pb-4 border-b", fullscreenPanelConfig.bgColor)}>
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", fullscreenPanelConfig.bgColor)}>
                    <fullscreenPanelConfig.icon className={cn("h-5 w-5", fullscreenPanelConfig.color)} />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className={cn("text-lg", fullscreenPanelConfig.color)}>
                      {t(fullscreenPanelConfig.titleKey, fullscreenPanelConfig.title)}
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
          )}
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
              
              {/* Complete Button */}
              <Button
                onClick={handleComplete}
                disabled={isSaving}
                className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LayoutDashboard className="h-4 w-4" />
                )}
                {t('stage8.generateDashboard', 'Generate Project Dashboard (8 Panels)')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
