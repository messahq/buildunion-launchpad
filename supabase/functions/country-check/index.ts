import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract caller IP (Supabase Edge passes x-forwarded-for)
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";

    let country = "UNKNOWN";
    let countryName = "Unknown";

    if (ip) {
      try {
        // ipapi.co — free, no key required, returns country code
        const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
          headers: { "User-Agent": "BuildUnion-CountryCheck/1.0" },
        });
        if (r.ok) {
          const data = await r.json();
          country = (data.country_code || data.country || "UNKNOWN").toUpperCase();
          countryName = data.country_name || country;
        }
      } catch (err) {
        console.error("[country-check] IP lookup failed:", err);
      }
    }

    const allowed = country === "CA";

    return new Response(
      JSON.stringify({ ip, country, countryName, allowed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[country-check] Error:", error);
    // Fail-open to avoid locking everyone out if the IP service is down
    return new Response(
      JSON.stringify({ country: "UNKNOWN", allowed: true, error: "lookup_failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
