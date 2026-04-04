// ============================================
// DocumentPreviewDialog — Document preview modal
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  FileImage,
  User,
  Calendar,
  Check,
  MessageSquare,
  Download,
  Send,
  Loader2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SignedImage, SignedIframe } from "./SignedMedia";
import { MaterialsLaborPreview } from "@/components/project-wizard/MaterialsLaborPreview";

interface PreviewDocumentData {
  file_name: string;
  file_path: string;
  category: string;
  citationId?: string;
  uploaded_by_name?: string;
  uploaded_by_role?: string;
  uploadedAt?: string;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
}

interface DocumentPreviewDialogProps {
  previewDocument: PreviewDocumentData | null;
  onClose: () => void;
  onFullscreenImage: (path: string) => void;
  onDownload: (filePath: string, fileName: string) => void;
  onSendDocument: (recipients: string[], note: string) => void;
  canEdit: boolean;
  teamMembers: TeamMember[];
  userId: string;
  isSendingDocument: boolean;
  selectedTeamRecipients: string[];
  setSelectedTeamRecipients: React.Dispatch<React.SetStateAction<string[]>>;
  documentMessageNote: string;
  setDocumentMessageNote: React.Dispatch<React.SetStateAction<string>>;
}

export function DocumentPreviewDialog({
  previewDocument,
  onClose,
  onFullscreenImage,
  onDownload,
  onSendDocument,
  canEdit,
  teamMembers,
  userId,
  isSendingDocument,
  selectedTeamRecipients,
  setSelectedTeamRecipients,
  documentMessageNote,
  setDocumentMessageNote,
}: DocumentPreviewDialogProps) {
  if (!previewDocument) return null;

  const isImage = previewDocument.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = previewDocument.file_name.match(/\.pdf$/i);
  const isMaterialsLabor = previewDocument.file_name.includes('materials-labor') && previewDocument.file_name.match(/\.txt$/i);

  return (
    <Dialog open={!!previewDocument} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? (
              <FileImage className="h-5 w-5 text-green-500" />
            ) : (
              <FileText className="h-5 w-5 text-red-500" />
            )}
            {previewDocument.file_name}
            {previewDocument.citationId && (
              <Badge variant="outline" className="text-[10px] ml-2">
                cite: [{previewDocument.citationId.slice(0, 8)}]
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Metadata bar */}
        {(previewDocument.uploaded_by_name || previewDocument.uploadedAt || previewDocument.uploaded_by_role) && (
          <div className="flex flex-wrap items-center gap-3 px-1 py-2 border-b text-xs text-muted-foreground">
            {previewDocument.uploaded_by_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {previewDocument.uploaded_by_name}
              </span>
            )}
            {previewDocument.uploaded_by_role && (
              <Badge variant="outline" className="text-[10px] h-5 capitalize">
                {previewDocument.uploaded_by_role}
              </Badge>
            )}
            {previewDocument.uploadedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {(() => {
                  try { return format(new Date(previewDocument.uploadedAt), 'MMM dd, yyyy HH:mm'); }
                  catch { return previewDocument.uploadedAt; }
                })()}
              </span>
            )}
            {previewDocument.category === 'verification' && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] h-5 border-emerald-300 dark:border-emerald-700">
                ✓ Verified
              </Badge>
            )}
          </div>
        )}

        {/* Preview content */}
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 min-h-[400px]">
          {isImage ? (
            <div
              className="cursor-zoom-in flex items-center justify-center h-full"
              onClick={() => onFullscreenImage(previewDocument.file_path)}
              title="Click to view fullscreen"
            >
              <SignedImage
                filePath={previewDocument.file_path}
                alt={previewDocument.file_name}
                className="max-w-full max-h-[60vh] mx-auto object-contain rounded-lg shadow-lg hover:shadow-2xl transition-shadow"
              />
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium opacity-0 hover:opacity-100 pointer-events-none transition-opacity">
                Click to view fullscreen
              </div>
            </div>
          ) : isPdf ? (
            <SignedIframe
              filePath={previewDocument.file_path}
              className="w-full h-[60vh] rounded-lg border"
              title={previewDocument.file_name}
            />
          ) : isMaterialsLabor ? (
            <MaterialsLaborPreview
              filePath={previewDocument.file_path}
              fileName={previewDocument.file_name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-16 w-16 mb-4" />
              <p className="text-sm">Preview not available for this file type</p>
              <p className="text-xs mt-1">Click Download to view the file</p>
            </div>
          )}
        </div>

        {/* Send to Team Members via In-App Messages */}
        {canEdit && teamMembers.length > 0 && (
          <div className="pt-4 border-t space-y-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Send to Team Members
            </p>

            {/* Team Members Selection */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Select recipients to send via in-app messages</p>
              <div className="flex flex-wrap gap-2">
                {teamMembers.filter(m => m.userId !== userId).map(member => {
                  const isSelected = selectedTeamRecipients.includes(member.userId);
                  return (
                    <button
                      key={member.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTeamRecipients(prev => prev.filter(id => id !== member.userId));
                        } else {
                          setSelectedTeamRecipients(prev => [...prev, member.userId]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-all",
                        isSelected
                          ? "bg-teal-100 border-teal-400 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                          : "bg-muted/50 border-muted-foreground/20 hover:border-teal-400"
                      )}
                    >
                      <div className="h-5 w-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{member.name}</span>
                      <Badge variant="outline" className="text-[8px] h-4 px-1">{member.role}</Badge>
                      {isSelected && <Check className="h-3.5 w-3.5 text-teal-600" />}
                    </button>
                  );
                })}
              </div>
              {selectedTeamRecipients.length > 0 && (
                <p className="text-[10px] text-teal-600">
                  {selectedTeamRecipients.length} team member{selectedTeamRecipients.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Optional message */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Message (optional)</label>
              <Input
                type="text"
                placeholder="Add a note about this file..."
                value={documentMessageNote}
                onChange={(e) => setDocumentMessageNote(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={() => onSendDocument(selectedTeamRecipients, documentMessageNote)}
              disabled={selectedTeamRecipients.length === 0 || isSendingDocument}
              className="w-full gap-2"
            >
              {isSendingDocument ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Send to {selectedTeamRecipients.length} Team Member{selectedTeamRecipients.length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          {isImage && (
            <Button
              variant="outline"
              onClick={() => onFullscreenImage(previewDocument.file_path)}
              className="gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onDownload(previewDocument.file_path, previewDocument.file_name)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="ghost" onClick={() => onClose()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}