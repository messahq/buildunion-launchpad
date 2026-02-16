import { useRegionSettings } from "@/hooks/useRegionSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RegionSelectorProps {
  compact?: boolean;
  className?: string;
}

export function RegionSelector({ compact = false, className = "" }: RegionSelectorProps) {
  const { region, setRegion, allRegions, config, isRegionActive } = useRegionSettings();

  return (
    <Select value={region} onValueChange={(value) => setRegion(value as typeof region)}>
      <SelectTrigger className={`${compact ? "w-[100px]" : "w-[180px]"} ${className}`}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <SelectValue>
            {compact ? config.shortName : config.name}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {allRegions.map((regionConfig) => {
          const active = isRegionActive(regionConfig.id);
          return (
            <SelectItem
              key={regionConfig.id}
              value={regionConfig.id}
              disabled={!active}
              className={!active ? "opacity-50" : ""}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{regionConfig.name}</span>
                  {!active && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {regionConfig.tax.name} ({(regionConfig.tax.rate * 100).toFixed(regionConfig.tax.rate === 0.14975 ? 3 : 0)}%)
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}