import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ConflictMarkerLegendProps {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  className?: string;
}

export function ConflictMarkerLegend({
  highCount,
  mediumCount,
  lowCount,
  className,
}: ConflictMarkerLegendProps) {
  const { t } = useTranslation();

  if (highCount === 0 && mediumCount === 0 && lowCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {highCount > 0 && (
        <Badge 
          variant="outline" 
          className="bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {highCount} {t("conflicts.high", "High")}
        </Badge>
      )}
      {mediumCount > 0 && (
        <Badge 
          variant="outline" 
          className="bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          {mediumCount} {t("conflicts.medium", "Medium")}
        </Badge>
      )}
      {lowCount > 0 && (
        <Badge 
          variant="outline" 
          className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
        >
          <Info className="h-3 w-3 mr-1" />
          {lowCount} {t("conflicts.low", "Low")}
        </Badge>
      )}
    </div>
  );
}
