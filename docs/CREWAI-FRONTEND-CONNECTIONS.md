# CrewAI logika és frontend összefüggései

## Összefoglaló

- **CrewAI**: A projektben nincs már CrewAI SDK; a korábbi vizuális flow logikája a **buildunion-brain** (és most már az **operational-truth** Edge Function) alatt él.
- **Frontend**: React (Vite) + Supabase client; az API hívások `supabase.functions.invoke()` és közvetlen `fetch` (pl. ask-messa) útján mennek.

## Mi VAN bekötve

| Backend | Frontend hívó | Hol jelenik meg |
|--------|----------------|------------------|
| **ask-messa** | `GeneralMessaChat.tsx` (fetch) | Általános M.E.S.S.A. chat |
| **ask-messa-project** | `ProjectMessaChat.tsx` (fetch) | Projekt kontextusos chat |
| **ai-project-analysis** | `Stage8FinalReview.tsx` (invoke) | Wizard Stage 8 – M.E.S.S.A. szintézis, OBC, költség |
| **operational-truth** (új) | `BuildUnionProjectDetails.tsx` (invoke) | Projekt részletek oldal – „AI Brain" panel (Chief Engineer → Visual Inspector → Financial) |

## Mi NINCS bekötve (opcionális / később)

| Backend | Megjegyzés |
|--------|------------|
| **buildunion-brain** (standalone Deno) | Logikája átkerült az **operational-truth** Edge Functionbe; a régi `buildunion-brain/index.ts` nem hívódik a frontendről. |
| **generate-project-brief** | Nincs frontend invoke; belső/cron vagy wizard későbbi fázisban hívható. |
| **generate-summary** | Nincs frontend invoke. |
| **generate-team-report** | Nincs frontend invoke. |
| **quick-estimate** | Nincs frontend invoke. |

## Az „agya" a weboldalon

A **M.E.S.S.A. Operational Truth** (AI Brain) a **Projekt részletek** oldalon látszik:

1. Menj egy projektre: **BuildUnion → Workspace → [Projekt]**, vagy közvetlenül `/buildunion/project/:projectId`.
2. A jobb oldali panelen keresd a **„M.E.S.S.A. Operational Truth"** / **„AI Brain"** panelt.
3. Kattints a **„Run AI Brain"** gombra.
4. A backend (Chief Engineer → Visual Inspector → Financial Auditor) lefut, és az oldalon megjelenik:
   - projekt kontextus (location, regulations, inspection targets),
   - vizuális audit státusz,
   - pénzügyi döntés (AUTHORIZED/BLOCKED) és indoklás.

A hívás a **Supabase Edge Function** `operational-truth`-ot használja, amely a korábbi **buildunion-brain** (CrewAI-migrated) logikát futtatja.

## Fájlok

- **Edge Function**: `supabase/functions/operational-truth/index.ts`
- **Frontend panel**: `src/pages/BuildUnionProjectDetails.tsx` (state: `brainResult`, `brainLoading`, `brainError`; handler: `runOperationalTruth`)
