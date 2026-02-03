-- Add archived_at column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add archived_at column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add archived_at column to project_tasks table
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on archived status
CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_archived ON public.contracts(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_tasks_archived ON public.project_tasks(archived_at) WHERE archived_at IS NULL;

-- Update RLS policies for projects to filter archived for non-admins
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
CREATE POLICY "Users can view their own and shared projects" 
ON public.projects 
FOR SELECT 
USING (
  ((auth.uid() = user_id) OR is_project_member(id, auth.uid()))
  AND (archived_at IS NULL OR is_admin(auth.uid()))
);

-- Update delete policy to only allow soft delete (update archived_at)
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can soft delete their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can see all projects including archived
CREATE POLICY "Admins can view all projects including archived" 
ON public.projects 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Update RLS policies for contracts
DROP POLICY IF EXISTS "Owner can view contracts" ON public.contracts;
CREATE POLICY "Owner can view contracts" 
ON public.contracts 
FOR SELECT 
USING (
  (auth.uid() = user_id)
  AND (archived_at IS NULL OR is_admin(auth.uid()))
);

-- Admins can see all contracts
CREATE POLICY "Admins can view all contracts including archived" 
ON public.contracts 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Update RLS policies for project_tasks  
DROP POLICY IF EXISTS "Members can view assigned tasks" ON public.project_tasks;
CREATE POLICY "Members can view assigned tasks" 
ON public.project_tasks 
FOR SELECT 
USING (
  ((assigned_to = auth.uid()) OR can_view_all_project_data(project_id, auth.uid()))
  AND (archived_at IS NULL OR is_admin(auth.uid()))
);

-- Admins can see all tasks
CREATE POLICY "Admins can view all tasks including archived" 
ON public.project_tasks 
FOR SELECT 
USING (is_admin(auth.uid()));