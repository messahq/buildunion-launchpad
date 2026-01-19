import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
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
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

const TeamMapView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [teamMembers, setTeamMembers] = useState<TeamMemberLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Only Premium and Enterprise can access
  const hasPremiumAccess = subscription.tier === "premium" || subscription.tier === "enterprise";

  useEffect(() => {
    if (user && hasPremiumAccess) {
      fetchTeamMembers();
      getCurrentLocation();
    } else {
      setIsLoading(false);
    }
  }, [user, hasPremiumAccess]);

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
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

          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });

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
      // Get projects where user is owner
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

      // Get team members from those projects
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

      // Fetch their profiles with location
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", memberUserIds);

      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name, primary_trade, avatar_url, latitude, longitude, location_updated_at")
        .in("user_id", memberUserIds);

      // Combine data
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
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
    : [];

  // Locked state for non-premium users
  if (!hasPremiumAccess) {
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
              Premium+
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
              See team members' locations and find who's nearby
            </p>
            <Button 
              onClick={() => navigate("/buildunion/pricing")}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Team Map
            </CardTitle>
          </div>
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
            Update My Location
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Location Status */}
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

        {/* Map Placeholder with Visual Representation */}
        <div className="relative h-48 rounded-lg bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 border border-purple-200 overflow-hidden mb-4">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#a855f7" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Center marker (user) */}
          {userLocation && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white shadow-lg animate-pulse" />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-purple-700 whitespace-nowrap">
                You
              </div>
            </div>
          )}

          {/* Team member markers (scattered around center) */}
          {membersNearby.slice(0, 6).map((member, idx) => {
            const angle = (idx / 6) * 2 * Math.PI;
            const radius = 30 + Math.min(member.distance, 50);
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);

            return (
              <div
                key={member.id}
                className="absolute z-5"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Avatar className="w-8 h-8 border-2 border-white shadow-md">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                    {getInitials(member.fullName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            );
          })}

          {!userLocation && (
            <div className="absolute inset-0 flex items-center justify-center bg-purple-900/10">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-purple-600">Share your location to see the map</p>
              </div>
            </div>
          )}
        </div>

        {/* Nearby Members List */}
        {membersNearby.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Nearby Team Members</h4>
            {membersNearby.slice(0, 5).map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
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
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {member.distance < 1 
                    ? `${Math.round(member.distance * 1000)}m`
                    : `${member.distance.toFixed(1)}km`
                  }
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No team members with shared locations</p>
            <p className="text-xs text-slate-400 mt-1">
              Ask your team to update their locations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMapView;
