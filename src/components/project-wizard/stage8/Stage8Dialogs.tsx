import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Citation } from "@/types/citation";
import { WeatherMapModal } from "@/components/WeatherMapModal";
import { RequestModificationDialog } from "@/components/projects/RequestModificationDialog";
import { PendingApprovalModal } from "@/components/projects/PendingApprovalModal";
import { ConflictMapModal } from "@/components/project-wizard/ConflictMapModal";
import { OwnerLockModal } from "@/components/OwnerLockModal";
import { ProjectMessaChat } from "@/components/project-wizard/ProjectMessaChat";
import { AIEngineReportModal, type AIEngineType } from "@/components/project-wizard/AIEngineReportModal";
import { ContractPreviewDialog } from "./ContractPreviewDialog";
import { ContractEmailDialog } from "./ContractEmailDialog";
import { ContractDeleteDialog } from "./ContractDeleteDialog";
import { InvoicePreviewDialog } from "./InvoicePreviewDialog";
import { SummaryPreviewDialog } from "./SummaryPreviewDialog";
import { MessaSynthesisDialog } from "./MessaSynthesisDialog";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";
import { DnaReportPreviewDialog } from "./DnaReportPreviewDialog";
import { SiteIntelPreviewDialog } from "./SiteIntelPreviewDialog";
import { TaskCompletionDialog } from "./TaskCompletionDialog";
import { SignedImage } from "./SignedMedia";
import type { DocumentCategory, PanelConfig } from "./types";
import { InvoiceData } from "@/lib/invoiceGenerator";

interface Stage8DialogsProps {
  // IDs
  projectId: string;
  userId: string;
  userRole: string;
  citations: Citation[];
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;

  // Fullscreen panel
  fullscreenPanel: string | null;
  setFullscreenPanel: (v: string | null) => void;
  fullscreenPanelConfig: PanelConfig | undefined | null;
  renderFullscreenContent: (panel: PanelConfig | undefined | null) => React.ReactNode;

  // Weather modal
  weatherModalOpen: boolean;
  setWeatherModalOpen: (v: boolean) => void;
  weatherModalTab: string;
  projectData: any;

  // Document preview
  previewDocument: {
    file_name: string;
    file_path: string;
    category: string;
    citationId?: string;
    uploaded_by_name?: string;
    uploaded_by_role?: string;
    uploadedAt?: string;
  } | null;
  setPreviewDocument: (v: any) => void;
  handleDownloadDocument: (path: string, name: string) => void;
  getDocumentSignedUrl: (path: string) => Promise<string | null>;
  canEdit: boolean;
  teamMembers: any[];
  isSendingDocument: boolean;
  setIsSendingDocument: (v: boolean) => void;
  selectedTeamRecipients: string[];
  setSelectedTeamRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  documentMessageNote: string;
  setDocumentMessageNote: (v: string) => void;

  // Fullscreen image
  fullscreenImagePath: string | null;
  setFullscreenImagePath: (v: string | null) => void;

  // Contract email
  showContractEmailDialog: boolean;
  setShowContractEmailDialog: (v: boolean) => void;
  selectedContractForEmail: any;
  setSelectedContractForEmail: (v: any) => void;
  contractRecipients: { email: string; name: string }[];
  setContractRecipients: React.Dispatch<React.SetStateAction<{ email: string; name: string }[]>>;
  isSendingToMultiple: boolean;
  handleSendContractToMultiple: () => void;

  // Contract preview
  showContractPreview: boolean;
  setShowContractPreview: (v: boolean) => void;
  contractStep: 'select_member' | 'preview';
  setContractStep: (v: 'select_member' | 'preview') => void;
  selectedContractMember: any;
  setSelectedContractMember: (v: any) => void;
  selectedContractType: string | null;
  setSelectedContractType: (v: string | null) => void;
  generateContractPreviewData: any;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientName: string;
  setClientName: (v: string) => void;
  contractScopeOfWork: string;
  setContractScopeOfWork: (v: string) => void;
  contractPaymentTerms: string;
  setContractPaymentTerms: (v: string) => void;
  contractAdditionalTerms: string;
  setContractAdditionalTerms: (v: string) => void;
  contractDeposit: string;
  setContractDeposit: (v: string) => void;
  contractorSignatureData: string | null;
  setContractorSignatureData: (v: string | null) => void;
  contractClientPhone: string;
  setContractClientPhone: (v: string) => void;
  contractClientAddress: string;
  setContractClientAddress: (v: string) => void;
  isGeneratingContract: boolean;
  setIsGeneratingContract: (v: boolean) => void;
  isSendingContract: boolean;
  setIsSendingContract: (v: boolean) => void;
  financialSummary: any;
  ownerProfile: any;
  userProfile: any;
  setContracts: React.Dispatch<React.SetStateAction<any[]>>;

