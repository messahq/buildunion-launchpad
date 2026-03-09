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
  Clock,
  Calendar,
  Timer,
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
  projectEndDate?: string | null;
  className?: string;
}

const ACTION_BUTTONS_LEFT = [
  { id: 'checkin', label: 'Check In', icon: MapPin, gradient: 'from-emerald-500 to-green-600', hoverGradient: 'from-emerald-400 to-green-500', shadow: 'shadow-emerald-500/30' },
  { id: 'messa', label: 'Ask MESSA', icon: MessageSquare, gradient: 'from-violet-500 to-purple-600', hoverGradient: 'from-violet-400 to-purple-500', shadow: 'shadow-violet-500/30' },
  { id: 'invoice', label: 'Invoice', icon: FileText, gradient: 'from-amber-500 to-orange-600', hoverGradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
];

const ACTION_BUTTONS_RIGHT = [
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
  projectEndDate,
  className,
}: Stage8CommandBarProps) {
  const [realtimePendingCount, setRealtimePendingCount] = useState(pendingCount);
  const [hasNewPending, setHasNewPending] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Calculate countdown to project end date
  const getCountdown = () => {
    const targetDate = projectEndDate ? new Date(projectEndDate) : new Date('2026-03-12');
    const now = currentTime;
    const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, totalMs: diffMs };
  };

  const countdown = getCountdown();

  const renderActionButton = (action: typeof ACTION_BUTTONS_LEFT[0], idx: number, offset: number = 0) => {
    const Icon = action.icon;
    const loading = isLoading(action.id);
    const handler = getActionHandler(action.id);
    
    return (
      <motion.button
        key={action.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 + (idx + offset) * 0.06 }}
        onClick={handler}
        disabled={!!loading}
        className={cn(
          "flex flex-col items-center gap-1 px-3 py-2 md:px-4 md:py-2.5 rounded-xl",
          "bg-gradient-to-br", action.gradient,
          "hover:bg-gradient-to-br", `hover:${action.hoverGradient}`,
          "text-white font-medium text-xs md:text-sm",
          "transition-all duration-200",
          `shadow-lg ${action.shadow}`,
          "hover:scale-105 hover:shadow-xl active:scale-95",
          "min-w-[60px] md:min-w-[80px]",
          loading && "opacity-70 cursor-wait"
        )}
       >
        {loading ? (
          <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
        ) : (
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        )}
        <span className="leading-none whitespace-nowrap text-[10px] md:text-xs">{action.label}</span>
      </motion.button>
    );
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
        "px-2 py-2 md:px-4 md:py-2.5",
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

        {/* Action Buttons with Clock in Center */}
        <div className="flex items-center justify-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide">
          {/* Left buttons */}
          {ACTION_BUTTONS_LEFT.map((action, idx) => renderActionButton(action, idx))}
          
          {/* Center: Clock + Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="hidden sm:flex flex-col items-center justify-center px-3 md:px-5 py-1.5 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 mx-1"
          >
            {/* Current Time */}
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-sm md:text-base font-bold tracking-wider">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
            {/* Date */}
            <div className="flex items-center gap-1 text-slate-400 text-[9px] md:text-[10px]">
              <Calendar className="h-2.5 w-2.5" />
              <span>{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </motion.div>

          {/* Timer countdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="hidden sm:flex flex-col items-center justify-center px-3 md:px-5 py-1.5 rounded-xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/20 mx-1"
          >
            {/* Countdown */}
            <div className="flex items-center gap-1.5">
              <Timer className="h-3 w-3 text-purple-400" />
              <span className="font-mono text-sm md:text-base font-bold tracking-wider text-purple-300">
                {countdown.days > 0 ? `${countdown.days}d ` : ''}
                {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </span>
            </div>
            {/* Label */}
            <div className="text-[9px] md:text-[10px] text-purple-400/70 font-medium">
              {countdown.days > 0 ? `${countdown.days} days left` : 'Time remaining'}
            </div>
          </motion.div>
          
          {/* Right buttons */}
          {ACTION_BUTTONS_RIGHT.map((action, idx) => renderActionButton(action, idx, 3))}
        </div>
      </div>
    </motion.div>
  );
}
