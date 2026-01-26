

# Operational Truth: Egységes Workflow Terv

## A Jelenlegi Helyzet (Mi van most)

A rendszerben **két külön Operational Truth koncepció** él párhuzamosan:

| Komponens | Mit mutat | Hol él |
|-----------|-----------|--------|
| `OperationalTruthSummaryCard` | Kérdés-válasz típusú "Facts" lista verifikációs %-kal | Régi Quick Mode/Summary flow |
| `ProjectSynthesis` | 4 pillér: Area, Materials, Blueprint, OBC + Conflict | Projects 2 workflow |
| Status Cards (felső sor) | Admin státusz: Photo Analysis, Line Items, Client Info, Total | ProjectDetailsView |

**A probléma:** Ezek nem beszélnek egymással. A Status Cards admin adatokat mutat, nem az AI által megállapított "igazságot".

---

## A Cél (Mit építünk)

Egyetlen, koherens **8 Pilléres Operational Truth** rendszer, ami a workflow minden pontján konzisztens:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    8 PILLARS OF OPERATIONAL TRUTH               │
├─────────────────────────────────────────────────────────────────┤
│  1. Confirmed Area     │ Gemini vizuális + Blueprint mérés     │
│  2. Materials Count    │ Detektált anyagok száma               │
│  3. Blueprint Status   │ Van/Nincs, elemezve                   │
│  4. OBC Compliance     │ OpenAI szabályozási validáció         │
│  5. Conflict Status    │ Gemini vs OpenAI egyezés              │
│  6. Project Mode       │ Solo / Team (tier alapján)            │
│  7. Project Size       │ Small / Medium / Large                │
│  8. Confidence Level   │ AI bizonyosság szintje                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Adatfolyam

```text
[Questionnaire] 
     │
     ▼
[FilterQuestions] ──► aiTriggers aktiválás
     │
     ▼
[AI Analysis Hook] 
     │
     ├─► Gemini Engine (Visual): area, surfaceType, roomType
     │
     └─► OpenAI Engine (Regulatory): OBC refs, permit status
     │
     ▼
[Synthesis Layer] ──► 8 Pillars összegzés + Conflict Detection
     │
     ▼
[WorkflowSelector] ──► Ajánlás: Solo vs Team
     │
     ▼
[ProjectDetailsView] ──► Tabs: Overview (8 Pillars), Documents, Map, Timeline, Weather
```

---

## Implementációs Terv

### 1. LÉPÉS: Egységes Típusdefiníció

**Fájl:** `src/types/operationalTruth.ts` (új)

Létrehozunk egy központi típust az Operational Truth 8 pillérére, amit minden komponens használ:

```typescript
export interface OperationalTruth {
  // 8 Pillars
  confirmedArea: number | null;
  areaUnit: string;
  materialsCount: number;
  blueprintStatus: "analyzed" | "none" | "pending";
  obcCompliance: "clear" | "permit_required" | "pending";
  conflictStatus: "aligned" | "conflict_detected" | "pending";
  projectMode: "solo" | "team";
  projectSize: "small" | "medium" | "large";
  confidenceLevel: "high" | "medium" | "low";
  
  // Verification
  verifiedPillars: number; // Hány pillér verified
  totalPillars: 8;
  verificationRate: number; // %
}
```

### 2. LÉPÉS: ProjectSynthesis Kiterjesztése

**Fájl:** `src/components/projects2/ProjectSynthesis.tsx` (módosítás)

A meglévő 4 pillért bővítjük 8-ra:
- Jelenlegi: Area, Materials, Blueprint, OBC
- Hozzáadva: Conflict Status, Mode, Size, Confidence

Az UI 2x4-es grid lesz a jelenlegi 1x4 helyett.

### 3. LÉPÉS: Status Cards Átalakítása

**Fájl:** `src/components/projects2/ProjectDetailsView.tsx` (módosítás)

A jelenlegi admin Status Cards (Photo Analysis, Line Items, Client Info, Total) helyett az Operational Truth 8 pillére jelenik meg:

| Régi | Új |
|------|-----|
| Photo Analysis | Confirmed Area |
| Line Items | Materials Count |
| Client Info | Blueprint + OBC Status |
| Total | Confidence + Conflict |

