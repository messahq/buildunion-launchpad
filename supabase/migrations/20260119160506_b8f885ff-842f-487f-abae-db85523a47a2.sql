-- Create user_trials table for tracking feature trials (database-based, not localStorage)
CREATE TABLE public.user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL DEFAULT 'blueprint_analysis',
  used_count INTEGER NOT NULL DEFAULT 0,
  max_allowed INTEGER NOT NULL DEFAULT 3,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

-- Create user_draft_data table for saving work-in-progress data
CREATE TABLE public.user_draft_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_type TEXT NOT NULL DEFAULT 'quick_mode',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, draft_type)
);

-- Enable RLS on both tables
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_draft_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_trials
CREATE POLICY "Users can view their own trials"
ON public.user_trials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trials"
ON public.user_trials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trials"
ON public.user_trials
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for user_draft_data
CREATE POLICY "Users can view their own drafts"
ON public.user_draft_data
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
ON public.user_draft_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON public.user_draft_data
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON public.user_draft_data
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at on user_trials
CREATE TRIGGER update_user_trials_updated_at
BEFORE UPDATE ON public.user_trials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for last_updated on user_draft_data
CREATE TRIGGER update_user_draft_data_updated_at
BEFORE UPDATE ON public.user_draft_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();