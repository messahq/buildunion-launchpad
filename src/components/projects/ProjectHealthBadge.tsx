/**
 * Project Health Badge Component
 * 
 * Displays a compact health score indicator for project cards.
 * Shows percentage, status color, and tooltip with breakdown.
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Zap, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { HealthScoreResult } from "@/hooks/useProjectHealthScore";

interface ProjectHealthBadgeProps {
  healthScore: HealthScoreResult;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ProjectHealthBadge = memo(({
  healthScore,
  size = 'sm',
  showLabel = false,
  className,
}: ProjectHealthBadgeProps) => {
  const { t } = useTranslation();
  
  const { score, healthStatus, statusColor, statusLabel, isSoloMode, completedCount, totalCount } = healthScore;
  
  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'excellent':
        return <CheckCircle2 className={cn("h-3 w-3", size === 'lg' && "h-4 w-4")} />;
      case 'good':
        return <Zap className={cn("h-3 w-3", size === 'lg' && "h-4 w-4")} />;
      case 'needs-attention':
        return <AlertTriangle className={cn("h-3 w-3", size === 'lg' && "h-4 w-4")} />;
      case 'critical':
        return <XCircle className={cn("h-3 w-3", size === 'lg' && "h-4 w-4")} />;
    }
  };
  
  const getStatusBgColor = () => {
    switch (healthStatus) {
      case 'excellent':
        return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700';
      case 'good':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'needs-attention':
        return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700';
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn("inline-flex", className)}
          >
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 font-medium cursor-help",
                getStatusBgColor(),
                statusColor,
                size === 'sm' && "text-[10px] px-1.5 py-0.5",
                size === 'md' && "text-xs px-2 py-1",
                size === 'lg' && "text-sm px-2.5 py-1.5",
              )}
            >
              {getStatusIcon()}
              <span>{score}%</span>
              {showLabel && <span className="hidden sm:inline">· {statusLabel}</span>}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Project Health</span>
              <span className={cn("text-xs font-bold", statusColor)}>{statusLabel}</span>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  healthStatus === 'excellent' && "bg-emerald-500",
                  healthStatus === 'good' && "bg-blue-500",
                  healthStatus === 'needs-attention' && "bg-amber-500",
                  healthStatus === 'critical' && "bg-red-500",
                )}
              />
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{completedCount}/{totalCount} {t('commandCenter.solo.healthScoreNote', { count: totalCount })}</span>
              <Badge variant="outline" className="text-[9px] gap-0.5 px-1 py-0">
                {isSoloMode ? <User className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                {isSoloMode ? 'Solo' : 'Team'}
              </Badge>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ProjectHealthBadge.displayName = 'ProjectHealthBadge';
