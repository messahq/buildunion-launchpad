import { useRegionSettings } from "@/hooks/useRegionSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface RegionSelectorProps {
  compact?: boolean;
  className?: string;
}

export function RegionSelector({ compact = false, className = "" }: RegionSelectorProps) {
  const { region, setRegion, allRegions, config } = useRegionSettings();

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
        {allRegions.map((regionConfig) => (
          <SelectItem key={regionConfig.id} value={regionConfig.id}>
            <div className="flex flex-col">
              <span className="font-medium">{regionConfig.name}</span>
              <span className="text-xs text-muted-foreground">
                {regionConfig.tax.name} ({(regionConfig.tax.rate * 100).toFixed(regionConfig.tax.rate === 0.14975 ? 3 : 0)}%)
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
