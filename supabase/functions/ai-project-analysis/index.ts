import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ============================================
// SERVER-SIDE TIER RESOLUTION VIA STRIPE
// Never trust client-sent tier parameter
// ============================================
const PRODUCT_TIERS: Record<string, string> = {
  "prod_Tog02cwkocBGA0": "pro",
  "prod_Tog0mYcKDEXUfl": "premium",
  "prod_Tog7TlfoWskDXG": "pro",
  "prod_Tog8IdlcfqOduT": "premium",
};

async function resolveUserTier(userEmail: string): Promise<'free' | 'pro' | 'premium'> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("STRIPE_SECRET_KEY not set, defaulting to free tier");
    return 'free';
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) return 'free';

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 1,
    });

    const validSub = subscriptions.data.find((s: Stripe.Subscription) => 
      s.status === "active" || s.status === "trialing"
    );

    if (!validSub) return 'free';

    const productId = validSub.items.data[0].price.product as string;
    const tier = PRODUCT_TIERS[productId];
    logStep("Stripe tier resolved", { productId, tier });
    return (tier as 'pro' | 'premium') || 'free';
  } catch (err) {
    logStep("Stripe tier resolution failed, defaulting to free", { error: String(err) });
    return 'free';
  }
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[M.E.S.S.A. SYNTHESIS] ${step}`, details ? JSON.stringify(details) : '');
};

// ============================================
// M.E.S.S.A. GRAND DUAL ENGINE ARCHITECTURE
// Multi-Engine Synthesis & Structured Analysis
// 
// Gemini 2.5 Pro = Visual Analysis + Site Assessment
// OpenAI GPT-5 = Building Code + Regulatory Validation
// ============================================

const AI_MODELS = {
  // TOP TIER - Maximum Quality
  GEMINI_PRO: "google/gemini-2.5-pro",
  GPT5: "openai/gpt-5",
  // HIGH TIER
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GPT5_MINI: "openai/gpt-5-mini",
  // STANDARD TIER
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite",
  GPT5_NANO: "openai/gpt-5-nano",
} as const;

interface DualEngineConfig {
  geminiModel: string;
  openaiModel: string;
  geminiTokens: number;
  openaiTokens: number;
  runDualEngine: boolean;
  synthesisVersion: string;
}

// M.E.S.S.A. Synthesis uses TOP models for maximum quality
function getDualEngineConfig(tier: 'free' | 'pro' | 'premium' | 'messa'): DualEngineConfig {
  if (tier === 'messa' || tier === 'premium') {
    // M.E.S.S.A. SYNTHESIS - Maximum power
    return {
      geminiModel: AI_MODELS.GEMINI_PRO,    // Best Gemini
      openaiModel: AI_MODELS.GPT5,           // Best OpenAI
      geminiTokens: 4000,
      openaiTokens: 4000,
      runDualEngine: true,
      synthesisVersion: 'M.E.S.S.A. v3.0',
    };
  } else if (tier === 'pro') {
    return {
      geminiModel: AI_MODELS.GEMINI_FLASH,
      openaiModel: AI_MODELS.GPT5_MINI,
      geminiTokens: 2000,
      openaiTokens: 1500,
      runDualEngine: true,
      synthesisVersion: 'M.E.S.S.A. v2.0',
    };
  }
  // Free tier
  return {
    geminiModel: AI_MODELS.GEMINI_FLASH_LITE,
    openaiModel: AI_MODELS.GPT5_NANO,
    geminiTokens: 1000,
    openaiTokens: 800,
    runDualEngine: false,
    synthesisVersion: 'M.E.S.S.A. v1.0',
  };
}

interface AnalysisRequest {
  projectId: string;
  analysisType: 'full' | 'quick' | 'synthesis' | 'obc' | 'visual';
  tier: 'free' | 'pro' | 'premium' | 'messa';
  region?: string;
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
  citations: any[];
}

async function callAI(model: string, messages: Array<{role: string; content: any}>, maxTokens: number): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  logStep(`Calling ${model}`, { tokens: maxTokens });

  const isOpenAI = model.includes('openai');
  const tokenParam = isOpenAI ? 'max_completion_tokens' : 'max_tokens';

  const requestBody: Record<string, any> = {
    model,
    messages,
  };
  requestBody[tokenParam] = maxTokens;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits.");
    }
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

// ============================================
// IMAGE FETCHING - Download from Storage as base64
// ============================================
async function fetchImageAsBase64(filePath: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const { data, error } = await supabaseClient.storage
      .from('project-documents')
      .download(filePath);

    if (error || !data) {
      logStep('Failed to download image', { filePath, error: error?.message });
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    // Detect mime type from extension
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'heic': 'image/heic',
    };
    const mimeType = mimeMap[ext] || 'image/jpeg';

    logStep('Image fetched successfully', { filePath, sizeKB: Math.round(uint8.length / 1024) });
    return { base64, mimeType };
  } catch (err) {
    logStep('Image fetch error', { filePath, error: String(err) });
    return null;
  }
}

async function fetchProjectImages(filePaths: string[], maxImages: number = 5): Promise<Array<{ base64: string; mimeType: string; fileName: string }>> {
  const results: Array<{ base64: string; mimeType: string; fileName: string }> = [];
  const pathsToFetch = filePaths.slice(0, maxImages);

  for (const filePath of pathsToFetch) {
    const img = await fetchImageAsBase64(filePath);
    if (img) {
      // Skip images larger than 4MB base64 (roughly 3MB actual)
      if (img.base64.length > 4 * 1024 * 1024) {
        logStep('Image too large, skipping', { filePath });
        continue;
      }
      results.push({ ...img, fileName: filePath.split('/').pop() || filePath });
    }
  }

  logStep('Images fetched for visual analysis', { count: results.length, requested: pathsToFetch.length });
  return results;
}

// ============================================
// BUILD MULTIMODAL GEMINI MESSAGE
// ============================================
function buildMultimodalMessage(
  textPrompt: string,
  images: Array<{ base64: string; mimeType: string; fileName: string }>
): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Add text prompt first
  parts.push({ type: "text", text: textPrompt });

  // Add each image
  for (const img of images) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    });
    parts.push({
      type: "text",
      text: `[Image: ${img.fileName}]`,
    });
  }

  return parts;
}

// ============================================
// GEMINI - Visual & Site Assessment Engine
// ============================================
function buildGeminiSynthesisPrompt(projectData: ProjectData, hasImages: boolean): string {
  const progressPercent = projectData.taskCount > 0 
    ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) 
    : 0;

  const visualInstructions = hasImages ? `

