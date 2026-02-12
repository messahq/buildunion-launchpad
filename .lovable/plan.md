

# Live Project Dashboard + Material Tracking Integration

## Overview

Two new features that transform BuildUnion from a project setup tool into a real-time construction operations platform:

1. **Live Project Dashboard** -- A visual "mission control" card layout on the Workspace page replacing the simple project list, showing real-time KPIs per project (days remaining, completion %, material gaps, next action)
2. **On-Site Material Tracking** -- Workers can log material deliveries on mobile. The system compares "planned vs. actual" quantities against the TEMPLATE_LOCK citation data, giving instant visibility into material shortages or surpluses.

---

## Feature 1: Live Project Dashboard Cards

### What the user sees
Each project card on the Workspace becomes a mini-dashboard with:
- **Countdown** -- "12 days remaining" (from project_end_date)
- **Progress ring/bar** -- completion % based on tasks (completed/total)
- **Material status** -- "3/7 materials delivered" (from new tracking table)
- **Next step** -- the highest-priority pending task title
- **Health badge** -- color-coded (green/yellow/red) based on schedule + material status

### Technical approach
- Enhance `BuildUnionWorkspace.tsx` project cards with enriched data
- Fetch `project_summaries` (start/end dates), `project_tasks` (completion stats), and new `material_deliveries` (delivery counts) in one combined query
- Compute KPIs client-side: days remaining, % complete, material coverage ratio
- Use existing `ProjectHealthBadge` component pattern for health indicator
- Mobile-responsive card grid (1 col mobile, 2 col tablet, 3 col desktop)

---

## Feature 2: On-Site Material Tracking

### What the user sees
- Inside Stage 8 Trade panel (Panel 3) or as a dedicated sub-view: list of expected materials from TEMPLATE_LOCK
- Each material row shows: **Expected qty** | **Delivered qty** | **Remaining** | **Status badge**
- Worker/Foreman taps "Log Delivery" button on mobile, enters quantity + optional photo
- Owner sees real-time "Planned vs Actual" comparison

### Database changes

New table: `material_deliveries`

```text
+---------------------+----------+----------------------------------------+
| Column              | Type     | Notes                                  |
+---------------------+----------+----------------------------------------+
| id                  | uuid     | PK, gen_random_uuid()                  |
| project_id          | uuid     | NOT NULL                               |
| material_name       | text     | NOT NULL (matches template item name)  |
| expected_quantity   | numeric  | From TEMPLATE_LOCK                     |
| delivered_quantity  | numeric  | NOT NULL, default 0                    |
| unit                | text     | e.g. 'm2', 'boxes', 'gallons'         |
| logged_by           | uuid     | NOT NULL (auth.uid)                    |
| logged_at           | timestamptz | default now()                       |
| notes               | text     | Optional                               |
| photo_url           | text     | Optional verification photo            |
+---------------------+----------+----------------------------------------+
```

RLS policies:
- **SELECT**: Project owner OR project member can view
- **INSERT**: Owner, Foreman, Worker (team members with appropriate roles)
- **UPDATE**: Only the person who logged it, or owner
- **DELETE**: Owner only

### Integration with existing architecture
- Reads expected quantities from `TEMPLATE_LOCK` citation metadata items
- Delivery logs are aggregated per material to compute "delivered total"
- The Operational Truth panel gains a new "Material Coverage" pillar
- Follows the existing Data Lock Protocol -- delivered quantities are factual logs, never overwritten by AI

### Role-based access
- **Owner**: Full view + approve/reject deliveries
- **Foreman**: Can log deliveries + view all
- **Worker**: Can log deliveries for assigned materials only
- **Inspector**: View only (verification)

---

## Implementation Steps

1. Create `material_deliveries` table with RLS policies via migration
2. Build `MaterialDeliveryLog` component -- mobile-friendly form (material selector, quantity input, optional photo upload)
3. Build `MaterialTracker` component -- table/card view showing planned vs actual per material
4. Integrate MaterialTracker into Stage 8 Panel 3 (Trade & Template) full-screen view
5. Enhance Workspace project cards with live KPI data (days remaining, task %, material coverage)
6. Add real-time subscription on `material_deliveries` for instant updates

---

## Files to create/modify

| File | Action |
|------|--------|
| `supabase/migrations/` (new) | Create `material_deliveries` table + RLS |
| `src/components/materials/MaterialTracker.tsx` | NEW -- Planned vs Actual view |
| `src/components/materials/MaterialDeliveryLog.tsx` | NEW -- Mobile delivery form |
| `src/components/project-wizard/Stage8FinalReview.tsx` | Add MaterialTracker to Panel 3 full-screen |
| `src/pages/BuildUnionWorkspace.tsx` | Enhance project cards with live KPIs |

