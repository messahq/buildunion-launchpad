-- Create team chat messages table
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own messages"
ON public.team_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.team_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (for marking as read)
CREATE POLICY "Users can update received messages"
ON public.team_messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Users can delete their own sent messages
CREATE POLICY "Users can delete their own messages"
ON public.team_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Add location columns to bu_profiles for map feature
ALTER TABLE public.bu_profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;