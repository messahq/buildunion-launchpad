// ============================================
// AIExecutionFlow — AI Model Processing Timeline
// Extracted from Stage8FinalReview.tsx
// Shows the 5+1 engine pipeline with progress (Desktop horizontal + Mobile vertical)
// ============================================

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Sparkles,
  Settings,
  Brain,
  Crown,
  Zap,
  ShieldCheck,
  Maximize2,
  Timer,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Citation } from "@/types/citation";
import type { AIEngineType } from "@/components/project-wizard/AIEngineReportModal";

import engineGeminiImg from "@/assets/engine-gemini.png";
import engineGptImg from "@/assets/engine-gpt.png";
import engineClaudeImg from "@/assets/engine-claude.png";
import engineLovableImg from "@/assets/engine-lovable.png";
import engineGrokImg from "@/assets/engine-grok.png";

interface AIExecutionFlowProps {
  citations: Citation[];
  tasks: any[];
  financialSummary: { material_cost: number; labor_cost: number; total_cost: number } | null;
  obcComplianceResults: { sections: any[]; loading: boolean; error: string | null; lastCheckedAt: string | null };
  liveNow: Date;
  topBarCountdown: { days: number; hours: number; minutes: number; seconds: number } | null;
  onEngineReport: (engine: AIEngineType) => void;
  onExpandTimeline: () => void;
  teamMembers: any[];
}

