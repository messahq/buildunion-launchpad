
-- Allow project owners to delete files in their project folder
CREATE POLICY "Project owners can delete project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-documents' 
  AND EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id::text = (storage.foldername(name))[1] 
    AND p.user_id = auth.uid()
  )
);
