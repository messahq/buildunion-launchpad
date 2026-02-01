# Memory: features/projects-2/a-3-vastorveny-rendszer

**Status: ✅ FINALIZED & LOCKED (2026-02-01)**

A projekt adatintegritását három "Vastörvény" (Iron Laws) szabályozza. Ezek a szabályok IMMUTABLE-ek és "Protected Zone"-ként kezelendők - bármilyen jövőbeni UI fejlesztés vagy új kategória hozzáadása során érinthetetlennek kell maradniuk.

## 🔒 IRON LAW #1 - Dinamikus Számítás (No Hardcoding)
Az anyagtételek mennyisége (QTY) soha nem statikus, hanem a `baseArea * (1 + wastePercent/100)` képletet követi valós időben. Új projekt elemzésekor az AI által detektált terület (detectedArea) az alap, amire azonnal rákerül a waste.

**Teszt:** Ha a Waste% változik, a Materials QTY-nak automatikusan ugrani KELL.

## 🔒 IRON LAW #2 - Állapot-mentés (State Persistence)
A felhasználó által megadott veszteség-százalék (Waste %) elmentődik az adatbázisba (`ai_workflow_config.userEdits.wastePercent`), és betöltéskor felülírja a 10%-os alapértéket.

**Teszt:** Projekt újratöltéskor a mentett Waste% értéknek meg kell maradnia.

## 🔒 IRON LAW #3 - Kettős Elszámolás (Dual Logic)
- **Materials** → GROSS (bruttó) mennyiség: `baseArea × (1 + waste/100)`
- **Labor** → NET (nettó) mennyiség: `baseArea` (csak az alapterület, sq ft egységben)

A terület-alapú szakmáknál (pl. festés, padlózás) a Labor egysége kötelezően 'sq ft' marad és a nettó területet használja, függetlenül attól, hogy az anyag más egységet (pl. gallon) vagy waste-et használ-e.

**Teszt:** A Labor "Installation" sorok mindig sq ft-ben és NET területtel kell megjelenjenek.

## 📍 Protected Files
- `src/components/projects2/MaterialCalculationTab.tsx` - Fő kalkulációs modul
- `src/contexts/ProjectContext.tsx` - SSOT és centralMaterials kezelés
- `src/pages/BuildUnionWorkspace.tsx` - Mentési és betöltési logika

## 🔍 Debug Logok
Az `[IRON LAW #1]`, `[IRON LAW #2]`, `[IRON LAW #3]` konzol logok aktívak maradnak a debug módban, hogy látható legyen, ha valami megpróbálja felülírni a szabályokat.

---
*Last verified: 2026-02-01 - User confirmed all 3 laws passed testing.*
