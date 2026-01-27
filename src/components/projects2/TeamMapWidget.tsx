import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Map, 
  MapPin, 
  ExternalLink,
  AlertTriangle,
  User,
  Route,
  Loader2,
  MapPinned
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ProjectConflict } from "@/hooks/useSingleProjectConflicts";
import { ConflictMarkerLegend } from "./ConflictMarkerLegend";
import { ProBadge } from "@/components/ui/pro-badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";

interface TeamMemberLocation {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  latitude?: number;
  longitude?: number;
  status?: "on_site" | "en_route" | "away";
}

interface TeamMapWidgetProps {
  projectAddress: string;
  projectName: string;
  className?: string;
  conflicts?: ProjectConflict[];
  isPremium?: boolean;
  teamMembers?: TeamMemberLocation[];
}

// Get status color for team member
const getStatusColor = (status?: string) => {
  switch (status) {
    case "on_site":
      return "bg-green-500";
    case "en_route":
      return "bg-blue-500";
    case "away":
      return "bg-slate-400";
    default:
      return "bg-amber-500";
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case "on_site":
      return "On Site";
    case "en_route":
      return "En Route";
    case "away":
      return "Away";
    default:
      return "Unknown";
  }
};

const mapContainerStyle = {
  width: "100%",
  height: "200px",
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832,
};

