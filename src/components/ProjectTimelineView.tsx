import { useState, useMemo } from "react";
import { format, addDays, isSameDay, isAfter, isBefore, startOfDay, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer,
  AlertTriangle, CheckCircle2, Clock, FileText, Users, ChevronLeft, 
  ChevronRight, Snowflake, Eye, Droplets, Zap
} from "lucide-react";
import { useWeather, getAlertIcon, formatTemp, type ForecastDay, type ConstructionAlert } from "@/hooks/useWeather";

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
  priority?: string;
  assigned_to?: string;
}

interface Contract {
  id: string;
  contract_number: string;
  status: string;
  start_date?: string | null;
  estimated_end_date?: string | null;
  created_at?: string;
  total_amount?: number | null;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: "task" | "contract_start" | "contract_end" | "weather_alert" | "milestone";
  title: string;
  subtitle?: string;
  status?: string;
  priority?: string;
  severity?: "info" | "warning" | "danger";
  icon?: React.ReactNode;
  metadata?: any;
}

interface ProjectTimelineViewProps {
  projectId: string;
  projectAddress?: string | null;
  tasks: Task[];
  contracts: Contract[];
  daysToShow?: number;
}

const getWeatherIcon = (icon: string) => {
  if (icon.includes("01")) return <Sun className="h-4 w-4 text-amber-500" />;
  if (icon.includes("02") || icon.includes("03") || icon.includes("04")) return <Cloud className="h-4 w-4 text-slate-400" />;
  if (icon.includes("09") || icon.includes("10")) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (icon.includes("13")) return <CloudSnow className="h-4 w-4 text-cyan-400" />;
  if (icon.includes("50")) return <Eye className="h-4 w-4 text-slate-400" />;
  return <Cloud className="h-4 w-4 text-slate-400" />;
};

const getAlertSeverityColor = (severity: "warning" | "danger") => {
  return severity === "danger" 
    ? "bg-red-100 text-red-700 border-red-200" 
    : "bg-amber-100 text-amber-700 border-amber-200";
};

