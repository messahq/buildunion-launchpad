-- Create baseline_versions table for version history
CREATE TABLE public.baseline_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  summary_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_version_id UUID REFERENCES public.baseline_versions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.baseline_versions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_baseline_versions_project ON public.baseline_versions(project_id);
CREATE INDEX idx_baseline_versions_summary ON public.baseline_versions(summary_id);
CREATE INDEX idx_baseline_versions_changed_at ON public.baseline_versions(changed_at DESC);

-- RLS Policies
CREATE POLICY "Users can view their project baseline versions"
ON public.baseline_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = baseline_versions.project_id 
    AND (projects.user_id = auth.uid() OR is_project_member(projects.id, auth.uid()))
  )
);

CREATE POLICY "Project owners can create baseline versions"
ON public.baseline_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = baseline_versions.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Add baseline_version_id to project_summaries to track current version
ALTER TABLE public.project_summaries 
ADD COLUMN IF NOT EXISTS current_baseline_version_id UUID REFERENCES public.baseline_versions(id);

-- Add foreign key constraints
ALTER TABLE public.baseline_versions
ADD CONSTRAINT fk_baseline_versions_project
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.baseline_versions
ADD CONSTRAINT fk_baseline_versions_summary
FOREIGN KEY (summary_id) REFERENCES public.project_summaries(id) ON DELETE CASCADE;