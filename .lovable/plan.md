

# OBC Redundancia Tisztázás & Javítás

## A Probléma

Három helyen jelenik meg OBC-vel kapcsolatos tartalom, és ezek közül kettő redundáns:

1. **DNA Audit Pillar 9** (Lovable panel) — PASS/FAIL döntés + $8,500 penalty — ez a "verdict"
2. **Claude AI Report** (motor-kártya) — részletes narratív OBC elemzés — ez a "magyarázat"
3. **"OBC Warnings" gomb** (Claude/Grok sidebar) — **jelenleg ugyanazt a DNA panelt nyitja meg** — ez felesleges

## Javaslat

### A. "OBC Warnings" gombot átalakítani Claude OBC összefoglalóvá
A Claude/Grok panelben az "OBC Warnings" gomb ne a DNA Audit-ot nyissa, hanem mutasson egy **rövid OBC összefoglalót** — az `obcComplianceResults` adatokból:
- Hány OBC szekció lett ellenőrizve
- Átlagos relevancia score (%)
- Ha van FAIL/WARNING szekció: piros kiemelés
- "Generate Full Report" gomb → Claude AI report indítása

Ez logikus szétválasztás:
- **Lovable DNA Audit** = PASS/FAIL verdict + penalty (a "bírósági ítélet")
- **Claude OBC panel** = részletes OBC szekciók listája + warnings (a "bizonyítékok")

### B. Fájl módosítás

**Egyetlen fájl**: `src/components/project-wizard/Stage8FinalReview.tsx`

1. **Sorok ~14227-14246**: Az "OBC Warnings" gomb `onClick`-ját átírni — ne `messa-deep-audit`-ot nyisson, hanem egy saját mini-panelt vagy inline tartalmat mutasson az `obcComplianceResults.sections` alapján
2. Hozzáadni egy rövid OBC szekció-listát (szekció neve + relevancia % + PASS/WARN/FAIL status) a Claude/Grok kártyán belül
3. "View Full OBC Report" gomb ami a Claude AI report generátort indítja (`claude-obc`)

### Eredmény
- DNA Audit = döntés + pénz (Lovable territory)
- Claude panel = részletes OBC evidence + warnings (Claude territory)
- Nincs redundancia, mindkettő hasznos

