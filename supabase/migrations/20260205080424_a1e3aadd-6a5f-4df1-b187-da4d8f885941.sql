-- Allow team members (Foreman, Inspector, Subcontractor, etc.) to view project summaries
-- They need this to see materials data in the Materials tab

-- Add SELECT policy for project members
CREATE POLICY "Team members can view project summaries" 
ON public.project_summaries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_summaries.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Note: UPDATE/INSERT/DELETE remain restricted to owners only
-- Team members can only view, not modify directly (approval gate handles modifications)