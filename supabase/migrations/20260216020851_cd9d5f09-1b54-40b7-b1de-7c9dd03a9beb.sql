
-- Create a security definer function to check pending invitations without RLS recursion
CREATE OR REPLACE FUNCTION public.has_pending_invitation(_project_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE project_id = _project_id
      AND status = 'pending'
      AND LOWER(email) = LOWER(_email)
  );
$$;

-- Recreate the projects SELECT policy using the new function
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;

CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  ((auth.uid() = user_id) AND ((archived_at IS NULL) OR is_admin(auth.uid())))
  OR (is_project_member(id, auth.uid()) AND (archived_at IS NULL) AND (status <> 'completed'::text))
  OR (
    archived_at IS NULL
    AND has_pending_invitation(id, (auth.jwt() ->> 'email'::text))
  )
  OR is_admin(auth.uid())
);
