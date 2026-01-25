

# Terv: Projekt Mód Vizuális Jelzés Javítása

## Probléma

A jelenlegi toggle komponens csak finom szín különbségeket használ (amber vs cyan), ami nem elég egyértelmű a felhasználó számára, hogy tudja melyik módban van éppen.

## Megoldás

Vizuális javítások hozzáadása, hogy egyértelműen látható legyen az aktuális mód.

---

## Változtatások

### 1. Aktív mód kiemelése háttérszínnel

A jelenleg aktív mód szövegét és ikonját egy színes háttérrel emeljük ki.

```
ELŐTTE:
  Solo [switch] Team

UTÁNA:
  [Solo aktív badge - amber háttér] [switch] Team (szürke)
  
  VAGY
  
  Solo (szürke) [switch] [Team aktív badge - cyan háttér]
```

### 2. Részletes kód változtatás

**Fájl:** `src/components/ProjectModeToggle.tsx` (182-216. sorok)

Az aktív mód kapjon egy kitöltött badge-et a szöveg köré:

| Mód | Ikon szín | Szöveg szín | Háttér |
|-----|-----------|-------------|--------|
| Solo (aktív) | amber-600 | amber-700 | amber-100 border + rounded |
| Solo (inaktív) | muted | muted | nincs |
| Team (aktív) | cyan-600 | cyan-700 | cyan-100 border + rounded |
| Team (inaktív) | muted | muted | nincs |

### 3. Kód példa

```tsx
// Solo oldal
<div className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${
  !isTeamMode 
    ? "bg-amber-100 border border-amber-300" 
    : ""
}`}>
  <User className={`h-4 w-4 ${!isTeamMode ? "text-amber-600" : "text-muted-foreground"}`} />
  <span className={`text-sm font-medium ${!isTeamMode ? "text-amber-700" : "text-muted-foreground"}`}>
    Solo
  </span>
</div>

// Team oldal
<div className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${
  isTeamMode 
    ? "bg-cyan-100 border border-cyan-300" 
    : ""
}`}>
  <Users className={`h-4 w-4 ${isTeamMode ? "text-cyan-600" : "text-muted-foreground"}`} />
  <span className={`text-sm font-medium ${isTeamMode ? "text-cyan-700" : "text-muted-foreground"}`}>
    Team
  </span>
</div>
```

---

## Vizuális Eredmény

```
Solo módban:
┌─────────────┐
│ 👤 Solo     │ ○───  👥 Team  PRO
└─────────────┘
  amber háttér

Team módban:
                      ┌─────────────┐
  👤 Solo      ───○   │ 👥 Team     │
                      └─────────────┘
                        cyan háttér
```

## Előnyök

- Egy pillantás alatt látható melyik mód aktív
- A színes háttér erősebb vizuális jel mint csak a szövegszín
- Konzisztens a meglévő design nyelvvel (amber = solo, cyan = team)

