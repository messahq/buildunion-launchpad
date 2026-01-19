-- Create project_summaries table to store comprehensive project data
CREATE TABLE public.project_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Quick Mode data
  photo_estimate JSONB DEFAULT '{}',
  calculator_results JSONB DEFAULT '[]',
  template_items JSONB DEFAULT '[]',
  
  -- M.E.S.S.A. data
  blueprint_analysis JSONB DEFAULT '{}',
  verified_facts JSONB DEFAULT '[]',
  
  -- Combined totals
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  
  -- Line items (editable)
  line_items JSONB DEFAULT '[]',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Invoice data
  invoice_id TEXT,
  invoice_status TEXT DEFAULT 'none',
  invoice_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Client info
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  
  -- Notes
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.project_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own summaries"
ON public.project_summaries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own summaries"
ON public.project_summaries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
ON public.project_summaries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries"
ON public.project_summaries
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_summaries_updated_at
BEFORE UPDATE ON public.project_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();