## Cél
Sándor, ideiglenesen kivesszük a bejelentkezés / regisztráció / elfelejtett jelszó belépési pontokat, hogy senki se tudjon véletlenül regisztrálni vagy próbálkozni. Az auth backend (Supabase) érintetlen marad — csak a frontend ajtókat zárjuk be. Bármikor egy paranccsal visszakapcsolható.

## Mit változtatok

1. **Header (`src/components/BuildUnionHeader.tsx`)**
   - Elrejtem a "Login" és "Register" gombokat (desktop menü + mobil menü, mindkét helyen).

2. **Hero űrlap (`src/components/HeroSignupForm.tsx`)**
   - A hero signup formot lecserélem egy rövid "Coming soon — regisztráció ideiglenesen szünetel" kártyára (ugyanaz a hely, ugyanaz a stílus).
   - Így a "Sign in" / "Forgot password" linkek is eltűnnek innen.

3. **Route-ok (`src/App.tsx`)**
   - `/buildunion/login`, `/buildunion/register`, `/buildunion/forgot-password` route-okat átirányítom a főoldalra (`<Navigate to="/" replace />`), hogy még kézzel beírt URL-lel se lehessen bejutni.
   - `/dock/login` és `/dock/register` szintén (a dock felület úgyis amortizált).
   - A `/buildunion/reset-password` és `/buildunion/confirm-email` route-okat **meghagyom**, mert már regisztrált userek jelszó-visszaállításához / email megerősítéshez kellhetnek — de mivel új regisztráció nem lesz, ezek gyakorlatilag inaktívak.

4. **Nem nyúlok hozzá**
   - `useAuth` hook, Supabase auth beállítások, meglévő user session — mind marad, hogy a már bent lévő userek (ha vannak) továbbra is működjenek.
   - A Login.tsx / Register.tsx / ForgotPassword.tsx fájlokat sem törlöm — csak nem lesznek elérhetők. Így egy sorban vissza tudom kapcsolni, ha szólsz.

## Eredmény
- Homepage-en nincs "Register" / "Login" gomb, nincs signup form.
- Ha valaki beírja kézzel a `/buildunion/login`-t, azonnal visszadobja a főoldalra.
- Backend és adatok érintetlenek.

Mehet így?
