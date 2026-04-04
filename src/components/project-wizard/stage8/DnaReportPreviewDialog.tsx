// ============================================
// DnaReportPreviewDialog — DNA Audit Report preview + email
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
import { Input } from "@/components/ui/input";
import { Shield, Download, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DnaReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dnaReportHtml: string;
  dnaReportBlobUrl: string | null;
  setDnaReportBlobUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setDnaReportHtml: React.Dispatch<React.SetStateAction<string>>;
  dnaReportFilename: string;
  // Email sub-dialog
  showDnaEmailDialog: boolean;
  setShowDnaEmailDialog: React.Dispatch<React.SetStateAction<boolean>>;
  dnaEmailClientName: string;
  setDnaEmailClientName: React.Dispatch<React.SetStateAction<string>>;
  dnaEmailClientEmail: string;
  setDnaEmailClientEmail: React.Dispatch<React.SetStateAction<string>>;
  isSendingDnaEmail: boolean;
  onSendDnaReportEmail: () => void;
}

export function DnaReportPreviewDialog({
  open,
  onOpenChange,
  dnaReportHtml,
  dnaReportBlobUrl,
  setDnaReportBlobUrl,
  setDnaReportHtml,
  dnaReportFilename,
  showDnaEmailDialog,
  setShowDnaEmailDialog,
  dnaEmailClientName,
  setDnaEmailClientName,
  dnaEmailClientEmail,
  setDnaEmailClientEmail,
  isSendingDnaEmail,
  onSendDnaReportEmail,
}: DnaReportPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) {
        if (dnaReportBlobUrl) {
          URL.revokeObjectURL(dnaReportBlobUrl);
          setDnaReportBlobUrl(null);
        }
        setDnaReportHtml('');
      }
    }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-background border-border p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-emerald-500" />
            M.E.S.S.A. DNA Audit Report
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden" style={{ height: '60vh' }}>
          {dnaReportHtml ? (
            <iframe
              srcDoc={dnaReportHtml}
              className="w-full h-full border-0 bg-white"
              title="DNA Audit Report Preview"
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
          {!showDnaEmailDialog ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                ✅ Auto-saved to project documents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (dnaReportBlobUrl) {
                      const a = document.createElement('a');
                      a.href = dnaReportBlobUrl;
                      a.download = dnaReportFilename;
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
                <Button
                  size="sm"
                  onClick={() => setShowDnaEmailDialog(true)}
                  className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send via Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Send className="h-4 w-4 text-sky-500" />
                Send DNA Report via Email
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Name</label>
                  <Input
                    placeholder="e.g. John Smith"
                    value={dnaEmailClientName}
                    onChange={(e) => setDnaEmailClientName(e.target.value)}
                    className="bg-muted/50 h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Email</label>
                  <Input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={dnaEmailClientEmail}
                    onChange={(e) => setDnaEmailClientEmail(e.target.value)}
                    className="bg-muted/50 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDnaEmailDialog(false)}>
                  Back
                </Button>
                <Button
                  onClick={onSendDnaReportEmail}
                  disabled={isSendingDnaEmail || !dnaEmailClientEmail || !dnaEmailClientName}
                  size="sm"
                  className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {isSendingDnaEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {isSendingDnaEmail ? 'Sending...' : 'Send Report'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}