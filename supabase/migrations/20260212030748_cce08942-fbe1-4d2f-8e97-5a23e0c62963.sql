
-- Create material_deliveries table
CREATE TABLE public.material_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  expected_quantity numeric NOT NULL DEFAULT 0,
  delivered_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  logged_by uuid NOT NULL,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_deliveries ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner or project member
CREATE POLICY "Project members can view deliveries"
ON public.material_deliveries FOR SELECT
USING (
  is_project_owner(project_id, auth.uid()) 
  OR is_project_member(project_id, auth.uid())
);

-- INSERT: Owner, Foreman, Worker
CREATE POLICY "Team members can log deliveries"
ON public.material_deliveries FOR INSERT
WITH CHECK (
  auth.uid() = logged_by
  AND (
    is_project_owner(project_id, auth.uid())
    OR get_project_role(project_id, auth.uid()) IN ('foreman', 'worker', 'subcontractor')
  )
);

-- UPDATE: Logger or owner
CREATE POLICY "Logger or owner can update deliveries"
ON public.material_deliveries FOR UPDATE
USING (
  logged_by = auth.uid() 
  OR is_project_owner(project_id, auth.uid())
);

-- DELETE: Owner only
CREATE POLICY "Owner can delete deliveries"
ON public.material_deliveries FOR DELETE
USING (is_project_owner(project_id, auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_deliveries;

-- Updated_at trigger
CREATE TRIGGER update_material_deliveries_updated_at
BEFORE UPDATE ON public.material_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
