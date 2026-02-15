-- The issue: all policies on projects are RESTRICTIVE (using AS RESTRICTIVE).
-- Restrictive policies require ALL to pass. We need a PERMISSIVE update policy.
-- Drop the existing restrictive update policy and recreate as permissive

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also make the admin update policy permissive
DROP POLICY IF EXISTS "Admins can update any project" ON public.projects;

CREATE POLICY "Admins can update any project"
ON public.projects
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
