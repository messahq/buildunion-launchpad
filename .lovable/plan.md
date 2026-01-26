
# Projects 2 - Teljes Újratervezés a Filter Questions Integrációval

## Jelenlegi Állapot Áttekintése

A meglévő rendszer:
- `ProjectQuestionnaire.tsx` - alapvető projekt adatok gyűjtése
- `AIAnalysisProgress.tsx` - elemzési progress bar
- `WorkflowSelector.tsx` - AI eredmények megjelenítése és workflow választás
- `useProjectAIAnalysis.tsx` - dual-engine AI hook
- `quick-estimate` edge function - Gemini/GPT elemzés

## Új Architektúra - "Filter Questions" Lépéssel

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     PROJECTS 2 - ÚJ WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [1] ProjectQuestionnaire (Megmarad, egyszerűsítve)                     │
│      └─ Projekt név, Work Type, Location, Uploads, Description          │
│                                                                          │
│  [2] FilterQuestions (ÚJ KOMPONENS)                                     │
│      ├─ INPUT Filter: Adatforrás és Hitelesség                          │
│      │   • "Rendelkezésre állnak-e végleges PDF tervrajzok?"            │
│      │   • "Történt-e módosítás a helyszínen a tervek óta?"             │
│      │                                                                   │
│      ├─ TECHNICAL Filter: Komplexitás és Szabályozás                    │
│      │   • "Érint-e tartószerkezetet, gépészeti fővezetéket?"           │
│      │   • "Van-e kijelölt műszaki vezető?"                             │
│      │                                                                   │
│      └─ WORKFLOW Filter: Erőforrás és Idő                               │
│          • "Hány szakág összehangolása szükséges?"                      │
│          • "Mi a kritikus határidő és van-e kötött költségkeret?"       │
│                                                                          │
│  [3] AI Analysis (Dual-Engine + Filter-Aware)                           │
│      ├─ Gemini: Vizuális elemzés + blueprint összehasonlítás            │
│      ├─ OpenAI: OBC szabályok keresése (ha struktúrális)                │
│      └─ Synthesis: Conflict detection + AI üzenet                        │
│                                                                          │
│  [4] WorkflowSelector (Frissítve)                                        │
│      ├─ AI Detection Results (szerkeszthető)                            │
│      ├─ AI Explanation Message (a Gemini-féle szöveg)                   │
│      ├─ Filter-Based Recommendations                                     │
│      └─ Solo/Team mode választás (tier-gated)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Részletes Komponens Terv

### 1. ÚJ: FilterQuestions Komponens

**Fájl:** `src/components/projects2/FilterQuestions.tsx`

**Három szűrő kategória:**

```text
INPUT FILTER (Adatforrás Validáció)
┌────────────────────────────────────────────────────────────┐
│ 1. "Rendelkezésre állnak-e a végleges, pecséttel ellátott │
│     PDF tervrajzok és a jelenlegi helyszíni fotók?"        │
│     [ ] Igen, mindkettő   [ ] Csak tervrajz                │
│     [ ] Csak fotók        [ ] Egyik sem                    │
│                                                             │
│ 2. "Történt-e bármilyen módosítás a helyszínen a tervek   │
│     kiadása óta?"                                          │
│     [ ] Igen, jelentős    [ ] Kisebb módosítások           │
│     [ ] Nem               [ ] Nem tudom                    │
└────────────────────────────────────────────────────────────┘

TECHNICAL FILTER (Komplexitás + OBC Trigger)
┌────────────────────────────────────────────────────────────┐
│ 3. "A munka érint-e tartószerkezetet, gépészeti            │
│     fővezetéket vagy külső homlokzatot?"                   │
│     [ ] Tartószerkezet    [ ] Gépészeti fővezeték          │
│     [ ] Külső homlokzat   [ ] Egyik sem                    │
│                                                             │
│ 4. "Van-e kijelölt felelős műszaki vezető vagy             │
│     Project Manager a helyszínen?"                          │
│     [ ] Igen, van PM      [ ] Igen, van műszaki vezető     │
│     [ ] Nincs kijelölve   [ ] Én vagyok az                 │
└────────────────────────────────────────────────────────────┘

WORKFLOW FILTER (Erőforrás + Idő)
┌────────────────────────────────────────────────────────────┐
│ 5. "Hány különböző szakág összehangolása a feladat?"       │
│     [ ] 1-2 szakág        [ ] 3-5 szakág                   │
│     [ ] 6+ szakág         [ ] Nem releváns                 │
│                                                             │
│ 6. "Mi a kritikus átadási határidő és van-e kötött        │
│     költségkeret?"                                          │
│     [ ] Szigorú határidő + fix budget                      │
│     [ ] Rugalmas határidő + fix budget                     │
│     [ ] Szigorú határidő + rugalmas budget                 │
│     [ ] Mindkettő rugalmas                                 │
└────────────────────────────────────────────────────────────┘
```

