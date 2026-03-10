// ============================================
// STAGE 8: DNA Audit Content Panel
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Crown,
  Lock,
  Loader2,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/citation";

interface DnaAuditPanelProps {
  citations: Citation[];
  teamMembers: { id: string; role: string; name: string; userId: string }[];
  financialSummary: { material_cost: number | null; labor_cost: number | null; total_cost: number | null } | null;
  obcComplianceResults: {
    sections: Array<{
      section_number: string;
      section_title: string;
      content: string;
      relevance_score: number;
      source: string;
    }>;
    loading: boolean;
    error: string | null;
    lastCheckedAt: string | null;
  };
  dnaScanningPillar: number | null;
  dnaScannedPillars: Set<number>;
  expandedRiskPillars: Set<string>;
  onToggleRiskPillar: (key: string) => void;
  onRunObcComplianceCheck: () => void;
}

export const DnaAuditPanel = React.memo(({
  citations,
  teamMembers,
  financialSummary,
  obcComplianceResults,
  dnaScanningPillar,
  dnaScannedPillars,
  expandedRiskPillars,
  onToggleRiskPillar,
  onRunObcComplianceCheck,
}: DnaAuditPanelProps) => {
  const nameCit = citations.find(c => c.cite_type === 'PROJECT_NAME');
  const locationCit = citations.find(c => c.cite_type === 'LOCATION');
  const workTypeCit = citations.find(c => c.cite_type === 'WORK_TYPE');
  const gfaCit = citations.find(c => c.cite_type === 'GFA_LOCK');
  const blueprintCit = citations.find(c => c.cite_type === 'BLUEPRINT_UPLOAD');
  const siteCondCit = citations.find(c => c.cite_type === 'SITE_CONDITION');
  const tradeCit = citations.find(c => c.cite_type === 'TRADE_SELECTION');
  const templateCit = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
  const execModeCit = citations.find(c => c.cite_type === 'EXECUTION_MODE');
  const teamStructCit = citations.find(c => c.cite_type === 'TEAM_STRUCTURE');
  const teamInviteCit = citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');
  const teamPermCit = citations.find(c => c.cite_type === 'TEAM_PERMISSION_SET');
  const teamSizeCit = citations.find(c => c.cite_type === 'TEAM_SIZE');
  const timelineCit = citations.find(c => c.cite_type === 'TIMELINE');
  const endDateCit = citations.find(c => c.cite_type === 'END_DATE');
  const dnaCit = citations.find(c => c.cite_type === 'DNA_FINALIZED');
  const photoCit = citations.find(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'VISUAL_VERIFICATION');
  const weatherCit = citations.find(c => c.cite_type === 'WEATHER_ALERT');
  const demoPriceCit = citations.find(c => c.cite_type === 'DEMOLITION_PRICE');
  const budgetCitDna = citations.find(c => c.cite_type === 'BUDGET');

  // ── Pillar 8 budget sync logic ──
  const p8HasBudget = !!budgetCitDna || ((financialSummary?.total_cost ?? 0) > 0 && (financialSummary as any)?.budget > 0);
  const p8NetCost = financialSummary?.total_cost ?? 0;
  const p8Budget = (financialSummary as any)?.budget ?? (typeof budgetCitDna?.value === 'number' ? budgetCitDna.value : 0);
  const p8Synced = p8HasBudget && p8Budget > 0 && p8NetCost <= p8Budget * 1.02;
  const p8FailReason = !p8HasBudget || p8Budget <= 0
    ? 'Budget not set — unverified spend'
    : p8NetCost > p8Budget * 1.02
      ? `Net cost $${p8NetCost.toLocaleString()} exceeds budget $${p8Budget.toLocaleString()} (+2% tolerance)`
      : '';

  // ── Pillar 9 OBC compliance logic ──
  const p9HasSections = obcComplianceResults.sections.length > 0;
  const p9Relevance = p9HasSections
    ? obcComplianceResults.sections.reduce((sum, s) => sum + (s.relevance_score ?? 0), 0) / obcComplianceResults.sections.length
    : 0;
  const p9HasSpecs = !!templateCit || !!tradeCit;
  const p9Pass = p9HasSections && p9Relevance > 0.7 && p9HasSpecs;
  const p9FailReason = !p9HasSections
    ? 'No OBC sections found — run OBC Alignment in Wizard'
    : p9Relevance <= 0.7
      ? `Relevance score ${Math.round(p9Relevance * 100)}% < 70% threshold`
      : !p9HasSpecs
        ? 'Missing trade/material specifications'
        : '';

  const pillarDetails: Array<{
    key: string; label: string; sub: string; icon: string; color: string;
    headerBg: string; textColor: string; status: boolean; description: string;
    penaltyWeight: number; failReason: string; riskExplanation: string;
    sources: Array<{ label: string; citation: any; field: string; customValue?: string }>;
  }> = [
    { key: 'basics', label: '1 — Project Basics', sub: 'Name × Location × Work Type', icon: '🏗️', color: 'border-emerald-500/40', headerBg: 'bg-emerald-500/10', textColor: 'text-emerald-400', status: !!nameCit && !!locationCit && !!workTypeCit, penaltyWeight: 1000, failReason: !(!!nameCit && !!locationCit && !!workTypeCit) ? 'Missing project identity citations' : '', riskExplanation: 'Incomplete project documentation can delay permit approvals and trigger $500–$1,500 in administrative penalties from municipal offices.', description: 'Validates that the project identity (Name, Address, Work Type) has been defined and cited.', sources: [{ label: 'Project Name', citation: nameCit, field: 'PROJECT_NAME' }, { label: 'Location', citation: locationCit, field: 'LOCATION' }, { label: 'Work Type', citation: workTypeCit, field: 'WORK_TYPE' }] },
    { key: 'area', label: '2 — Area & Dimensions', sub: 'GFA Lock × Blueprint × Site', icon: '📐', color: 'border-blue-500/40', headerBg: 'bg-blue-500/10', textColor: 'text-blue-400', status: !!gfaCit, penaltyWeight: 3500, failReason: !gfaCit ? 'GFA not locked — complete Area step' : '', riskExplanation: 'Incorrect area measurements lead to wrong material quantities — typically $3,000–$5,000 in wasted materials, re-orders, and labour downtime on residential projects.', description: 'Geometric precision — AI-estimated vs Owner manually overridden GFA as authoritative source.', sources: [{ label: 'GFA Lock', citation: gfaCit, field: 'GFA_LOCK' }, { label: 'Blueprint Upload', citation: blueprintCit, field: 'BLUEPRINT_UPLOAD' }, { label: 'Site Condition', citation: siteCondCit, field: 'SITE_CONDITION' }] },
    { key: 'trade', label: '3 — Trade & Template', sub: 'PDF RAG × Materials Table', icon: '🔬', color: 'border-orange-500/40', headerBg: 'bg-orange-500/10', textColor: 'text-orange-400', status: !!tradeCit && !!templateCit, penaltyWeight: 2500, failReason: !(!!tradeCit && !!templateCit) ? 'Trade selection or template not locked' : '', riskExplanation: 'Wrong trade specs or unlocked templates cause material mismatches — expect $1,500–$3,000 in returns, restocking fees, and project delays.', description: 'Verifies that PDF-extracted technical specs match the locked Materials Table entries.', sources: [{ label: 'Trade Selection', citation: tradeCit, field: 'TRADE_SELECTION' }, { label: 'Template Lock', citation: templateCit, field: 'TEMPLATE_LOCK' }, { label: 'Execution Mode', citation: execModeCit, field: 'EXECUTION_MODE' }] },
    { key: 'team', label: '4 — Team Architecture', sub: 'Structure × Roles × Permissions', icon: '👥', color: 'border-teal-500/40', headerBg: 'bg-teal-500/10', textColor: 'text-teal-400', status: !!teamStructCit || !!teamSizeCit || teamMembers.length > 0, penaltyWeight: 1500, failReason: !(!!teamStructCit || !!teamSizeCit || teamMembers.length > 0) ? 'No team structure defined' : '', riskExplanation: 'Undefined roles and missing permissions cause coordination failures — typically 2–5 days of delays ($1,000–$2,000 in lost productivity).', description: 'Validates team composition, role assignments, and permission structures.', sources: [{ label: 'Team Structure', citation: teamStructCit, field: 'TEAM_STRUCTURE' }, { label: 'Team Size', citation: teamSizeCit, field: 'TEAM_SIZE' }, { label: 'Member Invites', citation: teamInviteCit, field: 'TEAM_MEMBER_INVITE' }, { label: 'Permission Set', citation: teamPermCit, field: 'TEAM_PERMISSION_SET' }] },
    { key: 'timeline', label: '5 — Execution Timeline', sub: 'Start × End × DNA Finalized', icon: '📅', color: 'border-indigo-500/40', headerBg: 'bg-indigo-500/10', textColor: 'text-indigo-400', status: !!timelineCit && !!endDateCit, penaltyWeight: 2000, failReason: !(!!timelineCit && !!endDateCit) ? 'Timeline dates incomplete' : '', riskExplanation: 'Missing deadlines can trigger contractual penalties (liquidated damages) of $500–$2,500 per week, plus client trust erosion.', description: 'Timeline integrity — start/end dates, DNA finalization, and task phase orchestration.', sources: [{ label: 'Timeline (Start)', citation: timelineCit, field: 'TIMELINE' }, { label: 'End Date', citation: endDateCit, field: 'END_DATE' }, { label: 'DNA Finalized', citation: dnaCit, field: 'DNA_FINALIZED' }] },
    { key: 'docs', label: '6 — Documents & Visual', sub: 'AI Vision × Trade Sync', icon: '👁️', color: 'border-sky-500/40', headerBg: 'bg-sky-500/10', textColor: 'text-sky-400', status: !!photoCit || !!blueprintCit, penaltyWeight: 2000, failReason: !(!!photoCit || !!blueprintCit) ? 'No site photos or blueprints uploaded' : '', riskExplanation: 'Failed inspections due to missing documentation cost $1,000–$3,000 per re-inspection plus project standstill time.', description: 'AI Vision cross-reference: site photo content aligns with selected trade and blueprints.', sources: [{ label: 'Site Photo / Visual', citation: photoCit, field: photoCit?.cite_type || 'SITE_PHOTO' }, { label: 'Blueprint', citation: blueprintCit, field: 'BLUEPRINT_UPLOAD' }] },
    { key: 'weather', label: '7 — Site Log & Location', sub: 'Alerts × Site Readiness', icon: '🌦️', color: 'border-cyan-500/40', headerBg: 'bg-cyan-500/10', textColor: 'text-cyan-400', status: !!weatherCit || !!siteCondCit, penaltyWeight: 1500, failReason: !(!!weatherCit || !!siteCondCit) ? 'No weather or site condition data' : '', riskExplanation: 'Ignoring weather alerts or site conditions risks $1,000–$2,000 in weather damage to materials and unsafe working conditions.', description: 'Weather alerts and site condition assessment for operational readiness.', sources: [{ label: 'Weather Alert', citation: weatherCit, field: 'WEATHER_ALERT' }, { label: 'Site Condition', citation: siteCondCit, field: 'SITE_CONDITION' }] },
    { key: 'financial', label: '8 — Financial Summary', sub: 'Budget Sync + Tax (HST/GST)', icon: '💰', color: 'border-red-500/40', headerBg: 'bg-red-500/10', textColor: 'text-red-400', status: p8Synced, penaltyWeight: 5000, failReason: p8FailReason, riskExplanation: 'Unverified budgets lead to cash flow crises mid-project — overruns of $3,000–$8,000 are common on residential builds without budget sync.', description: 'Validates budget synchronization (net cost ≤ budget within 2% tolerance) and regional tax calculation.', sources: [{ label: 'Location (Tax Region)', citation: locationCit, field: 'LOCATION' }, { label: 'Demolition Price', citation: demoPriceCit, field: 'DEMOLITION_PRICE' }, { label: 'Budget Citation', citation: budgetCitDna, field: 'BUDGET', customValue: p8Budget > 0 ? `$${p8Budget.toLocaleString()} CAD` : 'Not set' }] },
    { key: 'compliance', label: '9 — Building Code Alignment', sub: 'OBC Part 9 × Material Specs × Safety', icon: '⚖️', color: 'border-purple-500/40', headerBg: 'bg-purple-500/10', textColor: 'text-purple-400', status: p9Pass, penaltyWeight: 8500, failReason: p9FailReason, riskExplanation: 'Ontario Building Code violations carry fines of $1,000–$50,000+ per offence for individuals, plus daily continuing penalties. Non-compliant work may require full demolition and rebuild.', description: 'Validates project against Ontario Building Code Part 9 requirements via RAG pipeline. OBC violations: $1k–$50k+ per offence.', sources: [...obcComplianceResults.sections.slice(0, 3).map(s => ({ label: `§ ${s.section_number} — ${s.section_title}`, citation: null, field: 'OBC_COMPLIANCE' })), ...(obcComplianceResults.sections.length === 0 ? [{ label: 'OBC Part 9 Compliance', citation: null, field: 'OBC_COMPLIANCE' }] : []), { label: 'Building Permit Status', citation: null, field: 'BUILDING_PERMIT', customValue: 'Verify before start' }] },
  ];

  const MAX_POTENTIAL_PENALTY = pillarDetails.reduce((s, p) => s + p.penaltyWeight, 0);
  const passCount = pillarDetails.filter(p => p.status).length;
  const totalPillars = pillarDetails.length;

  const radarColorMap: Record<string, string> = {
    'border-emerald-500/40': 'hsla(160, 80%, 50%, 0.2)', 'border-blue-500/40': 'hsla(217, 90%, 60%, 0.2)',
    'border-orange-500/40': 'hsla(25, 95%, 53%, 0.2)', 'border-teal-500/40': 'hsla(173, 80%, 40%, 0.2)',
    'border-indigo-500/40': 'hsla(239, 84%, 67%, 0.2)', 'border-sky-500/40': 'hsla(199, 89%, 48%, 0.2)',
    'border-cyan-500/40': 'hsla(188, 86%, 53%, 0.2)', 'border-red-500/40': 'hsla(0, 84%, 60%, 0.2)',
    'border-purple-500/40': 'hsla(270, 70%, 60%, 0.2)',
  };
  const radarBrightMap: Record<string, string> = {
    'border-emerald-500/40': 'hsla(160, 80%, 50%, 0.45)', 'border-blue-500/40': 'hsla(217, 90%, 60%, 0.45)',
    'border-orange-500/40': 'hsla(25, 95%, 53%, 0.45)', 'border-teal-500/40': 'hsla(173, 80%, 40%, 0.45)',
    'border-indigo-500/40': 'hsla(239, 84%, 67%, 0.45)', 'border-sky-500/40': 'hsla(199, 89%, 48%, 0.45)',
    'border-cyan-500/40': 'hsla(188, 86%, 53%, 0.45)', 'border-red-500/40': 'hsla(0, 84%, 60%, 0.45)',
    'border-purple-500/40': 'hsla(270, 70%, 60%, 0.45)',
  };
  const scannedBorderMap: Record<string, string> = {
    'border-emerald-500/40': 'hsla(160, 80%, 45%, 0.7)', 'border-blue-500/40': 'hsla(217, 90%, 55%, 0.7)',
    'border-orange-500/40': 'hsla(25, 95%, 50%, 0.7)', 'border-teal-500/40': 'hsla(173, 80%, 38%, 0.7)',
    'border-indigo-500/40': 'hsla(239, 84%, 60%, 0.7)', 'border-sky-500/40': 'hsla(199, 89%, 45%, 0.7)',
    'border-cyan-500/40': 'hsla(188, 86%, 48%, 0.7)', 'border-red-500/40': 'hsla(0, 84%, 55%, 0.7)',
    'border-purple-500/40': 'hsla(270, 70%, 55%, 0.7)',
  };

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
        <div className={cn(
          "text-4xl font-bold font-mono",
          passCount === totalPillars ? "text-emerald-400" : passCount >= 5 ? "text-amber-400" : "text-red-400"
        )}>
          {passCount}/{totalPillars}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-emerald-300">DNA Integrity Score</div>
          <div className="h-3 mt-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                passCount === totalPillars ? "bg-gradient-to-r from-emerald-500 to-green-400"
                  : passCount >= 5 ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-red-500 to-orange-400"
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${(passCount / totalPillars) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
        <Badge className={cn(
          "text-xs font-mono border px-3 py-1",
          passCount === totalPillars ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            : passCount >= 5 ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
            : "bg-red-500/20 text-red-300 border-red-500/30"
        )}>
          {passCount === totalPillars ? 'VERIFIED' : passCount >= 5 ? 'PARTIAL' : 'INCOMPLETE'}
        </Badge>
      </div>

      {/* Pillar Cards */}
      {pillarDetails.map((pillar, idx) => {
        const isScanning = dnaScanningPillar === idx;
        const isScanned = dnaScannedPillars.has(idx);
        return (
          <motion.div
            key={pillar.key}
            className={cn("rounded-xl border overflow-hidden relative", pillar.color)}
            style={{
              ...(isScanned && !isScanning ? {
                borderColor: scannedBorderMap[pillar.color] || 'hsla(160, 80%, 45%, 0.6)',
                boxShadow: `0 0 12px ${radarColorMap[pillar.color] || 'hsla(160, 80%, 45%, 0.2)'}`,
              } : {}),
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            {isScanning && (
              <motion.div
                style={{
                  position: 'absolute', top: 0, width: '35%', height: '100%',
                  background: `linear-gradient(90deg, transparent, ${radarColorMap[pillar.color] || 'hsla(160,80%,50%,0.15)'}, ${radarBrightMap[pillar.color] || 'hsla(160,80%,50%,0.4)'}, ${radarColorMap[pillar.color] || 'hsla(160,80%,50%,0.15)'}, transparent)`,
                  zIndex: 10, pointerEvents: 'none' as const,
                }}
                animate={{ left: ['-35%', '100%', '-35%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <div className={cn("flex items-center gap-3 px-5 py-3", pillar.headerBg)}>
              <span className="text-xl">{pillar.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-bold", pillar.textColor)}>{pillar.label}</div>
                <div className="text-xs text-amber-200/70">{pillar.sub}</div>
              </div>
              {pillar.status ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5 border">
                    <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                  </Badge>
                  <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-[10px] font-mono border font-bold">
                    +${pillar.penaltyWeight.toLocaleString()}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs gap-1.5 border">
                    <AlertTriangle className="h-3.5 w-3.5" /> FAIL
                  </Badge>
                  <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-[10px] font-mono border font-bold">
                    −${pillar.penaltyWeight.toLocaleString()}
                  </Badge>
                </div>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-amber-200/80 leading-relaxed">{pillar.description}</p>
              {!pillar.status && pillar.failReason && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-xs text-red-300/90">{pillar.failReason}</span>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-amber-200/50 uppercase tracking-widest">Source References</div>
                {pillar.sources.map((src: any, si: number) => (
                  <div key={si} className={cn("flex items-start gap-3 px-4 py-3 rounded-lg border text-sm", src.citation ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5")}>
                    <div className="mt-0.5">
                      {src.citation ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : src.customValue ? (
                        (financialSummary?.total_cost ?? 0) > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{src.label}</span>
                        <Badge variant="outline" className="text-[9px] px-2 py-0 font-mono text-amber-200/60 border-amber-200/20">{src.field}</Badge>
                      </div>
                      {src.citation ? (
                        <div className="mt-1.5 space-y-1">
                          <div className="text-amber-200/70">
                            <span className="text-amber-200/50">Value: </span>
                            <span className="text-emerald-300 font-medium">{src.citation.answer || '—'}</span>
                          </div>
                          <div className="text-amber-200/40 text-xs font-mono">
                            cite:{src.citation.id} · {new Date(src.citation.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : src.customValue ? (
                        <div className="mt-1.5 text-amber-200/70">
                          <span className="text-amber-200/50">Value: </span>
                          <span className="text-amber-300 font-medium">{src.customValue}</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-amber-400 text-sm">⚠ Citation not found — complete this step in the Wizard</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Why this amount? — collapsible */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => onToggleRiskPillar(pillar.key)}
                  className="flex items-center gap-2 w-full group"
                >
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors shrink-0">
                    <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <span className="text-xs text-cyan-300/90 group-hover:text-cyan-200 transition-colors font-medium">
                    Why <span className="font-mono font-bold text-cyan-200">${pillar.penaltyWeight.toLocaleString()}</span> risk?
                  </span>
                  <div className="ml-auto">
                    {expandedRiskPillars.has(pillar.key) 
                      ? <ChevronUp className="h-4 w-4 text-cyan-400/60" /> 
                      : <ChevronDown className="h-4 w-4 text-cyan-400/60" />
                    }
                  </div>
                </button>
                <AnimatePresence>
                  {expandedRiskPillars.has(pillar.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 px-4 py-3 rounded-lg bg-cyan-950/30 border border-cyan-500/15">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/25 shrink-0 mt-0.5">
                            <AlertTriangle className="h-4 w-4 text-cyan-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-amber-100/90 leading-relaxed">
                              {pillar.riskExplanation}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-[10px] font-mono border">
                                Ontario Residential
                              </Badge>
                              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] font-mono border">
                                Risk: ${pillar.penaltyWeight.toLocaleString()} CAD
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* ═══ PENALTY PREVENTION & SAVINGS ENGINE ═══ */}
      {(() => {
        const pillarChecks = pillarDetails.map(p => ({ label: p.label, pass: p.status, penaltyWeight: p.penaltyWeight, failReason: p.failReason }));
        const passedCount = pillarChecks.filter(p => p.pass).length;
        const failedCount = pillarChecks.length - passedCount;
        const totalPenalty = pillarChecks.filter(p => !p.pass).reduce((s, p) => s + p.penaltyWeight, 0);
        const totalSaved = pillarChecks.filter(p => p.pass).reduce((s, p) => s + p.penaltyWeight, 0);
        const compliancePct = Math.round((passedCount / pillarChecks.length) * 100);
        const allPassed = failedCount === 0;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WARNING CARD */}
            {failedCount > 0 && (
              <motion.div
                className="relative rounded-xl overflow-hidden border border-red-500/40"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #ef4444, #f97316, #ef4444, transparent)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="px-5 py-4 bg-gradient-to-br from-red-950/80 via-red-900/40 to-orange-950/30">
                  <div className="flex items-start gap-3 mb-3">
                    <motion.div
                      animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-red-200 leading-tight">
                        Avoid up to <span className="text-cyan-300 text-base font-mono">${totalPenalty.toLocaleString()}</span> in Penalties
                      </p>
                      <p className="text-xs text-red-300/90 mt-1">Complete {failedCount} remaining checkpoint{failedCount > 1 ? 's' : ''} before deadline</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-amber-300/80 uppercase tracking-wider">Compliance Progress</span>
                      <span className={cn("text-xs font-bold font-mono", compliancePct >= 70 ? "text-amber-300" : "text-red-300")}>{compliancePct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/40 overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", compliancePct >= 70 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-orange-400")}
                        initial={{ width: '0%' }}
                        animate={{ width: `${compliancePct}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {pillarChecks.filter(p => !p.pass).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Circle className="h-3 w-3 text-red-400" />
                        <span className="text-red-200">{item.label}</span>
                        <span className="text-cyan-400 ml-auto font-mono text-[10px] font-bold">−${item.penaltyWeight.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-red-500/20">
                    <span className="text-[10px] text-red-300/70 font-mono uppercase tracking-wider">Potential Risk</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">${totalPenalty.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUCCESS / SAVINGS CARD */}
            <motion.div
              className={cn(
                "relative rounded-xl overflow-hidden border",
                allPassed ? "border-emerald-500/40 md:col-span-2" : "border-emerald-500/25"
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: allPassed ? 0.6 : 0.7 }}
            >
              {allPassed && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #10b981, #fbbf24, #10b981, transparent)' }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}
              <div className={cn(
                "px-5 py-4",
                allPassed 
                  ? "bg-gradient-to-br from-emerald-950/80 via-green-900/40 to-teal-950/30" 
                  : "bg-gradient-to-br from-emerald-950/50 via-green-900/25 to-teal-950/20"
              )}>
                <div className="flex items-start gap-3 mb-3">
                  <motion.div
                    animate={allPassed ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                  >
                    {allPassed ? (
                      <Crown className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                    )}
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-emerald-200 leading-tight">
                      {allPassed ? '🎉 Congrats! Full Compliance – Zero Penalty Risk' : 'Already Saved'}
                      {' '}
                      <span className="text-cyan-300 text-base font-mono">${totalSaved.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-emerald-300/80 mt-1">
                      {allPassed ? `All 9 checkpoints verified — $${MAX_POTENTIAL_PENALTY.toLocaleString()} in potential fines avoided` : `${passedCount} of ${pillarChecks.length} checkpoints secured`}
                    </p>
                  </div>
                </div>

                {passedCount > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {pillarChecks.filter(p => p.pass).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-200">{item.label}</span>
                        <span className="text-cyan-400 ml-auto font-mono text-[10px] font-bold">+${item.penaltyWeight.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/15">
                  <span className="text-[10px] text-emerald-300/70 font-mono uppercase tracking-wider">Penalty Shield</span>
                  <Badge className={cn(
                    "text-xs px-3 py-0.5 font-mono border",
                    allPassed 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                      : "bg-amber-500/15 text-amber-300 border-amber-500/25"
                  )}>
                    {allPassed ? '✓ FULLY PROTECTED' : `${compliancePct}% SHIELDED`}
                  </Badge>
                </div>
              </div>
             </motion.div>

            {/* ═══ ROI VALUE PROPOSITION ═══ */}
            {!allPassed && (
              <motion.div
                className="rounded-xl overflow-hidden border border-amber-500/30 relative md:col-span-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
              >
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, #ef4444, #f59e0b, transparent)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                <div className="px-5 py-4 bg-gradient-to-br from-amber-950/60 via-orange-950/40 to-red-950/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-red-500/20 border border-amber-500/30 flex items-center justify-center">
                      <span className="text-lg">⚡</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-200">The Math Doesn't Lie</p>
                      <p className="text-[11px] text-amber-300/60">Simple ROI — what you pay vs what you risk</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/20 p-3 text-center">
                      <p className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-bold mb-1">BuildUnion Pro</p>
                      <p className="text-2xl font-black font-mono text-emerald-300">$19<span className="text-base">.99</span></p>
                      <p className="text-[10px] text-emerald-300/50 mt-0.5">/month</p>
                      <p className="text-[10px] text-emerald-200/70 mt-2 font-medium">$240/year total</p>
                    </div>

                    <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-3 text-center">
                      <p className="text-[10px] text-red-300/60 uppercase tracking-wider font-bold mb-1">Your Risk Right Now</p>
                      <p className="text-2xl font-black font-mono text-red-300">${totalPenalty.toLocaleString()}</p>
                      <p className="text-[10px] text-red-300/50 mt-0.5">in potential fines</p>
                      <p className="text-[10px] text-red-200/70 mt-2 font-medium">
                        {failedCount} unprotected {failedCount === 1 ? 'checkpoint' : 'checkpoints'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const annualCost = 240;
                    const roiMultiplier = Math.round(totalPenalty / annualCost);
                    const gfaValue = gfaCit?.answer ? parseFloat(String(gfaCit.answer).replace(/[^0-9.]/g, '')) : 0;
                    const sizeMultiplier = gfaValue > 2000 ? 2.5 : gfaValue > 1000 ? 1.8 : gfaValue > 500 ? 1.3 : 1;
                    const adjustedRisk = Math.round(totalPenalty * sizeMultiplier);

                    return (
                      <>
                        <div className="rounded-lg bg-gradient-to-r from-amber-950/50 to-orange-950/50 border border-amber-500/20 p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-amber-300/60 uppercase tracking-wider font-bold">Return on Protection</p>
                              <p className="text-xs text-amber-100/80 mt-1">
                                Every $1 spent shields <span className="text-amber-300 font-bold font-mono">${roiMultiplier}</span> in risk
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black font-mono text-amber-300">{roiMultiplier}×</p>
                              <p className="text-[9px] text-amber-300/50">ROI</p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] text-emerald-300/70 font-mono">$19.99</span>
                              <div className="flex-1 h-1.5 rounded-full bg-black/30 overflow-hidden relative">
                                <div className="h-full rounded-full bg-emerald-500/60" style={{ width: '3%' }} />
                                <motion.div
                                  className="absolute top-0 right-0 h-full rounded-full bg-red-500/60"
                                  initial={{ width: '0%' }}
                                  animate={{ width: '97%' }}
                                  transition={{ duration: 1.5, delay: 1 }}
                                />
                              </div>
                              <span className="text-[9px] text-red-300/70 font-mono">${totalPenalty.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {gfaValue > 0 && sizeMultiplier > 1 && (
                          <div className="rounded-lg bg-red-950/25 border border-red-500/15 px-3 py-2 mb-3">
                            <p className="text-[10px] text-red-200/70">
                              📐 Your <span className="text-amber-300 font-bold">{gfaValue.toLocaleString()} sq ft</span> project amplifies risk to{' '}
                              <span className="text-red-300 font-bold font-mono">${adjustedRisk.toLocaleString()}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-amber-500/15">
                          <p className="text-[10px] text-amber-200/60 italic">
                            OBC fines: $5,000–$50,000 per offence · Daily continuing penalties
                          </p>
                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px] font-mono border px-2">
                            {roiMultiplier}× VALUE
                          </Badge>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </div>
        );
      })()}

      {/* OBC Compliance */}
      <motion.div className="rounded-xl border border-cyan-500/40 overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-blue-500/10">
          <span className="text-xl">📜</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-cyan-400">OBC 2024 Compliance</div>
            <div className="text-xs text-amber-200/70">RAG-Powered Building Code Validation</div>
          </div>
          {obcComplianceResults.loading ? (
            <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
          ) : obcComplianceResults.sections.length > 0 ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5 border">
              <CheckCircle2 className="h-3.5 w-3.5" /> {obcComplianceResults.sections.length} Sections
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs gap-1.5 border">
              <AlertTriangle className="h-3.5 w-3.5" /> {obcComplianceResults.error ? 'ERROR' : 'PENDING'}
            </Badge>
          )}
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-amber-200/80 leading-relaxed">Cross-references project verified_facts against Ontario Building Code 2024 Part 9 (Residential) using semantic search and trade-specific mapping.</p>
          {obcComplianceResults.loading && (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
              <span className="text-sm text-cyan-300 font-mono">Running OBC RAG query...</span>
            </div>
          )}
          {obcComplianceResults.error && !obcComplianceResults.loading && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{obcComplianceResults.error}</span>
            </div>
          )}
          {obcComplianceResults.sections.length > 0 && !obcComplianceResults.loading && (
            <div className="space-y-2.5">
              <div className="text-[10px] font-mono text-amber-200/50 uppercase tracking-widest">Applicable OBC Sections</div>
              {obcComplianceResults.sections.map((section, si) => (
                <div key={si} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-sm">
                  <div className="mt-0.5">
                    {section.source === 'trade_mapping' ? <Lock className="h-4 w-4 text-cyan-400" /> : <Sparkles className="h-4 w-4 text-sky-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">§{section.section_number}</span>
                      <span className="text-cyan-300">{section.section_title}</span>
                      <Badge variant="outline" className="text-[9px] px-2 py-0 font-mono text-amber-200/60 border-amber-200/20">{section.source === 'trade_mapping' ? 'MAPPED' : 'SEMANTIC'}</Badge>
                      <span className="text-[10px] font-mono text-amber-200/40">{(section.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                    {section.content && <p className="mt-1.5 text-amber-200/60 text-xs leading-relaxed line-clamp-3">{section.content.slice(0, 300)}{section.content.length > 300 ? '…' : ''}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!obcComplianceResults.loading && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-amber-200/40 font-mono">
                {obcComplianceResults.lastCheckedAt ? `Last checked: ${new Date(obcComplianceResults.lastCheckedAt).toLocaleTimeString()}` : 'Not checked yet'}
              </span>
              <Button variant="outline" size="sm" onClick={onRunObcComplianceCheck} className="text-xs h-7 px-3 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Re-check OBC
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});
DnaAuditPanel.displayName = 'DnaAuditPanel';
