-- Allow admins to update (soft-delete) any project
CREATE POLICY "Admins can update any project"
ON public.projects
FOR UPDATE
USING (is_admin(auth.uid()));
