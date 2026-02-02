-- Update get_public_profiles function to only return email-verified users
-- This ensures the Member Directory only shows confirmed accounts

CREATE OR REPLACE FUNCTION public.get_public_profiles(
  trade_filter text DEFAULT NULL::text, 
  availability_filter text DEFAULT NULL::text, 
  contractors_only boolean DEFAULT false, 
  search_query text DEFAULT NULL::text, 
  result_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  avatar_url text, 
  primary_trade construction_trade, 
  secondary_trades construction_trade[], 
  experience_level experience_level, 
  experience_years integer, 
  bio text, 
  company_name text, 
  service_area text, 
  availability text, 
  certifications text[], 
  is_verified boolean, 
  is_contractor boolean, 
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    bp.id,
    bp.user_id,
    bp.avatar_url,
    bp.primary_trade,
    bp.secondary_trades,
    bp.experience_level,
    bp.experience_years,
    bp.bio,
    bp.company_name,
    bp.service_area,
    bp.availability,
    bp.certifications,
    bp.is_verified,
    bp.is_contractor,
    bp.created_at
  FROM public.bu_profiles bp
  -- Join with auth.users to check email_confirmed_at
  INNER JOIN auth.users au ON au.id = bp.user_id
  WHERE bp.is_public_profile = true 
    AND bp.profile_completed = true
    -- CRITICAL: Only return users with confirmed emails
    AND au.email_confirmed_at IS NOT NULL
    AND (trade_filter IS NULL OR bp.primary_trade::text = trade_filter)
    AND (availability_filter IS NULL OR bp.availability = availability_filter)
    AND (NOT contractors_only OR bp.is_contractor = true)
    AND (
      search_query IS NULL 
      OR bp.company_name ILIKE '%' || search_query || '%'
      OR bp.service_area ILIKE '%' || search_query || '%'
    )
  ORDER BY bp.created_at DESC
  LIMIT result_limit
$$;