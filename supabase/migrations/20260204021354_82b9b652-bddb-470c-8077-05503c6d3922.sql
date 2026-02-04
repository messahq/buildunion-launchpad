-- Fix team_invitations RLS policies with case-insensitive email matching
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
  -- Invited user can see their own invitations (case-insensitive)
  LOWER(email) = LOWER(auth.jwt() ->> 'email')
);

-- Fix UPDATE policy with case-insensitive matching
DROP POLICY IF EXISTS "Invited users can update invitation status" ON public.team_invitations;

CREATE POLICY "Invited users can update invitation status"
ON public.team_invitations FOR UPDATE
USING (
  LOWER(email) = LOWER(auth.jwt() ->> 'email')
);

-- Also fix the project_members INSERT policy for consistency
DROP POLICY IF EXISTS "Users can add themselves via pending invitation" ON public.project_members;

CREATE POLICY "Users can add themselves via pending invitation"
ON public.project_members FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM team_invitations
    WHERE project_id = project_members.project_id
    AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
    AND status = 'pending'
  )
);