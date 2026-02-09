// ============================================
// STAGE 8 COMMAND BAR - Sticky Footer Actions
// ============================================
// Fixed bottom bar with glass effect containing:
// - Pending Changes button (left, when active)
// - Action buttons (right): Invoice, Send, Conflict Map, MESSA
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileText,
  Send,
  Map,
  Sparkles,
  Loader2,
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
  onConflictMap: () => void;
  onMessaSynthesis: () => void;
  isGeneratingInvoice?: boolean;
  isSendingToClient?: boolean;
  isGeneratingMessa?: boolean;
  className?: string;
}

export function Stage8CommandBar({
  projectId,
  isOwner,
  pendingCount,
  onPendingClick,
  onGenerateInvoice,
  onSendToClient,
  onConflictMap,
  onMessaSynthesis,
  isGeneratingInvoice,
  isSendingToClient,
  isGeneratingMessa,
  className,
}: Stage8CommandBarProps) {
  const [realtimePendingCount, setRealtimePendingCount] = useState(pendingCount);
  const [hasNewPending, setHasNewPending] = useState(false);

  // Update from props
  useEffect(() => {
    setRealtimePendingCount(pendingCount);
  }, [pendingCount]);

  // Realtime subscription for pending changes
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
          // Reset flash after 3 seconds
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
          // Refetch count when status changes
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

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/80 backdrop-blur-xl",
        "border-t border-border/50",
        "shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)]",
        "px-4 py-3 md:px-6",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side - Pending Changes */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showPendingButton && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPendingClick}
                  className={cn(
                    "relative font-medium",
                    "border-amber-300 text-amber-700 hover:bg-amber-50",
                    "dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30",
                    hasNewPending && "animate-pulse ring-2 ring-amber-400"
                  )}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span>{realtimePendingCount} Pending</span>
                  {hasNewPending && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500"
                    />
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side - Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Generate Invoice - Yellow Outline */}
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateInvoice}
            disabled={isGeneratingInvoice}
            className={cn(
              "font-medium",
              "border-amber-400 text-amber-700 hover:bg-amber-50",
              "dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30"
            )}
          >
            {isGeneratingInvoice ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">Generate Invoice</span>
            <span className="sm:hidden">Invoice</span>
          </Button>

          {/* Send to Client - Blue Outline */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSendToClient}
            disabled={isSendingToClient}
            className={cn(
              "font-medium",
              "border-blue-400 text-blue-700 hover:bg-blue-50",
              "dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950/30"
            )}
          >
            {isSendingToClient ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">Send to Client</span>
            <span className="sm:hidden">Send</span>
          </Button>



          {/* M.E.S.S.A. Synthesis - Green Filled */}
          <Button
            size="sm"
            onClick={onMessaSynthesis}
            disabled={isGeneratingMessa}
            className={cn(
              "font-medium",
              "bg-emerald-600 hover:bg-emerald-700 text-white",
              "dark:bg-emerald-700 dark:hover:bg-emerald-800"
            )}
          >
            {isGeneratingMessa ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">M.E.S.S.A. Synthesis</span>
            <span className="sm:hidden">MESSA</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
