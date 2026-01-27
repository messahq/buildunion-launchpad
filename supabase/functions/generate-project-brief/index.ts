import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectBriefRequest {
  projectId: string;
  includeWeather?: boolean;
}

interface WeatherAlert {
  type: string;
  severity: "warning" | "danger" | "info";
  message: string;
}

interface WeatherData {
  temperature?: number;
  description?: string;
  alerts?: WeatherAlert[];
  forecast?: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    description: string;
  }>;
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
    const { projectId, includeWeather = true } = await req.json() as ProjectBriefRequest;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all project data in parallel
    const [
      projectResult,
      summaryResult,
      tasksResult,
      contractsResult,
      documentsResult,
      membersResult,
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("project_summaries").select("*").eq("project_id", projectId).maybeSingle(),
      supabase.from("project_tasks").select("*").eq("project_id", projectId),
      supabase.from("contracts").select("*").eq("project_id", projectId),
      supabase.from("project_documents").select("*").eq("project_id", projectId),
      supabase.from("project_members").select("*, profiles(full_name)").eq("project_id", projectId),
    ]);

    if (projectResult.error || !projectResult.data) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const project = projectResult.data;
    const summary = summaryResult.data;
    const tasks = tasksResult.data || [];
    const contracts = contractsResult.data || [];
    const documents = documentsResult.data || [];
    const members = membersResult.data || [];

    // Fetch weather data if project has an address
    let weatherData: WeatherData | null = null;
    if (includeWeather && project.address) {
      try {
        const weatherResponse = await supabase.functions.invoke("get-weather", {
          body: { address: project.address },
        });
        if (!weatherResponse.error && weatherResponse.data) {
          weatherData = weatherResponse.data;
        }
      } catch (weatherError) {
        console.warn("Weather fetch failed:", weatherError);
      }
    }

    // Parse AI analysis from summary
    const aiAnalysis = summary?.blueprint_analysis || {};
    const calculatorResults = summary?.calculator_results || {};
    const workflowConfig = summary?.ai_workflow_config || {};

    // Calculate task statistics
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      pending: tasks.filter(t => t.status === "pending").length,
    };

    // Calculate budget from tasks
    const totalBudget = tasks.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    const materialCost = summary?.material_cost || 0;
    const laborCost = summary?.labor_cost || 0;

    // Contract statistics
    const contractStats = {
      draft: contracts.filter(c => c.status === "draft").length,
      sent: contracts.filter(c => c.status === "sent").length,
      signed: contracts.filter(c => c.status === "signed").length,
    };

    // Build weather section for context
    let weatherSection = "";
    if (weatherData) {
      weatherSection = `
== WEATHER CONDITIONS & RISKS (17th Data Source) ==
Current Temperature: ${weatherData.temperature ?? "N/A"}°C
Current Conditions: ${weatherData.description || "N/A"}
`;
      if (weatherData.alerts && weatherData.alerts.length > 0) {
        weatherSection += `
⚠️ ACTIVE WEATHER ALERTS:
${weatherData.alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.type}: ${a.message}`).join("\n")}
`;
      } else {
        weatherSection += "Weather Alerts: None\n";
      }

      if (weatherData.forecast && weatherData.forecast.length > 0) {
        weatherSection += `
3-Day Forecast:
${weatherData.forecast.slice(0, 3).map(f => 
  `- ${f.date}: ${f.temp_min}°C to ${f.temp_max}°C, ${f.description}`
).join("\n")}
`;
      }
    }

    // Build comprehensive context for AI
    const projectContext = `
PROJECT DATA SUMMARY - ${weatherData ? "17" : "16"} DATA SOURCES

== PROJECT BASICS ==
Name: ${project.name}
Address: ${project.address || "Not specified"}
Trade: ${project.trade || "Not specified"}
Status: ${project.status}
Description: ${project.description || "No description"}
Created: ${project.created_at}

== 8 PILLARS OF OPERATIONAL TRUTH ==
1. Confirmed Area: ${aiAnalysis.area || "Not detected"} ${aiAnalysis.areaUnit || "sq ft"}
2. Materials Count: ${aiAnalysis.materials?.length || 0} items
3. Blueprint Status: ${aiAnalysis.hasBlueprint ? "Analyzed" : "None/Pending"}
4. OBC Compliance: ${workflowConfig.obcStatus || "Pending"}
5. Conflict Status: ${workflowConfig.conflictStatus || "Pending"}
6. Project Mode: ${summary?.mode || "solo"}
7. Project Size: ${workflowConfig.projectSize || "medium"}
8. AI Confidence: ${aiAnalysis.confidence || "Unknown"}

