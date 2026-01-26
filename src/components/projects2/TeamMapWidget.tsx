import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Map, 
  MapPin, 
  Loader2, 
  AlertCircle,
  Maximize2,
  Navigation,
  AlertTriangle,
  Lock,
  Info,
  User
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, OverlayView } from "@react-google-maps/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ProjectConflict } from "@/hooks/useSingleProjectConflicts";
import { ConflictMarkerLegend } from "./ConflictMarkerLegend";
import { ProBadge } from "@/components/ui/pro-badge";

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

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

// Toronto default coordinates
const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832,
};

const libraries: ("places" | "geocoding")[] = ["places", "geocoding"];

// Conflict marker colors
const getSeverityColor = (severity: "high" | "medium" | "low") => {
  switch (severity) {
    case "high":
      return "#ef4444"; // red-500
    case "medium":
      return "#f59e0b"; // amber-500
    case "low":
      return "#3b82f6"; // blue-500
    default:
      return "#6b7280"; // gray-500
  }
};

const getSeverityIcon = (severity: "high" | "medium" | "low") => {
  switch (severity) {
    case "high":
      return google.maps.SymbolPath.BACKWARD_CLOSED_ARROW;
    case "medium":
      return google.maps.SymbolPath.FORWARD_CLOSED_ARROW;
    case "low":
      return google.maps.SymbolPath.CIRCLE;
    default:
      return google.maps.SymbolPath.CIRCLE;
  }
};

// Get status color for team member
const getStatusColor = (status?: string) => {
  switch (status) {
    case "on_site":
      return "#22c55e"; // green-500
    case "en_route":
      return "#3b82f6"; // blue-500
    case "away":
      return "#6b7280"; // gray-500
    default:
      return "#f59e0b"; // amber-500
  }
};

