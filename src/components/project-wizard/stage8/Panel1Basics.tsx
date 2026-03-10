// ============================================
// PANEL 1: Project Basics (Card + Fullscreen)
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Ruler, Hammer, Users, Calendar, Lock,
  Building2, CheckCircle2, ChevronDown, ChevronRight,
  Settings, ClipboardList, DollarSign, FileImage, AlertTriangle,
} from "lucide-react";
import type { Citation } from "@/types/citation";

// ============================================
// PROPS
// ============================================
export interface Panel1Props {
  mode: 'card' | 'fullscreen';
  citations: Citation[];
  projectData: { name?: string; address?: string; status?: string; trade?: string | null } | null;
  teamMembers: { id: string; role: string; name: string }[];
  collapsedPanels: Set<string>;
  setCollapsedPanels: React.Dispatch<React.SetStateAction<Set<string>>>;
  renderCitationValue: (citation: Citation) => React.ReactNode;
}

// ============================================
// COMPONENT
// ============================================
export const Panel1Basics: React.FC<Panel1Props> = ({
  mode,
  citations,
  projectData,
  teamMembers,
  collapsedPanels,
  setCollapsedPanels,
  renderCitationValue,
}) => {
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

  // ═══ Fullscreen View ═══
  if (mode === 'fullscreen') {
    const panelCitations = citations.filter(c =>
      ['PROJECT_NAME', 'LOCATION', 'WORK_TYPE', 'GFA_LOCK', 'TRADE_SELECTION', 'TEAM_SIZE', 'TEAM_STRUCTURE', 'TIMELINE', 'END_DATE', 'SITE_CONDITION', 'TEMPLATE_LOCK', 'DEMOLITION_PRICE', 'EXECUTION_MODE'].includes(c.cite_type || '')
    );

    return (
      <div className="space-y-4">
        {/* Project Identity Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.05), rgba(15,23,42,0.95))',
            border: '2px solid rgba(6,182,212,0.25)',
            boxShadow: '0 16px 40px -8px rgba(6,182,212,0.15)',
          }}
        >
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)' }} />

          <div className="relative z-10">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 mb-2">Project Identity</p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-1">
              {nameCit?.answer || projectData?.name || '—'}
            </h2>
            {nameCit && <p className="text-[10px] text-cyan-400/60 font-mono">cite: [{nameCit.id.slice(0, 12)}]</p>}

            {locCit && (
              <div className="flex items-center gap-2 mt-3">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-slate-300">{locCit.answer}</span>
                <span className="text-[9px] text-cyan-400/50 font-mono">cite: [{locCit.id.slice(0, 8)}]</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Completion Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-6 p-5 rounded-xl"
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(6,182,212,0.1)' }}
        >
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="5" />
              <motion.circle cx="40" cy="40" r="34" fill="none" stroke="url(#fsGrad)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - completionPct / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="fsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black text-cyan-200">{completionPct}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-mono text-cyan-300 uppercase tracking-wider mb-2">Data Integrity</p>
            <div className="flex flex-wrap gap-1.5">
              {allItems.map(item => (
                <span key={item.key} className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium border",
                  item.cit ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" : "border-slate-600/30 bg-slate-800/40 text-slate-500"
                )}>
                  {item.icon} {item.key} {item.cit && <CheckCircle2 className="inline h-2.5 w-2.5 ml-0.5" />}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allItems.filter(i => i.cit).map((item, idx) => (
            <motion.div key={item.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="p-4 rounded-xl"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(6,182,212,0.1)' }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">{item.key}</p>
              <p className="text-sm font-semibold text-white">{renderCitationValue(item.cit!)}</p>
              <p className="text-[8px] text-cyan-400/50 font-mono mt-1">cite: [{item.cit!.id.slice(0, 8)}]</p>
            </motion.div>
          ))}
        </div>

        {/* All Citations */}
        {citations.length > 0 && (
          <div className="pt-3 border-t border-slate-700/20">
            <button
              onClick={() => setCollapsedPanels(prev => {
                const next = new Set(prev);
                const key = 'citations-fullscreen-panel-1-basics';
                next.has(key) ? next.delete(key) : next.add(key);
                return next;
              })}
              className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
            >
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">All Citations ({citations.filter(c => c.cite_type && c.answer).length})</p>
              {collapsedPanels.has('citations-fullscreen-panel-1-basics') ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
            </button>
            <AnimatePresence>
              {!collapsedPanels.has('citations-fullscreen-panel-1-basics') && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                  {citations.filter(c => c.cite_type && c.answer).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-700/20" style={{ background: 'rgba(15,23,42,0.4)' }}>
                      <span className="text-xs text-slate-400">{c.cite_type?.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-300">{renderCitationValue(c)}</span>
                        <span className="text-[9px] text-amber-400/70 font-mono">cite: [{c.id.slice(0, 6)}]</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // ═══ Card View ═══
  const renderDataCard = (
    label: string, cit: Citation | undefined, fallback: string, icon: React.ReactNode,
    colorScheme: { border: string; bg: string; text: string; label: string; cite: string; glow: string; glowColor?: string },
    delay: number, badge?: React.ReactNode,
  ) => (
    <motion.div key={label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 120 }}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className={cn("group relative rounded-xl border p-3.5 transition-all overflow-hidden backdrop-blur-xl",
        cit ? `${colorScheme.border} ${colorScheme.bg}` : "border-gray-300/30 bg-gray-100/40 dark:border-slate-700/20 dark:bg-slate-900/30"
      )}
    >
      {cit && (
        <>
          <div className={cn("absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity", colorScheme.glowColor || 'bg-cyan-400')} />
          <div className={cn("absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none", colorScheme.glowColor || 'bg-cyan-400')} />
        </>
      )}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      <div className="relative z-10 flex items-center gap-3">
        <motion.div
          animate={cit ? { boxShadow: ['0 0 8px rgba(255,255,255,0.1)', '0 0 16px rgba(255,255,255,0.2)', '0 0 8px rgba(255,255,255,0.1)'] } : {}}
          transition={{ duration: 3, repeat: Infinity }}
          className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg border",
            cit ? "bg-white/70 dark:bg-white/5 border-white/20 dark:border-white/10 shadow-lg" : "bg-gray-200/50 dark:bg-slate-800/50 border-transparent"
          )}
        >
          {icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[10px] font-mono uppercase tracking-[0.15em] mb-0.5 font-semibold", cit ? colorScheme.label : "text-gray-500 dark:text-slate-400")}>{label}</p>
          <p className={cn("text-sm font-bold truncate", cit ? colorScheme.text : "text-gray-500 dark:text-slate-400 italic")}>
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
          {cit && <p className={cn("text-[9px] font-mono mt-0.5 opacity-80", colorScheme.cite)}>cite: [{cit.id.slice(0, 12)}]</p>}
        </div>
        {badge}
        {cit && !badge && (
          <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.5, repeat: Infinity }}
            className={cn("w-2.5 h-2.5 rounded-full", colorScheme.glow)} />
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-2.5">
      {/* Hero Project Identity Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, type: 'spring' }}
        className="relative overflow-hidden rounded-2xl border border-cyan-300/60 dark:border-cyan-500/30 p-5"
        style={{ background: 'linear-gradient(135deg, rgba(236,254,255,0.9) 0%, rgba(224,242,254,0.8) 50%, rgba(219,234,254,0.9) 100%)' }}
      >
        <div className="hidden dark:block absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,47,73,0.6) 0%, rgba(15,23,42,0.8) 40%, rgba(30,27,75,0.5) 100%)' }} />
        <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-cyan-300/30 dark:bg-cyan-400/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-blue-300/20 dark:bg-indigo-500/6 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 rounded-full bg-cyan-200/15 dark:bg-cyan-400/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-400/40 dark:via-cyan-400/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-300/20 dark:via-blue-400/10 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-200 font-semibold mb-1.5">Project Identity</p>
              <h2 className="text-xl font-extrabold text-gray-950 dark:text-white leading-tight tracking-tight">
                {nameCit?.answer || projectData?.name || '—'}
              </h2>
              {nameCit && <p className="text-[9px] text-cyan-600/80 dark:text-cyan-300/60 font-mono mt-1">cite: [{nameCit.id.slice(0, 12)}]</p>}
            </div>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="relative w-14 h-14 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border border-cyan-300/40 dark:border-cyan-500/20" />
              <motion.div animate={{ rotate: [0, -360] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} className="absolute inset-1 rounded-full border border-dashed border-cyan-400/30 dark:border-cyan-400/15" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 3, repeat: Infinity }}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-500/15 dark:to-blue-500/10 flex items-center justify-center shadow-lg shadow-cyan-500/20 dark:shadow-cyan-500/10">
                  <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Data Integrity Orb */}
          <div className="flex items-center gap-4">
            <div className="relative w-[72px] h-[72px] flex-shrink-0">
              <motion.div animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}
                className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 dark:from-cyan-400/10 dark:to-blue-400/10 blur-md" />
              <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90 relative z-10">
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(6,182,212,0.1)" strokeWidth="4.5" />
                <motion.circle cx="36" cy="36" r="30" fill="none" stroke="url(#luxuryCyanGold)" strokeWidth="4.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - completionPct / 100) }}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }} />
                {completionPct === 100 && (
                  <motion.circle cx="36" cy="6" r="2" fill="#06b6d4" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                )}
                <defs>
                  <linearGradient id="luxuryCyanGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <motion.span animate={completionPct === 100 ? { textShadow: ['0 0 8px rgba(6,182,212,0.3)', '0 0 16px rgba(6,182,212,0.5)', '0 0 8px rgba(6,182,212,0.3)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }} className="text-base font-extrabold text-cyan-800 dark:text-cyan-200">
                  {completionPct}%
                </motion.span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 uppercase tracking-[0.15em] font-semibold">Data Integrity ({filled}/{allItems.length})</p>
              <div className="flex flex-wrap gap-1">
                {allItems.map((item, idx) => (
                  <motion.span key={item.key} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + idx * 0.05 }}
                    className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold transition-all",
                      item.cit ? "border-cyan-400/50 bg-cyan-100/60 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 shadow-sm shadow-cyan-500/10"
                        : "border-gray-300/50 bg-gray-100/50 dark:border-slate-600/30 dark:bg-slate-800/40 text-gray-500 dark:text-slate-400"
                    )}>
                    <span className="text-[8px]">{item.icon}</span>
                    {item.key}
                    {item.cit && <CheckCircle2 className="h-2 w-2 text-cyan-500 dark:text-cyan-400 ml-0.5" />}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data Cards */}
      {renderDataCard('Project Location', locCit, projectData?.address || 'Not set',
        <MapPin className={cn("h-5 w-5", locCit ? "text-cyan-600 dark:text-cyan-400" : "text-gray-400")} />,
        { border: 'border-cyan-300/50 dark:border-cyan-500/25', bg: 'bg-gradient-to-br from-cyan-50/80 via-sky-50/60 to-blue-50/80 dark:from-cyan-950/40 dark:via-slate-900/60 dark:to-blue-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-cyan-50', label: 'text-cyan-700 dark:text-cyan-300', cite: 'text-cyan-600 dark:text-cyan-400', glow: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]', glowColor: 'bg-cyan-400' }, 0.1
      )}
      {renderDataCard('Work Type', workCit, 'Not selected',
        workCit ? <span className="text-xl">{getWorkTypeIcon()}</span> : <Hammer className="h-5 w-5 text-gray-400" />,
        { border: 'border-emerald-300/50 dark:border-emerald-500/25', bg: 'bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-teal-50/80 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-teal-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-emerald-50', label: 'text-emerald-700 dark:text-emerald-300', cite: 'text-emerald-600 dark:text-emerald-400', glow: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]', glowColor: 'bg-emerald-400' }, 0.15,
        workCit ? <Badge className="text-[9px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/20">Verified</Badge> : undefined
      )}
      {renderDataCard('Gross Floor Area', gfaCit, 'Not locked',
        <Ruler className={cn("h-5 w-5", gfaCit ? "text-sky-600 dark:text-blue-400" : "text-gray-400")} />,
        { border: 'border-sky-300/50 dark:border-blue-500/25', bg: 'bg-gradient-to-br from-sky-50/80 via-blue-50/60 to-indigo-50/80 dark:from-blue-950/40 dark:via-slate-900/60 dark:to-indigo-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-blue-50', label: 'text-sky-700 dark:text-blue-300', cite: 'text-sky-600 dark:text-blue-400', glow: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]', glowColor: 'bg-sky-400' }, 0.2,
        gfaCit ? <Badge className="text-[9px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 gap-1 shadow-sm shadow-amber-500/20"><Lock className="h-2.5 w-2.5" />LOCKED</Badge> : undefined
      )}
      {renderDataCard('Trade Selection', tradeCit, 'Not selected',
        <Hammer className={cn("h-5 w-5", tradeCit ? "text-orange-600 dark:text-orange-400" : "text-gray-400")} />,
        { border: 'border-orange-300/50 dark:border-orange-500/25', bg: 'bg-gradient-to-br from-orange-50/80 via-amber-50/60 to-yellow-50/80 dark:from-orange-950/40 dark:via-slate-900/60 dark:to-amber-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-orange-50', label: 'text-orange-700 dark:text-orange-300', cite: 'text-orange-600 dark:text-orange-400', glow: 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]', glowColor: 'bg-orange-400' }, 0.25
      )}
      {renderDataCard('Team', teamCit, `${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`,
        <Users className={cn("h-5 w-5", teamCit ? "text-teal-600 dark:text-teal-400" : "text-gray-400")} />,
        { border: 'border-teal-300/50 dark:border-teal-500/25', bg: 'bg-gradient-to-br from-teal-50/80 via-cyan-50/60 to-emerald-50/80 dark:from-teal-950/40 dark:via-slate-900/60 dark:to-emerald-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-teal-50', label: 'text-teal-700 dark:text-teal-300', cite: 'text-teal-600 dark:text-teal-400', glow: 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.6)]', glowColor: 'bg-teal-400' }, 0.3
      )}
      {renderDataCard('Start Date', timelineCit, 'Not set',
        <Calendar className={cn("h-5 w-5", timelineCit ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400")} />,
        { border: 'border-indigo-300/50 dark:border-indigo-500/25', bg: 'bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-sky-50/80 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-blue-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-indigo-50', label: 'text-indigo-700 dark:text-indigo-300', cite: 'text-indigo-600 dark:text-indigo-400', glow: 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.6)]', glowColor: 'bg-indigo-400' }, 0.35
      )}
      {renderDataCard('End Date', endDateCit, 'Not set',
        <span className="text-lg">🏁</span>,
        { border: 'border-violet-300/50 dark:border-violet-500/25', bg: 'bg-gradient-to-br from-violet-50/80 via-indigo-50/60 to-blue-50/80 dark:from-violet-950/40 dark:via-slate-900/60 dark:to-indigo-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-violet-50', label: 'text-violet-700 dark:text-violet-300', cite: 'text-violet-600 dark:text-violet-400', glow: 'bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.6)]', glowColor: 'bg-violet-400' }, 0.4
      )}
      {siteCit && renderDataCard('Site Condition', siteCit, '',
        <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
        { border: 'border-amber-300/50 dark:border-amber-500/25', bg: 'bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/80 dark:from-amber-950/40 dark:via-slate-900/60 dark:to-yellow-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-amber-50', label: 'text-amber-700 dark:text-amber-300', cite: 'text-amber-600 dark:text-amber-400', glow: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]', glowColor: 'bg-amber-400' }, 0.45
      )}
      {templateCit && renderDataCard('Template', templateCit, '',
        <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
        { border: 'border-sky-300/50 dark:border-sky-500/25', bg: 'bg-gradient-to-br from-sky-50/80 via-cyan-50/60 to-blue-50/80 dark:from-sky-950/40 dark:via-slate-900/60 dark:to-cyan-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-sky-50', label: 'text-sky-700 dark:text-sky-300', cite: 'text-sky-600 dark:text-sky-400', glow: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]', glowColor: 'bg-sky-400' }, 0.5
      )}
      {demoCit && renderDataCard('Demolition Price', demoCit, '',
        <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />,
        { border: 'border-red-300/50 dark:border-red-500/25', bg: 'bg-gradient-to-br from-red-50/80 via-orange-50/60 to-amber-50/80 dark:from-red-950/40 dark:via-slate-900/60 dark:to-orange-950/30 backdrop-blur-xl', text: 'text-gray-900 dark:text-red-50', label: 'text-red-700 dark:text-red-300', cite: 'text-red-600 dark:text-red-400', glow: 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]', glowColor: 'bg-red-400' }, 0.55
      )}

      {/* All Citations Footer */}
      {citations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="pt-3 border-t border-cyan-300/20 dark:border-cyan-500/10">
          <button
            onClick={() => setCollapsedPanels(prev => {
              const next = new Set(prev);
              next.has('all-source-citations') ? next.delete('all-source-citations') : next.add('all-source-citations');
              return next;
            })}
            className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
              All Source Citations ({citations.length})
            </p>
            {collapsedPanels.has('all-source-citations') ? <ChevronRight className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
          </button>
          <AnimatePresence>
            {!collapsedPanels.has('all-source-citations') && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {citations.filter(c => c.cite_type && c.answer).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/30 text-[10px] backdrop-blur-sm">
                      <span className="text-slate-600 dark:text-slate-300 font-mono">{c.cite_type?.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{renderCitationValue(c)}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">cite:[{c.id.slice(0, 6)}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
