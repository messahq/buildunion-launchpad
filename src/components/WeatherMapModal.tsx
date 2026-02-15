import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WeatherWidget } from "./WeatherWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Clock, RefreshCw, LogIn, LogOut, Loader2, Thermometer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

interface CheckinEntry {
  id: string;
  user_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  weather_snapshot: any;
  notes: string | null;
  user_name: string;
  user_role: string;
}

interface TeamMemberStatus {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_on_site: boolean;
  last_checkin_at: string | null;
}
// Helper: group checkins by day, render collapsible accordion
function PresenceHistoryGrouped({
  checkins,
  getSessionDuration,
}: {
  checkins: CheckinEntry[];
  getSessionDuration: (start: string, end: string | null) => string;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CheckinEntry[]>();
    checkins.forEach((entry) => {
      const dateKey = format(new Date(entry.checked_in_at), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(entry);
    });
    return Array.from(map.entries()); // already sorted desc from query
  }, [checkins]);

  const getDayLabel = (dateKey: string) => {
    const d = new Date(dateKey + "T12:00:00");
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, MMM d");
  };

  if (checkins.length === 0) {
    return (
      <div className="p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Presence History
          </span>
        </div>
        <p className="text-xs text-muted-foreground py-4 text-center">
          No check-ins yet. Use the button above to log your site presence.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Presence History
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {checkins.length} records
        </span>
      </div>
      <Accordion type="multiple" defaultValue={grouped.length > 0 ? [grouped[0][0]] : []} className="max-h-[350px] overflow-y-auto">
        {grouped.map(([dateKey, entries]) => (
          <AccordionItem key={dateKey} value={dateKey} className="border-b-0">
            <AccordionTrigger className="py-2 px-2 rounded hover:no-underline hover:bg-muted/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{getDayLabel(dateKey)}</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {entries.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-1 pt-0 px-1">
              <div className="space-y-1">
                {entries.map((entry) => {
                  const isActive = !entry.checked_out_at;
                  const weather = entry.weather_snapshot as any;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between py-2 px-2.5 rounded ${
                        isActive
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
                          : "bg-background/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                          isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate flex items-center gap-1">
                            {entry.user_name}
                            <span className="text-[9px] text-muted-foreground capitalize">
                              ({entry.user_role})
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <LogIn className="h-2.5 w-2.5" />
                            {format(new Date(entry.checked_in_at), "HH:mm")}
                            {entry.checked_out_at && (
                              <>
                                <span>→</span>
                                <LogOut className="h-2.5 w-2.5" />
                                {format(new Date(entry.checked_out_at), "HH:mm")}
                              </>
                            )}
                            {!entry.checked_out_at && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-400 text-emerald-600">
                                ACTIVE
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {getSessionDuration(entry.checked_in_at, entry.checked_out_at)}
                        </span>
                        {weather?.temp != null && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <Thermometer className="h-2.5 w-2.5" />
                            {Math.round(weather.temp)}° {weather.description || ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
interface WeatherMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: string;
  lat?: number;
  lon?: number;
  projectName?: string;
  projectId?: string;
}

export function WeatherMapModal({
  open,
  onOpenChange,
  location,
  lat,
  lon,
  projectName = "Project",
  projectId,
}: WeatherMapModalProps) {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [teamOnSite, setTeamOnSite] = useState<TeamMemberStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeCheckinId, setActiveCheckinId] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [activeTab, setActiveTab] = useState("sitelog");

  const fetchData = useCallback(async () => {
    if (!projectId || !user) return;
    setLoading(true);
    try {
      // Fetch all team user IDs (owner + members)
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();

      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId);

      const allUserIds = [
        ...(project ? [project.user_id] : []),
        ...(members?.map((m) => m.user_id) || []),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];
      const roleMap = new Map(members?.map((m) => [m.user_id, m.role]) || []);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", uniqueUserIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Fetch recent check-ins (last 30)
      const { data: recentCheckins } = await supabase
        .from("site_checkins")
        .select("id, user_id, checked_in_at, checked_out_at, weather_snapshot, notes")
        .eq("project_id", projectId)
        .order("checked_in_at", { ascending: false })
        .limit(30);

      const checkinEntries: CheckinEntry[] = (recentCheckins || []).map((c) => {
        const prof = profileMap.get(c.user_id);
        return {
          ...c,
          weather_snapshot: c.weather_snapshot,
          user_name: prof?.full_name || "Unknown",
          user_role: c.user_id === project?.user_id
            ? "Owner"
            : (roleMap.get(c.user_id) || "member"),
        };
      });
      setCheckins(checkinEntries);

      // Determine who is currently on site (checked in, not checked out)
      const onSiteUserIds = new Set(
        (recentCheckins || [])
          .filter((c) => !c.checked_out_at)
          .map((c) => c.user_id)
      );

      const teamStatus: TeamMemberStatus[] = uniqueUserIds.map((uid) => {
        const prof = profileMap.get(uid);
        const lastCheckin = (recentCheckins || []).find((c) => c.user_id === uid);
        return {
          user_id: uid,
          full_name: prof?.full_name || "Unknown",
          avatar_url: prof?.avatar_url || null,
          role: uid === project?.user_id ? "Owner" : (roleMap.get(uid) || "member"),
          is_on_site: onSiteUserIds.has(uid),
          last_checkin_at: lastCheckin?.checked_in_at || null,
        };
      });
      setTeamOnSite(teamStatus);

      // Check if current user is checked in
      const myActive = (recentCheckins || []).find(
        (c) => c.user_id === user.id && !c.checked_out_at
      );
      setIsCheckedIn(!!myActive);
      setActiveCheckinId(myActive?.id || null);
    } catch (err) {
      console.error("Error fetching site log data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (open && projectId) fetchData();
  }, [open, projectId, fetchData]);

  // Handle check-in / check-out
  const handleCheckin = async () => {
    if (!user || !projectId) return;
    setIsCheckingIn(true);
    try {
      if (isCheckedIn && activeCheckinId) {
        // Check out
        await supabase
          .from("site_checkins")
          .update({ checked_out_at: new Date().toISOString() })
          .eq("id", activeCheckinId);
        setIsCheckedIn(false);
        setActiveCheckinId(null);
        toast.success("Checked out from site");
      } else {
        // Check in with weather snapshot
        let weatherSnapshot: any = {};
        if (location) {
          try {
            const { data: weatherRes } = await supabase.functions.invoke("get-weather", {
              body: { location, days: 1 },
            });
            if (weatherRes?.current) {
              weatherSnapshot = {
                temp: weatherRes.current.temp,
                description: weatherRes.current.description,
                humidity: weatherRes.current.humidity,
                wind_speed: weatherRes.current.wind_speed,
                timestamp: new Date().toISOString(),
              };
            }
          } catch (e) {
            console.warn("Weather snapshot failed:", e);
          }
        }

        const { data: newCheckin, error } = await supabase
          .from("site_checkins")
          .insert({
            project_id: projectId,
            user_id: user.id,
            weather_snapshot: weatherSnapshot,
          })
          .select("id")
          .single();

        if (error) throw error;
        setIsCheckedIn(true);
        setActiveCheckinId(newCheckin.id);
        toast.success("Checked in to site", {
          description: weatherSnapshot.temp
            ? `${Math.round(weatherSnapshot.temp)}° — ${weatherSnapshot.description}`
            : undefined,
        });
      }
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error("Check-in error:", err);
      toast.error("Failed to check in/out");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const currentlyOnSite = teamOnSite.filter((t) => t.is_on_site);

  // Calculate session duration
  const getSessionDuration = (checkinTime: string, checkoutTime: string | null) => {
    const start = new Date(checkinTime);
    const end = checkoutTime ? new Date(checkoutTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Site Log & Location - {projectName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sitelog">Site Log</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="location">Location Map</TabsTrigger>
          </TabsList>

          {/* Site Log Tab — Check-In Driven */}
          <TabsContent value="sitelog" className="space-y-4">
            {/* Check In / Check Out Action */}
            <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {isCheckedIn ? "📍 You are on site" : "📌 Not on site"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isCheckedIn
                    ? "Weather & time are being recorded"
                    : "Check in to log your site presence"}
                </div>
              </div>
              <Button
                onClick={handleCheckin}
                disabled={isCheckingIn}
                variant={isCheckedIn ? "destructive" : "default"}
                className="gap-2"
              >
                {isCheckingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCheckedIn ? (
                  <LogOut className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isCheckedIn ? "Check Out" : "Check In"}
              </Button>
            </div>

            {/* Currently On Site */}
            {currentlyOnSite.length > 0 && (
              <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Currently On Site ({currentlyOnSite.length})
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchData} className="h-6 w-6 p-0">
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {currentlyOnSite.map((member) => {
                    const checkin = checkins.find(
                      (c) => c.user_id === member.user_id && !c.checked_out_at
                    );
                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-background/70"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              member.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">
                              {member.full_name}
                              {member.user_id === user?.id && (
                                <span className="text-muted-foreground ml-1">(you)</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {member.role}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            On Site
                          </Badge>
                          {checkin && (
                            <span className="text-[9px] text-muted-foreground">
                              {getSessionDuration(checkin.checked_in_at, null)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Check-In / Check-Out History — collapsible, grouped by day */}
            <PresenceHistoryGrouped checkins={checkins} getSessionDuration={getSessionDuration} />
          </TabsContent>

          {/* Weather Tab */}
          <TabsContent value="weather" className="space-y-4">
            <WeatherWidget
              location={location}
              lat={lat}
              lon={lon}
              showForecast={true}
              className="w-full"
            />
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="location" className="space-y-4">
            {lat && lon ? (
              <div className="space-y-4">
                <div className="h-[400px] w-full rounded-lg overflow-hidden border bg-muted/50">
                  <iframe
                    title="Project Location Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "400px" }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${lat},${lon}&z=16&output=embed`}
                  />
                </div>
                {location && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">{location}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Get Directions →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : location ? (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 border">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{location}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No location data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
