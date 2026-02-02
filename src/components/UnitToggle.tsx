import { useUnitSettings } from "@/hooks/useUnitSettings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UnitToggleProps {
  compact?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function UnitToggle({ compact = false, className = "", showLabel = true }: UnitToggleProps) {
  const { unitSystem, setUnitSystem, isMetric } = useUnitSettings();
  const { t } = useTranslation();

  const handleToggle = (checked: boolean) => {
    setUnitSystem(checked ? "metric" : "imperial");
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              <span className={`text-xs font-medium ${!isMetric ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {t("units.imperial_short", "IMP")}
              </span>
              <Switch
                checked={isMetric}
                onCheckedChange={handleToggle}
                className="data-[state=checked]:bg-amber-500"
              />
              <span className={`text-xs font-medium ${isMetric ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {t("units.metric_short", "MET")}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("units.toggle_tooltip", "Toggle between Imperial and Metric units")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Ruler className="h-4 w-4" />
          <Label className="text-sm font-medium">
            {t("units.label", "Units")}:
          </Label>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={`text-sm ${!isMetric ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {t("units.imperial", "Imperial")}
        </span>
        <Switch
          checked={isMetric}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-amber-500"
        />
        <span className={`text-sm ${isMetric ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {t("units.metric", "Metric")}
        </span>
      </div>
    </div>
  );
}
