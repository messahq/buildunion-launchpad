-- Create a security definer function to check project ownership without recursion
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND user_id = _user_id
  )
$$;

-- Create a security definer function to check project membership without recursion
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = _user_id
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can view members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON public.project_members;

-- Recreate projects SELECT policy using the function
CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_project_member(id, auth.uid())
);

-- Recreate project_members policies using the function
CREATE POLICY "Project owners can view members"
ON public.project_members
FOR SELECT
USING (
  public.is_project_owner(project_id, auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Project owners can add members"
ON public.project_members
FOR INSERT
WITH CHECK (
  public.is_project_owner(project_id, auth.uid())
);

CREATE POLICY "Project owners can remove members"
ON public.project_members
FOR DELETE
USING (
  public.is_project_owner(project_id, auth.uid())
  OR user_id = auth.uid()
);