# Memory: features/projects-2/a-3-vastorveny-rendszer

**Status: ✅ FINALIZED & LOCKED (2026-02-08)**

A projekt adatintegritását három "Vastörvény" (Iron Laws) szabályozza. Ezek a szabályok IMMUTABLE-ek és "Protected Zone"-ként kezelendők - bármilyen jövőbeni UI fejlesztés vagy új kategória hozzáadása során érinthetetlennek kell maradniuk.

## 🔒 IRON LAW #1 - Dinamikus Számítás (No Hardcoding)
Az anyagtételek mennyisége a **Quantity Resolver** által kerül kiszámításra az inicializáláskor:
- **baseQuantity** = NET terület (pl. 1350 sq ft)
- **quantity** = GROSS egységek a resolver-ből (pl. 68 doboz = 1485 sq ft ÷ 22 coverage)

**KRITIKUS**: A render logika NEM számolhat újra a quantity-ből! A `quantity` mezőben már a VÉGSŐ érték van, amit a resolver kiszámolt a waste%-kal együtt.

**Teszt:** Ha a 1350 sq ft területű projektben 1486 doboz jelenik meg 68 helyett, a render logika hibásan újraszámolja a quantity-t.

## 🔒 IRON LAW #2 - Állapot-mentés (State Persistence)
A felhasználó által megadott veszteség-százalék (Waste %) elmentődik az adatbázisba (`ai_workflow_config.userEdits.wastePercent`), és betöltéskor felülírja a 10%-os alapértéket.

**Teszt:** Projekt újratöltéskor a mentett Waste% értéknek meg kell maradnia.

## 🔒 IRON LAW #3 - Kettős Elszámolás (Dual Logic)
- **Materials** → GROSS egységek a resolver-ből (doboz, tekercs, gallon)
- **Labor** → NET terület sq ft-ben (csak az alapterület)

A terület-alapú szakmáknál (pl. festés, padlózás) a Labor egysége kötelezően 'sq ft' marad és a nettó területet használja.

**Teszt:** A Labor "Installation" sorok mindig sq ft-ben és NET területtel kell megjelenjenek.

## 📍 Protected Files
- `src/components/projects2/MaterialCalculationTab.tsx` - Fő kalkulációs modul
- `src/contexts/ProjectContext.tsx` - SSOT és centralMaterials kezelés
- `src/lib/quantityResolver.ts` - Quantity Resolver fizika-alapú motor

## 🔍 Render Logic Rules (2026-02-08)
A UI rendereléskor:
- `displayGross = item.quantity` (NE számolj újra!)
- `displayNet = item.baseQuantity` (eredeti terület)
- A waste badge (`+10%`) csak VIZUÁLIS jelzés, nem trigger újraszámolásra

## 🆕 INFERRED BASE AREA (2026-02-08)
Ha a `baseArea` prop nincs megadva (új projektek AI analízis nélkül), a rendszer automatikusan kikövetkezteti a legnagyobb sq ft mennyiségből. Ez garantálja, hogy a Quantity Resolver MINDEN projektnél fut.

---
*Last verified: 2026-02-08 - Inferred baseArea logic added for universal resolver application*
