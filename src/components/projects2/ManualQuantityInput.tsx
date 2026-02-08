/**
 * MANUAL QUANTITY INPUT DIALOG
 * 
 * When Quantity Resolver fails (cannot determine unit conversion),
 * this dialog allows users to manually input the quantity.
 * 
 * "override = explicit quantity + unit"
 * AI doesn't calculate, just documents.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Calculator, PenLine, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ManualOverride } from '@/lib/quantityResolver';

interface ManualQuantityInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialName: string;
  suggestedQuantity?: number;
  suggestedUnit?: string;
  errorMessage?: string;
  onConfirm: (override: ManualOverride) => void;
}

const COMMON_UNITS = [
  { value: 'sq ft', label: 'Square Feet (sq ft)' },
  { value: 'sq m', label: 'Square Meters (sq m)' },
  { value: 'linear ft', label: 'Linear Feet' },
  { value: 'gallon', label: 'Gallons' },
  { value: 'box', label: 'Boxes' },
  { value: 'bag', label: 'Bags' },
  { value: 'roll', label: 'Rolls' },
  { value: 'sheet', label: 'Sheets' },
  { value: 'bundle', label: 'Bundles' },
  { value: 'piece', label: 'Pieces' },
  { value: 'unit', label: 'Units' },
];

const COMMON_REASONS = [
  'On-site measurement',
  'Supplier specification',
  'Custom requirement',
  'Adjusted for waste',
  'Based on previous project',
  'Other',
];

export function ManualQuantityInput({
  open,
  onOpenChange,
  materialName,
  suggestedQuantity,
  suggestedUnit,
  errorMessage,
  onConfirm,
}: ManualQuantityInputProps) {
  const [quantity, setQuantity] = useState<string>(
    suggestedQuantity?.toString() || ''
  );
  const [unit, setUnit] = useState<string>(suggestedUnit || 'unit');
  const [reason, setReason] = useState<string>('On-site measurement');
  const [customReason, setCustomReason] = useState<string>('');

  const handleConfirm = () => {
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return; // Invalid quantity
    }

    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason.trim()) {
      return; // Reason required
    }

    const override: ManualOverride = {
      override: true,
      quantity: numQuantity,
      unit,
      reason: finalReason,
      resolved_by: 'user',
      timestamp: new Date().toISOString(),
    };

    onConfirm(override);
    onOpenChange(false);
  };

  const isValid = parseFloat(quantity) > 0 && (reason !== 'Other' || customReason.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Manual Quantity Input
          </DialogTitle>
          <DialogDescription>
            Set quantity manually for materials that couldn't be auto-calculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="font-medium">{materialName}</p>
          {errorMessage && (
              <div className="flex items-start gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-lg font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {parseFloat(quantity) > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Result:</span>
              <Badge variant="secondary" className="font-mono">
                {parseFloat(quantity).toLocaleString()} {unit}
              </Badge>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Manual Input</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Custom Reason</Label>
              <Textarea
                id="customReason"
                placeholder="Explain why manual input was needed..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* Info Box */}
          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-3">
            <p className="text-sm text-foreground/70">
              <strong>Note:</strong> Manual overrides are documented for audit. 
              AI will not recalculate this value automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            <Save className="h-4 w-4 mr-2" />
            Confirm Quantity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
