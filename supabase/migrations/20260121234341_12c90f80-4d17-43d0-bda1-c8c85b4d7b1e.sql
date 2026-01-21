-- Add INSERT policy for notification_logs table
-- This documents the intended access pattern: only server-side (service role) should create notifications
-- This prevents clients from inserting arbitrary notification logs

-- The policy allows INSERT only via service role (no client INSERT allowed)
-- Since RLS checks are bypassed by service role, this effectively blocks client-side inserts
-- while documenting the security intent

-- First, let's add explicit policies for the table operations
-- Users can only view their own notifications (already exists, but let's ensure all operations are covered)

-- Add INSERT policy - no client should be able to insert directly
-- Notifications should only be created by server-side edge functions using service role
CREATE POLICY "Server-side only notification creation" 
ON public.notification_logs 
FOR INSERT 
WITH CHECK (false);

-- This policy explicitly blocks all client-side INSERT operations
-- Edge functions using service role key bypass RLS and can still insert
-- This prevents notification spam from malicious clients