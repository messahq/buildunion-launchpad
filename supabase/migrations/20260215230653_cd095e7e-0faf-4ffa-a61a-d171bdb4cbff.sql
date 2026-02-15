
-- Drop the existing RESTRICTIVE UPDATE policies
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update any project" ON public.projects;

-- Recreate as PERMISSIVE (default) so they combine with OR logic
CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any project"
ON public.projects
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
