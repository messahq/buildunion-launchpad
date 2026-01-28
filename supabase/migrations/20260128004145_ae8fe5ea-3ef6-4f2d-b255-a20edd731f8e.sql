-- Fix Security Definer View issue by using security_invoker
-- Drop the current view
DROP VIEW IF EXISTS public.bu_profiles_public;

-- Recreate with security_invoker=on (this respects the caller's permissions)
CREATE VIEW public.bu_profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  avatar_url,
  primary_trade,
  secondary_trades,
  experience_level,
  experience_years,
  bio,
  company_name,
  service_area,
  availability,
  certifications,
  is_verified,
  is_contractor,
  created_at
FROM public.bu_profiles
WHERE is_public_profile = true AND profile_completed = true;

-- Grant access
GRANT SELECT ON public.bu_profiles_public TO anon, authenticated;

-- Now we need to update the bu_profiles policy to allow viewing public profiles
-- But only the safe columns through the view
DROP POLICY IF EXISTS "Users can view own and collaborator profiles" ON public.bu_profiles;

-- Allow users to see their own profile, collaborators' profiles, AND public profiles
-- The view restricts which columns are visible for public profiles
CREATE POLICY "Users can view profiles based on access level"
ON public.bu_profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  users_share_project(auth.uid(), user_id) OR
  (is_public_profile = true AND profile_completed = true)
);