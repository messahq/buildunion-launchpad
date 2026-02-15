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
// Gemini 2.5 Pro = Visual Analysis + 4D Progress Tracking
// OpenAI GPT-5 = Building Code + Regulatory Validation
// ============================================

const AI_MODELS = {
  GEMINI_PRO: "google/gemini-2.5-pro",
  GPT5: "openai/gpt-5",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GPT5_MINI: "openai/gpt-5-mini",
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

function getDualEngineConfig(tier: 'free' | 'pro' | 'premium' | 'messa'): DualEngineConfig {
  if (tier === 'messa' || tier === 'premium') {
    return {
      geminiModel: AI_MODELS.GEMINI_PRO,
      openaiModel: AI_MODELS.GPT5,
      geminiTokens: 4000,
      openaiTokens: 4000,
      runDualEngine: true,
      synthesisVersion: 'M.E.S.S.A. v4.0 — 4D Progress',
    };
  } else if (tier === 'pro') {
    return {
      geminiModel: AI_MODELS.GEMINI_FLASH,
      openaiModel: AI_MODELS.GPT5_MINI,
      geminiTokens: 2000,
      openaiTokens: 1500,
      runDualEngine: true,
      synthesisVersion: 'M.E.S.S.A. v3.0 — 4D Progress',
    };
  }
  return {
    geminiModel: AI_MODELS.GEMINI_FLASH_LITE,
    openaiModel: AI_MODELS.GPT5_NANO,
    geminiTokens: 1500,
    openaiTokens: 800,
    runDualEngine: false,
    synthesisVersion: 'M.E.S.S.A. v2.0 — 4D Progress',
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
  sitePhotos: Array<{ path: string; uploadedAt: string; fileName: string }>;
  blueprints: Array<{ path: string; uploadedAt: string; fileName: string }>;
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
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add credits.");
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

async function fetchProjectImagesChronological(
  imageDocs: Array<{ path: string; uploadedAt: string; fileName: string }>,
  maxImages: number = 6
): Promise<Array<{ base64: string; mimeType: string; fileName: string; uploadedAt: string; index: number }>> {
  // Sort by upload date ascending (oldest first → newest last)
  const sorted = [...imageDocs].sort((a, b) => 
    new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );
  
  // If more than maxImages, sample evenly: first, last, and spread in between
  let toFetch: typeof sorted;
  if (sorted.length <= maxImages) {
    toFetch = sorted;
  } else {
    // Always include first and last, sample middle evenly
    const indices = [0];
    const step = (sorted.length - 1) / (maxImages - 1);
    for (let i = 1; i < maxImages - 1; i++) {
      indices.push(Math.round(step * i));
    }
    indices.push(sorted.length - 1);
    toFetch = [...new Set(indices)].sort((a, b) => a - b).map(i => sorted[i]);
  }

  const results: Array<{ base64: string; mimeType: string; fileName: string; uploadedAt: string; index: number }> = [];
  const MAX_BASE64_SIZE = 1.5 * 1024 * 1024; // 1.5MB base64 limit per image (prevents WORKER_LIMIT)

  for (let i = 0; i < toFetch.length; i++) {
    const doc = toFetch[i];
    const img = await fetchImageAsBase64(doc.path);
    if (img) {
      if (img.base64.length > MAX_BASE64_SIZE) {
        logStep('Image too large, skipping', { filePath: doc.path, sizeKB: Math.round(img.base64.length / 1024) });
        continue;
      }
      results.push({ ...img, fileName: doc.fileName, uploadedAt: doc.uploadedAt, index: i + 1 });
    }
  }

  logStep('Chronological images fetched', { 
    count: results.length, 
    totalAvailable: imageDocs.length,
    dateRange: results.length > 1 
      ? `${results[0].uploadedAt} → ${results[results.length - 1].uploadedAt}` 
      : 'single image',
  });
  return results;
}

// ============================================
// BUILD 4D PROGRESS MULTIMODAL MESSAGE
// ============================================
function buildTimelineMultimodalMessage(
  textPrompt: string,
  images: Array<{ base64: string; mimeType: string; fileName: string; uploadedAt: string; index: number }>
): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  parts.push({ type: "text", text: textPrompt });

  for (const img of images) {
    const dateLabel = new Date(img.uploadedAt).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    
    parts.push({
      type: "text",
      text: `\n--- IMAGE ${img.index} of ${images.length} | Date: ${dateLabel} | File: ${img.fileName} ---`,
    });
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    });
  }

  return parts;
}

