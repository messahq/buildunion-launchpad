import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID validation regex (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid);
}

interface MessageNotificationPayload {
  recipientId: string;
  senderName: string;
  messagePreview: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authentication check - require valid Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the token and get user claims
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderId = claimsData.user.id;

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipientId, senderName, messagePreview }: MessageNotificationPayload = await req.json();

    // Validate recipientId
    if (!recipientId || !isValidUUID(recipientId)) {
      return new Response(
        JSON.stringify({ error: "recipientId is required and must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate senderName
    if (!senderName || typeof senderName !== 'string' || senderName.length > 100) {
      return new Response(
        JSON.stringify({ error: "senderName is required and must be 100 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate messagePreview
    if (!messagePreview || typeof messagePreview !== 'string' || messagePreview.length > 200) {
      return new Response(
        JSON.stringify({ error: "messagePreview is required and must be 200 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recipient's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found for recipient", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationPayload = JSON.stringify({
      title: `New message from ${senderName}`,
      body: messagePreview,
      icon: "/pwa-icons/icon-512x512.png",
      badge: "/pwa-icons/icon-512x512.png",
      data: {
        type: "direct_message",
        senderId,
        url: "/buildunion/messages",
        timestamp: new Date().toISOString(),
      },
    });

    let successCount = 0;
    let failureCount = 0;
    const failedSubscriptions: string[] = [];

    for (const subscription of subscriptions) {
      try {
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
            user_id: recipientId,
            title: `New message from ${senderName}`,
            body: messagePreview,
            data: { type: "direct_message", senderId },
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
        message: "Message notification processed",
        sent: successCount,
        failed: failureCount,
        cleaned: failedSubscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-message-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
