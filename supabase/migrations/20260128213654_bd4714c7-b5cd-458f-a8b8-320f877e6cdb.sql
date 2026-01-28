-- Fix: Remove the overly permissive public INSERT policy on contract_events
-- The view-contract edge function uses SERVICE_ROLE_KEY which bypasses RLS anyway

-- Drop the permissive policy that allows anyone to insert events
DROP POLICY IF EXISTS "Allow public event logging" ON public.contract_events;

-- Ensure server-side only policy exists (this may already exist but we recreate to be safe)
DROP POLICY IF EXISTS "Server-side only contract event creation" ON public.contract_events;

CREATE POLICY "Server-side only contract event creation"
ON public.contract_events
FOR INSERT
WITH CHECK (false);

-- Note: Edge functions using SERVICE_ROLE_KEY bypass RLS entirely,
-- so the view-contract function will continue to work.
-- This policy blocks any client-side attempts to insert fake events.