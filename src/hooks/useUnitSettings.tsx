import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type UnitSystem = "imperial" | "metric";

// Conversion factors
const CONVERSIONS = {
  // Length
  ftToM: 0.3048,
  mToFt: 3.28084,
  inToMm: 25.4,
  mmToIn: 0.0393701,
  // Area
  sqFtToSqM: 0.092903,
  sqMToSqFt: 10.7639,
  // Volume
  cuYdToCuM: 0.764555,
  cuMToCuYd: 1.30795,
};

interface UnitConfig {
  length: { small: string; large: string };
  area: string;
  volume: string;
}

const UNIT_CONFIGS: Record<UnitSystem, UnitConfig> = {
  imperial: {
    length: { small: "in", large: "ft" },
    area: "sq ft",
    volume: "cu yd",
  },
  metric: {
    length: { small: "mm", large: "m" },
    area: "sq m",
    volume: "cu m",
  },
};

interface ConvertedValue {
  value: number;
  unit: string;
  formatted: string;
}

interface UnitContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  config: UnitConfig;
  isImperial: boolean;
  isMetric: boolean;
  // Conversion functions - always store in imperial, convert for display
  convertLength: (value: number, fromUnit: string) => ConvertedValue;
  convertArea: (value: number, fromUnit: string) => ConvertedValue;
  convertVolume: (value: number, fromUnit: string) => ConvertedValue;
  // Price conversion (per unit)
  convertUnitPrice: (price: number, unit: string) => { price: number; unit: string };
  // Display helper
  formatWithUnit: (value: number, unit: string, decimals?: number) => string;
  // Get the display unit for a given base unit
  getDisplayUnit: (baseUnit: string) => string;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

const STORAGE_KEY = "buildunion_unit_system";

