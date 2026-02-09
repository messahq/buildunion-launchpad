-- Make the project-documents bucket public for preview functionality
UPDATE storage.buckets SET public = true WHERE id = 'project-documents';