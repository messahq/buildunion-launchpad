

# Admin Dashboard Hozzáférés - Javítási Terv

## Probléma Azonosítása

Az SQL parancs **nem futott le** - a `user_roles` tábla üres. Ezért az `isAdmin` hook `false` értéket ad vissza, és az Admin Dashboard link nem jelenik meg a dropdown menüben.

## Megoldás

Automatikusan hozzáadom az admin jogosultságot a fiókodhoz egy adatbázis művelettel.

---

## Végrehajtandó Lépések

### 1. Admin szerepkör hozzáadása

```text
Tábla: user_roles
```

Beszúrandó rekord:
- **user_id**: `c1638795-efab-4a23-a8c8-612acdcf7822` (a te felhasználói azonosítód)
- **role**: `admin`

### 2. Változás hatása

Az admin jogosultság hozzáadása után:
- Az `useAdminRole` hook `true` értéket fog visszaadni
- Az **Admin Dashboard** link megjelenik a profil dropdown menüben
- Hozzáférsz a `/admin` oldalhoz, ahol kezelheted a felhasználókat és statisztikákat láthatsz

---

## Technikai Részletek

A rendszer így működik:

```text
1. Bejelentkezés → useAuth hook megkapja a user.id-t
2. useAdminRole hook meghívja az is_admin RPC funkciót
3. Az is_admin funkció ellenőrzi a user_roles táblát
4. Ha role = 'admin', akkor isAdmin = true
5. A BuildUnionHeader megjeleníti az Admin Dashboard linket
```

Jelenleg a 3. lépésnél nincs találat, mert a `user_roles` tábla üres.

---

## Várt Eredmény

A javítás után a profil dropdown menüben megjelenik egy piros **"Admin Dashboard"** link egy pajzs ikonnal.

