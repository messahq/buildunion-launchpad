import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamReportRequest {
  projectId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { projectId } = await req.json() as TeamReportRequest;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project and team data
    const [
      projectResult,
      membersResult,
      tasksResult,
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("project_members").select("*, bu_profiles(*)").eq("project_id", projectId),
      supabase.from("project_tasks").select("*").eq("project_id", projectId),
    ]);

    if (projectResult.error || !projectResult.data) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const project = projectResult.data;
    const members = membersResult.data || [];
    const tasks = tasksResult.data || [];

    // Calculate member statistics
    const memberStats = members.map(member => {
      const memberTasks = tasks.filter(t => t.assigned_to === member.user_id);
      const completed = memberTasks.filter(t => t.status === "completed").length;
      const inProgress = memberTasks.filter(t => t.status === "in_progress").length;
      const pending = memberTasks.filter(t => t.status === "pending").length;
      const totalCost = memberTasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
      
      return {
        userId: member.user_id,
        role: member.role,
        name: member.bu_profiles?.company_name || member.bu_profiles?.bio?.substring(0, 30) || "Team Member",
        trade: member.bu_profiles?.primary_trade || "general",
        tasksTotal: memberTasks.length,
        tasksCompleted: completed,
        tasksInProgress: inProgress,
        tasksPending: pending,
        completionRate: memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0,
        totalBudget: totalCost,
        joinedAt: member.joined_at,
      };
    });

    // Overall statistics
    const overallStats = {
      totalMembers: members.length + 1, // +1 for owner
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === "completed").length,
      inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
      pendingTasks: tasks.filter(t => t.status === "pending").length,
      totalBudget: tasks.reduce((sum, t) => sum + (t.total_cost || 0), 0),
      roleBreakdown: members.reduce((acc: Record<string, number>, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      }, {}),
    };

    // Build context for AI
    const teamContext = `
PROJECT TEAM REPORT DATA

== PROJECT INFO ==
Name: ${project.name}
Address: ${project.address || "Not specified"}
Trade: ${project.trade || "General"}
Status: ${project.status}

== TEAM OVERVIEW ==
Total Members: ${overallStats.totalMembers}
Roles: ${Object.entries(overallStats.roleBreakdown).map(([role, count]) => `${role}: ${count}`).join(", ") || "Owner only"}

== OVERALL TASK METRICS ==
Total Tasks: ${overallStats.totalTasks}
Completed: ${overallStats.completedTasks} (${overallStats.totalTasks > 0 ? Math.round((overallStats.completedTasks / overallStats.totalTasks) * 100) : 0}%)
In Progress: ${overallStats.inProgressTasks}
Pending: ${overallStats.pendingTasks}
Total Budget: $${overallStats.totalBudget.toLocaleString()} CAD

== INDIVIDUAL MEMBER PERFORMANCE ==
${memberStats.map(m => `
Member: ${m.name}
- Role: ${m.role}
- Trade: ${m.trade}
- Tasks: ${m.tasksCompleted}/${m.tasksTotal} completed (${m.completionRate}%)
- Budget Responsibility: $${m.totalBudget.toLocaleString()} CAD
- Joined: ${new Date(m.joinedAt).toLocaleDateString()}
`).join("\n")}

== UNASSIGNED TASKS ==
Count: ${tasks.filter(t => !members.some(m => m.user_id === t.assigned_to)).length}
`;

    // Generate AI report
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiPrompt = `You are a construction team performance analyst. Generate a comprehensive TEAM REPORT based on the following data.

${teamContext}

Generate a detailed team report with the following sections in clean Markdown format:

## 👥 Team Overview
(Summary of team composition, roles, and capacity)

## 📊 Performance Metrics
(Key performance indicators for the team as a whole)

## 🏆 Top Performers
(Highlight members with highest completion rates or significant contributions)

## ⚠️ Attention Areas
(Members who may need support, unbalanced workloads, or bottlenecks)

## 📋 Task Distribution Analysis
(How work is distributed across the team, any imbalances)

## 💡 Recommendations
(Actionable suggestions for improving team efficiency)

## 📈 Workload Balance
(Assessment of fair task distribution and capacity utilization)

Keep the tone professional and constructive. Use Canadian English and CAD currency.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional construction team performance analyst. Generate clear, actionable team reports." },
          { role: "user", content: aiPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI Error:", await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices?.[0]?.message?.content || "Report generation failed";

    // Return structured response
    const response = {
      success: true,
      report: reportContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        projectName: project.name,
        teamSize: overallStats.totalMembers,
        totalTasks: overallStats.totalTasks,
        completionRate: overallStats.totalTasks > 0 ? Math.round((overallStats.completedTasks / overallStats.totalTasks) * 100) : 0,
        totalBudget: overallStats.totalBudget,
      },
      memberStats,
      overallStats,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Team report generation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});