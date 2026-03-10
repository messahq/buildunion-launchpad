// ============================================
// STAGE 8: Grok Insights — Affiliate Recommendations
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileText,
  Info,
  Package,
  RefreshCw,
  AlertTriangle,
  Building2,
  Cloud,
  Hammer,
  Ruler,
  Settings,
  Shield,
  ShieldCheck,
  Thermometer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Citation } from "@/types/citation";

interface GrokInsightsPanelProps {
  citations: Citation[];
  obcSections: any[];
  affiliateProducts: any[];
  grokInsightsLoading: boolean;
  projectId: string;
  onRegenerate: () => void;
}

export const GrokInsightsPanel = React.memo(({
  citations,
  obcSections,
  affiliateProducts,
  grokInsightsLoading,
  projectId,
  onRegenerate,
}: GrokInsightsPanelProps) => {
  const trade = citations.find(c => c.cite_type === 'TRADE_SELECTION')?.answer?.toLowerCase() || '';

  // DB-driven: filter products by trade, fallback to 'general'
  let recommendations = affiliateProducts.filter(p => trade && p.trade && trade.includes(p.trade));
  if (recommendations.length === 0) {
    recommendations = affiliateProducts.filter(p => p.trade === 'general');
  }

  // Priority boost from OBC flags
  const obcKeywords = obcSections.map((s: any) => (s.section_title || '').toLowerCase()).join(' ');
  if (obcKeywords.includes('sound') || obcKeywords.includes('acoustic')) {
    recommendations = recommendations.map(r => r.title.toLowerCase().includes('acoustic') || r.title.toLowerCase().includes('underlay') ? { ...r, priority: 'high' } : r);
  }
  if (obcKeywords.includes('fire') || obcKeywords.includes('flame')) {
    recommendations = recommendations.map(r => r.title.toLowerCase().includes('fire') || r.description?.toLowerCase().includes('flame') ? { ...r, priority: 'high' } : r);
  }

  // Sort: high → medium → low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

  const totalSavings = recommendations.reduce((sum: number, r: any) => sum + (r.savings_amount || 0), 0);
  const hasRisks = recommendations.some((r: any) => r.priority === 'high') || obcSections.length > 0;
  const noProducts = recommendations.length === 0;

  // Loading state
  if (grokInsightsLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-[#0a1628] to-[#0d1a30] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-white/5 bg-[#0b1422]/50 p-4 mb-3">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-cyan-500/10 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-slate-500 text-center mt-3 animate-pulse">Analyzing trade data & OBC flags…</p>
        </div>
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    'volume': <Thermometer className="h-6 w-6 text-white drop-shadow-lg" />,
    'layers': <Ruler className="h-6 w-6 text-white drop-shadow-lg" />,
    'trees': <Building2 className="h-6 w-6 text-white drop-shadow-lg" />,
    'droplets': <Cloud className="h-6 w-6 text-white drop-shadow-lg" />,
    'wind': <RefreshCw className="h-6 w-6 text-white drop-shadow-lg" />,
    'zap': <Zap className="h-6 w-6 text-white drop-shadow-lg" />,
    'cable': <Settings className="h-6 w-6 text-white drop-shadow-lg" />,
    'plug': <Zap className="h-6 w-6 text-white drop-shadow-lg" />,
    'pipette': <Hammer className="h-6 w-6 text-white drop-shadow-lg" />,
    'shield': <Shield className="h-6 w-6 text-white drop-shadow-lg" />,
    'paintbrush': <Hammer className="h-6 w-6 text-white drop-shadow-lg" />,
    'hard-hat': <ShieldCheck className="h-6 w-6 text-white drop-shadow-lg" />,
    'flame': <AlertTriangle className="h-6 w-6 text-white drop-shadow-lg" />,
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-[#0a1628] via-[#0c1a2e] to-[#0d1525] p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white tracking-tight">Grok Insights: Compliant & Cheaper Fixes</h3>
              <p className="text-[10px] text-slate-500">Trade: <span className="text-amber-300 font-medium">{trade || 'general'}</span> · {obcSections.length} OBC flag{obcSections.length !== 1 ? 's' : ''} detected</p>
            </div>
          </div>
          {totalSavings > 0 && (
            <Badge className="text-xs bg-emerald-500/15 text-emerald-300 border-emerald-500/30 px-3 py-1 font-medium">
              Total Save ${Math.round(totalSavings)}+
            </Badge>
          )}
        </div>
      </div>

      {/* ── Conditional: No risks banner ── */}
      {!hasRisks && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-300">All materials compliant</p>
            <p className="text-[10px] text-emerald-400/60">No OBC compliance risks detected. Browse optional upgrades below for cost savings.</p>
          </div>
        </motion.div>
      )}

      {/* ── No Products Fallback ── */}
      {noProducts && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent p-5 text-center"
        >
          <Package className="h-8 w-8 text-amber-400/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300 mb-1">No specific recommendations for this trade</p>
          <p className="text-[11px] text-slate-500 mb-4">Check RONA or Home Depot manually for your materials.</p>
          <div className="flex justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => window.open('https://www.rona.ca', '_blank')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[11px] font-medium hover:bg-cyan-500/35 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Browse RONA
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => window.open('https://www.homedepot.ca', '_blank')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[11px] font-medium hover:bg-cyan-500/35 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Browse Home Depot
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── Product Cards ── */}
      {recommendations.slice(0, 5).map((rec, i) => (
        <Tooltip key={rec.id || i}>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                "rounded-xl border overflow-hidden bg-[#0b1422]/90 hover:bg-[#0d1830]/90 transition-colors group",
                rec.priority === 'high' ? "border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)]" : rec.priority === 'medium' ? "border-amber-500/20" : "border-white/8"
              )}
            >
              {/* Priority strip */}
              <div className={cn("h-[3px]", rec.priority === 'high' ? "bg-gradient-to-r from-red-500 to-red-400" : rec.priority === 'medium' ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-white/10")} />

              <div className="p-4">
                <div className="flex gap-3">
                  {/* Product Icon */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-white/25 group-hover:scale-105",
                    rec.icon_gradient, rec.icon_glow
                  )}>
                    {iconMap[rec.icon_name] || <Package className="h-6 w-6 text-white drop-shadow-lg" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title row + savings badge */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rec.priority === 'high' && (
                          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-widest shrink-0">OBC Risk</span>
                        )}
                        <span className="text-[13px] font-medium text-white leading-tight">{rec.title}</span>
                      </div>
                      {rec.savings_label && (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30 px-2 py-0.5 shrink-0 font-medium whitespace-nowrap">
                          {rec.savings_label}
                        </Badge>
                      )}
                    </div>

                    {/* Reason */}
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{rec.reason}</p>

                    {/* OBC Reference */}
                    {rec.obc_reference && (
                      <div className="flex items-center gap-1.5 mb-2.5 py-0.5 px-2 rounded-md bg-orange-500/10 border border-orange-500/15 w-fit">
                        <FileText className="h-2.5 w-2.5 text-orange-400" />
                        <span className="text-[9px] text-orange-300 font-medium">{rec.obc_reference}</span>
                      </div>
                    )}

                    {/* Price + Buy Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-cyan-300">{rec.price_range}</span>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await supabase.functions.invoke('track-affiliate-click', {
                              body: {
                                product_id: rec.id,
                                project_id: projectId,
                                source: 'grok-insights',
                                affiliate_url: rec.affiliate_url,
                              },
                            });
                          } catch (err) {
                            console.warn('[Affiliate] Click tracking failed:', err);
                          }
                          window.open(rec.affiliate_url, '_blank');
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[11px] font-medium hover:bg-cyan-500/35 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] transition-all"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Buy at {rec.store_name}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[280px] bg-[#0a1628] border-cyan-500/20 text-slate-300">
            <p className="text-xs font-medium text-white mb-1">{rec.title}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">{rec.description}</p>
            {rec.obc_reference && <p className="text-[10px] text-orange-300 mt-1.5">📋 {rec.obc_reference}</p>}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* ── Footer Disclaimer ── */}
      <div className="flex items-start gap-2 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 mt-2">
        <Info className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Affiliate links — BuildUnion earns a small commission at no extra cost to you. Prices are approximate and may vary by location and availability.
        </p>
      </div>

      {/* ── Regenerate Insights ── */}
      {!noProducts && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 text-slate-500 hover:text-slate-300 text-[11px] font-medium transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate Insights
        </motion.button>
      )}
    </div>
  );
});
GrokInsightsPanel.displayName = 'GrokInsightsPanel';
