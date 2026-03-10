// ============================================
// STAGE 8: Invoice Preview Dialog (Extracted)
// Edit client/contractor details, signatures, download/save PDF
// ============================================

import React, { useState, useCallback } from "react";
import {
  FileText, Download, FolderOpen, Edit2, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { InvoiceData } from "@/lib/invoiceGenerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentCategory } from "./types";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData;
  invoiceHtml: string;
  projectId: string;
  userId: string;
  onInvoiceUpdate: (data: InvoiceData, html: string) => void;
  onDocumentsReload: () => void;
  categorizeDocument: (fileName: string, filePath: string) => DocumentCategory;
}

export const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open,
  onOpenChange,
  invoiceData,
  invoiceHtml,
  projectId,
  userId,
  onInvoiceUpdate,
  onDocumentsReload,
  categorizeDocument,
}) => {
  const [editMode, setEditMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    clientName: invoiceData.client?.name || '',
    clientEmail: invoiceData.client?.email || '',
    clientPhone: invoiceData.client?.phone || '',
    clientAddress: invoiceData.client?.address || '',
    notes: invoiceData.notes || '',
    discountPercent: invoiceData.discountPercent || 0,
  });
  const [signatureMode, setSignatureMode] = useState<'type' | 'draw'>('type');
  const [typedSignature, setTypedSignature] = useState(invoiceData.client?.name || '');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [contractorSigMode, setContractorSigMode] = useState<'type' | 'draw'>('type');
  const [contractorTypedSig, setContractorTypedSig] = useState(invoiceData.contractor?.name || '');
  const [contractorDrawnSig, setContractorDrawnSig] = useState<string | null>(null);

  // Apply edits to invoice data and refresh preview
  const handleApplyEdits = useCallback(async () => {
    const updatedData: InvoiceData = {
      ...invoiceData,
      client: {
        ...invoiceData.client,
        name: editFields.clientName,
        email: editFields.clientEmail,
        phone: editFields.clientPhone,
        address: editFields.clientAddress,
      },
      notes: editFields.notes,
      discountPercent: editFields.discountPercent,
      discountAmount: invoiceData.subtotal * (editFields.discountPercent / 100),
    };

    // Recalculate grand total
    const netAfterDiscount = updatedData.subtotal - updatedData.discountAmount;
    updatedData.taxInfo = {
      ...updatedData.taxInfo,
      amount: Number((netAfterDiscount * updatedData.taxInfo.rate).toFixed(2)),
    };
    updatedData.grandTotal = Number((netAfterDiscount + updatedData.taxInfo.amount).toFixed(2));

    const { buildInvoiceHTML } = await import('@/lib/invoiceGenerator');
    let html = buildInvoiceHTML(updatedData);

    // Inject signatures into the HTML
    const clientSig = signatureMode === 'draw' && drawnSignature
      ? `<img src="${drawnSignature}" style="height:50px;object-fit:contain;" />`
      : typedSignature
        ? `<span style="font-family:'Dancing Script','Brush Script MT','Segoe Script',cursive;font-size:28px;color:#1e293b;">${typedSignature}</span>`
        : '';

    const contractorSig = contractorSigMode === 'draw' && contractorDrawnSig
      ? `<img src="${contractorDrawnSig}" style="height:50px;object-fit:contain;" />`
      : contractorTypedSig
        ? `<span style="font-family:'Dancing Script','Brush Script MT','Segoe Script',cursive;font-size:28px;color:#1e293b;">${contractorTypedSig}</span>`
        : '';

    if (clientSig) {
      html = html.replace(
        /<div class="signature-title">Client Signature<\/div>\s*<div class="signature-line"><\/div>/,
        `<div class="signature-title">Client Signature</div><div style="height:50px;display:flex;align-items:flex-end;border-bottom:1px solid #9ca3af;margin-bottom:8px;">${clientSig}</div>`
      );
      html = html.replace(
        /(<div class="signature-box">\s*<div class="signature-title">Client Signature[\s\S]*?Name: <span>)<\/span>/,
        `$1${editFields.clientName}</span>`
      );
    }

    if (contractorSig) {
      html = html.replace(
        /<div class="signature-title">Contractor Signature<\/div>\s*<div class="signature-line"><\/div>/,
        `<div class="signature-title">Contractor Signature</div><div style="height:50px;display:flex;align-items:flex-end;border-bottom:1px solid #9ca3af;margin-bottom:8px;">${contractorSig}</div>`
      );
    }

    if (typedSignature || contractorTypedSig) {
      html = html.replace('</head>', '<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet"></head>');
    }

    onInvoiceUpdate(updatedData, html);
    setEditMode(false);
    toast.success('Invoice updated — ready to download');
  }, [invoiceData, editFields, signatureMode, typedSignature, drawnSignature, contractorSigMode, contractorTypedSig, contractorDrawnSig, onInvoiceUpdate]);

  // Download invoice PDF
  const handleDownload = useCallback(async () => {
    try {
      const { generateInvoicePDF } = await import('@/lib/invoiceGenerator');
      const blob = await generateInvoicePDF(invoiceData);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceData.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Invoice downloaded!');
    } catch (err) {
      console.error('[InvoiceDialog] Download failed:', err);
      toast.error('Failed to download invoice');
    }
  }, [invoiceData]);

  // Save invoice to project documents
  const handleSaveToDocuments = useCallback(async () => {
    if (!projectId || !userId) return;

    setIsSaving(true);
    try {
      const { generateInvoicePDF } = await import('@/lib/invoiceGenerator');
      const blob = await generateInvoicePDF(invoiceData);

      const fileName = `invoice-${invoiceData.invoiceNumber}.pdf`;
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
      toast.success('Invoice saved to Documents!', { description: 'Find it in Panel 6' });
      onOpenChange(false);
    } catch (err) {
      console.error('[InvoiceDialog] Save failed:', err);
      toast.error('Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  }, [invoiceData, projectId, userId, onDocumentsReload, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Invoice #{invoiceData.invoiceNumber}
            {invoiceData.contractor?.hstNumber && (
              <Badge variant="outline" className="ml-2 text-xs font-normal text-muted-foreground">
                HST: {invoiceData.contractor.hstNumber}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex gap-4">
          {/* Edit Panel */}
          {editMode && (
            <div className="w-72 shrink-0 space-y-3 overflow-y-auto pr-2 border-r border-border mr-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Details</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={editFields.clientName} onChange={e => setEditFields(f => ({ ...f, clientName: e.target.value }))} className="h-8 text-sm" placeholder="Client name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={editFields.clientEmail} onChange={e => setEditFields(f => ({ ...f, clientEmail: e.target.value }))} className="h-8 text-sm" placeholder="client@email.com" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input value={editFields.clientPhone} onChange={e => setEditFields(f => ({ ...f, clientPhone: e.target.value }))} className="h-8 text-sm" placeholder="(xxx) xxx-xxxx" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Address</label>
                  <Input value={editFields.clientAddress} onChange={e => setEditFields(f => ({ ...f, clientAddress: e.target.value }))} className="h-8 text-sm" placeholder="Client address" />
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Options</p>
              <div>
                <label className="text-xs text-muted-foreground">Discount %</label>
                <Input type="number" min={0} max={100} value={editFields.discountPercent} onChange={e => setEditFields(f => ({ ...f, discountPercent: Number(e.target.value) || 0 }))} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea value={editFields.notes} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none" placeholder="Additional notes..." />
              </div>

              <Button onClick={handleApplyEdits} className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white mt-3" size="sm">
                <Check className="h-4 w-4" />
                Apply & Preview
              </Button>
            </div>
          )}

          {/* Preview */}
          <div className="flex-1 border rounded-lg bg-white overflow-hidden">
            <iframe srcDoc={invoiceHtml} className="w-full h-[500px] border-0" title="Invoice Preview" />
          </div>
        </div>

        {/* Signature Section */}
        {editMode && (
          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signatures</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Signature */}
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Client Signature</p>
                  <div className="flex gap-1">
                    <Button variant={signatureMode === 'type' ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2" onClick={() => setSignatureMode('type')}>Type</Button>
                    <Button variant={signatureMode === 'draw' ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2" onClick={() => setSignatureMode('draw')}>Draw</Button>
                  </div>
                </div>
                {signatureMode === 'type' ? (
                  <div>
                    <Input value={typedSignature} onChange={e => setTypedSignature(e.target.value)} className="h-10 text-xl bg-white dark:bg-slate-900" placeholder="Type client name..." style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive" }} />
                    {typedSignature && (
                      <div className="mt-2 h-12 flex items-end border-b border-muted-foreground/30 px-2">
                        <p className="text-2xl" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive", color: '#1e293b' }}>{typedSignature}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <SignatureCanvas onSignatureChange={setDrawnSignature} height={100} className="[&_canvas]:bg-white" />
                )}
              </div>

              {/* Contractor Signature */}
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Contractor Signature</p>
                  <div className="flex gap-1">
                    <Button variant={contractorSigMode === 'type' ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2" onClick={() => setContractorSigMode('type')}>Type</Button>
                    <Button variant={contractorSigMode === 'draw' ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2" onClick={() => setContractorSigMode('draw')}>Draw</Button>
                  </div>
                </div>
                {contractorSigMode === 'type' ? (
                  <div>
                    <Input value={contractorTypedSig} onChange={e => setContractorTypedSig(e.target.value)} className="h-10 text-xl bg-white dark:bg-slate-900" placeholder="Type contractor name..." style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive" }} />
                    {contractorTypedSig && (
                      <div className="mt-2 h-12 flex items-end border-b border-muted-foreground/30 px-2">
                        <p className="text-2xl" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive", color: '#1e293b' }}>{contractorTypedSig}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <SignatureCanvas onSignatureChange={setContractorDrawnSig} height={100} className="[&_canvas]:bg-white" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <DialogFooter className="flex-wrap gap-2 sm:gap-3 pt-4 border-t">
          {!editMode && (
            <Button variant="outline" onClick={() => setEditMode(true)} className="gap-2" size="sm">
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload} className="gap-2" size="sm" disabled={editMode}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleSaveToDocuments} disabled={isSaving || editMode} className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300" size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
            Save to Documents
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} size="sm">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