// Map of units to their type
const UNIT_TYPE_MAP: Record<string, "length_small" | "length_large" | "area" | "volume" | "count"> = {
  // Imperial
  "in": "length_small",
  "inches": "length_small",
  "ft": "length_large",
  "feet": "length_large",
  "sq ft": "area",
  "sqft": "area",
  "cu yd": "volume",
  "cubic yards": "volume",
  // Metric
  "mm": "length_small",
  "millimeters": "length_small",
  "m": "length_large",
  "meters": "length_large",
  "sq m": "area",
  "sqm": "area",
  "cu m": "volume",
  "cubic meters": "volume",
  // Count-based (no conversion)
  "boxes": "count",
  "box": "count",
  "gallons": "count",
  "gallon": "count",
  "sheets": "count",
  "sheet": "count",
  "bags": "count",
  "bag": "count",
  "rolls": "count",
  "roll": "count",
  "pcs": "count",
  "pieces": "count",
  "units": "count",
  "ea": "count",
  "each": "count",
  "hours": "count",
  "hrs": "count",
  "hour": "count",
  "days": "count",
  "day": "count",
};

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "imperial" || stored === "metric") {
        return stored;
      }
    }
    return "imperial"; // Default to imperial for Canadian construction
  });

  const config = UNIT_CONFIGS[unitSystem];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unitSystem);
  }, [unitSystem]);

  const setUnitSystem = (newSystem: UnitSystem) => {
    setUnitSystemState(newSystem);
  };

  // Normalize unit string
  const normalizeUnit = (unit: string): string => {
    return unit.toLowerCase().trim();
  };

  // Get unit type
  const getUnitType = (unit: string): "length_small" | "length_large" | "area" | "volume" | "count" => {
    const normalized = normalizeUnit(unit);
    return UNIT_TYPE_MAP[normalized] || "count";
  };

  // Convert length value
  const convertLength = useCallback((value: number, fromUnit: string): ConvertedValue => {
    const unitType = getUnitType(fromUnit);
    
    if (unitType !== "length_small" && unitType !== "length_large") {
      return { value, unit: fromUnit, formatted: `${value.toLocaleString()} ${fromUnit}` };
    }

    const isFromImperial = ["in", "inches", "ft", "feet"].includes(normalizeUnit(fromUnit));
    
    let convertedValue = value;
    let targetUnit = fromUnit;

    if (unitSystem === "metric" && isFromImperial) {
      // Convert imperial to metric
      if (unitType === "length_small") {
        convertedValue = value * CONVERSIONS.inToMm;
        targetUnit = "mm";
      } else {
        convertedValue = value * CONVERSIONS.ftToM;
        targetUnit = "m";
      }
    } else if (unitSystem === "imperial" && !isFromImperial) {
      // Convert metric to imperial
      if (unitType === "length_small") {
        convertedValue = value * CONVERSIONS.mmToIn;
        targetUnit = "in";
      } else {
        convertedValue = value * CONVERSIONS.mToFt;
        targetUnit = "ft";
      }
    }

    return {
      value: convertedValue,
      unit: targetUnit,
      formatted: `${convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${targetUnit}`,
    };
  }, [unitSystem]);

  // Convert area value
  const convertArea = useCallback((value: number, fromUnit: string): ConvertedValue => {
    const unitType = getUnitType(fromUnit);
    
    if (unitType !== "area") {
      return { value, unit: fromUnit, formatted: `${value.toLocaleString()} ${fromUnit}` };
    }

    const isFromImperial = ["sq ft", "sqft"].includes(normalizeUnit(fromUnit));
    
    let convertedValue = value;
    let targetUnit = fromUnit;

    if (unitSystem === "metric" && isFromImperial) {
      convertedValue = value * CONVERSIONS.sqFtToSqM;
      targetUnit = "sq m";
    } else if (unitSystem === "imperial" && !isFromImperial) {
      convertedValue = value * CONVERSIONS.sqMToSqFt;
      targetUnit = "sq ft";
    }

    return {
      value: convertedValue,
      unit: targetUnit,
      formatted: `${convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${targetUnit}`,
    };
  }, [unitSystem]);

  // Convert volume value
  const convertVolume = useCallback((value: number, fromUnit: string): ConvertedValue => {
    const unitType = getUnitType(fromUnit);
    
    if (unitType !== "volume") {
      return { value, unit: fromUnit, formatted: `${value.toLocaleString()} ${fromUnit}` };
    }

    const isFromImperial = ["cu yd", "cubic yards"].includes(normalizeUnit(fromUnit));
    
    let convertedValue = value;
    let targetUnit = fromUnit;

    if (unitSystem === "metric" && isFromImperial) {
      convertedValue = value * CONVERSIONS.cuYdToCuM;
      targetUnit = "cu m";
    } else if (unitSystem === "imperial" && !isFromImperial) {
      convertedValue = value * CONVERSIONS.cuMToCuYd;
      targetUnit = "cu yd";
    }

    return {
      value: convertedValue,
      unit: targetUnit,
      formatted: `${convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${targetUnit}`,
    };
  }, [unitSystem]);

  // Convert unit price (inverse conversion to keep total consistent)
  const convertUnitPrice = useCallback((price: number, unit: string): { price: number; unit: string } => {
    const unitType = getUnitType(unit);
    const normalizedUnit = normalizeUnit(unit);
    
    if (unitType === "count") {
      return { price, unit };
    }

    const isFromImperial = ["in", "inches", "ft", "feet", "sq ft", "sqft", "cu yd", "cubic yards"].includes(normalizedUnit);

    if (unitSystem === "metric" && isFromImperial) {
      // Price per imperial unit → Price per metric unit
      if (unitType === "area") {
        // $/sq ft → $/sq m (multiply by conversion factor since metric units are larger)
        return { price: price * CONVERSIONS.sqMToSqFt, unit: "sq m" };
      } else if (unitType === "length_large") {
        return { price: price * CONVERSIONS.mToFt, unit: "m" };
      } else if (unitType === "length_small") {
        return { price: price * CONVERSIONS.mmToIn, unit: "mm" };
      } else if (unitType === "volume") {
        return { price: price * CONVERSIONS.cuMToCuYd, unit: "cu m" };
      }
    } else if (unitSystem === "imperial" && !isFromImperial) {
      // Price per metric unit → Price per imperial unit
      if (unitType === "area") {
        return { price: price * CONVERSIONS.sqFtToSqM, unit: "sq ft" };
      } else if (unitType === "length_large") {
        return { price: price * CONVERSIONS.ftToM, unit: "ft" };
      } else if (unitType === "length_small") {
        return { price: price * CONVERSIONS.inToMm, unit: "in" };
      } else if (unitType === "volume") {
        return { price: price * CONVERSIONS.cuYdToCuM, unit: "cu yd" };
      }
    }

    return { price, unit };
  }, [unitSystem]);

  // Format value with unit
  const formatWithUnit = useCallback((value: number, unit: string, decimals: number = 2): string => {
    const unitType = getUnitType(unit);
    
    if (unitType === "count") {
      return `${value.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${unit}`;
    }

    if (unitType === "area") {
      const converted = convertArea(value, unit);
      return converted.formatted;
    } else if (unitType === "volume") {
      const converted = convertVolume(value, unit);
      return converted.formatted;
    } else {
      const converted = convertLength(value, unit);
      return converted.formatted;
    }
  }, [convertArea, convertVolume, convertLength]);

  // Get display unit for a base unit
  const getDisplayUnit = useCallback((baseUnit: string): string => {
    const unitType = getUnitType(baseUnit);
    
    if (unitType === "count") {
      return baseUnit;
    }

    if (unitSystem === "imperial") {
      switch (unitType) {
        case "length_small": return "in";
        case "length_large": return "ft";
        case "area": return "sq ft";
        case "volume": return "cu yd";
        default: return baseUnit;
      }
    } else {
      switch (unitType) {
        case "length_small": return "mm";
        case "length_large": return "m";
        case "area": return "sq m";
        case "volume": return "cu m";
        default: return baseUnit;
      }
    }
  }, [unitSystem]);

  return (
    <UnitContext.Provider
      value={{
        unitSystem,
        setUnitSystem,
        config,
        isImperial: unitSystem === "imperial",
        isMetric: unitSystem === "metric",
        convertLength,
        convertArea,
        convertVolume,
        convertUnitPrice,
        formatWithUnit,
        getDisplayUnit,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnitSettings() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error("useUnitSettings must be used within a UnitProvider");
  }
  return context;
}
