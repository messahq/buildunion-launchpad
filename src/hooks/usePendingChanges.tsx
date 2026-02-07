// ============================================
// PENDING CHANGES HOOK
// Manages pending vs approved financial changes
// Stores pending changes in ai_workflow_config
// Team members submit -> Owner approves -> Supabase updates
// ============================================

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PendingMaterialChange {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  changeType: "add" | "update" | "remove";
  originalValue?: number;
}

export interface PendingBudgetChange {
  submittedBy: string;
  submittedByName?: string;
  submittedAt: string;
  proposedGrandTotal: number;
  previousGrandTotal: number;
  proposedLineItems?: {
    materials?: Array<{ item: string; totalPrice: number; quantity?: number; unitPrice?: number }>;
    labor?: Array<{ item: string; totalPrice: number }>;
    other?: Array<{ item: string; totalPrice: number }>;
  };
  reason?: string;
  status: "pending" | "approved" | "declined";
  approvedAt?: string;
  declinedAt?: string;
}

export interface ApprovedBudget {
  grandTotal: number;
  materialCost: number;
  laborCost: number;
  otherCost: number;
  taxAmount: number;
  approvedAt: string;
  approvedBy: string;
  budgetVersion: string;
}

export interface UsePendingChangesReturn {
  // State
  pendingChange: PendingBudgetChange | null;
  approvedBudget: ApprovedBudget | null;
  isLoading: boolean;
  hasPendingChange: boolean;
  
  // Actions
  submitBudgetChange: (
    proposedGrandTotal: number,
    previousGrandTotal: number,
    proposedLineItems?: PendingBudgetChange["proposedLineItems"],
    reason?: string
  ) => Promise<boolean>;
  approveBudgetChange: () => Promise<boolean>;
  declineBudgetChange: () => Promise<boolean>;
  clearPendingChange: () => Promise<boolean>;
  
  // Computed from Supabase
  actualTotals: {
    materialCost: number;
    laborCost: number;
    otherCost: number;
    taskBudget: number;
    grandTotal: number;
  };
  
  // Refetch
  refetch: () => void;
}

