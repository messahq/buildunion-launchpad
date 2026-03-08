

# Phase 2.5 — AI Engine Territory Dashboard

## Koncepció

Az AI Engine Strip-et átalakítjuk "AI Territory" rendszerré, ahol minden AI motor **saját oszlopot/területet kap** a dashboardon, és vizuálisan egyértelmű, melyik AI milyen panelekért felel.

## AI Engine → Panel Mapping

```text
┌─────────────────────────────────────────────────────────────┐
│  AI ENGINE STRIP (top bar — 4 engines pulsing)              │
│  🔵 Gemini    🟢 GPT    🟣 MESSA    🔴 Claude/Grok        │
├──────────┬──────────┬──────────────┬────────────────────────┤
│ GEMINI   │ GPT      │ MESSA        │ CLAUDE / GROK         │
│ (Visual) │ (Core)   │ (Synthesis)  │ (External)            │
│──────────│──────────│──────────────│────────────────────────│
│ Visual   │ Project  │ DNA Audit    │ Affiliate Hub         │
│ Intelli- │ Basics   │ (9 Pillar)   │ (future partner       │
│ gence    │          │              │  integrations)        │
│          │ Area &   │ Execution    │                       │
│ Site Log │ GFA      │ Timeline     │ OBC Building Code     │
│ Weather  │          │ (Gantt)      │ Alignment             │
│          │ Trade &  │              │                       │
│          │ Template │ Team Arch.   │                       │
│          │          │              │                       │
│          │ Financial│              │                       │
│          │ Summary  │              │                       │
└──────────┴──────────┴──────────────┴────────────────────────┘
```

### Elosztás logikája:

- **Gemini** (kék/cyan) — Visual Intelligence, Weather/Site Log → képelemzés, helyszín, vizuális adat
- **GPT** (zöld) — Project Basics, Area/GFA, Trade/Template, Financial → szöveges/numerikus core adat
- **MESSA** (lila) — DNA Audit, Execution Timeline, Team Architecture → szintézis, összefogás, Gantt
- **Claude/Grok** (piros/narancs) — OBC Alignment, Affiliate Hub → külső szabályozás, partnerségek (jövőbeli bővítés helye)

## Implementáció

### 1. AI Engine Strip frissítés
- 4 engine-re bővítés: Gemini, GPT, MESSA, Claude/Grok
- Minden engine saját szín + pulzáló pont + felirat marad
- Tooltip-ban: "Manages: Visual Intelligence, Weather"

### 2. Grid kártyák átalakítása
A jelenlegi `grid-cols-4/5` rendszert **4 oszlopra** cseréljük, ahol minden oszlop tetején egy **AI engine fejléc** van:

- Oszlop fejléc: engine neve + ikon + szín + "territory" badge
- Alatta a hozzátartozó panel kártyák egymás alatt
- Glassmorphism kártya stílus: `bg-[#0c1120]/60 backdrop-blur-md border-[engine-color]/30`
- Orange-gold accent a fontos értékeknél

### 3. Kártya design upgrade
- Sötét üveg-hatás (glassmorphism) háttér
- Engine-szín border-glow aktív állapotban
- Mini progress bar vagy sparkline ahol van adat
- Engine ikon a kártya sarkában (kis badge)

### 4. Mobil nézet
- Vertikálisan scrollozható, engine-csoportonként szekciók
- Sticky engine fejléc minden szekció felett
- Fix bottom action bar megmarad

### Fájlok
- `src/components/project-wizard/Stage8FinalReview.tsx` — Grid layout + AI Engine Strip + kártya stílus

