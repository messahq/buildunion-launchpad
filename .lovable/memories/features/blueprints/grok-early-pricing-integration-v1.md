# Blueprint: Grok Early Pricing Integration
Updated: 2026-04-14

## Koncepció
A Grok (Market & Schedule) motort a Template Lock pillanatában (Stage 3-4) kell behívni, nem csak Stage 8-ban. Az ötlet: ha a büdzsé már a wizard korai fázisában kiszámolódik, a piaci árak és szállítói alternatívák azonnal beépüljenek a kalkulációba.

## Jelenlegi állapot
- Grok Stage 8-ban működik: Market Pricing, Scheduling, Affiliate Hub
- Template Lock a DefinitionFlowStage-ben (Stage 3-5) történik → `useDefinitionFlow.ts`
- Az árak a `template_items` JSON-ban vannak tárolva a `project_summaries` táblában

## Tervezett változások

### 1. Template Lock → Grok Auto-Trigger
- Amikor a felhasználó lockol egy template-et, automatikusan fut egy Grok lekérdezés
- Az `ai-router` edge function-ön keresztül, `task_type: 'market_pricing'`
- Bemenet: template tételek listája (anyagnév, mennyiség, egységár)
- Kimenet: aktuális piaci árak, olcsóbb alternatívák, szállítói linkek

### 2. UI: Inline Price Badges
- A template tételeknél 💡 badge jelzi, ha Grok talált olcsóbb alternatívát
- Kattintásra részletek: eredeti ár vs. piaci ár, szállító link (affiliate)
- A felhasználó dönt: megtartja az eredetit vagy elfogadja az alternatívát

### 3. Stage 8 Grok szerep-átalakulás
- Stage 8-ban a Grok **monitoring** szerepet kap (árváltozás-figyelés)
- Nem "olcsóbbat keresés", hanem "árak változtak-e a lock óta?"
- Alert badge ha >10% eltérés az eredeti lock-kori ártól

### 4. Érintett fájlok
- `src/hooks/useDefinitionFlow.ts` — Grok trigger a lock után
- `supabase/functions/ai-router/index.ts` — új task_type: 'market_pricing_inline'
- Új komponens: `src/components/project-wizard/definition-flow/PriceSuggestionBadge.tsx`
- `src/components/project-wizard/stage8/GrokInsightsPanel.tsx` — monitoring mód

### 5. Adatmodell
- `project_summaries.template_items` bővítése: `grok_market_price`, `grok_alternative`, `grok_checked_at` mezők
- Nincs új tábla szükséges

## Prioritás
Magas — ez a feature közvetlenül növeli a platform értékét és a felhasználói élményt.
