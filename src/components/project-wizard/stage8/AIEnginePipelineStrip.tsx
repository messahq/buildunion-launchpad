// ============================================
// AI ENGINE PIPELINE STRIP
// ============================================
// Extracted from Stage8FinalReview — the 5-engine visual pipeline
// with holographic Toronto skyline background and MESSA conductor.
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AIEngineType } from "@/components/project-wizard/AIEngineReportModal";

import torontoCyberpunkSkyline from "@/assets/toronto-cyberpunk-skyline.png";
import engineGeminiImg from "@/assets/engine-gemini.png";
import engineGptImg from "@/assets/engine-gpt.png";
import engineClaudeImg from "@/assets/engine-claude.png";
import engineLovableImg from "@/assets/engine-lovable.png";
import engineGrokImg from "@/assets/engine-grok.png";

interface AIEnginePipelineStripProps {
  activePipelineStep: number;
  openEnginePopover: string | null;
  setOpenEnginePopover: (name: string | null) => void;
  onEngineReport: (engineType: AIEngineType) => void;
}

const PIPELINE_STEPS = ['Visual', 'Core', 'DNA', 'UI', 'Insights'] as const;

const ENGINE_CONFIG = [
  { name: 'Gemini', label: 'Files Report', img: engineGeminiImg, textColor: 'text-cyan-400', badge: 'T', badgeColor: 'bg-cyan-500/20 text-cyan-300', territory: 'Files & Contracts, Weather, Site Log', glowColor: 'rgba(6,182,212,0.35)', accentColor: '#06b6d4', description: 'Gemini: Visual & Site Analysis — Analyzes site photos & blueprints using visual AI.', capabilities: ['📸 Photo & Blueprint Analysis', '🌦️ Weather Integration', '📋 Visual Site Logging'], reportType: 'gemini-visual' as AIEngineType, pipelineLabel: PIPELINE_STEPS[0] },
  { name: 'GPT', label: 'Data Audit', img: engineGptImg, textColor: 'text-emerald-400', badge: 'AI', badgeColor: 'bg-emerald-500/20 text-emerald-300', territory: 'Project Core, Area/GFA, Trade, Financial', glowColor: 'rgba(16,185,129,0.35)', accentColor: '#10b981', description: 'GPT: Core Data Engine — Area calculations, GFA estimates, trade selection, and financial breakdowns.', capabilities: ['📐 Area & GFA Calculations', '🔧 Trade Template Engine', '💰 Financial Analysis'], reportType: 'gpt-audit' as AIEngineType, pipelineLabel: PIPELINE_STEPS[1] },
  { name: 'Claude', label: 'OBC Compliance', img: engineClaudeImg, textColor: 'text-orange-400', badge: 'AI', badgeColor: 'bg-orange-500/20 text-orange-300', territory: 'OBC Alignment, Regulatory', glowColor: 'rgba(251,146,60,0.35)', accentColor: '#fb923c', description: 'Claude: OBC Compliance — Validates against Ontario Building Code 2024, Part 9 compliance.', capabilities: ['⚖️ OBC 2024 Compliance', '🏗️ Part 9 Validation', '🚨 Risk Flagging'], reportType: 'claude-obc' as AIEngineType, pipelineLabel: PIPELINE_STEPS[2] },
  { name: 'Lovable', label: 'DNA Audit', img: engineLovableImg, textColor: 'text-pink-400', badge: 'AI', badgeColor: 'bg-pink-500/20 text-pink-300', territory: 'DNA Audit, Team Architecture', glowColor: 'rgba(236,72,153,0.35)', accentColor: '#ec4899', description: 'Lovable: DNA & UI Engine — Project readiness audit, team roles, execution timeline.', capabilities: ['🧬 DNA Readiness Audit', '👥 Team Architecture', '📅 Execution Timeline'], reportType: 'lovable-dna' as AIEngineType, pipelineLabel: PIPELINE_STEPS[3] },
  { name: 'Grok', label: 'Market & Schedule', img: engineGrokImg, textColor: 'text-amber-300', badge: 'dl', badgeColor: 'bg-amber-500/20 text-amber-300', territory: 'Market Pricing, Scheduling, Affiliate Hub', glowColor: 'rgba(251,191,36,0.5)', accentColor: '#fbbf24', description: 'Grok: Market & Schedule — Real-time market pricing intelligence, weather-aware schedule optimization, affiliate suppliers, and cost-saving strategies.', capabilities: ['📊 Material Price Trends & Supplier Comparison', '📅 Schedule Optimization (weather-aware timing)', '🏪 Affiliate Suppliers & Cost-Saving', '⚡ Real-Time Market Intelligence'], reportType: 'grok-insights' as AIEngineType, pipelineLabel: PIPELINE_STEPS[4] },
];

