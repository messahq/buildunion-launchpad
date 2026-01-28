-- Create table to track API key usage for rate limiting
CREATE TABLE public.api_key_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key_type text NOT NULL DEFAULT 'google_maps',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create index for efficient rate limit queries
CREATE INDEX idx_api_key_requests_user_time ON public.api_key_requests (user_id, key_type, created_at DESC);

-- Auto-cleanup old records (keep 7 days for analytics)
-- Records older than 7 days can be cleaned up by a scheduled job

-- Enable RLS
ALTER TABLE public.api_key_requests ENABLE ROW LEVEL SECURITY;

-- Only server-side can insert (edge functions with service role)
CREATE POLICY "Server-side only api key request logging"
ON public.api_key_requests
FOR INSERT
WITH CHECK (false);

-- Users can view their own request history (optional, for transparency)
CREATE POLICY "Users can view their own api key requests"
ON public.api_key_requests
FOR SELECT
USING (auth.uid() = user_id);

-- No updates or deletes from client
CREATE POLICY "Api key requests are immutable - no updates"
ON public.api_key_requests
FOR UPDATE
USING (false);

CREATE POLICY "Api key requests are immutable - no deletes"
ON public.api_key_requests
FOR DELETE
USING (false);