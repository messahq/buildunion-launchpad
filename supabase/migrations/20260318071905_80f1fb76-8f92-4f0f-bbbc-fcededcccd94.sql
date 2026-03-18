-- Make site-log-pdfs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'site-log-pdfs';

-- Drop overly permissive public SELECT policy
DROP POLICY IF EXISTS "Site log PDFs are publicly accessible" ON storage.objects;

-- Authenticated users can view their own site log PDFs (folder structure: {user_id}/...)
CREATE POLICY "Users can view own site log PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'site-log-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
