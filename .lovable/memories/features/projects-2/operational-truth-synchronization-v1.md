# Memory: Operational Truth Synchronization ("The Clock")

## Core Principle
The Operational Truth panel on the Overview tab acts as **"The Clock"** - the single source of truth for project verification status. All 8 pillars MUST be synchronized with real data, and the verification rate MUST reflect the actual state including manual overrides.

## Data Flow Architecture

### Input Sources (16+ Data Points)
1. **Photo AI** (`photo_estimate.area`, `photo_estimate.materials`)
2. **Blueprint Analysis** (`blueprint_analysis.extractedText`)
3. **Calculator Results** (`calculator_results[0].detectedArea`)
4. **Task-Based Extraction** (regex patterns in task titles/descriptions)
5. **Workflow Config** (`ai_workflow_config.filterAnswers`)
6. **Dual Engine Output** (OpenAI OBC check, Gemini synthesis)
7. **Manual Overrides** (Blueprint validation, Conflict ignore)

### Priority Fallback Chain
```
Area: photo_estimate.area > blueprint.detectedArea > calculator_results > tasks regex
Materials: photo_estimate.materials > ai_workflow_config.materials > tasks extraction
Blueprint: AI analyzed > manual validation > none
Conflict: dual-engine synthesis > manual ignore > pending
```

## Critical Synchronization Points

### 1. Verification Rate Calculation
The `OperationalTruthCards` component recalculates `effectiveVerificationRate` locally using:
- Effective blueprint status (with manual override)
- Effective conflict status (with manual override)
- This ensures the progress bar reflects the TRUE state

### 2. Pending Checks Count
The "Run All (N)" button count uses effective statuses:
- If conflicts are manually ignored, they are NOT counted as pending
- This prevents redundant re-verification of user-acknowledged items

### 3. Data Source Origins
Each pillar displays its data source for transparency:
- 📷 Photo AI
- 📐 Blueprint
- 📋 Tasks
- ✋ Manual
- ⚙️ Config

## Files Involved
- `src/types/operationalTruth.ts` - Core type definitions and `buildOperationalTruth()`
- `src/components/projects2/OperationalTruthCards.tsx` - UI + local recalculation
- `src/components/projects2/ProjectDetailsView.tsx` - Data aggregation + parent state

## Manual Override Flow
1. User clicks "Ignore Issues" or validates Blueprint manually
2. Local state updates in OperationalTruthCards
3. Callback propagates to ProjectDetailsView
4. useMemo recalculates operationalTruth with overrides
5. Progress bar and status indicators update immediately
6. Report logged for audit trail
