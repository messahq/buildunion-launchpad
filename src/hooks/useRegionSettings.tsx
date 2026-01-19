import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type CanadianRegion = "ontario" | "quebec" | "bc" | "alberta";

interface TaxConfig {
  name: string;
  rate: number;
  components: { name: string; rate: number }[];
}

interface RegionConfig {
  id: CanadianRegion;
  name: string;
  shortName: string;
  tax: TaxConfig;
  dateFormat: string;
  currency: {
    locale: string;
    code: string;
  };
  footer: string;
  legalNote: string;
}

const REGION_CONFIGS: Record<CanadianRegion, RegionConfig> = {
  ontario: {
    id: "ontario",
    name: "Ontario",
    shortName: "ON",
    tax: {
      name: "HST",
      rate: 0.13,
      components: [{ name: "HST", rate: 0.13 }],
    },
    dateFormat: "MM/dd/yyyy",
    currency: { locale: "en-CA", code: "CAD" },
    footer: "Greater Toronto Area • Ontario",
    legalNote: "Licensed & Insured • WSIB Covered",
  },
  quebec: {
    id: "quebec",
    name: "Quebec",
    shortName: "QC",
    tax: {
      name: "GST + QST",
      rate: 0.14975,
      components: [
        { name: "GST", rate: 0.05 },
        { name: "QST", rate: 0.09975 },
      ],
    },
    dateFormat: "yyyy-MM-dd",
    currency: { locale: "fr-CA", code: "CAD" },
    footer: "Greater Montreal Area • Québec",
    legalNote: "Licencié & Assuré • CCQ Member",
  },
  bc: {
    id: "bc",
    name: "British Columbia",
    shortName: "BC",
    tax: {
      name: "GST + PST",
      rate: 0.12,
      components: [
        { name: "GST", rate: 0.05 },
        { name: "PST", rate: 0.07 },
      ],
    },
    dateFormat: "MM/dd/yyyy",
    currency: { locale: "en-CA", code: "CAD" },
    footer: "Greater Vancouver Area • British Columbia",
    legalNote: "Licensed & Insured • WorkSafeBC Covered",
  },
  alberta: {
    id: "alberta",
    name: "Alberta",
    shortName: "AB",
    tax: {
      name: "GST",
      rate: 0.05,
      components: [{ name: "GST", rate: 0.05 }],
    },
    dateFormat: "MM/dd/yyyy",
    currency: { locale: "en-CA", code: "CAD" },
    footer: "Calgary & Edmonton • Alberta",
    legalNote: "Licensed & Insured • WCB Covered",
  },
};

interface RegionContextType {
  region: CanadianRegion;
  config: RegionConfig;
  setRegion: (region: CanadianRegion) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  calculateTax: (subtotal: number) => { total: number; breakdown: { name: string; amount: number }[] };
  allRegions: RegionConfig[];
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const STORAGE_KEY = "buildunion_region";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<CanadianRegion>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in REGION_CONFIGS) {
        return stored as CanadianRegion;
      }
    }
    return "ontario";
  });

  const config = REGION_CONFIGS[region];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, region);
  }, [region]);

  const setRegion = (newRegion: CanadianRegion) => {
    setRegionState(newRegion);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(config.currency.locale, {
      style: "currency",
      currency: config.currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    const format = config.dateFormat;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return format
      .replace("yyyy", String(year))
      .replace("MM", month)
      .replace("dd", day);
  };

  const calculateTax = (subtotal: number) => {
    const breakdown = config.tax.components.map((component) => ({
      name: component.name,
      amount: subtotal * component.rate,
    }));
    
    const totalTax = breakdown.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      total: subtotal + totalTax,
      breakdown,
    };
  };

  const allRegions = Object.values(REGION_CONFIGS);

  return (
    <RegionContext.Provider
      value={{
        region,
        config,
        setRegion,
        formatCurrency,
        formatDate,
        calculateTax,
        allRegions,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegionSettings() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error("useRegionSettings must be used within a RegionProvider");
  }
  return context;
}

export { REGION_CONFIGS };
export type { RegionConfig, TaxConfig };
