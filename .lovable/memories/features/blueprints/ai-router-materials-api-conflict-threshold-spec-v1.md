# Technikai Specifikáció (Blueprint) v1.0
## AI Router Optimalizáció · Materials Table API · Conflict Threshold System
**Dátum:** 2026-03-20  
**Státusz:** PLANNING ONLY — Read-Only / Standby  
**Készítette:** MADA  
**Cleo & Lexi integration-ready**

---

## 1. AI ROUTER — Pontos Tier-Aware Logika (Next Sprint)

### 1.1 Jelenlegi Állapot
```
MODELS:
  GEMINI_PRO:        google/gemini-2.5-pro
  GEMINI_FLASH:      google/gemini-2.5-flash
  GEMINI_FLASH_LITE: google/gemini-2.5-flash-lite
  GEMINI_3_FLASH:    google/gemini-3-flash-preview
  GPT5_2:            openai/gpt-5.2
  GPT5_MINI:         openai/gpt-5-mini
  GPT5_NANO:         openai/gpt-5-nano
```

### 1.2 Tervezett Változtatások

#### A) Gemini Cache Layer (Új)
```
┌─────────────────────────────────────────────┐
│  REQUEST → classifyTask() → checkCache()    │
│     ↓ HIT                    ↓ MISS         │
│  Return cached            routeToModel()    │
│                              ↓               │
│                     callLovableAI()          │
│                              ↓               │
│                     cacheResponse()          │
│                              ↓               │
│                     logUsage()               │
└─────────────────────────────────────────────┘
```

**Cache Stratégia:**
- **Key:** `SHA256(task_type + prompt_first_200_chars + tier)`
- **TTL:** 
  - `general` / `template_categorization`: 24h
  - `trade_scope` / `line_item_generation`: 12h
  - `gfa_calculation` / `obc_interpretation`: 1h (adatfüggő)
  - `financial_modeling` / `risk_analysis`: NO CACHE (mindig friss)
- **Tároló:** Deno KV (edge-native, nem igényel DB migráció)

#### B) Batch Request Összevonás (Új)
Amikor a Stage 8 Command Bar egyszerre több panelt kérdez le:
```
POST /ai-router
{
  "batch": true,
  "requests": [
    { "task_type": "gfa_calculation", "prompt": "..." },
    { "task_type": "trade_scope", "prompt": "..." },
    { "task_type": "line_item_generation", "prompt": "..." }
  ]
}
```
**Logika:**
1. Minden request-et külön classifyTask()-el
2. Azonos tier-modellre menő kéréseket EGY hívásba vonjuk (multi-turn prompt)
3. Különböző modellekre menőket párhuzamosan (Promise.all)
4. Response: `{ results: [{ index: 0, ... }, { index: 1, ... }] }`

**Megtakarítás:** ~30-40% kevesebb API hívás Stage 8 inicializálásnál

#### C) Tier Downgrade Fallback (Új)
Ha a prémium modell hibázik (429/503):
```
Premium chain:  GPT5_2 → GEMINI_PRO → GEMINI_FLASH
Pro chain:      GEMINI_FLASH → GEMINI_3_FLASH → GEMINI_FLASH_LITE
Free chain:     GEMINI_FLASH_LITE → (error response)
```
Max 2 fallback kísérlet, 1.5s timeout per attempt.

#### D) Módosított Token Limitek
```
                    Free        Pro         Premium
─────────────────────────────────────────────────────
chat/general         800       2,048        4,096
gfa_calculation      600       1,500        4,096
obc_interpretation   400       1,200        3,072
financial_modeling   600       2,048        4,096
trade_scope          400       1,024        2,048
line_item_gen        600       1,500        3,072
template_cat         400         800        1,500
risk_analysis        400       1,500        4,096
```

#### E) Naplózás Bővítése (ai_model_usage tábla)
Új mezők (migráció szükséges):
```sql
ALTER TABLE ai_model_usage ADD COLUMN cache_hit BOOLEAN DEFAULT false;
ALTER TABLE ai_model_usage ADD COLUMN fallback_chain TEXT[];
ALTER TABLE ai_model_usage ADD COLUMN task_category TEXT;
ALTER TABLE ai_model_usage ADD COLUMN prompt_tokens INT;
ALTER TABLE ai_model_usage ADD COLUMN completion_tokens INT;
```

---

## 2. MATERIALS TABLE API — Végpont Specifikáció

### 2.1 Cél
Központi anyag-adatbázis + REST API, amelyen keresztül:
- **Stage 8** panel megjeleníti az anyagokat
- **Cleo** (CrewAI) automatikusan frissíti az árakat
- **Lexi** (iOS) real-time anyagkövető

