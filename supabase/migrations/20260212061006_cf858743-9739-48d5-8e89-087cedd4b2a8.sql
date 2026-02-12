
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS link text;

-- Drop old immutable policy
DROP POLICY IF EXISTS "Notification logs are immutable - no updates" ON notification_logs;

-- Allow users to mark their own notifications as read
CREATE POLICY "Users can mark own notifications read"
ON notification_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
