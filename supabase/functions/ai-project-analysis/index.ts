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

// ============================================
// GRAND DUAL ENGINE ARCHITECTURE
// Gemini = Visual Analysis (Site Photos, Blueprints)
// OpenAI = OBC Validation (Ontario Building Code Compliance)
// ============================================

const AI_MODELS = {
  // Gemini - Visual/Multimodal Analysis
  GEMINI_PRO: "google/gemini-2.5-pro",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite",
  // OpenAI - OBC/Building Code Validation
  GPT5: "openai/gpt-5",
  GPT5_MINI: "openai/gpt-5-mini",
  GPT5_NANO: "openai/gpt-5-nano",
} as const;

interface DualEngineConfig {
  visualModel: string;      // Gemini for visual analysis
  obcModel: string | null;  // OpenAI for building code validation
  visualTokens: number;
  obcTokens: number;
  runDualEngine: boolean;
}

function getDualEngineConfig(tier: 'free' | 'pro' | 'premium'): DualEngineConfig {
  if (tier === 'premium') {
    return {
      visualModel: AI_MODELS.GEMINI_FLASH,
      obcModel: AI_MODELS.GPT5_MINI,
      visualTokens: 2000,
      obcTokens: 1500,
      runDualEngine: true,
    };
  } else if (tier === 'pro') {
    return {
      visualModel: AI_MODELS.GEMINI_FLASH_LITE,
      obcModel: AI_MODELS.GPT5_NANO,
      visualTokens: 1200,
      obcTokens: 800,
      runDualEngine: true,
    };
  }
  // Free tier - single engine only
  return {
    visualModel: AI_MODELS.GEMINI_FLASH_LITE,
    obcModel: null,
    visualTokens: 600,
    obcTokens: 0,
    runDualEngine: false,
  };
}

interface AnalysisRequest {
  projectId: string;
  analysisType: 'full' | 'quick' | 'financial' | 'timeline' | 'risk' | 'obc' | 'visual';
  tier: 'free' | 'pro' | 'premium';
  region?: string; // For OBC regional codes (Ontario, Quebec, etc.)
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
  sitePhotos: string[];
  blueprints: string[];
  region: string;
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

// ============================================
// GEMINI - VISUAL ANALYSIS PROMPT
// ============================================
function buildVisualAnalysisPrompt(projectData: ProjectData): string {
  return `
VISUAL SITE ANALYSIS - Construction Project Assessment

PROJECT: ${projectData.name}
LOCATION: ${projectData.address}
TRADE: ${projectData.trade}
GFA: ${projectData.gfa.toLocaleString()} sq ft

SITE PHOTOS: ${projectData.sitePhotos.length} available
BLUEPRINTS: ${projectData.blueprints.length} available

Analyze the visual elements of this construction project:

1. SITE CONDITION ASSESSMENT
   - Current state of the work area
   - Visible progress indicators
   - Safety concerns visible in photos

2. MATERIAL VERIFICATION
   - Materials visible on-site
   - Storage conditions
   - Quantity estimation from visuals

3. WORK QUALITY INDICATORS
   - Craftsmanship quality visible
   - Alignment and finishing details
   - Potential defects or concerns

4. PROGRESS TRACKING
   - Completed phases visible
   - Work in progress areas
   - Areas not yet started

5. SAFETY OBSERVATIONS
   - PPE compliance visible
   - Hazard identification
   - Site organization

Format as JSON with keys: siteCondition, materialStatus, qualityScore (0-100), progressPercent, safetyFlags (array), recommendations (array).`;
}

// ============================================
// OPENAI - OBC BUILDING CODE VALIDATION
// ============================================
function buildOBCValidationPrompt(projectData: ProjectData): string {
  const regionCodes: Record<string, string> = {
    'ontario': 'Ontario Building Code (OBC) 2024',
    'quebec': 'Quebec Construction Code (CCQ)',
    'bc': 'BC Building Code 2024',
    'alberta': 'Alberta Building Code 2019',
    'default': 'National Building Code of Canada 2020',
  };
  
  const applicableCode = regionCodes[projectData.region.toLowerCase()] || regionCodes.default;
  
  return `
BUILDING CODE COMPLIANCE VALIDATION

PROJECT: ${projectData.name}
LOCATION: ${projectData.address}
REGION: ${projectData.region}
APPLICABLE CODE: ${applicableCode}
TRADE: ${projectData.trade}
GFA: ${projectData.gfa.toLocaleString()} sq ft

TEAM SIZE: ${projectData.teamSize} workers
TIMELINE: ${projectData.startDate || 'Not set'} to ${projectData.endDate || 'Not set'}

Validate this construction project against ${applicableCode}:

1. PERMIT REQUIREMENTS
   - Required permits for ${projectData.trade} work
   - Inspection milestones
   - Documentation requirements

2. STRUCTURAL COMPLIANCE
   - Load-bearing considerations for ${projectData.gfa} sq ft
   - Fire separation requirements
   - Egress requirements

3. TRADE-SPECIFIC CODES
   - ${projectData.trade}-specific code sections
   - Material specifications required
   - Installation standards

4. SAFETY REQUIREMENTS
   - Worker safety regulations (OHSA for Ontario)
   - Fall protection requirements
   - PPE mandates

5. INSPECTION CHECKPOINTS
   - Pre-construction inspections
   - Rough-in inspections
   - Final inspection requirements

6. DOCUMENTATION GAPS
   - Missing permits or approvals
   - Required certifications
   - Record-keeping requirements

Format as JSON with keys: permitStatus (compliant/pending/missing), structuralFlags (array), tradeCompliance (object), safetyRequirements (array), inspectionSchedule (array), documentationGaps (array), overallCompliance (percentage 0-100), criticalIssues (array).`;
}

// ============================================
// FULL ANALYSIS PROMPT
// ============================================
function buildFullAnalysisPrompt(projectData: ProjectData): string {
  const progressPercent = projectData.taskCount > 0 
    ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) 
    : 0;