== TASK PROGRESS (Tab 2: Team & Tasks) ==
Total Tasks: ${taskStats.total}
Completed: ${taskStats.completed} (${taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%)
In Progress: ${taskStats.inProgress}
Pending: ${taskStats.pending}

== DOCUMENTS (Tab 3: Documents) ==
Uploaded Files: ${documents.length}
Document Types: ${[...new Set(documents.map(d => d.file_name.split('.').pop()))].join(", ") || "None"}

== CONTRACTS (Tab 4: Contracts) ==
Draft: ${contractStats.draft}
Sent to Client: ${contractStats.sent}
Signed: ${contractStats.signed}
Total Contracts: ${contracts.length}

== SITE MAP (Tab 5) ==
Address Available: ${project.address ? "Yes" : "No"}

== BUDGET BREAKDOWN (Tab 6: Materials) ==
Material Cost: $${materialCost.toLocaleString()} CAD
Labor Cost: $${laborCost.toLocaleString()} CAD
Total Project Cost: $${(summary?.total_cost || totalBudget).toLocaleString()} CAD
Task Budget Total: $${totalBudget.toLocaleString()} CAD

== TEAM (Tab 7: Team) ==
Team Members: ${members.length + 1} (including owner)
Roles: ${members.map(m => m.role).join(", ") || "Owner only"}

== CLIENT INFO ==
Client Name: ${summary?.client_name || "Not specified"}
Client Email: ${summary?.client_email || "Not specified"}
Client Phone: ${summary?.client_phone || "Not specified"}

== MATERIALS LIST ==
${aiAnalysis.materials?.map((m: any) => `- ${m.item}: ${m.quantity} ${m.unit}`).join("\n") || "No materials detected"}

== PROJECT TIMELINE ==
Start Date: ${summary?.project_start_date || "Not set"}
End Date: ${summary?.project_end_date || "Not set"}
${weatherSection}
`;

    // Generate AI Brief using Lovable AI
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiPrompt = `You are a professional construction project analyst for BuildUnion. Generate a comprehensive PROJECT BRIEF based on the following ${weatherData ? "17" : "16"} data sources.

${projectContext}

Generate a detailed project brief with the following sections in clean Markdown format:

## 📋 Executive Summary
(2-3 sentences summarizing the project status, key achievements, and overall health)

## 📊 Key Metrics
(Bullet points with the most important numbers: area, budget, completion %, team size, contracts)

## ✅ Current Status Assessment
(Detailed breakdown of:)
- Preparation Phase Progress
- Execution Phase Progress  
- Documentation Completeness
- Contract Status
- Team Coordination

## 🎯 Top Recommendations
(3-5 actionable next steps based on current project state)

## ⚠️ Risk Factors
(Potential issues or blockers to monitor, based on missing data or delays)
${weatherData && weatherData.alerts && weatherData.alerts.length > 0 ? "\n**IMPORTANT: Include weather-related risks prominently based on active weather alerts!**" : ""}

${weatherData ? `## 🌤️ Weather Impact Assessment
(Based on current conditions and forecast, assess:)
- Impact on outdoor work scheduling
- Any weather alerts that could delay progress
- Recommendations for weather-related planning
` : ""}

## 📅 Timeline Analysis
(Assessment of project timeline health and any scheduling concerns)

Keep the tone professional but accessible. Use Canadian English and CAD currency. Format for easy reading.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional construction project analyst. Generate clear, actionable project briefs." },
          { role: "user", content: aiPrompt },
        ],
        max_tokens: 2500,
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
    const briefContent = aiData.choices?.[0]?.message?.content || "Brief generation failed";

    // Return structured response
    const response = {
      success: true,
      brief: briefContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        projectName: project.name,
        dataSources: weatherData ? 17 : 16,
        taskCount: taskStats.total,
        completionRate: taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0,
        totalBudget: summary?.total_cost || totalBudget,
        contractCount: contracts.length,
        documentCount: documents.length,
        teamSize: members.length + 1,
        hasWeatherData: !!weatherData,
        weatherAlerts: weatherData?.alerts?.length || 0,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brief generation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
