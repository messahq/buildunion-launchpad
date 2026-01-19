-- Create table for project team members (accepted invitations become members)
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Project owners can view all members
CREATE POLICY "Project owners can view members" 
ON public.project_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_members.project_id 
    AND projects.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Policy: Project owners can add members
CREATE POLICY "Project owners can add members" 
ON public.project_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_members.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Policy: Project owners can remove members
CREATE POLICY "Project owners can remove members" 
ON public.project_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_members.project_id 
    AND projects.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Update team_invitations to add response functionality
ALTER TABLE public.team_invitations 
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();

-- Policy for invited users to update their own invitations (accept/decline)
CREATE POLICY "Invited users can update invitation status" 
ON public.team_invitations 
FOR UPDATE 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Update projects RLS to allow team members to view
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Users can view their own and shared projects" 
ON public.projects 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = projects.id 
    AND project_members.user_id = auth.uid()
  )
);

-- Update project_documents RLS to allow team members to view
DROP POLICY IF EXISTS "Users can view their project documents" ON public.project_documents;

CREATE POLICY "Users can view their project documents" 
ON public.project_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_documents.project_id 
    AND (
      projects.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_members.project_id = projects.id 
        AND project_members.user_id = auth.uid()
      )
    )
  )
);

-- Update project_syntheses RLS to allow team members to view
DROP POLICY IF EXISTS "Users can view their project syntheses" ON public.project_syntheses;

CREATE POLICY "Users can view their project syntheses" 
ON public.project_syntheses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_syntheses.project_id 
    AND (
      projects.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_members.project_id = projects.id 
        AND project_members.user_id = auth.uid()
      )
    )
  )
);

-- Enable realtime for team-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invitations;