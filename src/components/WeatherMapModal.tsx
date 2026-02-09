import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherWidget } from "./WeatherWidget";
import { MapPin } from "lucide-react";

interface WeatherMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: string;
  lat?: number;
  lon?: number;
  projectName?: string;
}

export function WeatherMapModal({
  open,
  onOpenChange,
  location,
  lat,
  lon,
  projectName = "Project",
}: WeatherMapModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weather & Location - {projectName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="weather" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weather">Weather Forecast</TabsTrigger>
            <TabsTrigger value="location">Location Map</TabsTrigger>
          </TabsList>

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
          <TabsContent value="location" className="space-y-4 flex-1 flex flex-col min-h-0">
            {lat && lon ? (
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex-1 min-h-[300px] max-h-[60vh] rounded-lg overflow-hidden border bg-muted/50">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${lat},${lon}&z=16&output=embed`}
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
              <div className="h-[500px] flex items-center justify-center rounded-lg border border-dashed bg-muted/50">
                <div className="text-center text-muted-foreground">
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
