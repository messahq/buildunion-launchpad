import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyReportData {
  userId: string;
  email: string;
  tier: "pro" | "premium" | "enterprise";
  projectsCount: number;
  tasksCompleted: number;
  tasksPending: number;
  teamMembersCount: number;
  conflictsDetected: number;
  estimatesCreated: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting weekly report generation...");

    // Get all users with Pro, Premium, or Enterprise subscriptions
    // For now, we'll check all active projects and send to their owners
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    // Get all project owners
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("user_id, id, name, status")
      .gte("updated_at", oneWeekAgoISO);

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      throw projectsError;
    }

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active projects found", reportsGenerated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group projects by user
    const userProjects = new Map<string, typeof projects>();
    projects.forEach((project) => {
      const existing = userProjects.get(project.user_id) || [];
      existing.push(project);
      userProjects.set(project.user_id, existing);
    });

    const reports: WeeklyReportData[] = [];
    const pushNotifications: { userId: string; title: string; body: string }[] = [];

    for (const [userId, userProjectList] of userProjects) {
      const projectIds = userProjectList.map((p) => p.id);

      // Get tasks stats
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("status")
        .in("project_id", projectIds)
        .gte("created_at", oneWeekAgoISO);

      const tasksCompleted = tasks?.filter((t) => t.status === "Completed").length || 0;
      const tasksPending = tasks?.filter((t) => t.status !== "Completed").length || 0;

      // Get team members count
      const { data: members } = await supabase
        .from("project_members")
        .select("id")
        .in("project_id", projectIds);

      const teamMembersCount = members?.length || 0;

      // Get summaries with conflicts
      const { data: summaries } = await supabase
        .from("project_summaries")
        .select("photo_estimate, blueprint_analysis")
        .in("project_id", projectIds)
        .gte("created_at", oneWeekAgoISO);

      let conflictsDetected = 0;
      summaries?.forEach((summary) => {
        const photoData = summary.photo_estimate as any;
        const blueprintData = summary.blueprint_analysis as any;
        
        if (photoData?.area && blueprintData?.area) {
          const photoArea = parseFloat(photoData.area) || 0;
          const blueprintArea = parseFloat(blueprintData.area) || 0;
          const percentDiff = photoArea > 0 ? (Math.abs(photoArea - blueprintArea) / photoArea) * 100 : 0;
          if (percentDiff > 15) conflictsDetected++;
        }
      });

      const estimatesCreated = summaries?.length || 0;

      // Store report data
      reports.push({
        userId,
        email: "", // Would need to fetch from auth
        tier: "pro", // Default, would need Stripe check
        projectsCount: userProjectList.length,
        tasksCompleted,
        tasksPending,
        teamMembersCount,
        conflictsDetected,
        estimatesCreated,
      });

      // Prepare push notification for Premium users
      const reportSummary = `📊 Weekly Report: ${userProjectList.length} projects, ${tasksCompleted} tasks completed, ${conflictsDetected > 0 ? `⚠️ ${conflictsDetected} conflicts detected` : "no conflicts"}`;
      
      pushNotifications.push({
        userId,
        title: "📊 Your Weekly BuildUnion Report",
        body: reportSummary,
      });
    }

    // Send push notifications to all users with subscriptions
    for (const notification of pushNotifications) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: notification.title,
            body: notification.body,
            userIds: [notification.userId],
            data: { type: "weekly_report" },
          },
        });
      } catch (pushError) {
        console.error(`Failed to send push to ${notification.userId}:`, pushError);
      }
    }

    console.log(`Generated ${reports.length} weekly reports`);

    return new Response(
      JSON.stringify({
        message: "Weekly reports generated",
        reportsGenerated: reports.length,
        notificationsSent: pushNotifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in weekly-report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
