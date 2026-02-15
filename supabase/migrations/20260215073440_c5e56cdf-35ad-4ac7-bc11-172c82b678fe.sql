
-- Drop the existing SELECT policy for non-admin users
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;

-- Recreate: owners see all their non-archived projects (including completed),
-- but team members cannot see completed projects
CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  (
    -- Owner can see their own projects (unless archived, unless admin)
    (auth.uid() = user_id AND (archived_at IS NULL OR is_admin(auth.uid())))
  )
  OR
  (
    -- Team members can see shared projects, but NOT completed or archived ones
    is_project_member(id, auth.uid())
    AND archived_at IS NULL
    AND status != 'completed'
  )
);
