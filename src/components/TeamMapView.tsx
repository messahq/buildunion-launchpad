import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useProjectConflicts, ProjectConflict } from "@/hooks/useProjectConflicts";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Map, 
  MapPin, 
  Crown,
  Loader2,
  Navigation,
  RefreshCw,
  AlertCircle,
  Maximize2,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TeamMemberLocation {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  companyName: string | null;
  primaryTrade: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
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

// Wrapper component that loads Google Maps
const TeamMapViewContent = ({ 
  apiKey,
  teamMembers,
  userLocation,
  mapCenter,
  setMapCenter,
  selectedMember,
  setSelectedMember,
  isUpdatingLocation,
  updateMyLocation,
  fetchTeamMembers,
  navigate,
  conflicts,
  selectedConflict,
  setSelectedConflict,
}: {
  apiKey: string;
  teamMembers: TeamMemberLocation[];
  userLocation: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number };
  setMapCenter: (center: { lat: number; lng: number }) => void;
  selectedMember: TeamMemberLocation | null;
  setSelectedMember: (member: TeamMemberLocation | null) => void;
  isUpdatingLocation: boolean;
  updateMyLocation: () => void;
  fetchTeamMembers: () => void;
  navigate: (path: string) => void;
  conflicts: ProjectConflict[];
  selectedConflict: ProjectConflict | null;
  setSelectedConflict: (conflict: ProjectConflict | null) => void;
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const membersWithLocation = teamMembers.filter(m => m.latitude && m.longitude);
  const membersNearby = userLocation
    ? membersWithLocation
        .map(m => ({
          ...m,
          distance: calculateDistance(userLocation.lat, userLocation.lng, m.latitude!, m.longitude!)
        }))
        .sort((a, b) => a.distance - b.distance)
    : membersWithLocation.map(m => ({ ...m, distance: 0 }));

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (membersWithLocation.length > 0 || userLocation) {
      const bounds = new google.maps.LatLngBounds();
      
      if (userLocation) {
        bounds.extend(userLocation);
      }
      
      membersWithLocation.forEach(member => {
        if (member.latitude && member.longitude) {
          bounds.extend({ lat: member.latitude, lng: member.longitude });
        }
      });
      
      if (membersWithLocation.length > 0 || userLocation) {
        map.fitBounds(bounds);
        const listener = google.maps.event.addListener(map, "idle", () => {
          if (map.getZoom()! > 15) map.setZoom(15);
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [membersWithLocation, userLocation]);

  const MapContent = ({ height = "h-48", showList = true }: { height?: string; showList?: boolean }) => (
    <>
      <div className={`relative ${height} rounded-lg overflow-hidden border border-purple-200`}>
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-50">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">Failed to load Google Maps</p>
            </div>
          </div>
        )}

        {!isLoaded && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-50">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        )}

        {isLoaded && !loadError && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={12}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#7c3aed",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                }}
                title="You are here"
              />
            )}

            {membersWithLocation.map(member => (
              <Marker
                key={member.id}
                position={{ lat: member.latitude!, lng: member.longitude! }}
                onClick={() => setSelectedMember(member)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#6366f1",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              />
            ))}

            {/* Conflict markers - Yellow warning icons */}
            {conflicts.filter(c => c.latitude && c.longitude).map((conflict, index) => (
              <Marker
                key={`conflict-${conflict.projectId}-${index}`}
                position={{ lat: conflict.latitude!, lng: conflict.longitude! }}
                onClick={() => {
                  setSelectedMember(null);
                  setSelectedConflict(conflict);
                }}
                icon={{
                  path: "M12 2L2 22h20L12 2zm0 6l6.9 12H5.1L12 8z",
                  scale: 1.5,
                  fillColor: conflict.severity === "high" ? "#dc2626" : "#f59e0b",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  anchor: new google.maps.Point(12, 22),
                }}
                title={`Conflict: ${conflict.projectName}`}
              />
            ))}

            {selectedMember && selectedMember.latitude && selectedMember.longitude && (
              <InfoWindow
                position={{ lat: selectedMember.latitude, lng: selectedMember.longitude }}
                onCloseClick={() => setSelectedMember(null)}
              >
                <div className="p-2 min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedMember.avatarUrl || undefined} />
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                        {getInitials(selectedMember.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{selectedMember.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {selectedMember.companyName || selectedMember.primaryTrade}
                      </p>
                    </div>
                  </div>
                  {userLocation && (
                    <p className="text-xs text-purple-600 mt-2">
                      {calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        selectedMember.latitude!,
                        selectedMember.longitude!
                      ).toFixed(1)} km away
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Conflict InfoWindow */}
            {selectedConflict && selectedConflict.latitude && selectedConflict.longitude && (
              <InfoWindow
                position={{ lat: selectedConflict.latitude, lng: selectedConflict.longitude }}
                onCloseClick={() => setSelectedConflict(null)}
              >
                <div className="p-2 min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded ${selectedConflict.severity === "high" ? "bg-red-100" : "bg-amber-100"}`}>
                      <AlertTriangle className={`h-4 w-4 ${selectedConflict.severity === "high" ? "text-red-600" : "text-amber-600"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{selectedConflict.projectName}</p>
                      <p className="text-xs text-slate-500 capitalize">{selectedConflict.conflictType} Conflict</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Photo:</span>
                      <span className="font-medium">{selectedConflict.photoValue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Blueprint:</span>
                      <span className="font-medium">{selectedConflict.blueprintValue}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/buildunion/project/${selectedConflict.projectId}`)}
                    className="mt-2 w-full text-xs bg-amber-500 hover:bg-amber-600 text-white py-1 px-2 rounded transition-colors"
                  >
                    View Project
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        {!userLocation && isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-900/20 pointer-events-none">
            <div className="text-center bg-white/90 rounded-lg p-4 shadow-lg">
              <AlertCircle className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-purple-600">Share your location for better experience</p>
            </div>
          </div>
        )}
      </div>

      {showList && (
        <>
          {membersNearby.length > 0 ? (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Nearby Team Members</h4>
              {membersNearby.slice(0, 5).map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => {
                    if (member.latitude && member.longitude) {
                      setMapCenter({ lat: member.latitude, lng: member.longitude });
                      setSelectedMember(member);
                    }
                  }}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {member.fullName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {member.companyName || member.primaryTrade}
                    </p>
                  </div>
                  {userLocation && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {member.distance < 1 
                        ? `${Math.round(member.distance * 1000)}m`
                        : `${member.distance.toFixed(1)}km`
                      }
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 mt-4">
              <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No team members with shared locations</p>
              <p className="text-xs text-slate-400 mt-1">
                Ask your team to update their locations
              </p>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Team Map
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
                    <Map className="h-5 w-5 text-purple-600" />
                    Team Location Map
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 h-full min-h-[500px]">
                  <MapContent height="h-[500px]" showList={false} />
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={updateMyLocation}
              disabled={isUpdatingLocation}
              className="text-xs"
            >
              {isUpdatingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Navigation className="h-3 w-3 mr-1" />
              )}
              Update Location
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-purple-600">{membersWithLocation.length}</span>
                {" "}of {teamMembers.length} members have shared location
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTeamMembers}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <MapContent />
      </CardContent>
    </Card>
  );
};

const TeamMapView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { conflicts } = useProjectConflicts();
  const [teamMembers, setTeamMembers] = useState<TeamMemberLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberLocation | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<ProjectConflict | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState(false);

  // Pro tier now also has access to map (Premium features are still exclusive)
  const hasMapAccess = subscription.tier === "pro" || subscription.tier === "premium" || subscription.tier === "enterprise";
  const hasPremiumAccess = subscription.tier === "premium" || subscription.tier === "enterprise";

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-maps-key");
        if (error) throw error;
        if (data?.key) {
          setApiKey(data.key);
        } else {
          setApiKeyError(true);
        }
      } catch (err) {
        console.error("Error fetching maps key:", err);
        setApiKeyError(true);
      }
    };

    if (hasMapAccess) {
      fetchApiKey();
    }
  }, [hasMapAccess]);

  useEffect(() => {
    if (user && hasMapAccess) {
      fetchTeamMembers();
      getCurrentLocation();
    } else {
      setIsLoading(false);
    }
  }, [user, hasMapAccess]);

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const updateMyLocation = async () => {
    if (!user || !("geolocation" in navigator)) {
      toast.error("Geolocation is not supported");
      return;
    }

    setIsUpdatingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { error } = await supabase
            .from("bu_profiles")
            .update({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              location_updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          if (error) throw error;

          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);

          toast.success("Location updated!");
          fetchTeamMembers();
        } catch (err) {
          console.error("Error updating location:", err);
          toast.error("Failed to update location");
        } finally {
          setIsUpdatingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Could not get your location");
        setIsUpdatingLocation(false);
      }
    );
  };

  const fetchTeamMembers = async () => {
    if (!user) return;

    try {
      const { data: ownedProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id);

      if (!ownedProjects || ownedProjects.length === 0) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      const projectIds = ownedProjects.map(p => p.id);

      const { data: members } = await supabase
        .from("project_members")
        .select("user_id")
        .in("project_id", projectIds);

      if (!members || members.length === 0) {
        setTeamMembers([]);
        setIsLoading(false);
        return;
      }

      const memberUserIds = [...new Set(members.map(m => m.user_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", memberUserIds);

      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name, primary_trade, avatar_url, latitude, longitude, location_updated_at")
        .in("user_id", memberUserIds);

      const teamData: TeamMemberLocation[] = memberUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const buProfile = buProfiles?.find(bp => bp.user_id === userId);

        return {
          id: userId,
          fullName: profile?.full_name || "Team Member",
          avatarUrl: buProfile?.avatar_url || profile?.avatar_url || null,
          companyName: buProfile?.company_name || null,
          primaryTrade: buProfile?.primary_trade?.replace(/_/g, " ") || null,
          latitude: buProfile?.latitude || null,
          longitude: buProfile?.longitude || null,
          locationUpdatedAt: buProfile?.location_updated_at || null,
        };
      });

      setTeamMembers(teamData);
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Locked state for non-Pro/Premium users
  if (!hasMapAccess) {
    return (
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-100 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-slate-400" />
              <CardTitle className="text-lg font-semibold text-slate-400">
                Team Map
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
              <Crown className="h-3 w-3 mr-1" />
              Pro+
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
              <Map className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-2">Team Location Map</h3>
            <p className="text-sm text-slate-500 mb-4">
              See team members' locations, conflicts, and find who's nearby
            </p>
            <Button 
              onClick={() => navigate("/buildunion/pricing")}
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600"
            >
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || (!apiKey && !apiKeyError)) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  if (apiKeyError) {
    return (
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Team Map
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700 mb-2">Maps Not Configured</h3>
            <p className="text-sm text-slate-500">
              Google Maps API key is not configured. Please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TeamMapViewContent
      apiKey={apiKey!}
      teamMembers={teamMembers}
      userLocation={userLocation}
      mapCenter={mapCenter}
      setMapCenter={setMapCenter}
      selectedMember={selectedMember}
      setSelectedMember={setSelectedMember}
      isUpdatingLocation={isUpdatingLocation}
      updateMyLocation={updateMyLocation}
      fetchTeamMembers={fetchTeamMembers}
      navigate={navigate}
      conflicts={conflicts}
      selectedConflict={selectedConflict}
      setSelectedConflict={setSelectedConflict}
    />
  );
};

export default TeamMapView;
