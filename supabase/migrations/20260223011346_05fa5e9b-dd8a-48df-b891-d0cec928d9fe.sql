
-- Allow supplier role to log deliveries
DROP POLICY IF EXISTS "Team members can log deliveries" ON public.material_deliveries;

CREATE POLICY "Team members can log deliveries"
ON public.material_deliveries
FOR INSERT
WITH CHECK (
  (auth.uid() = logged_by)
  AND (
    is_project_owner(project_id, auth.uid())
    OR get_project_role(project_id, auth.uid()) IN ('foreman', 'worker', 'subcontractor', 'supplier')
  )
);
