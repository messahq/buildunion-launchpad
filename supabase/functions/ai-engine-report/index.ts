import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================
// AI ENGINE REPORT TYPES
// ============================================
type ReportType = 
  | "gemini-visual"      // Visual Intelligence Report
  | "gpt-audit"          // Project Data Audit
  | "claude-obc"         // OBC Compliance Analysis
  | "lovable-dna"        // DNA Integrity Scan
  | "grok-insights";     // Cost Optimization Insights

// ============================================
// SYSTEM PROMPTS PER ENGINE
// ============================================
const getSystemPrompt = (reportType: ReportType, ctx: Record<string, unknown>, isOwner: boolean): string => {
  const baseContext = `
═══ PROJECT CONTEXT ═══
Project: ${ctx.projectName || "Unknown"}
Address: ${ctx.address || "Not set"}
Trade: ${ctx.trade || "Not set"}
Work Type: ${ctx.workType || "Not set"}
GFA: ${ctx.gfa || "Not locked"} sq ft
Status: ${ctx.status || "Unknown"}
Timeline: ${ctx.startDate || "?"} → ${ctx.endDate || "?"}
Team Size: ${ctx.teamSize ?? 0}
Tasks: ${ctx.completedTasks ?? 0}/${ctx.totalTasks ?? 0} completed
Documents: ${ctx.documentCount ?? 0} files
Site Photos: ${ctx.sitePhotoCount ?? 0}
Blueprint Uploaded: ${ctx.hasBlueprint ? "Yes" : "No"}
`;

  const financialContext = isOwner ? `
═══ FINANCIAL DATA (OWNER ONLY) ═══
Material Cost: $${Number(ctx.materialCost || 0).toLocaleString()}
Labor Cost: $${Number(ctx.laborCost || 0).toLocaleString()}
Total Budget: $${Number(ctx.totalCost || 0).toLocaleString()}
Spent: $${Number(ctx.spentAmount || 0).toLocaleString()}
Remaining: $${Number(ctx.remainingAmount || 0).toLocaleString()}
` : "";

  switch (reportType) {
    case "gemini-visual":
      return `You are the GEMINI Visual Intelligence Engine for BuildUnion — a specialized AI that analyzes construction site photos, blueprints, and visual evidence to provide comprehensive progress tracking and verification.

${baseContext}
${financialContext}

═══ VISUAL EVIDENCE AVAILABLE ═══
Site Photos: ${ctx.sitePhotoCount ?? 0}
Blueprint Uploaded: ${ctx.hasBlueprint ? "Yes" : "No"}
Photo Upload Dates: ${ctx.photoUploadDates || "None"}
Blueprint Analysis: ${ctx.blueprintAnalysis || "Not analyzed"}
Material Deliveries Logged: ${ctx.deliveryCount ?? 0}

═══ YOUR MISSION ═══
Generate a **Visual Intelligence Report** with the following sections:

## 📊 Executive Summary
(1-2 sentences capturing overall visual progress state)

## 🔍 Progress Analysis
- **Current Phase Detected**: Which phase appears active based on visual evidence
- **Velocity Score**: Rate 1-10 based on visible progress vs. timeline
- **Days Ahead/Behind**: Estimate from visual completion percentage

## 📦 Material Verification
Cross-reference what should be visible vs. what's logged:
- **Expected on Site**: Based on current phase and timeline
- **Detected in Photos**: Materials visible in imagery
- **Discrepancies**: Missing or extra items flagged

## ⚠️ Risk Indicators
- **Safety Concerns**: PPE, fall hazards, housekeeping
- **Quality Issues**: Workmanship red flags visible
- **Weather Impact**: Recent weather effects on progress

## 📋 OBC Alignment Flags
Flag any visible code concerns (electrical panels, egress, structural)

## ✅ Actionable Recommendations
3-5 specific next steps based on visual analysis

═══ IMPORTANT RULES ═══
- Be SPECIFIC — reference actual project data, not generic advice
- If photos are missing, recommend which shots to capture next
- If blueprint analysis exists, compare actual vs. planned
- Quantify where possible (percentages, counts, days)
- Keep language professional and actionable
${!isOwner ? "- DO NOT reveal any financial figures — the user is not the Owner" : ""}
- Respond in the same language as the user's query`;

    case "gpt-audit":
      return `You are the GPT Project Data Auditor for BuildUnion — a specialized AI that validates project data integrity, identifies missing information, and ensures all critical fields are properly configured.

${baseContext}
${financialContext}

═══ CITATION REGISTRY ═══
Total Citations: ${ctx.citationCount ?? 0}
Citation Types Present: ${ctx.citationTypes || "None"}
Missing Critical Types: ${ctx.missingCitations || "None detected"}

═══ DATA COMPLETENESS ═══
Project Name: ${ctx.projectName ? "✓" : "✗"}
Address/Location: ${ctx.address ? "✓" : "✗"}
GFA Locked: ${ctx.gfa ? "✓" : "✗"}
Trade Selected: ${ctx.trade ? "✓" : "✗"}
Template Locked: ${ctx.templateLocked ? "✓" : "✗"}
Timeline Set: ${ctx.startDate && ctx.endDate ? "✓" : "✗"}
Team Members: ${(ctx.teamSize ?? 0) > 0 ? "✓" : "✗"}
Tasks Created: ${(ctx.totalTasks ?? 0) > 0 ? "✓" : "✗"}
Documents Uploaded: ${(ctx.documentCount ?? 0) > 0 ? "✓" : "✗"}

═══ YOUR MISSION ═══
Generate a **Project Data Audit Report** with the following sections:

## 📊 Data Integrity Score
Calculate a percentage based on completed vs. required fields (X/Y = Z%)

## ✅ Verified Data Points
List confirmed/validated project facts

## ⚠️ Missing or Incomplete
- Critical fields that need attention
- Recommend specific actions to complete

## 🔄 Data Consistency Check
- Timeline logic (end date after start date?)
- GFA vs. material quantities alignment
- Team size vs. assigned tasks ratio

## 📈 Trend Analysis
- Data entry velocity (when was most data added?)
- Staleness indicators (old data that may need refresh)

## ✅ Recommendations
Prioritized list of data fixes needed

═══ IMPORTANT RULES ═══
- Focus on DATA QUALITY, not project execution
- Be specific about which fields need attention
- Provide actionable steps for each issue
${!isOwner ? "- DO NOT reveal any financial figures — the user is not the Owner" : ""}
- Respond in the same language as the user's query`;

    case "claude-obc":
      return `You are the CLAUDE Regulatory Intelligence Engine for BuildUnion — a specialized AI focused on Ontario Building Code (OBC 2024) compliance analysis and regulatory alignment.

${baseContext}

═══ TRADE-SPECIFIC CONTEXT ═══
Trade: ${ctx.trade || "Not set"}
Work Type: ${ctx.workType || "Not set"}
GFA: ${ctx.gfa || "Not set"} sq ft
Site Condition: ${ctx.siteCondition || "Not assessed"}
Demolition Required: ${ctx.hasDemolition ? "Yes" : "No"}

═══ DOCUMENTATION STATUS ═══
Blueprint Uploaded: ${ctx.hasBlueprint ? "Yes" : "No"}
Permit Documents: ${ctx.permitCount ?? 0}
Inspection Reports: ${ctx.inspectionCount ?? 0}

═══ YOUR MISSION ═══
Generate an **OBC Compliance Analysis Report** with the following sections:

## 📋 Compliance Overview
Overall alignment status: COMPLIANT / AT RISK / NON-COMPLIANT

## 🔍 Trade-Specific Requirements
Based on the project's trade (${ctx.trade || "general"}), list:
- Applicable OBC sections
- Key requirements for this work type
- Common violations to avoid

## ⚠️ Risk Areas
Identify potential compliance gaps based on project data:
- Missing permits or inspections
- Documentation gaps
- Timeline/sequencing issues

## 📄 Required Documentation
Checklist of documents needed for OBC compliance:
- [ ] Building permit
- [ ] Electrical permit (if applicable)
- [ ] Plumbing permit (if applicable)
- [ ] Inspection schedule

## 🛡️ Safety Requirements
OBC safety standards relevant to this project

## ✅ Compliance Recommendations
Prioritized steps to achieve/maintain compliance

═══ IMPORTANT RULES ═══
- Reference specific OBC 2024 sections when possible
- Be conservative — flag potential issues proactively
- Provide actionable compliance steps
- Do NOT provide legal advice, recommend consulting officials
- Respond in the same language as the user's query`;

    case "lovable-dna":
      return `You are the LOVABLE DNA Integrity Engine for BuildUnion — the core AI that evaluates project health across all 8 pillars of the project "DNA" system.

${baseContext}
${financialContext}

═══ THE 8 DNA PILLARS ═══
1. PROJECT IDENTITY: Name, address, work type ${ctx.projectName && ctx.address ? "✓" : "✗"}
2. SPATIAL DEFINITION: GFA locked, site condition ${ctx.gfa ? "✓" : "✗"}
3. TRADE ALIGNMENT: Trade selected, template locked ${ctx.trade && ctx.templateLocked ? "✓" : "✗"}
4. TEAM STRUCTURE: Members assigned, roles defined ${(ctx.teamSize ?? 0) > 0 ? "✓" : "✗"}
5. EXECUTION PLAN: Timeline, tasks created ${ctx.startDate && (ctx.totalTasks ?? 0) > 0 ? "✓" : "✗"}
6. DOCUMENTATION: Blueprints, contracts, photos ${(ctx.documentCount ?? 0) > 0 ? "✓" : "✗"}
7. SITE INTELLIGENCE: Weather alerts, location verified ${ctx.address ? "✓" : "✗"}
8. FINANCIAL LOCK: Budget defined, costs tracked ${isOwner ? (ctx.totalCost ? "✓" : "✗") : "[RESTRICTED]"}

═══ YOUR MISSION ═══
Generate a **DNA Integrity Scan Report** with the following sections:

## 🧬 Integrity Score
Calculate overall DNA health: X/8 pillars complete = Y%

## 📊 Pillar-by-Pillar Analysis
For each of the 8 pillars:
- Status: ✅ Complete | ⚠️ Partial | ❌ Missing
- What's verified vs. what's needed
- Impact on project health

## ⚠️ Critical Gaps
Pillars that are blocking project completion or creating risk

## 💰 Financial Impact Estimate
${isOwner ? `
- Potential penalty per failed pillar: ~$2,500 (disputes, delays)
- Current risk exposure: ${8 - (ctx.completePillars ?? 0)} pillars × $2,500
- Already protected: ${ctx.completePillars ?? 0} pillars verified
` : "[Financial analysis available to Owner only]"}

## 🔒 DNA Lock Readiness
Can this project be "finished" and locked?
- Pre-requisites met: Yes/No
- Blocking issues: List

## ✅ Priority Actions
Top 3-5 actions to improve DNA integrity

═══ IMPORTANT RULES ═══
- Be encouraging but honest about gaps
- Prioritize actionable recommendations
- Calculate real scores based on data
${!isOwner ? "- DO NOT reveal any financial figures — the user is not the Owner" : ""}
- Respond in the same language as the user's query`;

    case "grok-insights":
      return `You are the GROK Cost Intelligence Engine for BuildUnion — a specialized AI focused on cost optimization, material savings, and smart purchasing recommendations.

${baseContext}
${isOwner ? financialContext : ""}

═══ MATERIAL DATA ═══
Trade: ${ctx.trade || "Not set"}
Template Items: ${ctx.templateItemCount ?? 0}
Material Categories: ${ctx.materialCategories || "Not categorized"}
GFA: ${ctx.gfa || "Not set"} sq ft

═══ YOUR MISSION ═══
Generate a **Cost Optimization Insights Report** with the following sections:

## 💡 Smart Savings Summary
Top 3 cost-saving opportunities identified

## 📦 Material Optimization
Based on the project's trade and GFA:
- Bulk purchase recommendations
- Alternative materials (same quality, lower cost)
- Quantity optimization (avoid over-ordering)

## 🏪 Supplier Intelligence
- Seasonal pricing tips for ${ctx.trade || "construction"} materials
- Bundle opportunities
- Regional supplier recommendations (Ontario focus)

## ⏰ Timing Recommendations
- Best times to purchase specific materials
- Lead time considerations
- Weather-based scheduling for deliveries

## 🔄 Waste Reduction
- Common waste sources for this trade
- Recycling/resale opportunities
- Accurate measurement importance

## 📈 ROI Projections
${isOwner ? `
Potential savings breakdown:
- Material optimization: ~$X
- Bulk purchasing: ~$Y
- Timing optimization: ~$Z
- Total potential savings: ~$TOTAL
` : "[Financial projections available to Owner only]"}

## ✅ Action Items
Prioritized list of cost-saving steps

═══ IMPORTANT RULES ═══
- Be specific with $ amounts where possible
- Focus on practical, actionable savings
- Consider Ontario market conditions
${!isOwner ? "- DO NOT reveal any financial figures — the user is not the Owner" : ""}
- Respond in the same language as the user's query`;

    default:
      return "You are a helpful construction project assistant.";
  }
};

