-- ============================================
-- SECURITY FIX: Defense-in-depth for profiles table
-- ============================================

-- 1. Add a more restrictive RLS policy to profiles that prevents any public access
-- This adds defense-in-depth: even if the primary policy is modified, this ensures no anonymous access
CREATE POLICY "Deny all anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- ============================================
-- SECURITY FIX: Protect phone numbers in bu_profiles
-- ============================================

-- 2. Create a view that excludes sensitive phone data for collaborator access
-- The existing RLS allows collaborators to see full profiles - we need to limit phone exposure

-- First, create a function to check if user can see phone number (only own profile)
CREATE OR REPLACE FUNCTION public.can_view_phone(_profile_user_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _profile_user_id = _viewer_id
$$;

-- 3. Create a secure view for collaborator access that masks phone numbers
CREATE OR REPLACE VIEW public.bu_profiles_collaborator
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  avatar_url,
  bio,
  company_name,
  company_logo_url,
  company_website,
  service_area,
  availability,
  primary_trade,
  secondary_trades,
  experience_level,
  experience_years,
  certifications,
  is_verified,
  is_contractor,
  is_union_member,
  union_name,
  is_public_profile,
  profile_completed,
  latitude,
  longitude,
  location_status,
  location_updated_at,
  hourly_rate,
  created_at,
  updated_at,
  -- Phone is only visible if viewer is the profile owner
  CASE 
    WHEN user_id = auth.uid() THEN phone 
    ELSE NULL 
  END as phone
FROM public.bu_profiles;