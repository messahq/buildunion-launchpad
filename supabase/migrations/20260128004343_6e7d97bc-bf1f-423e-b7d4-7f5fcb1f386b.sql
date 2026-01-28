-- CRITICAL FIX: Restrict bu_profiles access - sensitive data should NOT be publicly accessible
-- Only the bu_profiles_public view (with limited columns) should be used for public directory

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles based on access level" ON public.bu_profiles;

-- Recreate policy that ONLY allows owner and collaborators to see full profile
-- Public profiles are only accessible through the bu_profiles_public view
CREATE POLICY "Users can view own and collaborator profiles only"
ON public.bu_profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  users_share_project(auth.uid(), user_id)
);

-- The bu_profiles_public view with security_invoker=on will NOT work
-- because the underlying table now blocks public access.
-- We need a different approach: use a security definer function

-- Create a security definer function to safely fetch public profiles
CREATE OR REPLACE FUNCTION public.get_public_profiles(
  trade_filter text DEFAULT NULL,
  availability_filter text DEFAULT NULL,
  contractors_only boolean DEFAULT false,
  search_query text DEFAULT NULL,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
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
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
  WHERE bp.is_public_profile = true 
    AND bp.profile_completed = true
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

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_profiles TO anon, authenticated;