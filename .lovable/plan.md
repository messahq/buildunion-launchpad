
## Terv: Citációk megjelenítési hiba javítása a DNA panelen

### A Probléma
A `handleDefinitionFlowComplete` (Stage 5 vege) es a `handleTeamSetupComplete` (Stage 6 vege) fuggvenyek elmentik az uj citaciokat az adatbazisba es a localStorage-ba, **de nem hivjak meg a `setCitations()` fuggvenyt**. Ezert a `CitationDrivenCanvas` React komponens nem kap frissitett adatokat, es a Timeline, End Date, Team Member, Site Condition stb. kartyak **nem jelennek meg** az oldal ujratoltese nelkul.

### Javitas

**Fajl: `src/pages/BuildUnionNewProject.tsx`**

1. **`handleDefinitionFlowComplete` (~292. sor)**: Az `allCitations` osszefuzes utan hozzaadni:
```typescript
const allCitations = [...citations, ...citations_data];
setCitations(allCitations);  // <-- EZ HIANYZIK
```

2. **`handleTeamSetupComplete` (~322. sor)**: Ugyanigy:
```typescript
const allCitations = [...citations, ...teamCitations];
setCitations(allCitations);  // <-- EZ IS HIANYZIK
```

### Hatas
- A DNA panel azonnal megjeleníti az osszes citaciot (Timeline, End Date, Team Members, Site Photos, Blueprints stb.) anelkul, hogy ujra kellene tolteni az oldalt
- Ket sor hozzaadasa, semmi mas nem valtozik
