-- Add status column for team member location status
ALTER TABLE public.bu_profiles 
ADD COLUMN location_status text DEFAULT 'away' 
CHECK (location_status IN ('on_site', 'en_route', 'away'));