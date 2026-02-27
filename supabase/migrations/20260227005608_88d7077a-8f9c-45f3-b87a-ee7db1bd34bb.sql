
-- Blueprint Zones tábla az Operational Truth Overlay-hez
CREATE TABLE public.blueprint_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    coordinates JSONB NOT NULL DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'ai',
    current_status TEXT NOT NULL DEFAULT 'green',
    log_data JSONB DEFAULT '{}',
    vision_data JSONB DEFAULT '{}',
    report_data JSONB DEFAULT '{}',
    variance_score NUMERIC DEFAULT 0,
    last_vision_sync TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index a gyors lekérdezéshez
CREATE INDEX idx_blueprint_zones_project_id ON public.blueprint_zones(project_id);

-- RLS engedélyezés
ALTER TABLE public.blueprint_zones ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "Owners can manage blueprint zones"
ON public.blueprint_zones FOR ALL
USING (is_project_owner(project_id, auth.uid()));

-- Team read
CREATE POLICY "Team members can view blueprint zones"
ON public.blueprint_zones FOR SELECT
USING (is_project_member(project_id, auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_blueprint_zones_updated_at
BEFORE UPDATE ON public.blueprint_zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
