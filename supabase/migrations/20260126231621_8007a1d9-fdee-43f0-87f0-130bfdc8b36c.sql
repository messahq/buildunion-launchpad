-- Drop and recreate the public read policy to ensure it's correct
DROP POLICY IF EXISTS "Public read access for project documents" ON storage.objects;

CREATE POLICY "Public read access for project documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'project-documents');