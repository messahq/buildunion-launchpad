// ============================================
// PANEL 3: Trade & Template (Card + Fullscreen)
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Hammer, Lock, Settings, ClipboardList, ChevronRight,
  Zap, Edit2, Check, X, Pencil,
} from "lucide-react";
import type { Citation } from "@/types/citation";
import { PendingChangeBadge } from "@/components/projects/PendingChangeBadge";
import { MaterialTracker } from "@/components/materials/MaterialTracker";

// ============================================
// SVG DECORATIVE SHAPES
// ============================================
const HexShape = ({ x, y, size, opacity = 0.4 }: { x: number; y: number; size: number; opacity?: number }) => (
  <polygon
    points={Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
    }).join(' ')}
    fill="none"
    stroke={`rgba(6,182,212,${opacity})`}
    strokeWidth="1.2"
  />
);

const SphereShape = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="rgba(20,28,45,0.96)" stroke="rgba(6,182,212,0.28)" strokeWidth="1.1" />
    <ellipse cx={cx - r * 0.25} cy={cy - r * 0.25} rx={r * 0.38} ry={r * 0.22} fill="rgba(6,182,212,0.14)" transform={`rotate(-30 ${cx - r * 0.25} ${cy - r * 0.25})`} />
  </g>
);

const StackedPlates = ({ x, y, w, h, layers }: { x: number; y: number; w: number; h: number; layers: number }) => (
  <g>
    {Array.from({ length: layers }, (_, i) => (
      <rect key={i} x={x + i * 1.5} y={y + i * (h + 2)} width={w} height={h} rx={2}
        fill={`rgba(18,27,44,${0.98 - i * 0.06})`} stroke={`rgba(6,182,212,${0.3 - i * 0.04})`} strokeWidth="0.95" />
    ))}
  </g>
);

const MolecularNode = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="rgba(15,23,42,0.98)" stroke="rgba(6,182,212,0.38)" strokeWidth="1" />
    <circle cx={cx} cy={cy} r={r * 0.4} fill="rgba(6,182,212,0.16)" />
  </g>
);

// ============================================
// TRADE TEMPLATE GENERATOR
// ============================================
const getTemplateForTrade = (trade: string, gfa: number | null) => {
  if (gfa === null || gfa === 0) return { materials: [] as { name: string; qty: number; unit: string }[], hasData: false };
  const tradeLower = trade.toLowerCase().replace(/ /g, '_');
  const templates: Record<string, { name: string; qty: number; unit: string }[]> = {
    painting: [
      { name: 'Interior Paint (Premium)', qty: Math.ceil(gfa / 350), unit: 'gal' },
      { name: 'Primer', qty: Math.ceil(gfa / 400), unit: 'gal' },
      { name: 'Supplies (Brushes, Rollers, Tape)', qty: 1, unit: 'kit' },
      { name: 'Drop Cloths', qty: Math.ceil(gfa / 500), unit: 'pcs' },
      { name: 'Caulking', qty: Math.ceil(gfa / 300), unit: 'tubes' },
    ],
    flooring: [
      { name: 'Hardwood Flooring', qty: gfa, unit: 'sq ft' },
      { name: 'Underlayment', qty: gfa, unit: 'sq ft' },
      { name: 'Transition Strips', qty: Math.ceil(gfa / 200), unit: 'pcs' },
      { name: 'Baseboards', qty: Math.round(4 * Math.sqrt(gfa) * 0.85), unit: 'ln ft' },
    ],
    drywall: [
      { name: 'Drywall Sheets (4x8)', qty: Math.ceil(gfa / 32), unit: 'sheets' },
      { name: 'Joint Compound', qty: Math.ceil(gfa / 500), unit: 'buckets' },
      { name: 'Drywall Tape', qty: Math.ceil(gfa / 100), unit: 'rolls' },
      { name: 'Screws', qty: Math.ceil(gfa / 50), unit: 'boxes' },
    ],
  };
  const materials = templates[tradeLower]
    || Object.entries(templates).find(([key]) => tradeLower.includes(key))?.[1]
    || null;
  if (!materials) return { materials: [] as { name: string; qty: number; unit: string }[], hasData: false };
  return { materials, hasData: true };
};

