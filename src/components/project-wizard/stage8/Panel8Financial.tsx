// ============================================
// PANEL 8: Financial Summary (Card + Fullscreen)
// ============================================
// CRITICAL: Owner-only panel — Foreman/Worker see lock screen
// Card view: compact donut + tax strip + trend chart
// Fullscreen view: 3D command center with phase breakdown
// ============================================

import React from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Hammer,
  Users,
  AlertTriangle,
  LockKeyhole,
  Ruler,
  FileCheck,
  MapPin,
  Shield,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Citation } from "@/types/citation";
import { PendingChangeBadge } from "@/components/projects/PendingChangeBadge";
import type { TaskWithChecklist, PanelConfig } from "./types";
import { TASK_PHASES } from "./constants";

// ============================================
// PROPS
// ============================================
export interface ContractItem {
  id: string;
  contract_number: string;
  status: string;
  total_amount: number | null;
  share_token?: string | null;
}

export interface FinancialSummaryData {
  material_cost: number | null;
  labor_cost: number | null;
  total_cost: number | null;
}

export interface Panel8FinancialProps {
  mode: 'card' | 'fullscreen';
  citations: Citation[];
  panelCitations: Citation[];
  contracts: ContractItem[];
  financialSummary: FinancialSummaryData | null;
  tasks: TaskWithChecklist[];
  canViewFinancials: boolean;
  userRole: string;
  myPendingChanges: { id: string; item_name: string; status: string }[];
}

// ============================================
// TAX HELPERS
// ============================================
const getTaxRate = (address: string): { rate: number; name: string; province: string } => {
  const a = address.toLowerCase();
  if (a.includes('ontario') || a.includes(', on') || a.includes('toronto')) return { rate: 0.13, name: 'HST', province: 'Ontario' };
  if (a.includes('quebec') || a.includes(', qc') || a.includes('montreal')) return { rate: 0.14975, name: 'GST+QST', province: 'Quebec' };
  if (a.includes('british columbia') || a.includes(', bc') || a.includes('vancouver')) return { rate: 0.12, name: 'GST+PST', province: 'British Columbia' };
  if (a.includes('alberta') || a.includes(', ab') || a.includes('calgary') || a.includes('edmonton')) return { rate: 0.05, name: 'GST', province: 'Alberta' };
  if (a.includes('manitoba') || a.includes(', mb')) return { rate: 0.12, name: 'GST+PST', province: 'Manitoba' };
  if (a.includes('saskatchewan') || a.includes(', sk')) return { rate: 0.11, name: 'GST+PST', province: 'Saskatchewan' };
  if (a.includes('nova scotia') || a.includes(', ns')) return { rate: 0.15, name: 'HST', province: 'Nova Scotia' };
  if (a.includes('new brunswick') || a.includes(', nb')) return { rate: 0.15, name: 'HST', province: 'New Brunswick' };
  if (a.includes('newfoundland') || a.includes(', nl')) return { rate: 0.15, name: 'HST', province: 'Newfoundland' };
  if (a.includes('prince edward') || a.includes(', pe')) return { rate: 0.15, name: 'HST', province: 'PEI' };
  return { rate: 0.13, name: 'HST', province: 'Ontario' };
};

