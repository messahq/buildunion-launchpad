-- Fix: Drop the broken policy and recreate with auth.jwt() instead of auth.users query
DROP POLICY IF EXISTS "Users can add themselves via pending invitation" ON public.project_members;

CREATE POLICY "Users can add themselves via pending invitation"
ON public.project_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM team_invitations
    WHERE team_invitations.project_id = project_members.project_id
    AND team_invitations.email = (auth.jwt() ->> 'email')
    AND team_invitations.status = 'pending'
  )
);