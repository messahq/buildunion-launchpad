-- Drop existing api_key_requests table and recreate with text user_identifier
DROP TABLE IF EXISTS public.api_key_requests;

CREATE TABLE public.api_key_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier text NOT NULL,
  key_type text NOT NULL DEFAULT 'google_maps',
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_key_requests ENABLE ROW LEVEL SECURITY;

-- Server-side only insert (via service role)
CREATE POLICY "Server-side only api key request logging" 
ON public.api_key_requests 
FOR INSERT 
WITH CHECK (false);

-- Users can view their own requests
CREATE POLICY "Users can view their own api key requests" 
ON public.api_key_requests 
FOR SELECT 
USING (user_identifier = auth.uid()::text);

-- Immutable - no updates or deletes
CREATE POLICY "Api key requests are immutable - no updates" 
ON public.api_key_requests 
FOR UPDATE 
USING (false);

CREATE POLICY "Api key requests are immutable - no deletes" 
ON public.api_key_requests 
FOR DELETE 
USING (false);

-- Create index for efficient rate limit queries
CREATE INDEX idx_api_key_requests_user_type_created 
ON public.api_key_requests(user_identifier, key_type, created_at DESC);