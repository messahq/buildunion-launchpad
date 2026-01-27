-- 1. Remove the public INSERT policy on contract_events
-- The edge function uses service role which bypasses RLS anyway
DROP POLICY IF EXISTS "Allow public event logging" ON public.contract_events;

-- 2. Make project-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'project-documents';

-- 3. Drop the public read policy
DROP POLICY IF EXISTS "Public read access for project documents" ON storage.objects;

-- 4. Create proper RLS policy for project documents - only project owners and members can view
CREATE POLICY "Project owners and members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' 
  AND auth.uid() IS NOT NULL
  AND (
    -- User owns the file (first folder segment is user_id)
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User is a member of the project that owns the file
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id::text = (storage.foldername(name))[1]
    )
    OR
    -- User owns the project
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
    )
  )
);