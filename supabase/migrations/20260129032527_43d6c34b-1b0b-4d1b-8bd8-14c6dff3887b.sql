-- Add UPDATE policy for project_members to allow owners to change member roles
CREATE POLICY "Project owners can update member roles"
ON project_members FOR UPDATE
USING (is_project_owner(project_id, auth.uid()))
WITH CHECK (is_project_owner(project_id, auth.uid()));