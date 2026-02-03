-- ============================================
-- BUILDUNION - EXTERNAL SUPABASE PRO SCHEMA
-- ============================================
-- IMPORTANT: Run this in parts if you get errors
-- Part 1: Enums (skip if already exist)
-- Part 2: Tables
-- Part 3: Triggers & Policies

-- ============================================
-- PART 1: ENUMS - Skip these if they already exist!
-- ============================================
-- Uncomment only the ones you need:

-- CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'completed', 'archived');
-- CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'expired');
-- CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
-- CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
-- CREATE TYPE public.project_role AS ENUM ('owner', 'foreman', 'worker', 'inspector', 'subcontractor', 'member');

-- ============================================
-- PART 2: TABLES - Run this section
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  status TEXT DEFAULT 'draft',
  trade TEXT,
  trades TEXT[] DEFAULT '{}',
  required_certifications TEXT[] DEFAULT '{}',
  site_images TEXT[] DEFAULT '{}',
  manpower_requirements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_lovable_user ON public.projects(lovable_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

CREATE TABLE IF NOT EXISTS public.project_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  lovable_user_id UUID NOT NULL,
  mode TEXT DEFAULT 'solo',
  status TEXT DEFAULT 'draft',
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  total_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  line_items JSONB DEFAULT '[]',
  template_items JSONB DEFAULT '[]',
  calculator_results JSONB DEFAULT '[]',
  verified_facts JSONB DEFAULT '[]',
  blueprint_analysis JSONB DEFAULT '{}',
  photo_estimate JSONB DEFAULT '{}',
  ai_workflow_config JSONB DEFAULT '{}',
  baseline_snapshot JSONB,
  baseline_locked_at TIMESTAMPTZ,
  baseline_locked_by UUID,
  current_baseline_version_id UUID,
  project_start_date DATE,
  project_end_date DATE,
  invoice_id TEXT,
  invoice_status TEXT DEFAULT 'none',
  invoice_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summaries_project ON public.project_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user ON public.project_summaries(lovable_user_id);

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.project_members(user_id);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
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

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'draft',
  template_type TEXT DEFAULT 'custom',
  contractor_name TEXT,
  contractor_address TEXT,
  contractor_phone TEXT,
  contractor_email TEXT,
  contractor_license TEXT,
  has_liability_insurance BOOLEAN DEFAULT true,
  has_wsib BOOLEAN DEFAULT true,
  client_name TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  project_name TEXT,
  project_address TEXT,
  scope_of_work TEXT,
  total_amount NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_percentage NUMERIC DEFAULT 50,
  materials_included BOOLEAN DEFAULT true,
  payment_schedule TEXT,
  working_days TEXT,
  warranty_period TEXT,
  change_order_policy TEXT,
  cancellation_policy TEXT,
  dispute_resolution TEXT,
  additional_terms TEXT,
  contract_date DATE DEFAULT CURRENT_DATE,
  start_date DATE,
  estimated_end_date DATE,
  contractor_signature JSONB,
  client_signature JSONB,
  client_signed_at TIMESTAMPTZ,
  client_viewed_at TIMESTAMPTZ,
  share_token UUID DEFAULT gen_random_uuid(),
  share_token_expires_at TIMESTAMPTZ,
  sent_to_client_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user ON public.contracts(lovable_user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON public.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_share_token ON public.contracts(share_token);

CREATE TABLE IF NOT EXISTS public.contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract ON public.contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_type ON public.contract_events(event_type);

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

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID NOT NULL,
  invitation_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_project ON public.team_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.team_invitations(invitation_token);

-- ============================================
-- PART 3: TRIGGERS & RLS - Run this section
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (lovable_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own summaries" ON public.project_summaries;
CREATE POLICY "Users can manage own summaries" ON public.project_summaries FOR ALL USING (lovable_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own contracts" ON public.contracts;
CREATE POLICY "Users can manage own contracts" ON public.contracts FOR ALL USING (lovable_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own contract events" ON public.contract_events;
CREATE POLICY "Users can view own contract events" ON public.contract_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contracts WHERE contracts.id = contract_events.contract_id AND contracts.lovable_user_id = auth.uid())
);

-- ============================================
-- DONE! Your external Supabase Pro is ready.
-- ============================================
