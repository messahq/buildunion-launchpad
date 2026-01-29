
-- =============================================
-- FIX: Add share token expiration to contracts
-- =============================================

-- Add expiration column for share tokens (default 30 days from creation)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS share_token_expires_at timestamp with time zone;

-- Set default expiration for new contracts (30 days from sent_to_client_at or created_at)
-- Existing contracts with share tokens get 30 days from now
UPDATE public.contracts
SET share_token_expires_at = COALESCE(sent_to_client_at, created_at) + interval '30 days'
WHERE share_token IS NOT NULL AND share_token_expires_at IS NULL;

-- Create function to check if share token is valid
CREATE OR REPLACE FUNCTION public.is_share_token_valid(_contract_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contracts
    WHERE id = _contract_id
      AND share_token IS NOT NULL
      AND (share_token_expires_at IS NULL OR share_token_expires_at > now())
  )
$$;
