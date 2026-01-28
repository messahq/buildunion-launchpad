-- =============================================
-- SECURITY FIX: bu_profiles - Restrict sensitive data from public view
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own, collaborator, and public profiles" ON public.bu_profiles;

-- Create new policy: Full access only for owner and collaborators
CREATE POLICY "Users can view own and collaborator profiles"
ON public.bu_profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  users_share_project(auth.uid(), user_id)
);

-- Create a safe public view for public profiles (excludes sensitive data)
CREATE OR REPLACE VIEW public.bu_profiles_public
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
  -- EXCLUDED: phone, hourly_rate, latitude, longitude, location_status, 
  -- location_updated_at, company_website, company_logo_url, union_name, is_union_member
FROM public.bu_profiles
WHERE is_public_profile = true AND profile_completed = true;

-- Grant access to the public view
GRANT SELECT ON public.bu_profiles_public TO anon, authenticated;

-- =============================================
-- SECURITY FIX: baseline_versions - Prevent tampering with history
-- =============================================

-- Add explicit UPDATE deny policy
CREATE POLICY "Baseline versions are immutable - no updates"
ON public.baseline_versions
FOR UPDATE
USING (false);

-- Add explicit DELETE deny policy  
CREATE POLICY "Baseline versions are immutable - no deletes"
ON public.baseline_versions
FOR DELETE
USING (false);

-- =============================================
-- SECURITY FIX: contract_events - Protect audit trail
-- =============================================

-- Add INSERT policy - only server-side via edge functions
CREATE POLICY "Server-side only contract event creation"
ON public.contract_events
FOR INSERT
WITH CHECK (false);

-- Add UPDATE deny policy
CREATE POLICY "Contract events are immutable - no updates"
ON public.contract_events
FOR UPDATE
USING (false);

-- Add DELETE deny policy
CREATE POLICY "Contract events are immutable - no deletes"
ON public.contract_events
FOR DELETE
USING (false);

-- =============================================
-- SECURITY FIX: notification_logs - Protect notification history
-- =============================================

-- Add UPDATE deny policy
CREATE POLICY "Notification logs are immutable - no updates"
ON public.notification_logs
FOR UPDATE
USING (false);

-- Add DELETE deny policy
CREATE POLICY "Notification logs are immutable - no deletes"
ON public.notification_logs
FOR DELETE
USING (false);