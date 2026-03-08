// ============================================
// STAGE 8 COMMAND BAR - Colorful Action Bar
// ============================================
// Redesigned bottom bar with vivid color-coded action buttons
// matching the futuristic dashboard concept
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileText,
  Send,
  Shield,
  Loader2,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Stage8CommandBarProps {
  projectId: string;
  isOwner: boolean;
  pendingCount: number;
  onPendingClick: () => void;
  onGenerateInvoice: () => void;
  onSendToClient: () => void;
  onDnaReport: () => void;
  isGeneratingInvoice?: boolean;
  isSendingToClient?: boolean;
  isGeneratingDna?: boolean;
  onCheckIn?: () => void;
  onAskMessa?: () => void;
  onSiteIntel?: () => void;
  onFinish?: () => void;
  className?: string;
}

const ACTION_BUTTONS = [
  { id: 'checkin', label: 'Check In', icon: MapPin, gradient: 'from-emerald-500 to-green-600', hoverGradient: 'from-emerald-400 to-green-500', shadow: 'shadow-emerald-500/30' },
  { id: 'messa', label: 'Ask MESSA', icon: MessageSquare, gradient: 'from-violet-500 to-purple-600', hoverGradient: 'from-violet-400 to-purple-500', shadow: 'shadow-violet-500/30' },
  { id: 'invoice', label: 'Invoice', icon: FileText, gradient: 'from-amber-500 to-orange-600', hoverGradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
  { id: 'dna', label: 'DNA Report', icon: Shield, gradient: 'from-cyan-500 to-blue-600', hoverGradient: 'from-cyan-400 to-blue-500', shadow: 'shadow-cyan-500/30' },
  { id: 'intel', label: 'Site Intel', icon: Sparkles, gradient: 'from-pink-500 to-rose-600', hoverGradient: 'from-pink-400 to-rose-500', shadow: 'shadow-pink-500/30' },
  { id: 'finish', label: 'Finish', icon: Flag, gradient: 'from-teal-500 to-emerald-600', hoverGradient: 'from-teal-400 to-emerald-500', shadow: 'shadow-teal-500/30' },
];

export function Stage8CommandBar({
  projectId,
  isOwner,
  pendingCount,
  onPendingClick,
  onGenerateInvoice,
  onSendToClient,
  onDnaReport,
  isGeneratingInvoice,
  isSendingToClient,
  isGeneratingDna,
  onCheckIn,
  onAskMessa,
  onSiteIntel,
  onFinish,
  className,
}: Stage8CommandBarProps) {
  const [realtimePendingCount, setRealtimePendingCount] = useState(pendingCount);
  const [hasNewPending, setHasNewPending] = useState(false);

  useEffect(() => {
    setRealtimePendingCount(pendingCount);
  }, [pendingCount]);

  useEffect(() => {
    if (!projectId || !isOwner) return;

    const channel = supabase
      .channel(`command-bar-pending-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_budget_changes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('[CommandBar] New pending change:', payload);
          setRealtimePendingCount((prev) => prev + 1);
          setHasNewPending(true);
          setTimeout(() => setHasNewPending(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_budget_changes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).status !== 'pending') {
            setRealtimePendingCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, isOwner]);

  const showPendingButton = isOwner && realtimePendingCount > 0;

  const getActionHandler = (id: string) => {
    switch (id) {
      case 'checkin': return onCheckIn || (() => {});
      case 'messa': return onAskMessa || (() => {});
      case 'invoice': return onGenerateInvoice;
      case 'dna': return onDnaReport;
      case 'intel': return onSiteIntel || onSendToClient;
      case 'finish': return onFinish || (() => {});
      default: return () => {};
    }
  };

  const isLoading = (id: string) => {
    if (id === 'invoice') return isGeneratingInvoice;
    if (id === 'dna') return isGeneratingDna;
    if (id === 'intel') return isSendingToClient;
    return false;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-[#0a0e1a]/95 backdrop-blur-xl",
        "border-t border-cyan-900/40",
        "shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.5)]",
        "px-3 py-2.5 md:px-6 md:py-3",
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        {/* Pending Changes Banner */}
        <AnimatePresence>
          {showPendingButton && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-2"
            >
              <button
                onClick={onPendingClick}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium",
                  "bg-amber-500/10 border border-amber-500/30 text-amber-400",
                  "hover:bg-amber-500/20 transition-all",
                  hasNewPending && "animate-pulse ring-1 ring-amber-400/50"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{realtimePendingCount} Pending Approval{realtimePendingCount > 1 ? 's' : ''}</span>
                {hasNewPending && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-red-500"
                  />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons Grid */}
        <div className="flex items-center justify-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
          {ACTION_BUTTONS.map((action, idx) => {
            const Icon = action.icon;
            const loading = isLoading(action.id);
            const handler = getActionHandler(action.id);
            
            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.06 }}
                onClick={handler}
                disabled={!!loading}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 md:px-4 md:py-2.5 rounded-xl",
                  "bg-gradient-to-br", action.gradient,
                  "hover:bg-gradient-to-br", `hover:${action.hoverGradient}`,
                  "text-white font-medium text-[10px] md:text-xs",
                  "transition-all duration-200",
                  `shadow-lg ${action.shadow}`,
                  "hover:scale-105 hover:shadow-xl active:scale-95",
                  "min-w-[60px] md:min-w-[72px]",
                  loading && "opacity-70 cursor-wait"
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                )}
                <span className="leading-none whitespace-nowrap">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
