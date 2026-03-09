
-- =============================================
-- FIX 1: Trial Bypass — use_one_trial() function
-- =============================================

-- Create SECURITY DEFINER function for safe trial usage
CREATE OR REPLACE FUNCTION public.use_one_trial(_feature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_record record;
  v_max_allowed integer;
  v_used_count integer;
  v_needs_reset boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Server-side trial limits (NOT user-controllable)
  v_max_allowed := CASE _feature
    WHEN 'blueprint_analysis' THEN 3
    WHEN 'quick_estimate' THEN 3
    WHEN 'project_creation' THEN 1
    WHEN 'messa_brief' THEN 3
    WHEN 'messa_quick_log' THEN 3
    ELSE 3
  END;

  -- Lock the row for update to prevent race conditions
  SELECT * INTO v_record
  FROM user_trials
  WHERE user_id = v_user_id AND feature = _feature
  FOR UPDATE;

  IF v_record IS NULL THEN
    -- First use: create record with used_count = 1
    INSERT INTO user_trials (user_id, feature, used_count, max_allowed, last_used)
    VALUES (v_user_id, _feature, 1, v_max_allowed, now());
    
    RETURN jsonb_build_object(
      'success', true,
      'used_count', 1,
      'max_allowed', v_max_allowed,
      'remaining', v_max_allowed - 1
    );
  END IF;

  -- Monthly reset check for messa_quick_log
  IF _feature = 'messa_quick_log' AND v_record.last_used IS NOT NULL THEN
    IF date_trunc('month', v_record.last_used) < date_trunc('month', now()) THEN
      v_needs_reset := true;
    END IF;
  END IF;

  IF v_needs_reset THEN
    v_used_count := 0;
  ELSE
    v_used_count := v_record.used_count;
  END IF;

  -- Check limit
  IF v_used_count >= v_max_allowed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trial limit reached',
      'used_count', v_used_count,
      'max_allowed', v_max_allowed,
      'remaining', 0
    );
  END IF;

  -- Increment
  UPDATE user_trials
  SET used_count = v_used_count + 1,
      max_allowed = v_max_allowed,
      last_used = now(),
      updated_at = now()
  WHERE user_id = v_user_id AND feature = _feature;

  RETURN jsonb_build_object(
    'success', true,
    'used_count', v_used_count + 1,
    'max_allowed', v_max_allowed,
    'remaining', v_max_allowed - (v_used_count + 1)
  );
END;
$$;

-- Lock down user_trials: remove permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Users can insert their own trials" ON user_trials;
DROP POLICY IF EXISTS "Users can update their own trials" ON user_trials;

-- Block all direct client inserts/updates
CREATE POLICY "Server-side only trial inserts"
ON user_trials FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Server-side only trial updates"
ON user_trials FOR UPDATE
TO public
USING (false);

-- =============================================
-- FIX 2: Role Injection — accept_invitation() function
-- =============================================

CREATE OR REPLACE FUNCTION public.accept_invitation(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_user_email := auth.jwt() ->> 'email';

  -- Fetch and lock the invitation
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE id = _invitation_id
  FOR UPDATE;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Validate status
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is no longer pending');
  END IF;

  -- Validate email matches
  IF lower(v_invitation.email) != lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Validate role is a safe value
  IF v_invitation.role NOT IN ('foreman', 'worker', 'inspector', 'subcontractor', 'member', 'supplier', 'client') THEN
    v_invitation.role := 'member';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM project_members WHERE project_id = v_invitation.project_id AND user_id = v_user_id) THEN
    -- Still mark invitation as accepted
    UPDATE team_invitations
    SET status = 'accepted', responded_at = now()
    WHERE id = _invitation_id;
    
    RETURN jsonb_build_object('success', true, 'already_member', true, 'role', v_invitation.role);
  END IF;

  -- Insert member with the role FROM the invitation (not user input)
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_invitation.project_id, v_user_id, v_invitation.role);

  -- Mark invitation as accepted
  UPDATE team_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = _invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'project_id', v_invitation.project_id,
    'role', v_invitation.role
  );
END;
$$;

-- Remove the vulnerable self-add INSERT policy
DROP POLICY IF EXISTS "Users can add themselves via pending invitation" ON project_members;
