-- Add HST/Business Number field to bu_profiles
ALTER TABLE public.bu_profiles ADD COLUMN hst_number text DEFAULT NULL;