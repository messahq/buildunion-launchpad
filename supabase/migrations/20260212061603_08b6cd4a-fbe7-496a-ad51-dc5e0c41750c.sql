
-- Drop the immutable delete policy and allow users to delete their own notifications
DROP POLICY IF EXISTS "Notification logs are immutable - no deletes" ON public.notification_logs;

CREATE POLICY "Users can delete their own notifications"
ON public.notification_logs
FOR DELETE
USING (auth.uid() = user_id);
