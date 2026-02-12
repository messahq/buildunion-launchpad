-- Add project_id to site_logs so logs can be linked to specific projects
ALTER TABLE public.site_logs
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Index for efficient project-level queries
CREATE INDEX idx_site_logs_project_id ON public.site_logs(project_id);

-- Allow team members to view site logs for their projects
CREATE POLICY "Team members can view project site logs"
ON public.site_logs
FOR SELECT
USING (
  project_id IS NOT NULL 
  AND (
    is_project_owner(project_id, auth.uid()) 
    OR is_project_member(project_id, auth.uid())
  )
);