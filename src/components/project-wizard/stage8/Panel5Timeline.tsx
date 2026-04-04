// ============================================
// STAGE 8: Panel 5 — Execution Timeline
// Extracted from Stage8FinalReview.tsx
// ============================================

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Hammer,
  Package,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  Zap,
  Ruler,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import type { Citation } from "@/types/citation";
import type { TaskWithChecklist, TaskPhaseConfig } from "./types";
import { TASK_PHASES } from "./constants";

export interface Panel5Props {
  citations: Citation[];
  tasks: TaskWithChecklist[];
  userId: string;
  userRole: string;
  projectId: string;
  expandedPhases: Set<string>;
  teamMembers: { id: string; role: string; name: string; userId: string }[];
  isUploading: boolean;
  canEdit: boolean;
  canViewFinancials: boolean;
  canUploadTaskPhotos: boolean;
  canToggleTaskStatus: (assignedTo: string) => boolean;
  getCitationsForPanel: (dataKeys: string[]) => Citation[];
  renderCitationValue: (citation: Citation) => React.ReactNode;
  togglePhaseExpansion: (key: string) => void;
  updateTaskAssignee: (taskId: string, newAssignee: string) => void;
  updateChecklistItem: (taskId: string, checklistId: string, done: boolean) => void;
  onCitationsChange: (updatedCitations: Citation[]) => void;
  onTasksChange: (updater: (prev: TaskWithChecklist[]) => TaskWithChecklist[]) => void;
  onTaskCompletionDialog: (data: { open: boolean; taskId: string; taskTitle: string; showUploader: boolean }) => void;
}

