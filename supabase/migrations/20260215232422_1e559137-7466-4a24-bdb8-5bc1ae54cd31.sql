
-- Grant UPDATE permission so authenticated users can archive (soft-delete) their own projects
GRANT UPDATE ON public.projects TO authenticated;

-- Grant DELETE permission for hard delete if needed
GRANT DELETE ON public.projects TO authenticated;

-- Add DELETE policy for own projects
CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete any project"
ON public.projects
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
