
-- Drop the RESTRICTIVE delete policies
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete any project" ON public.projects;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any project"
ON public.projects
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