export const Panel5Timeline = React.memo(({
  citations,
  tasks,
  userId,
  userRole,
  projectId,
  expandedPhases,
  teamMembers,
  isUploading,
  canEdit,
  canViewFinancials,
  canUploadTaskPhotos,
  canToggleTaskStatus,
  getCitationsForPanel,
  renderCitationValue,
  togglePhaseExpansion,
  updateTaskAssignee,
  updateChecklistItem,
  onCitationsChange,
  onTasksChange,
  onTaskCompletionDialog,
}: Panel5Props) => {
  const panelCitations = getCitationsForPanel(['TIMELINE', 'END_DATE', 'DNA_FINALIZED']);

  const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
  const hasDemolition = siteConditionCitation?.answer?.toLowerCase().includes('demolition')
    || siteConditionCitation?.metadata?.demolition_needed === true
    || (typeof siteConditionCitation?.value === 'string' && siteConditionCitation.value.toLowerCase().includes('demolition'));

  const baseTasks: TaskWithChecklist[] = (userRole === 'owner' || userRole === 'foreman')
    ? tasks
    : tasks.filter(t => t.assigned_to === userId);

  const activePhasesConfig = hasDemolition
    ? TASK_PHASES
    : TASK_PHASES.filter(p => p.key !== 'demolition');

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const tasksByPhase = activePhasesConfig.map(phase => ({
    ...phase,
    tasks: baseTasks
      .filter(t => t.phase === phase.key)
      .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)),
  }));

  const phaseBarColors: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
    demolition: { bg: 'bg-red-100 dark:bg-red-500/20', border: 'border-red-300 dark:border-red-500/40', text: 'text-red-600 dark:text-red-400', lightBg: 'from-red-50 to-rose-50' },
    preparation: { bg: 'bg-yellow-100 dark:bg-yellow-500/20', border: 'border-yellow-300 dark:border-yellow-500/40', text: 'text-yellow-500 dark:text-yellow-400', lightBg: 'from-yellow-50 to-amber-50' },
    installation: { bg: 'bg-blue-100 dark:bg-blue-500/20', border: 'border-blue-300 dark:border-blue-500/40', text: 'text-blue-600 dark:text-blue-400', lightBg: 'from-blue-50 to-sky-50' },
    finishing: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', border: 'border-emerald-300 dark:border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', lightBg: 'from-emerald-50 to-teal-50' },
  };

  const totalTasks = baseTasks.length;
  const completedTasks = baseTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getAssigneeName = (assigneeId: string) => {
    const member = teamMembers.find(m => m.userId === assigneeId);
    if (!member) return 'Unassigned';
    const roleLabel = member.role ? ` (${member.role.charAt(0).toUpperCase() + member.role.slice(1)})` : '';
    return `${member.name}${roleLabel}`;
  };
  const getAssigneeInitial = (assigneeId: string) => {
    const member = teamMembers.find(m => m.userId === assigneeId);
    return member?.name?.charAt(0)?.toUpperCase() || 'U';
  };

  const getTaskProgress = (task: TaskWithChecklist) => {
    if (task.status === 'completed' || task.status === 'done') return 100;
    if (task.status === 'in_progress') return 50;
    return 0;
  };

  const timelineCitation = citations.find(c => c.cite_type === 'TIMELINE');
  const endDateCitation = citations.find(c => c.cite_type === 'END_DATE');
  const extractDateMs = (citation: Citation | undefined, metaKey: string): number | null => {
    if (!citation) return null;
    const metaDate = citation.metadata?.[metaKey];
    if (metaDate && typeof metaDate === 'string') {
      const d = new Date(metaDate);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    if (citation.value && typeof citation.value === 'string') {
      const d = new Date(citation.value);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    if (citation.answer) {
      const d = new Date(citation.answer);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return null;
  };
  const projectStart = extractDateMs(timelineCitation, 'start_date');
  const projectEnd = extractDateMs(endDateCitation, 'end_date');
  const totalDuration = projectStart && projectEnd ? projectEnd - projectStart : null;

  const formatTaskDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try { return format(parseISO(dateStr), 'MMM d'); } catch { return null; }
  };

  const phaseImages: Record<string, { src: string; alt: string }> = {
    demolition: { src: 'https://images.unsplash.com/photo-1590274853856-f22d5ee3d228?w=800&h=400&fit=crop&q=80', alt: 'Demolition – structural teardown in progress' },
    preparation: { src: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=400&fit=crop&q=80', alt: 'Site preparation – excavation and grading' },
    installation: { src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop&q=80', alt: 'Installation – framing and systems rough-in' },
    finishing: { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=400&fit=crop&q=80', alt: 'Finishing – interior fit-out and detailing' },
  };

  const getTaskIcon = (title: string, isSubTask: boolean, size: number = 20) => {
    const t = title.toLowerCase();
    const cls = size >= 24 ? "h-6 w-6" : "h-5 w-5";
    if (t.includes('photo') || t.includes('image') || t.includes('clear')) return <Camera className={cls} />;
    if (t.includes('floor') || t.includes('hardwood') || t.includes('tile')) return <Ruler className={cls} />;
    if (t.includes('electric') || t.includes('wiring')) return <Zap className={cls} />;
    if (t.includes('paint') || t.includes('finish') || t.includes('polish') || t.includes('sand')) return <Briefcase className={cls} />;
    if (t.includes('inspect') || t.includes('check') || t.includes('verify') || t.includes('qc')) return <ShieldCheck className={cls} />;
    if (t.includes('material') || t.includes('delivery') || t.includes('order')) return <Package className={cls} />;
    if (t.includes('demo') || t.includes('remov') || t.includes('tear')) return <Trash2 className={cls} />;
    if (t.includes('prep') || t.includes('clean') || t.includes('clear')) return <ClipboardList className={cls} />;
    if (t.includes('install') || t.includes('mount') || t.includes('set')) return <Settings className={cls} />;
    if (isSubTask) return <Package className={cls} />;
    return <Hammer className={cls} />;
  };

  const getStatusColor = (task: TaskWithChecklist) => {
    const isDone = task.status === 'completed' || task.status === 'done';
    const isInProgress = task.status === 'in_progress' || task.status === 'in-progress';
    const isOrdered = task.status === 'ordered';
    if (isDone) return { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', label: 'Done' };
    if (isInProgress) return { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', label: 'In Progress' };
    if (isOrdered) return { bar: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400', label: 'Ordered' };
    if (task.due_date) {
      const due = new Date(task.due_date).getTime();
      if (due < Date.now()) return { bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400', label: 'Delayed' };
    }
    return { bar: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400', label: 'Scheduled' };
  };

  const getTaskDays = (task: TaskWithChecklist) => {
    if (!task.due_date) return null;
    const now = Date.now();
    const due = new Date(task.due_date).getTime();
    const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}D`;
    if (days === 0) return 'Today';
    return `${Math.abs(days)}D late`;
  };

  const handleStartDateChange = async (newDate: string) => {
    if (!newDate) return;
    const existingIdx = citations.findIndex(c => c.cite_type === 'TIMELINE');
    let updatedCitations: Citation[];
    if (existingIdx >= 0) {
      updatedCitations = citations.map((c, i) => i === existingIdx ? { ...c, answer: newDate, value: 'scheduled', metadata: { ...c.metadata, start_date: newDate, source: 'user_input' }, timestamp: new Date().toISOString() } : c);
    } else {
      const newCit: Citation = { id: `cite_timeline_${Date.now()}`, cite_type: 'TIMELINE', question_key: 'timeline', answer: newDate, value: 'scheduled', timestamp: new Date().toISOString(), metadata: { start_date: newDate, source: 'user_input' } };
      updatedCitations = [...citations, newCit];
    }
    onCitationsChange(updatedCitations);
    try { await supabase.from('project_summaries').update({ verified_facts: updatedCitations as any, project_start_date: newDate }).eq('project_id', projectId); toast.success('Start date saved'); } catch { toast.error('Failed to save start date'); }
  };

  const handleEndDateChange = async (newDate: string) => {
    if (!newDate) return;
    const existingIdx = citations.findIndex(c => c.cite_type === 'END_DATE');
    let updatedCitations: Citation[];
    if (existingIdx >= 0) {
      updatedCitations = citations.map((c, i) => i === existingIdx ? { ...c, answer: newDate, value: newDate, metadata: { ...c.metadata, end_date: newDate, source: 'user_input' }, timestamp: new Date().toISOString() } : c);
    } else {
      const newCit: Citation = { id: `cite_end_date_${Date.now()}`, cite_type: 'END_DATE', question_key: 'end_date', answer: newDate, value: newDate, timestamp: new Date().toISOString(), metadata: { end_date: newDate, source: 'user_input' } };
      updatedCitations = [...citations, newCit];
    }
    onCitationsChange(updatedCitations);
    try { await supabase.from('project_summaries').update({ verified_facts: updatedCitations as any, project_end_date: newDate }).eq('project_id', projectId); toast.success('End date saved'); } catch { toast.error('Failed to save end date'); }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (error) throw error;
      onTasksChange(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      if (newStatus === 'pending') {
        toast.info('Task reverted to Pending');
      } else {
        toast.success(`Task updated`);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const phaseGradients: Record<string, string> = {
    demolition: 'from-red-600 via-red-500 to-orange-500',
    preparation: 'from-yellow-500 via-amber-500 to-orange-500',
    installation: 'from-blue-500 via-cyan-500 to-teal-500',
    finishing: 'from-emerald-500 via-green-500 to-teal-500',
  };
  const phaseHeaderGradients: Record<string, string> = {
    demolition: 'from-red-500/15 via-orange-500/10 to-transparent',
    preparation: 'from-yellow-500/15 via-amber-500/10 to-transparent',
    installation: 'from-blue-500/15 via-cyan-500/10 to-transparent',
    finishing: 'from-emerald-500/15 via-green-500/10 to-transparent',
  };
  const phaseBgColors: Record<string, string> = {
    demolition: 'border-red-300 dark:border-red-500/30',
    preparation: 'border-yellow-300 dark:border-yellow-500/30',
    installation: 'border-blue-300 dark:border-blue-500/30',
    finishing: 'border-emerald-300 dark:border-emerald-500/30',
  };

  const getStartDateValue = () => {
    const tc = panelCitations.find(c => c.cite_type === 'TIMELINE');
    if (!tc) return '';
    const metaStart = tc.metadata?.start_date;
    if (metaStart && typeof metaStart === 'string') { try { return new Date(metaStart).toISOString().split('T')[0]; } catch { /* noop */ } }
    try { const d = new Date(tc.answer); if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]; } catch { /* noop */ }
    return '';
  };

  const getEndDateValue = () => {
    const ec = panelCitations.find(c => c.cite_type === 'END_DATE');
    if (!ec) return '';
    const metaEnd = ec.metadata?.end_date;
    if (metaEnd && typeof metaEnd === 'string') { try { return new Date(metaEnd).toISOString().split('T')[0]; } catch { /* noop */ } }
    if (ec.value && typeof ec.value === 'string') { try { const d = new Date(ec.value); if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]; } catch { /* noop */ } }
    try { const d = new Date(ec.answer); if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]; } catch { /* noop */ }
    return '';
  };

  return (
    <div className="space-y-5">
      {/* ─── Compact Timeline Header ─── */}
      <div className="relative rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-slate-50 via-indigo-50/80 to-violet-50 dark:from-[#0c1222] dark:via-indigo-950/40 dark:to-violet-950/30 p-2.5 sm:p-3 overflow-hidden">
        <div className="relative flex flex-col gap-2.5">
          {/* Row 1: Progress circle + title + stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0">
              <svg className="h-10 w-10 sm:h-11 sm:w-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-100 dark:text-indigo-900/50" />
                <motion.circle cx="22" cy="22" r="18" fill="none" strokeWidth="3" strokeLinecap="round" className="text-indigo-500 dark:text-indigo-400" stroke="currentColor" strokeDasharray={`${2 * Math.PI * 18}`} initial={{ strokeDashoffset: 2 * Math.PI * 18 }} animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - progressPct / 100) }} transition={{ duration: 1.2, ease: 'easeOut' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-gray-800 dark:text-white leading-none">{progressPct}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Execution Timeline</h3>
              <p className="text-[11px] text-gray-600 dark:text-amber-300">{completedTasks}/{totalTasks} tasks done</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {[
                { label: 'Done', value: completedTasks, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Left', value: totalTasks - completedTasks, color: 'text-amber-600 dark:text-amber-400' },
              ].map(s => (
                <div key={s.label} className="text-center px-2 py-1 rounded-lg bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <span className={cn("text-sm font-black block leading-none", s.color)}>{s.value}</span>
                  <span className="text-[7px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Row 2: Date pickers + legend */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-500/10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30">
                <span className="text-[8px] text-indigo-500 dark:text-indigo-400 uppercase font-mono font-bold">Start</span>
                <input
                  type="date"
                  className="text-[11px] font-semibold text-gray-700 dark:text-indigo-200 bg-transparent border-none outline-none cursor-pointer w-[95px] sm:w-[100px]"
                  value={getStartDateValue()}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>
              <span className="text-gray-300 dark:text-indigo-500 text-xs">→</span>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30">
                <span className="text-[8px] text-indigo-500 dark:text-indigo-400 uppercase font-mono font-bold">End</span>
                <input
                  type="date"
                  className="text-[11px] font-semibold text-gray-700 dark:text-indigo-200 bg-transparent border-none outline-none cursor-pointer w-[95px] sm:w-[100px]"
                  value={getEndDateValue()}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                />
              </div>
            </div>
            {/* Duration / Days Remaining — safe from NaN */}
            {(() => {
              const startVal = getStartDateValue();
              const endVal = getEndDateValue();
              if (startVal && endVal) {
                const startMs = new Date(startVal).getTime();
                const endMs = new Date(endVal).getTime();
                if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
                  const totalDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
                  const daysRemaining = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div className="flex items-center gap-2 text-[9px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold">{totalDays}D total</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded font-bold",
                        daysRemaining > 0
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300"
                          : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300"
                      )}>
                        {daysRemaining > 0 ? `${daysRemaining}D left` : daysRemaining === 0 ? 'Due today' : `${Math.abs(daysRemaining)}D over`}
                      </span>
                    </div>
                  );
                }
              }
              return (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 font-bold">
                  Set Dates ↑
                </span>
              );
            })()}
            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              {[
                { label: 'Sched', color: 'bg-yellow-500' },
                { label: 'Active', color: 'bg-amber-500' },
                { label: 'Done', color: 'bg-emerald-500' },
                { label: 'Late', color: 'bg-red-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1">
                  <div className={cn("h-2 w-3 sm:w-4 rounded-sm", s.color)} />
                  <span className="text-[8px] sm:text-[9px] font-medium text-gray-500 dark:text-amber-200/80">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Site Condition Badge */}
      {siteConditionCitation && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300 dark:border-amber-500/30">
          <Hammer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-gray-800 dark:text-amber-200">{siteConditionCitation.answer}</span>
          {hasDemolition && (
            <Badge className="text-[9px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30">Demolition</Badge>
          )}
        </div>
      )}

      {/* ─── Phase Timeline Cards ─── */}
      <div className="space-y-4">
        {tasksByPhase.map((phase, phaseIdx) => {
          if (phase.tasks.length === 0 && !expandedPhases.has(phase.key)) return null;
          const colors = phaseBarColors[phase.key] || phaseBarColors.preparation;
          const phaseComplete = phase.tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
          const phaseProgressPct = phase.tasks.length > 0
            ? Math.round((phaseComplete / phase.tasks.length) * 100) : 0;
          const phaseCostTotal = phase.tasks
            .filter(t => t.isSubTask && t.templateItemCost)
            .reduce((sum, t) => sum + (t.templateItemCost || 0), 0);
          const phaseImg = phaseImages[phase.key];
          const phaseGradient = phaseGradients[phase.key] || phaseGradients.preparation;

          return (
            <motion.div
              key={phase.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: phaseIdx * 0.08 }}
              className={cn(
                "rounded-xl border overflow-hidden",
                "bg-white dark:bg-[#111827]/90 backdrop-blur-sm",
                phaseBgColors[phase.key] || phaseBgColors.preparation,
              )}
            >
              {/* Phase Header */}
              <button onClick={() => togglePhaseExpansion(phase.key)} className="w-full text-left group">
                <div className={cn("h-2.5 bg-gradient-to-r", phaseGradient)} />
                <div className={cn("p-3 sm:p-4 bg-gradient-to-r", phaseHeaderGradients[phase.key] || phaseHeaderGradients.preparation)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={cn("h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md", phaseGradient)}>
                        <span className="text-base font-black text-white">{phaseIdx + 1}</span>
                      </div>
                      <div>
                        <span className={cn("text-sm font-bold uppercase tracking-wide", colors.text)}>{phase.label}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-gray-600 dark:text-amber-300">{phaseComplete}/{phase.tasks.length} tasks</span>
                          {canViewFinancials && phaseCostTotal > 0 && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                              ${phaseCostTotal.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-gray-700 dark:text-amber-200">{phaseProgressPct}%</span>
                      {expandedPhases.has(phase.key) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:text-amber-400 dark:group-hover:text-amber-300 transition-colors" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:text-amber-400 dark:group-hover:text-amber-300 transition-colors" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3 relative h-5 rounded-full bg-gray-100 dark:bg-slate-800/60 overflow-hidden shadow-inner">
                    <motion.div
                      className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-lg", phaseGradient)}
                      initial={{ width: 0 }}
                      animate={{ width: `${phaseProgressPct}%` }}
                      transition={{ duration: 1, delay: phaseIdx * 0.1 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                    {phaseProgressPct > 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white drop-shadow-sm">{phaseProgressPct}%</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedPhases.has(phase.key) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {phaseImg && (
                      <div className="mx-4 mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
                        <img src={phaseImg.src} alt={phaseImg.alt} className="w-full h-32 object-cover" loading="lazy" />
                        <div className="bg-gray-50 dark:bg-slate-900/50 px-3 py-1.5">
                          <span className="text-[10px] text-gray-500 dark:text-amber-300/70 italic">{phaseImg.alt}</span>
                        </div>
                      </div>
                    )}

                    <div className="px-3 pb-4 space-y-2">
                      {phase.tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-amber-300 italic py-3 text-center">No tasks in this phase</p>
                      ) : (
                        phase.tasks.map((task, taskIdx) => {
                          const taskProgress = getTaskProgress(task);
                          const isCompleted = task.status === 'completed' || task.status === 'done';
                          const statusColor = getStatusColor(task);
                          const daysLabel = getTaskDays(task);

                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: taskIdx * 0.03 }}
                              className={cn(
                                "rounded-lg border overflow-hidden transition-all",
                                "bg-white dark:bg-[#0f1729]/80",
                                "border-gray-200 dark:border-white/[0.08]",
                                "hover:shadow-md dark:hover:shadow-lg",
                                isCompleted && "opacity-75"
                              )}
                            >
                              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3">
                                <Checkbox
                                  checked={isCompleted}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      onTaskCompletionDialog({
                                        open: true,
                                        taskId: task.id,
                                        taskTitle: task.title,
                                        showUploader: false,
                                      });
                                    } else {
                                      handleTaskStatusChange(task.id, 'pending');
                                    }
                                  }}
                                  disabled={!canToggleTaskStatus(task.assigned_to)}
                                  className={cn("h-5 w-5 sm:h-6 sm:w-6 shrink-0 rounded-md border-2 transition-all", isCompleted ? "border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "border-gray-300 dark:border-gray-600")}
                                />

                                <div className={cn(
                                  "shrink-0 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-shadow",
                                  isCompleted ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.3)]" :
                                  task.priority === 'high' ? "text-red-500 bg-red-50 dark:bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.35)]" :
                                  task.priority === 'medium' ? "text-amber-500 bg-amber-50 dark:bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.35)]" :
                                  "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                                )}>
                                  {getTaskIcon(task.title, task.isSubTask || false, 24)}
                                </div>

                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => togglePhaseExpansion(`task-${task.id}`)}>
                                  <div className="flex items-center gap-2">
                                    {task.isSubTask && <span className="text-xs text-indigo-400 dark:text-amber-400 font-bold">↳</span>}
                                    <span className={cn(
                                      "text-sm sm:text-base font-semibold truncate leading-snug",
                                      isCompleted ? "line-through text-gray-400 dark:text-slate-500" : "text-gray-900 dark:text-gray-100"
                                    )}>
                                      {task.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex-1 h-3 sm:h-3.5 rounded-full bg-gray-100 dark:bg-slate-800/60 overflow-hidden shadow-inner">
                                      <motion.div
                                        className={cn("h-full rounded-full shadow-sm", statusColor.bar)}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${taskProgress}%` }}
                                        transition={{ duration: 0.6, delay: taskIdx * 0.03 }}
                                      />
                                    </div>
                                    <span className={cn("text-xs sm:text-sm font-bold min-w-[28px] sm:min-w-[36px] text-right", statusColor.text)}>{taskProgress}%</span>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                                  <div className="flex items-center gap-1.5">
                                    {daysLabel && (
                                      <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-md",
                                        daysLabel.includes('late') ? "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400" :
                                        daysLabel === 'Today' ? "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                                        "bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-amber-300"
                                      )}>
                                        {daysLabel}
                                      </span>
                                    )}
                                    {canViewFinancials && task.isSubTask && task.templateItemCost != null && task.templateItemCost > 0 && (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                                        ${task.templateItemCost.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className={cn(
                                      "h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black border-2 transition-shadow",
                                      task.priority === 'high' ? "bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                      task.priority === 'medium' ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                      "bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    )}>
                                      {task.priority === 'high' ? '!' : task.priority === 'medium' ? '~' : '✓'}
                                    </div>
                                    {task.checklist.some(c => c.id.endsWith('-verify') && c.done) && (
                                      <Camera className="h-3.5 w-3.5 text-emerald-500" />
                                    )}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-sm",
                                            isCompleted
                                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                              : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20"
                                          )}>
                                            {getAssigneeInitial(task.assigned_to)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">
                                          {getAssigneeName(task.assigned_to)}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded task details */}
                              <AnimatePresence>
                                {expandedPhases.has(`task-${task.id}`) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-slate-900/40 px-4 py-3 space-y-2.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-500 dark:text-amber-400" />
                                      <Select
                                        value={task.assigned_to}
                                        onValueChange={(value) => updateTaskAssignee(task.id, value)}
                                        disabled={!canEdit}
                                      >
                                        <SelectTrigger className="h-7 text-xs w-44 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                                          <SelectValue placeholder="Assign..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                          {teamMembers.map(member => (
                                            <SelectItem key={member.userId} value={member.userId} className="text-xs">
                                              {member.name} ({member.role})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {canToggleTaskStatus(task.assigned_to) && !isCompleted && (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] text-gray-500 dark:text-amber-300 font-medium">Status:</span>
                                        {[
                                          { value: 'ordered', label: '📦 Ordered', color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30' },
                                          { value: 'in_progress', label: '🔨 In Progress', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
                                        ].map(opt => (
                                          <button
                                            key={opt.value}
                                            onClick={() => handleTaskStatusChange(task.id, opt.value)}
                                            className={cn(
                                              "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                                              task.status === opt.value
                                                ? cn(opt.color, "ring-1 ring-offset-1 ring-offset-background")
                                                : "bg-gray-50 dark:bg-muted/50 text-gray-600 dark:text-amber-200 border-gray-200 dark:border-border hover:bg-gray-100 dark:hover:bg-muted"
                                            )}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                        {task.status !== 'pending' && (
                                          <button
                                            onClick={() => handleTaskStatusChange(task.id, 'pending')}
                                            className="text-[10px] text-gray-500 dark:text-amber-300 hover:text-gray-700 dark:hover:text-amber-100 px-2 py-1 rounded border border-transparent hover:border-gray-200 dark:hover:border-amber-500/20 transition-all"
                                          >
                                            ↩ Reset
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {(() => {
                                      const photoCitation = citations.find(c =>
                                        (c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION') && c.metadata?.taskId === task.id
                                      );
                                      return photoCitation ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>✓ Photo verified</span>
                                          </div>
                                          <div className="ml-5 text-[10px] text-gray-500 dark:text-amber-300/80 space-y-0.5">
                                            {photoCitation.metadata?.uploadedBy && (
                                              <p>By: {String(photoCitation.metadata.uploadedBy)}{photoCitation.metadata?.uploadedByRole ? ` (${String(photoCitation.metadata.uploadedByRole)})` : ''}</p>
                                            )}
                                            {photoCitation.metadata?.fileName && (
                                              <p className="truncate max-w-[200px]">📎 {String(photoCitation.metadata.fileName)}</p>
                                            )}
                                            {photoCitation.timestamp && (
                                              <p>🕐 {format(new Date(photoCitation.timestamp), 'MMM dd, HH:mm')}</p>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                          <AlertTriangle className="h-4 w-4" />
                                          <span>No verification photo</span>
                                        </div>
                                      );
                                    })()}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Priority Legend */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-amber-500/15">
        <span className="text-[10px] text-gray-600 dark:text-amber-400 uppercase tracking-wider font-bold">Priority:</span>
        {[
          { key: 'high', label: 'High', color: 'bg-red-500' },
          { key: 'medium', label: 'Medium', color: 'bg-amber-500' },
          { key: 'low', label: 'Low', color: 'bg-emerald-500' },
        ].map(p => (
          <div key={p.key} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
            <span className="text-[10px] text-gray-600 dark:text-amber-200 font-medium">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
Panel5Timeline.displayName = 'Panel5Timeline';
