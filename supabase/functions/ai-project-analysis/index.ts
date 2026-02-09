import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[AI-PROJECT-ANALYSIS] ${step}`, details ? JSON.stringify(details) : '');
};

// Model selection based on tier
const AI_MODELS = {
  GEMINI_PRO: "google/gemini-2.5-pro",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite",
  GPT5_MINI: "openai/gpt-5-mini",
} as const;

interface ModelConfig {
  primaryModel: string;
  validationModel: string | null;
  maxTokens: number;
  runDualEngine: boolean;
}

function getModelConfig(tier: 'free' | 'pro' | 'premium'): ModelConfig {
  if (tier === 'premium') {
    return {
      primaryModel: AI_MODELS.GEMINI_FLASH,
      validationModel: AI_MODELS.GPT5_MINI,
      maxTokens: 2000,
      runDualEngine: true,
    };
  } else if (tier === 'pro') {
    return {
      primaryModel: AI_MODELS.GEMINI_FLASH_LITE,
      validationModel: null,
      maxTokens: 1200,
      runDualEngine: false,
    };
  }
  return {
    primaryModel: AI_MODELS.GEMINI_FLASH_LITE,
    validationModel: null,
    maxTokens: 600,
    runDualEngine: false,
  };
}

interface AnalysisRequest {
  projectId: string;
  analysisType: 'full' | 'quick' | 'financial' | 'timeline' | 'risk';
  tier: 'free' | 'pro' | 'premium';
}

interface ProjectData {
  name: string;
  address: string;
  trade: string;
  gfa: number;
  teamSize: number;
  taskCount: number;
  completedTasks: number;
  startDate: string | null;
  endDate: string | null;
  materialCost: number;
  laborCost: number;
  totalBudget: number;
  hasContracts: boolean;
  documentCount: number;
}

async function callAI(model: string, prompt: string, maxTokens: number): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are an expert construction project analyst. Provide clear, actionable insights." },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

function buildAnalysisPrompt(projectData: ProjectData, analysisType: string): string {
  const progressPercent = projectData.taskCount > 0 
    ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) 
    : 0;

  const daysTotal = projectData.startDate && projectData.endDate
    ? Math.ceil((new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysElapsed = projectData.startDate
    ? Math.ceil((Date.now() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const baseContext = `
PROJECT: ${projectData.name}
LOCATION: ${projectData.address}
TRADE: ${projectData.trade}
GFA: ${projectData.gfa.toLocaleString()} sq ft

TEAM: ${projectData.teamSize} members
TASKS: ${projectData.completedTasks}/${projectData.taskCount} complete (${progressPercent}%)
TIMELINE: ${daysTotal ? `${daysElapsed}/${daysTotal} days` : 'Not set'}
${projectData.startDate ? `Start: ${projectData.startDate}` : ''}
${projectData.endDate ? `End: ${projectData.endDate}` : ''}

BUDGET:
- Materials: $${projectData.materialCost.toLocaleString()}
- Labor: $${projectData.laborCost.toLocaleString()}
- Total: $${projectData.totalBudget.toLocaleString()}
- Cost per sq ft: $${projectData.gfa > 0 ? (projectData.totalBudget / projectData.gfa).toFixed(2) : 'N/A'}

DOCUMENTS: ${projectData.documentCount} files
CONTRACTS: ${projectData.hasContracts ? 'Yes' : 'None'}
`;

  if (analysisType === 'financial') {
    return `${baseContext}

Analyze the financial health of this construction project. Provide:
1. Budget assessment (is the cost per sq ft reasonable for ${projectData.trade}?)
2. Cost breakdown analysis
3. Potential cost overrun risks
4. Recommendations for budget optimization
5. Cash flow considerations

Format as JSON with keys: healthScore (0-100), assessment, risks (array), recommendations (array).`;
  }

  if (analysisType === 'timeline') {
    return `${baseContext}

Analyze the project timeline and progress. Provide:
1. Schedule health assessment
2. Task completion rate analysis
3. Predicted completion date based on current pace
4. Bottleneck identification
5. Timeline optimization suggestions

Format as JSON with keys: scheduleHealth (on_track/at_risk/delayed), progressAnalysis, predictedCompletion, bottlenecks (array), recommendations (array).`;
  }

  if (analysisType === 'risk') {
    return `${baseContext}

Perform a risk assessment for this construction project. Identify:
1. High-priority risks
2. Medium-priority risks
3. Low-priority risks
4. Mitigation strategies
5. Overall risk score

Format as JSON with keys: overallRisk (low/medium/high), riskScore (0-100), highRisks (array), mediumRisks (array), lowRisks (array), mitigations (array).`;
  }

  // Full analysis
  return `${baseContext}

