-- ============================================
-- BUILDUNION - EXTERNAL SUPABASE PRO SCHEMA
-- ============================================
-- JELENLEG TELEPÍTVE: 2025-02-03
-- Ez a séma a BuildUnion külső Supabase Pro adatbázisához tartozik.
-- A Lovable Cloud kezeli az autentikációt, ez az adatbázis
-- az üzleti adatokat (projektek, szerződések) tárolja.
--
-- FONTOS: lovable_user_id = a Lovable Cloud auth.uid() értéke
-- ============================================

-- 1. TÍPUSOK (léteznek)
-- CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'completed', 'archived');
-- CREATE TYPE public.project_role AS ENUM ('owner', 'foreman', 'worker', 'inspector', 'subcontractor', 'member');

-- 2. PROJEKTEK TÁBLA
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lovable_user_id UUID NOT NULL, 
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    status public.project_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. FELADATOK TÁBLA
CREATE TABLE public.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SZERZŐDÉSEK TÁBLA
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lovable_user_id UUID NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NOTES:
-- - Ez egy minimális séma, bővíthető később
-- - RLS nincs még konfigurálva (edge function + service key használata)
-- - A lovable_user_id-t az edge function szűri
-- ============================================
