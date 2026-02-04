-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Invited users can update invitation status" ON team_invitations;

CREATE POLICY "Invited users can update invitation status"
ON team_invitations
FOR UPDATE
TO authenticated
USING (lower(email) = lower(auth.jwt() ->> 'email'))
WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));