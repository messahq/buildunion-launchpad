import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Haversine formula — distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(
  address: string,
  mapsApiKey: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsApiKey}`
    );
    const data = await res.json();
    if (data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    // ─── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // ─── Body ────────────────────────────────────────────────
    const body = await req.json();
    const {
      project_id,
      photo_lat,
      photo_lng,
      photo_timestamp,
      source = "site_photo",
    } = body as {
      project_id: string;
      photo_lat: number;
      photo_lng: number;
      photo_timestamp?: string;
      source?: string;
    };

    if (!project_id || photo_lat == null || photo_lng == null) {
      return new Response(
        JSON.stringify({ error: "Missing project_id, photo_lat, or photo_lng" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Authorization: user must be owner or member ─────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: canView } = await supabase.rpc("can_view_all_project_data", {
      _project_id: project_id,
      _user_id: userId,
    });

    if (!canView) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get project address & geocode ───────────────────────
    const { data: project } = await supabase
      .from("projects")
      .select("address, name")
      .eq("id", project_id)
      .single();

    if (!project?.address) {
      return new Response(
        JSON.stringify({
          status: "NO_ADDRESS",
          message: "Project has no address set — cannot verify location",
          conflict: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mapsApiKey) {
      return new Response(
        JSON.stringify({
          status: "NO_MAPS_KEY",
          message: "Google Maps API key not configured",
          conflict: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectCoords = await geocodeAddress(project.address, mapsApiKey);
    if (!projectCoords) {
      return new Response(
        JSON.stringify({
          status: "GEOCODE_FAILED",
          message: "Could not geocode project address",
          conflict: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Distance calculation ────────────────────────────────
    const distanceMeters = haversineMeters(
      projectCoords.lat,
      projectCoords.lng,
      photo_lat,
      photo_lng
    );

    // Thresholds
    const CONFLICT_THRESHOLD_M = 500; // > 500m = conflict
    const WARNING_THRESHOLD_M = 200;  // > 200m = warning

    let status: "OK" | "WARNING" | "CONFLICT_DETECTED";
    if (distanceMeters > CONFLICT_THRESHOLD_M) {
      status = "CONFLICT_DETECTED";
    } else if (distanceMeters > WARNING_THRESHOLD_M) {
      status = "WARNING";
    } else {
      status = "OK";
    }

    const result = {
      status,
      conflict: status === "CONFLICT_DETECTED",
      distance_meters: Math.round(distanceMeters),
      distance_label:
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1)} km`
          : `${Math.round(distanceMeters)} m`,
      project_name: project.name,
      thresholds: {
        warning_m: WARNING_THRESHOLD_M,
        conflict_m: CONFLICT_THRESHOLD_M,
      },
      source,
      checked_at: new Date().toISOString(),
    };

    // ─── If conflict, notify project owner ───────────────────
    if (status === "CONFLICT_DETECTED") {
      const { data: proj } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", project_id)
        .single();

      if (proj?.user_id) {
        // Get uploader name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", userId)
          .single();

        const uploaderName = profile?.full_name || "Team member";

        await supabase.from("notification_logs").insert({
          user_id: proj.user_id,
          title: "🔴 GPS Conflict Detected",
          body: `${uploaderName} uploaded a ${source} from ${result.distance_label} away from "${project.name}". Verify the submission.`,
          status: "sent",
          link: `/buildunion/project/${project_id}`,
          data: {
            type: "gps_conflict",
            project_id,
            distance_meters: result.distance_meters,
            source,
          },
        });
      }
    }

    console.log(
      `[gps-conflict-check] project=${project_id} distance=${result.distance_label} status=${status}`
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[gps-conflict-check] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
