import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Sun, 
  Wind, 
  Droplets,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  useWeather, 
  getWeatherIconUrl, 
  formatTemp,
  getAlertIcon,
  type ConstructionAlert 
} from "@/hooks/useWeather";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface WeatherWidgetProps {
  location?: string;
  lat?: number;
  lon?: number;
  compact?: boolean;
  showForecast?: boolean;
  className?: string;
}

export function WeatherWidget({ 
  location, 
  lat, 
  lon, 
  compact = false,
  showForecast = true,
  className 
}: WeatherWidgetProps) {
  const { current, forecast, location: weatherLocation, loading, error, refetch } = useWeather({
    location,
    lat,
    lon,
    days: 5,
    enabled: !!(location || (lat && lon))
  });

  if (!location && !lat && !lon) {
    return (
      <Card className={cn("border-dashed border-muted-foreground/30", className)}>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Cloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Set project address to see weather</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Weather unavailable</span>
            </div>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  const hasAlerts = current.alerts.length > 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <img 
          src={getWeatherIconUrl(current.icon)} 
          alt={current.description}
          className="h-8 w-8"
        />
        <span className="font-medium">{formatTemp(current.temp)}</span>
        {hasAlerts && (
          <Badge variant="destructive" className="h-5 px-1">
            <AlertTriangle className="h-3 w-3" />
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(hasAlerts && "border-amber-300 dark:border-amber-700", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-500" />
            Weather
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refetch}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {weatherLocation && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {weatherLocation.name}, {weatherLocation.country}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather */}
        <div className="flex items-center gap-4">
          <img 
            src={getWeatherIconUrl(current.icon, "large")} 
            alt={current.description}
            className="h-16 w-16"
          />
          <div>
            <div className="text-3xl font-bold">{formatTemp(current.temp)}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {current.description}
            </div>
            <div className="text-xs text-muted-foreground">
              Feels like {formatTemp(current.feels_like)}
            </div>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-blue-500" />
            <span>{Math.round(current.wind_speed * 3.6)} km/h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-cyan-500" />
            <span>{current.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-slate-500" />
            <span>{Math.round(current.visibility / 1000)}km</span>
          </div>
        </div>

        {/* Construction Alerts */}
        {hasAlerts && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Construction Alerts
            </div>
            {current.alerts.map((alert, idx) => (
              <AlertBadge key={idx} alert={alert} />
            ))}
          </div>
        )}

        {/* 5-Day Forecast */}
        {showForecast && forecast && forecast.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">5-Day Forecast</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {forecast.slice(0, 5).map((day) => (
                <ForecastDayCard key={day.date} day={day} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertBadge({ alert }: { alert: ConstructionAlert }) {
  return (
    <div 
      className={cn(
        "flex items-start gap-2 p-2 rounded-md text-xs",
        alert.severity === "danger" 
          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200" 
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      )}
    >
      <span>{getAlertIcon(alert.type)}</span>
      <span>{alert.message}</span>
    </div>
  );
}

function ForecastDayCard({ day }: { day: { date: string; temp_min: number; temp_max: number; icon: string; alerts: ConstructionAlert[] } }) {
  const date = parseISO(day.date);
  const hasAlerts = day.alerts.length > 0;
  const hasDanger = day.alerts.some(a => a.severity === "danger");
  
  return (
    <div 
      className={cn(
        "p-1.5 rounded-md",
        hasDanger && "bg-red-100 dark:bg-red-900/20",
        hasAlerts && !hasDanger && "bg-amber-100 dark:bg-amber-900/20"
      )}
    >
      <div className="text-[10px] font-medium">{format(date, "EEE")}</div>
      <img 
        src={getWeatherIconUrl(day.icon)} 
        alt="" 
        className="h-6 w-6 mx-auto"
      />
      <div className="text-[10px]">
        <span className="font-medium">{day.temp_max}°</span>
        <span className="text-muted-foreground">/{day.temp_min}°</span>
      </div>
      {hasAlerts && (
        <div className="text-[10px]">
          {hasDanger ? "🚨" : "⚠️"}
        </div>
      )}
    </div>
  );
}

// Mini widget for calendar cells
interface WeatherMiniProps {
  date: string;
  location?: string;
  lat?: number;
  lon?: number;
}

export function WeatherMini({ date, location, lat, lon }: WeatherMiniProps) {
  const { getWeatherForDate, loading } = useWeather({
    location,
    lat,
    lon,
    enabled: !!(location || (lat && lon))
  });
  
  const forecast = getWeatherForDate(date);
  
  if (loading || !forecast) return null;
  
  const hasAlerts = forecast.alerts.length > 0;
  const hasDanger = forecast.alerts.some(a => a.severity === "danger");
  
  return (
    <div 
      className={cn(
        "flex items-center gap-0.5 text-[10px]",
        hasDanger && "text-red-600",
        hasAlerts && !hasDanger && "text-amber-600"
      )}
      title={forecast.alerts.map(a => a.message).join("\n") || forecast.description}
    >
      <img 
        src={getWeatherIconUrl(forecast.icon)} 
        alt={forecast.description}
        className="h-4 w-4"
      />
      <span>{forecast.temp_max}°</span>
      {hasAlerts && <span>{hasDanger ? "🚨" : "⚠️"}</span>}
    </div>
  );
}
