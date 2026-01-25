import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConstructionAlert {
  type: 'frost' | 'heat' | 'rain' | 'wind' | 'snow' | 'visibility';
  severity: 'warning' | 'danger';
  message: string;
  recommendation: string;
}

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  wind_gust?: number;
  rain_1h?: number;
  snow_1h?: number;
  visibility?: number;
  weather_main: string;
  weather_description: string;
}

function generateConstructionAlerts(weather: WeatherData): ConstructionAlert[] {
  const alerts: ConstructionAlert[] = [];

  // Frost warning - below 0°C
  if (weather.temp < 0) {
    alerts.push({
      type: 'frost',
      severity: weather.temp < -10 ? 'danger' : 'warning',
      message: `Freezing conditions: ${Math.round(weather.temp)}°C`,
      recommendation: weather.temp < -10 
        ? 'Outdoor concrete work not recommended. Protect exposed pipes and equipment.'
        : 'Use cold-weather concrete additives. Monitor for ice formation.'
    });
  }

  // Heat warning - feels like above 30°C
  if (weather.feels_like > 30) {
    alerts.push({
      type: 'heat',
      severity: weather.feels_like > 35 ? 'danger' : 'warning',
      message: `Extreme heat: Feels like ${Math.round(weather.feels_like)}°C`,
      recommendation: weather.feels_like > 35
        ? 'Mandatory rest breaks every 30 mins. Ensure hydration stations available.'
        : 'Schedule heavy work for early morning. Provide shade and water.'
    });
  }

  // Heavy rain warning
  if (weather.rain_1h && weather.rain_1h > 2.5) {
    alerts.push({
      type: 'rain',
      severity: weather.rain_1h > 7.5 ? 'danger' : 'warning',
      message: `Heavy rain: ${weather.rain_1h.toFixed(1)}mm/h`,
      recommendation: weather.rain_1h > 7.5
        ? 'Suspend roofing and electrical work. Secure materials and cover excavations.'
        : 'Delay painting and concrete finishing. Check drainage systems.'
    });
  }

  // High wind warning - above 40 km/h (11.1 m/s)
  if (weather.wind_gust && weather.wind_gust > 11.1) {
    alerts.push({
      type: 'wind',
      severity: weather.wind_gust > 17 ? 'danger' : 'warning',
      message: `High winds: Gusts up to ${Math.round(weather.wind_gust * 3.6)} km/h`,
      recommendation: weather.wind_gust > 17
        ? 'Stop crane operations and work at height. Secure all loose materials.'
        : 'Exercise caution with elevated work. Secure scaffolding and tarps.'
    });
  }

  // Snow warning
  if (weather.snow_1h && weather.snow_1h > 0) {
    alerts.push({
      type: 'snow',
      severity: weather.snow_1h > 5 ? 'danger' : 'warning',
      message: `Snowfall: ${weather.snow_1h.toFixed(1)}mm/h`,
      recommendation: weather.snow_1h > 5
        ? 'Consider site closure. Clear access routes and protect materials.'
        : 'Monitor accumulation. Keep walkways clear and salted.'
    });
  }

  // Low visibility warning
  if (weather.visibility && weather.visibility < 1000) {
    alerts.push({
      type: 'visibility',
      severity: weather.visibility < 500 ? 'danger' : 'warning',
      message: `Low visibility: ${weather.visibility}m`,
      recommendation: weather.visibility < 500
        ? 'Suspend crane and heavy equipment operations. Use hazard lighting.'
        : 'Increase lighting on site. Use high-visibility gear.'
    });
  }

  return alerts;
}

