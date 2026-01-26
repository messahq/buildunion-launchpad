import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Map, 
  MapPin, 
  Loader2, 
  AlertCircle,
  Maximize2,
  Navigation
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { cn } from "@/lib/utils";

interface TeamMapWidgetProps {
  projectAddress: string;
  projectName: string;
  className?: string;
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

export default function TeamMapWidget({ 
  projectAddress, 
  projectName,
  className 
}: TeamMapWidgetProps) {
  const { apiKey, isLoading: isLoadingKey, error: keyError } = useGoogleMapsApi();
  const [projectLocation, setProjectLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);

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
                fillColor: "#f59e0b",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              }}
              title={projectName}
            />
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
    </div>
  );

  return (
    <Card className={cn("bg-card border-cyan-200 dark:border-cyan-800 overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-b border-cyan-100 dark:border-cyan-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle className="text-lg font-semibold">
              Project Site
            </CardTitle>
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
                    {projectName} - Site Location
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 h-full min-h-[500px]">
                  <MapContent height="h-[500px]" />
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
              Get Directions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