export function AIExecutionFlow({
  citations,
  tasks,
  financialSummary,
  obcComplianceResults,
  liveNow,
  topBarCountdown,
  onEngineReport,
  onExpandTimeline,
  teamMembers,
}: AIExecutionFlowProps) {
  const { aiSteps, messaStep, allFlowSteps, flowPct, completedSteps, overallPct } = useMemo(() => {
    const photoCitsCount = citations.filter(c => c.cite_type === 'SITE_PHOTO' || c.cite_type === 'BLUEPRINT_UPLOAD' || c.cite_type === 'VISUAL_VERIFICATION').length;
    const hasGFA = !!citations.find(c => c.cite_type === 'GFA_LOCK');
    const hasTrade = !!citations.find(c => c.cite_type === 'TRADE_SELECTION');
    const hasObc = obcComplianceResults.sections.length > 0;
    const hasDna = !!citations.find(c => c.cite_type === 'DNA_FINALIZED');
    const hasTeam = !!citations.find(c => c.cite_type === 'TEAM_STRUCTURE') || !!citations.find(c => c.cite_type === 'TEAM_MEMBER_INVITE');
    const hasContract = !!citations.find(c => c.cite_type === 'CONTRACT');
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length;
    const hasDemolition = !!citations.find(c => c.cite_type === 'DEMOLITION_PRICE') || !!citations.find(c => c.cite_type === 'SITE_CONDITION' && String(c.answer).toLowerCase().includes('demolition'));
    const demolitionTasks = tasks.filter((t: any) => (t as any).phase === 'demolition' || String(t.title || '').toLowerCase().includes('demolition'));
    const nonDemoTotal = totalTasks - demolitionTasks.length;
    const nonDemoCompleted = completedTasks - demolitionTasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length;
    const basePct = nonDemoTotal > 0 ? Math.round((nonDemoCompleted / nonDemoTotal) * 100) : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
    const demoBonusPct = hasDemolition && demolitionTasks.length > 0 ? 12 : 0;
    const overallPct = Math.min(100, basePct + demoBonusPct);

    const getStepStatus = (done: boolean, partial: boolean): 'completed' | 'current' | 'upcoming' => {
      if (done) return 'completed';
      if (partial) return 'current';
      return 'upcoming';
    };

    const aiSteps = [
      {
        engine: 'Gemini', title: 'Files Report', icon: Sparkles,
        description: photoCitsCount > 0 ? `${photoCitsCount} docs analyzed` : 'Visual intelligence',
        status: getStepStatus(photoCitsCount >= 1, false),
        accent: { from: '#14b8a6', to: '#06b6d4', glow: 'rgba(20,184,166,0.4)' },
        img: engineGeminiImg,
      },
      {
        engine: 'GPT', title: 'Data Audit', icon: Settings,
        description: hasGFA && hasTrade ? 'GFA + Trade locked' : hasGFA ? 'GFA locked' : 'Core data check',
        status: getStepStatus(hasGFA && hasTrade, hasGFA || hasTrade),
        accent: { from: '#8b5cf6', to: '#a78bfa', glow: 'rgba(139,92,246,0.4)' },
        img: engineGptImg,
      },
      {
        engine: 'Claude', title: 'OBC Compliance', icon: Brain,
        description: hasObc ? `${obcComplianceResults.sections.length} sections checked` : hasTrade ? 'Ready to audit' : 'Building code audit',
        status: getStepStatus(hasObc, hasTrade),
        accent: { from: '#f97316', to: '#fb923c', glow: 'rgba(249,115,22,0.4)' },
        img: engineClaudeImg,
      },
      {
        engine: 'Lovable', title: 'DNA Audit', icon: Crown,
        description: hasDna ? 'DNA finalized' : hasTeam ? 'Team set up' : 'Project health',
        status: getStepStatus(hasDna, hasTeam || citations.length > 5),
        accent: { from: '#ec4899', to: '#f472b6', glow: 'rgba(236,72,153,0.4)' },
        img: engineLovableImg,
      },
      {
        engine: 'Grok', title: 'Cost Insights', icon: Zap,
        description: hasContract ? 'Contract ready' : totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks` : 'Optimization',
        status: getStepStatus(hasContract || overallPct >= 50, totalTasks > 0 || overallPct > 0),
        accent: { from: '#3b82f6', to: '#60a5fa', glow: 'rgba(59,130,246,0.4)' },
        img: engineGrokImg,
      },
    ];

    const messaStep = {
      engine: 'M.E.S.S.A.', title: 'Synthesis', icon: ShieldCheck,
      description: overallPct === 100 ? '🎉 All done!' : `${overallPct}% overall`,
      status: getStepStatus(overallPct === 100, overallPct >= 50),
      accent: { from: '#10b981', to: '#34d399', glow: 'rgba(16,185,129,0.4)' },
      img: null as string | null,
    };

    const allFlowSteps = [...aiSteps, messaStep];
    const completedSteps = aiSteps.filter(s => s.status === 'completed').length;
    const flowPct = Math.round((completedSteps / aiSteps.length) * 100);

    return { aiSteps, messaStep, allFlowSteps, flowPct, completedSteps, overallPct };
  }, [citations, tasks, financialSummary, obcComplianceResults.sections.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="shrink-0 rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, #0c0f1a 0%, #141831 40%, #1a1040 70%, #0c0f1a 100%)',
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
      }}
    >
      {/* Animated top edge glow */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #14b8a6 15%, #8b5cf6 35%, #f97316 55%, #ec4899 75%, #3b82f6 90%, transparent 100%)' }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            background: ['#14b8a6', '#8b5cf6', '#f97316', '#ec4899', '#3b82f6', '#10b981'][i],
            left: `${10 + i * 16}%`,
            top: `${20 + (i % 3) * 25}%`,
            opacity: 0.15,
          }}
          animate={{ y: [0, -8, 0], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}

      {/* Header */}
      <div className="px-4 pt-2 pb-1.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-7 w-7 rounded-lg flex items-center justify-center border border-purple-400/30"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))' }}
            animate={{ boxShadow: ['0 0 8px rgba(139,92,246,0.1)', '0 0 14px rgba(139,92,246,0.2)', '0 0 8px rgba(139,92,246,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </motion.div>
          <div>
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">AI Execution Flow</span>
            <p className="text-[9px] text-white/40 font-medium">Multi-Engine Processing Pipeline</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExpandTimeline}
          className="h-7 px-2.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 text-[10px] font-semibold gap-1"
        >
          <Maximize2 className="h-3 w-3" />
          Expand
        </Button>
      </div>

      {/* ═══ DESKTOP: Horizontal AI Flow ═══ */}
      <div className="hidden md:block px-4 pb-3 relative z-10">
        <div className="relative flex items-start justify-between">
          {/* Gradient connector line */}
          <div className="absolute top-[22px] left-[22px] right-[22px] h-[2px] z-0 rounded-full overflow-hidden">
            <div className="w-full h-full bg-white/[0.04] rounded-full" />
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max(flowPct, 3)}%` }}
              transition={{ duration: 1.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            <motion.div
              className="absolute top-0 h-full w-[60px] rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
              animate={{ left: ['-60px', '110%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 2 }}
            />
          </div>

          {allFlowSteps.map((step, i) => {
            const StepIcon = step.icon;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';

            return (
              <TooltipProvider key={step.engine} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: 0.4 + i * 0.12 }}
                      className="flex flex-col items-center relative z-10 flex-1 group cursor-pointer"
                      onClick={() => {
                        if (i < 5) {
                          onEngineReport(['gemini-visual', 'gpt-audit', 'claude-obc', 'lovable-dna', 'grok-insights'][i] as AIEngineType);
                        } else {
                          onExpandTimeline();
                        }
                      }}
                    >
                      <motion.div
                        className="h-11 w-11 rounded-xl flex items-center justify-center relative transition-all duration-300"
                        style={{
                          background: isCompleted
                            ? `linear-gradient(135deg, ${step.accent.from}30, ${step.accent.to}18)`
                            : isCurrent
                            ? `linear-gradient(135deg, ${step.accent.from}18, ${step.accent.to}0a)`
                            : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                          border: isCompleted
                            ? `2px solid ${step.accent.from}50`
                            : isCurrent
                            ? `2px solid ${step.accent.from}30`
                            : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: isCompleted
                            ? `0 0 28px ${step.accent.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                            : isCurrent
                            ? `0 0 16px ${step.accent.glow.replace('0.4', '0.2')}`
                            : '0 0 6px rgba(255,255,255,0.02)',
                        }}
                        whileHover={{ scale: 1.12, boxShadow: `0 0 36px ${step.accent.glow}` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        {step.img && (
                          <img
                            src={step.img}
                            alt={step.engine}
                            className={cn(
                              "absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity",
                              isCompleted ? "opacity-15" : isCurrent ? "opacity-10" : "opacity-[0.04]"
                            )}
                          />
                        )}
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 drop-shadow-lg relative z-10" />
                        ) : (
                          <StepIcon
                            className={cn("h-4 w-4 relative z-10 transition-colors", isCurrent ? 'text-white' : 'text-white/25')}
                            style={isCurrent ? { filter: `drop-shadow(0 0 6px ${step.accent.from})` } : {}}
                          />
                        )}

                        {isCurrent && (
                          <>
                            <motion.div
                              className="absolute inset-0 rounded-xl"
                              style={{ border: `2px solid ${step.accent.from}40` }}
                              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div
                              className="absolute inset-0 rounded-xl"
                              style={{ border: `1px solid ${step.accent.from}20` }}
                              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                            />
                          </>
                        )}

                        {isCompleted && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            animate={{ boxShadow: [`inset 0 0 12px ${step.accent.glow.replace('0.4', '0.1')}`, `inset 0 0 20px ${step.accent.glow.replace('0.4', '0.2')}`, `inset 0 0 12px ${step.accent.glow.replace('0.4', '0.1')}`] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}

                        <span
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.06)',
                            color: isCompleted || isCurrent ? '#fff' : 'rgba(255,255,255,0.25)',
                            border: `1px solid ${isCompleted || isCurrent ? step.accent.from + '70' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: isCompleted ? `0 0 8px ${step.accent.glow}` : 'none',
                          }}
                        >
                          {isCompleted ? '✓' : i + 1}
                        </span>
                      </motion.div>

                      <motion.p
                        className="mt-2.5 text-[10px] font-extrabold tracking-wider uppercase text-center"
                        style={{
                          color: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.25)',
                          textShadow: isCompleted ? `0 0 8px ${step.accent.glow}` : 'none',
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        {step.engine}
                      </motion.p>
                      <p className="text-[11px] font-bold text-amber-300 mt-0.5 text-center">{step.title}</p>
                      <p className={cn(
                        "text-[9px] mt-0.5 text-center max-w-[85px] font-medium",
                        isCompleted ? 'text-amber-200/70' : isCurrent ? 'text-amber-300/60' : 'text-white/35'
                      )}>
                        {step.description}
                      </p>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-[#1a1f36] border-white/10 text-white/80 max-w-[200px]">
                    <p className="font-bold" style={{ color: step.accent.from }}>{step.engine} — {step.title}</p>
                    <p className="text-white/50 mt-0.5">{step.description}</p>
                    <p className="text-white/30 mt-1 text-[10px]">
                      {isCompleted ? '✅ Complete' : isCurrent ? '🔄 In Progress' : '⏳ Pending'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div className="mt-5 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.18em]">Pipeline Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/50">{completedSteps}/{aiSteps.length}</span>
              <span className="text-[12px] font-extrabold" style={{
                background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{flowPct}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden relative">
            <motion.div
              className="h-full rounded-full relative"
              style={{ background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(flowPct, 2)}%` }}
              transition={{ duration: 1.5, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            <motion.div
              className="absolute top-0 h-full w-[40px] rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
              animate={{ left: ['-40px', '100%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 3 }}
            />
          </div>
        </div>
      </div>

      {/* ═══ MOBILE: Vertical AI Flow ═══ */}
      <div className="md:hidden px-4 pb-4 relative z-10">
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-[3px] rounded-full overflow-hidden z-0">
            <div className="w-full h-full bg-white/[0.04]" />
            <motion.div
              className="absolute top-0 w-full rounded-full"
              style={{ background: 'linear-gradient(180deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
              initial={{ height: '0%' }}
              animate={{ height: `${Math.max(flowPct, 3)}%` }}
              transition={{ duration: 1.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>

          <div className="space-y-2.5">
            {allFlowSteps.map((step, i) => {
              const StepIcon = step.icon;
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';

              return (
                <motion.div
                  key={step.engine}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 relative z-10 cursor-pointer"
                  onClick={() => {
                    if (i < 5) {
                      onEngineReport(['gemini-visual', 'gpt-audit', 'claude-obc', 'lovable-dna', 'grok-insights'][i] as AIEngineType);
                    }
                  }}
                >
                  <motion.div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
                    style={{
                      background: isCompleted
                        ? `linear-gradient(135deg, ${step.accent.from}28, ${step.accent.to}14)`
                        : isCurrent
                        ? `linear-gradient(135deg, ${step.accent.from}14, ${step.accent.to}08)`
                        : 'rgba(255,255,255,0.02)',
                      border: isCompleted
                        ? `2px solid ${step.accent.from}45`
                        : isCurrent
                        ? `1.5px solid ${step.accent.from}30`
                        : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: isCompleted ? `0 0 16px ${step.accent.glow}` : isCurrent ? `0 0 10px ${step.accent.glow.replace('0.4', '0.15')}` : 'none',
                    }}
                    whileHover={{ scale: 1.08 }}
                  >
                    {step.img && (
                      <img src={step.img} alt="" className={cn("absolute inset-0 w-full h-full object-cover rounded-xl", isCompleted ? "opacity-10" : "opacity-[0.04]")} />
                    )}
                    {isCompleted ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 relative z-10" />
                    ) : (
                      <StepIcon className={cn("h-4 w-4 relative z-10", isCurrent ? 'text-white' : 'text-white/20')} style={isCurrent ? { filter: `drop-shadow(0 0 4px ${step.accent.from})` } : {}} />
                    )}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{ border: `1.5px solid ${step.accent.from}30` }}
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.25)' }}>
                          {step.engine}
                        </span>
                        <span className={cn("text-[11px] font-bold truncate", isCompleted ? 'text-amber-300' : isCurrent ? 'text-amber-300/80' : 'text-white/30')}>
                          {step.title}
                        </span>
                      </div>
                      <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full")}
                        style={{
                          background: isCompleted ? step.accent.from + '18' : isCurrent ? step.accent.from + '10' : 'rgba(255,255,255,0.03)',
                          color: isCompleted ? step.accent.from : isCurrent ? step.accent.from : 'rgba(255,255,255,0.2)',
                          border: `1px solid ${isCompleted ? step.accent.from + '30' : isCurrent ? step.accent.from + '18' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {isCompleted ? '✓ Done' : isCurrent ? '● Active' : 'Pending'}
                      </span>
                    </div>
                    <p className={cn("text-[10px] mt-0.5 font-medium", isCompleted ? 'text-amber-200/60' : isCurrent ? 'text-amber-300/50' : 'text-white/20')}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile progress */}
        <div className="mt-3 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-white/35 uppercase tracking-widest">Pipeline</span>
            <span className="text-[11px] font-extrabold" style={{
              background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{flowPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #14b8a6, #8b5cf6, #f97316, #ec4899, #3b82f6, #10b981)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(flowPct, 2)}%` }}
              transition={{ duration: 1.2, delay: 0.6 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
