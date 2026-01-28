-- Create admin_email_logs table for tracking sent emails
CREATE TABLE public.admin_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  message_preview text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins can view all email logs"
ON public.admin_email_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Server-side only insert (from edge functions)
CREATE POLICY "Server-side only email log creation"
ON public.admin_email_logs
FOR INSERT
WITH CHECK (false);

-- Email logs are immutable - no updates
CREATE POLICY "Email logs are immutable - no updates"
ON public.admin_email_logs
FOR UPDATE
USING (false);

-- Email logs are immutable - no deletes
CREATE POLICY "Email logs are immutable - no deletes"
ON public.admin_email_logs
FOR DELETE
USING (false);

-- Add index for faster queries
CREATE INDEX idx_admin_email_logs_sent_at ON public.admin_email_logs(sent_at DESC);
CREATE INDEX idx_admin_email_logs_sender_id ON public.admin_email_logs(sender_id);