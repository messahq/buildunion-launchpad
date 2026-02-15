
-- Fix: The two UPDATE policies on projects are both RESTRICTIVE with no PERMISSIVE policy,
-- which means ALL updates are denied. Drop and recreate as PERMISSIVE.

DROP POLICY IF EXISTS "Users can soft delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
