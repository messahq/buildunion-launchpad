-- Add ai_workflow_config column to project_summaries table
-- This stores the complete workflow configuration and AI analysis metadata

ALTER TABLE public.project_summaries 
ADD COLUMN IF NOT EXISTS ai_workflow_config JSONB DEFAULT '{}'::jsonb;

-- Structure of ai_workflow_config:
-- {
--   "projectSize": "small" | "medium" | "large",
--   "projectSizeReason": "AI detected 1200 sq ft with 7 materials",
--   "recommendedMode": "solo" | "team",
--   "selectedMode": "solo" | "team",
--   "tierAtCreation": "free" | "pro" | "premium" | "enterprise",
--   "teamLimitAtCreation": 0 | 10 | 50 | Infinity,
--   "aiAnalysis": {
--     "area": 1200,
--     "areaUnit": "sq ft",
--     "materials": [...],
--     "hasBlueprint": true,
--     "confidence": "high"
--   },
--   "userEdits": {
--     "editedArea": 1350,
--     "editedMaterials": [...],
--     "editedAt": "2026-01-26T..."
--   }
-- }

COMMENT ON COLUMN public.project_summaries.ai_workflow_config IS 'Stores AI workflow configuration including project size detection, tier info, and user edits';