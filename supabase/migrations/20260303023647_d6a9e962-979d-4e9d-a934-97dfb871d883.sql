
-- Fix storage SELECT policy for project owners - using correct bucket name 'blueprints'
DROP POLICY IF EXISTS "Project owners and members can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view documents" ON storage.objects;

CREATE POLICY "Project owners and members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'blueprints'
  AND auth.uid() IS NOT NULL
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND (pm.project_id)::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()
        AND (p.id)::text = (storage.foldername(name))[1]
    )
  )
);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Project owners can update documents" ON storage.objects;

CREATE POLICY "Project owners can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blueprints'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(name))[1]
  )
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Project owners can delete documents" ON storage.objects;

CREATE POLICY "Project owners can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blueprints'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.user_id = auth.uid()
      AND (p.id)::text = (storage.foldername(name))[1]
  )
);

-- Fix INSERT policy
DROP POLICY IF EXISTS "Team members can upload documents" ON storage.objects;

CREATE POLICY "Team members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blueprints'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()
        AND (p.id)::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND (pm.project_id)::text = (storage.foldername(name))[1]
    )
  )
);
