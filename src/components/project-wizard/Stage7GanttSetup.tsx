// ============================================
// STAGE 7: GANTT SETUP & TASK ORCHESTRATION
// ============================================
// Bridge between Team Architecture and Final Dashboard
// - Dynamic Gantt timeline from verified_facts dates
// - Assignee dropdowns (Stage 6 team members)
// - Task priorities and sequencing
// - Verification nodes for each major phase
// ============================================

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Sparkles,
  Clock,
  AlertTriangle,
  Camera,
  FileText,
  Flag,
  GripVertical,
  LayoutDashboard,
  ArrowUpDown,
  User,
  Trash2,
  DollarSign,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { format, differenceInDays, addDays, parseISO } from "date-fns";

// Template item from Stage 3 TEMPLATE_LOCK
interface TemplateItem {
  id: string;
  name: string;
  category: 'material' | 'labor';
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

// Map template items to phases based on category and name patterns
function categorizeTemplateItem(item: TemplateItem): string {
  const nameLower = item.name.toLowerCase();
  
  // Demolition-related → demolition phase
  if (nameLower.includes('demolition') || nameLower.includes('demo') || nameLower.includes('removal')) {
    return 'demolition';
  }
  
  // Surface prep, primer, underlayment → preparation
  if (nameLower.includes('prep') || nameLower.includes('primer') || nameLower.includes('underlayment') || 
      nameLower.includes('tape') || nameLower.includes('compound') || nameLower.includes('mesh') ||
      nameLower.includes('rebar') || nameLower.includes('forming')) {
    return 'preparation';
  }
  
  // Finishing, QC, inspection, baseboard, trim → finishing
  if (nameLower.includes('finish') || nameLower.includes('baseboard') || nameLower.includes('trim') ||
      nameLower.includes('transition') || nameLower.includes('touch') || nameLower.includes('qc')) {
    return 'finishing';
  }
  
  // Everything else (main materials + installation labor) → installation
  return 'installation';
}

// Phase definitions with logical work breakdown
const PHASE_DEFINITIONS = [
  {
    id: 'demolition',
    name: 'Demolition',
    shortName: 'Demo',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-300',
    durationPercent: 15, // 15% of total project time
    requiresVerification: true,
    verificationLabel: 'Site Clear Photo',
  },
  {
    id: 'preparation',
    name: 'Preparation',
    shortName: 'Prep',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-300',
    durationPercent: 25,
    requiresVerification: true,
    verificationLabel: 'Prep Complete Checklist',
  },
  {
    id: 'installation',
    name: 'Installation',
    shortName: 'Install',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    durationPercent: 45,
    requiresVerification: true,
    verificationLabel: 'Progress Photos',
  },
  {
    id: 'finishing',
    name: 'Finishing & QC',
    shortName: 'Finish',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-300',
    durationPercent: 15,
    requiresVerification: true,
    verificationLabel: 'Final Inspection (OBC)',
  },
];

// Priority levels
const PRIORITIES = [
  { key: 'critical', label: 'Critical', color: 'bg-red-500', icon: AlertTriangle },
  { key: 'high', label: 'High', color: 'bg-orange-500', icon: Flag },
  { key: 'medium', label: 'Medium', color: 'bg-yellow-500', icon: Clock },
  { key: 'low', label: 'Low', color: 'bg-green-500', icon: CheckCircle2 },
];

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  isPending?: boolean; // Email invite not yet accepted
  email?: string; // For pending invites
}

interface PhaseTask {
  id: string;
  phaseId: string;
  name: string;
  assigneeId: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  startDate: Date;
  endDate: Date;
  durationDays: number;
  isVerificationNode: boolean;
  verificationStatus: 'pending' | 'uploaded' | 'verified';
  isSubTask?: boolean; // Template-derived sub-task
  templateItemCost?: number; // Cost from template item
  templateItemCategory?: 'material' | 'labor'; // MAT or LAB badge
}

interface Stage7GanttSetupProps {
  projectId: string;
  userId: string;
  onComplete: () => void;
  className?: string;
}

