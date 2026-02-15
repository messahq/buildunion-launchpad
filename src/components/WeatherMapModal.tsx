import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherWidget } from "./WeatherWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clipboard, Users, Clock, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface TeamMemberStatus {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  location_status: string | null;
  location_updated_at: string | null;
  role: string;
}

interface SiteLogEntry {
  id: string;
  report_name: string;
  template_type: string;
  created_at: string;
  completed_count: number | null;
  total_count: number | null;
  notes: string | null;
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

const STATUS_OPTIONS = [
  { value: "on_site", label: "On Site", color: "bg-green-500" },
  { value: "en_route", label: "En Route", color: "bg-amber-500" },
  { value: "away", label: "Away", color: "bg-muted-foreground" },
];

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
  const [teamStatuses, setTeamStatuses] = useState<TeamMemberStatus[]>([]);
  const [recentLogs, setRecentLogs] = useState<SiteLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [myStatus, setMyStatus] = useState<string>("away");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch team member statuses + recent site logs
  const fetchData = async () => {
    if (!projectId || !user) return;
    setLoading(true);
    try {
      // Fetch team members with their status
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId);

      // Also include the owner
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();

      const allUserIds = [
        ...(project ? [project.user_id] : []),
        ...(members?.map((m) => m.user_id) || []),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      if (uniqueUserIds.length > 0) {
        // Fetch profiles for status
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", uniqueUserIds);

        const { data: buProfiles } = await supabase
          .from("bu_profiles")
          .select("user_id, location_status, location_updated_at")
          .in("user_id", uniqueUserIds);

        const statusMap = new Map(
          buProfiles?.map((bp) => [bp.user_id, bp]) || []
        );
        const roleMap = new Map(
          members?.map((m) => [m.user_id, m.role]) || []
        );

        const combined: TeamMemberStatus[] = (profiles || []).map((p) => {
          const bp = statusMap.get(p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name || "Unknown",
            avatar_url: p.avatar_url,
            location_status: bp?.location_status || "away",
            location_updated_at: bp?.location_updated_at || null,
            role:
              p.user_id === project?.user_id
                ? "owner"
                : roleMap.get(p.user_id) || "member",
          };
        });

        setTeamStatuses(combined);

        // Set my current status
        const myBp = buProfiles?.find((bp) => bp.user_id === user.id);
        if (myBp?.location_status) setMyStatus(myBp.location_status);
      }

      // Fetch recent site logs for this project
      const { data: logs } = await supabase
        .from("site_logs")
        .select("id, report_name, template_type, created_at, completed_count, total_count, notes")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentLogs(logs || []);
    } catch (err) {
      console.error("Error fetching site log data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) fetchData();
  }, [open, projectId]);

  // Update my status
  const updateMyStatus = async (newStatus: string) => {
    if (!user) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("bu_profiles")
        .update({
          location_status: newStatus,
          location_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (!error) {
        setMyStatus(newStatus);
        // Update local state
        setTeamStatuses((prev) =>
          prev.map((t) =>
            t.user_id === user.id
              ? {
                  ...t,
                  location_status: newStatus,
                  location_updated_at: new Date().toISOString(),
                }
              : t
          )
        );

        // Send push notification to team members when owner goes "On Site"
        if (newStatus === "on_site" && projectId) {
          // Check if current user is the owner
          const { data: project } = await supabase
            .from("projects")
            .select("user_id")
            .eq("id", projectId)
            .single();

          if (project?.user_id === user.id) {
            // Get team member user IDs (exclude owner)
            const { data: members } = await supabase
              .from("project_members")
              .select("user_id")
              .eq("project_id", projectId);

            const memberIds = members?.map((m) => m.user_id).filter((id) => id !== user.id) || [];

            if (memberIds.length > 0) {
              const { data: ownerProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", user.id)
                .single();

              const ownerName = ownerProfile?.full_name || "The owner";

              supabase.functions.invoke("send-push-notification", {
                body: {
                  title: "🏗️ Owner On Site",
                  body: `${ownerName} has arrived at the project site`,
                  userIds: memberIds,
                  projectId,
                  data: { type: "owner_on_site" },
                },
              }).catch((err) => console.error("Push notification error:", err));
            }
          }
        }
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[2];
    return (
      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5">
        <span className={`w-2 h-2 rounded-full ${opt.color}`} />
        {opt.label}
      </Badge>
    );
  };

  const getTemplateEmoji = (type: string) => {
    switch (type) {
      case "standard": return "📋";
      case "deep": return "🔍";
      case "maintenance": return "🔧";
      default: return "📄";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Site Log & Location - {projectName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sitelog" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sitelog">Site Log</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="location">Location Map</TabsTrigger>
          </TabsList>

          {/* Site Log Tab */}
          <TabsContent value="sitelog" className="space-y-4">
            {/* My Status Toggle */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  My Status
                </span>
              </div>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={myStatus === opt.value ? "default" : "outline"}
                    className="text-xs gap-1.5"
                    onClick={() => updateMyStatus(opt.value)}
                    disabled={updatingStatus}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Team Member Statuses */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team Status
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchData}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {teamStatuses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No team members yet</p>
              ) : (
                <div className="space-y-1.5">
                  {teamStatuses.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
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
                        {getStatusBadge(member.location_status)}
                        {member.location_updated_at && (
                          <span className="text-[9px] text-muted-foreground">
                            {format(new Date(member.location_updated_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Site Logs */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Logs
                  </span>
                </div>
              </div>
              {recentLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No site logs yet for this project
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{getTemplateEmoji(log.template_type)}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">
                            {log.report_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.completed_count}/{log.total_count} tasks
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{projectName}</div>
                      <div className="text-xs text-muted-foreground">{location}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Coordinates: {lat.toFixed(4)}, {lon.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center rounded-lg border border-dashed bg-muted/50">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Map location not available</p>
                  <p className="text-xs mt-1">Please set a project address first</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
