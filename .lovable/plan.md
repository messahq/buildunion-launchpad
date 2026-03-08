

# GFA Mid-Project Modification: Communication Guard

## Problem Summary

The GFA (Gross Floor Area) value is the **foundation** of the entire budget calculation chain:

```text
GFA_LOCK --> TEMPLATE_LOCK (materials with quantities) --> project_tasks --> Financial Summary --> Invoice
```

When someone tries to change GFA mid-project, the system only spent AI credits (for the chat interaction) but never actually propagated the new value through this chain. The `GFALockStage` component only **appends** a new citation -- it does not replace the existing one, nor does it trigger a recalculation of the `TEMPLATE_LOCK` materials, tasks, or financials.

## Recommended Approach: Lock with Clear Communication

Fixing GFA modification mid-project would require rebuilding the entire downstream chain (recalculating every material quantity, updating all tasks, regenerating the template, resynchronizing financials). This is extremely risky for active projects with approved budgets, team assignments, and contracts.

**The safe and correct approach**: Make it clear that GFA is immutable once locked, and guide users to start a new project if the area changes significantly.

## Implementation Plan

### 1. GFALockStage -- Prevent Re-entry
In `src/components/project-wizard/GFALockStage.tsx`:
- When `existingGFA` is present and `isLocked` is true, hide the input form entirely (already done visually)
- Add a clear message: *"GFA cannot be modified after locking. If your project area has changed significantly, please create a new project."*
- Remove any "Unlock" or "Edit" affordance if one exists

### 2. WizardChatInterface -- Block GFA Change Requests  
In `src/components/project-wizard/WizardChatInterface.tsx`:
- After the GFA_LOCK citation exists, if the AI response tries to create a second `GFA_LOCK` citation, intercept and block it
- Show a toast: *"GFA is locked and cannot be changed. Start a new project if the area has changed."*

### 3. Stage8FinalReview -- GFA Edit Guard
In `src/components/project-wizard/Stage8FinalReview.tsx`:
- In the edit flow (where Owner Lock enables field editing), exclude `GFA_LOCK` from editable citations
- If a user attempts to click edit on the GFA row, show a warning dialog explaining why it is immutable

### 4. Duplicate GFA_LOCK Prevention (DB Level)
In `src/components/project-wizard/GFALockStage.tsx` `handleLockGFA`:
- Before appending, check if a `GFA_LOCK` citation already exists in `verified_facts`
- If it does, block the save and show a toast instead of silently appending a duplicate

## Technical Details

### Files to modify:
1. **`src/components/project-wizard/GFALockStage.tsx`** -- Add duplicate prevention guard in `handleLockGFA`; add "immutable" messaging in locked state
2. **`src/components/project-wizard/WizardChatInterface.tsx`** -- Add citation-type guard to prevent second GFA_LOCK from being saved via chat
3. **`src/components/project-wizard/Stage8FinalReview.tsx`** -- Exclude GFA_LOCK from editable fields in the Owner Lock edit flow

### Guard logic (GFALockStage):
```typescript
// In handleLockGFA, before saving:
const existingGfaLock = currentFacts.find(
  (f: any) => f.cite_type === 'GFA_LOCK'
);
if (existingGfaLock) {
  toast.error("GFA is already locked. To change the area, please create a new project.");
  setIsLocking(false);
  return;
}
```

### Guard logic (Stage8FinalReview):
```typescript
// In the edit handler, block GFA_LOCK edits:
const IMMUTABLE_CITATION_TYPES = ['GFA_LOCK'];
if (IMMUTABLE_CITATION_TYPES.includes(editedCitation.cite_type)) {
  toast.error("GFA cannot be modified mid-project. Please create a new project if the area has changed.");
  return;
}
```

This approach protects the Operational Truth chain, prevents wasted AI credits, and gives users clear guidance on what to do when GFA changes.
