-- Add project timeline date columns to project_summaries
ALTER TABLE public.project_summaries 
ADD COLUMN IF NOT EXISTS project_start_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS project_end_date date DEFAULT NULL;