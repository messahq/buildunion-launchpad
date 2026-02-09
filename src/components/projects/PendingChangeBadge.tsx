// ============================================
// PENDING CHANGE BADGE - Visual indicator for pending items
// ============================================
// Shows "Waiting for Approval" status on Foreman's items
// ============================================

import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PendingChangeBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  className?: string;
  showTooltip?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Waiting for Approval',
    shortLabel: 'Pending',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    animate: true,
  },
  approved: {
    icon: CheckCircle2,
    label: 'Approved by Owner',
    shortLabel: 'Approved',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    animate: false,
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected by Owner',
    shortLabel: 'Rejected',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    animate: false,
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    className: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
    animate: false,
  },
};

export function PendingChangeBadge({
  status,
  className,
  showTooltip = true,
  compact = false,
}: PendingChangeBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        config.className,
        config.animate && "animate-pulse",
        className
      )}
    >
      {config.animate ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-3 w-3" />
        </motion.div>
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {compact ? null : config.shortLabel}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Row highlight component for pending items
interface PendingRowHighlightProps {
  isPending: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PendingRowHighlight({
  isPending,
  children,
  className,
}: PendingRowHighlightProps) {
  return (
    <div
      className={cn(
        "transition-colors duration-200",
        isPending && "bg-amber-50/50 dark:bg-amber-900/10 border-l-2 border-l-amber-400",
        className
      )}
    >
      {children}
    </div>
  );
}
