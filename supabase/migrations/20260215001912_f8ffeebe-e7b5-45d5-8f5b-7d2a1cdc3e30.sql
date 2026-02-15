
-- Add metadata columns to project_documents for tracking who uploaded and when
ALTER TABLE public.project_documents 
  ADD COLUMN IF NOT EXISTS uploaded_by UUID,
  ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_analysis_result JSONB DEFAULT NULL;
