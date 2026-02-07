// ============================================
// TEAM BUDGET SUBMISSION PANEL
// Non-owners submit budget changes for approval
// Shows "Pending" state until owner approves
// ============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  DollarSign,
  AlertTriangle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { usePendingChanges, PendingBudgetChange } from "@/hooks/usePendingChanges";

interface TeamBudgetSubmissionPanelProps {
  projectId: string;
  currentGrandTotal: number;
  proposedLineItems?: PendingBudgetChange["proposedLineItems"];
  isOwner: boolean;
  onSubmitSuccess?: () => void;
}

export function TeamBudgetSubmissionPanel({
  projectId,
  currentGrandTotal,
  proposedLineItems,
  isOwner,
  onSubmitSuccess,
}: TeamBudgetSubmissionPanelProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    pendingChange, 
    hasPendingChange, 
    submitBudgetChange,
    actualTotals,
  } = usePendingChanges(projectId);
  
  // Don't show for owners - they use the approval panel
  if (isOwner) return null;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Check if current totals differ from saved totals (meaning there are unsaved changes)
  const previousGrandTotal = actualTotals.grandTotal;
  const hasUnsavedChanges = Math.abs(currentGrandTotal - previousGrandTotal) > 0.01;
  
  const handleSubmit = async () => {
    if (!hasUnsavedChanges) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await submitBudgetChange(
        currentGrandTotal,
        previousGrandTotal,
        proposedLineItems,
        reason || undefined
      );
      
      if (success) {
        setReason("");
        onSubmitSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show pending status if there's already a pending change
  if (hasPendingChange && pendingChange) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-amber-700">
                Budget Change Pending Approval
              </span>
            </div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10">
              <Clock className="h-3 w-3 mr-1" />
              Waiting
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded bg-background/50">
              <p className="text-xs text-muted-foreground">Proposed Total</p>
              <p className="font-semibold text-amber-700">
                {formatCurrency(pendingChange.proposedGrandTotal)}
              </p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {format(new Date(pendingChange.submittedAt), 'MMM d, HH:mm')}
              </p>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Your budget changes are awaiting owner approval. You'll be notified when reviewed.
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }
  
  // Show submission form if there are unsaved changes
  if (!hasUnsavedChanges) {
    return null; // No changes to submit
  }
  
  const difference = currentGrandTotal - previousGrandTotal;
  const isIncrease = difference > 0;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl border-2 border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-cyan-600" />
            <span className="text-sm font-medium text-cyan-700">
              Submit Budget Changes for Approval
            </span>
          </div>
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-600 bg-cyan-500/10">
            <DollarSign className="h-3 w-3 mr-1" />
            {isIncrease ? "+" : ""}{formatCurrency(difference)}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded bg-background/50">
            <p className="text-xs text-muted-foreground">Current Budget</p>
            <p className="font-semibold">{formatCurrency(previousGrandTotal)}</p>
          </div>
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-200">
            <p className="text-xs text-cyan-600">Proposed Budget</p>
            <p className="font-semibold text-cyan-700">{formatCurrency(currentGrandTotal)}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs text-muted-foreground">
            Reason for Change (Optional)
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g., Material price increase, additional work discovered..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-20 text-sm resize-none"
          />
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit for Owner Approval
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Changes will be visible to the project owner for review
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

export default TeamBudgetSubmissionPanel;
