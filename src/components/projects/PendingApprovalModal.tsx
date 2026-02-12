// ============================================
// PENDING APPROVAL MODAL - Owner Approval Interface
// ============================================
// Shows pending modifications that need Owner approval
// Supports approve/reject with notes
// ============================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  Wrench,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PendingBudgetChange } from '@/hooks/usePendingBudgetChanges';

interface PendingApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingChanges: PendingBudgetChange[];
  onApprove: (changeId: string, notes?: string) => Promise<boolean>;
  onReject: (changeId: string, notes?: string) => Promise<boolean>;
  loading?: boolean;
}

const ITEM_TYPE_ICONS: Record<string, React.ElementType> = {
  material: Package,
  labor: User,
  task: ClipboardList,
  other: Wrench,
};

const ITEM_TYPE_COLORS: Record<string, string> = {
  material: 'text-blue-600 bg-blue-50',
  labor: 'text-green-600 bg-green-50',
  task: 'text-purple-600 bg-purple-50',
  other: 'text-gray-600 bg-gray-50',
};

export function PendingApprovalModal({
  open,
  onOpenChange,
  pendingChanges,
  onApprove,
  onReject,
  loading,
}: PendingApprovalModalProps) {
  const { t } = useTranslation();
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingOnly = pendingChanges.filter(c => c.status === 'pending');

  const getReviewNotes = (id: string) => reviewNotesMap[id] || '';
  const setReviewNotes = (id: string, value: string) =>
    setReviewNotesMap(prev => ({ ...prev, [id]: value }));

  const handleApprove = async (changeId: string) => {
    setActionLoading(changeId);
    const success = await onApprove(changeId, getReviewNotes(changeId));
    if (success) {
      setReviewNotesMap(prev => { const next = { ...prev }; delete next[changeId]; return next; });
      setSelectedChangeId(null);
    }
    setActionLoading(null);
  };

  const handleReject = async (changeId: string) => {
    setActionLoading(changeId);
    const success = await onReject(changeId, getReviewNotes(changeId));
    if (success) {
      setReviewNotesMap(prev => { const next = { ...prev }; delete next[changeId]; return next; });
      setSelectedChangeId(null);
    }
    setActionLoading(null);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return '—';
    return value.toLocaleString('en-CA');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <span>{t('pendingApproval.title', 'Pending Approvals')}</span>
              {pendingOnly.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                  {pendingOnly.length} {t('pendingApproval.pending', 'pending')}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {pendingOnly.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{t('pendingApproval.noModifications', 'No pending modifications')}</p>
              <p className="text-sm">{t('pendingApproval.allReviewed', 'All team changes have been reviewed')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {pendingOnly.map((change, index) => {
                  const Icon = ITEM_TYPE_ICONS[change.item_type] || Wrench;
                  const colorClass = ITEM_TYPE_COLORS[change.item_type] || ITEM_TYPE_COLORS.other;
                  const isExpanded = selectedChangeId === change.id;
                  
                  return (
                    <motion.div
                      key={change.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        isExpanded ? "ring-2 ring-primary/30" : "hover:border-primary/30"
                      )}
                    >
                      {/* Header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer"
                        onClick={() => setSelectedChangeId(isExpanded ? null : change.id)}
                      >
                        <div className={cn("p-2 rounded-lg", colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{change.item_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(change.requested_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                        
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {t('pendingApproval.pendingBadge', 'Pending')}
                        </Badge>
                      </div>
                      
                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t bg-muted/30"
                          >
                            <div className="p-4 space-y-4">
                              {/* Change Details */}
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">{t('pendingApproval.original', 'Original')}</div>
                                  <div className="font-mono">
                                    {formatNumber(change.original_quantity)} × {formatCurrency(change.original_unit_price)}
                                  </div>
                                  <div className="font-semibold">{formatCurrency(change.original_total)}</div>
                                </div>
                                
                                <div className="flex items-center justify-center">
                                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">{t('pendingApproval.proposed', 'Proposed')}</div>
                                  <div className="font-mono text-primary">
                                    {formatNumber(change.new_quantity)} × {formatCurrency(change.new_unit_price)}
                                  </div>
                                  <div className="font-semibold text-primary">{formatCurrency(change.new_total)}</div>
                                </div>
                              </div>
                              
                              {/* Change Reason */}
                              {change.change_reason && (
                                <div className="text-sm">
                                  <div className="text-muted-foreground mb-1">{t('pendingApproval.reason', 'Reason:')}</div>
                                  <div className="bg-background p-2 rounded border italic">
                                    "{change.change_reason}"
                                  </div>
                                </div>
                              )}
                              
                              {/* Review Notes Input */}
                              <div>
                                <Textarea
                                  placeholder={t('pendingApproval.reviewNotes', 'Add review notes (optional)...')}
                                  value={getReviewNotes(change.id)}
                                  onChange={(e) => setReviewNotes(change.id, e.target.value)}
                                  className="min-h-[60px] text-sm"
                                />
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApprove(change.id)}
                                  disabled={actionLoading === change.id}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  {actionLoading === change.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                  )}
                                   {t('pendingApproval.approve', 'Approve')}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReject(change.id)}
                                  disabled={actionLoading === change.id}
                                  className="flex-1"
                                >
                                  {actionLoading === change.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                  )}
                                   {t('pendingApproval.reject', 'Reject')}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('pendingApproval.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
