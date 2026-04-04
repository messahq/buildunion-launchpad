// ============================================
// STAGE 8: Slide-Over Drawer
// ============================================
// Right-side drawer panel for Grok Insights, DNA Audit, and panel details
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelConfig, VisibilityTier } from "./types";

interface SlideOverDrawerProps {
  slideOverPanel: string | null;
  setSlideOverPanel: (panel: string | null) => void;
  PANELS: PanelConfig[];
  renderGrokInsightsContent: () => React.ReactNode;
  renderDnaAuditContent: () => React.ReactNode;
  renderFullscreenContent: (panel: PanelConfig | undefined | null) => React.ReactNode;
  renderPanelContent: (panel: PanelConfig | undefined | null) => React.ReactNode;
}

export function SlideOverDrawer({
  slideOverPanel,
  setSlideOverPanel,
  PANELS,
  renderGrokInsightsContent,
  renderDnaAuditContent,
  renderFullscreenContent,
  renderPanelContent,
}: SlideOverDrawerProps) {
  return (
    <AnimatePresence>
      {slideOverPanel && (() => {
        const drawerPanelConfig = slideOverPanel === 'grok-insights'
          ? {
              id: 'grok-insights',
              panelNumber: 10,
              title: 'Grok Insights',
              titleKey: 'stage8.grokInsights',
              icon: Zap,
              color: 'text-amber-500',
              bgColor: 'bg-amber-50 dark:bg-amber-950/30',
              borderColor: 'border-amber-300 dark:border-amber-700',
              visibilityTier: 'owner' as VisibilityTier,
              dataKeys: [] as string[],
              description: 'Smart Material Recommendations & Affiliate Deals',
            }
          : slideOverPanel === 'messa-deep-audit'
          ? {
              id: 'messa-deep-audit',
              panelNumber: 9,
              title: 'MESSA DNA Deep Audit',
              titleKey: 'stage8.messaAudit',
              icon: Sparkles,
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
              borderColor: 'border-emerald-300 dark:border-emerald-700',
              visibilityTier: 'owner' as VisibilityTier,
              dataKeys: [] as string[],
              description: '8-Pillar Synthesis Validation',
            }
          : PANELS.find(p => p.id === slideOverPanel) || PANELS[0];
        const DrawerIcon = drawerPanelConfig.icon;
        return (
          <>
            {/* Overlay backdrop */}
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setSlideOverPanel(null)}
            />
            {/* Drawer panel */}
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 right-0 z-[61] h-full w-[70%] max-w-3xl sm:w-[65%] flex flex-col bg-black/70 backdrop-blur-md border-l border-white/10 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className={cn("flex items-center justify-between px-5 py-4 border-b border-white/10", drawerPanelConfig.bgColor, "bg-opacity-30")}>
                <div className="flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", drawerPanelConfig.bgColor)}>
                    <DrawerIcon className={cn("h-5 w-5", drawerPanelConfig.color)} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {drawerPanelConfig.title.split(' ').map((word: string, i: number) => (
                        <span key={i} className={i === 0 ? "text-white" : "text-amber-400"}>{i > 0 ? ' ' : ''}{word}</span>
                      ))}
                    </h2>
                    <p className="text-xs text-white/50">{drawerPanelConfig.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSlideOverPanel(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {drawerPanelConfig.id === 'grok-insights' ? renderGrokInsightsContent() : drawerPanelConfig.id === 'messa-deep-audit' ? renderDnaAuditContent() : drawerPanelConfig.id === 'panel-8-financial' ? renderFullscreenContent(drawerPanelConfig) : renderPanelContent(drawerPanelConfig)}
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>
  );
}
