import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRegionSettings, CanadianRegion } from "@/hooks/useRegionSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Users, 
  Building2,
  ExternalLink
} from "lucide-react";

// Union data organized by region
export interface UnionInfo {
  id: string;
  name: string;
  fullName: string;
  trade?: string;
  location: string;
  region: CanadianRegion;
  phone?: string;
  website?: string;
  memberCount?: number;
}

const UNIONS_BY_REGION: Record<CanadianRegion, UnionInfo[]> = {
  ontario: [
    { id: "ibew-353", name: "IBEW Local 353", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "Toronto", region: "ontario", memberCount: 12000, website: "https://ibew353.org" },
    { id: "ua-46", name: "UA Local 46", fullName: "United Association of Plumbers and Pipefitters", trade: "plumber", location: "Toronto", region: "ontario", memberCount: 8500, website: "https://ualocal46.org" },
    { id: "carpenters-27", name: "Carpenters Local 27", fullName: "United Brotherhood of Carpenters and Joiners", trade: "carpenter", location: "Toronto", region: "ontario", memberCount: 15000, website: "https://thecarpentersunion.ca" },
    { id: "liuna-183", name: "LiUNA Local 183", fullName: "Laborers' International Union of North America", trade: "general_contractor", location: "Toronto", region: "ontario", memberCount: 55000, website: "https://liuna183.com" },
    { id: "ironworkers-721", name: "Ironworkers Local 721", fullName: "International Association of Bridge, Structural, Ornamental and Reinforcing Iron Workers", trade: "welder", location: "Toronto", region: "ontario", memberCount: 3500, website: "https://ironworkers721.org" },
    { id: "smw-30", name: "Sheet Metal Workers Local 30", fullName: "International Association of Sheet Metal Workers", trade: "hvac_technician", location: "Toronto", region: "ontario", memberCount: 2800, website: "https://smwlocal30.ca" },
    { id: "ibew-120", name: "IBEW Local 120", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "London", region: "ontario", memberCount: 1500 },
    { id: "liuna-837", name: "LiUNA Local 837", fullName: "Laborers' International Union of North America", trade: "general_contractor", location: "Hamilton", region: "ontario", memberCount: 8000 },
    { id: "ua-527", name: "UA Local 527", fullName: "United Association of Plumbers and Pipefitters", trade: "plumber", location: "Hamilton", region: "ontario", memberCount: 2500 },
    { id: "carpenters-18", name: "Carpenters Local 18", fullName: "United Brotherhood of Carpenters", trade: "carpenter", location: "Hamilton", region: "ontario", memberCount: 3000 },
    { id: "ibew-105", name: "IBEW Local 105", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "Hamilton", region: "ontario", memberCount: 2000 },
    { id: "opeiu-343", name: "OPEIU Local 343", fullName: "Office and Professional Employees International Union", location: "Ontario", region: "ontario", memberCount: 1200 },
  ],
  quebec: [
    { id: "ibew-568", name: "IBEW Local 568", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "Montreal", region: "quebec", memberCount: 4500 },
    { id: "ua-144", name: "UA Local 144", fullName: "United Association of Plumbers", trade: "plumber", location: "Montreal", region: "quebec", memberCount: 3200 },
    { id: "fipoe-144", name: "FTQ-Construction", fullName: "Fédération des travailleurs et travailleuses du Québec", location: "Quebec", region: "quebec", memberCount: 85000, website: "https://ftq.qc.ca" },
    { id: "ccq", name: "CCQ Members", fullName: "Commission de la construction du Québec", location: "Quebec", region: "quebec", memberCount: 175000, website: "https://ccq.org" },
    { id: "liuna-62", name: "LiUNA Local 62", fullName: "Laborers' International Union", trade: "general_contractor", location: "Montreal", region: "quebec", memberCount: 12000 },
    { id: "csn-construction", name: "CSN Construction", fullName: "Confédération des syndicats nationaux", location: "Quebec", region: "quebec", memberCount: 22000, website: "https://csn.qc.ca" },
    { id: "csd-construction", name: "CSD Construction", fullName: "Centrale des syndicats démocratiques", location: "Quebec", region: "quebec", memberCount: 8500 },
    { id: "smw-116", name: "Sheet Metal Workers Local 116", fullName: "Sheet Metal Workers International Association", trade: "hvac_technician", location: "Montreal", region: "quebec", memberCount: 1800 },
  ],
  bc: [
    { id: "ibew-213", name: "IBEW Local 213", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "Vancouver", region: "bc", memberCount: 6500, website: "https://ibew213.org" },
    { id: "ua-170", name: "UA Local 170", fullName: "United Association of Plumbers and Pipefitters", trade: "plumber", location: "Vancouver", region: "bc", memberCount: 4500 },
    { id: "carpenters-1598", name: "Carpenters Local 1598", fullName: "United Brotherhood of Carpenters", trade: "carpenter", location: "Vancouver", region: "bc", memberCount: 5000 },
    { id: "liuna-1611", name: "LiUNA Local 1611", fullName: "Laborers' International Union", trade: "general_contractor", location: "Vancouver", region: "bc", memberCount: 3500 },
    { id: "ironworkers-97", name: "Ironworkers Local 97", fullName: "International Association of Iron Workers", trade: "welder", location: "Vancouver", region: "bc", memberCount: 2200 },
    { id: "smw-280", name: "Sheet Metal Workers Local 280", fullName: "Sheet Metal Workers International Association", trade: "hvac_technician", location: "Vancouver", region: "bc", memberCount: 2000 },
    { id: "operating-115", name: "Operating Engineers Local 115", fullName: "International Union of Operating Engineers", trade: "heavy_equipment_operator", location: "BC", region: "bc", memberCount: 11000, website: "https://iuoe115.ca" },
    { id: "bcbt", name: "BC Building Trades", fullName: "British Columbia Building Trades", location: "BC", region: "bc", memberCount: 35000, website: "https://bcbuildingtrades.org" },
  ],
  alberta: [
    { id: "ibew-424", name: "IBEW Local 424", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "Edmonton", region: "alberta", memberCount: 4000 },
    { id: "ibew-254", name: "IBEW Local 254", fullName: "International Brotherhood of Electrical Workers", trade: "electrician", location: "Calgary", region: "alberta", memberCount: 3500 },
    { id: "ua-488", name: "UA Local 488", fullName: "United Association of Plumbers and Pipefitters", trade: "plumber", location: "Edmonton", region: "alberta", memberCount: 8000, website: "https://local488.ca" },
    { id: "ua-496", name: "UA Local 496", fullName: "United Association of Plumbers and Pipefitters", trade: "plumber", location: "Calgary", region: "alberta", memberCount: 3500 },
    { id: "liuna-92", name: "LiUNA Local 92", fullName: "Laborers' International Union", trade: "general_contractor", location: "Edmonton", region: "alberta", memberCount: 4500 },
    { id: "ironworkers-720", name: "Ironworkers Local 720", fullName: "International Association of Iron Workers", trade: "welder", location: "Edmonton", region: "alberta", memberCount: 2800 },
    { id: "smw-8", name: "Sheet Metal Workers Local 8", fullName: "Sheet Metal Workers International Association", trade: "hvac_technician", location: "Alberta", region: "alberta", memberCount: 2200 },
    { id: "operating-955", name: "Operating Engineers Local 955", fullName: "International Union of Operating Engineers", trade: "heavy_equipment_operator", location: "Alberta", region: "alberta", memberCount: 6500 },
    { id: "carpenters-2103", name: "Carpenters Local 2103", fullName: "United Brotherhood of Carpenters", trade: "carpenter", location: "Alberta", region: "alberta", memberCount: 4000 },
    { id: "abbt", name: "Alberta Building Trades", fullName: "Alberta Building Trades Council", location: "Alberta", region: "alberta", memberCount: 25000, website: "https://abtrades.ca" },
  ],
};

