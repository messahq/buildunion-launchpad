
-- Fix: Allow all team members (not just owner/foreman) to upload documents
CREATE OR REPLACE FUNCTION public.can_upload_documents(_project_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    is_project_owner(_project_id, _user_id) 
    OR get_project_role(_project_id, _user_id) IN ('foreman', 'worker', 'subcontractor', 'inspector')
$$;