  // Invoice
  showInvoicePreview: boolean;
  setShowInvoicePreview: (v: boolean) => void;
  invoicePreviewData: InvoiceData | null;
  setInvoicePreviewData: (v: InvoiceData | null) => void;
  invoicePreviewHtml: string;
  setInvoicePreviewHtml: (v: string) => void;
  reloadDocuments: () => Promise<void>;
  categorizeDocument: (name: string, path: string) => DocumentCategory;

  // Summary
  showSummaryPreview: boolean;
  setShowSummaryPreview: (v: boolean) => void;
  summaryPreviewHtml: string;

  // MESSA
  showMessaPreview: boolean;
  setShowMessaPreview: (v: boolean) => void;
  messaSynthesisData: any;
  messaPreviewHtml: string;

  // Modification dialog
  modificationDialog: { open: boolean; material?: any } | null;
  setModificationDialog: (v: any) => void;
  createPendingChange: (data: any) => Promise<void>;

  // Pending approval
  showPendingApprovalModal: boolean;
  setShowPendingApprovalModal: (v: boolean) => void;
  pendingApprovalShownRef: React.MutableRefObject<boolean>;
  pendingChanges: any[];
  approveChange: (id: string) => Promise<void>;
  rejectChange: (id: string, notes?: string) => Promise<void>;

  // Conflict map
  showConflictMap: boolean;
  setShowConflictMap: (v: boolean) => void;

  // Contract delete
  contractToDelete: any;
  setContractToDelete: (v: any) => void;

  // DNA report
  showDnaPreviewDialog: boolean;
  setShowDnaPreviewDialog: (v: boolean) => void;
  dnaReportHtml: string;
  dnaReportBlobUrl: string | null;
  dnaReportFilename: string;
  showDnaEmailDialog: boolean;
  setShowDnaEmailDialog: (v: boolean) => void;
  dnaEmailClientName: string;
  setDnaEmailClientName: (v: string) => void;
  dnaEmailClientEmail: string;
  setDnaEmailClientEmail: (v: string) => void;
  isSendingDnaEmail: boolean;
  handleSendDnaReportEmail: () => void;

  // Site intel
  showSiteIntelPreviewDialog: boolean;
  setShowSiteIntelPreviewDialog: (v: boolean) => void;
  siteIntelHtml: string;
  siteIntelBlobUrl: string | null;
  siteIntelFilename: string;

  // Task completion
  taskCompletionDialog: {
    open: boolean;
    taskId: string;
    taskTitle: string;
    showUploader: boolean;
  } | null;
  setTaskCompletionDialog: (v: any) => void;
  confirmTaskCompletion: (taskId: string, photoFile?: File) => Promise<void>;

  // Owner lock
  ownerLockOpen: boolean;
  setOwnerLockOpen: (v: boolean) => void;
  handleOwnerLockAuthorized: () => void;

  // Project MESSA chat
  showProjectMessa: boolean;
  setShowProjectMessa: (v: boolean) => void;
  messaInsights: any;

  // AI Engine report
  aiEngineModalOpen: boolean;
  setAiEngineModalOpen: (v: boolean) => void;
  activeAiEngine: AIEngineType | null;
  tasks: any[];
  documents: any[];
}

