-- Make project-documents bucket private to prevent unauthenticated access
UPDATE storage.buckets SET public = false WHERE id = 'project-documents';