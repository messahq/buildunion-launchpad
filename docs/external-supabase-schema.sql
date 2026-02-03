-- ============================================
-- BUILDUNION - EXTERNAL SUPABASE PRO SCHEMA
-- ============================================
-- Run this in your Supabase Pro SQL Editor
-- This creates all tables needed for the hybrid architecture
-- lovable_user_id links records to Lovable Cloud auth users
-- IDEMPOTENT: Safe to run multiple times

-- ============================================
-- ENUMS (Skip if already exists)
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_role AS ENUM ('owner', 'foreman', 'worker', 'inspector', 'subcontractor', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_user_id UUID NOT NULL, -- Links to Lovable Cloud auth.users
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  status project_status DEFAULT 'draft',
  trade TEXT,
  trades TEXT[] DEFAULT '{}',
  required_certifications TEXT[] DEFAULT '{}',
  site_images TEXT[] DEFAULT '{}',
  manpower_requirements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_projects_lovable_user ON public.projects(lovable_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- ============================================
-- PROJECT SUMMARIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  lovable_user_id UUID NOT NULL,
  mode TEXT DEFAULT 'solo' CHECK (mode IN ('solo', 'team')),
  status TEXT DEFAULT 'draft',
  
  -- Client info
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  
  -- Financial data
  total_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  
  -- JSON data
  line_items JSONB DEFAULT '[]',
  template_items JSONB DEFAULT '[]',
  calculator_results JSONB DEFAULT '[]',
  verified_facts JSONB DEFAULT '[]',
  blueprint_analysis JSONB DEFAULT '{}',
  photo_estimate JSONB DEFAULT '{}',
  ai_workflow_config JSONB DEFAULT '{}',
  
  -- Baseline versioning
  baseline_snapshot JSONB,
  baseline_locked_at TIMESTAMPTZ,
  baseline_locked_by UUID,
  current_baseline_version_id UUID,
  
  -- Dates
  project_start_date DATE,
  project_end_date DATE,
  
  -- Invoice tracking
  invoice_id TEXT,
  invoice_status TEXT DEFAULT 'none',
  invoice_sent_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summaries_project ON public.project_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user ON public.project_summaries(lovable_user_id);

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL, -- Can be Lovable user_id or external
  role project_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);

-- ============================================
-- PROJECT TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  due_date TIMESTAMPTZ,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.project_tasks(status);

-- ============================================
-- PROJECT DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON public.project_documents(project_id);

-- ============================================
-- CONTRACTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL UNIQUE,
  status contract_status DEFAULT 'draft',
  template_type TEXT DEFAULT 'custom',
  
  -- Contractor info
  contractor_name TEXT,
  contractor_address TEXT,
  contractor_phone TEXT,
  contractor_email TEXT,
  contractor_license TEXT,
  has_liability_insurance BOOLEAN DEFAULT true,
  has_wsib BOOLEAN DEFAULT true,
  
  -- Client info
  client_name TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  
  -- Project details
  project_name TEXT,
  project_address TEXT,
  scope_of_work TEXT,
  
  -- Financial
  total_amount NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_percentage NUMERIC DEFAULT 50,
  materials_included BOOLEAN DEFAULT true,
  
  -- Terms
  payment_schedule TEXT,
  working_days TEXT,
  warranty_period TEXT,
  change_order_policy TEXT,
  cancellation_policy TEXT,
  dispute_resolution TEXT,
  additional_terms TEXT,
  
  -- Dates
  contract_date DATE DEFAULT CURRENT_DATE,
  start_date DATE,
  estimated_end_date DATE,
  
  -- Signatures
  contractor_signature JSONB,
  client_signature JSONB,
  client_signed_at TIMESTAMPTZ,
  client_viewed_at TIMESTAMPTZ,
  
  -- Sharing
  share_token UUID DEFAULT gen_random_uuid(),
  share_token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  sent_to_client_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user ON public.contracts(lovable_user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON public.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_share_token ON public.contracts(share_token);

-- ============================================
-- CONTRACT EVENTS TABLE (Audit Log)
-- ============================================

CREATE TABLE IF NOT EXISTS public.contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'viewed', 'signed', 'sent', 'expired'
  event_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract ON public.contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_type ON public.contract_events(event_type);

-- ============================================
-- BASELINE VERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.baseline_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  summary_id UUID REFERENCES public.project_summaries(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER DEFAULT 1,
  snapshot JSONB NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  previous_version_id UUID REFERENCES public.baseline_versions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_baseline_project ON public.baseline_versions(project_id);

-- ============================================
-- TEAM INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role project_role DEFAULT 'member',
  invited_by UUID NOT NULL,
  invitation_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_project ON public.team_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.team_invitations(invitation_token);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (DROP IF EXISTS first to avoid errors)
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_summaries_updated_at ON public.project_summaries;
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON public.project_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Since we're using Service Role Key from Lovable Edge Function,
-- RLS is bypassed. The Edge Function handles authorization.
-- These policies are for direct Supabase client access if needed later.

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage own summaries" ON public.project_summaries;
DROP POLICY IF EXISTS "Users can manage own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view own contract events" ON public.contract_events;

-- Projects: Owner access
CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL USING (lovable_user_id = auth.uid());

-- Summaries: Owner access
CREATE POLICY "Users can manage own summaries" ON public.project_summaries
  FOR ALL USING (lovable_user_id = auth.uid());

-- Contracts: Owner access
CREATE POLICY "Users can manage own contracts" ON public.contracts
  FOR ALL USING (lovable_user_id = auth.uid());

-- Contract events: Read only for contract owners
CREATE POLICY "Users can view own contract events" ON public.contract_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_events.contract_id 
      AND contracts.lovable_user_id = auth.uid()
    )
  );

-- Service role full access (for Edge Function proxy)
-- Note: Service Role Key automatically bypasses RLS

-- ============================================
-- REALTIME (Optional - skip if already added)
-- ============================================

-- Note: These may fail if already added, which is fine
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- DONE!
-- ============================================
-- Your external Supabase Pro is now ready.
-- The Lovable Edge Function will use Service Role Key
-- to manage data through the external-db proxy.
