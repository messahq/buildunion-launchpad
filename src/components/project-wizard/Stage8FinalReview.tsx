// ============================================
// STAGE 8: FINAL REVIEW & ANALYSIS DASHBOARD
// ============================================
// Complete project summary before AI analysis
// - Stage-by-stage summary cards (expandable)
// - Tier-based visibility (Owner/Foreman/Worker)
// - Inline editing for authorized users
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  canEdit: boolean;
  description: string;
}

const VISIBILITY_TIERS: TierConfig[] = [
  {
    key: 'owner',
    label: 'Owner Only',
    icon: Shield,
    color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    canEdit: true,
    description: 'Financial data, profit margins, sensitive info',
  },
  {
    key: 'foreman',
    label: 'Foreman+',
    icon: Users,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    canEdit: true,
    description: 'Team management, scheduling, task assignment',
  },
  {
    key: 'worker',
    label: 'All Team',
    icon: Eye,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    canEdit: false,
    description: 'Task details, work instructions, basic project info',
  },
  {
    key: 'public',
    label: 'Public',
    icon: EyeOff,
    color: 'text-green-600 bg-green-50 dark:bg-green-950/30',
    canEdit: false,
    description: 'Client-safe information',
  },
];

// ============================================
// STAGE DEFINITIONS
// ============================================
interface StageSection {
  id: string;
  stageNumber: number;
  title: string;
  titleKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  visibilityTier: VisibilityTier;
  dataKeys: string[]; // Citation types to include
}

