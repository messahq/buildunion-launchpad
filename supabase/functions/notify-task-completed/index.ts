import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyTaskCompletedPayload {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workerId = userData.user.id;
    const workerEmail = userData.user.email || "Worker";

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { taskId, taskTitle, projectId, projectName }: NotifyTaskCompletedPayload = await req.json();

    if (!taskId || !projectId) {
      return new Response(
        JSON.stringify({ error: "Missing taskId or projectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the task exists and worker is assigned
    const { data: taskData, error: taskError } = await supabase
      .from("project_tasks")
      .select("id, assigned_to, project_id")
      .eq("id", taskId)
      .single();

    if (taskError || !taskData) {
      return new Response(
        JSON.stringify({ error: "Task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify worker is assigned to this task
    if (taskData.assigned_to !== workerId) {
      return new Response(
        JSON.stringify({ error: "Not authorized - you are not assigned to this task" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get project owner
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("user_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerId = projectData.user_id;
    const resolvedProjectName = projectName || projectData.name || "Project";

    // Get worker's name from bu_profiles
    const { data: workerProfile } = await supabase
      .from("bu_profiles")
      .select("company_name")
      .eq("user_id", workerId)
      .maybeSingle();

    // Get worker's full_name from profiles if no company_name
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", workerId)
      .maybeSingle();

    const workerName = workerProfile?.company_name || profileData?.full_name || workerEmail?.split("@")[0] || "Team member";

    // Get owner's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", ownerId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
    }

    const notificationTitle = "✅ Task Completed";
    const notificationBody = `${workerName} completed "${taskTitle}" in ${resolvedProjectName}`;

    // Log the notification
    await supabase.from("notification_logs").insert({
      user_id: ownerId,
      title: notificationTitle,
      body: notificationBody,
      data: { taskId, projectId, workerId, type: "task_completed" },
      status: subscriptions && subscriptions.length > 0 ? "sent" : "no_subscription",
    });

    let successCount = 0;
    let failureCount = 0;

    if (subscriptions && subscriptions.length > 0) {
      const notificationPayload = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: "/pwa-icons/icon-512x512.png",
        badge: "/pwa-icons/icon-512x512.png",
        data: {
          taskId,
          projectId,
          workerId,
          type: "task_completed",
          url: `/buildunion/workspace?project=${projectId}`,
          timestamp: new Date().toISOString(),
        },
      });

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
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error(`Error sending notification:`, error);
          failureCount++;
        }
      }
    }

    console.log(`[TASK-COMPLETED] Notified owner ${ownerId} about task "${taskTitle}" by ${workerName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Owner notified",
        sent: successCount,
        failed: failureCount,
        ownerId,
        workerName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-task-completed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
