import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherData {
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
  uv_index?: number;
  alerts: ConstructionAlert[];
}

interface ConstructionAlert {
  type: "frost" | "heat" | "rain" | "wind" | "snow" | "low_visibility";
  severity: "warning" | "danger";
  message: string;
}

interface ForecastDay {
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

// Generate construction-specific alerts based on weather conditions
function generateConstructionAlerts(weather: any): ConstructionAlert[] {
  const alerts: ConstructionAlert[] = [];
  
  // Frost alert (below 0°C)
  if (weather.temp < 0) {
    alerts.push({
      type: "frost",
      severity: weather.temp < -10 ? "danger" : "warning",
      message: weather.temp < -10 
        ? "Extreme frost - all concrete/masonry work prohibited"
        : "Frost conditions - protect concrete and materials"
    });
  }
  
  // Heat alert (above 30°C)
  if (weather.feels_like > 30) {
    alerts.push({
      type: "heat",
      severity: weather.feels_like > 35 ? "danger" : "warning",
      message: weather.feels_like > 35
        ? "Extreme heat - mandatory rest breaks required"
        : "High heat - ensure hydration and shade breaks"
    });
  }
  
  // Heavy rain alert
  if (weather.rain_1h && weather.rain_1h > 2.5) {
    alerts.push({
      type: "rain",
      severity: weather.rain_1h > 7.5 ? "danger" : "warning",
      message: weather.rain_1h > 7.5
        ? "Heavy rain - suspend outdoor work"
        : "Moderate rain - protect materials and open excavations"
    });
  }
  
  // High wind alert (above 40 km/h = 11.1 m/s)
  const windSpeed = weather.wind_speed || 0;
  const windGust = weather.wind_gust || windSpeed;
  if (windGust > 11.1) {
    alerts.push({
      type: "wind",
      severity: windGust > 17 ? "danger" : "warning",
      message: windGust > 17
        ? "Dangerous winds - no crane operations, secure all materials"
        : "High winds - secure loose materials and scaffolding"
    });
  }
  
  // Snow alert
  if (weather.snow_1h && weather.snow_1h > 0) {
    alerts.push({
      type: "snow",
      severity: weather.snow_1h > 10 ? "danger" : "warning",
      message: weather.snow_1h > 10
        ? "Heavy snowfall - clear access routes before work"
        : "Snow conditions - slippery surfaces, use caution"
    });
  }
  
  // Low visibility alert (below 1km = 1000m)
  if (weather.visibility && weather.visibility < 1000) {
    alerts.push({
      type: "low_visibility",
      severity: weather.visibility < 500 ? "danger" : "warning",
      message: weather.visibility < 500
        ? "Very poor visibility - suspend heavy equipment operations"
        : "Reduced visibility - extra caution for vehicle movements"
    });
  }
  
  return alerts;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!apiKey) {
      throw new Error("OpenWeatherMap API key not configured");
    }

    const body = await req.json();
    const { lat, lon, location, days = 5 } = body || {};
    
    let latitude = lat;
    let longitude = lon;
    
