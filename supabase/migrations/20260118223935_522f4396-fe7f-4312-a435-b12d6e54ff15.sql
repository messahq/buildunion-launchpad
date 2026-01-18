-- Make project-documents bucket public so site images can be viewed
UPDATE storage.buckets SET public = true WHERE id = 'project-documents';