export default function Stage7GanttSetup({
  projectId,
  userId,
  onComplete,
  className,
}: Stage7GanttSetupProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Project dates from citations
  const [projectStartDate, setProjectStartDate] = useState<Date | null>(null);
  const [projectEndDate, setProjectEndDate] = useState<Date | null>(null);
  const [hasDemolition, setHasDemolition] = useState(false);
  
  // Team members from Stage 6
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Tasks organized by phase
  const [phaseTasks, setPhaseTasks] = useState<PhaseTask[]>([]);
  
  // Template items from Stage 3
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  
  // Load project data on mount
  useEffect(() => {
    const loadProjectData = async () => {
      setIsLoading(true);
      
      try {
        // 1. Load verified_facts + financial data for dates and site condition
        const { data: summaryData } = await supabase
          .from('project_summaries')
          .select('verified_facts, template_items, material_cost, labor_cost, total_cost')
          .eq('project_id', projectId)
          .single();
        
        if (summaryData?.verified_facts) {
          const facts = Array.isArray(summaryData.verified_facts) 
            ? (summaryData.verified_facts as Record<string, unknown>[])
            : [];
          
          // Extract dates with proper typing
          const timelineCite = facts.find((f) => f.cite_type === 'TIMELINE') as Record<string, unknown> | undefined;
          const endDateCite = facts.find((f) => f.cite_type === 'END_DATE') as Record<string, unknown> | undefined;
          const siteConditionCite = facts.find((f) => f.cite_type === 'SITE_CONDITION') as Record<string, unknown> | undefined;
          
          const timelineMetadata = timelineCite?.metadata as Record<string, unknown> | undefined;
          const endDateMetadata = endDateCite?.metadata as Record<string, unknown> | undefined;
          
          if (timelineMetadata?.start_date && typeof timelineMetadata.start_date === 'string') {
            setProjectStartDate(parseISO(timelineMetadata.start_date));
          } else {
            // Default to today if no start date
            setProjectStartDate(new Date());
          }
          
          if (typeof endDateCite?.value === 'string') {
            setProjectEndDate(parseISO(endDateCite.value));
          } else if (endDateMetadata?.end_date && typeof endDateMetadata.end_date === 'string') {
            setProjectEndDate(parseISO(endDateMetadata.end_date));
          } else {
            // Default to 30 days from start
            setProjectEndDate(addDays(new Date(), 30));
          }
          
          // Check if demolition is needed
          setHasDemolition(siteConditionCite?.value === 'demolition');
          
          // 1b. Extract TEMPLATE_LOCK items (primary source)
          const templateLockCite = facts.find((f) => f.cite_type === 'TEMPLATE_LOCK') as Record<string, unknown> | undefined;
          if (templateLockCite?.metadata) {
            const meta = templateLockCite.metadata as Record<string, unknown>;
            if (Array.isArray(meta.items) && meta.items.length > 0) {
              setTemplateItems(meta.items as TemplateItem[]);
            }
          }
          
          // 1c. Synthetic Recovery: If no TEMPLATE_LOCK items but financial data exists, 
          // generate synthetic template items from DB costs so subtasks appear on Gantt
          if (!templateLockCite || !(templateLockCite.metadata as Record<string, unknown>)?.items) {
            const dbMaterialCost = Number(summaryData.material_cost) || 0;
            const dbLaborCost = Number(summaryData.labor_cost) || 0;
            const dbTotalCost = Number(summaryData.total_cost) || 0;
            const dbTemplateItems = Array.isArray(summaryData.template_items) ? summaryData.template_items : [];
            
            if (dbTemplateItems.length > 0) {
              // Use template_items from DB directly
              setTemplateItems(dbTemplateItems as unknown as TemplateItem[]);
            } else if (dbTotalCost > 0) {
              // Generate synthetic items from aggregate costs
              const syntheticItems: TemplateItem[] = [];
              if (dbMaterialCost > 0) {
                syntheticItems.push({
                  id: 'synthetic_material',
                  name: 'Materials (from estimate)',
                  category: 'material',
                  quantity: 1,
                  unit: 'lot',
                  unitPrice: dbMaterialCost,
                  totalPrice: dbMaterialCost,
                });
              }
              if (dbLaborCost > 0) {
                syntheticItems.push({
                  id: 'synthetic_labor',
                  name: 'Labor (from estimate)',
                  category: 'labor',
                  quantity: 1,
                  unit: 'lot',
                  unitPrice: dbLaborCost,
                  totalPrice: dbLaborCost,
                });
              }
              if (syntheticItems.length > 0) {
                setTemplateItems(syntheticItems);
                console.log('[Stage7] Synthetic recovery: generated', syntheticItems.length, 'items from DB costs');
              }
            }
          }
        }
        
        // 2. Load team members from project_members (accepted invites)
        const { data: membersData } = await supabase
          .from('project_members')
          .select(`
            id,
            user_id,
            role
          `)
          .eq('project_id', projectId);
        
        // 3. Load pending invitations from team_invitations
        const { data: pendingInvitations } = await supabase
          .from('team_invitations')
          .select('id, email, role, status')
          .eq('project_id', projectId)
          .eq('status', 'pending');
        
        const allMembers: TeamMember[] = [];
        
        // 4. Load profiles for accepted members
        if (membersData && membersData.length > 0) {
          const userIds = membersData.map(m => m.user_id);
          
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds);
          
          membersData.forEach(member => {
            const profile = profilesData?.find(p => p.user_id === member.user_id);
            allMembers.push({
              id: member.id,
              userId: member.user_id,
              name: profile?.full_name || 'Team Member',
              role: member.role,
              avatarUrl: profile?.avatar_url || undefined,
              isPending: false,
            });
          });
        }
        
        // 5. Add pending email invitations
        if (pendingInvitations && pendingInvitations.length > 0) {
          pendingInvitations.forEach(invite => {
            // Extract name from email (before @) or show email
            const emailName = invite.email.split('@')[0];
            const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            
            allMembers.push({
              id: `pending_${invite.id}`,
              userId: `pending_${invite.id}`, // Placeholder for pending invites
              name: displayName,
              role: invite.role || 'member',
              isPending: true,
              email: invite.email,
            });
          });
        }
        
        setTeamMembers(allMembers);
        
        // 6. Add owner as "Owner" option
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', userId)
          .single();
        
        const ownerMember: TeamMember = {
          id: 'owner',
          userId: userId,
          name: ownerProfile?.full_name || 'Owner',
          role: 'owner',
          avatarUrl: ownerProfile?.avatar_url || undefined,
          isPending: false,
        };
        
        setTeamMembers(prev => [ownerMember, ...prev]);
        
      } catch (err) {
        console.error('[Stage7] Failed to load project data:', err);
        toast.error('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjectData();
  }, [projectId, userId]);
  
  // Generate phase tasks based on dates + template items
  useEffect(() => {
    if (!projectStartDate || !projectEndDate) return;
    
    const totalDays = differenceInDays(projectEndDate, projectStartDate);
    if (totalDays <= 0) return;
    
    // Filter phases based on demolition requirement
    const activePhaseDefs = hasDemolition 
      ? PHASE_DEFINITIONS 
      : PHASE_DEFINITIONS.filter(p => p.id !== 'demolition');
    
    // Categorize template items by phase
    const itemsByPhase: Record<string, TemplateItem[]> = {};
    templateItems.forEach(item => {
      const phaseId = categorizeTemplateItem(item);
      if (!itemsByPhase[phaseId]) itemsByPhase[phaseId] = [];
      itemsByPhase[phaseId].push(item);
    });
    
    // Recalculate percentages if no demolition
    const totalPercent = activePhaseDefs.reduce((sum, p) => sum + p.durationPercent, 0);
    
    let currentDate = projectStartDate;
    const tasks: PhaseTask[] = [];
    
    activePhaseDefs.forEach((phase, index) => {
      const adjustedPercent = (phase.durationPercent / totalPercent) * 100;
      const phaseDays = Math.max(1, Math.round((adjustedPercent / 100) * totalDays));
      const phaseEndDate = addDays(currentDate, phaseDays);
      
      // Main phase task (header)
      const mainTask: PhaseTask = {
        id: `task_${phase.id}_main`,
        phaseId: phase.id,
        name: `${phase.name} Work`,
        assigneeId: null,
        priority: index === 0 ? 'critical' : index === 1 ? 'high' : 'medium',
        startDate: currentDate,
        endDate: phaseEndDate,
        durationDays: phaseDays,
        isVerificationNode: false,
        verificationStatus: 'pending',
      };
      tasks.push(mainTask);
      
      // Template sub-tasks for this phase
      const phaseTemplateItems = itemsByPhase[phase.id] || [];
      phaseTemplateItems.forEach((item, subIdx) => {
        const subTask: PhaseTask = {
          id: `task_${phase.id}_template_${item.id}`,
          phaseId: phase.id,
          name: item.name,
          assigneeId: null,
          priority: 'medium',
          startDate: currentDate,
          endDate: phaseEndDate,
          durationDays: phaseDays,
          isVerificationNode: false,
          verificationStatus: 'pending',
          isSubTask: true,
          templateItemCost: item.totalPrice,
          templateItemCategory: item.category,
        };
        tasks.push(subTask);
      });
      
      // Verification node at end of phase
      if (phase.requiresVerification) {
        const verificationTask: PhaseTask = {
          id: `task_${phase.id}_verify`,
          phaseId: phase.id,
          name: phase.verificationLabel,
          assigneeId: null,
          priority: 'critical',
          startDate: phaseEndDate,
          endDate: phaseEndDate,
          durationDays: 0,
          isVerificationNode: true,
          verificationStatus: 'pending',
        };
        tasks.push(verificationTask);
      }
      
      currentDate = phaseEndDate;
    });
    
    setPhaseTasks(tasks);
  }, [projectStartDate, projectEndDate, hasDemolition, templateItems]);
  
  // Update task assignee
  const handleAssigneeChange = useCallback((taskId: string, assigneeId: string) => {
    setPhaseTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, assigneeId: assigneeId === 'unassigned' ? null : assigneeId }
        : task
    ));
  }, []);
  
  // Update task priority
  const handlePriorityChange = useCallback((taskId: string, priority: 'critical' | 'high' | 'medium' | 'low') => {
    setPhaseTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, priority } : task
    ));
  }, []);
  
  // Calculate Gantt bar position
  const getGanttPosition = useCallback((task: PhaseTask) => {
    if (!projectStartDate || !projectEndDate) return { left: '0%', width: '0%' };
    
    const totalDays = differenceInDays(projectEndDate, projectStartDate);
    if (totalDays <= 0) return { left: '0%', width: '0%' };
    
    const startOffset = differenceInDays(task.startDate, projectStartDate);
    const left = (startOffset / totalDays) * 100;
    const width = Math.max(2, (task.durationDays / totalDays) * 100);
    
    return { left: `${left}%`, width: `${width}%` };
  }, [projectStartDate, projectEndDate]);
  
  // Get phase definition by ID
  const getPhaseById = useCallback((phaseId: string) => {
    return PHASE_DEFINITIONS.find(p => p.id === phaseId);
  }, []);
  
  // Save tasks to database (reusable) — smart duplicate detection
  const saveTasksToDb = useCallback(async () => {
    // Check existing tasks for this project
    const { data: existingTasks } = await supabase
      .from('project_tasks')
      .select('id, description')
      .eq('project_id', projectId)
      .is('archived_at', null);
    
    const existingCount = existingTasks?.length || 0;
    const hasTemplateSubTasks = existingTasks?.some(t => 
      t.description?.startsWith('Template sub-task:')
    ) || false;
    
    // Separate phase tasks from template sub-tasks
    const phaseOnlyTasks = phaseTasks.filter(t => !t.isSubTask);
    const templateSubTasks = phaseTasks.filter(t => t.isSubTask);
    
    // Case 1: No tasks at all — insert everything
    if (existingCount === 0) {
      const tasksToInsert = phaseTasks.map(task => ({
        project_id: projectId,
        title: task.name,
        description: task.isVerificationNode 
          ? `Verification checkpoint: ${task.name}` 
          : task.isSubTask
            ? `Template sub-task: ${getPhaseById(task.phaseId)?.name}`
            : `Phase: ${getPhaseById(task.phaseId)?.name}`,
        assigned_to: task.assigneeId || userId,
        assigned_by: userId,
        priority: task.priority,
        status: 'pending',
        due_date: task.endDate.toISOString(),
        unit_price: task.isSubTask && task.templateItemCost ? task.templateItemCost : 0,
        quantity: task.isSubTask ? 1 : 1,
      }));
      
      const { error } = await supabase
        .from('project_tasks')
        .insert(tasksToInsert);
      
      if (error) {
        console.error('[Stage7] Failed to create tasks:', error);
        return false;
      }
      console.log('[Stage7] ✓ Inserted all', tasksToInsert.length, 'tasks');
      return true;
    }
    
    // Case 2: Phase tasks exist but NO template sub-tasks — insert only sub-tasks
    if (!hasTemplateSubTasks && templateSubTasks.length > 0) {
      const subTasksToInsert = templateSubTasks.map(task => ({
        project_id: projectId,
        title: task.name,
        description: `Template sub-task: ${getPhaseById(task.phaseId)?.name}`,
        assigned_to: task.assigneeId || userId,
        assigned_by: userId,
        priority: task.priority,
        status: 'pending',
        due_date: task.endDate.toISOString(),
        unit_price: task.templateItemCost || 0,
        quantity: 1,
      }));
      
      const { error } = await supabase
        .from('project_tasks')
        .insert(subTasksToInsert);
      
      if (error) {
        console.error('[Stage7] Failed to insert template sub-tasks:', error);
        return false;
      }
      console.log('[Stage7] ✓ Inserted', subTasksToInsert.length, 'template sub-tasks (phase tasks already existed)');
      return true;
    }
    
    // Case 3: Both phase tasks and template sub-tasks already exist — skip
    console.log('[Stage7] Tasks already complete, skipping insert');
    return true;
  }, [phaseTasks, projectId, userId, getPhaseById]);

  // Auto-save tasks when they're generated (so skipping Stage 7 still persists them)
  useEffect(() => {
    if (phaseTasks.length === 0) return;
    
    const autoSave = async () => {
      await saveTasksToDb();
    };
    autoSave();
  }, [phaseTasks, saveTasksToDb]);

  // Save and generate dashboard
  const handleGenerateDashboard = useCallback(async () => {
    setIsSaving(true);
    
    try {
      await saveTasksToDb();
      
      // Update project status to 'active'
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);
      
      if (projectError) {
        console.error('[Stage7] Failed to update project status:', projectError);
      }
      
      toast.success('Project Dashboard generated!');
      onComplete();
      
    } catch (err) {
      console.error('[Stage7] Dashboard generation failed:', err);
      toast.error('Failed to generate dashboard');
    } finally {
      setIsSaving(false);
    }
  }, [saveTasksToDb, projectId, onComplete]);
  
  // Group tasks by phase for rendering
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, PhaseTask[]> = {};
    phaseTasks.forEach(task => {
      if (!grouped[task.phaseId]) {
        grouped[task.phaseId] = [];
      }
      grouped[task.phaseId].push(task);
    });
    return grouped;
  }, [phaseTasks]);
  
  // Calculate phase cost totals from template sub-tasks
  const phaseCostTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    phaseTasks.forEach(task => {
      if (task.isSubTask && task.templateItemCost) {
        totals[task.phaseId] = (totals[task.phaseId] || 0) + task.templateItemCost;
      }
    });
    return totals;
  }, [phaseTasks]);
  
  // Calculate total project duration
  const totalDays = useMemo(() => {
    if (!projectStartDate || !projectEndDate) return 0;
    return differenceInDays(projectEndDate, projectStartDate);
  }, [projectStartDate, projectEndDate]);
  
  if (isLoading) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Loading project timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col md:flex-row overflow-hidden", className)}>
      {/* LEFT PANEL - Task Configuration */}
      <div className="w-full md:w-[420px] lg:w-[480px] border-r border-indigo-200/50 dark:border-indigo-800/30 flex flex-col h-full bg-gradient-to-b from-indigo-50/30 via-background to-purple-50/20 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/10">
        {/* Header */}
        <div className="p-4 border-b border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/50 dark:to-purple-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-indigo-700 dark:text-indigo-300">
                Execution Timeline
              </h2>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                Stage 7 • Task Orchestration
              </p>
            </div>
          </div>
        </div>
        
        {/* Project Summary */}
        <div className="p-4 border-b border-indigo-200/30 dark:border-indigo-800/20 shrink-0">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900">
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium text-indigo-700 dark:text-indigo-300">
                {projectStartDate ? format(projectStartDate, 'MMM dd, yyyy') : 'Not set'}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900">
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-medium text-indigo-700 dark:text-indigo-300">
                {projectEndDate ? format(projectEndDate, 'MMM dd, yyyy') : 'Not set'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Duration:</span>
            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {totalDays} days
            </Badge>
          </div>
        </div>
        
        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Task Assignment</span>
          </div>
          
          {Object.entries(tasksByPhase).map(([phaseId, tasks]) => {
            const phase = getPhaseById(phaseId);
            if (!phase) return null;
            const phaseCost = phaseCostTotals[phaseId];
            
            return (
              <motion.div
                key={phaseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-xl border p-4 space-y-3",
                  phase.bgColor,
                  phase.borderColor
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", phase.color)} />
                    <h3 className={cn("font-semibold text-sm", phase.textColor)}>
                      {phase.name}
                    </h3>
                  </div>
                  {phaseCost > 0 && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                      <DollarSign className="h-3 w-3 mr-0.5" />
                      {phaseCost.toLocaleString()}
                    </Badge>
                  )}
                </div>
                
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 space-y-2 border",
                      task.isVerificationNode 
                        ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30"
                        : task.isSubTask
                          ? "border-dashed border-slate-300 dark:border-slate-600 ml-4"
                          : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {task.isVerificationNode ? (
                          <Camera className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        ) : task.isSubTask ? (
                          <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-500" />
                        )}
                        <span className={cn("font-medium", task.isSubTask ? "text-xs" : "text-sm")}>{task.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {task.templateItemCost != null && task.templateItemCost > 0 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            ${task.templateItemCost.toLocaleString()}
                          </span>
                        )}
                        {task.isVerificationNode && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                          >
                            Verification
                          </Badge>
                        )}
                        {task.isSubTask && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] py-0",
                              task.templateItemCategory === 'labor'
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                                : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
                            )}
                          >
                            {task.templateItemCategory === 'labor' ? 'LAB' : 'MAT'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Assignee Dropdown */}
                      <Select
                        value={task.assigneeId || 'unassigned'}
                        onValueChange={(value) => handleAssigneeChange(task.id, value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <User className="h-3 w-3 mr-1" />
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">
                            <span className="text-muted-foreground">Unassigned</span>
                          </SelectItem>
                          {teamMembers.map(member => (
                            <SelectItem key={member.id} value={member.userId}>
                              <div className="flex items-center gap-2">
                                <span>{member.name}</span>
                                {member.isPending && (
                                  <Badge variant="outline" className="text-[10px] py-0 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                                    Pending
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {member.role}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Priority Dropdown */}
                      <Select
                        value={task.priority}
                        onValueChange={(value) => handlePriorityChange(task.id, value as any)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <ArrowUpDown className="h-3 w-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(priority => (
                            <SelectItem key={priority.key} value={priority.key}>
                              <div className="flex items-center gap-2">
                                <div className={cn("h-2 w-2 rounded-full", priority.color)} />
                                <span>{priority.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(task.startDate, 'MMM dd')}</span>
                      <span>→</span>
                      <span>{format(task.endDate, 'MMM dd')}</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {task.durationDays} {task.durationDays === 1 ? 'day' : 'days'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </motion.div>
            );
          })}
        </div>
        
        {/* CTA */}
        <div className="p-4 border-t border-indigo-200/50 dark:border-indigo-800/30 shrink-0">
          <Button
            onClick={handleGenerateDashboard}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Activate Project
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* RIGHT PANEL - Gantt Visualization */}
      <div className="hidden md:flex flex-1 flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
        {/* Gantt Header */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Gantt chart with verification checkpoints
          </p>
        </div>
        
        {/* Gantt Chart */}
         <div className="flex-1 overflow-y-auto p-3">
           <div className="space-y-1">
            {/* Timeline header */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-4 mb-4">
              <span>{projectStartDate ? format(projectStartDate, 'MMM dd') : ''}</span>
              <div className="flex-1 mx-4 h-px bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
              <span>{projectEndDate ? format(projectEndDate, 'MMM dd') : ''}</span>
            </div>
            
            {/* Task bars */}
            {phaseTasks.map((task, index) => {
              const phase = getPhaseById(task.phaseId);
              if (!phase) return null;
              const position = getGanttPosition(task);
              const assignee = teamMembers.find(m => m.userId === task.assigneeId);
              const priority = PRIORITIES.find(p => p.key === task.priority);
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                   {/* Task row */}
                   <div className="flex items-center gap-1.5 mb-0.5">
                     {/* Task label */}
                     <div className={cn("w-28 shrink-0 flex items-center gap-1", task.isSubTask && "pl-2")}>
                       {task.isSubTask ? (
                         <Package className={cn("h-2.5 w-2.5 shrink-0", task.templateItemCategory === 'labor' ? "text-blue-500" : "text-orange-500")} />
                       ) : (
                         <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priority?.color || 'bg-slate-400')} />
                       )}
                       <span className={cn(
                         "font-medium truncate text-foreground",
                         task.isSubTask ? "text-[10px] text-muted-foreground" : "text-[11px]"
                       )}>
                         {task.isSubTask && '↳ '}{task.name}
                       </span>
                     </div>
                     
                     {/* Gantt bar container */}
                     <div className={cn(
                       "flex-1 bg-slate-200/50 dark:bg-slate-800/50 rounded relative overflow-hidden",
                       task.isSubTask ? "h-5" : "h-6"
                     )}>
                      {/* Task bar */}
                       <motion.div
                         initial={{ scaleX: 0 }}
                         animate={{ scaleX: 1 }}
                         transition={{ delay: index * 0.1, duration: 0.4 }}
                         className={cn(
                           "absolute h-full rounded-lg flex items-center justify-between px-2 origin-left border-2",
                           task.isVerificationNode 
                             ? "border-purple-500 dark:border-purple-600 bg-purple-50/30 dark:bg-purple-950/20"
                             : task.isSubTask
                               ? task.templateItemCategory === 'labor'
                                 ? "border-blue-500 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/20"
                                 : "border-orange-500 dark:border-orange-600 bg-orange-50/30 dark:bg-orange-950/20"
                               : cn(
                                   "border-2",
                                   phase.id === 'demolition' && 'border-red-500 dark:border-red-600 bg-red-50/30 dark:bg-red-950/20',
                                   phase.id === 'preparation' && 'border-yellow-500 dark:border-yellow-600 bg-yellow-50/30 dark:bg-yellow-950/20',
                                   phase.id === 'installation' && 'border-blue-500 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/20',
                                   phase.id === 'finishing' && 'border-green-500 dark:border-green-600 bg-green-50/30 dark:bg-green-950/20'
                                 )
                         )}
                         style={{ left: position.left, width: position.width }}
                       >
                         {/* Verification node indicator */}
                         {task.isVerificationNode && (
                           <Camera className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                         )}
                         
                         {/* Sub-task cost (owner visibility) */}
                         {task.isSubTask && task.templateItemCost != null && task.templateItemCost > 0 && (
                           <span className="text-[9px] font-mono font-bold text-black dark:text-white truncate">
                             ${task.templateItemCost.toLocaleString()}
                           </span>
                         )}
                         
                         {/* Assignee avatar */}
                         {assignee && !task.isVerificationNode && (
                           <div className="h-4 w-4 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[8px] font-bold text-black dark:text-white">
                             {assignee.name.charAt(0).toUpperCase()}
                           </div>
                         )}
                       </motion.div>
                    </div>
                    
                     {/* Assignee label */}
                     <div className="w-16 shrink-0 text-[10px] text-muted-foreground truncate">
                       {assignee?.name || '-'}
                     </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-8 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">Legend</h4>
            <div className="grid grid-cols-2 gap-3">
              {PHASE_DEFINITIONS.filter(p => hasDemolition || p.id !== 'demolition').map(phase => (
                <div key={phase.id} className="flex items-center gap-2 text-xs">
                  <div className={cn("h-3 w-3 rounded", phase.color)} />
                  <span>{phase.name}</span>
                </div>
              ))}
               <div className="flex items-center gap-2 text-xs">
                 <div className="h-3 w-3 rounded bg-gradient-to-r from-purple-400 to-purple-500" />
                 <span>Verification Point</span>
               </div>
               <div className="flex items-center gap-2 text-xs">
                 <div className="h-3 w-3 rounded bg-gradient-to-r from-orange-400 to-orange-500" />
                 <span>Material (MAT)</span>
               </div>
               <div className="flex items-center gap-2 text-xs">
                 <div className="h-3 w-3 rounded bg-gradient-to-r from-blue-400 to-blue-500" />
                 <span>Labor (LAB)</span>
               </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-muted-foreground mb-2">Priority Levels</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map(priority => (
                  <div key={priority.key} className="flex items-center gap-1 text-xs">
                    <div className={cn("h-2 w-2 rounded-full", priority.color)} />
                    <span>{priority.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
