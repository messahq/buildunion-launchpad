-- Create enum for trades/professions in construction
CREATE TYPE public.construction_trade AS ENUM (
  'general_contractor',
  'electrician', 
  'plumber',
  'carpenter',
  'mason',
  'roofer',
  'hvac_technician',
  'painter',
  'welder',
  'heavy_equipment_operator',
  'concrete_worker',
  'drywall_installer',
  'flooring_specialist',
  'landscaper',
  'project_manager',
  'architect',
  'engineer',
  'inspector',
  'other'
);

-- Create enum for experience levels
CREATE TYPE public.experience_level AS ENUM (
  'apprentice',
  'journeyman',
  'master',
  'supervisor',
  'manager'
);

-- Create BuildUnion specific profiles table
CREATE TABLE public.bu_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Professional info
  primary_trade construction_trade,
  secondary_trades construction_trade[] DEFAULT '{}',
  experience_level experience_level,
  experience_years INTEGER DEFAULT 0,
  certifications TEXT[] DEFAULT '{}',
  
  -- Contact & Company
  phone TEXT,
  company_name TEXT,
  company_website TEXT,
  
  -- Profile details
  bio TEXT,
  hourly_rate DECIMAL(10,2),
  availability TEXT DEFAULT 'available',
  
  -- Location
  service_area TEXT,
  
  -- Metadata
  is_contractor BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bu_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all BU profiles"
ON public.bu_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own BU profile"
ON public.bu_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own BU profile"
ON public.bu_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bu_profiles_updated_at
BEFORE UPDATE ON public.bu_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();