// ============================================
// SHARED FINANCIAL COMPUTATIONS
// ============================================
function useFinancialData(citations: Citation[], panelCitations: Citation[], contracts: Panel8FinancialProps['contracts'], financialSummary: Panel8FinancialProps['financialSummary'], tasks: TaskWithChecklist[]) {
  const totalContractValue = contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const budgetCitation = panelCitations.find(c => c.cite_type === 'BUDGET');
  const materialCitation = panelCitations.find(c => c.cite_type === 'MATERIAL');
  const demoPriceCitation = panelCitations.find(c => c.cite_type === 'DEMOLITION_PRICE');
  const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
  const locationCitation = citations.find(c => c.cite_type === 'LOCATION');

  const gfaValue = typeof gfaCitation?.value === 'number'
    ? gfaCitation.value
    : typeof gfaCitation?.metadata?.gfa_value === 'number'
      ? gfaCitation.metadata.gfa_value
      : null;

  const storedMaterialCost = financialSummary?.material_cost ?? null;
  const storedLaborCost = financialSummary?.labor_cost ?? null;
  const storedTotalCost = financialSummary?.total_cost ?? null;

  const materialCost = storedMaterialCost ?? (
    typeof materialCitation?.value === 'number'
      ? materialCitation.value
      : typeof materialCitation?.metadata?.total === 'number'
        ? materialCitation.metadata.total
        : null
  );

  const laborCost = storedLaborCost ?? null;

  const demoCost = typeof demoPriceCitation?.value === 'number' && gfaValue
    ? demoPriceCitation.value * gfaValue
    : null;

  const rawBudget = storedTotalCost ?? (
    typeof budgetCitation?.value === 'number'
      ? budgetCitation.value
      : totalContractValue > 0
        ? totalContractValue
        : null
  );
  const budgetTotal = rawBudget !== null
    ? rawBudget + (demoCost || 0)
    : null;

  const locationAddress = typeof locationCitation?.answer === 'string'
    ? locationCitation.answer
    : typeof locationCitation?.metadata?.formatted_address === 'string'
      ? locationCitation.metadata.formatted_address
      : '';

  const taxInfo = getTaxRate(locationAddress);
  const netTotal = budgetTotal || totalContractValue || 0;
  const taxAmount = netTotal * taxInfo.rate;
  const grossTotal = netTotal + taxAmount;

  const hasFinancialData = budgetTotal !== null || materialCost !== null || laborCost !== null || totalContractValue > 0;

  // Phase trend data
  const phaseTrendGroups = tasks
    .filter(t => t.isSubTask && t.templateItemCost && t.templateItemCost > 0)
    .reduce<Record<string, number>>((acc, t) => {
      const phase = t.phase || 'installation';
      acc[phase] = (acc[phase] || 0) + t.templateItemCost!;
      return acc;
    }, {});

  const phaseColors: Record<string, string> = {
    demolition: 'hsl(0, 70%, 55%)',
    preparation: 'hsl(35, 80%, 50%)',
    installation: 'hsl(220, 75%, 55%)',
    finishing: 'hsl(145, 65%, 45%)',
  };
  const phaseOrder = ['demolition', 'preparation', 'installation', 'finishing'];
  const phaseLabels: Record<string, string> = { demolition: 'Demo', preparation: 'Prep', installation: 'Install', finishing: 'Finish' };

  let cum = 0;
  const trendPts = phaseOrder
    .filter(k => phaseTrendGroups[k] && phaseTrendGroups[k] > 0)
    .map(k => {
      cum += phaseTrendGroups[k];
      return { label: phaseLabels[k], value: cum, phaseValue: phaseTrendGroups[k], color: phaseColors[k] };
    });
  if (trendPts.length > 0) trendPts.unshift({ label: 'Start', value: 0, phaseValue: 0, color: 'rgba(251,191,36,0.4)' });
  const trendTotal = cum;

  const spentCompleted = tasks
    .filter(t => t.isSubTask && t.templateItemCost && t.templateItemCost > 0 && (t.status === 'completed' || t.status === 'done'))
    .reduce((s, t) => s + t.templateItemCost!, 0);

  let currentPhaseIdx = 0;
  if (trendPts.length > 1) {
    for (let i = 1; i < trendPts.length; i++) {
      if (trendPts[i].value >= spentCompleted) { currentPhaseIdx = i; break; }
    }
    if (spentCompleted <= 0) currentPhaseIdx = 0;
  }

  const costItems = [
    materialCost !== null && { name: 'Materials', value: materialCost, color: 'hsl(200, 80%, 50%)', icon: Hammer },
    laborCost !== null && { name: 'Labor', value: laborCost, color: 'hsl(160, 80%, 45%)', icon: Users },
    demoCost !== null && demoCost > 0 && { name: 'Demo', value: demoCost, color: 'hsl(280, 70%, 55%)', icon: AlertTriangle },
  ].filter(Boolean) as { name: string; value: number; color: string; icon: any }[];
  const costTotal = costItems.reduce((s, i) => s + i.value, 0);

  // Fullscreen extras
  const liveLaborCost = tasks
    .filter(t => ['active', 'in-progress', 'in_progress', 'completed', 'done'].includes(t.status?.toLowerCase() || ''))
    .reduce((sum, t) => sum + (t.templateItemCost || 0), 0);

  const actualSpent = tasks
    .filter(t => ['completed', 'done'].includes(t.status?.toLowerCase() || ''))
    .reduce((sum, t) => sum + (t.templateItemCost || 0), 0);

  const inProgressCost = tasks
    .filter(t => ['active', 'in-progress', 'in_progress', 'ordered'].includes(t.status?.toLowerCase() || ''))
    .reduce((sum, t) => sum + (t.templateItemCost || 0), 0);

  return {
    totalContractValue, gfaValue, gfaCitation, demoPriceCitation, locationCitation,
    materialCost, laborCost, demoCost, budgetTotal,
    taxInfo, netTotal, taxAmount, grossTotal,
    hasFinancialData,
    trendPts, trendTotal, spentCompleted, currentPhaseIdx,
    costItems, costTotal,
    storedMaterialCost: storedMaterialCost || 0,
    storedLaborCost: storedLaborCost || 0,
    storedTotalCost,
    liveLaborCost, actualSpent, inProgressCost,
    phaseTrendGroups, phaseColors, phaseOrder, phaseLabels,
  };
}

