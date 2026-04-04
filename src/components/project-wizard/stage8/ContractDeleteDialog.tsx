// ============================================
// ContractDeleteDialog — Contract deletion confirmation
// Extracted from Stage8FinalReview.tsx
// ============================================

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Citation } from "@/types/citation";

interface ContractToDelete {
  id: string;
  contract_number: string;
  status: string;
}

interface ContractDeleteDialogProps {
  contract: ContractToDelete | null;
  onClose: () => void;
  setContracts: React.Dispatch<React.SetStateAction<any[]>>;
  setCitations: React.Dispatch<React.SetStateAction<Citation[]>>;
}

export function ContractDeleteDialog({
  contract,
  onClose,
  setContracts,
  setCitations,
}: ContractDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <AlertDialog open={!!contract} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Contract #{contract?.contract_number}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this contract? This action will archive the contract and remove it from your active documents.</p>
            {contract?.status === 'signed' && (
              <p className="text-red-500 font-semibold">⚠️ Warning: This contract has been signed. Deleting a signed contract may have legal implications.</p>
            )}
            {contract?.status === 'sent' && (
              <p className="text-amber-500 font-medium">⚠️ This contract has already been sent to clients. They will no longer be able to access it.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!contract) return;
              setIsDeleting(true);
              try {
                const { error } = await supabase
                  .from('contracts')
                  .update({ archived_at: new Date().toISOString() })
                  .eq('id', contract.id);

                if (error) throw error;

                setContracts(prev => prev.filter(c => c.id !== contract.id));
                setCitations(prev => prev.filter(c => !(c.cite_type === 'CONTRACT' && (c.metadata as any)?.contract_id === contract.id)));
                toast.success(`Contract #${contract.contract_number} deleted`);
                onClose();
              } catch (err) {
                toast.error('Failed to delete contract');
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Yes, Delete Contract
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}