**Filter válaszok hatásai:**

| Válasz | Trigger | Eredmény |
|--------|---------|----------|
| Pecsételt tervrajz + fotó | RAG engedélyezés | Gemini vizuális összehasonlítás aktív |
| Módosítás történt | Conflict Detection | Sárga/piros marker a térképen |
| Tartószerkezet/gépészet | OBC keresés | OpenAI beazonosítja az engedélyeket |
| Van PM | Team Mode ajánlás | PRO/PREMIUM workflow trigger |
| 6+ szakág | Team Map scaling | AI Synthesis mélység növelése |
| Szigorú határidő | Project Reports | Költségbecslés generálás |

---

### 2. AI Analysis Message (Gemini válasz)

Az AI elemzés után megjelenő üzenet dinamikusan épül fel a filter válaszok alapján:

```text
"Azért kérdeztem ezeket, mert a BuildUnion nem becsül, hanem elemez.

A válaszai alapján:
✓ Az OpenAI beazonosította a szükséges engedélyeket: [OBC 9.10.14 - Tartószerkezet]
✓ A Gemini előkészítette a tervrajzok és fotók vizuális összevetését
✓ [X] db szakág koordinációját igényli a projekt

Most aktiválom a [PRO] workflow-t, ahol a Conflict Visualization 
segít elkerülni a hibákat.

📐 Detektált terület: 1,350 sq ft
🧱 Anyagok: 12 tétel azonosítva
⚠️ 1 eltérés észlelve a tervek és fotók között"
```

---

### 3. Adatbázis Struktúra Bővítése

Az `ai_workflow_config` JSONB mező kiterjesztése:

```json
{
  "filterAnswers": {
    "inputFilter": {
      "hasStampedBlueprints": true,
      "hasCurrentPhotos": true,
      "siteModifications": "minor"
    },
    "technicalFilter": {
      "structural": false,
      "mechanical": true,
      "facade": false,
      "hasProjectManager": true
    },
    "workflowFilter": {
      "subcontractorCount": "3-5",
      "deadlineType": "strict",
      "budgetType": "fixed"
    }
  },
  "aiTriggers": {
    "ragEnabled": true,
    "conflictDetection": true,
    "obcSearch": true,
    "teamMapDepth": "standard",
    "reportGeneration": true
  },
  "projectSize": "medium",
  "projectSizeReason": "AI detected 1200 sq ft with 7 materials",
  "recommendedMode": "team",
  "selectedMode": "solo",
  "tierAtCreation": "pro",
  "teamLimitAtCreation": 10,
  "aiAnalysis": {
    "area": 1200,
    "areaUnit": "sq ft",
    "materials": [...],
    "hasBlueprint": true,
    "confidence": "high",
    "obcReferences": ["9.10.14", "3.1.5"],
    "conflictsDetected": 1
  },
  "aiExplanationMessage": "Azért kérdeztem ezeket, mert..."
}
```

---

### 4. Komponens Hierarchia és Flow

```text
BuildUnionProjects2.tsx (Fő Orchestrator)
│
├── showQuestionnaire === true
│   └── ProjectQuestionnaire.tsx
│       └── onComplete → setShowFilterQuestions(true)
│
├── showFilterQuestions === true (ÚJ ÁLLAPOT)
│   └── FilterQuestions.tsx (ÚJ)
│       └── onComplete → triggerAIAnalysis()
│
├── analyzing === true
│   └── AIAnalysisProgress.tsx (frissítve)
│       └── Filter-aware lépések megjelenítése
│
├── aiAnalysisForSelector !== null
│   └── WorkflowSelector.tsx (frissítve)
│       ├── AI Explanation Message (ÚJ)
│       ├── Filter-Based Recommendations (ÚJ)
│       ├── AI Detection Results (szerkeszthető)
│       └── Solo/Team Mode választás
│
└── Projekt Lista (ha nincs aktív folyamat)
```

