-- Fix SELECT policy ambiguity: always parse folder from storage.objects.name (not projects.name)
DROP POLICY IF EXISTS "Team can view project documents by project id" ON storage.objects;

CREATE POLICY "Team can view project documents by project id"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(storage.objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.project_id::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);