// ============================================
// STAGE 8: M.E.S.S.A. Synthesis Preview Dialog (Extracted)
// Dual Engine audit report with PDF download/save
// ============================================

import React, { useState, useCallback } from "react";
import { Sparkles, Download, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface MessaSynthesisData {
  synthesisId: string;
  synthesisVersion: string;
  dualEngineUsed: boolean;
  generatedAt: string;
  engines: {
    gemini: { model: string; analysis: any };
    openai: { model: string; analysis: any } | null;
  };
  projectSnapshot: any;
  region: string;
}

interface MessaSynthesisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MessaSynthesisData;
  previewHtml: string;
  projectId: string;
}

export const MessaSynthesisDialog: React.FC<MessaSynthesisDialogProps> = ({
  open,
  onOpenChange,
  data,
  previewHtml,
  projectId,
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      const { downloadPDF } = await import('@/lib/pdfGenerator');
      await downloadPDF(previewHtml, {
        filename: `messa-synthesis-${data.synthesisId}.pdf`,
        pageFormat: 'letter',
        margin: 10,
      });
      toast.success('M.E.S.S.A. Report downloaded!');
    } catch (err) {
      toast.error('Download failed');
    }
  }, [previewHtml, data.synthesisId]);

  const handleSaveToDocuments = useCallback(async () => {
    setIsSaving(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;

      const container = document.createElement('div');
      container.innerHTML = previewHtml;
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:900px;';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      document.body.removeChild(container);

      const pdf = new jsPDF({ format: 'letter', unit: 'mm' });
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);

      const blob = pdf.output('blob');
      const filePath = `${projectId}/${Date.now()}-messa-synthesis.pdf`;

      await supabase.storage.from('project-documents').upload(filePath, blob, { contentType: 'application/pdf' });
      await supabase.from('project_documents').insert({
        project_id: projectId,
        file_name: `messa-synthesis-${data.synthesisId}.pdf`,
        file_path: filePath,
        file_size: blob.size,
      });

      toast.success('M.E.S.S.A. Report saved to Documents!');
      onOpenChange(false);
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [previewHtml, projectId, data.synthesisId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            M.E.S.S.A. Synthesis - {data.synthesisId}
            {data.dualEngineUsed && (
              <Badge className="bg-gradient-to-r from-blue-600 to-green-600 text-white text-[10px]">
                Dual Engine
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-neutral-950">
          <iframe srcDoc={previewHtml} className="w-full h-[500px] border-0" title="M.E.S.S.A. Synthesis Preview" />
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            {t('stage8.messaDownload', 'Download PDF')}
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveToDocuments}
            disabled={isSaving}
            className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
            {t('stage8.messaSave', 'Save to Documents')}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
