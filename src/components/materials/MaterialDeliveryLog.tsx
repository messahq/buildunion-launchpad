import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, TruckIcon, Camera } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MaterialDeliveryLogProps {
  projectId: string;
  userId: string;
  materialOptions: { name: string; unit: string }[];
  preselectedMaterial?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MaterialDeliveryLog({
  projectId,
  userId,
  materialOptions,
  preselectedMaterial,
  onClose,
  onSuccess,
}: MaterialDeliveryLogProps) {
  const { t } = useTranslation();
  const [materialName, setMaterialName] = useState(preselectedMaterial || "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedMat = materialOptions.find((m) => m.name === materialName);
  const unit = selectedMat?.unit || "units";

  const handleSubmit = async () => {
    if (!materialName || !quantity || Number(quantity) <= 0) {
      toast.error(t('materials.fillRequired', 'Please select a material and enter quantity'));
      return;
    }

    setIsSaving(true);
    try {
      // Find expected quantity from template
      const expectedQty = selectedMat ? 0 : 0; // Will be derived from tracker

      const { error } = await supabase.from("material_deliveries").insert({
        project_id: projectId,
        material_name: materialName,
        expected_quantity: 0, // Tracker calculates from template
        delivered_quantity: Number(quantity),
        unit,
        logged_by: userId,
        notes: notes || null,
        photo_url: null,
      });

      if (error) throw error;

      toast.success(
        t('materials.deliveryLogged', '{{qty}} {{unit}} of {{name}} logged', {
          qty: quantity,
          unit,
          name: materialName,
        })
      );
      onSuccess();
    } catch (err: any) {
      console.error("Failed to log delivery:", err);
      toast.error(t('materials.logFailed', 'Failed to log delivery'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/30 shadow-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md">
            <TruckIcon className="h-5 w-5 text-white" />
          </div>
          <h4 className="text-base font-black text-gray-900 dark:text-amber-100">
            {t('materials.logDelivery', 'Log Delivery')}
          </h4>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Material Select */}
        <div>
          <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t('materials.material', 'Material')}
          </Label>
          <Select value={materialName} onValueChange={setMaterialName}>
            <SelectTrigger className="mt-1 bg-white dark:bg-gray-900/50 border-amber-200 dark:border-amber-700">
              <SelectValue placeholder={t('materials.selectMaterial', 'Select material...')} />
            </SelectTrigger>
            <SelectContent>
              {materialOptions.map((m) => (
                <SelectItem key={m.name} value={m.name}>
                  {m.name} ({m.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div>
          <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t('materials.quantity', 'Quantity')} ({unit})
          </Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="mt-1 bg-white dark:bg-gray-900/50 border-amber-200 dark:border-amber-700 text-lg font-bold"
          />
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t('materials.notes', 'Notes')} ({t('common.optional', 'optional')})
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('materials.notesPlaceholder', 'Delivery details, condition, etc.')}
            rows={2}
            className="mt-1 bg-white dark:bg-gray-900/50 border-amber-200 dark:border-amber-700 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100/50"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !materialName || !quantity}
            className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/25"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TruckIcon className="h-4 w-4" />
            )}
            {t('materials.confirm', 'Confirm Delivery')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
