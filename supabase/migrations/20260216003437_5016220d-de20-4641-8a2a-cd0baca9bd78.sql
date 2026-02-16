-- Re-grant table-level permissions to authenticated role for projects table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

-- Also grant to anon for public reads if needed
GRANT SELECT ON public.projects TO anon;