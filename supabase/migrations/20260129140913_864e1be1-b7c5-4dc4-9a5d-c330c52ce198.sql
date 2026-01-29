
-- =============================================
-- FIX 1: Restrict bu_profiles base table access
-- =============================================
-- Drop the existing SELECT policy that allows collaborators to see all data
DROP POLICY IF EXISTS "Users can view own and collaborator profiles only" ON public.bu_profiles;

-- Create a restrictive policy: only owners can SELECT from base table directly
-- Collaborators MUST use the bu_profiles_collaborator view which masks the phone field
CREATE POLICY "Users can only view their own profile directly"
ON public.bu_profiles FOR SELECT
USING (auth.uid() = user_id);

-- =============================================
-- FIX 2: Restrict project_summaries client PII
-- =============================================
-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Owners and inspectors can view summaries" ON public.project_summaries;

-- Create new policy: Only project owners can see summaries with client PII
-- Team members (inspectors, foremen) can see summaries only for linked projects
-- but client PII fields are protected by a view below
CREATE POLICY "Only owners can view full summaries"
ON public.project_summaries FOR SELECT
USING (auth.uid() = user_id);

-- Create a secure view for team members to access non-sensitive summary data
CREATE OR REPLACE VIEW public.project_summaries_team
WITH (security_invoker = on) AS
SELECT 
  id,
  project_id,
  user_id,
  mode,
  status,
  -- Exclude client PII: client_name, client_email, client_phone, client_address
  notes,
  calculator_results,
  photo_estimate,
  line_items,
  template_items,
  total_cost,
  labor_cost,
  material_cost,
  verified_facts,
  blueprint_analysis,
  ai_workflow_config,
  project_start_date,
  project_end_date,
  baseline_locked_at,
  baseline_locked_by,
  baseline_snapshot,
  current_baseline_version_id,
  invoice_status,
  invoice_id,
  invoice_sent_at,
  created_at,
  updated_at
FROM public.project_summaries
WHERE 
  -- Owner can see everything
  auth.uid() = user_id
  OR (
    -- Team members can see summaries for their projects (without PII)
    project_id IS NOT NULL 
    AND can_view_all_project_data(project_id, auth.uid())
  );

-- =============================================
-- Create secure function for collaborator profile lookup
-- =============================================
CREATE OR REPLACE FUNCTION public.get_collaborator_profiles(_viewer_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  avatar_url text,
  bio text,
  company_name text,
  company_logo_url text,
  company_website text,
  service_area text,
  availability text,
  primary_trade public.construction_trade,
  secondary_trades public.construction_trade[],
  experience_level public.experience_level,
  experience_years integer,
  certifications text[],
  is_verified boolean,
  is_contractor boolean,
  is_union_member boolean,
  union_name text,
  is_public_profile boolean,
  profile_completed boolean,
  latitude double precision,
  longitude double precision,
  location_status text,
  location_updated_at timestamp with time zone,
  hourly_rate numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone text -- Will be NULL for non-owners
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
    bp.bio,
    bp.company_name,
    bp.company_logo_url,
    bp.company_website,
    bp.service_area,
    bp.availability,
    bp.primary_trade,
    bp.secondary_trades,
    bp.experience_level,
    bp.experience_years,
    bp.certifications,
    bp.is_verified,
    bp.is_contractor,
    bp.is_union_member,
    bp.union_name,
    bp.is_public_profile,
    bp.profile_completed,
    bp.latitude,
    bp.longitude,
    bp.location_status,
    bp.location_updated_at,
    bp.hourly_rate,
    bp.created_at,
    bp.updated_at,
    CASE 
      WHEN bp.user_id = _viewer_id THEN bp.phone 
      ELSE NULL 
    END AS phone
  FROM public.bu_profiles bp
  WHERE bp.user_id = _viewer_id 
     OR users_share_project(_viewer_id, bp.user_id);
$$;
