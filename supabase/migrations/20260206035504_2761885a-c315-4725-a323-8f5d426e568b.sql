-- Add RLS policy to allow team members to update ai_workflow_config for pending budget changes
-- This allows foremen, workers, etc. to submit budget change requests

CREATE POLICY "Team members can update pending budget changes" 
ON public.project_summaries 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_summaries.project_id 
    AND pm.user_id = auth.uid()
    AND pm.role IN ('foreman', 'subcontractor', 'inspector')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_summaries.project_id 
    AND pm.user_id = auth.uid()
    AND pm.role IN ('foreman', 'subcontractor', 'inspector')
  )
);