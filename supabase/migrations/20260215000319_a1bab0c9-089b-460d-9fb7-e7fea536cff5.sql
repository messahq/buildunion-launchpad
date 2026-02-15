
-- Fix: Change project_chat_messages owner policy from RESTRICTIVE to PERMISSIVE
-- so subcontractors and other team members can read/send chat messages
-- (RESTRICTIVE ALL policy blocks non-owners since ALL conditions must pass)

DROP POLICY IF EXISTS "Project owners can manage chat messages" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Team members can send chat messages" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Team members can view chat messages" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.project_chat_messages;

-- Permissive policies (OR logic - any matching policy grants access)
CREATE POLICY "Project owners can manage chat messages"
ON public.project_chat_messages
FOR ALL
USING (is_project_owner(project_id, auth.uid()))
WITH CHECK (is_project_owner(project_id, auth.uid()));

CREATE POLICY "Team members can view chat messages"
ON public.project_chat_messages
FOR SELECT
USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Team members can send chat messages"
ON public.project_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (is_project_owner(project_id, auth.uid()) OR is_project_member(project_id, auth.uid()))
);

CREATE POLICY "Users can delete own chat messages"
ON public.project_chat_messages
FOR DELETE
USING (auth.uid() = user_id);
