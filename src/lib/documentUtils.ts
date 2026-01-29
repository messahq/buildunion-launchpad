// Utility functions for automatic document management
import { supabase } from "@/integrations/supabase/client";

export type GeneratedDocumentType = 
  | 'ai-brief'
  | 'project-report'
  | 'quote'
  | 'invoice'
  | 'contract'
  | 'task-list'
  | 'team-report'
  | 'cost-breakdown'
  | 'other';

interface SaveDocumentOptions {
  projectId: string;
  userId: string;
  fileName: string;
  fileBlob: Blob;
  documentType?: GeneratedDocumentType;
  onSuccess?: (doc: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Saves a file (e.g., PDF) to the project's documents storage
 */
export const saveDocumentToProject = async ({
  projectId,
  userId,
  fileName,
  fileBlob,
  documentType = 'other',
  onSuccess,
  onError
}: SaveDocumentOptions): Promise<{ success: boolean; document?: any; error?: Error }> => {
  try {
    const fileId = crypto.randomUUID();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${projectId}/${fileId}-${safeFileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(filePath, fileBlob, { 
        upsert: true,
        contentType: fileBlob.type || 'application/pdf'
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create document record with type prefix for easy filtering
    const { data: docData, error: dbError } = await supabase
      .from("project_documents")
      .insert({
        project_id: projectId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileBlob.size,
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    onSuccess?.(docData);
    return { success: true, document: docData };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    onError?.(err);
    return { success: false, error: err };
  }
};

/**
 * Saves an AI Brief as a text document to project documents
 * (Using .txt and text/plain for storage compatibility)
 */
export const saveAIBriefToProject = async (
  projectId: string,
  userId: string,
  briefContent: string,
  projectName: string
): Promise<{ success: boolean; document?: any }> => {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `AI_Brief_${projectName.replace(/\s+/g, '_')}_${timestamp}.txt`;
  const blob = new Blob([briefContent], { type: 'text/plain' });
  
  return saveDocumentToProject({
    projectId,
    userId,
    fileName,
    fileBlob: blob,
    documentType: 'ai-brief'
  });
};

/**
 * Saves an invoice/PDF copy to the project documents when saving summary
 */
export const saveInvoiceCopyToProject = async (
  projectId: string,
  userId: string,
  pdfBlob: Blob,
  invoiceNumber: string
): Promise<boolean> => {
  const fileName = `Invoice_${invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const result = await saveDocumentToProject({
    projectId,
    userId,
    fileName,
    fileBlob: pdfBlob,
    documentType: 'invoice'
  });

  return result.success;
};

/**
 * Saves a generated PDF report to project documents
 */
export const saveReportToProject = async (
  projectId: string,
  userId: string,
  pdfBlob: Blob,
  reportType: GeneratedDocumentType,
  projectName: string
): Promise<{ success: boolean; document?: any }> => {
  const timestamp = new Date().toISOString().split('T')[0];
  const typeLabel = reportType.replace(/-/g, '_').replace(/\b\w/g, c => c.toUpperCase());
  const fileName = `${typeLabel}_${projectName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
  
  return saveDocumentToProject({
    projectId,
    userId,
    fileName,
    fileBlob: pdfBlob,
    documentType: reportType
  });
};
