/**
 * BuildUnion Creative Loading States
 * ====================================
 * Various creative loading indicators for different contexts:
 * - TypingDots: AI chat typing indicator
 * - PulseRing: Action/save feedback
 * - ConstructionLoader: Full-page heavy operations
 * - ProgressPulse: Button inline spinner
 * - SkeletonCard: Card placeholder
 * - ScanLines: Analysis / AI processing
 * - HammerLoader: Construction-themed
 */

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, HardHat, Zap, Sparkles, Shield } from "lucide-react";

// ─── 1. Typing Dots (for AI chat) ──────────────────────────────────────────
export function TypingDots({ color = "amber" }: { color?: "amber" | "cyan" | "primary" }) {
  const colorMap = {
    amber: "bg-amber-500",
    cyan: "bg-cyan-500",
    primary: "bg-primary",
  };
  const dotClass = colorMap[color];
  return (
    <div className="flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={cn("h-1.5 w-1.5 rounded-full animate-bounce", dotClass)}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

// ─── 2. Pulse Ring (save / submit feedback) ────────────────────────────────
export function PulseRing({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <span className={cn("relative inline-flex", sizes[size])}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
      <span className={cn("relative inline-flex rounded-full bg-accent", sizes[size])} />
    </span>
  );
}

// ─── 3. Button Spinner (drop-in replacement for Loader2) ───────────────────
export function BtnLoader({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} />;
}

// ─── 4. Scan Lines (AI analysis loading) ──────────────────────────────────
export function ScanLoader({ label = "Analysing…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative h-12 w-12">
        {/* outer ring */}
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-amber-500/40"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        {/* inner ring */}
        <motion.span
          className="absolute inset-1 rounded-full border-2 border-amber-500/70"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
      </div>
      {label && (
        <p className="text-xs text-muted-foreground animate-pulse tracking-wide">{label}</p>
      )}
    </div>
  );
}

// ─── 5. Construction Loader (full overlay) ────────────────────────────────
interface ConstructionLoaderProps {
  show: boolean;
  label?: string;
  sublabel?: string;
  icon?: "hardhat" | "zap" | "shield";
}
export function ConstructionLoader({
  show,
  label = "Loading…",
  sublabel,
  icon = "hardhat",
}: ConstructionLoaderProps) {
  const Icon = icon === "zap" ? Zap : icon === "shield" ? Shield : HardHat;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="construction-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Icon with pulse ring */}
            <div className="relative">
              <motion.div
                className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <Icon className="h-7 w-7 text-amber-500" />
              </motion.div>
              {/* spinning arc */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Progress bar */}
            <div className="w-40 h-1 bg-border/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{label}</p>
              {sublabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 6. Skeleton Card ──────────────────────────────────────────────────────
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3 animate-pulse">
      <div className="h-3 bg-muted rounded-full w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn("h-2.5 bg-muted rounded-full", i === lines - 1 ? "w-1/2" : "w-full")} />
      ))}
    </div>
  );
}

// ─── 7. Inline dots for button loading (text + dots) ──────────────────────
export function LoadingLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      <TypingDots color="primary" />
    </span>
  );
}

// ─── 8. Hammer pulse (construction icon bouncing) ─────────────────────────
export function HammerLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ rotate: [-20, 10, -20] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <HardHat className="h-4 w-4 text-amber-500" />
      </motion.div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
