
-- Allow project members (foreman, inspector, subcontractor) to INSERT blueprint zones
CREATE POLICY "Team members can create blueprint zones"
ON public.blueprint_zones
FOR INSERT
WITH CHECK (
  is_project_member(project_id, auth.uid())
);

-- Allow project members to UPDATE blueprint zones (for refresh vision sync)
CREATE POLICY "Team members can update blueprint zones"
ON public.blueprint_zones
FOR UPDATE
USING (
  is_project_member(project_id, auth.uid())
);
