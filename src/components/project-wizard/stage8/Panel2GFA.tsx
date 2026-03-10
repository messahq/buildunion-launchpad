// ============================================
// PANEL 2: Area & Dimensions (Card + Fullscreen)
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Ruler, Lock, Building2, Maximize2, LayoutDashboard,
  DollarSign, Zap, FileImage, AlertTriangle, ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Citation } from "@/types/citation";

// ============================================
// PROPS
// ============================================
export interface Panel2Props {
  mode: 'card' | 'fullscreen';
  citations: Citation[];
  financialSummary: { material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null;
  collapsedPanels: Set<string>;
  setCollapsedPanels: React.Dispatch<React.SetStateAction<Set<string>>>;
  renderCitationValue: (citation: Citation) => React.ReactNode;
}

// ============================================
// COMPONENT
// ============================================
export const Panel2GFA: React.FC<Panel2Props> = ({
  mode,
  citations,
  financialSummary,
  collapsedPanels,
  setCollapsedPanels,
  renderCitationValue,
}) => {
  const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
  const blueprintCitation = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
  const siteConditionCitation = citations.find(c => c.cite_type === 'SITE_CONDITION');
  const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');

  const hasGfaData = gfaCitation && (typeof gfaCitation.value === 'number' || typeof gfaCitation.metadata?.gfa_value === 'number');
  const gfaValue = typeof gfaCitation?.value === 'number' ? gfaCitation.value : typeof gfaCitation?.metadata?.gfa_value === 'number' ? gfaCitation.metadata.gfa_value : null;
  const gfaUnit = gfaCitation?.metadata?.gfa_unit || 'sq ft';

  const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number'
    ? templateCitation.metadata.waste_percent
    : (templateCitation?.metadata?.items as any[])?.find?.((item: any) => item.applyWaste) ? 10 : null;

  const grossArea = gfaValue && wastePercent ? Math.ceil(gfaValue * (1 + wastePercent / 100)) : null;
  const metricArea = gfaValue ? Math.round(gfaValue * 0.0929) : null;
  const estPerimeter = gfaValue ? Math.round(4 * Math.sqrt(gfaValue)) : null;
  const estRooms = gfaValue ? Math.max(1, Math.round(gfaValue / 200)) : null;
  const costPerSqFt = gfaValue && financialSummary?.total_cost ? (financialSummary.total_cost / gfaValue) : null;
  const metricPerimeter = estPerimeter ? Math.round(estPerimeter * 0.3048) : null;
  const sqFtPerZone = gfaValue && estRooms ? Math.round(gfaValue / estRooms) : null;

  // ═══ Fullscreen View ═══
  if (mode === 'fullscreen') {
    const panelCitations = citations.filter(c =>
      ['GFA_LOCK', 'BLUEPRINT_UPLOAD', 'SITE_CONDITION', 'TEMPLATE_LOCK'].includes(c.cite_type || '')
    );

    return (
      <div className="space-y-4">
        {/* GFA Hero — Large 3D Format */}
        <motion.div
          initial={{ opacity: 0, y: 12, rotateX: 5 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            border: `2px solid ${hasGfaData ? 'rgba(245,158,11,0.35)' : 'rgba(100,116,139,0.2)'}`,
            background: hasGfaData
              ? 'linear-gradient(145deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.04) 40%, rgba(15,23,42,0.95) 100%)'
              : 'linear-gradient(145deg, rgba(51,65,85,0.3), rgba(15,23,42,0.8))',
          }}
        >
          {hasGfaData && (
            <>
              <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)' }} />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)' }} />
            </>
          )}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)' }} />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.16em] mb-2 text-amber-400/90">Gross Floor Area</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-white" style={{ textShadow: '0 2px 16px rgba(245,158,11,0.25)' }}>
                  {gfaValue !== null ? gfaValue.toLocaleString() : '—'}
                </span>
                <span className="text-xl font-semibold text-amber-300">{gfaUnit}</span>
              </div>
              {metricArea && <p className="text-sm text-amber-300/80 mt-1">= {metricArea.toLocaleString()} m²</p>}
              {gfaCitation && <p className="text-[9px] text-slate-400 font-mono mt-2 opacity-70">cite: [{gfaCitation.id.slice(0, 12)}]</p>}
            </div>
            {hasGfaData && (
              <div className="flex flex-col items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 4px 16px -4px rgba(245,158,11,0.3)' }}>
                  <Lock className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Locked</span>
                </div>
                <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ perspective: '200px', transformStyle: 'preserve-3d', background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.08))', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 8px 24px -4px rgba(245,158,11,0.25)' }}>
                  <Ruler className="h-6 w-6 text-amber-400" />
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Derived Metrics */}
        {gfaValue !== null && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Metric Area', value: `${metricArea?.toLocaleString()} m²`, sub: 'sq meters', icon: Building2, glow: 'rgba(6,182,212,0.15)', iconColor: '#22d3ee', borderColor: 'rgba(6,182,212,0.25)', gradient: 'from-cyan-500/15 to-blue-500/5' },
              { label: 'Perimeter', value: `${estPerimeter?.toLocaleString()} ft`, sub: metricPerimeter ? `≈ ${metricPerimeter} m` : '', icon: Maximize2, glow: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)', gradient: 'from-amber-500/15 to-orange-500/5' },
              { label: 'Est. Zones', value: `${estRooms}`, sub: sqFtPerZone ? `~${sqFtPerZone} sqft each` : '', icon: LayoutDashboard, glow: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa', borderColor: 'rgba(139,92,246,0.25)', gradient: 'from-violet-500/15 to-purple-500/5' },
              { label: 'Cost / sqft', value: costPerSqFt ? `$${costPerSqFt.toFixed(2)}` : '—', sub: costPerSqFt ? 'projected' : 'pending budget', icon: DollarSign, glow: 'rgba(16,185,129,0.15)', iconColor: '#34d399', borderColor: 'rgba(16,185,129,0.25)', gradient: 'from-emerald-500/15 to-green-500/5' },
              ...(wastePercent !== null ? [{ label: 'Gross w/ Waste', value: `${grossArea?.toLocaleString()} ${gfaUnit}`, sub: `+${wastePercent}%`, icon: Zap, glow: 'rgba(249,115,22,0.15)', iconColor: '#fb923c', borderColor: 'rgba(249,115,22,0.25)', gradient: 'from-orange-500/15 to-red-500/5' }] : []),
              ...(costPerSqFt ? [{ label: 'Cost / m²', value: `$${(costPerSqFt * 10.764).toFixed(2)}`, sub: 'metric projected', icon: DollarSign, glow: 'rgba(6,182,212,0.15)', iconColor: '#22d3ee', borderColor: 'rgba(6,182,212,0.25)', gradient: 'from-cyan-500/15 to-sky-500/5' }] : []),
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                whileHover={{ y: -2, scale: 1.02 }}
                className={cn("relative overflow-hidden rounded-xl p-4 bg-gradient-to-br", m.gradient)}
                style={{ border: `1px solid ${m.borderColor}`, boxShadow: `0 8px 20px -6px ${m.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-300">{m.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${m.glow}, transparent)`, boxShadow: `0 4px 8px -2px ${m.glow}` }}>
                    <m.icon className="h-3.5 w-3.5" style={{ color: m.iconColor }} />
                  </div>
                </div>
                <p className="text-xl font-bold text-white" style={{ textShadow: `0 1px 8px ${m.glow}` }}>{m.value}</p>
                {m.sub && <p className="text-[10px] mt-0.5 text-slate-400">{m.sub}</p>}
              </motion.div>
            ))}
          </div>
        )}

        {/* Blueprint & Site Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {blueprintCitation && (
            <motion.div whileHover={{ y: -1, scale: 1.01 }} className="rounded-xl p-4 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(6,182,212,0.03))', border: '1px solid rgba(20,184,166,0.2)', boxShadow: '0 4px 16px -4px rgba(20,184,166,0.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.2), transparent)', boxShadow: '0 4px 8px -2px rgba(20,184,166,0.2)' }}>
                  <FileImage className="h-3.5 w-3.5 text-teal-400" />
                </div>
                <span className="text-xs font-semibold text-white">Blueprint</span>
                <span className="text-[9px] text-teal-400/70 font-mono ml-auto">cite: [{blueprintCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm text-slate-300">{String(blueprintCitation.metadata?.fileName || blueprintCitation.answer)}</p>
            </motion.div>
          )}
          {siteConditionCitation && (
            <motion.div className="relative rounded-xl p-4 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(225,29,72,0.03))', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 16px -4px rgba(239,68,68,0.12)' }}>
              <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: 'linear-gradient(180deg, #ef4444, #f43f5e)' }} />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), transparent)', boxShadow: '0 4px 8px -2px rgba(239,68,68,0.2)' }}>
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                </div>
                <span className="text-xs font-semibold text-white">Site Condition</span>
                <span className="text-[9px] text-slate-500 font-mono ml-auto">cite: [{siteConditionCitation.id.slice(0, 8)}]</span>
              </div>
              <p className="text-sm font-semibold text-amber-300 capitalize">{siteConditionCitation.answer}</p>
            </motion.div>
          )}
        </div>

        {/* All Panel Citations */}
        {panelCitations.length > 0 && (
          <div className="pt-3 border-t border-slate-700/20">
            <button
              onClick={() => setCollapsedPanels(prev => {
                const next = new Set(prev);
                const key = 'citations-fullscreen-panel-2-gfa';
                next.has(key) ? next.delete(key) : next.add(key);
                return next;
              })}
              className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
            >
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">All Citations ({panelCitations.length})</p>
              {collapsedPanels.has('citations-fullscreen-panel-2-gfa') ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
            </button>
            <AnimatePresence>
              {!collapsedPanels.has('citations-fullscreen-panel-2-gfa') && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                  {panelCitations.map(c => (
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
  return (
    <div className="space-y-3">
      {/* GFA HERO — 3D Floating Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border-2 p-5"
        style={{
          perspective: '800px',
          borderColor: hasGfaData ? 'rgba(245,158,11,0.35)' : 'rgba(100,116,139,0.2)',
          background: hasGfaData
            ? 'linear-gradient(145deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.04) 40%, rgba(15,23,42,0.95) 100%)'
            : 'linear-gradient(145deg, rgba(51,65,85,0.3), rgba(15,23,42,0.8))',
        }}
      >
        {hasGfaData && (
          <>
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)' }} />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)' }} />
          </>
        )}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)' }} />

        <div className="relative z-10 flex items-center gap-4">
          <motion.div
            animate={hasGfaData ? { rotateY: [0, 360] } : {}}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="relative w-14 h-14 shrink-0" style={{ perspective: '200px', transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{
                background: hasGfaData ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.1))' : 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(51,65,85,0.1))',
                boxShadow: hasGfaData ? '0 8px 24px -4px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 4px 12px rgba(0,0,0,0.2)',
                border: hasGfaData ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(100,116,139,0.2)',
              }}>
              <Ruler className="h-6 w-6" style={{ color: hasGfaData ? '#f59e0b' : '#94a3b8' }} />
            </div>
          </motion.div>

          <div className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] mb-1 text-amber-400/90">Gross Floor Area</p>
            <div className="flex items-baseline gap-2">
              <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="text-[32px] leading-none font-black tracking-tight text-white" style={{ textShadow: '0 2px 12px rgba(245,158,11,0.25)' }}>
                {gfaValue !== null ? gfaValue.toLocaleString() : '—'}
              </motion.span>
              <span className="text-sm font-semibold text-amber-300">{gfaUnit}</span>
            </div>
            {gfaCitation && <p className="text-[8px] text-slate-400 font-mono mt-1.5 opacity-70">cite: [{gfaCitation.id.slice(0, 12)}]</p>}
          </div>

          {hasGfaData && (
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4, type: 'spring' }}>
              <div className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 4px 16px -4px rgba(245,158,11,0.3)' }}>
                <Lock className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Locked</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats — 3D Isometric Cards */}
      {gfaValue !== null && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Metric', value: `${metricArea?.toLocaleString()}`, unit: 'm²', icon: Building2, gradient: 'from-cyan-500/15 to-blue-500/5', glow: 'rgba(6,182,212,0.15)', iconColor: '#22d3ee', borderColor: 'rgba(6,182,212,0.25)' },
            { label: 'Perimeter', value: `${estPerimeter?.toLocaleString()}`, unit: 'ft', icon: Maximize2, gradient: 'from-amber-500/15 to-orange-500/5', glow: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)' },
            { label: 'Zones', value: `${estRooms}`, unit: estRooms === 1 ? 'zone' : 'zones', icon: LayoutDashboard, gradient: 'from-violet-500/15 to-purple-500/5', glow: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa', borderColor: 'rgba(139,92,246,0.25)' },
            { label: 'Cost/sqft', value: costPerSqFt ? `$${costPerSqFt.toFixed(0)}` : '—', unit: '/sqft', icon: DollarSign, gradient: 'from-emerald-500/15 to-green-500/5', glow: 'rgba(16,185,129,0.15)', iconColor: '#34d399', borderColor: 'rgba(16,185,129,0.25)' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className={cn("relative overflow-hidden rounded-xl p-3 bg-gradient-to-br", stat.gradient)}
              style={{ border: `1px solid ${stat.borderColor}`, boxShadow: `0 8px 20px -6px ${stat.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-[8px] font-mono uppercase tracking-widest text-slate-300">{stat.label}</p>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${stat.glow}, transparent)`, boxShadow: `0 4px 8px -2px ${stat.glow}` }}>
                  <stat.icon className="h-3 w-3" style={{ color: stat.iconColor }} />
                </div>
              </div>
              <p className="text-xl font-bold text-white leading-none" style={{ textShadow: `0 1px 8px ${stat.glow}` }}>{stat.value}</p>
              <p className="text-[9px] mt-0.5 text-slate-400">{stat.unit}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Waste gauge */}
      {wastePercent !== null && gfaValue !== null && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-xl p-3"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,88,12,0.03))', border: '1px solid rgba(249,115,22,0.2)', boxShadow: '0 4px 16px -4px rgba(249,115,22,0.15)' }}>
          <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden bg-orange-900/20">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(wastePercent * 5, 100)}%` }} transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
              className="h-full rounded-r-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316, #ef4444)', boxShadow: '0 0 12px rgba(249,115,22,0.5)' }} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), transparent)', boxShadow: '0 4px 8px -2px rgba(249,115,22,0.2)' }}>
                <Zap className="h-3 w-3 text-orange-400" />
              </div>
              <span className="text-xs font-bold text-white">Waste +{wastePercent}%</span>
              <span className="text-[10px] text-amber-300/80">→ {grossArea?.toLocaleString()} {gfaUnit}</span>
            </div>
            <span className="text-[10px] font-bold text-orange-300">+{(grossArea! - gfaValue).toLocaleString()}</span>
          </div>
          {templateCitation && <p className="text-[7px] text-slate-500 font-mono mt-1.5">cite: [{templateCitation.id.slice(0, 12)}]</p>}
        </motion.div>
      )}

      {/* Blueprint File Card */}
      {blueprintCitation && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          whileHover={{ y: -1, scale: 1.01 }}
          className="relative overflow-hidden rounded-xl p-3 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(6,182,212,0.03))', border: '1px solid rgba(20,184,166,0.2)', boxShadow: '0 4px 16px -4px rgba(20,184,166,0.12)' }}>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.2), rgba(6,182,212,0.08))', border: '1px solid rgba(20,184,166,0.25)', boxShadow: '0 6px 16px -4px rgba(20,184,166,0.2), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <FileImage className="h-4 w-4 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{String(blueprintCitation.metadata?.fileName || blueprintCitation.answer)}</p>
              <p className="text-[8px] text-teal-400/70 font-mono">blueprint • cite: [{blueprintCitation.id.slice(0, 8)}]</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Site Condition */}
      {siteConditionCitation && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="relative overflow-hidden rounded-xl p-3"
          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(225,29,72,0.03))', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 16px -4px rgba(239,68,68,0.12)' }}>
          <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: 'linear-gradient(180deg, #ef4444, #f43f5e)' }} />
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), transparent)', boxShadow: '0 4px 8px -2px rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="h-3 w-3 text-red-400" />
            </div>
            <span className="text-xs font-bold text-white">Site:</span>
            <span className="text-xs font-semibold text-amber-300 capitalize">{siteConditionCitation.answer}</span>
            <span className="text-[8px] text-slate-500 font-mono ml-auto shrink-0">cite: [{siteConditionCitation.id.slice(0, 8)}]</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