export function usePendingChanges(projectId: string | null): UsePendingChangesReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch project summary with ai_workflow_config
  const { data: summaryData, isLoading, refetch } = useQuery({
    queryKey: ["pending-changes", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config, total_cost, labor_cost, material_cost, line_items")
        .eq("project_id", projectId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 3000, // Refresh every 3 seconds for real-time sync
  });
  
  // Fetch task totals from Supabase using SUM
  const { data: taskTotals } = useQuery({
    queryKey: ["task-totals", projectId],
    queryFn: async () => {
      if (!projectId) return { totalBudget: 0 };
      
      const { data, error } = await supabase
        .from("project_tasks")
        .select("total_cost, unit_price, quantity")
        .eq("project_id", projectId)
        .is("archived_at", null);
      
      if (error) throw error;
      
      // Calculate sum manually since Supabase JS doesn't support aggregate functions directly
      const totalBudget = (data || []).reduce((sum, task) => {
        const taskCost = task.total_cost || (task.unit_price || 0) * (task.quantity || 1);
        return sum + taskCost;
      }, 0);
      
      return { totalBudget };
    },
    enabled: !!projectId,
    staleTime: 3000,
  });
  
  // Extract pending change from ai_workflow_config
  const pendingChange = useMemo((): PendingBudgetChange | null => {
    const config = summaryData?.ai_workflow_config as Record<string, unknown> | null;
    if (!config) return null;
    
    const pending = config.pendingBudgetChange as PendingBudgetChange | undefined;
    if (!pending || pending.status !== "pending") return null;
    
    return pending;
  }, [summaryData]);
  
  // Extract approved budget from ai_workflow_config
  const approvedBudget = useMemo((): ApprovedBudget | null => {
    const config = summaryData?.ai_workflow_config as Record<string, unknown> | null;
    if (!config) return null;
    
    const grandTotal = config.grandTotal as number | undefined;
    if (!grandTotal) return null;
    
    return {
      grandTotal,
      materialCost: (config.materialCost as number) || 0,
      laborCost: (config.laborCost as number) || 0,
      otherCost: (config.otherCost as number) || 0,
      taxAmount: (config.taxAmount as number) || 0,
      approvedAt: (config.budgetUpdatedAt as string) || "",
      approvedBy: (config.budgetApprovedBy as string) || "",
      budgetVersion: (config.budgetVersion as string) || "initial",
    };
  }, [summaryData]);
  
  // Calculate actual totals from line_items
  const actualTotals = useMemo(() => {
    const lineItems = summaryData?.line_items as {
      materials?: Array<{ totalPrice?: number; total?: number }>;
      labor?: Array<{ totalPrice?: number; total?: number }>;
      other?: Array<{ totalPrice?: number; total?: number }>;
    } | null;
    
    const materialCost = (lineItems?.materials || []).reduce((sum, item) => {
      return sum + (item.totalPrice || item.total || 0);
    }, 0);
    
    const laborCost = (lineItems?.labor || []).reduce((sum, item) => {
      return sum + (item.totalPrice || item.total || 0);
    }, 0);
    
    const otherCost = (lineItems?.other || []).reduce((sum, item) => {
      return sum + (item.totalPrice || item.total || 0);
    }, 0);
    
    const taskBudget = taskTotals?.totalBudget || 0;
    const subtotal = materialCost + laborCost + otherCost;
    const taxAmount = subtotal * 0.13; // HST
    const grandTotal = subtotal + taxAmount;
    
    return {
      materialCost,
      laborCost,
      otherCost,
      taskBudget,
      grandTotal,
    };
  }, [summaryData, taskTotals]);
  
  // Submit a budget change (for team members)
  const submitBudgetChange = useCallback(async (
    proposedGrandTotal: number,
    previousGrandTotal: number,
    proposedLineItems?: PendingBudgetChange["proposedLineItems"],
    reason?: string
  ): Promise<boolean> => {
    if (!projectId || !user) {
      toast.error("Cannot submit change - missing project or user");
      return false;
    }
    
    try {
      // First get current user's profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      // Fetch current config to merge
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config")
        .eq("project_id", projectId)
        .single();
      
      const currentConfig = (currentData?.ai_workflow_config as Record<string, unknown>) || {};
      
      const pendingBudgetChange: PendingBudgetChange = {
        submittedBy: user.id,
        submittedByName: profile?.full_name || user.email?.split("@")[0] || "Team Member",
        submittedAt: new Date().toISOString(),
        proposedGrandTotal,
        previousGrandTotal,
        proposedLineItems,
        reason,
        status: "pending",
      };
      
      const updatedConfig = {
        ...currentConfig,
        pendingBudgetChange: pendingBudgetChange as unknown as Record<string, unknown>,
      };
      
      const { error } = await supabase
        .from("project_summaries")
        .update({
          ai_workflow_config: updatedConfig as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
      
      if (error) throw error;
      
      toast.success("Budget change submitted for approval");
      queryClient.invalidateQueries({ queryKey: ["pending-changes", projectId] });
      refetch();
      return true;
    } catch (error) {
      console.error("Failed to submit budget change:", error);
      toast.error("Failed to submit budget change");
      return false;
    }
  }, [projectId, user, queryClient, refetch]);
  
  // Approve a pending budget change (for owners)
  const approveBudgetChange = useCallback(async (): Promise<boolean> => {
    if (!projectId || !user || !pendingChange) {
      toast.error("Cannot approve - missing data");
      return false;
    }
    
    try {
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config")
        .eq("project_id", projectId)
        .single();
      
      const currentConfig = (currentData?.ai_workflow_config as Record<string, unknown>) || {};
      
      const approvedPendingChange = {
        ...pendingChange,
        status: "approved",
        approvedAt: new Date().toISOString(),
      };
      
      const updatedConfig = {
        ...currentConfig,
        grandTotal: pendingChange.proposedGrandTotal,
        budgetVersion: "change_order",
        budgetUpdatedAt: new Date().toISOString(),
        budgetApprovedBy: user.id,
        pendingBudgetChange: approvedPendingChange as unknown as Record<string, unknown>,
      };
      
      const { error } = await supabase
        .from("project_summaries")
        .update({
          ai_workflow_config: updatedConfig as Json,
          total_cost: pendingChange.proposedGrandTotal,
          line_items: pendingChange.proposedLineItems as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
      
      if (error) throw error;
      
      toast.success("Budget change approved! ✓");
      queryClient.invalidateQueries({ queryKey: ["pending-changes", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-budget-sync", projectId] });
      refetch();
      return true;
    } catch (error) {
      console.error("Failed to approve budget change:", error);
      toast.error("Failed to approve budget change");
      return false;
    }
  }, [projectId, user, pendingChange, queryClient, refetch]);
  
  // Decline a pending budget change (for owners)
  const declineBudgetChange = useCallback(async (): Promise<boolean> => {
    if (!projectId || !user || !pendingChange) {
      toast.error("Cannot decline - missing data");
      return false;
    }
    
    try {
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config")
        .eq("project_id", projectId)
        .single();
      
      const currentConfig = (currentData?.ai_workflow_config as Record<string, unknown>) || {};
      
      const declinedPendingChange = {
        ...pendingChange,
        status: "declined",
        declinedAt: new Date().toISOString(),
      };
      
      const updatedConfig = {
        ...currentConfig,
        pendingBudgetChange: declinedPendingChange as unknown as Record<string, unknown>,
      };
      
      const { error } = await supabase
        .from("project_summaries")
        .update({
          ai_workflow_config: updatedConfig as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
      
      if (error) throw error;
      
      toast.success("Budget change declined. Original budget maintained.");
      queryClient.invalidateQueries({ queryKey: ["pending-changes", projectId] });
      refetch();
      return true;
    } catch (error) {
      console.error("Failed to decline budget change:", error);
      toast.error("Failed to decline budget change");
      return false;
    }
  }, [projectId, user, pendingChange, queryClient, refetch]);
  
  // Clear pending change (after processing)
  const clearPendingChange = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;
    
    try {
      const { data: currentData } = await supabase
        .from("project_summaries")
        .select("ai_workflow_config")
        .eq("project_id", projectId)
        .single();
      
      const currentConfig = { ...(currentData?.ai_workflow_config as Record<string, unknown>) || {} };
      delete currentConfig.pendingBudgetChange;
      
      const { error } = await supabase
        .from("project_summaries")
        .update({
          ai_workflow_config: currentConfig as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["pending-changes", projectId] });
      refetch();
      return true;
    } catch (error) {
      console.error("Failed to clear pending change:", error);
      return false;
    }
  }, [projectId, queryClient, refetch]);
  
  return {
    pendingChange,
    approvedBudget,
    isLoading,
    hasPendingChange: !!pendingChange,
    submitBudgetChange,
    approveBudgetChange,
    declineBudgetChange,
    clearPendingChange,
    actualTotals,
    refetch,
  };
}

export default usePendingChanges;
