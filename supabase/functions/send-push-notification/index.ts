import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// UUID validation regex (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid);
}

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

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

    const callerId = claimsData.user.id;

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, icon, badge, data, userIds, projectId }: PushPayload = await req.json();

    // Validate title - required and reasonable length
    if (!title || typeof title !== 'string') {
      return new Response(
        JSON.stringify({ error: "Title is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: "Title must be 200 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate body length if provided
    if (body && (typeof body !== 'string' || body.length > 1000)) {
      return new Response(
        JSON.stringify({ error: "Body must be a string of 1000 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate userIds array
    if (userIds) {
      if (!Array.isArray(userIds)) {
        return new Response(
          JSON.stringify({ error: "userIds must be an array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userIds.length > 100) {
        return new Response(
          JSON.stringify({ error: "Cannot send notifications to more than 100 users at once" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate each userId is a valid UUID
      const invalidUserIds = userIds.filter(id => !isValidUUID(id));
      if (invalidUserIds.length > 0) {
        return new Response(
          JSON.stringify({ error: "All userIds must be valid UUIDs" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate projectId is a valid UUID if provided
    if (projectId && !isValidUUID(projectId)) {
      return new Response(
        JSON.stringify({ error: "projectId must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization check - verify caller has permission to send notifications
    // If projectId is provided, verify the caller is a project member/owner
    if (projectId) {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData) {
        return new Response(
          JSON.stringify({ error: "Project not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if caller is project owner
      const isOwner = projectData.user_id === callerId;

      // Check if caller is a project member
      const { data: memberData } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", callerId)
        .maybeSingle();

      if (!isOwner && !memberData) {
        return new Response(
          JSON.stringify({ error: "You don't have permission to send notifications for this project" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If sending to specific userIds, verify they are project members
      if (userIds && userIds.length > 0) {
        const { data: validMembers } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId)
          .in("user_id", userIds);

        const validMemberIds = new Set(validMembers?.map(m => m.user_id) || []);
        // Also include project owner
        validMemberIds.add(projectData.user_id);

        const invalidUserIds = userIds.filter(id => !validMemberIds.has(id));
        if (invalidUserIds.length > 0) {
          return new Response(
            JSON.stringify({ error: "Some userIds are not members of this project" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      // No projectId - caller can only send notifications to themselves
      if (userIds && userIds.length > 0) {
        const invalidUserIds = userIds.filter(id => id !== callerId);
        if (invalidUserIds.length > 0) {
          return new Response(
            JSON.stringify({ error: "Without a projectId, you can only send notifications to yourself" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Build query for subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    
    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    } else if (projectId) {
      // Get all project members and owner for notifications
      const { data: projectData } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();

      const { data: members } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId);

      const allUserIds = new Set<string>();
      if (projectData) allUserIds.add(projectData.user_id);
      members?.forEach(m => allUserIds.add(m.user_id));

      if (allUserIds.size > 0) {
        query = query.in("user_id", Array.from(allUserIds));
      }
    } else {
      // No userIds or projectId - only send to caller
      query = query.eq("user_id", callerId);
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