---

### 5. Implementációs Lépések

**Fázis 1: FilterQuestions Komponens Létrehozása**
- Új fájl: `src/components/projects2/FilterQuestions.tsx`
- Három szűrő kategória UI implementálása
- Válaszok state kezelése és validáció
- Animált átmenetek a szűrők között

**Fázis 2: BuildUnionProjects2.tsx Frissítése**
- Új state: `showFilterQuestions`, `filterAnswers`
- Flow módosítás: Questionnaire → FilterQuestions → AI Analysis
- Filter válaszok átadása az AI hook-nak

**Fázis 3: useProjectAIAnalysis Hook Bővítése**
- Filter válaszok fogadása paraméterként
- OBC keresés trigger ha structural === true
- Conflict detection fokozása ha modifications !== "none"
- AI Explanation Message generálása

**Fázis 4: WorkflowSelector Frissítése**
- AI Explanation Message megjelenítése
- Filter-Based Recommendations szekció
- Vizuális jelzések a triggerelt funkciókhoz

**Fázis 5: AIAnalysisProgress Frissítése**
- Filter-aware lépések megjelenítése
- OBC keresés progress ha aktív
- Conflict detection progress ha aktív

---

### 6. TypeScript Interfészek

```typescript
// Filter válaszok
interface FilterAnswers {
  inputFilter: {
    dataAvailability: "both" | "blueprints_only" | "photos_only" | "none";
    siteModifications: "significant" | "minor" | "none" | "unknown";
  };
  technicalFilter: {
    affectsStructure: boolean;
    affectsMechanical: boolean;
    affectsFacade: boolean;
    hasProjectManager: "yes_pm" | "yes_technical" | "no" | "self";
  };
  workflowFilter: {
    subcontractorCount: "1-2" | "3-5" | "6+" | "not_applicable";
    deadline: "strict_fixed" | "flexible_fixed" | "strict_flexible" | "both_flexible";
  };
}

// AI Triggers (filter válaszokból számított)
interface AITriggers {
  ragEnabled: boolean;           // Ha van blueprint + fotó
  conflictDetection: boolean;    // Ha van módosítás
  obcSearch: boolean;            // Ha strukturális/gépészeti
  teamMapDepth: "basic" | "standard" | "deep";  // Szakágak száma alapján
  reportGeneration: boolean;     // Ha szigorú határidő/budget
  recommendTeamMode: boolean;    // Ha van PM vagy 3+ szakág
}

// FilterQuestions props
interface FilterQuestionsProps {
  projectData: {
    name: string;
    workType: string | null;
    hasImages: boolean;
    hasDocuments: boolean;
  };
  onComplete: (answers: FilterAnswers) => void;
  onBack: () => void;
}
```

---

### 7. UI/UX Design Irányelvek

**FilterQuestions UI:**
- Kártya alapú design, egy kérdés per kártya
- Animált átmenetek (slide) a kártyák között
- Progress indicator (1/6, 2/6, stb.)
- Visszalépés lehetősége
- "Skip All" opció (alapértelmezett válaszokkal)
- Ikonok és színek a kategóriákhoz:
  - Input Filter: 📁 Kék
  - Technical Filter: ⚙️ Narancs
  - Workflow Filter: 📊 Zöld

**AI Explanation Message UI:**
- Disztinktív kártya a WorkflowSelector-ban
- Gemini/OpenAI logók a megfelelő részeknél
- Animált "typewriter" effekt az üzenethez
- Expandálható "Decision Log" részletek

---

### 8. Összefoglalás

Ez a terv ötvözi:
1. **Az eredeti Gemini tervet** - három szűrő kategória, AI magyarázó üzenet
2. **A meglévő kódot** - ProjectQuestionnaire, WorkflowSelector, AI hook
3. **A tier-based architektúrát** - létszám korlátok, nem projekt méret
4. **A dual-engine AI-t** - Gemini vizuális + OpenAI szabályozási elemzés

Az új workflow:
1. Minimális input (név, work type, feltöltések)
2. Intelligens szűrő kérdések (RAG, OBC, Team triggers)
3. AI elemzés a filter válaszok alapján
4. Átlátható magyarázat ("Azért kérdeztem...")
5. Szerkeszthető eredmények és workflow választás