### 4. LÉPÉS: Hook Kiegészítés

**Fájl:** `src/hooks/useProjectAIAnalysis.tsx` (módosítás)

A `synthesisResult` interfészt bővítjük, hogy mind a 8 pillért tartalmazza. A `determineProjectSize` függvény mellé `buildOperationalTruth` függvény:

```typescript
function buildOperationalTruth(
  aiAnalysis, 
  blueprintAnalysis, 
  dualEngineOutput, 
  filterAnswers, 
  projectMode
): OperationalTruth {
  // Mind a 8 pillér kalkulálása
  // verifiedPillars számítás
  // verificationRate %
}
```

### 5. LÉPÉS: OperationalTruthSummaryCard Integrálás

**Fájl:** `src/components/OperationalTruthSummaryCard.tsx` (módosítás)

A "Facts" lista helyett az új 8 pilléres struktúrát fogadja:
- Props: `operationalTruth: OperationalTruth` 
- UI: 8 pilléres progress + verification rate

### 6. LÉPÉS: Database Sync

**Fájl:** `supabase/functions/quick-estimate/index.ts` (módosítás)

Az edge function visszatér a teljes 8 pilléres struktúrával, amit a `project_summaries.ai_workflow_config` JSON mezőbe mentünk.

---

## Komponens Hierarchia a Workflow-ban

```text
BuildUnionProjects2.tsx
└── ProjectQuestionnaire
└── FilterQuestions ──► aiTriggers
└── useProjectAIAnalysis ──► 8 Pillars + DualEngineOutput
└── WorkflowSelector
    └── ProjectSynthesis ──► 8 Pillar Summary + Conflict Card
└── ProjectDetailsView
    ├── OperationalTruthStatusCards ──► 8 Pillar Quick View (felső sor)
    └── Tabs
        ├── Overview: ProjectSynthesis (részletes)
        ├── Documents: DocumentsPane (RAG Verified badges)
        ├── Site Map: TeamMapWidget (Team Mode only)
        ├── Timeline: ActiveProjectTimeline
        └── Weather: WeatherWidget
```

---

## Adatbázis Struktúra

A `project_summaries.ai_workflow_config` JSON mező tartalma:

```json
{
  "filterAnswers": { ... },
  "aiTriggers": { "ragEnabled": true, "obcSearch": true, ... },
  "operationalTruth": {
    "confirmedArea": 1485,
    "areaUnit": "sq ft",
    "materialsCount": 12,
    "blueprintStatus": "analyzed",
    "obcCompliance": "clear",
    "conflictStatus": "aligned",
    "projectMode": "team",
    "projectSize": "medium",
    "confidenceLevel": "high",
    "verifiedPillars": 7,
    "verificationRate": 87.5
  },
  "dualEngineOutput": {
    "gemini": { ... },
    "openai": { ... }
  },
  "conflicts": []
}
```

---

## Összefoglaló

| Mit csinálunk | Miért |
|---------------|-------|
| 1 típusdefiníció | Minden komponens ugyanazt az adatstruktúrát használja |
| 8 pillér | Teljes projekt állapot lefedés |
| Status Cards átdolgozás | Admin → AI Truth |
| Hook bővítés | Központi kalkuláció |
| DB sync | Állandó adatmegőrzés |

---

## Technikai Részletek

### Érintett Fájlok

1. **Új:** `src/types/operationalTruth.ts`
2. **Módosítás:** `src/components/projects2/ProjectSynthesis.tsx`
3. **Módosítás:** `src/components/projects2/ProjectDetailsView.tsx`
4. **Módosítás:** `src/hooks/useProjectAIAnalysis.tsx`
5. **Módosítás:** `src/components/OperationalTruthSummaryCard.tsx`
6. **Módosítás:** `supabase/functions/quick-estimate/index.ts`

### Tier Logika (Hardcoded)

| Feltétel | Ajánlás |
|----------|---------|
| `subcontractorCount > 3` | Team Mode |
| `affectsStructure === true` | Team Mode |
| `affectsMechanical === true` | Team Mode |
| Minden más | Solo Mode |

