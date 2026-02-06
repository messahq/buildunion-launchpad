-- Add RLS policy for team members to view contracts
-- This allows team members (foreman, worker, subcontractor, etc.) to view contracts
-- for projects they are part of

CREATE POLICY "Team members can view project contracts"
ON public.contracts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = contracts.project_id
    AND pm.user_id = auth.uid()
  )
);