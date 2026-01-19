// Utility functions for automatic document management
import { supabase } from "@/integrations/supabase/client";

interface SaveDocumentOptions {
  projectId: string;
  userId: string;
  fileName: string;
  fileBlob: Blob;
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

    // Create document record
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
    fileBlob: pdfBlob
  });

  return result.success;
};
