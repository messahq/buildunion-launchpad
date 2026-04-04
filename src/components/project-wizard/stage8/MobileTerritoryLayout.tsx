// ============================================
// STAGE 8: Mobile Territory Layout
// ============================================
// Mobile-optimized 2x2 engine grid + canvas content
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import engineGeminiImg from "@/assets/engine-gemini.png";
import engineGptImg from "@/assets/engine-gpt.png";
import engineClaudeImg from "@/assets/engine-claude.png";
import engineLovableImg from "@/assets/engine-lovable.png";
import engineGrokImg from "@/assets/engine-grok.png";
import type { PanelConfig, VisibilityTier } from "./types";

interface MobileTerritoryLayoutProps {
  PANELS: PanelConfig[];
  activeOrbitalPanel: string;
  setActiveOrbitalPanel: (panel: string) => void;
  setSlideOverPanel: (panel: string | null) => void;
  hasAccessToTier: (tier: VisibilityTier, panelId: string) => boolean;
  getCitationsForPanel: (dataKeys: string[]) => any[];
  citations: any[];
  documents: any[];
  tasks: any[];
  teamMembers: any[];
  weatherData: any;
  projectData: any;
  financialSummary: any;
  canViewFinancials: boolean;
  obcComplianceResults: any;
  grokInsightsLoading: boolean;
  setGrokInsightsLoading: (v: boolean) => void;
  runObcComplianceCheck: () => void;
  activePanelConfig: PanelConfig;
  renderFullscreenContent: (panel: PanelConfig | undefined | null) => React.ReactNode;
  mobileContentRef: React.RefObject<HTMLDivElement>;
}

export function MobileTerritoryLayout({
  PANELS,
  activeOrbitalPanel,
  setActiveOrbitalPanel,
  setSlideOverPanel,
  hasAccessToTier,
  getCitationsForPanel,
  citations,
  documents,
  tasks,
  teamMembers,
  weatherData,
  projectData,
  financialSummary,
  canViewFinancials,
  obcComplianceResults,
  grokInsightsLoading,
  setGrokInsightsLoading,
  runObcComplianceCheck,
  activePanelConfig,
  renderFullscreenContent,
  mobileContentRef,
}: MobileTerritoryLayoutProps) {
  return (
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
              { panel: PANELS.find(p => p.id === 'panel-2-gfa')!, label: 'GFA', sub: (() => { const g = getCitationsForPanel(['GFA_LOCK']).find((c: any) => c.cite_type === 'GFA_LOCK'); return g ? `${parseFloat(g.answer).toLocaleString()}` : '—'; })() },
              { panel: PANELS.find(p => p.id === 'panel-3-trade')!, label: 'Trade', sub: (() => { const t = citations.find((c: any) => c.cite_type === 'TRADE_SELECTION'); return t?.answer?.slice(0, 8) || '—'; })() },
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
        <div className="flex-1 p-3 overflow-y-auto mcv-dark" ref={mobileContentRef}>
          {renderFullscreenContent(activePanelConfig)}
        </div>
      </div>
    </div>
  );
}
