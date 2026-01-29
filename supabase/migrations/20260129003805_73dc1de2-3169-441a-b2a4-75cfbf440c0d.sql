-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read attachments where they are sender or recipient
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM team_messages tm
      WHERE tm.id::text = (storage.foldername(name))[2]
      AND (tm.sender_id = auth.uid() OR tm.recipient_id = auth.uid())
    )
  )
);

-- Allow users to delete their own uploaded attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add attachment_url column to team_messages
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS attachment_name text;