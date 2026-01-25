
# Plan: "Skip to Blueprints" áthelyezése a New Project Modalba

## Összefoglaló
A "Skip to Blueprints" gomb áthelyezése a Quick Mode oldalról a "Start New Project" modalba, hogy a felhasználó már a projekt indításakor választhassa ki, hogy gyors módot (Quick Mode) vagy azonnal blueprint elemzést (M.E.S.S.A.) szeretne.

## Változtatások

### 1. NewProjectModal.tsx módosítása
Új kártyát adunk a Quick Mode mellé "Blueprint Analysis" opcióval:

**Új kártya elemei:**
- Ikon: Ciánkék/kék gradiens háttér, `FileUp` vagy `Sparkles` ikon
- Címke: "Blueprint Analysis" + "PRO" badge
- Leírás: "Upload blueprints for M.E.S.S.A. AI deep analysis"
- Tier jelzés:
  - Ha guest: Lock ikon + "Sign in required"
  - Ha Free user: Trial counter badge (pl. "2/3 trials")
  - Ha Pro user: Crown ikon + "Unlimited"

**Új importok szükségesek:**
- `FileUp`, `Lock`, `Sparkles` a lucide-react-ből
- `useDbTrialUsage` hívás `blueprint_analysis` feature-re
- `AuthGateModal` kezelés guest-eknek

**Navigációs logika:**
- Guest → AuthGateModal megnyitása
- Free user trial-lal → `/buildunion/workspace/new` navigáció + trial fogyasztás
- Free user trial nélkül → `/buildunion/pricing` átirányítás
- Pro user → `/buildunion/workspace/new` navigáció

### 2. BuildUnionQuickMode.tsx módosítása
A "Skip to Blueprints" gomb eltávolítása a fejlécből, mivel már a modalból elérhető.

**Eltávolítandó elemek (288-319. sorok körül):**
- A teljes Tooltip+Button blokk ami a "Skip to Blueprints"-et tartalmazza
- A kapcsolódó handler logika (`handleSkipToBlueprints`, `navigateToBlueprints`) megtartható, de nem lesz UI elem hozzá

### 3. Modal layout frissítés
A modal szélesebb lesz (`sm:max-w-lg`) és a két kártya egymás alatt jelenik meg egyértelmű választási lehetőséggel.

---

## Technikai részletek

### NewProjectModal.tsx változások:

```typescript
// Új importok
import { Zap, Camera, Calculator, FileText, Crown, FileUp, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Új hook a blueprint trial-okhoz
const { 
  remainingTrials: blueprintTrials, 
  maxTrials: blueprintMaxTrials,
  hasTrialsRemaining: hasBlueprintTrials,
  useOneTrial: useBlueprintTrial,
  isPremiumUser: isPremium 
} = useDbTrialUsage("blueprint_analysis");

// Új handler
const handleBlueprintMode = async () => {
  if (!user) {
    // Guest - show auth gate or redirect to login
    onOpenChange(false);
    navigate("/buildunion/login?redirect=/buildunion/workspace/new");
    return;
  }
  
  if (!isPremium && !hasBlueprintTrials) {
    toast.error("You've used all free trials. Upgrade to Pro for unlimited access.");
    onOpenChange(false);
    navigate("/buildunion/pricing");
    return;
  }
  
  if (!isPremium) {
    await useBlueprintTrial();
    toast.success(`Blueprint trial used. ${blueprintTrials - 1} remaining.`);
  }
  
  onOpenChange(false);
  navigate("/buildunion/workspace/new");
};
```

### Új kártya UI:

```jsx
{/* Blueprint Analysis Option - PRO */}
<Card 
  className="cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all group border-2 mt-4"
  onClick={handleBlueprintMode}
>
  <CardContent className="p-5">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
        <FileUp className="w-7 h-7 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground text-lg">Blueprint Analysis</h3>
          <Badge className="text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
            PRO
          </Badge>
          {/* Tier indicator */}
          {!user ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : isPremium ? (
            <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
              <Crown className="w-3 h-3" />
              Unlimited
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {blueprintTrials}/{blueprintMaxTrials} trials
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Upload blueprints for M.E.S.S.A. AI deep analysis and automated material takeoff.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            AI Analysis
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-cyan-500" />
            Material Takeoff
          </span>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### Trial info banner frissítés:

A banner mindkét trial típust mutatja (Quick Estimate + Blueprint Analysis) ha a user nem premium:

```jsx
{user && !isPremium && (
  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <p className="text-sm font-medium text-amber-800 mb-1">Your Free Trials:</p>
    <div className="flex items-center justify-center gap-2">
      <div className="text-center p-2 bg-white rounded border flex-1">
        <div className="font-bold text-amber-600">{estimateTrials}/{estimateMaxTrials}</div>
        <div className="text-xs text-muted-foreground">AI Estimates</div>
      </div>
      <div className="text-center p-2 bg-white rounded border flex-1">
        <div className="font-bold text-cyan-600">{blueprintTrials}/{blueprintMaxTrials}</div>
        <div className="text-xs text-muted-foreground">Blueprints</div>
      </div>
    </div>
  </div>
)}
```

---

## Visual Flow

```text
┌─────────────────────────────────────────────┐
│          Start New Project                  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 🟡 Your Free Trials:                  │  │
│  │  [3/3 AI Estimates] [2/3 Blueprints]  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ ⚡ Quick Mode            [Fast]       │  │
│  │    Photo estimates, templates...      │  │
│  │    📷 Photo  📊 Calc  📄 Quote       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 📤 Blueprint Analysis   [PRO] [2/3]   │  │
│  │    M.E.S.S.A. AI deep analysis        │  │
│  │    ✨ AI  📄 Takeoff                  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  "Upgrade to Pro for unlimited access"      │
└─────────────────────────────────────────────┘
```

---

## Érintett fájlok

| Fájl | Művelet |
|------|---------|
| `src/components/NewProjectModal.tsx` | Módosítás - Blueprint kártya hozzáadása |
| `src/pages/BuildUnionQuickMode.tsx` | Módosítás - Skip to Blueprints gomb eltávolítása |