// ============================================
// LOCK SCREEN (Foreman/Worker)
// ============================================
function FinancialLockScreen({ userRole, myPendingChanges }: { userRole: string; myPendingChanges: Panel8FinancialProps['myPendingChanges'] }) {
  const canRequestModification = userRole === 'foreman' || userRole === 'subcontractor';

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

      {canRequestModification && myPendingChanges.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
            Your Pending Modifications
          </p>
          <div className="space-y-1">
            {myPendingChanges.slice(0, 3).map(change => (
              <div key={change.id} className="flex items-center justify-between text-xs">
                <span className="truncate max-w-[150px]">{change.item_name}</span>
                <PendingChangeBadge status={change.status} compact />
              </div>
            ))}
            {myPendingChanges.length > 3 && (
              <p className="text-[10px] text-muted-foreground">+{myPendingChanges.length - 3} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CARD VIEW
// ============================================
function FinancialCardView({ data }: { data: ReturnType<typeof useFinancialData> }) {
  const {
    grossTotal, costItems, costTotal, taxInfo, taxAmount,
    hasFinancialData, gfaValue, budgetTotal, totalContractValue,
    trendPts, trendTotal, spentCompleted, currentPhaseIdx,
  } = data;

  const cardGross = grossTotal;

  if (!hasFinancialData) {
    return (
      <div className="p-6 rounded-lg border text-center" style={{ background: 'rgba(2,6,23,0.75)', borderColor: 'rgba(148,163,184,0.25)' }}>
        <DollarSign className="h-8 w-8 text-cyan-300/70 mx-auto mb-2" />
        <p className="text-xs text-white/90">No financial data</p>
        <p className="text-[10px] text-cyan-200/80 mt-1">Add budget or contracts to activate</p>
      </div>
    );
  }

  return (
    <>
      {/* 3D dark header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border p-3"
        style={{
          background: 'linear-gradient(135deg, rgba(2,6,23,0.95) 0%, rgba(15,23,42,0.92) 60%, rgba(8,47,73,0.88) 100%)',
          borderColor: 'rgba(34,211,238,0.35)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.45), 0 0 24px rgba(34,211,238,0.12)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.75), transparent)' }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ scale: [1, 1.06, 1], boxShadow: ['0 0 8px rgba(34,211,238,0.35)', '0 0 16px rgba(34,211,238,0.6)', '0 0 8px rgba(34,211,238,0.35)'] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,1), rgba(16,185,129,1))' }}
            >
              <DollarSign className="h-4 w-4 text-white" />
            </motion.div>
            <div>
              <h4 className="text-sm font-black text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}>Financial Command</h4>
              <p className="text-[9px] font-mono text-cyan-200/90" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>LIVE BUDGET OVERVIEW</p>
            </div>
          </div>
          {cardGross > 0 && (
            <span className="text-base font-black text-cyan-200 font-mono" style={{ textShadow: '0 2px 10px rgba(34,211,238,0.35)' }}>
              ${Math.round(cardGross).toLocaleString()}
            </span>
          )}
        </div>
      </motion.div>

      {/* Donut + legend */}
      {costItems.length > 0 && (
        <div
          className="grid grid-cols-[auto_1fr] gap-3 items-center rounded-xl border p-3"
          style={{
            background: 'linear-gradient(145deg, rgba(2,6,23,0.9) 0%, rgba(12,20,38,0.86) 100%)',
            borderColor: 'rgba(34,211,238,0.22)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 20px rgba(0,0,0,0.35)',
          }}
        >
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {(() => {
                if (costTotal === 0) return null;
                const radius = 38;
                const circumference = 2 * Math.PI * radius;
                let offset = 0;
                return costItems.map((item, idx) => {
                  const pct = item.value / costTotal;
                  const dashLen = pct * circumference;
                  const dashGap = circumference - dashLen;
                  const dashOffset = -offset * circumference;
                  offset += pct;
                  return (
                    <circle
                      key={idx}
                      cx="50" cy="50" r={radius}
                      fill="none" stroke={item.color} strokeWidth="12"
                      strokeDasharray={`${dashLen} ${dashGap}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="butt" opacity="0.95"
                      style={{ filter: `drop-shadow(0 0 3px ${item.color})` }}
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-white leading-none" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                ${costTotal > 1000 ? `${(costTotal / 1000).toFixed(1)}K` : costTotal.toLocaleString()}
              </span>
              <span className="text-[7px] text-cyan-200/90 font-mono">TOTAL</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {costItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}` }} />
                    <Icon className="h-3 w-3" style={{ color: item.color }} />
                    <span className="text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.75)' }}>{item.name}</span>
                  </div>
                  <span className="text-[11px] font-black text-cyan-100 font-mono" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.75)' }}>${item.value.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tax strip */}
      <div
        className="flex items-center justify-between rounded-lg border px-2 py-1.5"
        style={{ background: 'rgba(2,6,23,0.84)', borderColor: 'rgba(34,211,238,0.18)' }}
      >
        <span className="text-[10px] text-cyan-200/90 font-mono">{taxInfo.name} ({(taxInfo.rate * 100).toFixed(1)}%)</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-100/90 font-mono">+${taxAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="text-[11px] font-black text-white font-mono">${cardGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Trend chart */}
      {trendPts.length >= 2 && (() => {
        const filteredPts = trendPts.filter(d => d.label !== 'Start');
        const maxVal = Math.max(...trendPts.map(d => d.value), 1);
        const W = 200, H = 48, padX = 4, padY = 4;
        const usableW = W - padX * 2, usableH = H - padY * 2;
        const allPts = [{ label: '', value: 0, phaseValue: 0, color: '' }, ...filteredPts];
        const linePoints = allPts.map((d, i) => ({
          x: padX + (i / (allPts.length - 1)) * usableW,
          y: padY + usableH - (d.value / maxVal) * usableH,
        }));
        const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        const areaPath = `${linePath} L${linePoints[linePoints.length - 1].x},${H} L${linePoints[0].x},${H} Z`;
        let spentX = padX;
        for (let i = 1; i < allPts.length; i++) {
          if (allPts[i].value >= spentCompleted) {
            const prev = allPts[i - 1];
            const ratio = prev.value === allPts[i].value ? 1 : (spentCompleted - prev.value) / (allPts[i].value - prev.value);
            spentX = linePoints[i - 1].x + ratio * (linePoints[i].x - linePoints[i - 1].x);
            break;
          }
          if (i === allPts.length - 1) spentX = linePoints[i].x;
        }
        return (
          <div
            className="rounded-lg border p-2"
            style={{ background: 'linear-gradient(145deg, rgba(2,6,23,0.9) 0%, rgba(8,18,36,0.85) 100%)', borderColor: 'rgba(34,211,238,0.22)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-cyan-200/90 uppercase tracking-widest font-semibold">Spending by Phase</span>
              <span className="text-[8px] font-mono">
                <span className="text-emerald-300 font-bold">${spentCompleted.toLocaleString()}</span>
                <span className="text-cyan-100/50"> / ${trendTotal.toLocaleString()}</span>
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
              <defs>
                <linearGradient id="canvasAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(34,211,238)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="rgb(34,211,238)" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#canvasAreaGrad)" />
              <path d={linePath} fill="none" stroke="rgb(34,211,238)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              {linePoints.slice(1).map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={filteredPts[i]?.color || 'rgb(34,211,238)'} stroke="white" strokeWidth="0.8" />
              ))}
              <line x1={spentX} y1={padY} x2={spentX} y2={H} stroke="rgb(16,185,129)" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
              <circle cx={spentX} cy={padY + 1} r="2" fill="rgb(16,185,129)" />
            </svg>
            <div className="flex justify-between mt-0.5">
              {filteredPts.map((d, i) => (
                <span key={d.label} className={`text-[7px] font-mono flex-1 text-center ${i === Math.max(0, currentPhaseIdx - 1) ? 'text-cyan-200 font-bold' : 'text-cyan-200/70'}`}>{d.label}</span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* GFA + contracts */}
      <div className="flex gap-1.5">
        {gfaValue !== null && budgetTotal !== null && (
          <div
            className="flex-1 p-2 rounded-lg border flex items-center gap-2"
            style={{ background: 'rgba(2,6,23,0.82)', borderColor: 'rgba(34,211,238,0.2)' }}
          >
            <Ruler className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-black text-white font-mono">${(budgetTotal / gfaValue).toFixed(2)}<span className="text-[8px] text-cyan-200/90">/sqft</span></p>
              <p className="text-[8px] text-cyan-100/85">{gfaValue.toLocaleString()} sq ft</p>
            </div>
          </div>
        )}
        {data.contracts.length > 0 && (
          <div
            className="flex-1 p-2 rounded-lg border flex items-center gap-2"
            style={{ background: 'rgba(2,6,23,0.82)', borderColor: 'rgba(34,211,238,0.2)' }}
          >
            <FileCheck className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-black text-white">{data.contracts.length} contract{data.contracts.length > 1 ? 's' : ''}</p>
              {totalContractValue > 0 && <p className="text-[8px] text-cyan-100/90 font-mono">${totalContractValue.toLocaleString()}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================
// FULLSCREEN VIEW
// ============================================
function FinancialFullscreenView({ data }: { data: ReturnType<typeof useFinancialData> }) {
  const {
    grossTotal, netTotal, taxAmount, taxInfo,
    hasFinancialData, gfaValue, gfaCitation, budgetTotal, totalContractValue,
    costItems, costTotal,
    trendPts, trendTotal, spentCompleted, currentPhaseIdx,
    storedMaterialCost, storedLaborCost, storedTotalCost,
    liveLaborCost, actualSpent, inProgressCost,
    phaseTrendGroups,
  } = data;

  const costBreakdownData = [
    { name: 'Materials', value: storedMaterialCost, color: 'hsl(200, 80%, 50%)', icon: Hammer },
    { name: 'Labor', value: storedLaborCost, color: 'hsl(160, 80%, 45%)', icon: Users },
    { name: 'Demolition', value: data.demoCost || 0, color: 'hsl(280, 70%, 55%)', icon: AlertTriangle },
  ].filter(item => item.value > 0);
  const totalForPercentage = costBreakdownData.reduce((sum, item) => sum + item.value, 0);

  const fsbudgetTotal = (storedTotalCost ?? totalContractValue) + (data.demoCost || 0);
  const glassCard = "relative rounded-2xl border overflow-hidden";
  const glassInner = "relative z-10";

  // Catmull-Rom for smooth curve
  const catmullRom = (points: {x:number,y:number}[]) => {
    if (points.length < 2) return '';
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  return (
    <div className="space-y-4" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #0d1420 100%)', margin: '-16px', padding: '20px', borderRadius: '16px' }}>

      {/* ═══ 3D HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20, rotateX: 15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className={glassCard}
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(6,182,212,0.06) 50%, rgba(16,185,129,0.08) 100%)',
          borderColor: 'rgba(14,165,233,0.25)',
          boxShadow: '0 8px 32px rgba(14,165,233,0.15), 0 0 60px rgba(14,165,233,0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
          perspective: '800px',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(14,165,233,0.5) 50%, transparent 95%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 15%, rgba(16,185,129,0.3) 50%, transparent 85%)' }} />
        <svg className="absolute top-2 right-3 opacity-20" width="48" height="48" viewBox="0 0 48 48">
          <motion.polygon points="24,2 44,14 44,34 24,46 4,34 4,14" fill="none" stroke="rgba(6,182,212,0.6)" strokeWidth="1" animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: 'center' }} />
          <motion.polygon points="24,8 38,17 38,31 24,40 10,31 10,17" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="0.8" animate={{ rotate: [360, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: 'center' }} />
        </svg>
        <div className={`${glassInner} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ boxShadow: ['0 0 15px rgba(14,165,233,0.3)', '0 0 30px rgba(14,165,233,0.6)', '0 0 15px rgba(14,165,233,0.3)'], scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4, #10b981)', boxShadow: '0 4px 15px rgba(14,165,233,0.4)' }}
              >
                <DollarSign className="h-6 w-6 text-white drop-shadow-lg" />
              </motion.div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight" style={{ textShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
                  Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">Command</span>
                </h4>
                <p className="text-[10px] text-amber-200/90 font-mono tracking-wider">REAL-TIME BUDGET ANALYTICS</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-cyan-300/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> {taxInfo.province}
              </span>
              <span className="text-[9px] text-emerald-300/90 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                <Unlock className="h-2.5 w-2.5" /> Owner Access
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ GROSS TOTAL ═══ */}
      {hasFinancialData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center py-5 relative"
          style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 100">
            <motion.ellipse cx="150" cy="50" rx="130" ry="35" fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="0.5" animate={{ ry: [35, 40, 35] }} transition={{ duration: 4, repeat: Infinity }} />
            <motion.ellipse cx="150" cy="50" rx="100" ry="25" fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth="0.5" animate={{ ry: [25, 30, 25] }} transition={{ duration: 3, repeat: Infinity }} />
          </svg>
          <p className="text-[10px] text-amber-200/90 uppercase tracking-[0.3em] font-mono mb-1">Gross Total (Estimated)</p>
          <motion.p
            initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-4xl font-black text-transparent bg-clip-text font-mono leading-none"
            style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4, #22d3ee)', textShadow: '0 0 40px rgba(16,185,129,0.3)' }}
          >
            ${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </motion.p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="text-[10px] text-amber-200/90 font-mono">Net: <span className="text-white font-semibold">${netTotal.toLocaleString()}</span></span>
            <span className="text-amber-300/40">|</span>
            <span className="text-[10px] text-amber-200/90 font-mono">{taxInfo.name} {(taxInfo.rate * 100).toFixed(1)}%: <span className="text-white font-semibold">+${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span></span>
          </div>
        </motion.div>
      )}

      {/* ═══ TASK PROGRESS ═══ */}
      {(() => {
        const totalT = data.tasks.length;
        const completedT = data.tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
        const inProgressT = data.tasks.filter(t => t.status === 'in_progress').length;
        const progressPct = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
        if (totalT === 0) return null;
        const circumference = 2 * Math.PI * 32;
        const completedDash = (completedT / totalT) * circumference;
        const inProgressDash = (inProgressT / totalT) * circumference;
        const inProgressOffset = circumference - completedDash;

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className={glassCard}
            style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(6,182,212,0.03) 100%)', borderColor: 'rgba(14,165,233,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)' }}
          >
            <div className={`${glassInner} p-4`}>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="5" />
                    <motion.circle cx="40" cy="40" r="32" fill="none" stroke="url(#progressGradFS)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - completedDash }} transition={{ duration: 1.2, delay: 0.3 }} style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }} />
                    {inProgressT > 0 && (
                      <motion.circle cx="40" cy="40" r="32" fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${inProgressDash} ${circumference - inProgressDash}`} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: inProgressOffset }} transition={{ duration: 1.2, delay: 0.5 }} />
                    )}
                    <defs><linearGradient id="progressGradFS" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-white leading-none">{progressPct}%</span>
                    <span className="text-[7px] text-amber-200/90 uppercase tracking-wider mt-0.5">Done</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Task Progress</span>
                    <span className="text-sm font-bold text-white font-mono">{completedT}<span className="text-cyan-400/50">/{totalT}</span></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Done', count: completedT, color: '#10b981' },
                      { label: 'Active', count: inProgressT, color: '#fbbf24' },
                      { label: 'Pending', count: totalT - completedT - inProgressT, color: 'rgba(14,165,233,0.3)' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className="h-1.5 w-1.5 rounded-full mx-auto mb-1" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                        <p className="text-sm font-bold text-white/90 font-mono leading-none">{s.count}</p>
                        <p className="text-[8px] text-amber-200/90 uppercase mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {hasFinancialData ? (
        <>
          {/* ═══ ACTUAL vs PLANNED ═══ */}
          {(actualSpent > 0 || inProgressCost > 0) && (
            <motion.div initial={{ opacity: 0, y: 15, rotateX: 5 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.2 }}
              className={glassCard}
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.04) 100%)', borderColor: 'rgba(16,185,129,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 30px rgba(16,185,129,0.05)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(16,185,129,0.4) 50%, transparent 90%)' }} />
              <div className={`${glassInner} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                    <span className="text-[10px] text-amber-200/90 uppercase tracking-[0.2em] font-bold">Live Cost Tracker</span>
                  </div>
                  <span className="text-sm font-black text-emerald-300 font-mono" style={{ textShadow: '0 0 10px rgba(16,185,129,0.4)' }}>
                    ${actualSpent.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'SPENT', value: actualSpent, gradient: 'from-emerald-500/20 to-emerald-600/10', border: 'rgba(16,185,129,0.3)', textColor: 'text-emerald-300', glow: 'rgba(16,185,129,0.2)' },
                    { label: 'COMMITTED', value: inProgressCost, gradient: 'from-amber-500/15 to-amber-600/8', border: 'rgba(251,191,36,0.25)', textColor: 'text-amber-300', glow: 'rgba(251,191,36,0.15)' },
                    { label: 'REMAINING', value: Math.max(0, fsbudgetTotal - actualSpent - inProgressCost), gradient: 'from-cyan-500/15 to-sky-600/8', border: 'rgba(14,165,233,0.25)', textColor: (fsbudgetTotal - actualSpent - inProgressCost) < 0 ? 'text-red-400' : 'text-cyan-300', glow: 'rgba(14,165,233,0.15)' },
                  ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                      className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} text-center`}
                      style={{ border: `1px solid ${item.border}`, boxShadow: `0 4px 15px rgba(0,0,0,0.2), 0 0 15px ${item.glow}` }}
                    >
                      <p className="text-[8px] text-amber-100 uppercase tracking-widest font-bold mb-1">{item.label}</p>
                      <p className={`text-base font-black ${item.textColor} font-mono leading-none`}>${item.value.toLocaleString()}</p>
                    </motion.div>
                  ))}
                </div>
                {fsbudgetTotal > 0 && (
                  <div className="mt-3">
                    <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.12)' }}>
                      {actualSpent > 0 && (
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((actualSpent / fsbudgetTotal) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }}
                          className="h-full rounded-l-full" style={{ background: 'linear-gradient(90deg, #10b981, #06b6d4)', boxShadow: '0 0 10px rgba(16,185,129,0.4)' }} />
                      )}
                      {inProgressCost > 0 && (
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((inProgressCost / fsbudgetTotal) * 100, 100 - (actualSpent / fsbudgetTotal) * 100)}%` }} transition={{ duration: 1, delay: 0.5 }}
                          className="h-full" style={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }} />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 4px #10b981' }} /><span className="text-[9px] text-amber-200/90">Spent</span></div>
                        <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ background: '#fbbf24', boxShadow: '0 0 4px #fbbf24' }} /><span className="text-[9px] text-amber-200/90">Committed</span></div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300/70 font-bold">
                        {Math.round(((actualSpent + inProgressCost) / fsbudgetTotal) * 100)}% utilized
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ NET → TAX → GROSS ═══ */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="grid grid-cols-3 gap-2">
            {[
              { label: 'Net (Planned)', value: `$${netTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, gradient: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)', dot: '#0ea5e9', textCls: 'text-white font-mono' },
              { label: `${taxInfo.name} ${(taxInfo.rate * 100).toFixed(1)}%`, value: `+$${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, gradient: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', dot: '#6366f1', textCls: 'text-indigo-200 font-mono' },
              { label: 'Gross (Est.)', value: `$${grossTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, gradient: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', dot: '#10b981', textCls: 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 font-mono' },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }}
                className="p-3 rounded-xl relative overflow-hidden"
                style={{ background: item.gradient, border: `1px solid ${item.border}`, boxShadow: `0 4px 15px rgba(0,0,0,0.2)` }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.dot, boxShadow: `0 0 4px ${item.dot}` }} />
                  <span className="text-[8px] text-amber-100 uppercase tracking-widest font-bold">{item.label}</span>
                </div>
                <p className={`text-lg font-black ${item.textCls} leading-tight`}>{item.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* ═══ COST BREAKDOWN DONUT ═══ */}
          {costBreakdownData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className={glassCard}
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(99,102,241,0.04) 100%)', borderColor: 'rgba(14,165,233,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <div className={`${glassInner} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-amber-200/90 uppercase tracking-[0.2em] font-bold">Budget Allocation</span>
                  <span className="text-[10px] text-amber-100 font-mono">${totalForPercentage.toLocaleString()} total</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {costBreakdownData.map((item, index) => {
                        const previousTotal = costBreakdownData.slice(0, index).reduce((sum, i) => sum + i.value, 0);
                        const startAngle = (previousTotal / totalForPercentage) * 360;
                        const endAngle = ((previousTotal + item.value) / totalForPercentage) * 360;
                        const gap = 3;
                        const adjustedStart = startAngle + gap / 2;
                        const adjustedEnd = endAngle - gap / 2;
                        if (adjustedEnd <= adjustedStart) return null;
                        const largeArc = adjustedEnd - adjustedStart > 180 ? 1 : 0;
                        const startRad = (adjustedStart - 90) * Math.PI / 180;
                        const endRad = (adjustedEnd - 90) * Math.PI / 180;
                        const outerR = 42, innerR = 28;
                        return (
                          <motion.path key={item.name}
                            d={`M ${50 + outerR * Math.cos(startRad)} ${50 + outerR * Math.sin(startRad)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${50 + outerR * Math.cos(endRad)} ${50 + outerR * Math.sin(endRad)} L ${50 + innerR * Math.cos(endRad)} ${50 + innerR * Math.sin(endRad)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${50 + innerR * Math.cos(startRad)} ${50 + innerR * Math.sin(startRad)} Z`}
                            fill={item.color}
                            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 + index * 0.12 }}
                            style={{ transformOrigin: 'center', filter: `drop-shadow(0 0 4px ${item.color})` }}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-black text-white leading-none">${(totalForPercentage / 1000).toFixed(1)}K</span>
                      <span className="text-[7px] text-amber-200/90 mt-0.5">TOTAL</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {costBreakdownData.map((item, i) => {
                      const ItemIcon = item.icon;
                      const pct = ((item.value / totalForPercentage) * 100).toFixed(1);
                      return (
                        <motion.div key={item.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}22`, border: `1px solid ${item.color}44` }}>
                            <ItemIcon className="h-3.5 w-3.5" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-white/90">{item.name}</span>
                              <span className="text-xs font-black text-white font-mono">${item.value.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(14,165,233,0.1)' }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                              </div>
                              <span className="text-[10px] text-amber-200/90 font-mono w-10 text-right">{pct}%</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ PHASE BREAKDOWN ═══ */}
          {(() => {
            const phaseGroups = data.tasks
              .filter(t => t.isSubTask && t.templateItemCost && t.templateItemCost > 0)
              .reduce<Record<string, { total: number; count: number; items: { title: string; cost: number }[] }>>((acc, t) => {
                const phase = t.phase || 'installation';
                if (!acc[phase]) acc[phase] = { total: 0, count: 0, items: [] };
                acc[phase].total += t.templateItemCost!;
                acc[phase].count += 1;
                acc[phase].items.push({ title: t.title, cost: t.templateItemCost! });
                return acc;
              }, {});
            const phaseEntries = TASK_PHASES.filter(p => phaseGroups[p.key]);
            const phaseTotal = phaseEntries.reduce((s, p) => s + phaseGroups[p.key].total, 0);
            if (phaseEntries.length === 0) return null;
            const phaseClrs: Record<string, string> = { demolition: '#ef4444', preparation: '#f59e0b', installation: '#3b82f6', finishing: '#10b981' };
            return (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #6366f1, #8b5cf6)' }} />
                    <span className="text-[10px] text-amber-200/90 uppercase tracking-[0.2em] font-bold">Phase Breakdown</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-100 font-bold">${phaseTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  {phaseEntries.map((phase, i) => {
                    const group = phaseGroups[phase.key];
                    const pct = phaseTotal > 0 ? ((group.total / phaseTotal) * 100).toFixed(1) : '0';
                    const color = phaseClrs[phase.key] || '#3b82f6';
                    return (
                      <motion.div key={phase.key} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.08 }}
                        className="p-3 rounded-xl"
                        style={{ background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`, border: `1px solid ${color}25`, boxShadow: `0 2px 10px rgba(0,0,0,0.2)` }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-md" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
                            <span className="text-xs font-bold text-white/90">{phase.label}</span>
                            <span className="text-[9px] text-amber-200/80 font-mono">({group.count})</span>
                          </div>
                          <span className="text-sm font-black text-white font-mono">${group.total.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                              className="h-full rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                          </div>
                          <span className="text-[10px] text-amber-200/90 font-mono w-10 text-right">{pct}%</span>
                        </div>
                        <div className="mt-2 space-y-0.5 pl-5">
                          {group.items.map((item, j) => (
                            <div key={j} className="flex items-center justify-between">
                              <span className="text-[10px] text-amber-200/80 truncate max-w-[60%]">• {item.title}</span>
                              <span className="text-[10px] font-mono text-amber-100">${item.cost.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}

          {/* ═══ SPENDING TREND CHART ═══ */}
          {(() => {
            const filteredPts = trendPts.filter((_, i) => i > 0);
            if (filteredPts.length < 1 || trendPts.length < 2) return null;
            const maxV = Math.max(...trendPts.map(p => p.value), 1);
            const W = 320, H = 110, padX = 28, padY = 14, padB = 20;
            const usableW = W - padX * 2, usableH = H - padY - padB;
            const allPts = [{ label: '', value: 0, phaseValue: 0, color: '' }, ...filteredPts];
            const lnPts = allPts.map((d, i) => ({ x: padX + (i / (allPts.length - 1)) * usableW, y: padY + usableH - (d.value / maxV) * usableH }));
            const curvePath = catmullRom(lnPts);
            const areaPath = `${curvePath} L${lnPts[lnPts.length - 1].x},${padY + usableH} L${lnPts[0].x},${padY + usableH} Z`;
            const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({ y: padY + usableH - pct * usableH, val: Math.round(pct * maxV) }));
            let spentX = padX;
            let fsCurrentIdx = 0;
            for (let i = 1; i < allPts.length; i++) {
              if (allPts[i].value >= spentCompleted) {
                const prev = allPts[i - 1];
                const ratio = prev.value === allPts[i].value ? 1 : (spentCompleted - prev.value) / (allPts[i].value - prev.value);
                spentX = lnPts[i - 1].x + ratio * (lnPts[i].x - lnPts[i - 1].x);
                fsCurrentIdx = i;
                break;
              }
              if (i === allPts.length - 1) spentX = lnPts[i].x;
            }
            if (spentCompleted <= 0) fsCurrentIdx = 0;

            return (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className={glassCard}
                style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(59,130,246,0.04) 100%)', borderColor: 'rgba(14,165,233,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              >
                <div className={`${glassInner} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #0ea5e9, #3b82f6)' }} />
                      <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Spending by Phase</span>
                    </div>
                    <span className="text-[10px] font-mono">
                      <span className="text-emerald-400 font-bold">${spentCompleted.toLocaleString()}</span>
                      <span className="text-white/30"> / ${trendTotal.toLocaleString()}</span>
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
                    <defs>
                      <linearGradient id="fs3dAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(6,182,212)" stopOpacity="0.4" />
                        <stop offset="40%" stopColor="rgb(14,165,233)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="rgb(14,165,233)" stopOpacity="0.01" />
                      </linearGradient>
                      <filter id="fs3dGlow"><feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgb(6,182,212)" floodOpacity="0.5" /></filter>
                    </defs>
                    {gridLines.map((g, i) => (
                      <g key={i}>
                        <line x1={padX} y1={g.y} x2={W - padX} y2={g.y} stroke="rgba(14,165,233,0.08)" strokeWidth="0.5" />
                        <text x={padX - 4} y={g.y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" style={{ fontSize: 7, fontFamily: 'monospace' }}>{g.val >= 1000 ? `${(g.val / 1000).toFixed(0)}k` : g.val}</text>
                      </g>
                    ))}
                    <path d={areaPath} fill="url(#fs3dAreaGrad)" />
                    <path d={curvePath} fill="none" stroke="rgb(6,182,212)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#fs3dGlow)" />
                    {lnPts.slice(1).map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="6" fill={filteredPts[i]?.color || '#0ea5e9'} stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${filteredPts[i]?.color || '#0ea5e9'})` }} />
                        <text x={p.x} y={p.y - 9} textAnchor="middle" fill="white" style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700 }}>${filteredPts[i]?.phaseValue >= 1000 ? `${(filteredPts[i].phaseValue / 1000).toFixed(1)}k` : filteredPts[i]?.phaseValue.toLocaleString()}</text>
                        <text x={p.x} y={padY + usableH + 14} textAnchor="middle" style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: (i + 1) === fsCurrentIdx ? 700 : 400 }} fill={(i + 1) === fsCurrentIdx ? '#22d3ee' : 'rgba(255,255,255,0.5)'}>{filteredPts[i]?.label}{(i + 1) === fsCurrentIdx ? ' ●' : ''}</text>
                      </g>
                    ))}
                    <line x1={spentX} y1={padY - 2} x2={spentX} y2={padY + usableH} stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
                    <rect x={spentX - 16} y={padY - 12} width="32" height="12" rx="4" fill="#10b981" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))' }} />
                    <text x={spentX} y={padY - 3} textAnchor="middle" fill="white" style={{ fontSize: 7, fontFamily: 'monospace', fontWeight: 700 }}>SPENT</text>
                  </svg>
                </div>
              </motion.div>
            );
          })()}

          {/* ═══ GFA + Cost/sqft ═══ */}
          {gfaCitation && gfaValue && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid rgba(14,165,233,0.15)' }}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.15))', border: '1px solid rgba(14,165,233,0.25)' }}>
                <Ruler className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[9px] text-amber-200/90 uppercase tracking-widest font-bold">Gross Floor Area</p>
                <p className="text-sm font-black text-white">{gfaValue.toLocaleString()} <span className="text-[10px] text-cyan-300/60 font-normal">sq ft</span></p>
              </div>
              {(budgetTotal || 0) > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-[9px] text-amber-200/90 uppercase tracking-widest font-bold">Cost/sqft</p>
                  <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300 font-mono">
                    ${((budgetTotal || 0) / gfaValue).toFixed(2)}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ CONTRACTS ═══ */}
          {data.contracts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-4 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #ec4899, #f43f5e)' }} />
                <span className="text-[10px] text-amber-200/90 uppercase tracking-[0.2em] font-bold">Contracts ({data.contracts.length})</span>
              </div>
              {data.contracts.map((contract, i) => (
                <motion.div key={contract.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.06 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(244,63,94,0.04) 100%)', border: '1px solid rgba(236,72,153,0.2)', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-pink-400/80" />
                    <span className="font-mono text-xs text-white/80">#{contract.contract_number}</span>
                    <Badge variant={contract.status === 'signed' ? 'default' : 'outline'}
                      className={cn("text-[9px] px-1.5 py-0", contract.status === 'signed' && 'bg-green-500/20 text-green-300 border-green-500/30')}
                    >
                      {contract.status}
                    </Badge>
                  </div>
                  {contract.total_amount != null && (
                    <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 font-mono" style={{ textShadow: '0 0 10px rgba(236,72,153,0.3)' }}>
                      ${contract.total_amount.toLocaleString()}
                    </span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="p-10 rounded-xl text-center"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.03) 100%)', border: '1px dashed rgba(251,191,36,0.2)' }}
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <DollarSign className="h-14 w-14 text-amber-500/30 mx-auto mb-4" />
          </motion.div>
          <p className="text-sm font-bold text-white/60">No Financial Data</p>
          <p className="text-xs text-white/30 mt-1.5 max-w-xs mx-auto">Add budget, materials, or contracts to activate</p>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// MAIN EXPORT
// ============================================
export function Panel8Financial(props: Panel8FinancialProps) {
  const { mode, citations, panelCitations, contracts, financialSummary, tasks, canViewFinancials, userRole, myPendingChanges } = props;

  // Lock screen for non-owners
  if (!canViewFinancials) {
    return <FinancialLockScreen userRole={userRole} myPendingChanges={myPendingChanges} />;
  }

  const data = useFinancialData(citations, panelCitations, contracts, financialSummary, tasks);
  // Attach contracts for sub-components
  (data as any).contracts = contracts;
  (data as any).tasks = tasks;

  if (mode === 'fullscreen') {
    return <FinancialFullscreenView data={data} />;
  }

  return (
    <div className="space-y-3">
      <FinancialCardView data={data} />
    </div>
  );
}