export function Stage8Dialogs(props: Stage8DialogsProps) {
  const {
    projectId, userId, userRole, citations, setCitations,
    fullscreenPanel, setFullscreenPanel, fullscreenPanelConfig, renderFullscreenContent,
    weatherModalOpen, setWeatherModalOpen, weatherModalTab, projectData,
    previewDocument, setPreviewDocument, handleDownloadDocument, getDocumentSignedUrl,
    canEdit, teamMembers, isSendingDocument, setIsSendingDocument,
    selectedTeamRecipients, setSelectedTeamRecipients, documentMessageNote, setDocumentMessageNote,
    fullscreenImagePath, setFullscreenImagePath,
    showContractEmailDialog, setShowContractEmailDialog, selectedContractForEmail,
    contractRecipients, setContractRecipients, isSendingToMultiple, handleSendContractToMultiple,
    showContractPreview, setShowContractPreview, contractStep, setContractStep,
    selectedContractMember, setSelectedContractMember, selectedContractType, setSelectedContractType,
    generateContractPreviewData, clientEmail, setClientEmail, clientName, setClientName,
    contractScopeOfWork, setContractScopeOfWork, contractPaymentTerms, setContractPaymentTerms,
    contractAdditionalTerms, setContractAdditionalTerms, contractDeposit, setContractDeposit,
    contractorSignatureData, setContractorSignatureData, contractClientPhone, setContractClientPhone,
    contractClientAddress, setContractClientAddress, isGeneratingContract, setIsGeneratingContract,
    isSendingContract, setIsSendingContract, financialSummary, ownerProfile, userProfile, setContracts,
    showInvoicePreview, setShowInvoicePreview, invoicePreviewData, setInvoicePreviewData,
    invoicePreviewHtml, setInvoicePreviewHtml, reloadDocuments, categorizeDocument,
    showSummaryPreview, setShowSummaryPreview, summaryPreviewHtml,
    showMessaPreview, setShowMessaPreview, messaSynthesisData, messaPreviewHtml,
    modificationDialog, setModificationDialog, createPendingChange,
    showPendingApprovalModal, setShowPendingApprovalModal, pendingApprovalShownRef,
    pendingChanges, approveChange, rejectChange,
    showConflictMap, setShowConflictMap,
    contractToDelete, setContractToDelete,
    showDnaPreviewDialog, setShowDnaPreviewDialog, dnaReportHtml, dnaReportBlobUrl, dnaReportFilename,
    showDnaEmailDialog, setShowDnaEmailDialog, dnaEmailClientName, setDnaEmailClientName,
    dnaEmailClientEmail, setDnaEmailClientEmail, isSendingDnaEmail, handleSendDnaReportEmail,
    showSiteIntelPreviewDialog, setShowSiteIntelPreviewDialog, siteIntelHtml, siteIntelBlobUrl, siteIntelFilename,
    taskCompletionDialog, setTaskCompletionDialog, confirmTaskCompletion,
    ownerLockOpen, setOwnerLockOpen, handleOwnerLockAuthorized,
    showProjectMessa, setShowProjectMessa, messaInsights,
    aiEngineModalOpen, setAiEngineModalOpen, activeAiEngine,
    tasks, documents,
  } = props;

  return (
    <>
      {/* ═══ FULLSCREEN PANEL DIALOG ═══ */}
      <Dialog open={!!fullscreenPanel} onOpenChange={(open) => { if (!open) setFullscreenPanel(null); }}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 z-[9999]">
          {fullscreenPanelConfig && renderFullscreenContent(fullscreenPanelConfig)}
        </DialogContent>
      </Dialog>

      {/* Contract Preview Dialog */}
      <ContractPreviewDialog
        open={showContractPreview}
        onOpenChange={(open) => { setShowContractPreview(open); if (!open) { setContractStep('select_member'); setSelectedContractMember(null); } }}
        contractStep={contractStep}
        setContractStep={setContractStep}
        selectedContractMember={selectedContractMember}
        setSelectedContractMember={setSelectedContractMember}
        selectedContractType={selectedContractType}
        setSelectedContractType={setSelectedContractType}
        teamMembers={teamMembers}
        generateContractPreviewData={generateContractPreviewData}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        clientName={clientName}
        setClientName={setClientName}
        contractScopeOfWork={contractScopeOfWork}
        setContractScopeOfWork={setContractScopeOfWork}
        contractPaymentTerms={contractPaymentTerms}
        setContractPaymentTerms={setContractPaymentTerms}
        contractAdditionalTerms={contractAdditionalTerms}
        setContractAdditionalTerms={setContractAdditionalTerms}
        contractDeposit={contractDeposit}
        setContractDeposit={setContractDeposit}
        contractorSignatureData={contractorSignatureData}
        setContractorSignatureData={setContractorSignatureData}
        contractClientPhone={contractClientPhone}
        setContractClientPhone={setContractClientPhone}
        contractClientAddress={contractClientAddress}
        setContractClientAddress={setContractClientAddress}
        isGeneratingContract={isGeneratingContract}
        setIsGeneratingContract={setIsGeneratingContract}
        isSendingContract={isSendingContract}
        setIsSendingContract={setIsSendingContract}
        financialSummary={financialSummary}
        ownerProfile={ownerProfile}
        userProfile={userProfile}
        projectId={projectId}
        userId={userId}
        citations={citations}
        setCitations={setCitations}
        setContracts={setContracts}
      />

      {/* Site Log & Location Modal */}
      {weatherModalOpen && (
        <WeatherMapModal
          open={weatherModalOpen}
          onOpenChange={setWeatherModalOpen}
          initialTab={weatherModalTab}
          location={citations.find(c => c.cite_type === 'LOCATION')?.answer || undefined}
          lat={(citations.find(c => c.cite_type === 'LOCATION')?.metadata?.coordinates as any)?.lat || undefined}
          lon={(citations.find(c => c.cite_type === 'LOCATION')?.metadata?.coordinates as any)?.lng || undefined}
          projectName={projectData?.name || 'Project'}
          projectId={projectId}
        />
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewDialog
        previewDocument={previewDocument}
        onClose={() => setPreviewDocument(null)}
        onFullscreenImage={(path) => setFullscreenImagePath(path)}
        onDownload={handleDownloadDocument}
        onSendDocument={async (recipients, note) => {
          if (recipients.length === 0 || !previewDocument) {
            toast.error('Please select at least one team member');
            return;
          }
          setIsSendingDocument(true);
          try {
            const attachmentUrl = await getDocumentSignedUrl(previewDocument.file_path);
            if (!attachmentUrl) {
              toast.error('Failed to generate document link');
              setIsSendingDocument(false);
              return;
            }
            const messageText = note
              ? `${note}\n\n📎 ${previewDocument.file_name}`
              : `📎 Shared file: ${previewDocument.file_name}`;
            const results = await Promise.allSettled(
              recipients.map(recipientId =>
                supabase.from('team_messages').insert({
                  sender_id: userId,
                  recipient_id: recipientId,
                  message: messageText,
                  attachment_url: attachmentUrl,
                  attachment_name: previewDocument.file_name,
                })
              )
            );
            const successCount = results.filter(r => r.status === 'fulfilled' && !(r.value as any).error).length;
            const failCount = recipients.length - successCount;
            if (failCount === 0) {
              toast.success(`File sent to ${successCount} team member${successCount > 1 ? 's' : ''}`, { description: 'They will see it in their Messages' });
            } else if (successCount > 0) {
              toast.warning(`Sent to ${successCount}, failed for ${failCount}`);
            } else {
              toast.error('Failed to send file');
            }
            setPreviewDocument(null);
            setSelectedTeamRecipients([]);
            setDocumentMessageNote('');
          } catch (err) {
            console.error('[Stage8] Send document to team failed:', err);
            toast.error('Failed to send document');
          } finally {
            setIsSendingDocument(false);
          }
        }}
        canEdit={canEdit}
        teamMembers={teamMembers}
        userId={userId}
        isSendingDocument={isSendingDocument}
        selectedTeamRecipients={selectedTeamRecipients}
        setSelectedTeamRecipients={setSelectedTeamRecipients}
        documentMessageNote={documentMessageNote}
        setDocumentMessageNote={setDocumentMessageNote}
      />

      {/* Fullscreen Image Lightbox */}
      {fullscreenImagePath && (
        <div
          className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center cursor-zoom-out"
          onClick={() => setFullscreenImagePath(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setFullscreenImagePath(null)}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <SignedImage
            filePath={fullscreenImagePath}
            alt="Full preview"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
          />
        </div>
      )}

      {/* Contract Email Dialog */}
      <ContractEmailDialog
        open={showContractEmailDialog}
        onOpenChange={setShowContractEmailDialog}
        selectedContract={selectedContractForEmail}
        contractRecipients={contractRecipients}
        setContractRecipients={setContractRecipients}
        teamMembers={teamMembers}
        isSendingToMultiple={isSendingToMultiple}
        onSend={handleSendContractToMultiple}
      />

      {/* Invoice Preview Modal */}
      {showInvoicePreview && invoicePreviewData && (
        <InvoicePreviewDialog
          open={showInvoicePreview}
          onOpenChange={setShowInvoicePreview}
          invoiceData={invoicePreviewData}
          invoiceHtml={invoicePreviewHtml}
          projectId={projectId}
          userId={userId}
          onInvoiceUpdate={(data, html) => {
            setInvoicePreviewData(data);
            setInvoicePreviewHtml(html);
          }}
          onDocumentsReload={reloadDocuments}
          categorizeDocument={categorizeDocument}
        />
      )}

      {/* Project Summary Preview Modal */}
      {showSummaryPreview && summaryPreviewHtml && (
        <SummaryPreviewDialog
          open={showSummaryPreview}
          onOpenChange={setShowSummaryPreview}
          summaryHtml={summaryPreviewHtml}
          projectId={projectId}
          userId={userId}
          projectName={projectData?.name || ''}
          onDocumentsReload={reloadDocuments}
          categorizeDocument={categorizeDocument}
        />
      )}

      {/* M.E.S.S.A. Synthesis Preview Modal */}
      {showMessaPreview && messaSynthesisData && (
        <MessaSynthesisDialog
          open={showMessaPreview}
          onOpenChange={setShowMessaPreview}
          data={messaSynthesisData}
          previewHtml={messaPreviewHtml}
          projectId={projectId}
        />
      )}

      {/* Foreman Modification Dialog */}
      {modificationDialog?.open && modificationDialog.material && (
        <RequestModificationDialog
          open={modificationDialog.open}
          onOpenChange={(open) => { if (!open) setModificationDialog(null); }}
          itemName={modificationDialog.material.name}
          currentValue={modificationDialog.material.qty}
          unit={modificationDialog.material.unit}
          onSubmit={async (newValue: number, reason: string) => {
            await createPendingChange({
              itemType: 'material',
              itemId: `material_${modificationDialog.material.idx}`,
              itemName: modificationDialog.material.name,
              originalQuantity: modificationDialog.material.qty,
              newQuantity: newValue,
              changeReason: reason,
            });
          }}
        />
      )}

      {/* Pending Approval Modal */}
      <PendingApprovalModal
        open={showPendingApprovalModal}
        onOpenChange={(open) => {
          setShowPendingApprovalModal(open);
          if (!open) pendingApprovalShownRef.current = false;
        }}
        pendingChanges={pendingChanges}
        onApprove={approveChange}
        onReject={rejectChange}
        loading={false}
      />

      {/* Conflict Map Modal */}
      <ConflictMapModal
        open={showConflictMap}
        onOpenChange={setShowConflictMap}
        citations={citations}
        projectData={projectData}
      />

      {/* Contract Delete Dialog */}
      <ContractDeleteDialog
        contract={contractToDelete}
        onClose={() => setContractToDelete(null)}
        setContracts={setContracts}
        setCitations={setCitations}
      />

      {/* DNA Report Preview Dialog */}
      <DnaReportPreviewDialog
        open={showDnaPreviewDialog}
        onOpenChange={setShowDnaPreviewDialog}
        dnaReportHtml={dnaReportHtml}
        dnaReportBlobUrl={dnaReportBlobUrl}
        dnaReportFilename={dnaReportFilename}
        showDnaEmailDialog={showDnaEmailDialog}
        setShowDnaEmailDialog={setShowDnaEmailDialog}
        dnaEmailClientName={dnaEmailClientName}
        setDnaEmailClientName={setDnaEmailClientName}
        dnaEmailClientEmail={dnaEmailClientEmail}
        setDnaEmailClientEmail={setDnaEmailClientEmail}
        isSendingDnaEmail={isSendingDnaEmail}
        handleSendDnaReportEmail={handleSendDnaReportEmail}
      />

      {/* Site Intel Preview Dialog */}
      <SiteIntelPreviewDialog
        open={showSiteIntelPreviewDialog}
        onOpenChange={setShowSiteIntelPreviewDialog}
        siteIntelHtml={siteIntelHtml}
        siteIntelBlobUrl={siteIntelBlobUrl}
        siteIntelFilename={siteIntelFilename}
      />

      {/* Task Completion Dialog */}
      <TaskCompletionDialog
        dialog={taskCompletionDialog}
        onClose={() => setTaskCompletionDialog(null)}
        onConfirm={confirmTaskCompletion}
        projectId={projectId}
      />

      {/* Owner Lock Modal */}
      <OwnerLockModal
        open={ownerLockOpen}
        onOpenChange={setOwnerLockOpen}
        onAuthorized={handleOwnerLockAuthorized}
      />

      {/* Project MESSA Chat */}
      {showProjectMessa && (
        <ProjectMessaChat
          projectId={projectId}
          userId={userId}
          isOwner={userRole === 'owner'}
          open={showProjectMessa}
          onOpenChange={setShowProjectMessa}
          messaInsights={messaInsights}
        />
      )}

      {/* AI Engine Report Modal */}
      <AIEngineReportModal
        open={aiEngineModalOpen}
        onOpenChange={setAiEngineModalOpen}
        engineType={activeAiEngine}
        projectId={projectId}
        citations={citations}
        tasks={tasks}
        documents={documents}
        teamMembers={teamMembers}
      />
    </>
  );
}
