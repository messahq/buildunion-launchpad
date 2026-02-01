-- Fix RLS policies for contracts table - restrict to owner only
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can create their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;

-- Strict owner-only access for contracts (protects client PII)
CREATE POLICY "Owner can view contracts"
ON public.contracts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update contracts"
ON public.contracts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete contracts"
ON public.contracts FOR DELETE
USING (auth.uid() = user_id);

-- Fix bu_profiles_collaborator view - add security invoker
DROP VIEW IF EXISTS public.bu_profiles_collaborator;

CREATE VIEW public.bu_profiles_collaborator
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  company_name,
  company_logo_url,
  company_website,
  avatar_url,
  bio,
  primary_trade,
  secondary_trades,
  experience_level,
  experience_years,
  certifications,
  hourly_rate,
  availability,
  service_area,
  is_contractor,
  is_union_member,
  union_name,
  is_verified,
  is_public_profile,
  profile_completed,
  latitude,
  longitude,
  location_status,
  location_updated_at,
  created_at,
  updated_at,
  -- Mask phone for privacy - only owner sees real phone
  NULL::text AS phone
FROM public.bu_profiles;