
-- Fix the buggy storage SELECT policy for project owners
-- The old policy compared project.id with foldername(project.name) instead of foldername(objects.name)
DROP POLICY IF EXISTS "Project owners and members can view documents" ON storage.objects;

CREATE POLICY "Project owners and members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- User's own files (if stored under user_id folder)
    (auth.uid())::text = (storage.foldername(name))[1]
    -- Project members can view via project_id folder
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND (pm.project_id)::text = (storage.foldername(name))[1]
    )
    -- Project OWNERS can view via project_id folder
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()
        AND (p.id)::text = (storage.foldername(name))[1]
    )
  )
);

-- Also fix the other buggy policy with the same issue
DROP POLICY IF EXISTS "Project members can view documents" ON storage.objects;
