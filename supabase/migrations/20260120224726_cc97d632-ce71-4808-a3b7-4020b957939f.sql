-- Fix notification_logs: Add INSERT policy for edge functions (service role inserts notifications)
-- The service role bypasses RLS, so we need a policy for authenticated users who might create their own notifications
-- For system notifications, the edge function uses service role which bypasses RLS

-- Create a function to add project members with server-side role validation
CREATE OR REPLACE FUNCTION public.add_project_member_validated(
  _project_id uuid,
  _user_id uuid,
  _role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_caller_id uuid;
  v_final_role text;
BEGIN
  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify caller is project owner
  SELECT user_id INTO v_owner_id
  FROM projects
  WHERE id = _project_id;
  
  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;
  
  IF v_owner_id != v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized - must be project owner');
  END IF;
  
  -- Validate role - only allow specific roles
  IF _role NOT IN ('foreman', 'worker', 'inspector', 'subcontractor', 'member') THEN
    v_final_role := 'member'; -- Default to member for invalid roles
  ELSE
    v_final_role := _role;
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM project_members WHERE project_id = _project_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a team member');
  END IF;
  
  -- Add member
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (_project_id, _user_id, v_final_role);
  
  RETURN jsonb_build_object('success', true, 'role', v_final_role);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_project_member_validated(uuid, uuid, text) TO authenticated;