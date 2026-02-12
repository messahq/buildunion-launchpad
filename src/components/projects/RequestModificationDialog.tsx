// ============================================
// REQUEST MODIFICATION DIALOG - Foreman Interface
// ============================================
// Dialog for Foreman to request material quantity changes with reason
// ============================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RequestModificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  currentValue: number;
  unit: string;
  onSubmit: (newValue: number, reason: string) => Promise<void>;
  loading?: boolean;
}

export function RequestModificationDialog({
  open,
  onOpenChange,
  itemName,
  currentValue,
  unit,
  onSubmit,
  loading,
}: RequestModificationDialogProps) {
  const { t } = useTranslation();
  const [newValue, setNewValue] = useState<string>(currentValue.toString());
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newValue || isNaN(Number(newValue))) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(Number(newValue), reason);
      setNewValue(currentValue.toString());
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = newValue && !isNaN(Number(newValue)) && Number(newValue) !== currentValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('requestModification.title', 'Request Modification')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info */}
          <div>
            <Label className="text-muted-foreground">{t('requestModification.item', 'Item')}</Label>
            <div className="font-medium mt-1">{itemName}</div>
          </div>

          {/* Current Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('requestModification.currentValue', 'Current Value')}</Label>
              <div className="font-mono text-lg font-semibold mt-1">
                {currentValue} {unit}
              </div>
            </div>

            {/* New Value Input */}
            <div>
              <Label htmlFor="new-value">{t('requestModification.newValue', 'New Value')}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="new-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="font-mono"
                  placeholder={t('requestModification.enterNewValue', 'Enter new value')}
                />
                <span className="text-muted-foreground">{unit}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">
              {t('requestModification.reason', 'Reason for Change')} <span className="text-muted-foreground">{t('requestModification.reasonRequired', '(required)')}</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={t('requestModification.reasonPlaceholder', 'Explain why this modification is needed...')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || loading}
          >
            {t('requestModification.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || !reason.trim() || submitting || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting || loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t('requestModification.submit', 'Submit Request')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
