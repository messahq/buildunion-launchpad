-- Fix: Allow users to add themselves as members when they have a pending invitation
-- This enables the invitation acceptance flow to work correctly

CREATE POLICY "Users can add themselves via pending invitation"
ON public.project_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM team_invitations
    WHERE team_invitations.project_id = project_members.project_id
    AND team_invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND team_invitations.status = 'pending'
  )
);