async function getWeatherForLocation(apiKey: string, lat: number, lon: number): Promise<{ current: WeatherData; forecast: any[] } | null> {
  try {
    // Get current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const currentRes = await fetch(currentUrl);
    
    if (!currentRes.ok) {
      console.error(`Weather API error: ${currentRes.status}`);
      return null;
    }
    
    const currentData = await currentRes.json();

    // Get 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();

    return {
      current: {
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        wind_speed: currentData.wind.speed,
        wind_gust: currentData.wind.gust,
        rain_1h: currentData.rain?.["1h"],
        snow_1h: currentData.snow?.["1h"],
        visibility: currentData.visibility,
        weather_main: currentData.weather[0].main,
        weather_description: currentData.weather[0].description,
      },
      forecast: forecastData.list || [],
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

async function geocodeAddress(apiKey: string, address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${apiKey}`;
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.length > 0) {
      return { lat: data[0].lat, lon: data[0].lon };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openWeatherApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");

    if (!openWeatherApiKey) {
      console.error("OPENWEATHERMAP_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Weather API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today and next 3 days
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find all projects with tasks scheduled in the next 3 days
    const { data: tasksWithProjects, error: tasksError } = await supabase
      .from("project_tasks")
      .select(`
        id,
        title,
        due_date,
        project_id,
        assigned_to,
        projects!project_tasks_project_id_fkey (
          id,
          name,
          address,
          user_id
        )
      `)
      .gte("due_date", today.toISOString())
      .lte("due_date", threeDaysFromNow.toISOString())
      .neq("status", "completed");

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tasks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tasksWithProjects || tasksWithProjects.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming tasks found", alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group tasks by project
    const projectTasksMap = new Map<string, { 
      project: any; 
      tasks: any[];
      ownerId: string;
    }>();

    for (const task of tasksWithProjects) {
      const project = (task as any).projects;
      if (!project?.address) continue;

      const existing = projectTasksMap.get(project.id);
      if (existing) {
        existing.tasks.push(task);
      } else {
        projectTasksMap.set(project.id, {
          project,
          tasks: [task],
          ownerId: project.user_id,
        });
      }
    }

    let alertsSent = 0;
    const processedProjects: string[] = [];

    for (const [projectId, { project, tasks, ownerId }] of projectTasksMap) {
      // Geocode the project address
      const coords = await geocodeAddress(openWeatherApiKey, project.address);
      if (!coords) {
        console.log(`Could not geocode address for project ${projectId}`);
        continue;
      }

      // Get weather for this location
      const weatherData = await getWeatherForLocation(openWeatherApiKey, coords.lat, coords.lon);
      if (!weatherData) {
        console.log(`Could not fetch weather for project ${projectId}`);
        continue;
      }

      // Check current weather for danger alerts
      const currentAlerts = generateConstructionAlerts(weatherData.current);
      const dangerAlerts = currentAlerts.filter(a => a.severity === 'danger');

      // Also check forecast for task dates
      const forecastAlerts: { date: string; alerts: ConstructionAlert[] }[] = [];
      
      for (const task of tasks) {
        if (!task.due_date) continue;
        
        const taskDate = new Date(task.due_date);
        const taskDateStr = taskDate.toISOString().split('T')[0];
        
        // Find forecast entries for this date
        const dayForecasts = weatherData.forecast.filter((f: any) => {
          const forecastDate = new Date(f.dt * 1000).toISOString().split('T')[0];
          return forecastDate === taskDateStr;
        });

        if (dayForecasts.length > 0) {
          // Check the most extreme conditions for the day
          for (const forecast of dayForecasts) {
            const forecastWeather: WeatherData = {
              temp: forecast.main.temp,
              feels_like: forecast.main.feels_like,
              humidity: forecast.main.humidity,
              wind_speed: forecast.wind.speed,
              wind_gust: forecast.wind.gust,
              rain_1h: forecast.rain?.["3h"] ? forecast.rain["3h"] / 3 : undefined,
              snow_1h: forecast.snow?.["3h"] ? forecast.snow["3h"] / 3 : undefined,
              visibility: forecast.visibility,
              weather_main: forecast.weather[0].main,
              weather_description: forecast.weather[0].description,
            };

            const alerts = generateConstructionAlerts(forecastWeather);
            if (alerts.some(a => a.severity === 'danger')) {
              forecastAlerts.push({ date: taskDateStr, alerts });
            }
          }
        }
      }

      // If there are danger alerts, send notification to project owner and assigned members
      if (dangerAlerts.length > 0 || forecastAlerts.length > 0) {
        const allDangerAlerts = [
          ...dangerAlerts,
          ...forecastAlerts.flatMap(f => f.alerts.filter(a => a.severity === 'danger'))
        ];

        // Deduplicate by type
        const uniqueAlerts = Array.from(
          new Map(allDangerAlerts.map(a => [a.type, a])).values()
        );

        if (uniqueAlerts.length === 0) continue;

        // Build notification message
        const alertMessages = uniqueAlerts.slice(0, 3).map(a => `⚠️ ${a.message}`);
        const taskCount = tasks.length;
        const taskWord = taskCount === 1 ? 'task' : 'tasks';

        const notificationTitle = `🚨 Weather Alert: ${project.name}`;
        const notificationBody = `${alertMessages.join(' | ')} — ${taskCount} ${taskWord} scheduled. Review safety measures.`;

        // Get all users to notify (owner + assigned members)
        const userIdsToNotify = new Set<string>();
        userIdsToNotify.add(ownerId);
        tasks.forEach(t => userIdsToNotify.add(t.assigned_to));

        // Send notification directly - get push subscriptions and send
        try {
          const userIdsArray = Array.from(userIdsToNotify);
          
          // Get push subscriptions for these users
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .in("user_id", userIdsArray);

          if (subscriptions && subscriptions.length > 0) {
            const notificationPayload = JSON.stringify({
              title: notificationTitle,
              body: notificationBody,
              icon: "/pwa-icons/icon-512x512.png",
              data: {
                type: "weather_alert",
                alerts: uniqueAlerts,
                projectId,
                url: `/buildunion/project/${projectId}`,
              },
            });

            let successCount = 0;
            for (const subscription of subscriptions) {
              try {
                const response = await fetch(subscription.endpoint, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/octet-stream",
                    "Content-Encoding": "aes128gcm",
                    "TTL": "86400",
                  },
                  body: notificationPayload,
                });

                if (response.ok || response.status === 201) {
                  successCount++;
                  
                  // Log the notification
                  await supabase.from("notification_logs").insert({
                    user_id: subscription.user_id,
                    title: notificationTitle,
                    body: notificationBody,
                    data: { type: "weather_alert", projectId },
                    status: "sent",
                  });
                } else if (response.status === 410 || response.status === 404) {
                  // Remove expired subscription
                  await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
                }
              } catch (pushError) {
                console.error(`Push error for subscription ${subscription.id}:`, pushError);
              }
            }

            if (successCount > 0) {
              alertsSent++;
              processedProjects.push(project.name);
            }
          }
        } catch (notifyError) {
          console.error(`Error sending notification for project ${projectId}:`, notifyError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Weather alert check completed",
        projects_checked: projectTasksMap.size,
        alerts_sent: alertsSent,
        processed_projects: processedProjects,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in weather-alert-check:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
