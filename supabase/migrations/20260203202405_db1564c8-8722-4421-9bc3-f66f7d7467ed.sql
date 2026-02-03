-- Add pdf_url column to site_logs table for storing generated PDF links
ALTER TABLE public.site_logs ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create storage bucket for site log PDFs if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-log-pdfs', 'site-log-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload PDFs
CREATE POLICY "Users can upload their own site log PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-log-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to PDFs
CREATE POLICY "Site log PDFs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-log-pdfs');

-- Allow users to delete their own PDFs
CREATE POLICY "Users can delete their own site log PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'site-log-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);