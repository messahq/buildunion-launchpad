# BuildUnion Calculation Engine - Master Reference

**Status: ✅ FINALIZED (2026-02-01)**
**Version: 1.0**

Ez a dokumentum a BuildUnion költségkalkulációs motor technikai összefoglalója. A jövőbeni fejlesztések során ez szolgál referenciaként.

---

## 1. Iron Laws Implementation (3 Vastörvény)

### Iron Law #1 - Dynamic Calculation (Dinamikus Számítás)
**Fájl:** `src/components/projects2/MaterialCalculationTab.tsx`

Az anyagmennyiségek soha nem statikus értékek. A képlet:
```typescript
materialQuantity = baseArea × (1 + wastePercent / 100)
```

**Implementáció helye:**
```typescript
// Line ~180-220 in MaterialCalculationTab.tsx
useEffect(() => {
  if (baseArea > 0 && wastePercent !== prevWasteRef.current) {
    console.log(`[IRON LAW #1] Waste changed: ${prevWasteRef.current}% → ${wastePercent}%`);
    
    setMaterialItems(prev => prev.map(item => {
      if (item.isEssential && isAreaBasedUnit(item.unit)) {
        const newQty = Math.ceil(baseArea * (1 + wastePercent / 100));
        return { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice };
      }
      return item;
    }));
  }
}, [wastePercent, baseArea]);
```

### Iron Law #2 - State Persistence (Állapot-mentés)
**Mentés:** `src/pages/BuildUnionWorkspace.tsx`
**Betöltés:** `src/components/projects2/ProjectDetailsView.tsx`

A `wastePercent` érték az adatbázisban tárolódik:
```typescript
// Mentés (BuildUnionWorkspace.tsx ~Line 450)
ai_workflow_config: {
  ...existingConfig,
  userEdits: {
    ...existingConfig?.userEdits,
    wastePercent: currentProject.wastePercent || 10,
    baseArea: currentProject.baseArea,
    lastModified: new Date().toISOString()
  }
}

// Betöltés (ProjectDetailsView.tsx ~Line 180)
const savedWaste = summary.ai_workflow_config?.userEdits?.wastePercent;
if (savedWaste && savedWaste !== 10) {
  console.log(`[IRON LAW #2] Restoring saved waste: ${savedWaste}%`);
  updateProject({ wastePercent: savedWaste });
}
```

### Iron Law #3 - Dual Logic (Kettős Elszámolás)
**Fájl:** `src/components/projects2/MaterialCalculationTab.tsx`

| Típus | Mennyiség | Egység | Waste |
|-------|-----------|--------|-------|
| **Materials** | GROSS (bruttó) | Eredeti (pl. gallons) | ✅ Alkalmazva |
| **Labor** | NET (nettó) | Mindig `sq ft` | ❌ Nincs |

**Labor kényszerítés implementációja:**
```typescript
// Line ~250-280 in MaterialCalculationTab.tsx
const isInstallationLabor = /installation|install/i.test(item.item);
const isAreaBasedWork = /paint|flooring|tile|hardwood|laminate|carpet|drywall|primer/i.test(item.item);

if (isInstallationLabor && isAreaBasedWork && baseArea > 0) {
  console.log(`[IRON LAW #3] Forcing labor to NET: ${item.item} → ${baseArea} sq ft`);
  return {
    ...item,
    quantity: baseArea,  // NET area, waste nélkül
    unit: "sq ft",       // Mindig sq ft
    totalPrice: baseArea * item.unitPrice,
  };
}
```

---

## 2. Live Sync Logic (Élő Szinkronizáció)

### Adatfolyam Diagram
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Power Modal    │────▶│ ProjectContext   │────▶│ MaterialCalcTab │
│  (User Input)   │     │ (SSOT - Central) │     │ (UI Render)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   updateProject()      centralMaterials         useEffect triggers
                        centralFinancials        recalculation
```

### Kulcsfüggvények

#### 1. `updateProject()` - ProjectContext.tsx
```typescript
// Central state updater - minden módosítás ezen keresztül megy
const updateProject = useCallback((updates: Partial<ProjectData>) => {
  setCurrentProject(prev => {
    const newProject = { ...prev, ...updates };
    
    // Iron Law #1: Ha baseArea vagy wastePercent változik, újraszámol
    if (updates.baseArea || updates.wastePercent) {
      console.log('[SSOT] Triggering material recalculation');
    }
    
    return newProject;
  });
}, []);
```

#### 2. `handleSaveToModal()` - PowerEditModal.tsx
```typescript
// Atomi mentés - egyszerre frissíti a területet, waste-et és anyagokat
const handleSaveToModal = async () => {
  // 1. Update local state
  updateProject({
    baseArea: editedArea,
    wastePercent: editedWaste,
  });
  
  // 2. Trigger DB save via parent
  onSave({ area: editedArea, waste: editedWaste });
};
```