### CRITICAL: VISUAL IMAGE ANALYSIS
You have been provided with actual project images (blueprints and/or site photos).
**YOU MUST analyze each image in detail.** For each image:

**For BLUEPRINTS:**
- Identify the type of drawing (floor plan, elevation, section, detail)
- Read and report any dimensions, room labels, annotations visible
- Estimate the total area from the floor plan if dimensions are readable
- Identify structural elements (walls, columns, beams, foundations)
- Note any mechanical/electrical/plumbing (MEP) routing shown
- Flag any code compliance concerns visible in the design
- Identify the scale if noted on the drawing

**For SITE PHOTOS:**
- Describe exactly what you see: construction stage, materials present, work in progress
- Identify safety hazards (missing PPE, fall risks, improper scaffolding, exposed wiring)
- Assess workmanship quality (level walls, proper joints, clean work area)
- Note material storage conditions (covered, organized, weather-protected)
- Identify the trade work visible (framing, electrical, plumbing, concrete, etc.)
- Estimate completion percentage of visible work
- Flag any building code violations visible

Include your visual findings in the "visualAnalysis" field of your JSON response.
` : `
### NOTE: No project images were available for visual analysis.
Provide assessment based on project data only. Set visualAnalysis.imagesAnalyzed to 0.
`;

  return `
