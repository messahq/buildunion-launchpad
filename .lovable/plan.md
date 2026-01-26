
# Ideális Projekt Workflow Architektúra - Projects 2

## Fő Elvek

A rendszer **"egy lépéssel a felhasználó előtt"** jár:
- Minimális kézi bevitel (csak projekt név + work type + feltöltések)
- AI automatikusan detektálja a projekt komplexitást
- Tier alapján a **csapatméret** korlátoz, NEM a projekt méret
- A workflow ajánlás automatikus, de a felhasználó módosíthatja

---

## Tier Struktúra (Létszám Alapú)

```text
+-------------+------------------+------------------------+
| Tier        | Team Limit       | Features               |
+-------------+------------------+------------------------+
| FREE        | 0 (Solo only)    | Quick Mode only        |
|             |                  | 3 AI estimate trial    |
+-------------+------------------+------------------------+
| PRO         | 10 members       | Solo + Team Mode       |
| $19.99/mo   |                  | Unlimited AI estimates |
|             |                  | Documents, Tasks       |
+-------------+------------------+------------------------+
| PREMIUM     | 50 members       | All PRO features       |
| $49.99/mo   |                  | Conflict Visualization |
|             |                  | Priority AI, Reporting |
+-------------+------------------+------------------------+
| ENTERPRISE  | Unlimited        | All features           |
|             |                  | Custom integrations    |
+-------------+------------------+------------------------+
```

---

## Workflow Fázisok

### Fázis 1: Minimális Input (Kérdőív)
**Amit kérünk:**
- Projekt név (kötelező)
- Work Type (opcionális, de segít az AI-nak)
- Location (opcionális)
- Képek/PDF feltöltés (opcionális)
- Rövid leírás (opcionális)

**Amit NEM kérünk:**
- Projekt méret (AI határozza meg)
- Team szükséglet (tier alapján automatikus)
- Workflow típus (AI ajánl)

### Fázis 2: AI Analízis
**Dual-Engine működés:**
1. **Gemini (Visual Specialist)**: Kép/PDF elemzés - terület, felület, állapot
2. **GPT (Estimation Specialist)**: Anyaglista, mennyiségek, költségbecslés

**Automatikus Project Size meghatározás:**
```text
SMALL:  < 500 sq ft VAGY < 5 anyag
MEDIUM: 500-2000 sq ft VAGY 5-10 anyag VAGY 1 blueprint
LARGE:  > 2000 sq ft VAGY > 10 anyag VAGY 2+ blueprint
```

### Fázis 3: Workflow Ajánlás (Tier-Guided)

A rendszer a **TIER-t** veszi alapul, nem a projekt méretet:

```text
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW DÖNTÉSI FA                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Tier = FREE?                                           │
│  ├─ YES → SOLO MODE (Quick Workflow)                        │
│  │         Features: Photo Estimate, Calculator, Quote,     │
│  │                   Contract (max 3 AI uses)               │
│  │                                                          │
│  └─ NO → User Tier = PRO/PREMIUM/ENTERPRISE?                │
│          │                                                  │
│          └─ AI Project Size = ?                             │
│              ├─ SMALL  → Recommend SOLO (but offer TEAM)    │
│              ├─ MEDIUM → Recommend TEAM (Standard features) │
│              └─ LARGE  → Recommend TEAM (Full features)     │
│                                                              │
│  TEAM MODE csak tier limit-ig enged meghívni:               │
│  PRO: 10 | PREMIUM: 50 | ENTERPRISE: ∞                      │
└─────────────────────────────────────────────────────────────┘
```

### Fázis 4: Workflow Selector UI

Az AI elemzés után megjelenik:
1. **AI Detection Results** (szerkeszthető)
   - Detektált terület (inline edit)
   - Anyaglista (mennyiség edit)
   - Projekt méret badge (Small/Medium/Large)

2. **Workflow Options** (3 kártya)
   - **Solo Mode** - Mindig elérhető
   - **Team Mode** - PRO+ tierhez (vagy upgrade prompt)
   - Mindkettőnél: feature lista, becsült lépések

3. **Team Limit Indicator**
   - "Your tier: PRO - Up to 10 team members"
   - Ha FREE: "Upgrade to PRO for team features"

---

## Adatmodell Változások

### project_summaries tábla bővítése (ajánlott):
```sql
-- Új mezők hozzáadása
ALTER TABLE project_summaries ADD COLUMN IF NOT EXISTS 
  ai_workflow_config JSONB DEFAULT '{}'::jsonb;

-- ai_workflow_config struktúra:
{
  "projectSize": "medium",
  "projectSizeReason": "AI detected 1200 sq ft with 7 materials",
  "recommendedMode": "team",
  "selectedMode": "solo",  -- amit a user választott
  "tierAtCreation": "pro",
  "teamLimitAtCreation": 10,
  "aiAnalysis": {
    "area": 1200,
    "areaUnit": "sq ft",
    "materials": [...],
    "hasBlueprint": true,
    "confidence": "high"
  },
  "userEdits": {
    "editedArea": 1350,
    "editedMaterials": [...],
    "editedAt": "2026-01-26T..."
  }
}
```

---

## Komponens Struktúra

