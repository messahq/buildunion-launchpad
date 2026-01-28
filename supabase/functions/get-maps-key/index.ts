import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit: max 10 requests per hour per user
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with auth header for user verification
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Create service role client for rate limiting (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit - count requests in the last hour
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { count, error: countError } = await supabaseAdmin
      .from("api_key_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("key_type", "google_maps")
      .gte("created_at", windowStart);

    if (countError) {
      console.error("Rate limit check error:", countError);
      // Continue anyway - don't block users due to internal errors
    }

    const requestCount = count ?? 0;

    if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
      console.warn(`Rate limit exceeded for user ${userId}: ${requestCount} requests`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          message: "You have made too many requests. Please try again later.",
          retryAfter: 3600 // seconds
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
        user_id: userId,
        key_type: "google_maps",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      });

    if (logError) {
      console.error("Failed to log API key request:", logError);
      // Continue anyway - logging failure shouldn't block the user
    }

    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!mapsKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Log remaining requests for the user
    const remainingRequests = RATE_LIMIT_MAX_REQUESTS - requestCount - 1;
    console.log(`Maps key requested by user ${userId}. Remaining requests: ${remainingRequests}`);

    return new Response(
      JSON.stringify({ 
        key: mapsKey,
        rateLimit: {
          remaining: remainingRequests,
          limit: RATE_LIMIT_MAX_REQUESTS,
          resetIn: 3600 // seconds until window resets
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(remainingRequests),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS)
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