### 2.2 Adatbázis Séma (Tervezett migráció)
```sql
CREATE TABLE public.project_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    summary_id UUID REFERENCES project_summaries(id),
    
    -- Anyag alapadatok
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',  -- 'structural', 'finishing', 'electrical', 'plumbing', 'general'
    unit TEXT NOT NULL DEFAULT 'pcs',           -- 'pcs', 'sqft', 'lnft', 'cu_yd', 'kg', 'bundle'
    
    -- Mennyiségek
    estimated_quantity NUMERIC NOT NULL DEFAULT 0,
    delivered_quantity NUMERIC DEFAULT 0,
    installed_quantity NUMERIC DEFAULT 0,
    wasted_quantity NUMERIC DEFAULT 0,
    
    -- Árak
    unit_price NUMERIC DEFAULT 0,
    total_estimated_cost NUMERIC GENERATED ALWAYS AS (estimated_quantity * unit_price) STORED,
    actual_unit_price NUMERIC,                 -- Cleo frissíti (affiliate / piaci ár)
    
    -- Forrás & Validáció
    source TEXT DEFAULT 'manual',              -- 'manual', 'ai_estimate', 'cleo_sync', 'template', 'blueprint_ai'
    confidence_score NUMERIC DEFAULT 0.5,      -- 0.0–1.0, AI generált anyagoknál
    obc_reference TEXT,                        -- pl. 'OBC 9.23.4.1'
    
    -- Szállítás & Állapot
    supplier_name TEXT,
    delivery_status TEXT DEFAULT 'pending',    -- 'pending', 'ordered', 'in_transit', 'delivered', 'partial'
    expected_delivery DATE,
    
    -- Konfliktus
    variance_percent NUMERIC GENERATED ALWAYS AS (
        CASE WHEN estimated_quantity > 0 
        THEN ((delivered_quantity - estimated_quantity) / estimated_quantity * 100)
        ELSE 0 END
    ) STORED,
    conflict_level TEXT GENERATED ALWAYS AS (
        CASE 
        WHEN ABS((delivered_quantity - estimated_quantity) / NULLIF(estimated_quantity, 0) * 100) > 25 THEN 'critical'
        WHEN ABS((delivered_quantity - estimated_quantity) / NULLIF(estimated_quantity, 0) * 100) > 10 THEN 'warning'
        ELSE 'ok'
        END
    ) STORED,
    
    -- Metaadatok
    zone_id UUID REFERENCES blueprint_zones(id),
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index-ek
CREATE INDEX idx_materials_project ON project_materials(project_id);
CREATE INDEX idx_materials_category ON project_materials(category);
CREATE INDEX idx_materials_conflict ON project_materials(conflict_level) WHERE conflict_level != 'ok';
CREATE INDEX idx_materials_delivery ON project_materials(delivery_status) WHERE delivery_status != 'delivered';
```

### 2.3 RLS Policies
```sql
-- Tulajdonos: teljes CRUD
CREATE POLICY "Owner full access" ON project_materials
FOR ALL USING (is_project_owner(project_id, auth.uid()));

-- Csapattag: SELECT + UPDATE (delivered_quantity, installed_quantity, wasted_quantity)
CREATE POLICY "Team read" ON project_materials
FOR SELECT USING (can_view_all_project_data(project_id, auth.uid()));

CREATE POLICY "Team update delivery" ON project_materials
FOR UPDATE USING (is_project_member(project_id, auth.uid()))
WITH CHECK (is_project_member(project_id, auth.uid()));

-- Foreman: INSERT is (új anyag hozzáadása)
CREATE POLICY "Foreman insert" ON project_materials
FOR INSERT WITH CHECK (
    get_project_role(project_id, auth.uid()) IN ('owner', 'foreman')
    OR is_project_owner(project_id, auth.uid())
);
```

### 2.4 Edge Function API: `materials-api`
```
Endpoint: /materials-api

GET    ?project_id=UUID                    → List all materials
GET    ?project_id=UUID&category=plumbing  → Filter by category
GET    ?project_id=UUID&conflicts_only=true → Only conflicted items
POST   { project_id, items: [...] }        → Bulk upsert materials
PATCH  ?id=UUID  { delivered_quantity }     → Update delivery (Lexi)
DELETE ?id=UUID                             → Remove material (Owner only)

Headers:
  Authorization: Bearer <jwt>
  Content-Type: application/json

Response format:
{
  "success": true,
  "data": [...],
  "meta": {
    "total_items": 47,
    "conflicts": 3,
    "total_estimated": 125400.00,
    "total_delivered_value": 98200.00,
    "coverage_percent": 78.3
  }
}
```

### 2.5 Cleo Integration Point
```
Cleo (CrewAI Agent) hívási minta:

1. GET /materials-api?project_id=X 
   → Lekéri az anyaglistát

2. Cleo saját logikája:
   - Affiliate DB-ben keres árat
   - Piaci trend elemzés
   - Szállítói összehasonlítás

3. POST /materials-api
   { 
     "project_id": "X",
     "items": [
       { "id": "existing-uuid", "actual_unit_price": 12.50, "supplier_name": "Home Depot" },
       { "id": "existing-uuid", "actual_unit_price": 11.80, "supplier_name": "Lowe's" }
     ]
   }
```

