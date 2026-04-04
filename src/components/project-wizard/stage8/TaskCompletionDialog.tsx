// ============================================
// TaskCompletionDialog — Task completion with optional verification photo
// Extracted from Stage8FinalReview.tsx
// ============================================

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Citation } from "@/types/citation";
import type { DocumentWithCategory } from "./types";
import { TASK_PHASES } from "./constants";

interface TaskCompletionDialogData {
  open: boolean;
  taskId: string;
  taskTitle: string;
  showUploader: boolean;
}

interface TaskCompletionDialogProps {
  dialog: TaskCompletionDialogData | null;
  onClose: () => void;
  onShowUploader: () => void;
  onConfirmTaskCompletion: (taskId: string) => void;
  projectId: string;
  userId: string;
  userRole: string;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  teamMembers: Array<{ userId: string; name: string; role: string }>;
  tasks: Array<{ id: string; title: string; phase: string; status: string; checklist: Array<{ id: string; text: string; done: boolean }> }>;
  setTasks: React.Dispatch<React.SetStateAction<any[]>>;
  setDocuments: React.Dispatch<React.SetStateAction<DocumentWithCategory[]>>;
  citations: Citation[];
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
}

export function TaskCompletionDialog({
  dialog,
  onClose,
  onShowUploader,
  onConfirmTaskCompletion,
  projectId,
  userId,
  userRole,
  isUploading,
  setIsUploading,
  teamMembers,
  tasks,
  setTasks,
  setDocuments,
  citations,
  setCitations,
}: TaskCompletionDialogProps) {
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !dialog) return;
    const taskId = dialog.taskId;
    setIsUploading(true);
    try {
      const file = files[0];
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${projectId}/verification/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const uploaderName = teamMembers.find(m => m.userId === userId)?.name || 'Unknown';
      const uploaderRole = userRole || 'member';
      const { data: docRecord, error: insertError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: userId,
          uploaded_by_name: uploaderName,
          uploaded_by_role: uploaderRole,
          mime_type: file.type || 'image/jpeg',
          ai_analysis_status: 'pending',
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // ── INSTANT AI CLASSIFICATION for verification photos ──
      supabase.functions.invoke('classify-document', {
        body: { documentId: docRecord.id, fileName: file.name, filePath, mimeType: file.type || 'image/jpeg' },
      }).then(({ data: classifyResult }) => {
        if (classifyResult?.success) {
          console.log(`[Stage8] ✓ Verification photo classified: ${classifyResult.ai_analysis_status}`);
          setDocuments(prev => prev.map(d =>
            d.id === docRecord.id
              ? { ...d, ai_analysis_status: classifyResult.ai_analysis_status, ai_analysis_result: { is_regulatory: classifyResult.is_regulatory, doc_type: classifyResult.doc_type, confidence: classifyResult.confidence, key_details: classifyResult.key_details } }
              : d
          ));
          if (classifyResult.ai_analysis_status === 'rejected_non_regulatory') {
            toast.error(`⚠ Verification photo rejected: ${classifyResult.doc_type}`, { duration: 6000 });
          }
        }
      }).catch(() => {});

      const taskInfo = tasks.find(t => t.id === taskId);
      const phaseInfo = taskInfo ? TASK_PHASES.find(p => p.key === taskInfo.phase) : null;
      const newCitation: Citation = {
        id: `doc-${docRecord.id}`,
        cite_type: 'VISUAL_VERIFICATION' as any,
        question_key: 'task_photo_upload',
        answer: `Task Verification Photo: ${taskInfo?.title || ''}`,
        value: filePath,
        timestamp: new Date().toISOString(),
        metadata: {
          category: 'verification',
          fileName: file.name,
          fileSize: file.size,
          taskId,
          taskTitle: taskInfo?.title,
          phase: taskInfo?.phase,
          phaseLabel: phaseInfo?.label || taskInfo?.phase,
          uploadedBy: uploaderName,
          uploadedByRole: uploaderRole,
        },
      };
      const newDoc: DocumentWithCategory = {
        id: docRecord.id,
        file_name: file.name,
        file_path: filePath,
        category: 'verification',
        citationId: newCitation.id,
        uploadedAt: new Date().toISOString(),
        uploaded_by_name: uploaderName,
        uploaded_by_role: uploaderRole,
      };
      setDocuments(prev => [...prev, newDoc]);
      setCitations(prev => {
        const updated = [...prev, newCitation];
        supabase
          .from('project_summaries')
          .update({ verified_facts: updated as any })
          .eq('project_id', projectId)
          .then(({ error }) => {
            if (error) console.error('[Stage8] Failed to persist citation:', error);
          });
        return updated;
      });
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            checklist: t.checklist.map((item: any) =>
              item.id === `${taskId}-verify` ? { ...item, done: true } : item
            ),
          };
        }
        return t;
      }));

      await onConfirmTaskCompletion(taskId);
      onClose();
      toast.success(`Photo uploaded & task completed ✓`);
    } catch (err) {
      console.error('[Stage8] Task photo upload failed:', err);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <AlertDialog
      open={!!dialog?.open}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            Complete Task
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {!dialog?.showUploader ? (
              <p>
                <span className="font-semibold text-foreground">"{dialog?.taskTitle}"</span>
                <br />
                Would you like to upload a verification photo?
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">Upload a photo to verify completion:</p>
                <label
                  htmlFor="task-completion-photo-input"
                  className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <Camera className="h-10 w-10 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Tap to take or select photo</span>
                </label>
                <input
                  id="task-completion-photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!dialog?.showUploader ? (
            <>
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => {
                  if (dialog) {
                    onConfirmTaskCompletion(dialog.taskId);
                    onClose();
                  }
                }}
              >
                No
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onShowUploader}
              >
                <Camera className="h-4 w-4 mr-1" />
                Yes, upload photo
              </Button>
            </>
          ) : (
            <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
