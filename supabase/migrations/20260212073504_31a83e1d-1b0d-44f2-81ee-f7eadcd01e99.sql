-- Allow project teammates to view each other's bu_profiles (for location_status, etc.)
CREATE POLICY "Team members can view collaborator bu_profiles"
ON public.bu_profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR users_share_project(auth.uid(), user_id)
);