#### 3. `recalculateFromAreaChange()` - MaterialCalculationTab.tsx
```typescript
// Automatikus újraszámolás terület változáskor
useEffect(() => {
  if (baseArea !== prevBaseAreaRef.current && baseArea > 0) {
    const ratio = baseArea / prevBaseAreaRef.current;
    
    setMaterialItems(prev => prev.map(item => {
      if (item.isEssential) {
        const newQty = Math.ceil(item.quantity * ratio);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }
}, [baseArea]);
```

---

## 3. Conflict Detection (Eltérés-érzékelés)

### Működési Elv
A rendszer összehasonlítja az AI által detektált értékeket a felhasználói módosításokkal.

**Fájl:** `src/hooks/useSingleProjectConflicts.tsx`

### Conflict Típusok
```typescript
type ConflictType = 
  | 'area_mismatch'      // AI terület ≠ manuális terület
  | 'material_override'  // Anyagmennyiség módosítva
  | 'price_adjustment'   // Egységár módosítva
  | 'waste_override';    // Waste% módosítva az AI default-ról
```

### Érzékelési Logika
```typescript
// useSingleProjectConflicts.tsx
const detectConflicts = useCallback(() => {
  const conflicts: Conflict[] = [];
  
  // Terület eltérés
  const aiArea = summary?.ai_workflow_config?.detectedArea;
  const currentArea = currentProject.baseArea;
  
  if (aiArea && currentArea && Math.abs(aiArea - currentArea) > 10) {
    conflicts.push({
      type: 'area_mismatch',
      original: aiArea,
      current: currentArea,
      message: `AI detected ${aiArea} sq ft, manually set to ${currentArea} sq ft`
    });
  }
  
  // Waste eltérés (default: 10%)
  if (currentProject.wastePercent !== 10) {
    conflicts.push({
      type: 'waste_override',
      original: 10,
      current: currentProject.wastePercent,
      message: `Waste adjusted from 10% to ${currentProject.wastePercent}%`
    });
  }
  
  return conflicts;
}, [summary, currentProject]);
```

### UI Megjelenítés
**Fájl:** `src/components/projects2/ConflictStatusIndicator.tsx`

```typescript
// Sárga háromszög ikon, ha van conflict
{conflicts.length > 0 && (
  <Badge variant="warning" className="flex items-center gap-1">
    <AlertTriangle className="h-3 w-3" />
    {conflicts.length} manual override{conflicts.length > 1 ? 's' : ''}
  </Badge>
)}
```

---

## 4. Protected Files (Zárolt Fájlok)

### 🔒 KRITIKUS - Ne módosítsd indoklás nélkül!

| Fájl | Felelősség | Kockázat |
|------|------------|----------|
| `src/components/projects2/MaterialCalculationTab.tsx` | Iron Law #1, #3 implementáció | Számítási hibák |
| `src/contexts/ProjectContext.tsx` | SSOT, centralMaterials/Financials | Adatvesztés |
| `src/pages/BuildUnionWorkspace.tsx` | DB mentés, Iron Law #2 | Persistence hiba |
| `src/components/projects2/ProjectDetailsView.tsx` | Betöltés, Iron Law #2 restore | State inkonzisztencia |
| `src/components/projects2/PowerEditModal.tsx` | Atomi módosítások | Szinkron törés |

### ⚠️ FIGYELMEZTETÉS - Módosítás előtt ellenőrizd:

```typescript
// MaterialCalculationTab.tsx header
/**
 * ⚠️ PROTECTED ZONE - DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 * 
 * This module implements the 3 IRON LAWS (3 VASTÖRVÉNY):
 * - IRON LAW #1: Dynamic Calculation (Materials QTY = baseArea × (1 + waste/100))
 * - IRON LAW #2: State Persistence (Saved to ai_workflow_config.userEdits)
 * - IRON LAW #3: Dual Logic (Materials = GROSS, Labor = NET in sq ft)
 * 
 * Any changes to calculation logic require verification against all 3 laws.
 * Debug logs: [IRON LAW #1], [IRON LAW #2], [IRON LAW #3]
 */
```

---

## 5. Debug Monitoring

### Console Log Patterns
```
[IRON LAW #1] Waste changed: 10% → 15%
[IRON LAW #2] Restoring saved waste: 15%
[IRON LAW #3] Forcing labor to NET: Interior Paint Installation → 2000 sq ft
[SSOT] centralMaterials updated from MaterialCalculationTab
[CONFLICT] Area mismatch detected: AI=1302, Manual=1350
```

### Ellenőrzési Checklist
- [ ] Waste% módosítás → Materials QTY változik
- [ ] Projekt újratöltés → Mentett Waste% visszaáll
- [ ] Labor sorok → Mindig sq ft és NET terület
- [ ] Power Modal mentés → Dashboard azonnal frissül

---

## 6. Kapcsolódó Dokumentumok

- `.lovable/memories/features/projects-2/a-3-vastorveny-rendszer.md` - Iron Laws részletes leírása
- `.lovable/memories/features/projects-2/power-edit-modal-v2.md` - Power Modal atomi működése
- `.lovable/memories/technical/architecture/project-context-ssot-v3.md` - SSOT architektúra

---

*Last updated: 2026-02-01*
*Maintainer: BuildUnion Development Team*