export function AIEnginePipelineStrip({
  activePipelineStep,
  openEnginePopover,
  setOpenEnginePopover,
  onEngineReport,
}: AIEnginePipelineStripProps) {
  return (
    <div className="shrink-0 border-b border-white/5 bg-[#0d1117]/95 backdrop-blur-md group/strip">
      <div className="px-1 sm:px-3 lg:px-4 py-2 sm:py-3 border-b border-white/5 overflow-hidden relative">

        {/* ═══ HOLOGRAPHIC BACKGROUND — Cityscape Left + Right ═══ */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* LEFT */}
          <div className="absolute left-0 top-0 bottom-0 w-[40%] opacity-80 group-hover/strip:opacity-100 transition-opacity duration-1000 overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(6,182,212,0.008) 3px, rgba(6,182,212,0.008) 6px)' }}
              animate={{ backgroundPositionY: ['0px', '12px'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
            />
            <img src={torontoCyberpunkSkyline} alt="" className="absolute w-full object-cover object-left-center"
              style={{ top: '-20%', height: '140%', filter: 'brightness(1.2) contrast(1.1) hue-rotate(200deg)', mixBlendMode: 'screen', opacity: 1 }}
            />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 60%, rgba(6,182,212,0.08) 0%, transparent 50%)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d1117]" />
          </div>
          {/* RIGHT */}
          <div className="absolute right-0 top-0 bottom-0 w-[40%] opacity-80 group-hover/strip:opacity-100 transition-opacity duration-1000 overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,92,246,0.008) 3px, rgba(139,92,246,0.008) 6px)' }}
              animate={{ backgroundPositionY: ['0px', '-12px'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
            />
            <img src={torontoCyberpunkSkyline} alt="" className="absolute w-full object-cover object-right-center"
              style={{ top: '-20%', height: '140%', filter: 'brightness(1.2) contrast(1.1) hue-rotate(200deg)', mixBlendMode: 'screen', opacity: 1, transform: 'scaleX(-1)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0d1117]" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 sm:gap-2 relative z-10">
          {/* Engine Icons with Connecting Lines */}
          <div className="relative flex items-center justify-center gap-0 sm:gap-2 overflow-x-auto scrollbar-hide py-1 max-w-full px-1">
            {ENGINE_CONFIG.map((engine, i) => {
              const isActive = i === activePipelineStep;
              const prevActive = (i - 1) === activePipelineStep;
              return (
                <React.Fragment key={engine.name}>
                  {i > 0 && (
                    <div className="relative flex items-center h-10 sm:h-14 lg:h-[68px] shrink-0" style={{ width: 'clamp(12px, 3vw, 48px)' }}>
                      <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full transition-all duration-500"
                        style={{ background: isActive || prevActive
                          ? 'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(255,255,255,0.8), rgba(251,191,36,0.6))'
                          : 'linear-gradient(90deg, rgba(251,146,60,0.15), rgba(255,255,255,0.12), rgba(251,146,60,0.15))'
                        }}
                      />
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full"
                        style={{
                          width: '8px',
                          background: isActive || prevActive
                            ? 'linear-gradient(90deg, transparent, #fbbf24, #ffffff, #fbbf24, transparent)'
                            : 'linear-gradient(90deg, transparent, rgba(251,146,60,0.4), rgba(255,255,255,0.3), rgba(251,146,60,0.4), transparent)',
                          boxShadow: isActive || prevActive
                            ? '0 0 8px rgba(251,191,36,0.6)'
                            : '0 0 4px rgba(251,146,60,0.2)',
                        }}
                        animate={{ left: ['-8px', 'calc(100% + 8px)'] }}
                        transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
                      />
                      <div className="absolute top-1/2 right-0 -translate-y-1/2"
                        style={{ width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: isActive ? '5px solid rgba(251,191,36,0.7)' : '4px solid rgba(251,146,60,0.25)' }}
                      />
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                        style={{ background: 'rgba(251,146,60,0.3)', boxShadow: '0 0 3px rgba(251,146,60,0.2)' }}
                        animate={{ left: ['100%', '-4px'], opacity: [0, 0.3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.5 + 0.8 }}
                      />
                    </div>
                  )}
                  <Popover open={openEnginePopover === engine.name} onOpenChange={(open) => setOpenEnginePopover(open ? engine.name : null)}>
                    <PopoverTrigger asChild>
                      <motion.div
                        className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-[44px] sm:min-w-[60px] lg:min-w-[72px] cursor-pointer relative"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <span className={cn("absolute -top-1 -right-0.5 text-[7px] font-bold px-1 py-0 rounded-full z-10", engine.badgeColor)}>
                          {engine.badge}
                        </span>
                        <motion.div
                          className={cn(
                            "h-10 w-10 sm:h-14 sm:w-14 lg:h-[68px] lg:w-[68px] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden border transition-all duration-500",
                            isActive ? "border-amber-400/50" : "border-white/10"
                          )}
                          style={{
                            boxShadow: isActive
                              ? `0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`
                              : `0 0 24px ${engine.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                            background: isActive
                              ? `linear-gradient(135deg, rgba(40,30,10,0.95), rgba(50,35,10,0.98))`
                              : `linear-gradient(135deg, rgba(20,15,10,0.9), rgba(30,20,10,0.95))`,
                          }}
                          animate={{
                            boxShadow: isActive
                              ? [
                                  `0 0 25px rgba(251,191,36,0.3), 0 0 50px rgba(251,191,36,0.1)`,
                                  `0 0 45px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.25)`,
                                  `0 0 25px rgba(251,191,36,0.3), 0 0 50px rgba(251,191,36,0.1)`,
                                ]
                              : [
                                  `0 0 18px ${engine.glowColor.replace('0.3', '0.15').replace('0.25', '0.12')}`,
                                  `0 0 35px ${engine.glowColor}`,
                                  `0 0 18px ${engine.glowColor.replace('0.3', '0.15').replace('0.25', '0.12')}`,
                                ]
                          }}
                          transition={{ duration: isActive ? 2 : 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                        >
                          <img src={engine.img} alt={engine.name} className="h-7 w-7 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain drop-shadow-lg" />
                        </motion.div>
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              className="absolute -inset-0.5 sm:-inset-1 rounded-xl sm:rounded-2xl border-2 border-amber-400/30 pointer-events-none"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.04, 1] }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                        </AnimatePresence>
                        <span className={cn("text-[8px] sm:text-[10px] lg:text-[11px] font-bold tracking-wide leading-tight transition-colors duration-500", isActive ? 'text-amber-300' : engine.textColor)} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{engine.name}</span>
                        <span className={cn("text-[7px] sm:text-[8px] lg:text-[9px] font-medium leading-tight transition-colors duration-500 hidden sm:block", isActive ? 'text-amber-200/70' : 'text-white/55')}>{engine.label}</span>
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="center" className="bg-[#0c1120]/95 backdrop-blur-xl border-amber-800/40 text-amber-200 text-xs w-[280px] p-3 z-[9999] relative">
                      <button onClick={() => setOpenEnginePopover(null)} className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <p className="font-bold text-amber-400 text-[13px] mb-1">{engine.name} Engine {isActive && <span className="text-[10px] text-amber-300/70 ml-1">● active</span>}</p>
                      <p className="text-[11px] text-gray-300 leading-relaxed mb-2">{engine.description}</p>
                      <div className="space-y-0.5 mb-3">
                        {engine.capabilities.map((cap: string) => (
                          <p key={cap} className="text-[10px] text-gray-400">{cap}</p>
                        ))}
                      </div>
                      <Button size="sm" onClick={() => { onEngineReport(engine.reportType); setOpenEnginePopover(null); }} className="w-full h-7 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generate Report
                      </Button>
                      <p className="text-[9px] text-amber-600/80 mt-2 border-t border-white/5 pt-1.5">Territory: {engine.territory}</p>
                    </PopoverContent>
                  </Popover>
                </React.Fragment>
              );
            })}

            {/* ═══ MESSA CONDUCTOR BUTTON ═══ */}
            <div className="relative flex items-center h-10 sm:h-14 lg:h-[68px] shrink-0" style={{ width: 'clamp(16px, 4vw, 56px)' }}>
              <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(251,146,60,0.15), rgba(251,191,36,0.5), rgba(245,158,11,0.8))' }} />
              <motion.div className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ width: '10px', background: 'linear-gradient(90deg, transparent, #f59e0b, #ffffff, #f59e0b, transparent)', boxShadow: '0 0 10px rgba(245,158,11,0.6)' }} animate={{ left: ['-10px', 'calc(100% + 10px)'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
            </div>
            <Popover open={openEnginePopover === 'MESSA'} onOpenChange={(open) => setOpenEnginePopover(open ? 'MESSA' : null)}>
              <PopoverTrigger asChild>
                <motion.div
                  className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-[48px] sm:min-w-[68px] lg:min-w-[80px] cursor-pointer relative"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <span className="absolute -top-1.5 -right-0.5 text-[7px] font-bold px-1 py-0 rounded-full z-10 bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-200 border border-amber-400/30">🎼</span>
                  <motion.div
                    className="h-10 w-10 sm:h-14 sm:w-14 lg:h-[68px] lg:w-[68px] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden border border-amber-400/40"
                    style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,146,60,0.2), rgba(234,88,12,0.15))', boxShadow: '0 0 30px rgba(245,158,11,0.3), 0 0 60px rgba(251,146,60,0.15), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                    animate={{ boxShadow: ['0 0 20px rgba(245,158,11,0.2), 0 0 40px rgba(251,146,60,0.1)', '0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(251,146,60,0.25)', '0 0 20px rgba(245,158,11,0.2), 0 0 40px rgba(251,146,60,0.1)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="text-xl sm:text-2xl lg:text-3xl">🎼</span>
                  </motion.div>
                  <span className="text-[8px] sm:text-[10px] lg:text-[11px] font-bold tracking-wide leading-tight text-amber-300" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>MESSA</span>
                  <span className="text-[7px] sm:text-[8px] lg:text-[9px] font-medium leading-tight text-amber-200/60 hidden sm:block">Synthesis</span>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="bg-[#0c1120]/95 backdrop-blur-xl border-amber-500/40 text-amber-200 text-xs w-[300px] p-3 z-[9999] relative">
                <button onClick={() => setOpenEnginePopover(null)} className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="font-bold text-amber-400 text-[13px] mb-1">🎼 MESSA Conductor</p>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-2">The Conductor doesn't play an instrument — it orchestrates all 5 engines into one unified verdict. Cross-validates conflicts, detects contradictions, and delivers a single executive report.</p>
                <div className="space-y-0.5 mb-3">
                  <p className="text-[10px] text-gray-400">🔀 Cross-Engine Conflict Detection</p>
                  <p className="text-[10px] text-gray-400">🏥 Project Health Score (0-100)</p>
                  <p className="text-[10px] text-gray-400">📊 5-Engine Status Matrix</p>
                  <p className="text-[10px] text-gray-400">🎯 Prioritized Action Items</p>
                  <p className="text-[10px] text-gray-400">🔮 Risk Forecast (next 2 weeks)</p>
                </div>
                <Button size="sm" onClick={() => { onEngineReport('messa-synthesis' as AIEngineType); setOpenEnginePopover(null); }} className="w-full h-7 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate MESSA Report
                </Button>
                <p className="text-[9px] text-amber-600/80 mt-2 border-t border-white/5 pt-1.5">Territory: All 5 Engines → Unified Synthesis</p>
              </PopoverContent>
            </Popover>
          </div>

          {/* Pipeline Status Bar */}
          <div className="flex items-center gap-0 sm:gap-0.5 px-2">
            {PIPELINE_STEPS.map((label, i, arr) => {
              const stepActive = i === activePipelineStep;
              return (
                <React.Fragment key={label}>
                  <motion.span
                    className={cn(
                      "text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full transition-all duration-500",
                      stepActive
                        ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-400/40"
                        : "text-white/35 hover:text-white/50"
                    )}
                    animate={stepActive ? { boxShadow: ['0 0 6px rgba(251,191,36,0.15)', '0 0 12px rgba(251,191,36,0.3)', '0 0 6px rgba(251,191,36,0.15)'] } : { boxShadow: '0 0 0px transparent' }}
                    transition={{ duration: 2, repeat: stepActive ? Infinity : 0, ease: 'easeInOut' }}
                  >
                    {stepActive && <span className="text-[7px] mr-0.5">▸</span>}
                    {label}
                  </motion.span>
                  {i < arr.length - 1 && (
                    <span className={cn("text-[8px] mx-0.5 transition-colors duration-500", i === activePipelineStep ? "text-amber-400/60" : "text-white/15")}>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
