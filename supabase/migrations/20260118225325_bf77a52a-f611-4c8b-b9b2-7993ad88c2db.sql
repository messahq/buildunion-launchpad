-- Add INSERT policy for project-documents bucket to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

-- Add UPDATE policy for project-documents bucket
CREATE POLICY "Users can update their own project documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add DELETE policy for project-documents bucket
CREATE POLICY "Users can delete their own project documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);