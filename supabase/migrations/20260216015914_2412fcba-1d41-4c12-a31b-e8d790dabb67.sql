-- Drop and recreate the projects SELECT policy to include pending invitees
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;

CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  -- Owner can see all their own projects (archived only if admin)
  ((auth.uid() = user_id) AND ((archived_at IS NULL) OR is_admin(auth.uid())))
  -- Team members can see non-archived, non-completed projects
  OR (is_project_member(id, auth.uid()) AND (archived_at IS NULL) AND (status <> 'completed'::text))
  -- Pending invitees can see the project (so PendingInvitationsPanel works)
  OR (
    archived_at IS NULL 
    AND EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.project_id = projects.id
        AND ti.status = 'pending'
        AND LOWER(ti.email) = LOWER((auth.jwt() ->> 'email'::text))
    )
  )
  -- Admins can see everything
  OR is_admin(auth.uid())
);
