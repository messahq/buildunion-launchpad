import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GpsConflictStatus } from "@/hooks/useGpsConflictCheck";

interface GpsConflictBadgeProps {
  status: GpsConflictStatus;
  distanceLabel?: string;
  className?: string;
}

export const GpsConflictBadge: React.FC<GpsConflictBadgeProps> = ({
  status,
  distanceLabel,
  className,
}) => {
  if (!status || status === "NO_ADDRESS") return null;

  if (status === "CHECKING") {
    return (
      <Badge variant="outline" className={cn("text-[9px] gap-1 border-muted-foreground/30 text-muted-foreground", className)}>
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        GPS Check…
      </Badge>
    );
  }

  const config = {
    OK: {
      icon: CheckCircle2,
      label: "GPS Verified",
      badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      tooltip: `Photo location matches project site${distanceLabel ? ` (${distanceLabel})` : ""}`,
    },
    WARNING: {
      icon: AlertTriangle,
      label: `GPS Warning${distanceLabel ? ` · ${distanceLabel}` : ""}`,
      badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      tooltip: `Photo was taken ${distanceLabel || "some distance"} from the project site`,
    },
    CONFLICT_DETECTED: {
      icon: AlertTriangle,
      label: `CONFLICT${distanceLabel ? ` · ${distanceLabel}` : ""}`,
      badgeClass: "border-red-500/40 bg-red-500/10 text-red-400 animate-pulse",
      tooltip: `🔴 GPS coordinates don't match the project location. Distance: ${distanceLabel || "unknown"}`,
    },
    ERROR: {
      icon: AlertTriangle,
      label: "GPS Error",
      badgeClass: "border-muted-foreground/30 text-muted-foreground",
      tooltip: "Could not verify GPS location",
    },
  }[status];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("text-[9px] gap-1 cursor-help", config.badgeClass, className)}
          >
            <Icon className="h-2.5 w-2.5" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[240px]">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{config.tooltip}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
