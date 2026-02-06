/**
 * BudgetSyncIndicator
 * ====================
 * Shows sync status between Approved Budget and Sum of Task Budgets.
 * Displays warning when there's a discrepancy.
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  total_cost?: number;
  unit_price?: number;
  quantity?: number;
}

interface BudgetSyncIndicatorProps {
  approvedBudget: number;
  tasks: Task[];
  onAllocateClick?: () => void;
  compact?: boolean;
  className?: string;
}

export function BudgetSyncIndicator({
  approvedBudget,
  tasks,
  onAllocateClick,
  compact = false,
  className,
}: BudgetSyncIndicatorProps) {
  const { t } = useTranslation();

  // Calculate sum of all task budgets
  const taskBudgetTotal = useMemo(() => {
    return tasks.reduce((sum, task) => {
      const taskCost = task.total_cost ?? (task.unit_price || 0) * (task.quantity || 1);
      return sum + taskCost;
    }, 0);
  }, [tasks]);

  const difference = approvedBudget - taskBudgetTotal;
  const isInSync = Math.abs(difference) < 0.01;
  const percentageDiff = approvedBudget > 0 
    ? ((Math.abs(difference) / approvedBudget) * 100).toFixed(1)
    : "0";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Compact badge view
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer transition-all",
                isInSync
                  ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30"
                  : "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 animate-pulse",
                className
              )}
              onClick={onAllocateClick}
            >
              {isInSync ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t("budgetSync.synced", "Synced")}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("budgetSync.outOfSync", "Out of Sync")}
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{t("budgetSync.approved", "Approved")}:</span>
                <span className="font-medium">{formatCurrency(approvedBudget)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{t("budgetSync.taskTotal", "Task Total")}:</span>
                <span className="font-medium">{formatCurrency(taskBudgetTotal)}</span>
              </div>
              {!isInSync && (
                <div className={cn(
                  "flex justify-between gap-4 pt-2 border-t",
                  difference > 0 ? "text-amber-600" : "text-red-600"
                )}>
                  <span>{t("budgetSync.difference", "Difference")}:</span>
                  <span className="font-bold">
                    {difference > 0 ? "+" : ""}{formatCurrency(difference)}
                  </span>
                </div>
              )}
              {!isInSync && onAllocateClick && (
                <p className="text-xs text-muted-foreground pt-1">
                  {t("budgetSync.clickToAllocate", "Click to allocate budget to tasks")}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full card view
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "rounded-lg border p-4",
          isInSync
            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className={cn(
              "h-5 w-5",
              isInSync ? "text-green-600" : "text-amber-600"
            )} />
            <h4 className={cn(
              "font-medium text-sm",
              isInSync ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
            )}>
              {t("budgetSync.title", "Budget Sync Status")}
            </h4>
          </div>
          <Badge
            variant="outline"
            className={cn(
              isInSync
                ? "border-green-500 text-green-700 bg-green-100 dark:bg-green-900/30"
                : "border-amber-500 text-amber-700 bg-amber-100 dark:bg-amber-900/30 animate-pulse"
            )}
          >
            {isInSync ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("budgetSync.balanced", "Balanced")}
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {percentageDiff}% {t("budgetSync.off", "off")}
              </>
            )}
          </Badge>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={cn(
            "p-2 rounded-md",
            isInSync ? "bg-green-100 dark:bg-green-900/20" : "bg-white/50 dark:bg-slate-800/50"
          )}>
            <p className="text-xs text-muted-foreground mb-1">
              {t("budgetSync.approvedBudget", "Approved Budget")}
            </p>
            <p className={cn(
              "text-lg font-bold",
              isInSync ? "text-green-700 dark:text-green-300" : "text-foreground"
            )}>
              {formatCurrency(approvedBudget)}
            </p>
          </div>
          
          <div className={cn(
            "p-2 rounded-md",
            isInSync ? "bg-green-100 dark:bg-green-900/20" : "bg-white/50 dark:bg-slate-800/50"
          )}>
            <p className="text-xs text-muted-foreground mb-1">
              {t("budgetSync.sumOfTasks", "Sum of Task Budgets")}
            </p>
            <p className={cn(
              "text-lg font-bold",
              isInSync 
                ? "text-green-700 dark:text-green-300" 
                : taskBudgetTotal > approvedBudget 
                  ? "text-red-600" 
                  : "text-amber-600"
            )}>
              {formatCurrency(taskBudgetTotal)}
            </p>
          </div>
        </div>

        {/* Difference indicator */}
        {!isInSync && (
          <div className="flex items-center justify-between p-2 rounded-md bg-white/50 dark:bg-slate-800/50 mb-3">
            <div className="flex items-center gap-2">
              <ArrowRight className={cn(
                "h-4 w-4",
                difference > 0 ? "text-amber-500" : "text-red-500"
              )} />
              <span className="text-sm">
                {difference > 0
                  ? t("budgetSync.unallocated", "Unallocated")
                  : t("budgetSync.overAllocated", "Over-allocated")}
              </span>
            </div>
            <span className={cn(
              "font-bold",
              difference > 0 ? "text-amber-600" : "text-red-600"
            )}>
              {formatCurrency(Math.abs(difference))}
            </span>
          </div>
        )}

        {/* Action button */}
        {!isInSync && onAllocateClick && (
          <Button
            onClick={onAllocateClick}
            size="sm"
            className={cn(
              "w-full",
              difference > 0 
                ? "bg-amber-600 hover:bg-amber-700" 
                : "bg-red-600 hover:bg-red-700"
            )}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("budgetSync.allocateNow", "Allocate Budget to Tasks")}
          </Button>
        )}

        {/* Success state */}
        {isInSync && (
          <p className="text-xs text-green-600 dark:text-green-400 text-center">
            {t("budgetSync.allGood", "All budget is properly allocated to tasks")}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default BudgetSyncIndicator;