// ============================================
// PROPS
// ============================================
export interface Panel3Props {
  mode: 'card' | 'fullscreen';
  citations: Citation[];
  panelCitations: Citation[];
  renderCitationValue: (citation: Citation) => React.ReactNode;
  userRole: string;
  canEdit?: boolean;
  pendingChanges?: { item_id: string; status: string }[];
  // Card-mode foreman modification
  onRequestModification?: (material: { name: string; qty: number; unit: string; idx: number }) => void;
  // Fullscreen-mode owner edit
  editingMaterialIdx?: number | null;
  setEditingMaterialIdx?: (idx: number | null) => void;
  editMaterialQty?: string;
  setEditMaterialQty?: (qty: string) => void;
  onMaterialEditConfirm?: (idx: number, qty: string) => void;
  // Material tracker
  projectId?: string;
  userId?: string;
}

// ============================================
// COMPONENT
// ============================================
export const Panel3Trade: React.FC<Panel3Props> = ({
  mode,
  citations,
  panelCitations,
  renderCitationValue,
  userRole,
  canEdit = false,
  pendingChanges = [],
  onRequestModification,
  editingMaterialIdx,
  setEditingMaterialIdx,
  editMaterialQty,
  setEditMaterialQty,
  onMaterialEditConfirm,
  projectId,
  userId,
}) => {
  const tradeCitation = citations.find(c => c.cite_type === 'TRADE_SELECTION');
  const templateCitation = citations.find(c => c.cite_type === 'TEMPLATE_LOCK');
  const workTypeCitation = citations.find(c => c.cite_type === 'WORK_TYPE');
  const gfaCitation = citations.find(c => c.cite_type === 'GFA_LOCK');
  const executionCitation = citations.find(c => c.cite_type === 'EXECUTION_MODE');

  const hasTradeCitation = tradeCitation || workTypeCitation;
  const selectedTradeLabel = tradeCitation?.answer || null;
  const selectedTradeKey = (tradeCitation?.value as string) || (tradeCitation?.metadata?.trade_key as string) || null;
  const workTypeAnswer = workTypeCitation?.answer || null;
  const displayLabel = selectedTradeLabel || workTypeAnswer || null;
  const tradeKey = selectedTradeKey || (templateCitation?.metadata?.trade_key as string) || selectedTradeLabel?.toLowerCase().replace(/ /g, '_') || null;

  const gfaValue = typeof gfaCitation?.value === 'number' ? gfaCitation.value : typeof gfaCitation?.metadata?.gfa_value === 'number' ? gfaCitation.metadata.gfa_value : null;

  const wastePercent = typeof templateCitation?.metadata?.waste_percent === 'number'
    ? templateCitation.metadata.waste_percent
    : (templateCitation?.metadata?.items as any[])?.some?.((item: any) => item.applyWaste) ? 10 : mode === 'fullscreen' ? 10 : 0;

  // Priority: saved items from Stage 3, then hardcoded template
  const savedItems = (templateCitation?.metadata?.items as any[]) || [];
  let template: { materials: { name: string; qty: number; unit: string }[]; hasData: boolean };
  if (savedItems.length > 0) {
    const mats = savedItems.filter((item: any) => item.category === 'material').map((item: any) => ({
      name: item.name, qty: item.quantity || item.baseQuantity || 0, unit: item.unit || 'units',
    }));
    template = { materials: mats, hasData: mats.length > 0 };
  } else if (tradeKey) {
    template = getTemplateForTrade(tradeKey, gfaValue);
  } else {
    template = { materials: [], hasData: false };
  }

  const materialsWithWaste = template.materials.map(mat => {
    const applyWaste = mat.unit === 'sq ft' || mat.unit === 'ln ft' || mat.unit === 'sheets' || mat.unit === 'rolls';
    if (applyWaste && wastePercent > 0) {
      return { ...mat, qty: Math.ceil(mat.qty * (1 + wastePercent / 100)), hasWaste: true };
    }
    return { ...mat, hasWaste: false };
  });

  const bestCitationSource = tradeCitation || workTypeCitation;
  const materialCount = materialsWithWaste.length;
  const totalUnitsNeeded = materialsWithWaste.reduce((sum, m) => sum + m.qty, 0);
  const isForeman = userRole === 'foreman' || userRole === 'subcontractor';

  // ======= CARD MODE =======
  if (mode === 'card') {
    return (
      <div className="space-y-2.5">
        {/* Trade Hero */}
        <div className="relative overflow-hidden rounded-xl min-h-[160px]"
          style={{ background: 'linear-gradient(160deg, rgba(8,15,30,0.98), rgba(15,23,42,0.97))', border: '1px solid rgba(6,182,212,0.14)', boxShadow: 'inset 0 0 0 1px rgba(6,182,212,0.06), 0 8px 24px rgba(0,0,0,0.28)' }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 8%, rgba(6,182,212,0.36) 50%, transparent 92%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(6,182,212,0.18) 50%, transparent 80%)' }} />
          <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.24), transparent 62%)' }} />
          <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.24), transparent 62%)' }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice">
            <HexShape x={348} y={35} size={24} opacity={0.32} />
            <HexShape x={380} y={60} size={16} opacity={0.2} />
            <HexShape x={325} y={58} size={12} opacity={0.14} />
            <SphereShape cx={44} cy={40} r={18} />
            <SphereShape cx={82} cy={68} r={11} />
            <StackedPlates x={18} y={134} w={54} h={7} layers={4} />
            <MolecularNode cx={320} cy={168} r={9} />
            <MolecularNode cx={350} cy={154} r={7} />
            <MolecularNode cx={376} cy={172} r={8} />
            <line x1={329} y1={168} x2={343} y2={154} stroke="rgba(6,182,212,0.22)" strokeWidth="1" />
            <line x1={357} y1={154} x2={368} y2={172} stroke="rgba(6,182,212,0.22)" strokeWidth="1" />
            <HexShape x={108} y={168} size={9} opacity={0.16} />
          </svg>
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-cyan-400/60">Trade</span>
              {hasTradeCitation ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[8px] font-medium text-emerald-300/90">Active</span>
                </div>
              ) : <span className="text-[8px] text-slate-500">Not Set</span>}
            </div>
            <div className="flex items-center justify-between">
              <p className={cn("text-xl font-semibold capitalize leading-tight tracking-tight", hasTradeCitation ? "text-white" : "text-slate-500")}>{displayLabel || '—'}</p>
              {hasTradeCitation && <ChevronRight className="h-4 w-4 text-slate-500" />}
            </div>
            {gfaValue !== null && <p className="text-[10px] text-slate-400 mt-1">@ {gfaValue.toLocaleString()} sq ft</p>}
            {bestCitationSource && <p className="text-[8px] text-cyan-200/90 font-mono mt-1">cite: [{bestCitationSource.id.slice(0, 8)}]</p>}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Materials', value: materialCount, color: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.14)' },
            { label: 'Total Qty', value: totalUnitsNeeded.toLocaleString(), color: 'rgba(6,182,212,0.05)', borderColor: 'rgba(6,182,212,0.1)' },
            { label: 'Waste', value: `+${wastePercent}%`, color: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.12)' },
          ].map(s => (
            <div key={s.label} className="rounded-lg px-2.5 py-2 text-center" style={{ background: s.color, border: `1px solid ${s.borderColor}` }}>
              <p className="text-[7px] font-mono uppercase tracking-widest text-slate-500 mb-0.5">{s.label}</p>
              <p className="text-base font-semibold text-white leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Materials */}
        {template.hasData && materialsWithWaste.length > 0 && (
          <div className="relative rounded-xl overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(8,15,30,0.97), rgba(15,23,42,0.95))', border: '1px solid rgba(6,182,212,0.08)' }}>
            <svg className="absolute top-0 right-0 w-24 h-12 pointer-events-none" viewBox="0 0 96 48">
              <MolecularNode cx={20} cy={24} r={5} />
              <MolecularNode cx={45} cy={16} r={4} />
              <MolecularNode cx={68} cy={22} r={5.5} />
              <MolecularNode cx={88} cy={14} r={3.5} />
              <line x1={25} y1={24} x2={41} y2={16} stroke="rgba(6,182,212,0.12)" strokeWidth="0.6" />
              <line x1={49} y1={16} x2={62.5} y2={22} stroke="rgba(6,182,212,0.12)" strokeWidth="0.6" />
              <line x1={73.5} y1={22} x2={84.5} y2={14} stroke="rgba(6,182,212,0.12)" strokeWidth="0.6" />
            </svg>
            <div className="relative z-10">
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.12)' }}>
                    <ClipboardList className="h-2.5 w-2.5 text-cyan-400/80" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-300">Material Requirements</span>
                </div>
                {templateCitation && <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>}
              </div>
              {materialsWithWaste.map((mat, idx) => {
                const materialPending = pendingChanges.find(pc => pc.item_id === `material_${idx}` && pc.status === 'pending');
                return (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 group" style={{ borderBottom: idx < materialsWithWaste.length - 1 ? '1px solid rgba(6,182,212,0.04)' : 'none' }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[11px] text-slate-200 truncate">{mat.name}</span>
                      {mat.hasWaste && <span className="text-[8px] font-medium text-amber-400/70 shrink-0">+{wastePercent}%</span>}
                      {materialPending && <PendingChangeBadge status="pending" compact />}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-white">{mat.qty.toLocaleString()} {mat.unit}</span>
                      {isForeman && !materialPending && onRequestModification && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRequestModification({ name: mat.name, qty: mat.qty, unit: mat.unit, idx })}>
                          <Edit2 className="h-3 w-3 text-slate-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Data */}
        {!template.hasData && (
          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(8,15,30,0.6)', border: '1px dashed rgba(6,182,212,0.1)' }}>
            <Hammer className="h-5 w-5 text-slate-600 mx-auto mb-1" />
            <p className="text-[10px] text-slate-500 italic">
              {!tradeCitation && workTypeCitation ? 'Select a specific trade in Definition stage'
                : !hasTradeCitation ? 'No trade selected'
                : gfaValue === null ? 'GFA required'
                : 'Template will appear after trade selection'}
            </p>
          </div>
        )}

        {/* Template Locked */}
        {templateCitation && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(6,182,212,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <Lock className="h-2.5 w-2.5 text-amber-400/80" />
                </div>
                <span className="text-[10px] font-medium text-slate-400">Template Locked</span>
              </div>
              <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>
            </div>
            <p className="text-xs font-semibold text-amber-300 mt-1 truncate">{templateCitation.answer}</p>
          </div>
        )}

        {/* Execution Mode */}
        {executionCitation && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(6,182,212,0.06)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.12)' }}>
                  <Settings className="h-2.5 w-2.5 text-slate-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400">Execution Mode</span>
              </div>
              <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{executionCitation.id.slice(0, 8)}]</span>
            </div>
            <p className="text-xs font-semibold capitalize text-white mt-1">{executionCitation.answer}</p>
          </div>
        )}

        {/* All Citations */}
        {panelCitations.length > 0 && (
          <div className="pt-2 space-y-1" style={{ borderTop: '1px solid rgba(6,182,212,0.06)' }}>
            <p className="text-[9px] font-mono uppercase tracking-wider text-cyan-300/80 mb-1">All Citations</p>
            {panelCitations.map(c => (
              <div key={c.id} className="text-[10px] flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(8,15,30,0.5)', border: '1px solid rgba(6,182,212,0.05)' }}>
                <span className="text-slate-300 font-medium">{c.cite_type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">{renderCitationValue(c)}</span>
                  <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{c.id.slice(0, 6)}]</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ======= FULLSCREEN MODE =======
  const fsMaterialCount = materialsWithWaste.length;
  const fsTotalUnits = materialsWithWaste.reduce((sum, m) => sum + m.qty, 0);
  const fsWastedCount = materialsWithWaste.filter(m => m.hasWaste).length;
  const avgUnitsPerMat = fsMaterialCount > 0 ? Math.round(fsTotalUnits / fsMaterialCount) : 0;

  return (
    <div className="space-y-4">
      {/* Trade Hero — Fullscreen */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 min-h-[180px]"
        style={{ background: 'linear-gradient(160deg, rgba(8,15,30,0.98), rgba(15,23,42,0.97))', border: selectedTradeLabel ? '1px solid rgba(245,158,11,0.2)' : '1px dashed rgba(100,116,139,0.25)', boxShadow: 'inset 0 0 0 1px rgba(6,182,212,0.08), 0 10px 30px rgba(0,0,0,0.35)' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 8%, rgba(6,182,212,0.38) 50%, transparent 92%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(6,182,212,0.2) 50%, transparent 80%)' }} />
        <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.25), transparent 65%)' }} />
        <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.25), transparent 65%)' }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 220" preserveAspectRatio="xMidYMid slice">
          <HexShape x={420} y={34} size={30} opacity={0.32} />
          <HexShape x={458} y={60} size={20} opacity={0.2} />
          <HexShape x={392} y={62} size={14} opacity={0.14} />
          <SphereShape cx={50} cy={40} r={20} />
          <SphereShape cx={96} cy={68} r={12} />
          <StackedPlates x={24} y={138} w={66} h={8} layers={4} />
          <MolecularNode cx={376} cy={168} r={10} />
          <MolecularNode cx={414} cy={152} r={8} />
          <MolecularNode cx={448} cy={172} r={9} />
          <line x1={386} y1={168} x2={406} y2={152} stroke="rgba(6,182,212,0.24)" strokeWidth="1" />
          <line x1={422} y1={152} x2={439} y2={172} stroke="rgba(6,182,212,0.24)" strokeWidth="1" />
          <HexShape x={150} y={165} size={10} opacity={0.16} />
        </svg>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-cyan-400/60">Trade</span>
            {tradeCitation && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-medium text-emerald-300/90">Active</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h4 className={cn("text-2xl font-semibold capitalize leading-tight tracking-tight", selectedTradeLabel ? "text-white" : "text-slate-500")}>
              {selectedTradeLabel || 'No Trade Selected'}
            </h4>
          </div>
          {workTypeAnswer && selectedTradeLabel && <p className="text-xs text-cyan-300/50 mt-0.5">{workTypeAnswer}</p>}
          {gfaValue !== null && <p className="text-sm text-slate-400 mt-1">@ {gfaValue.toLocaleString()} sq ft</p>}
          {bestCitationSource && <p className="text-[9px] text-cyan-200/90 font-mono mt-2">cite: [{bestCitationSource.id.slice(0, 8)}]</p>}
        </div>
      </motion.div>

      {/* Stats Row — Fullscreen */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Materials', value: String(fsMaterialCount), color: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.14)' },
          { label: 'Total Qty', value: fsTotalUnits.toLocaleString(), color: 'rgba(6,182,212,0.05)', borderColor: 'rgba(6,182,212,0.1)' },
          { label: 'Waste Items', value: String(fsWastedCount), color: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.12)' },
          { label: 'Avg/Material', value: String(avgUnitsPerMat), color: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.12)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-2.5 text-center" style={{ background: s.color, border: `1px solid ${s.borderColor}` }}>
            <p className="text-[8px] font-mono uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
            <p className="text-lg font-bold text-white leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Materials Table — Fullscreen */}
      {template.hasData && materialsWithWaste.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(8,15,30,0.97), rgba(15,23,42,0.95))', border: '1px solid rgba(6,182,212,0.08)' }}>
          <svg className="absolute top-0 right-0 w-36 h-12 pointer-events-none" viewBox="0 0 144 48">
            <MolecularNode cx={30} cy={32} r={6.5} />
            <MolecularNode cx={65} cy={20} r={5} />
            <MolecularNode cx={100} cy={30} r={6} />
            <MolecularNode cx={136} cy={18} r={5} />
            <line x1={36.5} y1={32} x2={60.5} y2={20} stroke="rgba(6,182,212,0.24)" strokeWidth="1" />
            <line x1={71.5} y1={20} x2={95} y2={30} stroke="rgba(6,182,212,0.24)" strokeWidth="1" />
            <line x1={109} y1={30} x2={131} y2={18} stroke="rgba(6,182,212,0.24)" strokeWidth="1" />
          </svg>
          <div className="relative z-10">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(6,182,212,0.06)' }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.12)' }}>
                  <ClipboardList className="h-2.5 w-2.5 text-cyan-400/80" />
                </div>
                <span className="text-xs font-medium text-slate-300">Material Requirements</span>
              </div>
              {templateCitation && <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>}
            </div>
            {materialsWithWaste.map((mat, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5 group" style={{ borderBottom: idx < materialsWithWaste.length - 1 ? '1px solid rgba(6,182,212,0.04)' : 'none' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-slate-200 truncate">{mat.name}</span>
                  {mat.hasWaste && <span className="text-[8px] font-medium text-amber-400/70 shrink-0">+{wastePercent}%</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {editingMaterialIdx === idx ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={editMaterialQty} onChange={(e) => setEditMaterialQty?.(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onMaterialEditConfirm?.(idx, editMaterialQty || '');
                          if (e.key === 'Escape') { setEditingMaterialIdx?.(null); setEditMaterialQty?.(''); }
                        }}
                        className="w-20 h-8 text-sm font-semibold" autoFocus />
                      <span className="text-xs text-slate-400">{mat.unit}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onMaterialEditConfirm?.(idx, editMaterialQty || '')}>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingMaterialIdx?.(null); setEditMaterialQty?.(''); }}>
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-white">{mat.qty.toLocaleString()} {mat.unit}</span>
                      {userRole === 'owner' && canEdit && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { setEditingMaterialIdx?.(idx); setEditMaterialQty?.(String(mat.qty)); }}>
                          <Pencil className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Material Delivery Tracker */}
      {template.hasData && materialsWithWaste.length > 0 && projectId && userId && (
        <MaterialTracker
          projectId={projectId}
          userId={userId}
          userRole={userRole}
          expectedMaterials={materialsWithWaste.map(m => ({ name: m.name, qty: m.qty, unit: m.unit }))}
        />
      )}

      {/* Template Locked */}
      {templateCitation && (
        <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(6,182,212,0.08)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <Lock className="h-2.5 w-2.5 text-amber-400/80" />
              </div>
              <span className="text-xs font-medium text-slate-400">Template Locked</span>
            </div>
            <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{templateCitation.id.slice(0, 8)}]</span>
          </div>
          <p className="text-sm font-semibold text-amber-300 mt-1.5 truncate">{templateCitation.answer}</p>
        </div>
      )}

      {/* Execution Mode */}
      {executionCitation && (
        <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(6,182,212,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.12)' }}>
                <Settings className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <span className="text-xs font-medium text-slate-400">Execution Mode</span>
            </div>
            <span className="text-[8px] text-cyan-200/90 font-mono">cite: [{executionCitation.id.slice(0, 8)}]</span>
          </div>
          <p className="text-sm font-semibold capitalize text-white mt-1.5">{executionCitation.answer}</p>
        </div>
      )}

      {/* No Data */}
      {!template.hasData && (
        <div className="p-8 rounded-2xl text-center" style={{ background: 'rgba(8,15,30,0.6)', border: '1px dashed rgba(6,182,212,0.1)' }}>
          <Hammer className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">
            {!tradeCitation && workTypeCitation ? 'Select a specific trade in Definition stage'
              : !selectedTradeLabel ? 'No trade selected'
              : gfaValue === null ? 'GFA required to calculate materials'
              : 'Template will appear after trade selection'}
          </p>
        </div>
      )}
    </div>
  );
};
