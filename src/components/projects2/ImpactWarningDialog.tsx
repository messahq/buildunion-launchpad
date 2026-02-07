/**
 * Impact Warning Dialog
 * 
 * Warns users when a system operation would affect locked financial data.
 * Part of the Data Lock system for protecting saved values.
 */

import React from 'react';
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
import { AlertTriangle, Lock, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ImpactType = 'tax_change' | 'area_change' | 'rate_change' | 'bulk_update' | 'sync_operation';

interface ImpactWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impactType: ImpactType;
  onConfirm: () => void;
  onCancel: () => void;
  affectedItemsCount?: number;
  estimatedChange?: number;
}

const impactDescriptions: Record<ImpactType, { title: string; description: string }> = {
  tax_change: {
    title: "Adóváltozás hatása",
    description: "Ez a művelet módosíthatja a lezárt pénzügyi adatok adótartalmát."
  },
  area_change: {
    title: "Területváltozás hatása", 
    description: "A terület módosítása befolyásolhatja a lezárt anyagmennyiségeket és költségeket."
  },
  rate_change: {
    title: "Egységár változás hatása",
    description: "Az egységár módosítása átszámolhatja a lezárt végösszegeket."
  },
  bulk_update: {
    title: "Tömeges módosítás hatása",
    description: "Ez a művelet több lezárt tételt is érinthet egyszerre."
  },
  sync_operation: {
    title: "Szinkronizáció hatása",
    description: "A szinkronizáció felülírhatja a manuálisan mentett értékeket."
  }
};

export function ImpactWarningDialog({
  open,
  onOpenChange,
  impactType,
  onConfirm,
  onCancel,
  affectedItemsCount = 0,
  estimatedChange = 0,
}: ImpactWarningDialogProps) {
  const { t } = useTranslation();
  const impact = impactDescriptions[impactType];
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-background">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-amber-200">
              {t("dataLock.warning", "Figyelem!")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p className="text-base font-medium text-foreground">
              {impact.title}
            </p>
            <p className="text-muted-foreground">
              {impact.description}
            </p>
            
            {/* Impact Details */}
            <div className="mt-4 p-3 rounded-lg bg-amber-950/30 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-amber-400" />
                <span className="text-amber-200">
                  {t("dataLock.lockedData", "Lezárt pénzügyi adatok")}
                </span>
              </div>
              
              {affectedItemsCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>• {affectedItemsCount} {t("dataLock.itemsAffected", "tétel érintett")}</span>
                </div>
              )}
              
              {estimatedChange !== 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span className={estimatedChange > 0 ? "text-red-400" : "text-green-400"}>
                    {estimatedChange > 0 ? '+' : ''}{estimatedChange.toLocaleString('en-US', { style: 'currency', currency: 'CAD' })}
                    {" "}{t("dataLock.estimatedChange", "becsült változás")}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-amber-400/80 font-medium mt-4">
              {t("dataLock.confirmQuestion", "Biztosan folytatja?")}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onCancel}
            className="border-muted-foreground/30"
          >
            {t("common.cancel", "Mégsem")}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t("dataLock.proceedAnyway", "Folytatás mindenképp")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ImpactWarningDialog;
