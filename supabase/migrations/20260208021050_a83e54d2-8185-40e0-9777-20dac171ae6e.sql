-- Add quantity_logic_version to project_summaries for V1/V2 separation
-- V1 = Legacy projects (frozen logic, no changes)
-- V2 = New projects (Quantity Resolver required)

ALTER TABLE public.project_summaries 
ADD COLUMN IF NOT EXISTS quantity_logic_version smallint DEFAULT 1;

-- Add comment explaining the field
COMMENT ON COLUMN public.project_summaries.quantity_logic_version IS 
'Quantity calculation logic version. 1=Legacy (frozen), 2=Quantity Resolver required. New projects default to 2 after 2026-02-08.';