  const daysTotal = projectData.startDate && projectData.endDate
    ? Math.ceil((new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysElapsed = projectData.startDate
    ? Math.ceil((Date.now() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return `
COMPREHENSIVE PROJECT ANALYSIS

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

Provide a comprehensive project analysis:

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
    const { projectId, analysisType = 'full', tier = 'free', region = 'ontario' } = body;

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

    // Fetch related data including documents for visual analysis
    const [summaryRes, membersRes, tasksRes, documentsRes, contractsRes] = await Promise.all([
      supabaseClient.from("project_summaries").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseClient.from("project_members").select("id").eq("project_id", projectId),
      supabaseClient.from("project_tasks").select("id, status").eq("project_id", projectId).is("archived_at", null),
      supabaseClient.from("project_documents").select("id, file_name, file_path").eq("project_id", projectId),
      supabaseClient.from("contracts").select("id").eq("project_id", projectId).is("archived_at", null),
    ]);

    const summary = summaryRes.data;
    const verifiedFacts = (summary?.verified_facts as any[]) || [];
    
    const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
    const gfa = gfaCitation?.metadata?.gfa_value || gfaCitation?.value || 0;

    // Extract site photos and blueprints from documents
    const documents = documentsRes.data || [];
    const sitePhotos = documents
      .filter((d: any) => d.file_name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i))
      .map((d: any) => d.file_path);
    const blueprints = documents
      .filter((d: any) => d.file_name.match(/\.(pdf|dwg|dxf)$/i) || d.file_name.toLowerCase().includes('blueprint'))
      .map((d: any) => d.file_path);

    // Detect region from address
    const addressLower = (project.address || '').toLowerCase();
    let detectedRegion = region;
    if (addressLower.includes('ontario') || addressLower.includes(', on')) detectedRegion = 'ontario';
    else if (addressLower.includes('quebec') || addressLower.includes(', qc')) detectedRegion = 'quebec';
    else if (addressLower.includes('british columbia') || addressLower.includes(', bc')) detectedRegion = 'bc';
    else if (addressLower.includes('alberta') || addressLower.includes(', ab')) detectedRegion = 'alberta';

    const tasks = tasksRes.data || [];
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;

    const projectData: ProjectData = {
      name: project.name,
      address: project.address || '',
      trade: project.trade || 'General',
      gfa: typeof gfa === 'number' ? gfa : 0,
      teamSize: (membersRes.data?.length || 0) + 1,
      taskCount: tasks.length,
      completedTasks,
      startDate: summary?.project_start_date || null,
      endDate: summary?.project_end_date || null,
      materialCost: summary?.material_cost || 0,
      laborCost: summary?.labor_cost || 0,
      totalBudget: summary?.total_cost || 0,
      hasContracts: (contractsRes.data?.length || 0) > 0,
      documentCount: documents.length,
      sitePhotos,
      blueprints,
      region: detectedRegion,
    };

    logStep("Project data gathered", { 
      gfa: projectData.gfa, 
      tasks: projectData.taskCount,
      budget: projectData.totalBudget,
      sitePhotos: sitePhotos.length,
      blueprints: blueprints.length,
      region: detectedRegion,
    });

    // ============================================
    // GRAND DUAL ENGINE EXECUTION
    // ============================================
    const engineConfig = getDualEngineConfig(tier);
    logStep("Dual Engine config", { 
      tier, 
      visualModel: engineConfig.visualModel, 
      obcModel: engineConfig.obcModel,
      runDualEngine: engineConfig.runDualEngine,
    });

    let visualAnalysis: Record<string, unknown> | null = null;
    let obcValidation: Record<string, unknown> | null = null;

    // STEP 1: Gemini Visual Analysis (always runs)
    const visualPrompt = analysisType === 'visual' 
      ? buildVisualAnalysisPrompt(projectData)
      : buildFullAnalysisPrompt(projectData);
    
    const visualResult = await callAI(engineConfig.visualModel, visualPrompt, engineConfig.visualTokens);
    logStep("Gemini Visual Analysis complete", { length: visualResult.length });

    try {
      const jsonMatch = visualResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        visualAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        visualAnalysis = { rawAnalysis: visualResult };
      }
    } catch {
      visualAnalysis = { rawAnalysis: visualResult };
    }

    // STEP 2: OpenAI OBC Validation (Pro/Premium only)
    if (engineConfig.runDualEngine && engineConfig.obcModel) {
      try {
        const obcPrompt = buildOBCValidationPrompt(projectData);
        const obcResult = await callAI(engineConfig.obcModel, obcPrompt, engineConfig.obcTokens);
        logStep("OpenAI OBC Validation complete", { length: obcResult.length });

        try {
          const jsonMatch = obcResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            obcValidation = JSON.parse(jsonMatch[0]);
          } else {
            obcValidation = { rawValidation: obcResult };
          }
        } catch {
          obcValidation = { rawValidation: obcResult };
        }
      } catch (obcError) {
        logStep("OBC Validation failed, continuing without", { error: String(obcError) });
      }
    }

    // ============================================
    // BUILD UNIFIED RESPONSE
    // ============================================
    const response = {
      projectId,
      analysisType,
      tier,
      generatedAt: new Date().toISOString(),
      dualEngineUsed: engineConfig.runDualEngine && obcValidation !== null,
      engines: {
        visual: {
          model: engineConfig.visualModel,
          provider: 'gemini',
          analysis: visualAnalysis,
        },
        obc: engineConfig.runDualEngine ? {
          model: engineConfig.obcModel,
          provider: 'openai',
          region: detectedRegion,
          validation: obcValidation,
        } : null,
      },
      projectSnapshot: {
        name: projectData.name,
        gfa: projectData.gfa,
        teamSize: projectData.teamSize,
        progress: projectData.taskCount > 0 ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) : 0,
        budget: projectData.totalBudget,
        sitePhotos: sitePhotos.length,
        blueprints: blueprints.length,
        region: detectedRegion,
      },
      // Merged analysis for backward compatibility
      analysis: {
        ...visualAnalysis,
        obcCompliance: obcValidation,
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
