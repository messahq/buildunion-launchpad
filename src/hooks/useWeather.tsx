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
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("get-weather", {
        body: { lat, lon, location, days }
      });
      
      if (fnError) throw fnError;
      if (result.error) throw new Error(result.error);
      
      setData(result);
    } catch (err: any) {
      console.error("Weather fetch error:", err);
      setError(err.message || "Failed to fetch weather data");
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
