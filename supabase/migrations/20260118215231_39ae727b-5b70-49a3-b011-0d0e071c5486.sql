-- Add union membership fields to bu_profiles
ALTER TABLE public.bu_profiles 
ADD COLUMN is_union_member BOOLEAN DEFAULT false,
ADD COLUMN union_name TEXT;