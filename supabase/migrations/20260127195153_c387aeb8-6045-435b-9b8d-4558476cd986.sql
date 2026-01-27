-- Create task_templates table for reusable task sets
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  icon TEXT DEFAULT '📋',
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own and public templates
CREATE POLICY "Users can view own and public task templates"
ON public.task_templates
FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

-- Users can create their own templates
CREATE POLICY "Users can create their own task templates"
ON public.task_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update their own task templates"
ON public.task_templates
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own task templates"
ON public.task_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_task_templates_user_id ON public.task_templates(user_id);
CREATE INDEX idx_task_templates_category ON public.task_templates(category);
CREATE INDEX idx_task_templates_is_public ON public.task_templates(is_public) WHERE is_public = true;