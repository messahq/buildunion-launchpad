
-- Create project chat messages table for in-panel group chat
CREATE TABLE public.project_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;

-- Project owner can do everything
CREATE POLICY "Project owners can manage chat messages"
  ON public.project_chat_messages
  FOR ALL
  USING (is_project_owner(project_id, auth.uid()))
  WITH CHECK (is_project_owner(project_id, auth.uid()));

-- Team members can view all project chat messages
CREATE POLICY "Team members can view chat messages"
  ON public.project_chat_messages
  FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

-- Team members can send messages (only as themselves)
CREATE POLICY "Team members can send chat messages"
  ON public.project_chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND (is_project_owner(project_id, auth.uid()) OR is_project_member(project_id, auth.uid()))
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete own chat messages"
  ON public.project_chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for fast project lookups
CREATE INDEX idx_project_chat_messages_project_id ON public.project_chat_messages(project_id, created_at DESC);
