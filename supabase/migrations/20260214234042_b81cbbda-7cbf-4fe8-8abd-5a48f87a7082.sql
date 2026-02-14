-- Fix: Change project_summaries SELECT policies from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE policies use AND logic (all must pass), but we need OR logic (any can pass)

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Owners can view full summaries" ON public.project_summaries;
DROP POLICY IF EXISTS "Team members can view project summaries" ON public.project_summaries;

-- Recreate as PERMISSIVE (default) - these use OR logic
CREATE POLICY "Owners can view full summaries"
  ON public.project_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can view project summaries"
  ON public.project_summaries
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_summaries.project_id
    AND pm.user_id = auth.uid()
  ));