    // If location string provided instead of coordinates, geocode it
    if (location && (!lat || !lon)) {
      // Validate location string - skip obvious placeholders
      const invalidLocations = ['test', 'example', 'placeholder', 'n/a', 'na', 'tbd', 'xxx', ''];
      const normalizedLocation = location.toString().toLowerCase().trim();
      
      if (invalidLocations.includes(normalizedLocation) || normalizedLocation.length < 3) {
        // Return empty weather data instead of error for invalid placeholder addresses
        return new Response(
          JSON.stringify({ 
            current: null,
            forecast: [],
            location: { lat: 0, lon: 0, name: 'Unknown', country: '' },
            warning: "Invalid or placeholder address. Set a real project address to get weather data."
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200 
          }
        );
      }
      
      // Helper function to try geocoding a location string
      const tryGeocode = async (query: string): Promise<{lat: number, lon: number} | null> => {
        try {
          const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
          const geoRes = await fetch(geoUrl);
          
          if (!geoRes.ok) return null;
          
          const geoData = await geoRes.json();
          
          if (geoData && Array.isArray(geoData) && geoData.length > 0 && geoData[0]?.lat && geoData[0]?.lon) {
            return { lat: geoData[0].lat, lon: geoData[0].lon };
          }
          return null;
        } catch {
          return null;
        }
      };
      
      // Extract city/region from address for fallback
      const extractCityFromAddress = (addr: string): string[] => {
        const candidates: string[] = [];
        
        // Common Canadian/US patterns: "123 Street Name, City, Province/State"
        const parts = addr.split(',').map(p => p.trim());
        
        // If we have comma-separated parts, try the city/region parts
        if (parts.length >= 2) {
          // Try "City, Province/State/Country" combinations
          candidates.push(parts.slice(1).join(', ')); // Everything after street
          candidates.push(parts[1]); // Just the city part
          if (parts.length >= 3) {
            candidates.push(`${parts[1]}, ${parts[2]}`); // City, Province
          }
        }
        
        // Try to find city names in the address (common cities)
        const cityPatterns = [
          /\b(Toronto|Vancouver|Montreal|Calgary|Edmonton|Ottawa|Winnipeg|Quebec|Hamilton|Kitchener|London|Victoria|Halifax|Saskatoon|Regina|St\. John's|Windsor|Kelowna|Barrie|Oshawa|Markham|Mississauga|Brampton)\b/i,
          /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Columbus|Indianapolis|Charlotte|Seattle|Denver|Boston|Detroit|Nashville|Portland|Memphis|Louisville|Baltimore|Milwaukee|Miami)\b/i,
          /\b(Ontario|Quebec|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland|Prince Edward Island|BC|ON|QC|AB|MB|SK|NS|NB|NL|PEI)\b/i
        ];
        
        for (const pattern of cityPatterns) {
          const match = addr.match(pattern);
          if (match) {
            candidates.push(match[1]);
            // Try city with "Canada" or "USA" suffix
            candidates.push(`${match[1]}, Canada`);
            candidates.push(`${match[1]}, USA`);
          }
        }
        
        return [...new Set(candidates)]; // Remove duplicates
      };
      
      try {
        // First try the full location string
        let result = await tryGeocode(location);
        
        // If full address fails, try extracted city/region parts
        if (!result) {
          const fallbackQueries = extractCityFromAddress(location);
          console.log(`Full address geocoding failed, trying fallbacks:`, fallbackQueries);
          
          for (const query of fallbackQueries) {
            result = await tryGeocode(query);
            if (result) {
              console.log(`Geocoding succeeded with fallback: ${query}`);
              break;
            }
          }
        }
        
        if (!result) {
          return new Response(
            JSON.stringify({ 
              error: "Location not found", 
              message: `Could not find weather location for: ${location}. Try using just the city name (e.g., "Toronto, ON, Canada").`,
              code: "LOCATION_NOT_FOUND"
            }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400 
            }
          );
        }
        
        latitude = result.lat;
        longitude = result.lon;
      } catch (geoError: any) {
        console.error("Geocoding error:", geoError);
        return new Response(
          JSON.stringify({ 
            error: "Geocoding error", 
            message: `Could not geocode location: ${location}`,
            code: "GEOCODING_ERROR"
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400 
          }
        );
      }
    }
    
    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ 
          error: "Location required", 
          message: "Please provide a valid project address or coordinates",
          code: "NO_LOCATION"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    // Fetch current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    const currentRes = await fetch(currentUrl);
    const currentData = await currentRes.json();
    
    if (currentData.cod !== 200) {
      throw new Error(currentData.message || "Failed to fetch current weather");
    }

    // Fetch 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();
    
    if (forecastData.cod !== "200") {
      throw new Error(forecastData.message || "Failed to fetch forecast");
    }

    // Process current weather
    const currentWeather: WeatherData = {
      temp: Math.round(currentData.main.temp),
      feels_like: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      wind_speed: currentData.wind.speed,
      wind_gust: currentData.wind.gust,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      rain_1h: currentData.rain?.["1h"],
      snow_1h: currentData.snow?.["1h"],
      visibility: currentData.visibility,
      pressure: currentData.main.pressure,
      clouds: currentData.clouds.all,
      alerts: []
    };
    
    currentWeather.alerts = generateConstructionAlerts({
      temp: currentWeather.temp,
      feels_like: currentWeather.feels_like,
      rain_1h: currentWeather.rain_1h,
      snow_1h: currentWeather.snow_1h,
      wind_speed: currentWeather.wind_speed,
      wind_gust: currentWeather.wind_gust,
      visibility: currentWeather.visibility
    });

    // Process forecast - group by day
    const dailyForecasts: Map<string, any[]> = new Map();
    
    for (const item of forecastData.list) {
      const date = item.dt_txt.split(" ")[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    }

    const forecast: ForecastDay[] = [];
    
    for (const [date, items] of dailyForecasts) {
      if (forecast.length >= days) break;
      
      const temps = items.map((i: any) => i.main.temp);
      const humidities = items.map((i: any) => i.main.humidity);
      const windSpeeds = items.map((i: any) => i.wind.speed);
      const rainProbs = items.map((i: any) => i.pop || 0);
      
      // Check for any snow in forecast
      const hasSnow = items.some((i: any) => i.snow?.["3h"] > 0);
      
      // Get midday weather for icon/description
      const middayItem = items.find((i: any) => i.dt_txt.includes("12:00")) || items[Math.floor(items.length / 2)];
      
      const dayData: ForecastDay = {
        date,
        temp_min: Math.round(Math.min(...temps)),
        temp_max: Math.round(Math.max(...temps)),
        humidity: Math.round(humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length),
        wind_speed: Math.round(Math.max(...windSpeeds) * 10) / 10,
        description: middayItem.weather[0].description,
        icon: middayItem.weather[0].icon,
        rain_prob: Math.round(Math.max(...rainProbs) * 100),
        snow_prob: hasSnow ? Math.round(Math.max(...rainProbs) * 100) : 0,
        alerts: []
      };
      
      // Generate alerts for forecast day
      dayData.alerts = generateConstructionAlerts({
        temp: dayData.temp_min,
        feels_like: dayData.temp_max, // Use max for heat alerts
        rain_1h: dayData.rain_prob > 60 ? 5 : 0, // Estimate
        snow_1h: dayData.snow_prob > 60 ? 5 : 0,
        wind_speed: dayData.wind_speed,
        visibility: 10000 // Assume good visibility for forecast
      });
      
      forecast.push(dayData);
    }

    return new Response(
      JSON.stringify({
        current: currentWeather,
        forecast,
        location: {
          lat: latitude,
          lon: longitude,
          name: currentData.name,
          country: currentData.sys.country
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Weather API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch weather data" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
