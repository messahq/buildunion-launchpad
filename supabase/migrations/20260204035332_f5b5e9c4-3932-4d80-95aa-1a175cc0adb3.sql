-- Create RPC function for team member search
-- This allows searching BU users without requiring profile_completed
CREATE OR REPLACE FUNCTION public.search_bu_users_for_team(
  _search_query text,
  _project_id uuid,
  _limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  company_name text,
  primary_trade construction_trade,
  avatar_url text,
  is_verified boolean,
  profile_completed boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (bp.user_id)
    bp.id,
    bp.user_id,
    COALESCE(p.full_name, bp.company_name, 'Unknown User') as full_name,
    bp.company_name,
    bp.primary_trade,
    COALESCE(bp.avatar_url, p.avatar_url) as avatar_url,
    bp.is_verified,
    bp.profile_completed
  FROM public.bu_profiles bp
  LEFT JOIN public.profiles p ON p.user_id = bp.user_id
  WHERE 
    -- Don't return the current user
    bp.user_id != auth.uid()
    -- Not already a member of this project
    AND NOT EXISTS (
      SELECT 1 FROM public.project_members pm 
      WHERE pm.project_id = _project_id AND pm.user_id = bp.user_id
    )
    -- Not already invited to this project
    AND NOT EXISTS (
      SELECT 1 FROM public.team_invitations ti 
      WHERE ti.project_id = _project_id 
        AND ti.status = 'pending'
        AND EXISTS (
          SELECT 1 FROM auth.users au 
          WHERE au.id = bp.user_id AND LOWER(au.email) = LOWER(ti.email)
        )
    )
    -- Match search query (company name, full name, or trade)
    AND (
      _search_query IS NULL 
      OR _search_query = ''
      OR bp.company_name ILIKE '%' || _search_query || '%'
      OR p.full_name ILIKE '%' || _search_query || '%'
      OR bp.primary_trade::text ILIKE '%' || _search_query || '%'
      OR REPLACE(bp.primary_trade::text, '_', ' ') ILIKE '%' || _search_query || '%'
    )
  ORDER BY bp.user_id, bp.profile_completed DESC, bp.created_at DESC
  LIMIT _limit;
$$;