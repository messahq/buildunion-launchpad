// ============================================
// Signed URL Media Components
// For loading images/iframes from private Supabase storage buckets
// ============================================

import React, { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Renders an <img> loaded via a signed URL from the 'project-documents' bucket.
 */
export const SignedImage = React.memo(({ filePath, alt, className }: { filePath: string; alt: string; className?: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setSrc(null);
    supabase.storage.from('project-documents').createSignedUrl(filePath, 60 * 60).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err || !data?.signedUrl) {
        setError(true);
      } else {
        setSrc(data.signedUrl);
      }
    });
    return () => { cancelled = true; };
  }, [filePath]);

  if (error) return (
    <div className={cn("bg-muted flex items-center justify-center text-muted-foreground", className)}>
      <FileText className="h-4 w-4" />
    </div>
  );
  if (!src) return <div className={cn("bg-muted animate-pulse", className)} />;
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
});
SignedImage.displayName = 'SignedImage';

/**
 * Renders an <iframe> loaded via a signed URL from the 'project-documents' bucket.
 */
export const SignedIframe = React.memo(({ filePath, title, className }: { filePath: string; title: string; className?: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setSrc(null);
    supabase.storage.from('project-documents').createSignedUrl(filePath, 60 * 60).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err || !data?.signedUrl) {
        setError(true);
      } else {
        setSrc(data.signedUrl);
      }
    });
    return () => { cancelled = true; };
  }, [filePath]);

  if (error) return (
    <div className={cn("bg-muted flex items-center justify-center text-muted-foreground p-4", className)}>
      <p className="text-sm">Preview not available</p>
    </div>
  );
  if (!src) return <div className={cn("bg-muted animate-pulse", className)} />;
  return <iframe src={src} title={title} className={className} />;
});
SignedIframe.displayName = 'SignedIframe';
