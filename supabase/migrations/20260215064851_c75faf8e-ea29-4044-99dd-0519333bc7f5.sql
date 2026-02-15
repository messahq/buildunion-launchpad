
-- Allow project owners to update files in project-documents bucket (for DNA report upsert)
CREATE POLICY "Project owners can update project documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-documents' 
  AND EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id::text = (storage.foldername(name))[1] 
    AND p.user_id = auth.uid()
  )
);