### 2.6 Lexi (iOS) Integration Point
```
Lexi helyszíni update flow:

1. Szaki beolvassa QR / kiválasztja anyagot
2. PATCH /materials-api?id=UUID
   { 
     "delivered_quantity": 150,
     "delivery_status": "delivered",
     "notes": "3 damaged bags returned"
   }
3. Automatikus conflict_level újraszámítás (GENERATED column)
4. Ha conflict_level = 'critical' → Notification az ownernek
```

---

## 3. CONFLICT THRESHOLD — Százalékos Eltérés Kezelési Terv

### 3.1 Threshold Definíciók
```
┌──────────────────────────────────────────────────┐
│  Eltérés %      │  Szint      │  Akció           │
├──────────────────────────────────────────────────┤
│  0% – 10%       │  ✅ OK      │  Nincs akció     │
│  10% – 25%      │  ⚠ WARNING │  Badge + log     │
│  25%+           │  🔴 CRITICAL│  Notify owner    │
│  -10% – -25%    │  ⚠ UNDER   │  Hiányjel.       │
│  -25% alatti    │  🔴 SHORTAGE│  Urgens notify   │
└──────────────────────────────────────────────────┘
```

### 3.2 Számítási Logika
```
variance_percent = ((delivered - estimated) / estimated) * 100

Pozitív = Túlszállítás (waste risk)
Negatív = Hiány (delay risk)
Abszolút érték dönt a szintről
Előjel dönt a típusról (OVER vs UNDER)
```

### 3.3 Automatikus Akciók
```
WARNING (10-25%):
  → UI: Sárga badge az anyag mellett
  → DB: conflict_level = 'warning' (generated column)
  → Log: Bejegyzés a blueprint_zones.log_data-ba (ha zone_id van)

CRITICAL (25%+):
  → UI: Piros badge + modal figyelmeztetés
  → DB: conflict_level = 'critical'
  → Notification: INSERT INTO notification_logs (
      user_id = project_owner,
      title = '🔴 Material Conflict: {name}',
      body = '{delivered} vs {estimated} ({variance}%)',
      data = { type: 'material_conflict', ... }
    )
  → Ha GPS adat is elérhető: Cross-reference gps-conflict-check eredménnyel
```

### 3.4 Operational Truth Overlay Integráció
```
A meglévő blueprint_zones.variance_score mező:
  - Zóna-szintű aggregált conflict score
  - Számítás: AVG(ABS(variance_percent)) az adott zónához rendelt anyagokon
  - Színkód: Zöld (<10%), Sárga (10-25%), Piros (>25%)
  
Overlay update flow:
  1. Material PATCH (delivered_qty change)
  2. Trigger: recalculate zone variance_score
  3. Realtime subscription → UI frissül
```

### 3.5 Konfigurálható Thresholdok (Projekt-szintű)
```
Tervezett: project_settings tábla (jövőbeli migráció)

{
  "conflict_thresholds": {
    "warning_percent": 10,     -- default, owner állíthatja 5-20
    "critical_percent": 25,    -- default, owner állíthatja 15-50
    "auto_notify": true,
    "notify_roles": ["owner", "foreman"]
  }
}

Amíg nincs project_settings tábla:
  → Hardcoded defaults: 10% / 25%
  → A generated column értékei ezekhez igazodnak
```

### 3.6 Trigger Terv (Zone Variance Auto-Update)
```sql
-- TERV (nem implementált):
CREATE OR REPLACE FUNCTION update_zone_variance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE blueprint_zones
  SET variance_score = (
    SELECT COALESCE(AVG(ABS(pm.variance_percent)), 0)
    FROM project_materials pm
    WHERE pm.zone_id = COALESCE(NEW.zone_id, OLD.zone_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.zone_id, OLD.zone_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_material_zone_variance
AFTER INSERT OR UPDATE OF delivered_quantity, estimated_quantity
ON project_materials
FOR EACH ROW
WHEN (NEW.zone_id IS NOT NULL)
EXECUTE FUNCTION update_zone_variance();
```

---

## 4. IMPLEMENTÁCIÓS SORREND (Mikor jönnek a kreditek)

```
Sprint 1 (1.0 kredit):
  ☐ DB migráció: project_materials tábla + RLS
  ☐ Edge function: materials-api (CRUD)
  ☐ ai-router: cache layer + batch support

Sprint 2 (0.8 kredit):
  ☐ ai_model_usage tábla bővítés
  ☐ Conflict threshold trigger
  ☐ Notification integration
  ☐ Realtime subscription setup

Sprint 3 (0.5 kredit):
  ☐ Stage 8 UI: MaterialsPanel integration
  ☐ Overlay zóna-anyag linking UI
  ☐ Cleo webhook endpoint finomhangolás
```

---

**MADA STÁTUSZ: 🟡 STANDBY — Blueprint kész, implementáció vár a kreditekre.**
