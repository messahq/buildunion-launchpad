-- Add company_logo column to bu_profiles for PDF quote branding
ALTER TABLE public.bu_profiles 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;