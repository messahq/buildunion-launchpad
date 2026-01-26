
# Contract Path Selector - Solo vs Team Project Branching

## Overview
A Quick Mode Contract lépésnél egy új választó felület jelenik meg, ahol a felhasználó eldöntheti:
1. **Simple Contract (Solo)** - Folytatja az eddigi solo módban, egyszerű szerződéssel
2. **Blueprint Team Project (PRO)** - Létrehoz egy Team projektet, betölti az összes eddig kitöltött adatot, és lehetővé teszi a blueprint feltöltést

## User Flow

```text
Quick Mode: Photo → Templates → Calculator → Quote
                                               │
                                               ▼
                        ┌─────────────────────────────────┐
                        │   How would you like to        │
                        │   complete this project?       │
                        ├─────────────────────────────────┤
                        │                                 │
                        │  ┌───────────┐ ┌─────────────┐ │
                        │  │📄 Simple  │ │📐 Blueprint │ │
                        │  │ Contract  │ │Team Project │ │
                        │  │           │ │    [PRO]    │ │
                        │  └───────────┘ └─────────────┘ │
                        │                                 │
                        └─────────────────────────────────┘
                              │               │
                              ▼               ▼
                      Solo Contract     Create Team Project
                      (current flow)    + Pre-fill all data
                                       + Navigate to project
                                       + Team Mode enabled
```

## Technical Implementation

### 1. New Component: ContractPathSelector
**File:** `src/components/quick-mode/ContractPathSelector.tsx`

Egy új komponens, amely:
- Két kártyát jelenít meg: "Simple Contract" és "Blueprint Team Project"
- PRO badge a Blueprint opción
- Tier ellenőrzés (free/pro) és trial kezelés
- "Simple Contract" → Megnyitja a meglévő ContractGenerator-t
- "Blueprint Team Project" → Projekt létrehozás + navigáció

```tsx
interface ContractPathSelectorProps {
  collectedData: CollectedData;
  quoteData: QuoteData;
  onSelectSimple: () => void;
  onSelectBlueprint: () => void;
}
```

### 2. Modify: BuildUnionQuickMode.tsx
**Changes:**
- A "contract" tab új állapotkezelése: `contractMode: 'selector' | 'simple' | 'blueprint'`
- Alapértelmezetten a `selector` jelenik meg
- "Simple Contract" választása → `contractMode = 'simple'` → ContractGenerator
- "Blueprint" választása → Projekt létrehozás flow

### 3. Team Project Auto-Creation Logic
**File:** `src/components/quick-mode/ContractPathSelector.tsx`

Amikor a felhasználó a "Blueprint Team Project"-et választja:

1. **Projekt létrehozása a `projects` táblába:**
   ```typescript
   const { data: project } = await supabase
     .from("projects")
     .insert({
       user_id: user.id,
       name: quoteData.clientName || "Quick Mode Project",
       description: `Generated from Quick Mode. ${scopeOfWork}`,
       address: quoteData.clientAddress,
       status: "draft"
     })
     .select()
     .single();
   ```

2. **Project Summary létrehozása (team mode-ban):**
   ```typescript
   await supabase
     .from("project_summaries")
     .insert({
       project_id: project.id,
       user_id: user.id,
       mode: "team", // <-- Team mode automatikusan
       photo_estimate: collectedData.photoEstimate,
       calculator_results: collectedData.calculatorResults,
       template_items: collectedData.templateItems,
       line_items: quoteData.lineItems,
       total_cost: quoteData.totalAmount,
       client_name: quoteData.clientName,
       client_email: quoteData.clientEmail,
       client_phone: quoteData.clientPhone,
       client_address: quoteData.clientAddress
     });
   ```

3. **Navigáció a projekt oldalra:**
   ```typescript
   navigate(`/buildunion/project/${project.id}?tab=documents`);
   toast.success("Team Project created! Upload your blueprints.");
   ```

### 4. UI Design: ContractPathSelector

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
  {/* Simple Contract Card */}
  <Card 
    className="cursor-pointer hover:border-amber-400 transition-all border-2"
    onClick={onSelectSimple}
  >
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-amber-100 flex items-center justify-center">
        <FileText className="w-8 h-8 text-amber-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Simple Contract</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Generate a professional contract for your solo project
      </p>
      <Badge variant="outline" className="bg-amber-50 text-amber-700">
        Solo Mode
      </Badge>
    </CardContent>
  </Card>

  {/* Blueprint Team Project Card */}
  <Card 
    className={cn(
      "cursor-pointer hover:border-cyan-400 transition-all border-2",
      !canAccessTeam && "opacity-75"
    )}
    onClick={handleBlueprintSelect}
  >
    <CardContent className="p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-cyan-100 flex items-center justify-center">
        <FileUp className="w-8 h-8 text-cyan-600" />
      </div>
      <div className="flex items-center justify-center gap-2 mb-2">
        <h3 className="text-lg font-semibold">Blueprint Team Project</h3>
        <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          PRO
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Create a full team project with blueprint analysis
      </p>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded">
          Team Members
        </span>
        <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded">
          Blueprint AI
        </span>
        <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded">
          Task Tracking
        </span>
      </div>
    </CardContent>
  </Card>
</div>
```

### 5. Data Transfer Summary

| Quick Mode Data | Target Location |
|-----------------|-----------------|
| Photo Estimate | `project_summaries.photo_estimate` |
| Calculator Results | `project_summaries.calculator_results` |
| Template Items | `project_summaries.template_items` |
| Quote Line Items | `project_summaries.line_items` |
| Total Amount | `project_summaries.total_cost` |
| Client Info | `project_summaries.client_*` fields |
| Project Description | `projects.description` |
| Address | `projects.address` |

### 6. Tier Handling

```typescript
const handleBlueprintSelect = async () => {
  if (!user) {
    // Show login modal
    setShowAuthGate(true);
    return;
  }
  
  if (!isPremium && !hasBlueprintTrials) {
    toast.error("Upgrade to Pro for Team Projects");
    navigate("/buildunion/pricing");
    return;
  }
  
  if (!isPremium) {
    await useOneTrial(); // Use one blueprint trial
  }
  
  await createTeamProject();
};
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/quick-mode/ContractPathSelector.tsx` | **CREATE** | New selector component |
| `src/pages/BuildUnionQuickMode.tsx` | **MODIFY** | Add contractMode state and selector integration |
| `src/components/quick-mode/QuickModeProgressBar.tsx` | **MODIFY** | Update to show branching indicator at contract step |

## Benefits

1. **Seamless Upsell**: Natural upgrade point where users have already invested time
2. **Data Preservation**: All Quick Mode work transfers to the new project
3. **Clear UX**: Users understand the two paths and their differences
4. **Tier Integration**: PRO features clearly marked with trial support for free users
5. **Reduced Friction**: No need to re-enter data when upgrading to team mode

## Edge Cases to Handle

1. **User logs out mid-flow**: Draft data saved, can resume after login
2. **No client info**: Use defaults or prompt for project name
3. **Trial exhausted**: Redirect to pricing with context message
4. **Network error during project creation**: Show retry option with data preserved
