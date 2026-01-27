-- Enable realtime for bu_profiles table to allow live location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bu_profiles;