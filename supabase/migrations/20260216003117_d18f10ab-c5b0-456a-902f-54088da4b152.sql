
-- Grant table-level permissions to authenticated role for projects table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
