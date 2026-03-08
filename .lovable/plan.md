

# DNA Audit — Penalty Logic & UI Refinement Plan

## What Changes

**Single file**: `src/components/project-wizard/Stage8FinalReview.tsx`

### 1. Add `penaltyWeight` + `failReason` to `pillarDetails` array (lines 10698-10708)

Each pillar object gets two new fields:
- `penaltyWeight`: tiered dollar amount ($1,000–$8,500)
- `failReason`: dynamic string explaining WHY it failed (shown in UI)

### 2. Fix Pillar 8 status logic (line 10706)

Current: `(financialSummary?.total_cost ?? 0) > 0 && !!locationCit`

New: Budget citation exists AND (net cost ≤ budget × 1.02). If cost exists but no budget set → FAIL with reason "Budget not set — unverified spend".

### 3. Fix Pillar 9 status logic (line 10707)

Current: `obcComplianceResults.sections.length > 0`

New: Three conditions must ALL be true:
- OBC sections exist AND average relevance > 0.7
- At least one material/budget citation exists (`templateCit` or `tradeCit`)
- `obcComplianceResults.sections.length >= 1`

Fail reason varies: "No OBC sections found", "Relevance score below 70%", or "Missing trade/material specs".

### 4. Update Penalty Engine IIFE (lines 10863-11019)

Replace flat `penaltyPerFail = 2500` with per-pillar weights:
- `totalPenalty = sum of failedPillar.penaltyWeight`
- `totalSaved = sum of passedPillar.penaltyWeight`
- Max potential = $27,500

### 5. UI Enhancements in pillar cards (lines 10800-10814)

- Add penalty weight badge next to PASS/FAIL status (e.g. red `$8,500` badge for failed Pillar 9)
- Show `failReason` text below description when status is FAIL
- FAIL badge changes from "PENDING" to "⚠ FAIL" with red styling

### 6. Warning & Success card updates (lines 10924-11014)

- Failed items list: show individual `penaltyWeight` instead of flat $2,500
- Passed items list: show individual `penaltyWeight` as savings
- All-pass congrats: "Full Compliance – Zero Penalty Risk" with $27,500 total
- Penalty Shield badge: dynamic total based on weighted sums

### Penalty Weight Table
```text
Pillar  Description              Weight
1       Project Basics           $1,000
2       Area & Dimensions        $3,500
3       Trade & Template         $2,500
4       Team Architecture        $1,500
5       Execution Timeline       $2,000
6       Documents & Visual       $2,000
7       Site Log & Location      $1,500
8       Financial Summary        $5,000
9       Building Code Alignment  $8,500
                          Total: $27,500
```