const ProjectTimelineView = ({
  projectId,
  projectAddress,
  tasks,
  contracts,
  daysToShow = 14
}: ProjectTimelineViewProps) => {
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  
  // Fetch weather data if we have an address
  const { data: weatherData, loading: weatherLoading, forecast } = useWeather({
    location: projectAddress || undefined,
    days: 5,
    enabled: !!projectAddress
  });

  // Generate timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const today = startOfDay(new Date());

    // Add task deadlines
    tasks.forEach(task => {
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const isOverdue = isBefore(dueDate, today) && task.status !== "completed";
        
        events.push({
          id: `task-${task.id}`,
          date: startOfDay(dueDate),
          type: "task",
          title: task.title,
          subtitle: task.status === "completed" ? "Completed" : isOverdue ? "Overdue" : `Due`,
          status: task.status,
          priority: task.priority,
          severity: isOverdue ? "danger" : task.priority === "high" ? "warning" : "info",
          icon: task.status === "completed" 
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            : isOverdue 
              ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              : <Clock className="h-3.5 w-3.5 text-amber-500" />,
          metadata: task
        });
      }
    });

    // Add contract dates
    contracts.forEach(contract => {
      if (contract.start_date) {
        events.push({
          id: `contract-start-${contract.id}`,
          date: startOfDay(new Date(contract.start_date)),
          type: "contract_start",
          title: `Contract #${contract.contract_number}`,
          subtitle: "Work Begins",
          status: contract.status,
          severity: "info",
          icon: <FileText className="h-3.5 w-3.5 text-cyan-500" />,
          metadata: contract
        });
      }
      
      if (contract.estimated_end_date) {
        events.push({
          id: `contract-end-${contract.id}`,
          date: startOfDay(new Date(contract.estimated_end_date)),
          type: "contract_end",
          title: `Contract #${contract.contract_number}`,
          subtitle: "Target Completion",
          status: contract.status,
          severity: "info",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
          metadata: contract
        });
      }
    });

    // Add weather alerts from forecast
    if (forecast) {
      forecast.forEach(day => {
        if (day.alerts && day.alerts.length > 0) {
          day.alerts.forEach((alert, idx) => {
            events.push({
              id: `weather-${day.date}-${idx}`,
              date: startOfDay(new Date(day.date)),
              type: "weather_alert",
              title: alert.message,
              subtitle: `${alert.type.replace("_", " ")}`,
              severity: alert.severity,
              icon: <span className="text-sm">{getAlertIcon(alert.type)}</span>,
              metadata: { ...day, alert }
            });
          });
        }
      });
    }

    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, contracts, forecast]);

  // Generate days for the timeline
  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  }, [startDate, daysToShow]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return timelineEvents.filter(event => isSameDay(event.date, day));
  };

  // Get weather for a specific day
  const getWeatherForDay = (day: Date): ForecastDay | undefined => {
    if (!forecast) return undefined;
    const dateStr = format(day, "yyyy-MM-dd");
    return forecast.find(f => f.date === dateStr);
  };

  // Navigation
  const goToPrevious = () => setStartDate(prev => addDays(prev, -7));
  const goToNext = () => setStartDate(prev => addDays(prev, 7));
  const goToToday = () => setStartDate(startOfDay(new Date()));

  const today = startOfDay(new Date());

  return (
    <div className="bg-gradient-to-br from-cyan-50/50 to-teal-50/50 rounded-lg border border-cyan-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-white" />
          <div>
            <h3 className="text-white font-semibold text-sm">Project Timeline</h3>
            <p className="text-white/70 text-xs">Contracts • Tasks • Weather</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            className="h-7 w-7 p-0 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-white hover:bg-white/20 text-xs h-7 px-2"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            className="h-7 w-7 p-0 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weather Banner (if available) */}
      {projectAddress && weatherData?.current && (
        <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-cyan-50 border-b border-cyan-100 flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getWeatherIcon(weatherData.current.icon)}
            <span className="text-sm font-medium text-slate-700">
              {formatTemp(weatherData.current.temp)}
            </span>
            <span className="text-xs text-slate-500">
              {weatherData.current.description}
            </span>
          </div>
          {weatherData.current.alerts.length > 0 && (
            <Badge className={`text-[10px] ${getAlertSeverityColor(weatherData.current.alerts[0].severity)}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {weatherData.current.alerts.length} Alert{weatherData.current.alerts.length > 1 ? "s" : ""}
            </Badge>
          )}
          <span className="text-xs text-slate-400 ml-auto">
            {weatherData.location?.name}
          </span>
        </div>
      )}

      {/* Timeline Grid */}
      <ScrollArea className="max-h-[350px]">
        <div className="p-3 space-y-1">
          {timelineDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, today);
            const isPast = isBefore(day, today);
            const events = getEventsForDay(day);
            const weather = getWeatherForDay(day);
            const hasAlerts = weather?.alerts && weather.alerts.length > 0;
            const hasDangerAlert = weather?.alerts?.some(a => a.severity === "danger");

            return (
              <div
                key={dayIndex}
                className={`rounded-lg p-2.5 transition-all ${
                  isToday 
                    ? "bg-cyan-100/80 border-2 border-cyan-400 shadow-sm" 
                    : isPast
                      ? "bg-slate-50/50 opacity-75"
                      : hasDangerAlert
                        ? "bg-red-50/50 border border-red-200"
                        : hasAlerts
                          ? "bg-amber-50/50 border border-amber-200"
                          : "bg-white/80 border border-slate-100 hover:border-cyan-200"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`text-xs font-semibold ${isToday ? "text-cyan-700" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                    {format(day, "EEE, MMM d")}
                    {isToday && (
                      <span className="ml-1.5 text-[10px] bg-cyan-500 text-white px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                  </div>
                  
                  {/* Weather indicator */}
                  {weather && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      {getWeatherIcon(weather.icon)}
                      <span className="text-[10px] text-slate-500">
                        {Math.round(weather.temp_min)}°-{Math.round(weather.temp_max)}°C
                      </span>
                      {weather.rain_prob > 50 && (
                        <div className="flex items-center gap-0.5">
                          <Droplets className="h-3 w-3 text-blue-400" />
                          <span className="text-[10px] text-blue-500">{weather.rain_prob}%</span>
                        </div>
                      )}
                      {weather.wind_speed > 30 && (
                        <div className="flex items-center gap-0.5">
                          <Wind className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] text-slate-500">{Math.round(weather.wind_speed)}km/h</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Events for this day */}
                {events.length > 0 ? (
                  <div className="space-y-1">
                    {events.map(event => (
                      <div
                        key={event.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                          event.type === "weather_alert"
                            ? event.severity === "danger"
                              ? "bg-red-100 border border-red-200"
                              : "bg-amber-100 border border-amber-200"
                            : event.type === "task"
                              ? event.status === "completed"
                                ? "bg-emerald-50 border border-emerald-100"
                                : event.severity === "danger"
                                  ? "bg-red-50 border border-red-100"
                                  : "bg-blue-50 border border-blue-100"
                              : "bg-purple-50 border border-purple-100"
                        }`}
                      >
                        {event.icon}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            event.type === "weather_alert" 
                              ? event.severity === "danger" ? "text-red-700" : "text-amber-700"
                              : "text-slate-700"
                          }`}>
                            {event.title}
                          </p>
                          {event.subtitle && (
                            <p className="text-[10px] text-slate-500">{event.subtitle}</p>
                          )}
                        </div>
                        {event.type === "task" && event.priority === "high" && (
                          <Badge className="bg-red-100 text-red-600 border-red-200 text-[9px] px-1">
                            High
                          </Badge>
                        )}
                        {event.type.includes("contract") && event.metadata?.total_amount && (
                          <span className="text-[10px] text-purple-600 font-medium">
                            ${event.metadata.total_amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic pl-1">No events scheduled</p>
                )}

                {/* Weather Alerts */}
                {weather?.alerts && weather.alerts.length > 0 && !events.some(e => e.type === "weather_alert") && (
                  <div className="mt-1.5 space-y-1">
                    {weather.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${getAlertSeverityColor(alert.severity)}`}
                      >
                        <span className="text-sm">{getAlertIcon(alert.type)}</span>
                        <span className="font-medium">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Summary Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-slate-600">
              {tasks.filter(t => t.due_date && t.status !== "completed").length} pending tasks
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-slate-600">
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
            </span>
          </div>
          {weatherData?.current?.alerts && weatherData.current.alerts.length > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600 font-medium">
                Weather alerts active
              </span>
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-200">
          <Zap className="h-3 w-3 mr-0.5" />
          AI-Synced
        </Badge>
      </div>
    </div>
  );
};

export default ProjectTimelineView;
