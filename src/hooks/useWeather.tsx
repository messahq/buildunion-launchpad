import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConstructionAlert {
  type: "frost" | "heat" | "rain" | "wind" | "snow" | "low_visibility";
  severity: "warning" | "danger";
  message: string;
}

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  wind_gust?: number;
  description: string;
  icon: string;
  rain_1h?: number;
  snow_1h?: number;
  visibility: number;
  pressure: number;
  clouds: number;
  alerts: ConstructionAlert[];
}

export interface ForecastDay {
  date: string;
  temp_min: number;
  temp_max: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  rain_prob: number;
  snow_prob: number;
  alerts: ConstructionAlert[];
}

export interface WeatherLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: ForecastDay[];
  location: WeatherLocation;
}

interface UseWeatherOptions {
  lat?: number;
  lon?: number;
  location?: string;
  days?: number;
  enabled?: boolean;
}

export function useWeather(options: UseWeatherOptions = {}) {
  const { lat, lon, location, days = 5, enabled = true } = options;
  
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!enabled) return;
    if (!location && (!lat || !lon)) return;
    
    // Validate location string - skip obvious placeholders
    if (location) {
      const invalidLocations = ['test', 'example', 'placeholder', 'n/a', 'na', 'tbd', 'xxx', ''];
      const normalizedLocation = location.toString().toLowerCase().trim();
      
      if (invalidLocations.includes(normalizedLocation) || normalizedLocation.length < 3) {
        setError("Please provide a valid project address for weather data");
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await supabase.functions.invoke("get-weather", {
        body: { lat, lon, location, days }
      });
      
      const result = response.data;
      const fnError = response.error;
      
      // Handle FunctionsHttpError - extract message from error context
      if (fnError) {
        let errorMessage = "Failed to fetch weather data";
        let errorCode = "";
        
        // Try to get error details from the error context
        try {
          // FunctionsHttpError has a context property with the response
          if (fnError.context && typeof fnError.context.json === 'function') {
            const errorBody = await fnError.context.json();
            errorMessage = errorBody?.message || errorBody?.error || errorMessage;
            errorCode = errorBody?.code || "";
          }
        } catch {
          // If we can't parse the error body, use the error message
          errorMessage = fnError.message || errorMessage;
        }
        
        // Handle location-related errors gracefully
        if (errorCode === 'INVALID_LOCATION' || errorCode === 'LOCATION_NOT_FOUND' || 
            errorCode === 'GEOCODING_FAILED' || errorCode === 'NO_LOCATION' ||
            errorMessage.toLowerCase().includes('location')) {
          setError(errorMessage || "Location could not be found. Try a more specific address.");
          return;
        }
        
        setError(errorMessage);
        return;
      }
      
      if (result?.error) {
        // Handle specific error codes gracefully
        if (result.code === 'INVALID_LOCATION' || result.code === 'LOCATION_NOT_FOUND' ||
            result.code === 'GEOCODING_FAILED' || result.code === 'NO_LOCATION') {
          setError(result.message || "Location could not be found");
          return;
        }
        throw new Error(result.message || result.error);
      }
      
      setData(result);
    } catch (err: any) {
      console.error("Weather fetch error:", err);
      // Provide user-friendly message for location issues
      const msg = err.message || "Failed to fetch weather data";
      if (msg.toLowerCase().includes("location") || msg.toLowerCase().includes("geocod")) {
        setError("Could not find this location. Try a more specific address like '123 Main St, Toronto, ON'");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lon, location, days, enabled]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Get weather for a specific date from forecast
  const getWeatherForDate = useCallback((dateStr: string): ForecastDay | undefined => {
    if (!data?.forecast) return undefined;
    return data.forecast.find(f => f.date === dateStr);
  }, [data]);

  // Check if a date has any construction alerts
  const hasAlertsForDate = useCallback((dateStr: string): boolean => {
    const forecast = getWeatherForDate(dateStr);
    return (forecast?.alerts?.length ?? 0) > 0;
  }, [getWeatherForDate]);

  return {
    data,
    current: data?.current,
    forecast: data?.forecast,
    location: data?.location,
    loading,
    error,
    refetch: fetchWeather,
    getWeatherForDate,
    hasAlertsForDate
  };
}

// Helper to get weather icon URL from OpenWeatherMap
export function getWeatherIconUrl(icon: string, size: "small" | "large" = "small"): string {
  const sizeCode = size === "large" ? "@2x" : "";
  return `https://openweathermap.org/img/wn/${icon}${sizeCode}.png`;
}

// Helper to format temperature
export function formatTemp(temp: number, unit: "C" | "F" = "C"): string {
  if (unit === "F") {
    return `${Math.round(temp * 9/5 + 32)}°F`;
  }
  return `${Math.round(temp)}°C`;
}

// Helper to get alert icon
export function getAlertIcon(type: ConstructionAlert["type"]): string {
  switch (type) {
    case "frost": return "❄️";
    case "heat": return "🔥";
    case "rain": return "🌧️";
    case "wind": return "💨";
    case "snow": return "🌨️";
    case "low_visibility": return "🌫️";
    default: return "⚠️";
  }
}