export default function TeamMapWidget({ 
  projectAddress, 
  projectName,
  className,
  conflicts = [],
  isPremium = false,
  teamMembers = [],
}: TeamMapWidgetProps) {
  const { t } = useTranslation();
  const { apiKey, isLoading: isLoadingKey, error: keyError } = useGoogleMapsApi();
  const [projectLocation, setProjectLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ProjectConflict | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberLocation | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries,
  });

  // Geocode the project address
  useEffect(() => {
    if (!isLoaded || !projectAddress) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: projectAddress }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        setProjectLocation({
          lat: location.lat(),
          lng: location.lng(),
        });
        setGeocodeError(false);
      } else {
        console.warn("Geocode failed:", status);
        setGeocodeError(true);
      }
    });
  }, [isLoaded, projectAddress]);

  const mapCenter = projectLocation || defaultCenter;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (projectLocation) {
      map.setCenter(projectLocation);
      map.setZoom(15);
    }
  }, [projectLocation]);

  // Count conflicts by severity
  const highCount = conflicts.filter(c => c.severity === "high").length;
  const mediumCount = conflicts.filter(c => c.severity === "medium").length;
  const lowCount = conflicts.filter(c => c.severity === "low").length;
  const hasConflicts = conflicts.length > 0;

  // Generate offset positions for conflict markers (clustered around project location)
  const getConflictPosition = (index: number) => {
    if (!projectLocation) return null;
    
    // Create a small offset for each conflict marker
    const angle = (index * 60) * (Math.PI / 180); // 60 degrees apart
    const radius = 0.0003; // Small radius offset
    
    return {
      lat: projectLocation.lat + (Math.cos(angle) * radius),
      lng: projectLocation.lng + (Math.sin(angle) * radius),
    };
  };

  // Loading state for API key
  if (isLoadingKey) {
    return (
      <Card className={cn("border-cyan-200 dark:border-cyan-800", className)}>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </CardContent>
      </Card>
    );
  }

  // Error state for API key
  if (keyError || !apiKey) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Map unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const MapContent = ({ height = "h-48" }: { height?: string }) => (
    <div className={cn("relative rounded-lg overflow-hidden border border-cyan-200 dark:border-cyan-800", height)}>
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">Failed to load map</p>
          </div>
        </div>
      )}

      {!isLoaded && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyan-50 dark:bg-cyan-950/20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
        </div>
      )}

      {isLoaded && !loadError && (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={15}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {/* Project location marker */}
          {projectLocation && (
            <Marker
              position={projectLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: hasConflicts && isPremium ? "#22c55e" : "#f59e0b", // green if has conflicts, amber otherwise
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              }}
              title={projectName}
            />
          )}

          {/* Conflict markers - Premium only */}
          {isPremium && projectLocation && conflicts.map((conflict, index) => {
            const position = getConflictPosition(index);
            if (!position) return null;

            return (
              <Marker
                key={conflict.id}
                position={position}
                icon={{
                  path: getSeverityIcon(conflict.severity),
                  scale: conflict.severity === "high" ? 8 : 6,
                  fillColor: getSeverityColor(conflict.severity),
                  fillOpacity: 0.9,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
                title={`${conflict.conflictType}: ${conflict.description}`}
                onClick={() => setSelectedConflict(conflict)}
              />
            );
          })}

          {/* Team member markers */}
          {projectLocation && teamMembers.map((member, index) => {
            // If member has real location, use it; otherwise position around project
            const memberPosition = member.latitude && member.longitude
              ? { lat: member.latitude, lng: member.longitude }
              : {
                  // Position around the project in a circle
                  lat: projectLocation.lat + (Math.cos((index * 72 + 30) * (Math.PI / 180)) * 0.0005),
                  lng: projectLocation.lng + (Math.sin((index * 72 + 30) * (Math.PI / 180)) * 0.0005),
                };

            return (
              <Marker
                key={member.user_id}
                position={memberPosition}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: getStatusColor(member.status),
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
                title={member.full_name}
                onClick={() => setSelectedMember(member)}
              />
            );
          })}

          {/* Info window for selected conflict */}
          {selectedConflict && projectLocation && (
            <InfoWindow
              position={projectLocation}
              onCloseClick={() => setSelectedConflict(null)}
            >
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  {selectedConflict.severity === "high" ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : selectedConflict.severity === "medium" ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-semibold text-sm capitalize">
                    {t(`conflicts.types.${selectedConflict.conflictType}`, selectedConflict.conflictType)} {t("conflicts.conflict", "Conflict")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {selectedConflict.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground">{t("conflicts.photoAI", "Photo AI")}:</span>
                    <span className="ml-1 font-medium">{selectedConflict.photoValue}</span>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-1.5 rounded">
                    <span className="text-muted-foreground">{t("conflicts.blueprint", "Blueprint")}:</span>
                    <span className="ml-1 font-medium">{selectedConflict.blueprintValue}</span>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* Info window for selected team member */}
          {selectedMember && projectLocation && (
            <InfoWindow
              position={
                selectedMember.latitude && selectedMember.longitude
                  ? { lat: selectedMember.latitude, lng: selectedMember.longitude }
                  : projectLocation
              }
              onCloseClick={() => setSelectedMember(null)}
            >
              <div className="p-2 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  {selectedMember.avatar_url ? (
                    <img 
                      src={selectedMember.avatar_url} 
                      alt={selectedMember.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                      <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">{selectedMember.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{selectedMember.role}</div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs w-full justify-center",
                    selectedMember.status === "on_site" && "bg-green-50 border-green-300 text-green-700",
                    selectedMember.status === "en_route" && "bg-blue-50 border-blue-300 text-blue-700",
                    selectedMember.status === "away" && "bg-slate-50 border-slate-300 text-slate-700",
                    !selectedMember.status && "bg-amber-50 border-amber-300 text-amber-700"
                  )}
                >
                  {selectedMember.status === "on_site" && "On Site"}
                  {selectedMember.status === "en_route" && "En Route"}
                  {selectedMember.status === "away" && "Away"}
                  {!selectedMember.status && "Status Unknown"}
                </Badge>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}

      {geocodeError && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Could not locate address</p>
          </div>
        </div>
      )}

      {/* Locked overlay for non-premium users with conflicts */}
      {!isPremium && hasConflicts && (
        <div className="absolute bottom-2 left-2 right-2 bg-background/95 backdrop-blur-sm border border-amber-200 dark:border-amber-800 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground flex-1">
              {conflicts.length} {t("conflicts.detectedUpgrade", "conflicts detected")}
            </span>
            <ProBadge tier="premium" size="sm" />
          </div>
        </div>
      )}
    </div>
  );

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
          <div className="flex items-center gap-2">
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-cyan-600" />
                    {projectName} - {t("projects.siteLocation", "Site Location")}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 h-full min-h-[500px]">
                  <MapContent height="h-[500px]" />
                  {isPremium && hasConflicts && (
                    <div className="mt-4">
                      <ConflictMarkerLegend
                        highCount={highCount}
                        mediumCount={mediumCount}
                        lowCount={lowCount}
                      />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Address display */}
        <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm text-foreground truncate">{projectAddress}</span>
          </div>
        </div>

        <MapContent />

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

        {/* Quick navigation hint */}
        {projectLocation && (
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              <Navigation className="h-3 w-3 mr-1" />
              {projectLocation.lat.toFixed(4)}, {projectLocation.lng.toFixed(4)}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(projectAddress)}`,
                  "_blank"
                );
              }}
            >
              {t("common.getDirections", "Get Directions")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
