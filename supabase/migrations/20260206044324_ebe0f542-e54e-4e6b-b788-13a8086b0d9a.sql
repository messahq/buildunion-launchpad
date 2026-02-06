-- Fix: Make project_summaries SELECT policies PERMISSIVE (OR logic)
-- Currently they're RESTRICTIVE, which blocks team members who aren't owners

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only owners can view full summaries" ON public.project_summaries;
DROP POLICY IF EXISTS "Team members can view project summaries" ON public.project_summaries;

-- Recreate as PERMISSIVE policies (default, uses OR logic)
CREATE POLICY "Owners can view full summaries" 
ON public.project_summaries 
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view project summaries" 
ON public.project_summaries 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_summaries.project_id 
    AND pm.user_id = auth.uid()
  )
);