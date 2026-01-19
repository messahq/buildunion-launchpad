import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  userIds?: string[];
  projectId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, icon, badge, data, userIds, projectId }: PushPayload = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query for subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    
    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || "/pwa-icons/icon-512x512.png",
      badge: badge || "/pwa-icons/icon-512x512.png",
      data: {
        ...data,
        projectId,
        timestamp: new Date().toISOString(),
      },
    });

    let successCount = 0;
    let failureCount = 0;
    const failedSubscriptions: string[] = [];

    for (const subscription of subscriptions) {
      try {
        // Create VAPID headers
        const endpoint = new URL(subscription.endpoint);
        const audience = `${endpoint.protocol}//${endpoint.host}`;
        
        // Simple JWT for VAPID
        const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }));
        const now = Math.floor(Date.now() / 1000);
        const payload = btoa(JSON.stringify({
          aud: audience,
          exp: now + 12 * 60 * 60,
          sub: "mailto:notifications@buildunion.app",
        }));

        // For web push, we need to use the web-push library or create proper ECDSA signatures
        // For now, we'll use a simplified approach with fetch
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400",
          },
          body: notificationPayload,
        });

        if (response.ok || response.status === 201) {
          successCount++;
          
          // Log the notification
          await supabase.from("notification_logs").insert({
            user_id: subscription.user_id,
            title,
            body,
            data: data || {},
            status: "sent",
          });
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          failedSubscriptions.push(subscription.id);
          failureCount++;
        } else {
          console.error(`Push failed for ${subscription.id}: ${response.status}`);
          failureCount++;
        }
      } catch (error) {
        console.error(`Error sending to ${subscription.id}:`, error);
        failureCount++;
      }
    }

    // Clean up expired subscriptions
    if (failedSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent: successCount,
        failed: failureCount,
        cleaned: failedSubscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
