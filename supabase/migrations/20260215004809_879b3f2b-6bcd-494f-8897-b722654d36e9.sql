
-- Create site_checkins table for site presence tracking
CREATE TABLE public.site_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  weather_snapshot JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_checkins ENABLE ROW LEVEL SECURITY;

-- Project owners can view all check-ins
CREATE POLICY "Project owners can view all check-ins"
ON public.site_checkins FOR SELECT
USING (is_project_owner(project_id, auth.uid()));

-- Team members can view project check-ins
CREATE POLICY "Team members can view project check-ins"
ON public.site_checkins FOR SELECT
USING (is_project_member(project_id, auth.uid()));

-- Users can check in (insert) for projects they belong to
CREATE POLICY "Users can check in to their projects"
ON public.site_checkins FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (is_project_owner(project_id, auth.uid()) OR is_project_member(project_id, auth.uid()))
);

-- Users can update their own check-ins (for check-out)
CREATE POLICY "Users can update own check-ins"
ON public.site_checkins FOR UPDATE
USING (auth.uid() = user_id);

-- No deletes allowed - audit trail
CREATE POLICY "Check-ins are immutable - no deletes"
ON public.site_checkins FOR DELETE
USING (false);

-- Enable realtime for presence updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_checkins;

-- Index for fast project lookups
CREATE INDEX idx_site_checkins_project ON public.site_checkins(project_id, checked_in_at DESC);
CREATE INDEX idx_site_checkins_user ON public.site_checkins(user_id, project_id);
