-- Create a table for storing verified AI syntheses from M.E.S.S.A. dual-engine analysis
CREATE TABLE public.project_syntheses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  gemini_response TEXT,
  openai_response TEXT,
  verification_status TEXT NOT NULL DEFAULT 'verified',
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_syntheses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their project syntheses" 
ON public.project_syntheses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_syntheses.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create syntheses for their projects" 
ON public.project_syntheses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_syntheses.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their project syntheses" 
ON public.project_syntheses 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = project_syntheses.project_id 
  AND projects.user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_project_syntheses_project_id ON public.project_syntheses(project_id);
CREATE INDEX idx_project_syntheses_created_at ON public.project_syntheses(created_at DESC);