
# Megoldási Terv: Session Stabilitás Javítása

## Probléma Összefoglalás

A felhasználó azért nem marad bejelentkezve, mert a kód túl gyakran próbálja manuálisan frissíteni a session tokent, ami Supabase rate limitet (429-es hibát) okoz. Amikor ezt a limitet elérjük, a session érvénytelenné válik és a rendszer kijelentkezteti a felhasználót.

## Mi a baj?

- A Supabase kliens **már automatikusan frissíti a tokent** (`autoRefreshToken: true` beállítás)
- De a kód 3 helyen is **manuálisan** hívja a `refreshSession()`-t minden API hívás előtt
- Ez túl sok kérést generál → 429 rate limit → session elvesztése → kijelentkezés

## Megoldás

Eltávolítjuk a felesleges manuális `refreshSession()` hívásokat, és helyettük a Supabase kliens automatikus token kezelésére bízzuk a frissítést. Ahol szükséges, egyszerűen lekérjük az aktuális session-t token frissítés nélkül.

---

## 1. lépés: useSubscription.tsx módosítás

**Mit csinálunk:**
- Eltávolítjuk a manuális `refreshSession()` hívást
- Helyette egyszerűen az aktuális session tokent használjuk
- Ha a token lejárt, a Supabase kliens automatikusan frissíti

```text
Módosítandó rész (~154-163. sor):
ELŐTTE:
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  const tokenToUse = refreshData?.session?.access_token || session.access_token;

UTÁNA:
  // Use current session - Supabase client handles token refresh automatically
  const tokenToUse = session.access_token;
```

---

## 2. lépés: TeamMapView.tsx módosítás

**Mit csinálunk:**
- Eltávolítjuk a manuális `refreshSession()` hívást
- Az aktuális session-t használjuk (ami az AuthProvider-ből jön)

```text
Módosítandó rész (~470-482. sor):
ELŐTTE:
  const { data: refreshData } = await supabase.auth.refreshSession();
  const tokenToUse = refreshData?.session?.access_token;

UTÁNA:
  const { data: { session } } = await supabase.auth.getSession();
  const tokenToUse = session?.access_token;
```

---

## 3. lépés: useProjectConflicts.tsx módosítás

**Mit csinálunk:**
- Ugyanaz mint fent - `refreshSession()` helyett `getSession()`

```text
Módosítandó rész (~21-28. sor):
ELŐTTE:
  const { data: refreshData } = await supabase.auth.refreshSession();
  const tokenToUse = refreshData?.session?.access_token;

UTÁNA:
  const { data: { session } } = await supabase.auth.getSession();
  const tokenToUse = session?.access_token;
```

---

## 4. lépés: Subscription ellenőrzés ritkítása

**Mit csinálunk:**
- Az auto-refresh intervallumot 60 másodpercről 5 percre növeljük
- Ez tovább csökkenti a Stripe API terhelést is

```text
Módosítandó rész (~267. sor):
ELŐTTE:
  }, 60000);  // 1 perc

UTÁNA:
  }, 300000); // 5 perc
```

---

## Technikai Részletek

| Fájl | Változtatás |
|------|-------------|
| `src/hooks/useSubscription.tsx` | `refreshSession()` eltávolítása, intervallum növelése |
| `src/components/TeamMapView.tsx` | `refreshSession()` → `getSession()` |
| `src/hooks/useProjectConflicts.tsx` | `refreshSession()` → `getSession()` |

## Miért működik ez?

1. **A Supabase kliens automatikusan kezeli a token frissítést** - Az `autoRefreshToken: true` beállítás biztosítja, hogy a token lejárata előtt automatikusan megújuljon
2. **A `getSession()` nem okoz rate limitet** - Ez csak lekéri az aktuális session-t a localStorage-ból, nem küld hálózati kérést
3. **Kevesebb API hívás = stabilabb működés** - A Stripe API sem kapja el a rate limitet

## Várt Eredmény

- A felhasználó bejelentkezve marad
- Nem lesz többé 429-es rate limit hiba
- A session stabilan megmarad böngésző frissítés után is
