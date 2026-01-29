-- ===========================================
-- Team Role Permission System
-- ===========================================

-- 1. Create project_role enum type for type safety
DO $$ BEGIN
  CREATE TYPE public.project_role AS ENUM ('owner', 'foreman', 'worker', 'inspector', 'subcontractor', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create helper function to get user's role in a project
CREATE OR REPLACE FUNCTION public.get_project_role(_project_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM projects WHERE id = _project_id AND user_id = _user_id) 
        THEN 'owner'
      ELSE (SELECT role FROM project_members WHERE project_id = _project_id AND user_id = _user_id LIMIT 1)
    END
$$;

-- 3. Create role permission check functions
-- Foreman can: create/edit tasks, upload documents, manage team schedules
CREATE OR REPLACE FUNCTION public.can_manage_tasks(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_project_owner(_project_id, _user_id) 
    OR get_project_role(_project_id, _user_id) IN ('foreman')
$$;

-- Worker can: view assigned tasks, update own task status
CREATE OR REPLACE FUNCTION public.can_update_task_status(_project_id uuid, _user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_tasks 
    WHERE id = _task_id 
    AND project_id = _project_id 
    AND assigned_to = _user_id
  )
$$;

-- Inspector can: view everything, create syntheses/reports (read-heavy role)
CREATE OR REPLACE FUNCTION public.can_view_all_project_data(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_project_owner(_project_id, _user_id) 
    OR get_project_role(_project_id, _user_id) IN ('foreman', 'inspector')
$$;

-- Can upload documents (owner, foreman only)
CREATE OR REPLACE FUNCTION public.can_upload_documents(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_project_owner(_project_id, _user_id) 
    OR get_project_role(_project_id, _user_id) IN ('foreman')
$$;

-- 4. Update project_tasks RLS policies for role-based access
-- Drop existing policies first
DROP POLICY IF EXISTS "Members can update their task status" ON project_tasks;
DROP POLICY IF EXISTS "Members can view their tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project owners can manage tasks" ON project_tasks;

-- Owners and Foremen can do everything with tasks
CREATE POLICY "Owners and foremen can manage all tasks"
ON project_tasks FOR ALL
USING (can_manage_tasks(project_id, auth.uid()));

-- Workers and other roles can only view their assigned tasks
CREATE POLICY "Members can view assigned tasks"
ON project_tasks FOR SELECT
USING (
  assigned_to = auth.uid() 
  OR can_view_all_project_data(project_id, auth.uid())
);

-- Workers can update only their own task status
CREATE POLICY "Workers can update own task status"
ON project_tasks FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- 5. Update project_documents RLS for role-based upload
DROP POLICY IF EXISTS "Users can upload documents to their projects" ON project_documents;
DROP POLICY IF EXISTS "Users can delete their project documents" ON project_documents;

-- Only owners and foremen can upload
CREATE POLICY "Owners and foremen can upload documents"
ON project_documents FOR INSERT
WITH CHECK (can_upload_documents(project_id, auth.uid()));

-- Only owners can delete
CREATE POLICY "Owners can delete documents"
ON project_documents FOR DELETE
USING (is_project_owner(project_id, auth.uid()));

-- 6. Update project_summaries to allow inspector read access
DROP POLICY IF EXISTS "Users can view their own summaries" ON project_summaries;

CREATE POLICY "Owners and inspectors can view summaries"
ON project_summaries FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    project_id IS NOT NULL 
    AND can_view_all_project_data(project_id, auth.uid())
  )
);