interface UnionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  primaryTrade?: string;
  className?: string;
}

export function UnionSelector({ value, onChange, primaryTrade, className = "" }: UnionSelectorProps) {
  const { t } = useTranslation();
  const { region, config } = useRegionSettings();
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get unions for current region
  const regionUnions = useMemo(() => {
    return UNIONS_BY_REGION[region] || [];
  }, [region]);

  // Filter unions by trade if available, otherwise show all
  const filteredUnions = useMemo(() => {
    let unions = regionUnions;

    // Filter by trade if primary trade is set
    if (primaryTrade) {
      const tradeUnions = unions.filter(u => u.trade === primaryTrade);
      // If there are trade-specific unions, prioritize them but also show general ones
      if (tradeUnions.length > 0) {
        const generalUnions = unions.filter(u => !u.trade);
        unions = [...tradeUnions, ...generalUnions];
      }
    }

    return unions;
  }, [regionUnions, primaryTrade]);

  // Check if current value is a custom entry (not in the list)
  const isCustomValue = value && !regionUnions.find(u => u.name === value);

  // Find selected union details
  const selectedUnion = regionUnions.find(u => u.name === value);

  const handleSelectUnion = (unionName: string) => {
    if (unionName === "__custom__") {
      setShowCustomInput(true);
      onChange("");
    } else {
      setShowCustomInput(false);
      onChange(unionName);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Region indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>{t('profile.showingUnionsFor', 'Showing unions for')} <strong>{config.name}</strong></span>
      </div>

      {!showCustomInput && !isCustomValue ? (
        <>

          {/* Union selector */}
          <Select value={value} onValueChange={handleSelectUnion}>
            <SelectTrigger>
              <SelectValue placeholder={t('profile.selectUnion', 'Select your union')} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {filteredUnions.map((union) => (
                <SelectItem key={union.id} value={union.name}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">{union.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {union.location}
                        {union.memberCount && ` • ${union.memberCount.toLocaleString()} members`}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="__custom__">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{t('profile.otherUnion', 'Other (enter manually)')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Selected union details */}
          {selectedUnion && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{selectedUnion.fullName}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{selectedUnion.location}</span>
                    {selectedUnion.memberCount && (
                      <>
                        <span>•</span>
                        <Users className="h-3 w-3" />
                        <span>{selectedUnion.memberCount.toLocaleString()} {t('profile.members', 'members')}</span>
                      </>
                    )}
                  </div>
                </div>
                {selectedUnion.website && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(selectedUnion.website, "_blank")}
                    className="gap-1 text-amber-600 hover:text-amber-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Custom union input */}
          <div className="space-y-2">
            <Label htmlFor="customUnion">{t('profile.unionName', 'Union Name')}</Label>
            <Input 
              id="customUnion"
              placeholder={t('profile.enterUnionName', 'e.g., IBEW Local 353, Carpenters Union Local 27')}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('profile.enterUnionHint', 'Enter the name of your trade union or local chapter')}
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setShowCustomInput(false);
                  onChange("");
                }}
                className="text-xs"
              >
                {t('profile.backToList', 'Back to list')}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Union count for region */}
      <p className="text-xs text-muted-foreground">
        {regionUnions.length} {t('profile.unionsAvailable', 'unions available in')} {config.name}
      </p>
    </div>
  );
}

export { UNIONS_BY_REGION };
