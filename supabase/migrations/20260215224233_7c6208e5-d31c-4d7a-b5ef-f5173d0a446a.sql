
-- Update can_view_all_project_data to allow ALL project members (not just foreman/inspector)
CREATE OR REPLACE FUNCTION public.can_view_all_project_data(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_project_owner(_project_id, _user_id) 
    OR is_project_member(_project_id, _user_id)
$$;
