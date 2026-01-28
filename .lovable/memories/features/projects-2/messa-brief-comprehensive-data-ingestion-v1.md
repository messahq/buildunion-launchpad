# Memory: M.E.S.S.A. Brief Comprehensive Data Ingestion v1
Updated: 2026-01-28

## Problem Solved
The M.E.S.S.A. Audit Report was only reading 8/16 data sources and missing area/materials data because the `generate-project-brief` function only read from `blueprint_analysis`, ignoring `photo_estimate`, `ai_workflow_config`, `verified_facts`, and other key fields.

## Data Priority Chain

### Area Detection (Priority Order)
1. `photo_estimate.area` - Photo AI Analysis (highest priority)
2. `ai_workflow_config.detectedArea` - Workflow Config
3. `blueprint_analysis.area` - Blueprint Analysis
4. `calculator_results[].detectedArea` - Calculator Results
5. Task description regex extraction (fallback)

### Materials Detection (Merged from ALL sources)
1. `photo_estimate.materials[]` - Photo AI
2. `ai_workflow_config.materials[]` - Workflow Config
3. `blueprint_analysis.materials[]` - Blueprint
4. `line_items[]` - Saved Materials from Materials Tab
5. Task-based extraction (regex from descriptions)

## 16 Data Sources Structure

### 8 Pillars of Operational Truth
1. Confirmed Area - from priority chain above
2. Materials Count - merged unique materials
3. Blueprint Status - analyzed/none/pending
4. OBC Compliance - clear/permit_required/pending
5. Conflict Status - aligned/conflict_detected/pending
6. Project Mode - solo/team
7. Project Size - small/medium/large
8. AI Confidence - high/medium/low

### 8 Workflow Data Sources
1. Tasks - all completed = verified
2. Documents - has docs + contracts = verified
3. Contracts - has signed = verified
4. Team - has members beyond owner = verified
5. Timeline - both start and end dates = verified
6. Client Info - name + email = verified
7. Site Map - has address = verified
8. Budget - has any cost > 0 = verified

## AI Prompt Enhancement
The context now includes:
- Verification status tables (✅/❌) for all 16 sources
- Source attribution for each data point
- Operational Readiness percentage calculation
- Detailed task breakdown with status/due date/cost
- Full materials list with source attribution
- Cost breakdown (material/labor/line items/tasks)

## Files Modified
- `supabase/functions/generate-project-brief/index.ts`
