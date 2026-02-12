

# Notification Center + Megosztott tartalom védelem

## 1. Notification Center (Bell ikon a header-ben)

Egy harang ikon a header-ben, ami kinyit egy dropdown panelt az osszes ertesitessel.

### Mit csinal:
- Bell ikon badge-dzsel a header-ben (olvasatlan szam)
- Dropdown panel ami mutatja az ertesiteseket: meghivasok, uzenetek, task frissitesek, szerzodes esemenyek
- Olvasott/olvasatlan jeloles (kattintasra olvasottra valt)
- "Mark all as read" gomb
- Ures allapot szep uzenettel

### Adatbazis valtozasok:
- A `notification_logs` tabla mar letezik es hasznalva van
- Uj oszlop: `read_at` (timestamp, nullable) - olvasott jeloles
- Uj oszlop: `link` (text, nullable) - kattintasra navigalas (pl. `/buildunion/messages`)
- Uj RLS policy: UPDATE engedelyezes a sajat notification-okre (read_at frissites)

### Uj komponensek:
- `src/components/NotificationCenter.tsx` - Bell ikon + Popover panel
- `src/hooks/useNotifications.tsx` - notification_logs lekerdezese, olvasatlan szamlalo, mark as read

### Header integralas:
- A `BuildUnionHeader.tsx`-ben a Messages gomb melle kerul a Bell ikon (csak bejelentkezett felhasznaloknak)
- A `MobileBottomNav.tsx`-ben nem kell valtozas (nem fer oda)

---

## 2. Megosztott tartalom vedelme (Contract)

A `view-contract` edge function jelenleg token alapon, bejelentkezes nelkul is elerheto. A user kerese: legyen bejelentkezes kotelezo.

### Valtozas:
- A `ContractSignature.tsx` oldalon: ha nincs bejelentkezett user, atiranyitas a login oldalra (redirect URL-lel vissza)
- A `view-contract` edge function-ben: opcionalis JWT ellenorzes hozzaadasa (ha van auth header, validalja; ha nincs, 401-et ad)

---

## Technikai reszletek

### Adatbazis migracio:
```sql
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS link text;

-- Allow users to mark their own notifications as read
CREATE POLICY "Users can mark own notifications read"
ON notification_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop the old immutable update policy
DROP POLICY IF EXISTS "Notification logs are immutable - no updates" ON notification_logs;
```

### NotificationCenter komponens:
- Popover (nem Sheet) a desktop-on, hogy gyors legyen
- Max 20 legutolso ertesitest mutat
- Realtime subscription a `notification_logs` tablara uj ertesitesekhez
- Ido formatum: "2 perccel ezelott", "tegnap" stb. (date-fns `formatDistanceToNow`)

### Contract vedelem:
- `ContractSignature.tsx`: `useAuth()` check + redirect ha nincs user
- `view-contract/index.ts`: Authorization header ellenorzes