// Inner component that uses the Google Maps
function TeamMapWidgetInner({ 
  projectAddress, 
  projectName,
  className,
  conflicts = [],
  isPremium = false,
  teamMembers = [],
  apiKey,
}: TeamMapWidgetProps & { apiKey: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<"on_site" | "en_route" | "away">("away");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch current user's status on mount
  const fetchCurrentStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("bu_profiles")
        .select("location_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.location_status) {
        setCurrentStatus(data.location_status as "on_site" | "en_route" | "away");
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  }, [user]);

  // Fetch status on mount
  useState(() => {
    fetchCurrentStatus();
  });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  });

  // Geocode the project address
  const geocodeAddress = useCallback(async () => {
    if (!isLoaded || !projectAddress) return;
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: projectAddress }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        setMapCenter({
          lat: location.lat(),
          lng: location.lng(),
        });
      }
    });
  }, [isLoaded, projectAddress]);

  // Geocode when map loads
  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    geocodeAddress();
  }, [geocodeAddress]);

  // Create Google Maps URL for the address
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(projectAddress)}`;
  
  // Create Google Maps directions URL (from current location to project site)
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(projectAddress)}&travelmode=driving`;

  // Count conflicts by severity
  const highCount = conflicts.filter(c => c.severity === "high").length;
  const mediumCount = conflicts.filter(c => c.severity === "medium").length;
  const lowCount = conflicts.filter(c => c.severity === "low").length;
  const hasConflicts = conflicts.length > 0;

  const handleShareLocation = async () => {
    if (!user) {
      toast.error(t("common.loginRequired", "Please log in to share your location"));
      return;
    }

    if (!navigator.geolocation) {
      toast.error(t("location.notSupported", "Geolocation is not supported by your browser"));
      return;
    }

    setIsUpdatingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const { error } = await supabase
            .from("bu_profiles")
            .update({
              latitude,
              longitude,
              location_updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          if (error) throw error;

          toast.success(t("location.updated", "Location shared successfully!"));
        } catch (error) {
          console.error("Error updating location:", error);
          toast.error(t("location.updateFailed", "Failed to update location"));
        } finally {
          setIsUpdatingLocation(false);
        }
      },
      (error) => {
        setIsUpdatingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error(t("location.permissionDenied", "Location permission denied. Please enable location access in your browser settings."));
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error(t("location.unavailable", "Location information is unavailable"));
            break;
          case error.TIMEOUT:
            toast.error(t("location.timeout", "Location request timed out"));
            break;
          default:
            toast.error(t("location.error", "An error occurred while getting location"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleStatusChange = async (newStatus: "on_site" | "en_route" | "away") => {
    if (!user || newStatus === currentStatus) return;

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("bu_profiles")
        .update({ location_status: newStatus })
        .eq("user_id", user.id);

      if (error) throw error;

      setCurrentStatus(newStatus);
      toast.success(t("location.statusUpdated", "Status updated to {{status}}", { 
        status: getStatusLabel(newStatus) 
      }));
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("location.statusUpdateFailed", "Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const renderMapContent = () => {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
          <span className="text-sm">{t("maps.loadError", "Failed to load map")}</span>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-8 w-8 mb-2 animate-spin text-cyan-500" />
          <span className="text-sm">{t("maps.loading", "Loading map...")}</span>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={15}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Project location marker */}
        <Marker position={mapCenter} title={projectName} />

        {/* Team member markers */}
        {teamMembers
          .filter((m) => m.latitude && m.longitude)
          .map((member) => (
            <Marker
              key={member.user_id}
              position={{ lat: member.latitude!, lng: member.longitude! }}
              title={`${member.full_name} (${getStatusLabel(member.status)})`}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: member.status === "on_site" ? "#22c55e" : member.status === "en_route" ? "#3b82f6" : "#94a3b8",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
            />
          ))}
      </GoogleMap>
    );
  };

  return (
    <Card className={cn("bg-card border-cyan-200 dark:border-cyan-800 overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-b border-cyan-100 dark:border-cyan-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle className="text-lg font-semibold">
              {t("projects.siteMap", "Project Site")}
            </CardTitle>
            {isPremium && hasConflicts && (
              <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {conflicts.length}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Interactive Google Map */}
        <div className="relative rounded-lg overflow-hidden border border-cyan-200 dark:border-cyan-800 h-[200px] bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-emerald-950/30">
          {renderMapContent()}

          {/* Locked overlay for non-premium users with conflicts */}
          {!isPremium && hasConflicts && (
            <div className="absolute top-3 left-3 right-3 bg-background/95 backdrop-blur-sm border border-amber-200 dark:border-amber-800 rounded-lg p-2 z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground flex-1">
                  {conflicts.length} {t("conflicts.detectedUpgrade", "conflicts detected")}
                </span>
                <ProBadge tier="premium" size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Address and action buttons */}
        <div className="mt-3 p-2 bg-muted/50 border border-cyan-200 dark:border-cyan-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{projectAddress}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs h-8 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50"
              asChild
            >
              <a 
                href={googleMapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {t("common.viewMap", "View Map")}
              </a>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 text-xs h-8 bg-cyan-600 hover:bg-cyan-700"
              asChild
            >
              <a 
                href={directionsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Route className="h-3 w-3 mr-1" />
                {t("common.getDirections", "Directions")}
              </a>
            </Button>
          </div>
        </div>

        {/* Share Location & Status */}
        <div className="mt-3 space-y-2">
          {/* Status Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <span className="text-xs text-muted-foreground px-2 flex-shrink-0">{t("location.status", "Status")}:</span>
            <div className="flex gap-1 flex-1">
              {(["on_site", "en_route", "away"] as const).map((status) => (
                <Button
                  key={status}
                  variant={currentStatus === status ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "flex-1 text-xs h-7 px-2",
                    currentStatus === status && status === "on_site" && "bg-green-600 hover:bg-green-700",
                    currentStatus === status && status === "en_route" && "bg-blue-600 hover:bg-blue-700",
                    currentStatus === status && status === "away" && "bg-slate-500 hover:bg-slate-600"
                  )}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdatingStatus}
                >
                  {status === "on_site" && t("location.onSite", "On Site")}
                  {status === "en_route" && t("location.enRoute", "En Route")}
                  {status === "away" && t("location.away", "Away")}
                </Button>
              ))}
            </div>
          </div>

          {/* Share Location Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-9 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50"
            onClick={handleShareLocation}
            disabled={isUpdatingLocation}
          >
            {isUpdatingLocation ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                {t("location.updating", "Updating...")}
              </>
            ) : (
              <>
                <MapPinned className="h-3 w-3 mr-2" />
                {t("location.shareMyLocation", "Share My Location")}
              </>
            )}
          </Button>
        </div>

        {/* Conflict legend for premium users */}
        {isPremium && hasConflicts && (
          <div className="mt-3">
            <ConflictMarkerLegend
              highCount={highCount}
              mediumCount={mediumCount}
              lowCount={lowCount}
            />
          </div>
        )}

        {/* Team members list */}
        {teamMembers.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{t("projects.teamMembers", "Team Members")}</span>
              <Badge variant="secondary" className="text-xs">{teamMembers.length}</Badge>
            </div>
            <div className="grid gap-2">
              {teamMembers.slice(0, 4).map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                    <AvatarFallback className="bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs">
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{member.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(member.status))} />
                    <span className="text-xs text-muted-foreground">{getStatusLabel(member.status)}</span>
                  </div>
                </div>
              ))}
              {teamMembers.length > 4 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{teamMembers.length - 4} {t("common.more", "more")}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Wrapper component that fetches the API key
export default function TeamMapWidget(props: TeamMapWidgetProps) {
  const { apiKey, isLoading, error } = useGoogleMapsApi();
  const { t } = useTranslation();

  // Show loading state while fetching API key
  if (isLoading) {
    return (
      <Card className={cn("bg-card border-cyan-200 dark:border-cyan-800 overflow-hidden", props.className)}>
        <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-b border-cyan-100 dark:border-cyan-900">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle className="text-lg font-semibold">
              {t("projects.siteMap", "Project Site")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[200px] rounded-lg border border-cyan-200 dark:border-cyan-800 flex items-center justify-center bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-emerald-950/30">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no API key or error, show fallback with static preview
  if (error || !apiKey) {
    return (
      <Card className={cn("bg-card border-cyan-200 dark:border-cyan-800 overflow-hidden", props.className)}>
        <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-b border-cyan-100 dark:border-cyan-900">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle className="text-lg font-semibold">
              {t("projects.siteMap", "Project Site")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[200px] rounded-lg border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-emerald-950/30">
            <MapPin className="h-8 w-8 mb-2 text-cyan-500" />
            <span className="text-sm text-muted-foreground">{props.projectAddress}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs h-8 border-cyan-200 dark:border-cyan-800"
              asChild
            >
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.projectAddress)}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {t("common.viewMap", "View Map")}
              </a>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 text-xs h-8 bg-cyan-600 hover:bg-cyan-700"
              asChild
            >
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(props.projectAddress)}&travelmode=driving`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Route className="h-3 w-3 mr-1" />
                {t("common.getDirections", "Directions")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <TeamMapWidgetInner {...props} apiKey={apiKey} />;
}
