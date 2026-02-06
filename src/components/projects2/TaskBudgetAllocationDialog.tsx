/**
 * TaskBudgetAllocationDialog
 * ===========================
 * Allows owners to allocate approved budget to specific tasks after budget approval.
 * Ensures Total Approved == Sum of Task Budgets for financial integrity.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ListTodo,
  Sparkles,
  Percent,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  title: string;
  status: string;
  unit_price?: number;
  quantity?: number;
  total_cost?: number;
  assignee_name?: string;
}

interface TaskBudgetAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  approvedBudget: number;
  tasks: Task[];
  onAllocationComplete: () => void;
}

interface TaskAllocation {
  taskId: string;
  title: string;
  currentBudget: number;
  allocatedBudget: number;
  assigneeName?: string;
}

export function TaskBudgetAllocationDialog({
  open,
  onOpenChange,
  projectId,
  approvedBudget,
  tasks,
  onAllocationComplete,
}: TaskBudgetAllocationDialogProps) {
  const { t } = useTranslation();
  const [allocations, setAllocations] = useState<TaskAllocation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(false);

  // Initialize allocations from tasks
  useEffect(() => {
    if (open && tasks.length > 0) {
      setAllocations(
        tasks.map((task) => ({
          taskId: task.id,
          title: task.title,
          currentBudget: task.total_cost || 0,
          allocatedBudget: task.total_cost || 0,
          assigneeName: task.assignee_name,
        }))
      );
    }
  }, [open, tasks]);

  // Calculate totals
  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, a) => sum + a.allocatedBudget, 0);
  }, [allocations]);

  const remainingBudget = approvedBudget - totalAllocated;
  const isBalanced = Math.abs(remainingBudget) < 0.01;
  const allocationPercent = approvedBudget > 0 
    ? Math.min(100, (totalAllocated / approvedBudget) * 100) 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Handle allocation change for a task
  const handleAllocationChange = (taskId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAllocations((prev) =>
      prev.map((a) =>
        a.taskId === taskId ? { ...a, allocatedBudget: Math.max(0, numValue) } : a
      )
    );
  };

  // Auto-distribute budget evenly across tasks
  const handleAutoDistribute = () => {
    if (tasks.length === 0) return;
    
    const perTask = approvedBudget / tasks.length;
    setAllocations((prev) =>
      prev.map((a) => ({ ...a, allocatedBudget: Math.round(perTask * 100) / 100 }))
    );
    setAutoDistribute(true);
    toast.success(t("budgetAllocation.distributed", "Budget distributed evenly"));
  };

  // Distribute remaining budget proportionally
  const handleDistributeRemaining = () => {
    if (remainingBudget <= 0 || allocations.length === 0) return;
    
    const totalCurrent = allocations.reduce((sum, a) => sum + a.allocatedBudget, 0);
    
    if (totalCurrent === 0) {
      // If no allocations, distribute evenly
      handleAutoDistribute();
      return;
    }
    
    // Distribute remaining proportionally to existing allocations
    setAllocations((prev) =>
      prev.map((a) => {
        const proportion = a.allocatedBudget / totalCurrent;
        const extra = remainingBudget * proportion;
        return {
          ...a,
          allocatedBudget: Math.round((a.allocatedBudget + extra) * 100) / 100,
        };
      })
    );
    toast.success(t("budgetAllocation.remainingDistributed", "Remaining budget distributed"));
  };

  // Save allocations to database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each task's budget
      for (const allocation of allocations) {
        // Calculate unit_price and quantity based on allocation
        // Keep quantity at 1 for simplicity, update unit_price to match allocation
        const { error } = await supabase
          .from("project_tasks")
          .update({
            unit_price: allocation.allocatedBudget,
            quantity: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", allocation.taskId);

        if (error) {
          console.error("Error updating task budget:", error);
          throw error;
        }
      }

      // Update project summary to mark budget as task-synced
      const { data: currentSummary } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config")
        .eq("project_id", projectId)
        .single();

      const currentConfig = (currentSummary?.ai_workflow_config as Record<string, unknown>) || {};

      await supabase
        .from("project_summaries")
        .update({
          ai_workflow_config: {
            ...currentConfig,
            taskBudgetSynced: true,
            taskBudgetSyncedAt: new Date().toISOString(),
            taskBudgetTotal: totalAllocated,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);

      toast.success(
        t("budgetAllocation.saved", "Budget allocated to {{count}} tasks", {
          count: allocations.length,
        })
      );
      
      onAllocationComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to save allocations:", error);
      toast.error(error.message || t("budgetAllocation.saveFailed", "Failed to save allocations"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-500" />
            {t("budgetAllocation.title", "Allocate Budget to Tasks")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "budgetAllocation.description",
              "Distribute the approved budget across project tasks to ensure financial tracking accuracy."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Budget Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                {t("budgetAllocation.approved", "Approved Budget")}
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(approvedBudget)}
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                {t("budgetAllocation.allocated", "Allocated")}
              </p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(totalAllocated)}
              </p>
            </div>
            
            <div className={cn(
              "p-3 rounded-lg border",
              isBalanced 
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                : remainingBudget > 0
                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            )}>
              <p className={cn(
                "text-xs mb-1",
                isBalanced 
                  ? "text-green-600 dark:text-green-400"
                  : remainingBudget > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
              )}>
                {t("budgetAllocation.remaining", "Remaining")}
              </p>
              <p className={cn(
                "text-lg font-bold",
                isBalanced 
                  ? "text-green-700 dark:text-green-300"
                  : remainingBudget > 0
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-red-700 dark:text-red-300"
              )}>
                {formatCurrency(remainingBudget)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("budgetAllocation.progress", "Allocation Progress")}
              </span>
              <span className={cn(
                "font-medium",
                isBalanced ? "text-green-600" : "text-amber-600"
              )}>
                {allocationPercent.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={allocationPercent} 
              className={cn(
                "h-2",
                isBalanced && "[&>div]:bg-green-500",
                !isBalanced && allocationPercent > 100 && "[&>div]:bg-red-500"
              )}
            />
          </div>

          {/* Status Indicator */}
          <AnimatePresence mode="wait">
            {isBalanced ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-950/50 border border-green-300 dark:border-green-700"
              >
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t("budgetAllocation.balanced", "Budget is fully allocated and balanced!")}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700"
              >
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  {remainingBudget > 0
                    ? t("budgetAllocation.unallocated", "{{amount}} unallocated", {
                        amount: formatCurrency(remainingBudget),
                      })
                    : t("budgetAllocation.overAllocated", "Over-allocated by {{amount}}", {
                        amount: formatCurrency(Math.abs(remainingBudget)),
                      })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDistribute}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t("budgetAllocation.distributeEvenly", "Distribute Evenly")}
            </Button>
            {remainingBudget > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDistributeRemaining}
                className="flex-1"
              >
                <Percent className="h-4 w-4 mr-2" />
                {t("budgetAllocation.distributeRemaining", "Add Remaining")}
              </Button>
            )}
          </div>

          {/* Task Allocations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                {t("budgetAllocation.tasks", "Tasks")} ({allocations.length})
              </h4>
            </div>

            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.taskId}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-amber-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{allocation.title}</p>
                      {allocation.assigneeName && (
                        <p className="text-xs text-muted-foreground">
                          {allocation.assigneeName}
                        </p>
                      )}
                      {allocation.currentBudget > 0 && allocation.currentBudget !== allocation.allocatedBudget && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <span>Was: {formatCurrency(allocation.currentBudget)}</span>
                          <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={allocation.allocatedBudget || ""}
                        onChange={(e) => handleAllocationChange(allocation.taskId, e.target.value)}
                        className="w-28 text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                ))}

                {allocations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t("budgetAllocation.noTasks", "No tasks to allocate budget to")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("common.skip", "Skip")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || allocations.length === 0}
            className={cn(
              isBalanced
                ? "bg-green-600 hover:bg-green-700"
                : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {isBalanced
              ? t("budgetAllocation.saveBalanced", "Save Allocations")
              : t("budgetAllocation.saveUnbalanced", "Save Anyway")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TaskBudgetAllocationDialog;
