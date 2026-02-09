-- ============================================
-- FOREMAN MODIFICATION LOOP - Pending Budget Changes
-- ============================================
-- Tracks modifications made by Foreman/team that require Owner approval
-- Maintains Operational Truth by isolating pending changes

CREATE TABLE IF NOT EXISTS public.pending_budget_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  summary_id UUID REFERENCES public.project_summaries(id) ON DELETE CASCADE,
  
  -- Who made the change
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Change details
  item_type TEXT NOT NULL DEFAULT 'material', -- 'material', 'labor', 'task', 'other'
  item_id TEXT NOT NULL, -- Reference to the specific item (material name, task id, etc.)
  item_name TEXT NOT NULL, -- Human readable name
  
  -- Original values (for audit trail)
  original_quantity NUMERIC,
  original_unit_price NUMERIC,
  original_total NUMERIC,
  
  -- Proposed new values
  new_quantity NUMERIC,
  new_unit_price NUMERIC,
  new_total NUMERIC,
  
  -- Change reason/notes
  change_reason TEXT,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_budget_changes ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pending_budget_changes_project ON public.pending_budget_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_pending_budget_changes_status ON public.pending_budget_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_budget_changes_requested_by ON public.pending_budget_changes(requested_by);

-- RLS Policies

-- Foremen and subcontractors can create pending changes
CREATE POLICY "Team members can create pending changes"
ON public.pending_budget_changes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = pending_budget_changes.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('foreman', 'subcontractor')
  )
);

-- Project owners can view all pending changes for their projects
CREATE POLICY "Owners can view all pending changes"
ON public.pending_budget_changes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = pending_budget_changes.project_id
    AND p.user_id = auth.uid()
  )
);

-- Team members can view their own pending changes
CREATE POLICY "Team members can view own pending changes"
ON public.pending_budget_changes
FOR SELECT
USING (requested_by = auth.uid());

-- Only project owners can approve/reject (update status)
CREATE POLICY "Owners can approve or reject changes"
ON public.pending_budget_changes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = pending_budget_changes.project_id
    AND p.user_id = auth.uid()
  )
);

-- Requesters can cancel their own pending changes
CREATE POLICY "Requesters can cancel own pending changes"
ON public.pending_budget_changes
FOR UPDATE
USING (
  requested_by = auth.uid()
  AND status = 'pending'
);

-- No direct deletes - use status changes
CREATE POLICY "No direct deletes allowed"
ON public.pending_budget_changes
FOR DELETE
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_pending_budget_changes_updated_at
BEFORE UPDATE ON public.pending_budget_changes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_budget_changes;