
# Project Report Generator - Professzionális PDF Export

## Összefoglaló
A Project Report Generator funkció lehetővé teszi Premium felhasználók számára, hogy professzionális PDF dokumentumot exportáljanak az összes AI elemzési eredménnyel, OBC megfelelőségi státusszal és Operational Truth pillérek adataival.

---

## Implementálandó elemek

### 1. Új Report HTML Template
**Fájl:** `src/lib/pdfGenerator.ts`

Új `buildProjectReportHTML` függvény hozzáadása, amely tartalmazza:
- **Header:** Céglogo, projekt neve, generálás dátuma
- **Operational Truth szekció:** 8 pillér vizuális kártyákkal
- **AI Analysis szekció:** 
  - Gemini (Visual) eredmények
  - OpenAI (Regulatory) eredmények
  - Confidence szintek
- **OBC Compliance szekció:**
  - Engedély típusa és költsége
  - OBC hivatkozások listája
  - Megfelelőségi pontszám (progress bar)
  - Ajánlások
- **Conflict Report szekció:**
  - Észlelt eltérések táblázat (site vs blueprint)
  - Severity jelölések (high/medium/low)
- **Materials szekció:** AI-detektált anyagok listája
- **Footer:** WSIB, licensz, aláírás helyek

### 2. Report generáló függvény
**Fájl:** `src/lib/pdfGenerator.ts`

```text
generateProjectReport(params: ProjectReportParams): Promise<Blob>
├── projectInfo (név, cím, trade)
├── operationalTruth (8 pillér adatok)
├── obcDetails (engedélyek, hivatkozások)
├── conflicts (eltérések listája)
├── dualEngineOutput (Gemini/OpenAI excerpts)
└── companyBranding (logo, kontakt)
```

### 3. ProjectAIPanel integráció frissítése
**Fájl:** `src/components/ProjectAIPanel.tsx`

A jelenlegi mock `handleGenerateReport` helyettesítése:
- Összegyűjti az összes adatot a project summary-ból
- Meghívja az új `generateProjectReport` függvényt
- Letölti a PDF-et és opcionálisan elmenti a project-documents-be
- Loading állapot és toast visszajelzés

### 4. ProjectDetailsView Report gomb
**Fájl:** `src/components/projects2/ProjectDetailsView.tsx`

- Új "Generate Report" gomb az Overview tab-on
- Premium tier ellenőrzés (ProBadge ha locked)
- Átadja az operationalTruth és obcDetails adatokat

### 5. Lokalizáció
**Fájlok:** `src/i18n/locales/en.json`, `src/i18n/locales/hu.json`

Új kulcsok:
- `report.title`, `report.generating`, `report.success`
- `report.sections.*` (operational, obc, conflicts, materials)

---

## Adatfolyam

```text
ProjectDetailsView
    │
    ├── operationalTruth (buildOperationalTruth)
    ├── summary.photo_estimate
    ├── summary.blueprint_analysis
    ├── dualEngineOutput (Gemini + OpenAI)
    └── conflicts (useSingleProjectConflicts)
            │
            ▼
    generateProjectReport()
            │
            ▼
    buildProjectReportHTML()
            │
            ▼
    generatePDFBlob()
            │
            ▼
    Download PDF / Save to Documents
```

---

## UI Design

### Report generálás gomb
- Helyzet: Overview tab jobb felső sarok
- Ikon: FileText + Download
- Szöveg: "Generate Report"
- Premium jelzés: ProBadge PREMIUM tooltip
- Loading: Spinner + "Generating..."

### PDF Layout
- A4/Letter formátum támogatás
- Sötét header BuildUnion branding-gel
- Szekciónkénti oldalszámozás
- Színkódolt status badges (green/amber/red)
- Professional sans-serif tipográfia

---

## Érintett fájlok

| Fájl | Változás típusa |
|------|-----------------|
| `src/lib/pdfGenerator.ts` | Új `buildProjectReportHTML` és `generateProjectReport` függvények |
| `src/components/ProjectAIPanel.tsx` | `handleGenerateReport` valódi implementáció |
| `src/components/projects2/ProjectDetailsView.tsx` | Report gomb hozzáadása |
| `src/i18n/locales/en.json` | Report kulcsok |
| `src/i18n/locales/hu.json` | Report kulcsok (magyar) |

---

## Technikai részletek

### PDF Generator paraméterek
```typescript
interface ProjectReportParams {
  projectInfo: {
    name: string;
    address: string;
    trade: string;
    createdAt: string;
  };
  operationalTruth: OperationalTruth;
  obcDetails?: OBCValidationDetails;
  conflicts: ConflictData[];
  dualEngineOutput?: {
    gemini: { area: number; confidence: string; rawExcerpt?: string };
    openai: { permitRequired: boolean; obcReferences: OBCReference[]; rawExcerpt?: string };
  };
  companyBranding?: {
    name: string;
    logo?: string;
    license?: string;
    wsib?: string;
  };
}
```

### Tier ellenőrzés
```typescript
const canGenerateReport = subscription?.tier === "premium" || subscription?.tier === "enterprise";
```

### Storage mentés
A generált PDF automatikusan mentődik a `project-documents` bucket-be:
```text
{projectId}/reports/ProjectReport_{timestamp}.pdf
```