Provide a comprehensive project analysis including:

1. EXECUTIVE SUMMARY (2-3 sentences)
2. PROJECT HEALTH SCORE (0-100)
3. KEY METRICS:
   - Budget status (under/on/over budget)
   - Schedule status (ahead/on/behind schedule)
   - Resource utilization
4. TOP 3 STRENGTHS
5. TOP 3 AREAS FOR IMPROVEMENT
6. IMMEDIATE ACTION ITEMS (max 5)
7. 30-DAY OUTLOOK

Format as JSON with appropriate keys.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id });

    const body: AnalysisRequest = await req.json();
    const { projectId, analysisType = 'full', tier = 'free' } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project data
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify access
    const isOwner = project.user_id === user.id;
    const { data: membership } = await supabaseClient
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isOwner && !membership) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch related data
    const [summaryRes, membersRes, tasksRes, documentsRes, contractsRes] = await Promise.all([
      supabaseClient.from("project_summaries").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from("project_members").select("id").eq("project_id", projectId),
      supabaseClient.from("project_tasks").select("id, status").eq("project_id", projectId).is("archived_at", null),
      supabaseClient.from("project_documents").select("id").eq("project_id", projectId),
      supabaseClient.from("contracts").select("id").eq("project_id", projectId).is("archived_at", null),
    ]);

    const summary = summaryRes.data;
    const verifiedFacts = (summary?.verified_facts as any[]) || [];
    
    const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
    const gfa = gfaCitation?.metadata?.gfa_value || gfaCitation?.value || 0;

    const tasks = tasksRes.data || [];
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;

    const projectData: ProjectData = {
      name: project.name,
      address: project.address || '',
      trade: project.trade || 'General',
      gfa: typeof gfa === 'number' ? gfa : 0,
      teamSize: (membersRes.data?.length || 0) + 1, // +1 for owner
      taskCount: tasks.length,
      completedTasks,
      startDate: summary?.project_start_date || null,
      endDate: summary?.project_end_date || null,
      materialCost: summary?.material_cost || 0,
      laborCost: summary?.labor_cost || 0,
      totalBudget: summary?.total_cost || 0,
      hasContracts: (contractsRes.data?.length || 0) > 0,
      documentCount: documentsRes.data?.length || 0,
    };

    logStep("Project data gathered", { 
      gfa: projectData.gfa, 
      tasks: projectData.taskCount,
      budget: projectData.totalBudget 
    });

    // Get model config based on tier
    const modelConfig = getModelConfig(tier);
    logStep("Model config", { tier, model: modelConfig.primaryModel, dualEngine: modelConfig.runDualEngine });

    // Generate analysis prompt
    const prompt = buildAnalysisPrompt(projectData, analysisType);

    // Call primary AI model
    const primaryResult = await callAI(modelConfig.primaryModel, prompt, modelConfig.maxTokens);
    logStep("Primary AI response received", { length: primaryResult.length });

    let validationResult = null;
    if (modelConfig.runDualEngine && modelConfig.validationModel) {
      try {
        const validationPrompt = `Review and validate this construction project analysis. Flag any concerns or discrepancies:

ORIGINAL ANALYSIS:
${primaryResult}

PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

Provide validation as JSON with keys: validated (boolean), confidence (0-100), concerns (array), corrections (array).`;

        validationResult = await callAI(modelConfig.validationModel, validationPrompt, 600);
        logStep("Validation response received");
      } catch (validationError) {
        logStep("Validation failed, continuing with primary result", { error: String(validationError) });
      }
    }

    // Parse and structure the response
    let analysis: Record<string, unknown>;
    try {
      // Try to extract JSON from the response
      const jsonMatch = primaryResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = { rawAnalysis: primaryResult };
      }
    } catch {
      analysis = { rawAnalysis: primaryResult };
    }

    // Add metadata
    const response = {
      projectId,
      analysisType,
      tier,
      generatedAt: new Date().toISOString(),
      model: modelConfig.primaryModel,
      dualEngineUsed: modelConfig.runDualEngine && validationResult !== null,
      analysis,
      validation: validationResult ? (() => {
        try {
          const jsonMatch = validationResult.match(/\{[\s\S]*\}/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          return null;
        }
      })() : null,
      projectSnapshot: {
        name: projectData.name,
        gfa: projectData.gfa,
        teamSize: projectData.teamSize,
        progress: projectData.taskCount > 0 ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) : 0,
        budget: projectData.totalBudget,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes("Rate limit") ? 429 : error.message.includes("credits") ? 402 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
