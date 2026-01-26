-- Add budget fields to project_tasks for cost tracking
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC GENERATED ALWAYS AS (unit_price * quantity) STORED;

-- Add baseline snapshot fields to project_summaries
ALTER TABLE public.project_summaries
ADD COLUMN IF NOT EXISTS baseline_snapshot JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS baseline_locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS baseline_locked_by UUID DEFAULT NULL;

-- Add comment for baseline fields
COMMENT ON COLUMN public.project_summaries.baseline_snapshot IS 'Stored 8 Pillars of Operational Truth snapshot when project work begins';
COMMENT ON COLUMN public.project_summaries.baseline_locked_at IS 'Timestamp when baseline was locked';
COMMENT ON COLUMN public.project_summaries.baseline_locked_by IS 'User ID who locked the baseline';