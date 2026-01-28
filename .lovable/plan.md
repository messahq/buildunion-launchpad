
# Health Score Solo skálázás + Lokalizáció + Teszt lefedettség

## Összefoglaló
A Solo módban a Health Score jelenleg 16 pontra számol, holott 5 data source (Documents, Contracts, Team + opcionális) "N/A" státuszú. Ez torzítja a %-ot. Emellett hiányoznak a Solo-specifikus i18n kulcsok és a verification logikához nincsenek tesztek.

---

## 1. Health Score Solo skálázás

### Jelenlegi probléma
A `ProjectCommandCenter.tsx` 580. sorában:
```typescript
const healthScore = Math.round(
  (dataSources.filter(s => s.status === "complete").length / dataSources.length) * 100
);
```

Ez **16-ra oszt** mindig, holott Solo módban 3-5 pillar automatikusan "complete" az "N/A" miatt - de nem relevánsak a %-ban.

### Javítás
Solo módban csak a **releváns** pillarokat számoljuk:
- Kizárjuk: `documents`, `contracts`, `team` (ezek N/A)
- A többi 13 pont marad értékelve

```typescript
// Új logika
const relevantSources = isSoloMode 
  ? dataSources.filter(s => !["documents", "contracts", "team"].includes(s.id))
  : dataSources;

const healthScore = Math.round(
  (relevantSources.filter(s => s.status === "complete").length / relevantSources.length) * 100
);
```

### Hatás
- Solo: 13/13 = 100% (ha minden releváns teljes)
- Team: 16/16 = 100% (változatlan)

---

## 2. Lokalizáció - Solo-specifikus kulcsok

### Hiányzó kulcsok (11 nyelv)
Új namespace: `commandCenter.solo`

| Kulcs | EN | HU |
|-------|----|----|
| `notRequired` | "Not required (Solo)" | "Nem szükséges (Egyéni)" |
| `documentsOptional` | "Documents are optional in Solo Mode" | "Dokumentumok opcionálisak Egyéni módban" |
| `contractsOptional` | "Contracts not needed for personal projects" | "Szerződések nem szükségesek személyes projektekhez" |
| `teamNotApplicable` | "Team features disabled in Solo Mode" | "Csapat funkciók letiltva Egyéni módban" |

### Fájlok
Minden nyelv: `src/i18n/locales/*.json`

---

## 3. Unit tesztek - `buildDataSourcesStatus`

### Új tesztfájl
`src/test/operationalTruth.test.ts`

### Teszt esetek
1. **Solo mód**: Documents, Contracts, Team → "complete" (N/A)
2. **Team mód**: Ezek valós adatot igényelnek
3. **Health Score Solo**: 13 releváns pontból számol
4. **Health Score Team**: 16 pontból számol
5. **Conflict check**: Solo módban nem figyelmeztet team hiányra

### Kód struktúra
```typescript
import { describe, it, expect } from "vitest";

describe("buildDataSourcesStatus - Solo Mode", () => {
  it("should mark Documents as complete in Solo Mode", () => {
    // ...
  });
  
  it("should calculate health score from 13 sources in Solo Mode", () => {
    // ...
  });
});

describe("buildDataSourcesStatus - Team Mode", () => {
  it("should require real document uploads in Team Mode", () => {
    // ...
  });
});
```

---

## Technikai részletek

### Érintett fájlok

| Fájl | Módosítás |
|------|-----------|
| `src/components/projects2/ProjectCommandCenter.tsx` | Health Score kalkuláció |
| `src/i18n/locales/en.json` | Új Solo kulcsok |
| `src/i18n/locales/hu.json` | Új Solo kulcsok |
| `src/i18n/locales/es.json` | Új Solo kulcsok |
| `src/i18n/locales/fr.json` | Új Solo kulcsok |
| `src/i18n/locales/de.json` | Új Solo kulcsok |
| `src/i18n/locales/zh.json` | Új Solo kulcsok |
| `src/i18n/locales/ar.json` | Új Solo kulcsok |
| `src/i18n/locales/pt.json` | Új Solo kulcsok |
| `src/i18n/locales/ru.json` | Új Solo kulcsok |
| `src/i18n/locales/ja.json` | Új Solo kulcsok |
| `src/i18n/locales/hi.json` | Új Solo kulcsok |
| `src/test/operationalTruth.test.ts` | Új tesztfájl |

### Változtatások sorrendje
1. Health Score logika javítása
2. Lokalizációs kulcsok hozzáadása (11 nyelv)
3. i18n kulcsok beépítése a UI-ba
4. Unit tesztek írása
5. Tesztek futtatása ellenőrzésként

---

## Várható eredmény
- Solo projektek: tiszta 13-pontos Health Score
- Minden nyelven: érthető "Nem szükséges" üzenetek
- Tesztekkel lefedett: verification logika
