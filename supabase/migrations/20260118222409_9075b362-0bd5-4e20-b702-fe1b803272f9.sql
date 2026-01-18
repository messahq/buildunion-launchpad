-- Add new columns to projects table for enhanced project details
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS trades text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS manpower_requirements jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS required_certifications text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS site_images text[] DEFAULT '{}';

-- Create index for trades array searching
CREATE INDEX IF NOT EXISTS idx_projects_trades ON public.projects USING GIN(trades);

-- Add comment for documentation
COMMENT ON COLUMN public.projects.trades IS 'Array of construction trades required for this project';
COMMENT ON COLUMN public.projects.manpower_requirements IS 'JSON array of {trade, count} objects specifying required workers';
COMMENT ON COLUMN public.projects.required_certifications IS 'Array of required certifications/documents workers must have';
COMMENT ON COLUMN public.projects.site_images IS 'Array of storage paths for site photos';