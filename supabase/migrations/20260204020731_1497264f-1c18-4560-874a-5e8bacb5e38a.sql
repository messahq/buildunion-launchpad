-- Fix team_invitations SELECT policy to use JWT instead of auth.users subquery
DROP POLICY IF EXISTS "Users can view invitations for their projects" ON public.team_invitations;

CREATE POLICY "Users can view invitations for their projects"
ON public.team_invitations FOR SELECT
USING (
  -- Project owner can see all invitations for their projects
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = team_invitations.project_id
    AND projects.user_id = auth.uid()
  )
  OR
  -- Invited user can see their own invitations (using JWT email)
  email = (auth.jwt() ->> 'email')
);

-- Also fix the UPDATE policy to use JWT
DROP POLICY IF EXISTS "Invited users can update invitation status" ON public.team_invitations;

CREATE POLICY "Invited users can update invitation status"
ON public.team_invitations FOR UPDATE
USING (
  email = (auth.jwt() ->> 'email')
);