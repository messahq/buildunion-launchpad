
-- Create AI model usage tracking table
CREATE TABLE public.ai_model_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  model_used text NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  tokens_used integer DEFAULT 0,
  latency_ms integer DEFAULT 0,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_model_usage ENABLE ROW LEVEL SECURITY;

-- Only admins can view all usage logs
CREATE POLICY "Admins can view all AI usage"
ON public.ai_model_usage
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage"
ON public.ai_model_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Server-side only insertion (edge functions use service role)
CREATE POLICY "Server-side only AI usage logging"
ON public.ai_model_usage
FOR INSERT
WITH CHECK (false);

-- No updates or deletes
CREATE POLICY "AI usage logs are immutable - no updates"
ON public.ai_model_usage
FOR UPDATE
USING (false);

CREATE POLICY "AI usage logs are immutable - no deletes"
ON public.ai_model_usage
FOR DELETE
USING (false);

-- Index for admin dashboard queries
CREATE INDEX idx_ai_model_usage_created_at ON public.ai_model_usage(created_at DESC);
CREATE INDEX idx_ai_model_usage_tier ON public.ai_model_usage(tier);
CREATE INDEX idx_ai_model_usage_function ON public.ai_model_usage(function_name);
