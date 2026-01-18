-- Add policy for public read access to project-documents bucket
CREATE POLICY "Anyone can view project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents');