// ============================================
// STAGE 8: Project Summary Preview Dialog (Extracted)
// Download/Save comprehensive project summary PDF
// ============================================

import React, { useState, useCallback } from "react";
import { ClipboardList, Download, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentCategory } from "./types";

interface SummaryPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryHtml: string;
  projectId: string;
  userId: string;
  projectName: string;
  onDocumentsReload: () => void;
  categorizeDocument: (fileName: string, filePath: string) => DocumentCategory;
}

export const SummaryPreviewDialog: React.FC<SummaryPreviewDialogProps> = ({
  open,
  onOpenChange,
  summaryHtml,
  projectId,
  userId,
  projectName,
  onDocumentsReload,
  categorizeDocument,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!summaryHtml) return;
    try {
      const { downloadPDF } = await import('@/lib/pdfGenerator');
      await downloadPDF(summaryHtml, {
        filename: `project-summary-${projectName?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}.pdf`,
        pageFormat: 'letter',
        margin: 15,
      });
      toast.success('Summary PDF downloaded!');
    } catch (err) {
      console.error('[SummaryDialog] Download failed:', err);
      toast.error('Failed to download summary');
    }
  }, [summaryHtml, projectName]);

  const handleSaveToDocuments = useCallback(async () => {
    if (!summaryHtml || !projectId || !userId) return;

    setIsSaving(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;

      const container = document.createElement('div');
      container.innerHTML = summaryHtml;
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      document.body.removeChild(container);

      const imgWidth = 210;
      const margin = 15;
      const usableWidth = imgWidth - (margin * 2);
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeight);

      const blob = pdf.output('blob');
      const fileName = `project-summary-${projectName?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}.pdf`;
      const filePath = `${projectId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, blob, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          file_name: fileName,
          file_path: filePath,
          file_size: blob.size,
        });
      if (dbError) throw dbError;

      onDocumentsReload();
      toast.success('Summary saved to Documents!', { description: 'Find it in Panel 6' });
      onOpenChange(false);
    } catch (err) {
      console.error('[SummaryDialog] Save failed:', err);
      toast.error('Failed to save summary');
    } finally {
      setIsSaving(false);
    }
  }, [summaryHtml, projectId, userId, projectName, onDocumentsReload, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-500" />
            Project Summary Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          <iframe srcDoc={summaryHtml} className="w-full h-[500px] border-0" title="Summary Preview" />
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleSaveToDocuments} disabled={isSaving} className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
            Save to Documents
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
