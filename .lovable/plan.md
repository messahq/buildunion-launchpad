
# Terv: Projekt Dátum Mezők hozzáadása a FilterQuestions-hez

## Mit csinálunk?
A projekt kérdőív (FilterQuestions) 2. lépésében (Complexity & Regulations) az "I am the lead" opció után megjelenítünk két dátumválasztó mezőt:
- **Project Start** (Projekt kezdete)
- **Target End** (Tervezett befejezés)

## Hol lesz a változás?

```text
┌─────────────────────────────────────────────────────┐
│  Complexity & Regulations                           │
│  What type of work is involved?                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Does this work affect any of the following?        │
│  ☐ Structural Components                            │
│  ☐ Mechanical Main Lines                            │
│  ☐ Exterior Facade                                  │
│                                                     │
│  Is there a designated Project Manager...?          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Yes, PM         │  │ Yes, Technical  │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ I am the lead ⬤ │  │ Not assigned    │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  📅 PROJECT TIMELINE (ÚJ SZAKASZ!)             ││
│  │  ┌──────────────┐  ┌──────────────┐            ││
│  │  │ Project Start│  │ Target End   │            ││
│  │  │ Pick a date  │  │ Pick a date  │            ││
│  │  └──────────────┘  └──────────────┘            ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Technikai részletek

### 1. FilterQuestions.tsx módosítások

**Típus definíció bővítése:**
```typescript
export interface FilterAnswers {
  // ... meglévő mezők ...
  technicalFilter: {
    // ... meglévő mezők ...
    projectStartDate: Date | null;  // ÚJ
    projectEndDate: Date | null;    // ÚJ
  };
}
```

**TechnicalFilterStep komponens bővítése:**
- Import: `Calendar`, `Popover`, `PopoverTrigger`, `PopoverContent`, `CalendarIcon`, `format` (date-fns)
- Új UI szakasz az "I am the lead" kérdés alatt
- Két dátumválasztó mező (Popover + Calendar)
- Vizuális stílus: határolt doboz, CalendarIcon ikonok

### 2. Adatok továbbítása

A dátumok átkerülnek a FilterAnswers-ből a projekt mentéskor, és beíródnak a `project_summaries` táblába:
- `project_start_date`
- `project_end_date`

Ez már létezik az adatbázisban az előző migrációból!

### 3. Lokalizáció

Új fordítási kulcsok:
- `filterQuestions.projectTimeline` = "Project Timeline" / "Projekt ütemezés"
- `filterQuestions.projectStart` = "Project Start" / "Projekt kezdete"  
- `filterQuestions.targetEnd` = "Target End" / "Tervezett befejezés"
- `filterQuestions.pickDate` = "Pick a date" / "Válassz dátumot"

## Fájlok amelyek módosulnak

| Fájl | Változás |
|------|----------|
| `src/components/projects2/FilterQuestions.tsx` | Dátum mezők UI hozzáadása |
| `src/pages/BuildUnionProjects2.tsx` | Dátumok átadása mentéskor |
| `src/i18n/locales/en.json` | Angol fordítások |
| `src/i18n/locales/hu.json` | Magyar fordítások |

## Előnyök

1. A felhasználó már a projekt létrehozásakor megadhatja az ütemezést
2. A Timeline automatikusan szinkronizálódik ezekkel a dátumokkal
3. Nem kell később külön megadni a BaselineLockCard-ban