```text
BuildUnionProjects2.tsx
├── ProjectQuestionnaire.tsx (egyszerűsített)
│   └── Csak: név, work type, location, uploads, description
│
├── AIAnalysisProgress.tsx (meglévő)
│   └── Progress bar az elemzés alatt
│
├── WorkflowSelector.tsx (ÚJ komponens)
│   ├── AIDetectionResults (szerkeszthető terület/anyagok)
│   ├── TierInfoBanner (team limit info)
│   ├── WorkflowCard (Solo) 
│   └── WorkflowCard (Team) - tier-gated
│
└── ProjectList.tsx (meglévő projektek)
```

---

## Implementációs Terv

### 1. Kérdőív Egyszerűsítése
- Eltávolítani: `size` és `teamNeed` mezőket
- Megtartani: `name`, `workType`, `location`, `images`, `documents`, `description`
- Az AI elemzés után határozzuk meg a workflow-t

### 2. Új WorkflowSelector Komponens
Létrehozni: `src/components/projects2/WorkflowSelector.tsx`
- AI eredmények megjelenítése (terület, anyagok, méret)
- Inline szerkesztés (terület, mennyiségek)
- Solo/Team mode választás tier-gating-gel
- Team limit kijelzés

### 3. Tier-Based Workflow Logic
Módosítani: `BuildUnionProjects2.tsx`
- `determineAIWorkflow` függvény átírása:
  - FREE tier → mindig Solo ajánlás
  - PRO+ tier → projekt méret alapján ajánlás, de mindkét opció elérhető
  - Team limit kijelzése a UI-ban

### 4. Adatbázis Frissítés
Migráció: `ai_workflow_config` mező hozzáadása
- Tier információ mentése a projekt létrehozásakor
- User edits külön tárolása

### 5. Mode Toggle Frissítés
- Solo → Team váltás: tier ellenőrzés
- Team → Solo váltás: mindig engedélyezett
- Upgrade prompt ha FREE user próbál Team-re váltani

---

## Felhasználói Folyamat Összefoglaló

```text
1. User: "New Project" gomb
   
2. Kérdőív: név + work type + képek feltöltése
   
3. AI elemzés fut (15-30 sec)
   ├── Visual analysis (Gemini)
   ├── Material estimation (GPT)
   └── Project size determination
   
4. Workflow Selector megjelenik:
   ┌────────────────────────────────────────┐
   │ 🎯 AI Detection Results               │
   │ Area: [1,200 sq ft] ✏️                │
   │ Materials: Drywall (45), Paint (12)...│
   │ Size: MEDIUM 🟡                        │
   ├────────────────────────────────────────┤
   │ 👤 Your Tier: PRO (10 team members)   │
   ├────────────────────────────────────────┤
   │ Choose Your Workflow:                  │
   │                                        │
   │ [Solo Mode]        [Team Mode] ⭐      │
   │  Quick estimates    Full management   │
   │  Calculator         Documents         │
   │  Quote & Contract   Team & Tasks      │
   │                     Recommended!       │
   └────────────────────────────────────────┘

5. User választ → navigáció a megfelelő flow-ba
   - Solo → /buildunion/quick?projectId=...
   - Team → /buildunion/project/{id}
```

---

## Technikai Részletek

### WorkflowSelector Props Interface
```typescript
interface WorkflowSelectorProps {
  projectId: string;
  analysisResult: AIAnalysisResult;
  tier: SubscriptionTier;
  teamLimit: number;
  onSelectWorkflow: (mode: "solo" | "team", editedData?: EditedAnalysisData) => void;
  onUpgradeClick: () => void;
}
```

### Tier-Based Feature Map
```typescript
const TIER_FEATURES = {
  free: {
    modes: ["solo"],
    teamLimit: 0,
    aiTrials: 3,
    features: ["Photo Estimate", "Calculator", "Quote", "Contract"]
  },
  pro: {
    modes: ["solo", "team"],
    teamLimit: 10,
    aiTrials: Infinity,
    features: ["All Solo", "Documents", "Team", "Tasks", "Messaging"]
  },
  premium: {
    modes: ["solo", "team"],
    teamLimit: 50,
    aiTrials: Infinity,
    features: ["All Pro", "Conflict Viz", "Priority AI", "Reports"]
  }
};
```

### Navigációs Logika
```typescript
const handleWorkflowSelect = (mode: "solo" | "team") => {
  if (mode === "team" && tier === "free") {
    // Upgrade modal megnyitása
    setShowUpgradeModal(true);
    return;
  }
  
  // Adatok mentése
  await saveWorkflowConfig(projectId, mode, editedData);
  
  // Navigáció
  if (mode === "solo") {
    navigate(`/buildunion/quick?projectId=${projectId}`);
  } else {
    navigate(`/buildunion/project/${projectId}`);
  }
};
```

---

## Összefoglalás

Ez az architektúra:
1. **Minimalizálja a user inputot** - csak név és feltöltések kellenek
2. **AI-ra bízza a komplexitás detektálást** - projekt méret automatikus
3. **Tier alapján korlátoz** - létszám limit, nem projekt méret
4. **Mindkét opciót kínálja** - Solo és Team, de tier-gated
5. **Szerkeszthető AI eredmények** - user felülbírálhatja
6. **Elkülönített Projects 2** - nem érinti a régi workspace-t

