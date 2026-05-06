
-- 1) Restrict bu_profiles exposure
DROP POLICY IF EXISTS "View team collaborator bu_profiles" ON public.bu_profiles;

-- Owners need full profile (phone, hst_number) for contracts/invoices of their team
CREATE POLICY "Owners can view full profiles of their project members"
ON public.bu_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.user_id = bu_profiles.user_id
      AND p.user_id = auth.uid()
  )
);

-- Recreate collaborator view hiding both phone AND hst_number
CREATE OR REPLACE VIEW public.bu_profiles_collaborator AS
SELECT
  id, user_id,
  company_name, company_logo_url, company_website,
  avatar_url, bio,
  primary_trade, secondary_trades,
  experience_level, experience_years, certifications,
  hourly_rate, availability, service_area,
  is_contractor, is_union_member, union_name,
  is_verified, is_public_profile, profile_completed,
  latitude, longitude, location_status, location_updated_at,
  created_at, updated_at,
  NULL::text AS phone,
  NULL::text AS hst_number
FROM public.bu_profiles
WHERE public.users_share_project(auth.uid(), user_id);

GRANT SELECT ON public.bu_profiles_collaborator TO authenticated;

-- 2) Prevent privilege escalation to admin via user_roles
CREATE OR REPLACE FUNCTION public.prevent_admin_self_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'::app_role THEN
    -- Allow if there is no admin yet (bootstrap), or the actor is already admin
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role)
       AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins may assign the admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_self_assignment_trg ON public.user_roles;
CREATE TRIGGER prevent_admin_self_assignment_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_self_assignment();

-- 3) Allow project members to see other members of projects they belong to
CREATE POLICY "Members can view team for their projects"
ON public.project_members
FOR SELECT
TO authenticated
USING (
  public.is_project_member(project_id, auth.uid())
);
