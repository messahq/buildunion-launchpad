import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationAlert {
  projectId: string;
  projectName: string;
  memberId: string;
  memberName: string;
  expectedLocation: { lat: number; lng: number };
  actualLocation: { lat: number; lng: number } | null;
  distanceKm: number;
  status: "late" | "missing_location" | "too_far";
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parse address to get approximate coordinates (simplified - would use geocoding API in production)
async function geocodeAddress(address: string, mapsApiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${mapsApiKey}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
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
    const mapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting geolocation check...");

    // Get all active projects with addresses
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, address, user_id, status")
      .eq("status", "active")
      .not("address", "is", null);

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      throw projectsError;
    }

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active projects with locations", alertsGenerated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alerts: LocationAlert[] = [];
    const DISTANCE_THRESHOLD_KM = 5; // Alert if team member is more than 5km from project site
    const LOCATION_STALE_HOURS = 2; // Consider location stale if not updated in 2 hours

    for (const project of projects) {
      // Get project location from address
      let projectLocation: { lat: number; lng: number } | null = null;
      
      if (mapsApiKey && project.address) {
        projectLocation = await geocodeAddress(project.address, mapsApiKey);
      }

      if (!projectLocation) {
        console.log(`Could not geocode address for project ${project.name}`);
        continue;
      }

      // Get all team members for this project
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", project.id);

      if (!members || members.length === 0) continue;

      const memberIds = members.map((m) => m.user_id);

      // Get team member locations
      const { data: profiles } = await supabase
        .from("bu_profiles")
        .select("user_id, latitude, longitude, location_updated_at")
        .in("user_id", memberIds);

      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", memberIds);

      const now = new Date();

      for (const memberId of memberIds) {
        const buProfile = profiles?.find((p) => p.user_id === memberId);
        const userProfile = userProfiles?.find((p) => p.user_id === memberId);
        const memberName = userProfile?.full_name || "Team Member";

        if (!buProfile?.latitude || !buProfile?.longitude) {
          // No location shared
          alerts.push({
            projectId: project.id,
            projectName: project.name,
            memberId,
            memberName,
            expectedLocation: projectLocation,
            actualLocation: null,
            distanceKm: 0,
            status: "missing_location",
          });
          continue;
        }

        // Check if location is stale
        const locationUpdatedAt = buProfile.location_updated_at
          ? new Date(buProfile.location_updated_at)
          : null;
        const isStale =
          !locationUpdatedAt ||
          (now.getTime() - locationUpdatedAt.getTime()) / (1000 * 60 * 60) > LOCATION_STALE_HOURS;

        if (isStale) {
          alerts.push({
            projectId: project.id,
            projectName: project.name,
            memberId,
            memberName,
            expectedLocation: projectLocation,
            actualLocation: { lat: buProfile.latitude, lng: buProfile.longitude },
            distanceKm: 0,
            status: "late",
          });
          continue;
        }

        // Calculate distance from project site
        const distance = calculateDistance(
          projectLocation.lat,
          projectLocation.lng,
          buProfile.latitude,
          buProfile.longitude
        );

        if (distance > DISTANCE_THRESHOLD_KM) {
          alerts.push({
            projectId: project.id,
            projectName: project.name,
            memberId,
            memberName,
            expectedLocation: projectLocation,
            actualLocation: { lat: buProfile.latitude, lng: buProfile.longitude },
            distanceKm: Math.round(distance * 10) / 10,
            status: "too_far",
          });
        }
      }
    }

    // Send alerts to project owners (Premium users get push notifications)
    const ownerAlerts = new Map<string, LocationAlert[]>();
    for (const alert of alerts) {
      const project = projects.find((p) => p.id === alert.projectId);
      if (project) {
        const existing = ownerAlerts.get(project.user_id) || [];
        existing.push(alert);
        ownerAlerts.set(project.user_id, existing);
      }
    }

    let notificationsSent = 0;
    for (const [ownerId, ownerAlertList] of ownerAlerts) {
      const alertMessages = ownerAlertList.map((a) => {
        switch (a.status) {
          case "late":
            return `⏰ ${a.memberName} has a stale location for ${a.projectName}`;
          case "missing_location":
            return `📍 ${a.memberName} hasn't shared location for ${a.projectName}`;
          case "too_far":
            return `🚗 ${a.memberName} is ${a.distanceKm}km from ${a.projectName}`;
        }
      });

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: `⚠️ Team Location Alert`,
            body: alertMessages.slice(0, 3).join("\n"),
            userIds: [ownerId],
            data: { type: "geolocation_alert", alerts: ownerAlertList.slice(0, 5) },
          },
        });
        notificationsSent++;
      } catch (pushError) {
        console.error(`Failed to send alert to ${ownerId}:`, pushError);
      }
    }

    console.log(`Generated ${alerts.length} location alerts, sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({
        message: "Geolocation check completed",
        alertsGenerated: alerts.length,
        notificationsSent,
        alerts: alerts.slice(0, 20), // Return first 20 alerts for debugging
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in geolocation-check:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