# M.E.S.S.A. VISUAL SYNTHESIS ENGINE
## Multi-Engine Synthesis & Structured Analysis

### PROJECT OVERVIEW
- **Name:** ${projectData.name}
- **Location:** ${projectData.address}
- **Trade:** ${projectData.trade}
- **GFA:** ${projectData.gfa.toLocaleString()} sq ft
- **Region:** ${projectData.region}

### PROJECT METRICS
- **Team Size:** ${projectData.teamSize} members
- **Task Progress:** ${projectData.completedTasks}/${projectData.taskCount} (${progressPercent}%)
- **Documents:** ${projectData.documentCount} files
- **Site Photos:** ${projectData.sitePhotos.length} available
- **Blueprints:** ${projectData.blueprints.length} available
- **Contracts:** ${projectData.hasContracts ? 'Active' : 'None'}

### FINANCIAL OVERVIEW
- **Materials Budget:** $${projectData.materialCost.toLocaleString()}
- **Labor Budget:** $${projectData.laborCost.toLocaleString()}
- **Total Budget:** $${projectData.totalBudget.toLocaleString()}
- **Cost per sq ft:** $${projectData.gfa > 0 ? (projectData.totalBudget / projectData.gfa).toFixed(2) : 'N/A'}

### TIMELINE
- **Start Date:** ${projectData.startDate || 'Not set'}
- **End Date:** ${projectData.endDate || 'Not set'}
${visualInstructions}
---

## ANALYSIS REQUIREMENTS

Provide a comprehensive VISUAL & SITE ASSESSMENT covering:

### 1. EXECUTIVE SUMMARY (3-4 sentences)
Synthesize the project state in clear, professional language suitable for stakeholder reporting.

### 2. PROJECT HEALTH SCORE
Calculate a 0-100 score based on:
- Budget utilization efficiency
- Timeline adherence
- Team resource allocation
- Documentation completeness
- Visual verification status

### 3. SITE CONDITION ASSESSMENT
Based on available photos and documentation:
- Current site state analysis
- Material storage & handling
- Safety compliance indicators
- Work quality observations

### 4. PROGRESS ANALYSIS
- Completed phases identification
- Active work areas
- Pending milestones
- Critical path items

### 5. VISUAL VERIFICATION STATUS
- Documentation gaps
- Photo evidence completeness
- Verification checklist status

### 6. RECOMMENDATIONS
Top 5 actionable recommendations for project optimization.

### 7. 30-DAY FORECAST
Project trajectory and expected milestones.

---

Format your response as valid JSON with the following structure:
{
  "executiveSummary": "string",
  "healthScore": number,
  "healthGrade": "Excellent|Good|Fair|Needs Attention|Critical",
  "visualAnalysis": {
    "imagesAnalyzed": number,
    "blueprintFindings": [{"fileName": "string", "type": "string", "dimensions": "string", "observations": ["array"], "codeFlags": ["array"]}],
    "sitePhotoFindings": [{"fileName": "string", "stage": "string", "tradesVisible": ["array"], "safetyIssues": ["array"], "qualityScore": number, "observations": ["array"]}],
    "overallVisualScore": number,
    "criticalVisualFlags": ["array"]
  },
  "siteCondition": {
    "status": "string",
    "observations": ["array"],
    "safetyScore": number
  },
  "progressAnalysis": {
    "overallProgress": number,
    "phasesComplete": ["array"],
    "activePhases": ["array"],
    "criticalItems": ["array"]
  },
  "verificationStatus": {
    "documentsReviewed": number,
    "gapsIdentified": ["array"],
    "completeness": number
  },
  "recommendations": ["array of 5 items"],
  "forecast30Day": {
    "projectedProgress": number,
    "keyMilestones": ["array"],
    "riskFactors": ["array"]
  }
}`;
}

// ============================================
// OPENAI - Building Code & Regulatory Engine
// ============================================
function buildOpenAISynthesisPrompt(projectData: ProjectData): string {
  const regionCodes: Record<string, { code: string; authority: string }> = {
    'ontario': { code: 'Ontario Building Code (OBC) 2024', authority: 'Ministry of Municipal Affairs and Housing' },
    'quebec': { code: 'Quebec Construction Code (CCQ)', authority: 'Régie du bâtiment du Québec' },
    'bc': { code: 'BC Building Code 2024', authority: 'BC Housing' },
    'alberta': { code: 'Alberta Building Code 2019', authority: 'Alberta Municipal Affairs' },
    'default': { code: 'National Building Code of Canada 2020', authority: 'National Research Council Canada' },
  };
  
  const regionInfo = regionCodes[projectData.region.toLowerCase()] || regionCodes.default;

  return `
