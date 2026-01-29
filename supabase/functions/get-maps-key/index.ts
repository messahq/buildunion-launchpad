import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limits
const RATE_LIMIT_AUTHENTICATED = 50; // More requests for logged-in users
const RATE_LIMIT_GUEST = 10; // Fewer requests for guests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Create service role client for rate limiting (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    let isAuthenticated = false;

    // Check for authentication (optional)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabaseClient.auth.getClaims(token);

      if (claimsData?.claims?.sub) {
        userId = claimsData.claims.sub as string;
        isAuthenticated = true;
      }
    }

    // For guests, use IP address as identifier
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const rateIdentifier = userId || `guest_${clientIp}`;
    const rateLimit = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_GUEST;

    // Check rate limit - count requests in the last hour
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { count, error: countError } = await supabaseAdmin
      .from("api_key_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", rateIdentifier)
      .eq("key_type", "google_maps")
      .gte("created_at", windowStart);

    if (countError) {
      console.error("Rate limit check error:", countError);
    }

    const requestCount = count ?? 0;

    if (requestCount >= rateLimit) {
      console.warn(`Rate limit exceeded for ${rateIdentifier}: ${requestCount} requests`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          message: isAuthenticated 
            ? "You have made too many requests. Please try again later."
            : "Please sign in for more address lookups, or try again later.",
          retryAfter: 3600
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600"
          }, 
          status: 429 
        }
      );
    }

    // Log the request for monitoring (using service role to bypass RLS)
    const { error: logError } = await supabaseAdmin
      .from("api_key_requests")
      .insert({
        user_id: rateIdentifier,
        key_type: "google_maps",
        ip_address: clientIp,
        user_agent: req.headers.get("user-agent") || null,
      });

    if (logError) {
      console.error("Failed to log API key request:", logError);
    }

    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!mapsKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const remainingRequests = rateLimit - requestCount - 1;
    console.log(`Maps key requested by ${rateIdentifier}. Remaining: ${remainingRequests}/${rateLimit}`);

    return new Response(
      JSON.stringify({ 
        key: mapsKey,
        rateLimit: {
          remaining: remainingRequests,
          limit: rateLimit,
          resetIn: 3600
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(remainingRequests),
          "X-RateLimit-Limit": String(rateLimit)
        }, 
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Get maps key error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
