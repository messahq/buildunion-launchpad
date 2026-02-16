
# Feladó email cím visszaállítása

## Összefoglaló
A `send-invitation-email` Edge Function feladó címe tévesen lett átállítva `onboarding@resend.dev`-re. Visszaállítjuk az eredeti `admin@buildunion.ca` címre, mivel a DNS konfiguráció megfelelően működik (a screenshot is bizonyítja).

## Módosítás
Egyetlen sor változtatás a `supabase/functions/send-invitation-email/index.ts` fájlban:

```text
Jelenlegi:     from: "BuildUnion <onboarding@resend.dev>"
Visszaállítás: from: "BuildUnion <admin@buildunion.ca>"
```

## Technikai részletek
- **Fájl:** `supabase/functions/send-invitation-email/index.ts`
- **Változtatás:** 1 sor (from mező visszaállítása)
- **Deploy:** Edge Function újratelepítése szükséges
- Egyéb fájl nem módosul
