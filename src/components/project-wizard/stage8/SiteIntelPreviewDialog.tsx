// ============================================
// SiteIntelPreviewDialog — MESSA Site Intelligence Report preview
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SiteIntelPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteIntelHtml: string;
  siteIntelBlobUrl: string | null;
  setSiteIntelBlobUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setSiteIntelHtml: React.Dispatch<React.SetStateAction<string>>;
  siteIntelFilename: string;
}

export function SiteIntelPreviewDialog({
  open,
  onOpenChange,
  siteIntelHtml,
  siteIntelBlobUrl,
  setSiteIntelBlobUrl,
  setSiteIntelHtml,
  siteIntelFilename,
}: SiteIntelPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) {
        if (siteIntelBlobUrl) {
          URL.revokeObjectURL(siteIntelBlobUrl);
          setSiteIntelBlobUrl(null);
        }
        setSiteIntelHtml('');
      }
    }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-background border-border p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Brain className="h-5 w-5 text-indigo-500" />
            M.E.S.S.A. Site Intelligence Report
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium ml-1">Dual-Engine AI</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden" style={{ height: '60vh' }}>
          {siteIntelHtml ? (
            <iframe
              srcDoc={siteIntelHtml}
              className="w-full h-full border-0 bg-white"
              title="Site Intelligence Report Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Generating preview...
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              ✅ Auto-saved to project documents
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (siteIntelBlobUrl) {
                    const a = document.createElement('a');
                    a.href = siteIntelBlobUrl;
                    a.download = siteIntelFilename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success('PDF downloaded');
                  }
                }}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}