// ============================================
// GEMINI - 4D PROGRESS TRACKING ENGINE
// ============================================
function buildGeminiSynthesisPrompt(projectData: ProjectData, imageCount: number, imageTimeline: string): string {
  const progressPercent = projectData.taskCount > 0 
    ? Math.round((projectData.completedTasks / projectData.taskCount) * 100) 
    : 0;

  const visualInstructions = imageCount > 0 ? `

### CRITICAL: 4D PROGRESS TRACKING — CHRONOLOGICAL VISUAL ANALYSIS
You are receiving ${imageCount} images sorted from OLDEST to NEWEST.
${imageTimeline}

**YOUR MISSION:** Analyze these images as a CONSTRUCTION TIMELINE.
Do NOT treat them as isolated snapshots. CONNECT them chronologically.

**For EACH consecutive pair of images, describe:**
1. What specific work was completed between them (e.g., "Framing was added since the previous photo")
2. What materials appeared or were consumed
3. Whether the pace of progress is accelerating, steady, or slowing
4. Any safety concerns that appeared or were resolved
5. Quality assessment: is the new work consistent with previous stages?

**For BLUEPRINTS:**
- Read dimensions, room labels, annotations
- Estimate total area from floor plans
- Identify structural elements and MEP routing
- Flag code compliance concerns

**For SITE PHOTOS (timeline mode):**
- Compare each photo to the previous one
- Identify NEW work since last photo
- Track material usage progression
- Note worker count changes if visible
- Flag NEW safety issues or resolution of old ones
- Estimate completion delta between photos

**OVERALL TIMELINE ASSESSMENT:**
- Is the project on track based on visual progress rate?
- What phase transitioned between first and last image?
- Predict next 2 weeks of expected progress based on the observed pace.
` : `
### NOTE: No project images were available for visual analysis.
Provide assessment based on project data only.
`;

  return `
# M.E.S.S.A. 4D PROGRESS TRACKING ENGINE v4.0
## Multi-Engine Synthesis & Structured Analysis — Timeline Mode

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
- **Site Photos:** ${projectData.sitePhotos.length} available (chronologically sorted)
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

## RESPONSE FORMAT

**CRITICAL: Return ONLY clean, plain text. NO JSON blocks, NO markdown code fences, NO raw JSON keys.**
**Write like a professional construction report — narrative paragraphs with section headers.**

Your response MUST follow this exact structure:

EXECUTIVE SUMMARY
[3-4 sentence professional overview of the project state]

PROJECT HEALTH SCORE: [number]/100
Grade: [Excellent|Good|Fair|Needs Attention|Critical]

4D PROGRESS TIMELINE
[If multiple images: describe the chronological progression between each pair of images]
[Example: "Between the site visit on Jan 15 and Jan 22, the plumbing rough-in was completed in the basement level. New copper piping is visible along the west wall..."]
[If single image: describe what the image shows about current progress]
[If no images: note that visual verification is pending]

SITE CONDITION ASSESSMENT
- Current Status: [description]
- Safety Score: [number]/100
- Key Observations:
  • [observation 1]
  • [observation 2]

VISUAL VERIFICATION RESULTS
- Images Analyzed: [number]
- Blueprint Findings: [if any]
- Site Photo Timeline Analysis: [chronological findings]
- Critical Visual Flags: [if any]

PROGRESS ANALYSIS
- Overall Progress: [percent]%
- Completed Phases: [list]
- Active Work Areas: [list]
- Critical Path Items: [list]

RECOMMENDATIONS
1. [actionable recommendation]
2. [actionable recommendation]
3. [actionable recommendation]
4. [actionable recommendation]
5. [actionable recommendation]

30-DAY FORECAST
- Projected Progress: [percent]%
- Key Milestones: [list]
- Risk Factors: [list]`;
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

## RESPONSE FORMAT

**CRITICAL: Return ONLY clean, plain text. NO JSON blocks, NO markdown code fences, NO raw JSON keys.**
**Write like a professional compliance report — narrative paragraphs with clear section headers.**

Your response MUST follow this structure:

PERMIT STATUS ANALYSIS
- Required Permits: [list for ${projectData.trade} work in ${projectData.region}]
- Estimated Timeline: [description]
- Required Inspections: [list]

CODE COMPLIANCE ASSESSMENT
- Structural: [Compliant|Review Required|Non-Compliant] — [notes]
- Fire Safety: [status] — [notes]
- Accessibility (AODA): [status] — [notes]
- Energy Efficiency: [status] — [notes]

TRADE-SPECIFIC REGULATIONS (${projectData.trade})
- Installation Standards: [list]
- Material Specifications: [list]
- Workmanship Standards: [list]

SAFETY COMPLIANCE (OHSA)
- Worker Safety Requirements: [list]
- PPE Mandates: [list]
- Training Required: [list]

INSPECTION SCHEDULE
[List inspection milestones in order]

DOCUMENTATION REQUIREMENTS
[List all required permits, certificates, records]

COMPLIANCE SCORE: [number]/100
Risk Level: [Low|Medium|High|Critical]

IDENTIFIED GAPS
[List specific gaps to address]

RECOMMENDATIONS
1. [compliance recommendation]
2. [compliance recommendation]
3. [compliance recommendation]
4. [compliance recommendation]
5. [compliance recommendation]`;
}

// ============================================
// CLEAN AI OUTPUT — Remove JSON artifacts
// ============================================
function cleanAiOutput(raw: string): string {
  let cleaned = raw;
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  // If the entire response is a JSON object, extract readable fields
  try {
    const trimmed = cleaned.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      // Convert JSON to readable text
      return jsonToReadableText(parsed);
    }
  } catch {
    // Not JSON, continue cleaning
  }
  
  // Remove inline JSON key patterns like "executiveSummary": 
  cleaned = cleaned.replace(/"(\w+)":\s*/g, '');
  // Remove stray braces/brackets at line starts
  cleaned = cleaned.replace(/^\s*[{}\[\]],?\s*$/gm, '');
  // Remove trailing commas
  cleaned = cleaned.replace(/,\s*$/gm, '');
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

function jsonToReadableText(obj: any, depth: number = 0): string {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') return `• ${item}`;
      if (typeof item === 'object') return jsonToReadableText(item, depth + 1);
      return `• ${String(item)}`;
    }).join('\n');
  }
  if (typeof obj === 'object' && obj !== null) {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${label}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`\n${label}:`);
        lines.push(jsonToReadableText(value, depth + 1));
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`\n${label}:`);
        lines.push(jsonToReadableText(value, depth + 1));
      }
    }
    return lines.join('\n');
  }
  return '';
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
    
    const resolvedTier = await resolveUserTier(user.email || '');
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
      supabaseClient.from("project_documents").select("id, file_name, file_path, uploaded_at").eq("project_id", projectId).order("uploaded_at", { ascending: true }),
      supabaseClient.from("contracts").select("id").eq("project_id", projectId).is("archived_at", null),
    ]);

    const summary = summaryRes.data;
    const verifiedFacts = (summary?.verified_facts as any[]) || [];
    
    const gfaCitation = verifiedFacts.find((f: any) => f.cite_type === 'GFA_LOCK');
    const gfa = gfaCitation?.metadata?.gfa_value || gfaCitation?.value || 0;

    // ============================================
    // 4D: SORT DOCUMENTS CHRONOLOGICALLY
    // ============================================
    const documents = documentsRes.data || [];
    
    const sitePhotoDocs = documents
      .filter((d: any) => d.file_name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i))
      .map((d: any) => ({ path: d.file_path, uploadedAt: d.uploaded_at, fileName: d.file_name }));
    
    const blueprintDocs = documents
      .filter((d: any) => d.file_name.match(/\.(pdf|dwg|dxf)$/i) || d.file_name.toLowerCase().includes('blueprint'))
      .map((d: any) => ({ path: d.file_path, uploadedAt: d.uploaded_at, fileName: d.file_name }));

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
      sitePhotos: sitePhotoDocs,
      blueprints: blueprintDocs,
      region: detectedRegion,
      citations: verifiedFacts,
    };

    logStep("Project data gathered (4D mode)", { 
      gfa: projectData.gfa, 
      tasks: projectData.taskCount,
      sitePhotos: sitePhotoDocs.length,
      blueprints: blueprintDocs.length,
      budget: projectData.totalBudget,
      region: detectedRegion,
    });

    // ============================================
    // M.E.S.S.A. 4D DUAL ENGINE EXECUTION
    // ============================================
    const engineConfig = getDualEngineConfig(tier);
    logStep("M.E.S.S.A. 4D Engine Config", { 
      geminiModel: engineConfig.geminiModel, 
      openaiModel: engineConfig.openaiModel,
      version: engineConfig.synthesisVersion,
    });

    let geminiAnalysis: string = '';
    let openaiAnalysis: string = '';

    // ============================================
    // STEP 0: FETCH ALL IMAGES CHRONOLOGICALLY
    // ============================================
    const allImageDocs = [
      ...sitePhotoDocs,
      ...blueprintDocs.filter(b => b.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)),
    ];
    logStep("Fetching images chronologically for 4D analysis", { totalPaths: allImageDocs.length });
    
    const projectImages = await fetchProjectImagesChronological(allImageDocs, 6);
    
    // Build timeline description for the prompt
    const imageTimeline = projectImages.length > 1
      ? `\nImage Timeline:\n${projectImages.map(img => {
          const date = new Date(img.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          return `  ${img.index}. ${img.fileName} — uploaded ${date}`;
        }).join('\n')}`
      : projectImages.length === 1 
        ? `\nSingle image available: ${projectImages[0].fileName} (uploaded ${new Date(projectImages[0].uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})`
        : '';

    logStep("4D Timeline built", { 
      imageCount: projectImages.length,
      timeline: imageTimeline,
    });

    // ============================================
    // STEP 1: GEMINI 4D VISUAL SYNTHESIS (MULTIMODAL)
    // ============================================
    const hasImages = projectImages.length > 0;
    const geminiPrompt = buildGeminiSynthesisPrompt(projectData, projectImages.length, imageTimeline);
    
    let geminiMessages: Array<{role: string; content: any}>;
    
    if (hasImages) {
      const multimodalContent = buildTimelineMultimodalMessage(geminiPrompt, projectImages);
      geminiMessages = [
        { role: "system", content: "You are M.E.S.S.A. 4D Progress Tracking Engine, a construction project analyzer that treats site photos as a CHRONOLOGICAL TIMELINE. You compare images over time to identify progress, track material usage, and validate construction pace. NEVER return JSON. Write clean, professional plain text reports with section headers. No code fences. No JSON keys." },
        { role: "user", content: multimodalContent },
      ];
      logStep("Sending 4D timeline request to Gemini", { imageCount: projectImages.length });
    } else {
      geminiMessages = [
        { role: "system", content: "You are M.E.S.S.A. 4D Progress Tracking Engine. Provide professional construction analysis. NEVER return JSON. Write clean, professional plain text reports with section headers. No code fences. No JSON keys." },
        { role: "user", content: geminiPrompt },
      ];
      logStep("No images available, sending text-only request to Gemini");
    }
    
    const geminiRaw = await callAI(engineConfig.geminiModel, geminiMessages, engineConfig.geminiTokens);
    logStep("Gemini 4D Synthesis complete", { length: geminiRaw.length, hadImages: hasImages });

    // Clean the output — remove JSON artifacts
    geminiAnalysis = cleanAiOutput(geminiRaw);

    // Also try to extract structured data for conflict detection
    let geminiStructured: Record<string, unknown> | null = null;
    try {
      const jsonMatch = geminiRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiStructured = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // No JSON found, that's fine — we wanted clean text
    }

    // ============================================
    // STEP 2: OPENAI REGULATORY SYNTHESIS
    // ============================================
    if (engineConfig.runDualEngine) {
      try {
        const openaiPrompt = buildOpenAISynthesisPrompt(projectData);
        const openaiMessages = [
          { role: "system", content: "You are M.E.S.S.A. Regulatory Compliance Engine specializing in Canadian building codes and safety compliance. NEVER return JSON. Write clean, professional plain text compliance reports with section headers. No code fences. No JSON keys." },
          { role: "user", content: openaiPrompt },
        ];
        
        const openaiRaw = await callAI(engineConfig.openaiModel, openaiMessages, engineConfig.openaiTokens);
        logStep("OpenAI Regulatory Synthesis complete", { length: openaiRaw.length });
        openaiAnalysis = cleanAiOutput(openaiRaw);
      } catch (openaiError) {
        logStep("OpenAI Synthesis failed, continuing with Gemini only", { error: String(openaiError) });
        openaiAnalysis = '';
      }
    }

    // ============================================
    // CONFLICT DETECTION: Visual vs Database
    // ============================================
    const conflictAlerts: Array<{ type: string; visual_value: number; db_value: number; deviation_pct: number; source: string }> = [];
    
    const allText = geminiRaw + (geminiStructured ? JSON.stringify(geminiStructured) : '');
    const sqftPattern = /(\d[\d,]*\.?\d*)\s*(?:sq\.?\s*ft|square\s*feet|sqft|SF)/gi;
    const extractedAreas: number[] = [];
    let match;
    while ((match = sqftPattern.exec(allText)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > 0 && val < 1000000) extractedAreas.push(val);
    }
    
    if (extractedAreas.length > 0 && projectData.gfa > 0) {
      for (const extractedArea of extractedAreas) {
        const deviation = Math.abs(extractedArea - projectData.gfa) / projectData.gfa * 100;
        if (deviation > 15) {
          conflictAlerts.push({
            type: 'AREA_MISMATCH',
            visual_value: extractedArea,
            db_value: projectData.gfa,
            deviation_pct: Math.round(deviation),
            source: 'Gemini Vision 4D Timeline',
          });
          logStep("CONFLICT DETECTED: Area mismatch", { 
            visual: extractedArea, db: projectData.gfa, deviation: `${Math.round(deviation)}%` 
          });
        }
      }
    }
    
    // Deduplicate conflicts
    const uniqueConflicts = conflictAlerts.reduce((acc, c) => {
      const existing = acc.find(a => a.type === c.type);
      if (!existing || c.deviation_pct > existing.deviation_pct) {
        return [...acc.filter(a => a.type !== c.type), c];
      }
      return acc;
    }, [] as typeof conflictAlerts);
    conflictAlerts.length = 0;
    conflictAlerts.push(...uniqueConflicts);

    // ============================================
    // PERSIST: Save to photo_estimate + verified_facts
    // ============================================
    if (summary) {
      try {
        const photoEstimateUpdate = {
          ...(typeof summary.photo_estimate === 'object' && summary.photo_estimate ? summary.photo_estimate : {}),
          visual_analysis: {
            analyzed_at: new Date().toISOString(),
            mode: '4D_PROGRESS_TRACKING',
            images_analyzed: projectImages.length,
            image_timeline: projectImages.map(i => ({ fileName: i.fileName, uploadedAt: i.uploadedAt, index: i.index })),
            gemini_findings: geminiAnalysis,
            openai_findings: openaiAnalysis || null,
            conflict_alerts: conflictAlerts,
            analysis_status: conflictAlerts.length > 0 ? 'conflict_detected' : 'verified',
          },
        };

        const currentFacts = Array.isArray(summary.verified_facts) ? [...(summary.verified_facts as any[])] : [];
        const filteredFacts = currentFacts.filter((f: any) => f.cite_type !== 'CONFLICT_ALERT');
        
        for (const conflict of conflictAlerts) {
          filteredFacts.push({
            id: crypto.randomUUID(),
            cite_type: 'CONFLICT_ALERT',
            question: `Visual Evidence (${conflict.visual_value.toLocaleString()} sq ft) disputes Database Entry (${conflict.db_value.toLocaleString()} sq ft)`,
            answer: `Deviation: +${conflict.deviation_pct}%. Source: ${conflict.source}. Requires manual verification.`,
            timestamp: new Date().toISOString(),
            metadata: {
              conflict_type: conflict.type,
              visual_value: conflict.visual_value,
              db_value: conflict.db_value,
              deviation_pct: conflict.deviation_pct,
              source: conflict.source,
              auto_detected: true,
            },
          });
        }

        await supabaseClient
          .from("project_summaries")
          .update({
            photo_estimate: photoEstimateUpdate,
            verified_facts: filteredFacts,
          })
          .eq("id", summary.id);

        logStep("Persisted 4D analysis results", { 
          conflicts: conflictAlerts.length,
          factsCount: filteredFacts.length,
          summaryId: summary.id,
        });
      } catch (persistErr) {
        logStep("Failed to persist analysis results", { error: String(persistErr) });
      }
    }

    // ============================================
    // BUILD M.E.S.S.A. 4D UNIFIED RESPONSE
    // ============================================
    const synthesisId = `MESSA4D-${projectId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    
    const response = {
      synthesisId,
      projectId,
      projectName: projectData.name,
      synthesisType: analysisType,
      tier,
      generatedAt: new Date().toISOString(),
      synthesisVersion: engineConfig.synthesisVersion,
      dualEngineUsed: engineConfig.runDualEngine && openaiAnalysis.length > 0,
      region: detectedRegion,
      
      // 4D Progress Mode
      progressMode: '4D_TIMELINE',
      imageTimeline: projectImages.map(i => ({ fileName: i.fileName, uploadedAt: i.uploadedAt, index: i.index })),
      
      // Conflict Detection Results
      conflictAlerts,
      
      // M.E.S.S.A. 4D Dual Engine Results — CLEAN TEXT
      engines: {
        gemini: {
          model: engineConfig.geminiModel,
          provider: 'google',
          role: '4D Visual Progress & Site Assessment',
          imagesAnalyzed: projectImages.length,
          imageFileNames: projectImages.map(i => i.fileName),
          analysis: geminiAnalysis, // Clean plain text
        },
        openai: engineConfig.runDualEngine ? {
          model: engineConfig.openaiModel,
          provider: 'openai',
          role: 'Regulatory & Code Validation',
          region: detectedRegion,
          analysis: openaiAnalysis, // Clean plain text
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
      
      citationCount: projectData.citations.length,
    };

    logStep("M.E.S.S.A. 4D Synthesis complete", { 
      synthesisId,
      dualEngine: response.dualEngineUsed,
      version: engineConfig.synthesisVersion,
      conflicts: conflictAlerts.length,
      imagesTimeline: projectImages.length,
    });

    // Log AI usage
    try {
      await supabaseClient.from("ai_model_usage").insert({
        user_id: user.id,
        function_name: "ai-project-analysis-4d",
        model_used: engineConfig.geminiModel + (response.dualEngineUsed ? ` + ${engineConfig.openaiModel}` : ""),
        tier: resolvedTier,
        tokens_used: engineConfig.geminiTokens,
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
