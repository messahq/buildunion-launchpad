// ============================================
// STAGE 8: Extracted Utility Handlers
// ============================================

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Citation } from "@/types/citation";
import { DOCUMENT_CATEGORIES, TASK_PHASES } from "./constants";
import type { DocumentCategory, DocumentWithCategory, TaskWithChecklist } from "./types";

// ── IMMUTABLE CITATION TYPES: Cannot be edited mid-project ──
const IMMUTABLE_CITATION_TYPES = ['GFA_LOCK'];

interface UseStage8HandlersParams {
  projectId: string;
  userId: string;
  userRole: string;
  citations: Citation[];
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
  tasks: TaskWithChecklist[];
  setTasks: React.Dispatch<React.SetStateAction<TaskWithChecklist[]>>;
  documents: DocumentWithCategory[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentWithCategory[]>>;
  teamMembers: { id: string; name: string; role: string; userId: string }[];
  canEdit: boolean;
  selectedUploadCategory: DocumentCategory;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  editingField: string | null;
  setEditingField: React.Dispatch<React.SetStateAction<string | null>>;
  editValue: string;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
  clientEmail: string;
  clientName: string;
  projectData: any;
}

export function useStage8Handlers({
  projectId, userId, userRole,
  citations, setCitations,
  tasks, setTasks,
  documents, setDocuments,
  teamMembers,
  canEdit,
  selectedUploadCategory,
  setIsUploading, setIsSaving,
  editingField, setEditingField,
  editValue, setEditValue,
  clientEmail, clientName, projectData,
}: UseStage8HandlersParams) {

  // ✓ Download document from storage
  const handleDownloadDocument = useCallback(async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${fileName}`);
    } catch (err) {
      console.error('[Stage8] Download failed:', err);
      toast.error('Failed to download file');
    }
  }, []);

  // ✓ Get signed URL for document preview (bucket is private)
  const getDocumentPreviewUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 60 * 60);
      if (error || !data?.signedUrl) {
        console.error('[Stage8] Failed to create preview signed URL:', error);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error('[Stage8] Preview URL error:', err);
      return null;
    }
  }, []);

  // ✓ Get signed URL for document sharing (long expiry for message attachments)
  const getDocumentSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (error || !data?.signedUrl) {
        console.error('[Stage8] Failed to create signed URL:', error);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error('[Stage8] Signed URL error:', err);
      return null;
    }
  }, []);

  // ✓ Send document via email
  const handleSendDocument = useCallback(async (doc: { file_name: string; file_path: string }, setPreviewDocument: (v: any) => void, setIsSendingDocument: (v: boolean) => void) => {
    if (!clientEmail) {
      toast.error('Please enter client email first');
      return;
    }
    setIsSendingDocument(true);
    try {
      const publicUrl = getDocumentPreviewUrl(doc.file_path);
      const response = await supabase.functions.invoke('send-contract-email', {
        body: {
          recipientEmail: clientEmail,
          recipientName: clientName || 'Client',
          subject: `Document: ${doc.file_name}`,
          projectName: projectData?.name || 'Project',
          documentUrl: publicUrl,
          documentName: doc.file_name,
        }
      });
      if (response.error) throw response.error;
      toast.success(`Document sent to ${clientEmail}`);
      setPreviewDocument(null);
    } catch (err) {
      console.error('[Stage8] Send document failed:', err);
      toast.error('Failed to send document');
    } finally {
      setIsSendingDocument(false);
    }
  }, [clientEmail, clientName, projectData, getDocumentPreviewUrl]);

  // ✓ Send contract to multiple recipients
  const handleSendContractToMultiple = useCallback(async (
    selectedContractForEmail: { id: string; contract_number: string; total_amount?: number | null } | null,
    contractRecipients: { email: string; name: string }[],
    setIsSendingToMultiple: (v: boolean) => void,
    setShowContractEmailDialog: (v: boolean) => void,
    setSelectedContractForEmail: (v: any) => void,
    setContractRecipients: (v: any) => void,
  ) => {
    if (!selectedContractForEmail) {
      toast.error('No contract selected');
      return;
    }
    const validRecipients = contractRecipients.filter(r => r.email && r.email.includes('@'));
    if (validRecipients.length === 0) {
      toast.error('Please add at least one valid email recipient');
      return;
    }
    setIsSendingToMultiple(true);
    try {
      const { data: contract } = await supabase
        .from('contracts')
        .select('share_token, contractor_name')
        .eq('id', selectedContractForEmail.id)
        .single();
      if (!contract?.share_token) {
        toast.error('Contract share link not found');
        return;
      }
      const contractUrl = `${window.location.origin}/contract/sign?token=${contract.share_token}`;
      const results = await Promise.allSettled(
        validRecipients.map(recipient =>
          supabase.functions.invoke('send-contract-email', {
            body: {
              clientEmail: recipient.email,
              clientName: recipient.name || 'Client',
              contractorName: contract.contractor_name || 'Contractor',
              projectName: projectData?.name || 'Project',
              contractUrl,
              totalAmount: selectedContractForEmail.total_amount,
              contractId: selectedContractForEmail.id,
            }
          })
        )
      );
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      if (failCount === 0) {
        toast.success(`Contract sent to ${successCount} recipient${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Sent to ${successCount}, failed for ${failCount}`);
      } else {
        toast.error('Failed to send contract');
      }
      await supabase
        .from('contracts')
        .update({ sent_to_client_at: new Date().toISOString() })
        .eq('id', selectedContractForEmail.id);
      setShowContractEmailDialog(false);
      setSelectedContractForEmail(null);
      setContractRecipients([{ email: '', name: '' }]);
    } catch (err) {
      console.error('[Stage8] Send to multiple failed:', err);
      toast.error('Failed to send contract');
    } finally {
      setIsSendingToMultiple(false);
    }
  }, [projectData]);

  // Update task checklist item — persists status changes to DB + generates citations for DNA tracking
  const updateChecklistItem = useCallback(async (taskId: string, checklistItemId: string, done: boolean) => {
    if (checklistItemId.includes('-verify')) {
      if (done) {
        toast.info('Upload a verification photo using the 📷 button to verify this task');
        return;
      }
      return;
    }
    const isStartItem = checklistItemId.includes('-start');
    const isCompleteItem = checklistItemId.includes('-complete');
    let newStatus: string | null = null;
    if (isCompleteItem && done) newStatus = 'completed';
    else if (isCompleteItem && !done) newStatus = 'in_progress';
    else if (isStartItem && done) newStatus = 'in_progress';
    else if (isStartItem && !done) newStatus = 'pending';

    const taskInfo = tasks.find(t => t.id === taskId);
    const memberName = teamMembers.find(m => m.userId === (taskInfo?.assigned_to || userId))?.name || 'Unknown';

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: newStatus || task.status,
          checklist: task.checklist.map(item =>
            item.id === checklistItemId ? { ...item, done } : item
          ),
        };
      }
      return task;
    }));

    if (newStatus) {
      try {
        const { error } = await supabase
          .from('project_tasks')
          .update({ status: newStatus })
          .eq('id', taskId);
        if (error) throw error;
        console.log(`[Stage8] ✓ Task ${taskId} status → ${newStatus}`);

        if (done && taskInfo) {
          const citeType = isStartItem ? 'TASK_STARTED' : 'TASK_COMPLETED';
          const eventLabel = isStartItem ? 'started' : 'completed';
          const now = new Date().toISOString();
          const progressCitation: Citation = {
            id: `cite_${citeType.toLowerCase()}_${taskId}_${Date.now()}`,
            cite_type: citeType as any,
            question_key: 'task_progress',
            answer: `${taskInfo.title} ${eventLabel} by ${memberName}`,
            value: taskId,
            timestamp: now,
            metadata: {
              taskId,
              taskTitle: taskInfo.title,
              phase: taskInfo.phase,
              eventType: eventLabel,
              performedBy: taskInfo.assigned_to || userId,
              performedByName: memberName,
              eventTimestamp: now,
            },
          };
          setCitations(prev => {
            const updated = [...prev, progressCitation];
            supabase
              .from('project_summaries')
              .update({ verified_facts: updated as any })
              .eq('project_id', projectId)
              .then(({ error: persistErr }) => {
                if (persistErr) console.error('[Stage8] Failed to persist task citation:', persistErr);
                else console.log(`[Stage8] ✓ ${citeType} citation persisted for "${taskInfo.title}"`);
              });
            return updated;
          });
        }
      } catch (err) {
        console.error('[Stage8] Failed to update task status:', err);
        toast.error('Failed to save task status');
      }
    }
  }, [tasks, teamMembers, userId, projectId]);

  // Confirm task completion — called from dialog (with or without photo)
  const confirmTaskCompletion = useCallback(async (taskId: string) => {
    const newStatus = 'completed';
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      const taskInfo = tasks.find(t => t.id === taskId);
      if (taskInfo) {
        const memberName = teamMembers.find(m => m.userId === taskInfo.assigned_to)?.name || 'Unknown';
        const now = new Date().toISOString();
        const progressCitation: Citation = {
          id: `cite_task_completed_${taskId}_${Date.now()}`,
          cite_type: 'TASK_COMPLETED' as any,
          question_key: 'task_progress',
          answer: `${taskInfo.title} completed by ${memberName}`,
          value: taskId,
          timestamp: now,
          metadata: {
            taskId,
            taskTitle: taskInfo.title,
            phase: taskInfo.phase,
            eventType: 'completed',
            performedBy: taskInfo.assigned_to || userId,
            performedByName: memberName,
            eventTimestamp: now,
          },
        };
        setCitations(prev => {
          const updated = [...prev, progressCitation];
          supabase
            .from('project_summaries')
            .update({ verified_facts: updated as any })
            .eq('project_id', projectId)
            .then(({ error: persistErr }) => {
              if (persistErr) console.error('[Stage8] Failed to persist task citation:', persistErr);
              else console.log(`[Stage8] ✓ TASK_COMPLETED citation for "${taskInfo.title}"`);
            });
          return updated;
        });
      }
      toast.success(`Task "${taskInfo?.title || ''}" completed ✓`);
    } catch (err) {
      console.error('[Stage8] Failed to complete task:', err);
      toast.error('Failed to complete task');
    }
  }, [tasks, teamMembers, userId, projectId]);

  // Update task assignee
  const updateTaskAssignee = useCallback(async (taskId: string, assigneeId: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ assigned_to: assigneeId })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, assigned_to: assigneeId } : task
      ));
      toast.success('Assignee updated');
    } catch (err) {
      console.error('[Stage8] Failed to update assignee:', err);
      toast.error('Failed to update assignee');
    }
  }, []);

  // Handle file upload - auto-categorize images to Visual
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    const canUpload = userRole === 'owner' || userRole === 'foreman' || userRole === 'subcontractor' || userRole === 'worker' || userRole === 'inspector' || userRole === 'supplier';
    if (!files || files.length === 0 || !canUpload) return;
    setIsUploading(true);
    try {
      const newCitations: Citation[] = [];
      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${projectId}/${fileName}`;
        const isImage = file.type.startsWith('image/') || !!file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|svg)$/i);
        const finalCategory: DocumentCategory = isImage ? 'visual' : selectedUploadCategory;
        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: docRecord, error: insertError } = await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            ai_analysis_status: 'pending',
          })
          .select()
          .single();
        if (insertError) throw insertError;

        // ── INSTANT AI CLASSIFICATION — fire-and-forget ──
        const docId = docRecord.id;
        supabase.functions.invoke('classify-document', {
          body: { documentId: docId, fileName: file.name, filePath, mimeType: file.type },
        }).then(({ data: classifyResult }) => {
          if (classifyResult?.success) {
            console.log(`[Stage8] ✓ AI classified "${file.name}": ${classifyResult.ai_analysis_status} (${classifyResult.doc_type})`);
            setDocuments(prev => prev.map(d =>
              d.id === docId
                ? {
                    ...d,
                    ai_analysis_status: classifyResult.ai_analysis_status,
                    ai_analysis_result: {
                      is_regulatory: classifyResult.is_regulatory,
                      doc_type: classifyResult.doc_type,
                      confidence: classifyResult.confidence,
                      key_details: classifyResult.key_details,
                    },
                  }
                : d
            ));
            if (classifyResult.ai_analysis_status === 'rejected_non_regulatory') {
              toast.error(`⚠ "${file.name}" rejected — ${classifyResult.doc_type}`, { duration: 6000 });
            } else {
              toast.success(`✓ "${file.name}" verified: ${classifyResult.doc_type}`, { duration: 4000 });
            }
          }
        }).catch(err => {
          console.warn('[Stage8] Classification failed for', file.name, err);
        });

        const getCiteType = (cat: DocumentCategory): string => {
          switch (cat) {
            case 'visual': return 'SITE_PHOTO';
            case 'verification': return 'VISUAL_VERIFICATION';
            case 'technical': return 'BLUEPRINT_UPLOAD';
            case 'legal': return 'BLUEPRINT_UPLOAD';
            default: return 'SITE_PHOTO';
          }
        };
        const getCategoryLabel = (cat: DocumentCategory): string => {
          const categoryInfo = DOCUMENT_CATEGORIES.find(c => c.key === cat);
          return categoryInfo?.label || cat;
        };

        const newCitation: Citation = {
          id: `doc-${docRecord.id}`,
          cite_type: getCiteType(finalCategory) as any,
          question_key: 'document_upload',
          answer: `Uploaded: ${file.name}`,
          value: filePath,
          timestamp: new Date().toISOString(),
          metadata: {
            category: finalCategory,
            categoryLabel: getCategoryLabel(finalCategory),
            fileName: file.name,
            fileSize: file.size,
            uploadedBy: userId,
          },
        };
        newCitations.push(newCitation);

        const newDoc: DocumentWithCategory = {
          id: docRecord.id,
          file_name: file.name,
          file_path: filePath,
          category: finalCategory,
          citationId: newCitation.id,
          uploadedAt: new Date().toISOString(),
        };
        setDocuments(prev => [...prev, newDoc]);
      }

      if (newCitations.length > 0) {
        setCitations(prev => {
          const updated = [...prev, ...newCitations];
          supabase
            .from('project_summaries')
            .update({ verified_facts: updated as any })
            .eq('project_id', projectId)
            .then(({ error }) => {
              if (error) console.error('[Stage8] Failed to persist citations:', error);
              else console.log('[Stage8] ✓ Citations persisted to Supabase');
            });
          return updated;
        });
      }
      toast.success(`Uploaded ${files.length} file(s) - ${newCitations.filter(c => c.metadata?.category === 'visual').length} images added to Visual`);
    } catch (err) {
      console.error('[Stage8] Upload failed:', err);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [projectId, selectedUploadCategory, userRole, userId]);

  // Start editing a field
  const startEditing = useCallback((fieldId: string, currentValue: string) => {
    if (!canEdit) return;
    const targetCitation = citations.find(c => c.id === fieldId);
    if (targetCitation && IMMUTABLE_CITATION_TYPES.includes(targetCitation.cite_type)) {
      toast.error("GFA cannot be modified mid-project. Please create a new project if the area has changed.");
      return;
    }
    setEditingField(fieldId);
    setEditValue(currentValue);
  }, [canEdit, citations]);

  // Save edited field
  const saveEdit = useCallback(async () => {
    if (!editingField || !editValue) return;
    const editedCitation = citations.find(c => c.id === editingField);
    if (editedCitation && IMMUTABLE_CITATION_TYPES.includes(editedCitation.cite_type)) {
      toast.error("GFA cannot be modified mid-project. Please create a new project if the area has changed.");
      setEditingField(null);
      setEditValue('');
      return;
    }
    setIsSaving(true);
    try {
      const updatedCitations = citations.map(c => {
        if (c.id === editingField) {
          return { ...c, answer: editValue, value: editValue };
        }
        return c;
      });
      const { error } = await supabase
        .from('project_summaries')
        .update({ verified_facts: updatedCitations as any })
        .eq('project_id', projectId);
      if (error) throw error;
      setCitations(updatedCitations);
      toast.success('Updated successfully');
    } catch (err) {
      console.error('[Stage8] Failed to save:', err);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setEditValue('');
    }
  }, [editingField, editValue, citations, projectId]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  return {
    handleDownloadDocument,
    getDocumentPreviewUrl,
    getDocumentSignedUrl,
    handleSendDocument,
    handleSendContractToMultiple,
    updateChecklistItem,
    confirmTaskCompletion,
    updateTaskAssignee,
    handleFileUpload,
    startEditing,
    saveEdit,
    cancelEdit,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    IMMUTABLE_CITATION_TYPES,
  };
}
