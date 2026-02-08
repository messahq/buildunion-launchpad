/**
 * QUANTITY RESOLUTION BADGE
 * 
 * Visual indicator for material quantity resolution status.
 * Shows resolution method, confidence, and calculation trace.
 * 
 * For failed resolutions, shows "Manual input required" with action button.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  HelpCircle,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidenceLevel, ResolutionMethod } from '@/lib/quantityResolver';

interface QuantityResolutionBadgeProps {
  resolved: boolean;
  resolutionMethod?: ResolutionMethod;
  confidence?: ConfidenceLevel;
  calculationTrace?: string;
  errorMessage?: string;
  isManualOverride?: boolean;
  onManualInputClick?: () => void;
  compact?: boolean;
}

const methodLabels: Record<ResolutionMethod, string> = {
  area_to_liquid: 'Area → Liquid',
  area_to_boxes: 'Area → Boxes',
  area_to_sheets: 'Area → Sheets',
  area_to_rolls: 'Area → Rolls',
  area_to_bags: 'Area → Bags',
  linear_to_pieces: 'Linear → Pieces',
  passthrough: 'Direct',
  manual_required: 'Manual Required',
};

const confidenceColors: Record<ConfidenceLevel, string> = {
  high: 'bg-green-500/10 text-green-700 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  low: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  failed: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const confidenceIcons: Record<ConfidenceLevel, React.ReactNode> = {
  high: <CheckCircle2 className="h-3 w-3" />,
  medium: <HelpCircle className="h-3 w-3" />,
  low: <AlertCircle className="h-3 w-3" />,
  failed: <AlertCircle className="h-3 w-3" />,
};

export function QuantityResolutionBadge({
  resolved,
  resolutionMethod = 'passthrough',
  confidence = 'high',
  calculationTrace,
  errorMessage,
  isManualOverride = false,
  onManualInputClick,
  compact = false,
}: QuantityResolutionBadgeProps) {
  // Manual override badge
  if (isManualOverride) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="bg-blue-500/10 text-blue-700 border-blue-500/20 gap-1"
            >
              <PenLine className="h-3 w-3" />
              {!compact && 'Manual'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium">Manual Override</p>
            <p className="text-sm text-muted-foreground">
              Quantity set by user - AI documentation only
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Failed resolution - needs manual input
  if (!resolved || resolutionMethod === 'manual_required') {
    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn(confidenceColors.failed, 'gap-1 cursor-help')}
              >
                <AlertCircle className="h-3 w-3" />
                {!compact && 'Unresolved'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium text-destructive">Manual Input Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                {errorMessage || 'Quantity could not be automatically calculated. Please enter manually.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {onManualInputClick && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onManualInputClick}
          >
            <PenLine className="h-3 w-3 mr-1" />
            Set Qty
          </Button>
        )}
      </div>
    );
  }

  // Successfully resolved
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(confidenceColors[confidence], 'gap-1 cursor-help')}
          >
            {confidence === 'high' ? (
              <Sparkles className="h-3 w-3" />
            ) : (
              confidenceIcons[confidence]
            )}
            {!compact && (
              resolutionMethod !== 'passthrough' 
                ? methodLabels[resolutionMethod] 
                : 'Resolved'
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <p className="font-medium">Quantity Resolution</p>
            </div>
            
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Method:</span> {methodLabels[resolutionMethod]}</p>
              <p><span className="text-muted-foreground">Confidence:</span> {confidence}</p>
            </div>
            
            {calculationTrace && (
              <div className="pt-2 border-t">
                <p className="text-xs font-mono text-muted-foreground">
                  {calculationTrace}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Version indicator badge
 * Shows V1 (Legacy) or V2 (Quantity Resolver)
 */
export function QuantityLogicVersionBadge({ 
  version, 
  compact = false 
}: { 
  version: 1 | 2; 
  compact?: boolean;
}) {
  if (version === 1) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              V1 {!compact && '(Legacy)'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Legacy quantity calculation - frozen logic</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            V2 {!compact && '(Resolver)'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Deterministic Quantity Resolver - physics-based calculation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