# M.E.S.S.A. REGULATORY SYNTHESIS ENGINE
## Building Code & Compliance Validation

### PROJECT IDENTIFICATION
- **Project:** ${projectData.name}
- **Location:** ${projectData.address}
- **Region:** ${projectData.region}
- **Trade Category:** ${projectData.trade}
- **Gross Floor Area:** ${projectData.gfa.toLocaleString()} sq ft

### APPLICABLE REGULATIONS
- **Building Code:** ${regionInfo.code}
- **Authority:** ${regionInfo.authority}
- **Trade-Specific Standards:** ${projectData.trade} installation codes

### PROJECT PARAMETERS
- **Team Size:** ${projectData.teamSize} workers
- **Timeline:** ${projectData.startDate || 'Not set'} to ${projectData.endDate || 'Not set'}
- **Budget:** $${projectData.totalBudget.toLocaleString()}
- **Contracts:** ${projectData.hasContracts ? 'Active' : 'None'}

---

## VALIDATION REQUIREMENTS

Provide a comprehensive REGULATORY & COMPLIANCE assessment:

### 1. PERMIT STATUS ANALYSIS
- Required permits for ${projectData.trade} work in ${projectData.region}
- Typical permit timelines
- Required inspections

### 2. CODE COMPLIANCE CHECKLIST
- Structural requirements for ${projectData.gfa} sq ft
- Fire safety requirements
- Accessibility (AODA/barrier-free) requirements
- Energy efficiency standards

### 3. TRADE-SPECIFIC REGULATIONS
- ${projectData.trade} installation standards
- Material specifications required by code
- Workmanship standards

### 4. SAFETY COMPLIANCE (OHSA)
- Worker safety requirements
- PPE mandates
- Fall protection thresholds
- WHMIS requirements

### 5. INSPECTION SCHEDULE
- Pre-construction requirements
- Rough-in inspection points
- Final inspection checklist

### 6. DOCUMENTATION REQUIREMENTS
- Required permits list
- Certificates needed
- Record-keeping mandates

### 7. COMPLIANCE RISK ASSESSMENT
Overall compliance score and identified gaps.

---

