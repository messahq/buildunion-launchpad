-- Fix 1: Add explicit deny policy for non-admin access to admin_email_logs
-- The table already has "Admins can view all email logs" policy, but we need 
-- to ensure RLS properly denies non-admins at the policy level

-- Drop the existing admin SELECT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.admin_email_logs;

-- Create a PERMISSIVE policy that only allows admins
CREATE POLICY "Admins can view all email logs"
ON public.admin_email_logs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Add explicit deny for anon role
CREATE POLICY "Deny anonymous access to email logs"
ON public.admin_email_logs
FOR SELECT
TO anon
USING (false);

-- Fix 2: Update bu_profiles_public view to use security_invoker
-- This ensures the view respects the RLS of the underlying bu_profiles table
DROP VIEW IF EXISTS public.bu_profiles_public;

CREATE VIEW public.bu_profiles_public
WITH (security_invoker = on)
AS SELECT 
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
WHERE is_public_profile = true;