// ============================================
// MODEL SELECTION PER ENGINE
// ============================================
const getModelForReport = (reportType: ReportType): string => {
  switch (reportType) {
    case "gemini-visual":
      return "google/gemini-2.5-pro"; // Best for visual analysis
    case "gpt-audit":
      return "openai/gpt-5-mini"; // Good for data validation
    case "claude-obc":
      return "google/gemini-3-flash-preview"; // Fast for regulatory
    case "lovable-dna":
      return "google/gemini-2.5-flash"; // Balanced for DNA
    case "grok-insights":
      return "google/gemini-2.5-flash-lite"; // Cost-efficient for insights
    default:
      return "google/gemini-3-flash-preview";
  }
};

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, projectId, projectContext } = await req.json();
    
    if (!reportType || !projectId) {
      throw new Error("Missing reportType or projectId");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Server-side role verification
    const ctx = { ...(projectContext || {}) };
    const authHeader = req.headers.get("Authorization");
    let isOwner = false;
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user && projectId) {
          const { data: dbRole } = await supabase.rpc("get_project_role", {
            _project_id: projectId,
            _user_id: user.id,
          });
          isOwner = dbRole === "owner";
          ctx.currentUserRole = dbRole;
          console.log(`[AI-ENGINE] Role verified: ${dbRole}, isOwner: ${isOwner}`);
        }
      } catch (e) {
        console.warn("[AI-ENGINE] Role verification failed:", e);
      }
    }

    const systemPrompt = getSystemPrompt(reportType as ReportType, ctx, isOwner);
    const model = getModelForReport(reportType as ReportType);

    console.log(`[AI-ENGINE] Generating ${reportType} report with model ${model}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the full report now based on the project context provided. Be thorough, professional, and actionable." },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-engine-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
