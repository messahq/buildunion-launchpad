-- Create site_logs table for MESSA Quick-Log notes and reports
CREATE TABLE public.site_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_name text NOT NULL,
  template_type text NOT NULL,
  notes text,
  tasks_data jsonb DEFAULT '[]'::jsonb,
  completed_count integer DEFAULT 0,
  total_count integer DEFAULT 0,
  photos_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own site logs"
  ON public.site_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own site logs"
  ON public.site_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site logs"
  ON public.site_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site logs"
  ON public.site_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_site_logs_updated_at
  BEFORE UPDATE ON public.site_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();