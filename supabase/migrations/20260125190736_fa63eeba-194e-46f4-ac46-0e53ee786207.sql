-- Add mode column to project_summaries table
-- This enables bidirectional Solo ↔ Team switching without data loss

ALTER TABLE public.project_summaries 
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'solo';

-- Add check constraint for valid modes
ALTER TABLE public.project_summaries 
ADD CONSTRAINT project_summaries_mode_check 
CHECK (mode IN ('solo', 'team'));

-- Update existing records: if project_id is set, mark as 'team', otherwise 'solo'
UPDATE public.project_summaries 
SET mode = CASE 
  WHEN project_id IS NOT NULL THEN 'team' 
  ELSE 'solo' 
END;

-- Add index for faster mode-based queries
CREATE INDEX IF NOT EXISTS idx_project_summaries_mode ON public.project_summaries(mode);

-- Add index for user + mode combination (common query pattern)
CREATE INDEX IF NOT EXISTS idx_project_summaries_user_mode ON public.project_summaries(user_id, mode);