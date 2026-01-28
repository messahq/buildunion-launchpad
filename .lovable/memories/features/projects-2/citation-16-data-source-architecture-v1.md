# Memory: Citation 16-Data Source Architecture v1

## Overview
Every project has 16 data sources that must be verified with citations. The system differs for Solo vs Team mode.

## Solo Mode: 8 Core Citations

| # | Data Source | Trigger | Citation ID | Pillar Link |
|---|-------------|---------|-------------|-------------|
| 1 | Work Type | Page 1 selection | `[C-001]` | Mode |
| 2 | Photos | Page 1 upload | `[P-001..N]` | Area |
| 3 | Documents | Page 1 upload | `[D-001..N]` / `[B-001..N]` | Blueprint |
| 4 | Description | Page 1 input | `[C-002]` | Size |
| 5 | Data Source | Page 2 selection | `[C-003]` | Confidence |
| 6 | Timeline | Page 3 dates | `[TL-001]` | N/A |
| 7 | Mode | Page 5 selection | `[M-001]` | Mode |
| 8 | AI Analysis | Auto-analysis | `[A-001]` | Area/Materials |

## Team Mode: 8 Additional Citations

| # | Data Source | Trigger | Citation ID | Pillar Link |
|---|-------------|---------|-------------|-------------|
| 9 | Trades | Page 4 selection | `[T-001]` | Team Config |
| 10 | Team Members | Invitation accepted | `[TM-001..N]` | Team |
| 11 | Tasks | Task creation | `[TSK-001..N]` | Tasks |
| 12 | Contracts | Signed by client | `[CON-001]` | Contracts |
| 13 | Client Info | Client details filled | `[CLI-001]` | Client Info |
| 14 | Site Map | Address geocoded | `[MAP-001]` | Site Map |
| 15 | Documents | Post-creation upload | `[DOC-001..N]` | Documents |
| 16 | Weather | Auto-fetch | `[W-001]` | Weather |

## Citation Generation Flow

### Page 1: ProjectQuestionnaire
```typescript
// On work type selection
registerCitation({ sourceId: "C-001", documentType: "log", linkedPillar: "mode" })

// On photo upload
registerCitation({ sourceId: "P-001", documentType: "site_photo", linkedPillar: "area" })

// On document upload
registerCitation({ sourceId: "D-001", documentType: "pdf", linkedPillar: "blueprint" })

// On description save
registerCitation({ sourceId: "C-002", documentType: "log", linkedPillar: "size" })
```

### Page 2: FilterQuestions (Data Source)
```typescript
// On data availability selection
registerCitation({ sourceId: "C-003", documentType: "log", linkedPillar: "confidence" })
```

### Page 3: FilterQuestions (Timeline)
```typescript
// On project dates set
registerCitation({ sourceId: "TL-001", documentType: "log", linkedPillar: undefined })
```

### Page 4: FilterQuestions (Trades/Workflow)
```typescript
// On trades selection (Team Mode only)
registerCitation({ sourceId: "T-001", documentType: "log", linkedPillar: undefined })
```

### Page 5: WorkflowSelector
```typescript
// On mode selection (Solo/Team)
registerCitation({ sourceId: "M-001", documentType: "log", linkedPillar: "mode" })

// AI Analysis results
registerCitation({ sourceId: "A-001", documentType: "log", linkedPillar: "area" })
```

## References Section Display
The References section on Page 5 (and Overview tab) shows all registered citations with:
- Citation ID badge `[P-001]`
- Document name
- Context snippet
- Linked pillar indicator (if applicable)
- Source type icon

## Database Storage
Citations are stored in `project_summaries.verified_facts.citationRegistry` as a JSON array.

## Pillar Status Sync
When a citation is linked to a pillar:
1. The pillar's verification status may update
2. The Command Center's Data Sources panel updates
3. The verification rate recalculates
4. A sync animation plays to indicate the update
