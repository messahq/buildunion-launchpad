// Utility functions for automatic document management with citation tracking
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
  | 'budget-change'
  | 'other';

interface DocumentRegistryEntry {
  id: string;
  documentType: GeneratedDocumentType;
  fileName: string;
  filePath: string;
  savedAt: string;
  fileSize: number;
  linkedPillar?: string;
  sourceId?: string;
}

interface SaveDocumentOptions {
  projectId: string;
  userId: string;
  fileName: string;
  fileBlob: Blob;
  documentType?: GeneratedDocumentType;
  linkedPillar?: string; // Which pillar this document supports
  onSuccess?: (doc: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Generates a citation source ID based on document type
 */
const generateSourceId = (documentType: GeneratedDocumentType, existingCount: number = 0): string => {
  const prefixes: Record<GeneratedDocumentType, string> = {
    'ai-brief': 'AB',
    'project-report': 'PR',
    'quote': 'QT',
    'invoice': 'INV',
    'contract': 'CT',
    'task-list': 'TL',
    'team-report': 'TR',
    'cost-breakdown': 'CB',
    'budget-change': 'BC',
    'other': 'DOC',
  };
  return `${prefixes[documentType]}-${String(existingCount + 1).padStart(3, '0')}`;
};

/**
 * Determines which pillar a document type should be linked to
 */
const getDefaultPillar = (documentType: GeneratedDocumentType): string | undefined => {
  const pillarMap: Partial<Record<GeneratedDocumentType, string>> = {
    'cost-breakdown': 'materials',
    'budget-change': 'materials',
    'contract': 'contract',
    'task-list': 'tasks',
    'team-report': 'team',
    'ai-brief': 'confidence',
    'invoice': 'materials',
    'quote': 'materials',
  };
  return pillarMap[documentType];
};

/**
 * Updates the ai_workflow_config with the new document for citation tracking
 */
const updateDocumentRegistry = async (
  projectId: string,
  entry: DocumentRegistryEntry
): Promise<void> => {
  try {
    const { data: currentData } = await supabase
      .from("project_summaries")
      .select("ai_workflow_config")
      .eq("project_id", projectId)
      .single();

    const currentConfig = (currentData?.ai_workflow_config as Record<string, unknown>) || {};
    const existingRegistry = (currentConfig.documentRegistry as DocumentRegistryEntry[]) || [];
    
    // Add new entry to registry
    const updatedRegistry = [...existingRegistry, entry];
    
    // Update config with latest document references by type
    const latestByType: Record<string, unknown> = {};
    updatedRegistry.forEach(doc => {
      latestByType[doc.documentType] = { ...doc };
    });
    
    // Create a clean JSON object using JSON parse/stringify to ensure type safety
    const newConfig = JSON.parse(JSON.stringify({
      ...currentConfig,
      documentRegistry: updatedRegistry,
      latestDocuments: latestByType,
      lastDocumentUpdate: new Date().toISOString(),
    }));
    
    await supabase
      .from("project_summaries")
      .update({
        ai_workflow_config: newConfig,
        updated_at: new Date().toISOString()
      })
      .eq("project_id", projectId);
      
    console.log(`[DocumentUtils] Document registered: ${entry.sourceId} -> ${entry.documentType}`);
  } catch (error) {
    console.error("[DocumentUtils] Failed to update document registry:", error);
  }
};

/**
 * Saves a file (e.g., PDF) to the project's documents storage with citation tracking
 */
export const saveDocumentToProject = async ({
  projectId,
  userId,
  fileName,
  fileBlob,
  documentType = 'other',
  linkedPillar,
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

    // Get existing document count for source ID generation
    const { count } = await supabase
      .from("project_documents")
      .select("*", { count: 'exact', head: true })
      .eq("project_id", projectId);

    // Create registry entry for citation tracking
    const registryEntry: DocumentRegistryEntry = {
      id: docData.id,
      documentType,
      fileName,
      filePath,
      savedAt: new Date().toISOString(),
      fileSize: fileBlob.size,
      linkedPillar: linkedPillar || getDefaultPillar(documentType),
      sourceId: generateSourceId(documentType, count || 0),
    };

    // Update the document registry in ai_workflow_config
    await updateDocumentRegistry(projectId, registryEntry);

    onSuccess?.(docData);
    return { success: true, document: { ...docData, sourceId: registryEntry.sourceId } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    onError?.(err);
    return { success: false, error: err };
  }
};

/**
 * Saves an AI Brief as a text document to project documents
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
    documentType: 'ai-brief',
    linkedPillar: 'confidence'
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
    documentType: 'invoice',
    linkedPillar: 'materials'
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

/**
 * Saves a contract PDF to project documents with proper citation
 */
export const saveContractToDocuments = async (
  projectId: string,
  userId: string,
  pdfBlob: Blob,
  contractNumber: string
): Promise<{ success: boolean; document?: any }> => {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Contract_${contractNumber}_${timestamp}.pdf`;
  
  return saveDocumentToProject({
    projectId,
    userId,
    fileName,
    fileBlob: pdfBlob,
    documentType: 'contract',
    linkedPillar: 'contract'
  });
};

/**
 * Saves a budget/cost breakdown PDF to project documents
 */
export const saveBudgetToDocuments = async (
  projectId: string,
  userId: string,
  pdfBlob: Blob,
  projectName: string,
  isChangeOrder: boolean = false
): Promise<{ success: boolean; document?: any }> => {
  const timestamp = new Date().toISOString().split('T')[0];
  const typeLabel = isChangeOrder ? 'Budget_Change_Order' : 'Cost_Breakdown';
  const fileName = `${typeLabel}_${projectName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
  
  return saveDocumentToProject({
    projectId,
    userId,
    fileName,
    fileBlob: pdfBlob,
    documentType: isChangeOrder ? 'budget-change' : 'cost-breakdown',
    linkedPillar: 'materials'
  });
};

/**
 * Gets the latest document of a specific type from the registry
 */
export const getLatestDocument = async (
  projectId: string,
  documentType: GeneratedDocumentType
): Promise<DocumentRegistryEntry | null> => {
  try {
    const { data } = await supabase
      .from("project_summaries")
      .select("ai_workflow_config")
      .eq("project_id", projectId)
      .single();

    const config = data?.ai_workflow_config as Record<string, unknown>;
    const latestDocs = config?.latestDocuments as Record<string, DocumentRegistryEntry>;
    
    return latestDocs?.[documentType] || null;
  } catch {
    return null;
  }
};

/**
 * Gets all documents in the registry for a project
 */
export const getDocumentRegistry = async (
  projectId: string
): Promise<DocumentRegistryEntry[]> => {
  try {
    const { data } = await supabase
      .from("project_summaries")
      .select("ai_workflow_config")
      .eq("project_id", projectId)
      .single();

    const config = data?.ai_workflow_config as Record<string, unknown>;
    return (config?.documentRegistry as DocumentRegistryEntry[]) || [];
  } catch {
    return [];
  }
};
