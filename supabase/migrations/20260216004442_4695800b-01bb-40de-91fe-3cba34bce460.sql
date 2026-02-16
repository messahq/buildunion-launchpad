-- Drop ALL existing restrictive policies on projects
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update any project" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete any project" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects including archived" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own and shared projects"
ON public.projects FOR SELECT
TO authenticated
USING (
  ((auth.uid() = user_id) AND ((archived_at IS NULL) OR is_admin(auth.uid())))
  OR (is_project_member(id, auth.uid()) AND (archived_at IS NULL) AND (status <> 'completed'))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));