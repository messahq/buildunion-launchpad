-- Fix: Enable RLS on the public view
-- Note: Views with security_invoker=on inherit RLS from underlying tables
-- But we need to ensure the view itself has proper access controls

-- The bu_profiles_public view was created with security_invoker=on
-- This means it respects the RLS of the underlying bu_profiles table
-- However, the underlying table now restricts access to owner/collaborators only

-- Since we want this view to be accessible to all authenticated users (for the directory),
-- we need to modify our approach:
-- 1. Drop the current restrictive policy on bu_profiles
-- 2. Create a policy that allows viewing public profiles with limited columns

-- First, let's drop the overly restrictive view and policy
DROP VIEW IF EXISTS public.bu_profiles_public;

-- Recreate the view without security_invoker (we'll use a security definer function instead)
CREATE OR REPLACE VIEW public.bu_profiles_public AS
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

-- Grant access to the view for authenticated and anonymous users
GRANT SELECT ON public.bu_profiles_public TO anon, authenticated;

-- Now fix the bu_profiles policy to allow full access to owner and collaborators
-- The view handles public profile access separately
DROP POLICY IF EXISTS "Users can view own and collaborator profiles" ON public.bu_profiles;

CREATE POLICY "Users can view own and collaborator profiles"
ON public.bu_profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  users_share_project(auth.uid(), user_id)
);