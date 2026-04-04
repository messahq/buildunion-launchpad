// ============================================
// AITerritoryGrid — 4-Column Engine Layout (Desktop)
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Sparkles,
  Loader2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Citation } from "@/types/citation";
import type { PanelConfig, VisibilityTier } from "./types";
import { PANELS } from "./constants";

import engineGeminiImg from "@/assets/engine-gemini.png";
import engineGptImg from "@/assets/engine-gpt.png";
import engineLovableImg from "@/assets/engine-lovable.png";
import engineClaudeImg from "@/assets/engine-claude.png";
import engineGrokImg from "@/assets/engine-grok.png";

interface AITerritoryGridProps {
  citations: Citation[];
  documents: any[];
  tasks: any[];
  teamMembers: any[];
  contracts: any[];
  weatherData: any;
  projectData: any;
  financialSummary: { material_cost: number; labor_cost: number; total_cost: number } | null;
  obcComplianceResults: { sections: any[]; loading: boolean; error: string | null; lastCheckedAt: string | null };
  activeOrbitalPanel: string;
  unreadChatCount: number;
  canViewFinancials: boolean;
  obcSummaryExpanded: boolean;
  setObcSummaryExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  grokInsightsLoading: boolean;
  setGrokInsightsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveOrbitalPanel: (panel: string) => void;
  setSlideOverPanel: (panel: string | null) => void;
  hasAccessToTier: (tier: VisibilityTier, panelId: string) => boolean;
  getCitationsForPanel: (keys: string[]) => Citation[];
  runObcComplianceCheck: () => void;
  setAffiliateProductsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setAffiliateProducts: React.Dispatch<React.SetStateAction<any[]>>;
}

export function AITerritoryGrid({
  citations,
  documents,
  tasks,
  teamMembers,
  contracts,
  weatherData,
  projectData,
  financialSummary,
  obcComplianceResults,
  activeOrbitalPanel,
  unreadChatCount,
  canViewFinancials,
  obcSummaryExpanded,
  setObcSummaryExpanded,
  grokInsightsLoading,
  setGrokInsightsLoading,
  setActiveOrbitalPanel,
  setSlideOverPanel,
  hasAccessToTier,
  getCitationsForPanel,
  runObcComplianceCheck,
  setAffiliateProductsLoaded,
  setAffiliateProducts,
}: AITerritoryGridProps) {
  return (
    <div className="shrink-0">
      <div className="grid grid-cols-4 gap-4">

        {/* ═══ COLUMN 1: GEMINI — Files & Contracts ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
          className="relative rounded-2xl border border-cyan-400/20 overflow-hidden bg-[#111827]/90 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.12)] hover:shadow-[0_0_25px_rgba(34,211,238,0.2)] hover:border-cyan-400/40 transition-all duration-300"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
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
                  const phaseTasks = tasks.filter((t: any) => (t as any).phase === phase || (!t.phase && phase === 'installation'));
                  const completed = phaseTasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length;
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
                    <span className="h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0 animate-pulse">
                      {unreadChatCount}
                    </span>
                  )}
                </motion.button>
              );
            })()}
          </div>
        </motion.div>

        {/* ═══ COLUMN 4: Claude / Grok — OBC & Insights ═══ */}
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
            {/* OBC Compliance Summary */}
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
                      {obcComplianceResults.sections.slice(0, 5).map((s: any, i: number) => {
                        const rel = Math.round((s.relevance_score || 0) * 100);
                        return (
                          <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[11px] text-gray-200 truncate flex-1 font-medium" title={s.section_title}>
                              §{s.section_number} — {s.section_title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
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
            
            {/* Grok Insights Affiliate Card */}
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
  );
}
