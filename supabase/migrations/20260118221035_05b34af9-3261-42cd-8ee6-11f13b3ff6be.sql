-- Add address and trade fields to projects table for the wizard
ALTER TABLE public.projects 
ADD COLUMN address TEXT,
ADD COLUMN trade TEXT;

-- Create team_invitations table for project collaboration
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_invitations
CREATE POLICY "Users can view invitations for their projects"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = team_invitations.project_id 
    AND projects.user_id = auth.uid()
  )
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Project owners can create invitations"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = team_invitations.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can delete invitations"
ON public.team_invitations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = team_invitations.project_id 
    AND projects.user_id = auth.uid()
  )
);