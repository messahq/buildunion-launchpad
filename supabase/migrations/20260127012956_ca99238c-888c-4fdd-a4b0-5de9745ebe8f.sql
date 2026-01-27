-- Add contract tracking columns
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS sent_to_client_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_viewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_signed_at timestamp with time zone;

-- Create unique index on share_token for public link access
CREATE UNIQUE INDEX IF NOT EXISTS contracts_share_token_idx ON public.contracts(share_token);

-- Create contract events table for tracking views, signatures, etc.
CREATE TABLE public.contract_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'sent', 'viewed', 'signed', 'downloaded'
  event_data jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on contract_events
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

-- Contract owners can view their contract events
CREATE POLICY "Users can view their contract events"
ON public.contract_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_events.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Allow public inserts for tracking (view events from public links)
CREATE POLICY "Allow public event logging"
ON public.contract_events
FOR INSERT
WITH CHECK (true);

-- Add realtime for contract_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_events;