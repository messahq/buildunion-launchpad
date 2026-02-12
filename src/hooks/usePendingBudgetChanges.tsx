// ============================================
// FOREMAN MODIFICATION LOOP - Pending Budget Changes Hook
// ============================================
// Manages pending modifications that require Owner approval
// Maintains Operational Truth by isolating changes until approved
// Citation-driven: every approve/reject creates a BUDGET_APPROVAL citation
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { createCitation, CITATION_TYPES, type Citation } from '@/types/citation';

export interface PendingBudgetChange {
  id: string;
  project_id: string;
  summary_id: string | null;
  requested_by: string;
  requested_at: string;
  item_type: 'material' | 'labor' | 'task' | 'other';
  item_id: string;
  item_name: string;
  original_quantity: number | null;
  original_unit_price: number | null;
  original_total: number | null;
  new_quantity: number | null;
  new_unit_price: number | null;
  new_total: number | null;
  change_reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester_name?: string;
  reviewer_name?: string;
}

interface UsePendingBudgetChangesOptions {
  projectId: string | null;
  enabled?: boolean;
}

export function usePendingBudgetChanges({ projectId, enabled = true }: UsePendingBudgetChangesOptions) {
  const { user } = useAuth();
  const [pendingChanges, setPendingChanges] = useState<PendingBudgetChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending changes for the project
  const fetchPendingChanges = useCallback(async () => {
    if (!projectId || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('pending_budget_changes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setPendingChanges((data || []) as PendingBudgetChange[]);
    } catch (err: any) {
      console.error('[usePendingBudgetChanges] Fetch error:', err);
      setError(err.message || 'Failed to fetch pending changes');
    } finally {
      setLoading(false);
    }
  }, [projectId, enabled]);

  // Create a new pending change (Foreman action)
  const createPendingChange = useCallback(async (change: {
    itemType: 'material' | 'labor' | 'task' | 'other';
    itemId: string;
    itemName: string;
    originalQuantity?: number;
    originalUnitPrice?: number;
    originalTotal?: number;
    newQuantity?: number;
    newUnitPrice?: number;
    newTotal?: number;
    changeReason?: string;
    summaryId?: string;
  }) => {
    if (!projectId || !user?.id) {
      toast.error('Project or user not found');
      return null;
    }
    
    try {
      const { data, error: insertError } = await supabase
        .from('pending_budget_changes')
        .insert({
          project_id: projectId,
          summary_id: change.summaryId || null,
          requested_by: user.id,
          item_type: change.itemType,
          item_id: change.itemId,
          item_name: change.itemName,
          original_quantity: change.originalQuantity || null,
          original_unit_price: change.originalUnitPrice || null,
          original_total: change.originalTotal || null,
          new_quantity: change.newQuantity || null,
          new_unit_price: change.newUnitPrice || null,
          new_total: change.newTotal || null,
          change_reason: change.changeReason || null,
          status: 'pending',
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      toast.success('Modification submitted for approval', {
        description: 'Owner will be notified',
      });
      
      // Refresh list
      await fetchPendingChanges();
      
      return data as PendingBudgetChange;
    } catch (err: any) {
      console.error('[usePendingBudgetChanges] Create error:', err);
      toast.error('Failed to submit modification', {
        description: err.message,
      });
      return null;
    }
  }, [projectId, user?.id, fetchPendingChanges]);

  // Helper: persist a BUDGET_APPROVAL citation to verified_facts
  const persistApprovalCitation = useCallback(async (
    change: PendingBudgetChange,
    decision: 'approved' | 'rejected',
    reviewNotes?: string,
  ) => {
    if (!projectId) return;
    try {
      // Fetch current verified_facts
      const { data: sumData } = await supabase
        .from('project_summaries')
        .select('id, verified_facts')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (!sumData) return;

      const currentFacts: Citation[] = Array.isArray(sumData.verified_facts)
        ? (sumData.verified_facts as unknown as Citation[])
        : [];

      const citation = createCitation({
        cite_type: CITATION_TYPES.BUDGET_APPROVAL,
        question_key: `budget_${decision}_${change.item_id}`,
        answer: `${decision === 'approved' ? '✅ Approved' : '❌ Rejected'}: ${change.item_name}`,
        value: {
          decision,
          item_id: change.item_id,
          item_name: change.item_name,
          item_type: change.item_type,
          original: { qty: change.original_quantity, price: change.original_unit_price, total: change.original_total },
          proposed: { qty: change.new_quantity, price: change.new_unit_price, total: change.new_total },
          reason: change.change_reason,
          review_notes: reviewNotes || null,
          requested_by: change.requested_by,
          reviewed_by: user?.id,
        },
      });

      const updatedFacts = [...currentFacts, citation];

      await supabase
        .from('project_summaries')
        .update({ verified_facts: updatedFacts as any })
        .eq('id', sumData.id);

      console.log(`[usePendingBudgetChanges] ✓ BUDGET_APPROVAL citation persisted: ${decision}`);
    } catch (err) {
      console.error('[usePendingBudgetChanges] Citation persist error:', err);
    }
  }, [projectId, user?.id]);

  // Apply approved changes to project_summaries line_items
  const applyApprovedChange = useCallback(async (change: PendingBudgetChange) => {
    if (!projectId) return;
    
    try {
      const { data: sumData, error: fetchErr } = await supabase
        .from('project_summaries')
        .select('id, line_items, material_cost, labor_cost, total_cost')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (fetchErr || !sumData) {
        console.error('[usePendingBudgetChanges] Cannot find summary to apply change:', fetchErr);
        return;
      }

      const lineItems: any[] = Array.isArray(sumData.line_items) ? [...sumData.line_items] : [];
      
      // Find matching line item by item_id
      const itemIndex = lineItems.findIndex((item: any) => item.id === change.item_id);
      
      if (itemIndex >= 0) {
        // Update existing item with approved values
        if (change.new_quantity !== null) lineItems[itemIndex].quantity = change.new_quantity;
        if (change.new_unit_price !== null) lineItems[itemIndex].unitPrice = change.new_unit_price;
        if (change.new_total !== null) {
          lineItems[itemIndex].total = change.new_total;
        } else if (change.new_quantity !== null && change.new_unit_price !== null) {
          lineItems[itemIndex].total = change.new_quantity * change.new_unit_price;
        }
      }

      // Recalculate totals dynamically from line items
      let materialCost = 0;
      let laborCost = 0;
      for (const item of lineItems) {
        const itemTotal = item.total || (item.quantity || 0) * (item.unitPrice || 0);
        if (item.type === 'labor') {
          laborCost += itemTotal;
        } else {
          materialCost += itemTotal;
        }
      }

      const { error: updateErr } = await supabase
        .from('project_summaries')
        .update({
          line_items: lineItems as any,
          material_cost: materialCost,
          labor_cost: laborCost,
          total_cost: materialCost + laborCost,
        })
        .eq('id', sumData.id);
      
      if (updateErr) {
        console.error('[usePendingBudgetChanges] Failed to apply approved change:', updateErr);
        toast.error('Approved but failed to update budget');
      } else {
        console.log('[usePendingBudgetChanges] ✓ Budget updated with approved values');
      }
    } catch (err) {
      console.error('[usePendingBudgetChanges] Apply error:', err);
    }
  }, [projectId]);

  // Approve a pending change (Owner action)
  const approveChange = useCallback(async (changeId: string, reviewNotes?: string) => {
    if (!user?.id) {
      toast.error('Not authenticated');
      return false;
    }
    
    try {
      // Find the change to get its details
      const change = pendingChanges.find(c => c.id === changeId);

      const { error: updateError } = await supabase
        .from('pending_budget_changes')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', changeId);
      
      if (updateError) throw updateError;

      // Apply the approved values to project_summaries
      if (change) {
        await applyApprovedChange(change);
        await persistApprovalCitation(change, 'approved', reviewNotes);
      }
      
      toast.success('Modification approved & applied', {
        description: 'Budget has been updated with the new values',
      });
      
      // Refresh list
      await fetchPendingChanges();
      
      return true;
    } catch (err: any) {
      console.error('[usePendingBudgetChanges] Approve error:', err);
      toast.error('Failed to approve modification', {
        description: err.message,
      });
      return false;
    }
  }, [user?.id, fetchPendingChanges, pendingChanges, persistApprovalCitation, applyApprovedChange]);

  // Reject a pending change (Owner action)
  const rejectChange = useCallback(async (changeId: string, reviewNotes?: string) => {
    if (!user?.id) {
      toast.error('Not authenticated');
      return false;
    }
    
    try {
      const change = pendingChanges.find(c => c.id === changeId);

      const { error: updateError } = await supabase
        .from('pending_budget_changes')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || 'No reason provided',
        })
        .eq('id', changeId);
      
      if (updateError) throw updateError;

      // Persist citation for DNA audit
      if (change) {
        await persistApprovalCitation(change, 'rejected', reviewNotes);
      }
      
      toast.info('Modification rejected');
      
      // Refresh list
      await fetchPendingChanges();
      
      return true;
    } catch (err: any) {
      console.error('[usePendingBudgetChanges] Reject error:', err);
      toast.error('Failed to reject modification', {
        description: err.message,
      });
      return false;
    }
  }, [user?.id, fetchPendingChanges, pendingChanges, persistApprovalCitation]);

  // Cancel own pending change (Foreman action)
  const cancelChange = useCallback(async (changeId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('pending_budget_changes')
        .update({
          status: 'cancelled',
        })
        .eq('id', changeId)
        .eq('requested_by', user?.id);
      
      if (updateError) throw updateError;
      
      toast.info('Modification cancelled');
      
      // Refresh list
      await fetchPendingChanges();
      
      return true;
    } catch (err: any) {
      console.error('[usePendingBudgetChanges] Cancel error:', err);
      toast.error('Failed to cancel modification', {
        description: err.message,
      });
      return false;
    }
  }, [user?.id, fetchPendingChanges]);

  // Initial fetch
  useEffect(() => {
    fetchPendingChanges();
  }, [fetchPendingChanges]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!projectId || !enabled) return;
    
    const channel = supabase
      .channel(`pending-changes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_budget_changes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('[usePendingBudgetChanges] New pending change:', payload);
          fetchPendingChanges();
          // Notify owner about new change
          const newChange = payload.new as any;
          if (newChange && newChange.requested_by !== user?.id) {
            toast.warning(`New modification request: ${newChange.item_name || 'Budget item'}`, {
              description: newChange.change_reason || 'Requires your approval',
              duration: 8000,
            });
          }
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
          console.log('[usePendingBudgetChanges] Change updated:', payload);
          fetchPendingChanges();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, fetchPendingChanges, user?.id]);

  // Computed values
  const pendingCount = pendingChanges.filter(c => c.status === 'pending').length;
  const hasPending = pendingCount > 0;
  const myPendingChanges = pendingChanges.filter(c => c.requested_by === user?.id && c.status === 'pending');

  return {
    pendingChanges,
    pendingCount,
    hasPending,
    myPendingChanges,
    loading,
    error,
    createPendingChange,
    approveChange,
    rejectChange,
    cancelChange,
    refetch: fetchPendingChanges,
  };
}