Format your response as valid JSON with the following structure:
{
  "permitStatus": {
    "required": ["array of permits"],
    "timeline": "string",
    "inspections": ["array"]
  },
  "codeCompliance": {
    "structural": { "status": "Compliant|Review Required|Non-Compliant", "notes": "string" },
    "fireSafety": { "status": "string", "notes": "string" },
    "accessibility": { "status": "string", "notes": "string" },
    "energy": { "status": "string", "notes": "string" }
  },
  "tradeRegulations": {
    "standards": ["array"],
    "materialSpecs": ["array"],
    "workmanship": ["array"]
  },
  "safetyCompliance": {
    "ohsaRequirements": ["array"],
    "ppeRequired": ["array"],
    "trainingRequired": ["array"]
  },
  "inspectionSchedule": ["array of inspection milestones"],
  "documentationRequired": ["array of required documents"],
  "complianceScore": number,
  "riskLevel": "Low|Medium|High|Critical",
  "identifiedGaps": ["array of gaps to address"],
  "recommendations": ["array of 5 compliance recommendations"]
}`;
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
    const { projectId, analysisType = 'synthesis', region = 'ontario' } = body;
    
    // Server-side tier resolution - ignore client-sent tier
    const resolvedTier = await resolveUserTier(user.email || '');
    // Map resolved tier: premium users get 'messa' (top models), others get their tier
    const tier = resolvedTier === 'premium' ? 'messa' as const : resolvedTier;
    logStep("Tier resolved server-side", { resolvedTier, effectiveTier: tier });

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
      supabaseClient.from("project_documents").select("id, file_name, file_path").eq("project_id", projectId),
      supabaseClient.from("contracts").select("id").eq("project_id", projectId).is("archived_at", null),
    ]);

    const summary = summaryRes.data;
    const verifiedFacts = (summary?.verified_facts as any[]) || [];
    
    const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
    const gfa = gfaCitation?.metadata?.gfa_value || gfaCitation?.value || 0;

    // Extract photos and blueprints
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
      citations: verifiedFacts,
    };

    logStep("Project data gathered", { 
      gfa: projectData.gfa, 
      tasks: projectData.taskCount,
      budget: projectData.totalBudget,
      region: detectedRegion,
    });

    // ============================================
    // M.E.S.S.A. GRAND DUAL ENGINE EXECUTION
    // ============================================
    const engineConfig = getDualEngineConfig(tier);
    logStep("M.E.S.S.A. Dual Engine Config", { 
      geminiModel: engineConfig.geminiModel, 
      openaiModel: engineConfig.openaiModel,
      version: engineConfig.synthesisVersion,
    });

    let geminiAnalysis: Record<string, unknown> | null = null;
    let openaiAnalysis: Record<string, unknown> | null = null;

    // ============================================
    // STEP 0: FETCH PROJECT IMAGES FOR VISUAL ANALYSIS
    // ============================================
    const allImagePaths = [...projectData.sitePhotos, ...projectData.blueprints.filter((b: string) => b.match(/\.(jpg|jpeg|png|gif|webp)$/i))];
    logStep("Fetching project images for visual analysis", { totalPaths: allImagePaths.length });
    
    const projectImages = await fetchProjectImages(allImagePaths, 6);
    logStep("Images ready for Gemini", { 
      fetched: projectImages.length, 
      fileNames: projectImages.map(i => i.fileName),
    });

    // ============================================
    // STEP 1: GEMINI VISUAL SYNTHESIS (MULTIMODAL)
    // ============================================
    const hasImages = projectImages.length > 0;
    const geminiPrompt = buildGeminiSynthesisPrompt(projectData, hasImages);
    
    let geminiMessages: Array<{role: string; content: any}>;
    
    if (hasImages) {
      // Build multimodal message with actual images
      const multimodalContent = buildMultimodalMessage(geminiPrompt, projectImages);
      geminiMessages = [
        { role: "system", content: "You are M.E.S.S.A., an expert construction project analyzer specializing in VISUAL assessment of blueprints, site photos, and construction documentation. You MUST carefully analyze every image provided and describe what you see in detail. Always respond with valid JSON." },
        { role: "user", content: multimodalContent },
      ];
      logStep("Sending multimodal request to Gemini", { imageCount: projectImages.length });
    } else {
      // Text-only fallback
      geminiMessages = [
        { role: "system", content: "You are M.E.S.S.A., an expert construction project analyzer specializing in visual assessment and site evaluation. Always respond with valid JSON." },
        { role: "user", content: geminiPrompt },
      ];
      logStep("No images available, sending text-only request to Gemini");
    }
    
    const geminiResult = await callAI(engineConfig.geminiModel, geminiMessages, engineConfig.geminiTokens);
    logStep("Gemini Visual Synthesis complete", { length: geminiResult.length, hadImages: hasImages });

    try {
      const jsonMatch = geminiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        geminiAnalysis = { rawAnalysis: geminiResult };
      }
    } catch {
      geminiAnalysis = { rawAnalysis: geminiResult };
    }

    // ============================================
    // STEP 2: OPENAI REGULATORY SYNTHESIS
    // ============================================
    if (engineConfig.runDualEngine) {
      try {
        const openaiPrompt = buildOpenAISynthesisPrompt(projectData);
        const openaiMessages = [
          { role: "system", content: "You are M.E.S.S.A., an expert construction regulatory analyst specializing in Canadian building codes and safety compliance. Always respond with valid JSON." },
          { role: "user", content: openaiPrompt },
        ];
        
        const openaiResult = await callAI(engineConfig.openaiModel, openaiMessages, engineConfig.openaiTokens);
        logStep("OpenAI Regulatory Synthesis complete", { length: openaiResult.length });

        try {
          const jsonMatch = openaiResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            openaiAnalysis = JSON.parse(jsonMatch[0]);
          } else {
            openaiAnalysis = { rawValidation: openaiResult };
          }
        } catch {
          openaiAnalysis = { rawValidation: openaiResult };
        }
      } catch (openaiError) {
        logStep("OpenAI Synthesis failed, continuing with Gemini only", { error: String(openaiError) });
      }
    }

    // ============================================
    // BUILD M.E.S.S.A. UNIFIED RESPONSE
    // ============================================
    const synthesisId = `MESSA-${projectId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    
    const response = {
      synthesisId,
      projectId,
      projectName: projectData.name,
      synthesisType: analysisType,
      tier,
      generatedAt: new Date().toISOString(),
      synthesisVersion: engineConfig.synthesisVersion,
      dualEngineUsed: engineConfig.runDualEngine && openaiAnalysis !== null,
      region: detectedRegion,
      
      // M.E.S.S.A. Dual Engine Results
      engines: {
        gemini: {
          model: engineConfig.geminiModel,
          provider: 'google',
          role: 'Visual & Site Assessment',
          imagesAnalyzed: projectImages.length,
          imageFileNames: projectImages.map(i => i.fileName),
          analysis: geminiAnalysis,
        },
        openai: engineConfig.runDualEngine ? {
          model: engineConfig.openaiModel,
          provider: 'openai',
          role: 'Regulatory & Code Validation',
          region: detectedRegion,
          analysis: openaiAnalysis,
        } : null,
      },
      
      // Project Snapshot for Report
      projectSnapshot: {
        name: projectData.name,
        address: projectData.address,
        trade: projectData.trade,
        gfa: projectData.gfa,
        teamSize: projectData.teamSize,
        taskProgress: {
          completed: projectData.completedTasks,
          total: projectData.taskCount,
          percent: projectData.taskCount > 0 ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) : 0,
        },
        budget: {
          materials: projectData.materialCost,
          labor: projectData.laborCost,
          total: projectData.totalBudget,
          perSqFt: projectData.gfa > 0 ? Math.round(projectData.totalBudget / projectData.gfa * 100) / 100 : 0,
        },
        timeline: {
          startDate: projectData.startDate,
          endDate: projectData.endDate,
        },
        documents: projectData.documentCount,
        contracts: projectData.hasContracts,
      },
      
      // Citation reference for audit trail
      citationCount: projectData.citations.length,
    };

    logStep("M.E.S.S.A. Synthesis complete", { 
      synthesisId,
      dualEngine: response.dualEngineUsed,
      version: engineConfig.synthesisVersion,
    });

    // Log AI usage to database
    try {
      await supabaseClient.from("ai_model_usage").insert({
        user_id: user.id,
        function_name: "ai-project-analysis",
        model_used: engineConfig.geminiModel + (response.dualEngineUsed ? ` + ${engineConfig.openaiModel}` : ""),
        tier: resolvedTier,
        tokens_used: engineConfig.maxTokensGemini,
        success: true,
      });
    } catch (logErr) { console.error("Usage log error:", logErr); }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