const STAGE_SECTIONS: StageSection[] = [
  {
    id: 'stage-1',
    stageNumber: 1,
    title: 'Basic Information',
    titleKey: 'stage8.basicInfo',
    icon: FileText,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    visibilityTier: 'public',
    dataKeys: ['PROJECT_NAME', 'LOCATION', 'WORK_TYPE'],
  },
  {
    id: 'stage-2',
    stageNumber: 2,
    title: 'Area Lock (GFA)',
    titleKey: 'stage8.areaLock',
    icon: Ruler,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    visibilityTier: 'foreman',
    dataKeys: ['GFA_LOCK', 'BLUEPRINT_UPLOAD'],
  },
  {
    id: 'stage-3',
    stageNumber: 3,
    title: 'Trade & Template',
    titleKey: 'stage8.tradeTemplate',
    icon: Hammer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    visibilityTier: 'foreman',
    dataKeys: ['TRADE_SELECTION', 'TEMPLATE_LOCK'],
  },
  {
    id: 'stage-4',
    stageNumber: 4,
    title: 'Execution Flow',
    titleKey: 'stage8.executionFlow',
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    visibilityTier: 'foreman',
    dataKeys: ['EXECUTION_MODE', 'SITE_CONDITION', 'DEMOLITION_PRICE', 'TEAM_SIZE', 'TIMELINE', 'END_DATE'],
  },
  {
    id: 'stage-5',
    stageNumber: 5,
    title: 'Visual Intelligence',
    titleKey: 'stage8.visualIntelligence',
    icon: Eye,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    visibilityTier: 'worker',
    dataKeys: ['BLUEPRINT_UPLOAD', 'SITE_PHOTO', 'VISUAL_VERIFICATION'],
  },
  {
    id: 'stage-6',
    stageNumber: 6,
    title: 'Team Architecture',
    titleKey: 'stage8.teamArchitecture',
    icon: Users,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
    visibilityTier: 'foreman',
    dataKeys: ['TEAM_STRUCTURE', 'TEAM_MEMBER_INVITE', 'TEAM_PERMISSION_SET'],
  },
  {
    id: 'stage-7',
    stageNumber: 7,
    title: 'Execution Timeline',
    titleKey: 'stage8.executionTimeline',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    visibilityTier: 'worker',
    dataKeys: ['TIMELINE', 'END_DATE', 'DNA_FINALIZED'],
  },
  {
    id: 'financial',
    stageNumber: 0,
    title: 'Financial Summary',
    titleKey: 'stage8.financialSummary',
    icon: Briefcase,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    visibilityTier: 'owner',
    dataKeys: ['BUDGET', 'MATERIAL', 'DEMOLITION_PRICE'],
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
  
  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stage-1']));
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
        
      } catch (err) {
        console.error('[Stage8] Failed to load data:', err);
        toast.error('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [projectId]);
  
  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  // Get citations for a specific stage
  const getCitationsForStage = useCallback((dataKeys: string[]): Citation[] => {
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
            <Badge variant="outline" className={cn("text-xs gap-1", config.color)}>
              <Icon className="h-3 w-3" />
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
  
  // Render stage section
  const renderStageSection = useCallback((section: StageSection) => {
    // Check access
    if (!hasAccessToTier(section.visibilityTier)) {
      return (
        <Card key={section.id} className={cn("opacity-50", section.borderColor)}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", section.bgColor)}>
                  <Lock className={cn("h-4 w-4", section.color)} />
                </div>
                <div>
                  <CardTitle className="text-sm">{section.title}</CardTitle>
                  <CardDescription className="text-xs">Restricted Access</CardDescription>
                </div>
              </div>
              {getTierBadge(section.visibilityTier)}
            </div>
          </CardHeader>
        </Card>
      );
    }
    
    const stageCitations = getCitationsForStage(section.dataKeys);
    const isExpanded = expandedSections.has(section.id);
    const Icon = section.icon;
    
    return (
      <Collapsible
        key={section.id}
        open={isExpanded}
        onOpenChange={() => toggleSection(section.id)}
      >
        <Card className={cn(
          "transition-all duration-200",
          section.borderColor,
          isExpanded && "ring-2 ring-offset-2",
          isExpanded && section.color.replace('text-', 'ring-')
        )}>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", section.bgColor)}>
                    <Icon className={cn("h-4 w-4", section.color)} />
                  </div>
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {section.stageNumber > 0 && (
                        <span className={cn("text-xs font-normal", section.color)}>
                          Stage {section.stageNumber}
                        </span>
                      )}
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {stageCitations.length} {stageCitations.length === 1 ? 'item' : 'items'} recorded
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTierBadge(section.visibilityTier)}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              {stageCitations.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No data recorded for this stage
                </div>
              ) : (
                <div className="space-y-3">
                  {stageCitations.map((citation) => (
                    <div
                      key={citation.id}
                      className="group flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-muted-foreground/20 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {citation.cite_type.replace(/_/g, ' ')}
                        </p>
                        {renderCitationValue(citation)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(citation.timestamp), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }, [
    hasAccessToTier,
    getCitationsForStage,
    expandedSections,
    toggleSection,
    getTierBadge,
    renderCitationValue,
  ]);
  
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
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-violet-700 dark:text-violet-300">
              {t('stage8.title', 'Final Review')}
            </h2>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70">
              {t('stage8.subtitle', 'Stage 8 • Complete Project Summary')}
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
      
      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Project Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium text-sm">{projectData?.address || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Team Size</p>
                    <p className="font-medium text-sm">{teamMembers.length} members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tasks Created</p>
                    <p className="font-medium text-sm">{tasks.length} tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Visibility Legend */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <span className="text-xs font-medium text-muted-foreground mr-2">Visibility Tiers:</span>
            {VISIBILITY_TIERS.map((tier) => (
              <TooltipProvider key={tier.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn("text-xs gap-1 cursor-help", tier.color)}>
                      <tier.icon className="h-3 w-3" />
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
          
          {/* Stage Sections */}
          <div className="space-y-4">
            {STAGE_SECTIONS.filter(s => s.stageNumber > 0).map(renderStageSection)}
            
            {/* Financial Summary - Owner Only */}
            {canViewFinancials && (
              <div className="pt-4 border-t border-dashed">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Owner-Only Data
                </h3>
                {renderStageSection(STAGE_SECTIONS.find(s => s.id === 'financial')!)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Action Bar */}
      <div className="border-t border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-50/80 via-background to-purple-50/80 dark:from-violet-950/50 dark:via-background dark:to-purple-950/50 p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left - Info */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-violet-600 dark:text-violet-400">
                {citations.length} citations
              </span>
              {' • '}
              <span>{teamMembers.length} team members</span>
              {' • '}
              <span>{tasks.length} tasks</span>
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
