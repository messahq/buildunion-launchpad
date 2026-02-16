
-- Waitlist signups table
CREATE TABLE public.waitlist_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  trade TEXT NOT NULL,
  company_size TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  welcome_email_sent BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Public insert (no auth needed for waitlist)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist_signups
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view/manage
CREATE POLICY "Admins can view waitlist"
  ON public.waitlist_signups
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update waitlist"
  ON public.waitlist_signups
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "No public deletes"
  ON public.waitlist_signups
  FOR DELETE
  USING (false);

-- Unique email constraint
CREATE UNIQUE INDEX idx_waitlist_email ON public.waitlist_signups (LOWER(email));
