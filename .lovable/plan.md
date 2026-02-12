
# Fix: Template Sub-Tasks Not Appearing in Execution Timeline

## Problem Found

The root cause is in `Stage7GanttSetup.tsx` line 479: the `saveTasksToDb` function checks if **any** tasks already exist for the project, and if they do, it **skips the entire insert** -- including all template sub-tasks. Since generic phase tasks (like "Preparation Work", "Installation Work") are created first (or were created in earlier sessions), the template-derived sub-tasks are never saved to the database.

**Database evidence**: All 30+ tasks in `project_tasks` have descriptions like `"Phase: Installation"` or `"Verification checkpoint: ..."` -- zero have `"Template sub-task:"` in their description. All have `total_cost: 0`.

## Fix Plan

### Step 1: Fix `saveTasksToDb` in `Stage7GanttSetup.tsx`

Replace the "skip all if any exist" logic with a smarter approach:
- Check which sub-tasks are **already** in the database (by matching `description LIKE 'Template sub-task:%'`)
- Only insert **new** template sub-tasks that don't already exist
- Keep existing phase tasks intact (no duplicates)

```text
Before (broken):
  if (existingTasks.length > 0) return; // skips EVERYTHING

After (fixed):
  1. Check existing tasks
  2. If phase tasks exist but NO template sub-tasks:
     -> Insert only the template sub-tasks
  3. If template sub-tasks already exist:
     -> Skip (no duplicates)
```

### Step 2: Add Template Sub-Task Recovery in `Stage8FinalReview.tsx`

When Stage 8 loads tasks (line 1102-1170), if it finds:
- A TEMPLATE_LOCK citation with items
- But zero tasks with `"Template sub-task:"` in their description

Then it should automatically insert the missing template sub-tasks into the database, using the same phase categorization logic from Stage 7. This ensures that even if Stage 7 was skipped or had the bug, Stage 8 self-heals.

### Step 3: Backfill Existing Projects

For the current project that already has tasks but no sub-tasks, the Stage 8 recovery (Step 2) will automatically detect and insert the missing template sub-tasks on next load.

## Technical Details

### File Changes

**`src/components/project-wizard/Stage7GanttSetup.tsx`**
- Lines 470-512: Replace `saveTasksToDb` with smarter duplicate detection
- Instead of checking "any task exists", check specifically for template sub-tasks
- Insert only missing template sub-tasks alongside existing phase tasks

**`src/components/project-wizard/Stage8FinalReview.tsx`**
- Lines 1102-1170: Add template sub-task recovery after task loading
- Read TEMPLATE_LOCK citation metadata.items
- If tasks exist but none have "Template sub-task:" description, generate and insert them
- Use the same `categorizeTemplateItem` logic (keyword-based phase assignment)
- Re-fetch tasks after insertion so the UI reflects the new sub-tasks

### What This Fixes
- Template-derived materials/labor items will appear as actionable sub-tasks in Panel 5 (Execution Timeline)
- Each sub-task will show its cost badge (for Owner view)
- Panel 8 (Financial Summary) Phase Cost Breakdown will have actual data to aggregate
- PDF reports and invoices will include the phase-level cost breakdown
