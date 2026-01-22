-- Create contracts table to store generated contracts
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Contract metadata
  contract_number TEXT NOT NULL,
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  template_type TEXT DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Parties
  contractor_name TEXT,
  contractor_address TEXT,
  contractor_phone TEXT,
  contractor_email TEXT,
  contractor_license TEXT,
  
  client_name TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  
  -- Project details
  project_name TEXT,
  project_address TEXT,
  scope_of_work TEXT,
  
  -- Financial terms
  total_amount NUMERIC DEFAULT 0,
  deposit_percentage NUMERIC DEFAULT 50,
  deposit_amount NUMERIC DEFAULT 0,
  payment_schedule TEXT,
  
  -- Timeline
  start_date DATE,
  estimated_end_date DATE,
  working_days TEXT,
  
  -- Terms & Conditions
  warranty_period TEXT,
  change_order_policy TEXT,
  cancellation_policy TEXT,
  dispute_resolution TEXT,
  additional_terms TEXT,
  materials_included BOOLEAN DEFAULT true,
  has_liability_insurance BOOLEAN DEFAULT true,
  has_wsib BOOLEAN DEFAULT true,
  
  -- Signatures (stored as JSON)
  client_signature JSONB,
  contractor_signature JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own contracts"
ON public.contracts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts"
ON public.contracts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts"
ON public.contracts FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);