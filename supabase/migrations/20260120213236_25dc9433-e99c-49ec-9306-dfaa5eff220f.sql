-- Fix 1: Add role column to team_invitations table for proper server-side role storage
ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- Fix 2: Make project-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'project-documents';

-- Fix 3: Drop the overly permissive public SELECT policy on storage.objects
DROP POLICY IF EXISTS "Anyone can view project documents" ON storage.objects;

-- Fix 4: Create authenticated policy for project document access
-- Using split_part to extract the project ID from the file path (format: {project_id}/{filename})
CREATE POLICY "Project members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM project_documents pd 
    JOIN projects p ON pd.project_id = p.id 
    WHERE split_part(name, '/', 1) = p.id::text
    AND (
      p.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id 
        AND pm.user_id = auth.uid()
      )
    )
  )
);