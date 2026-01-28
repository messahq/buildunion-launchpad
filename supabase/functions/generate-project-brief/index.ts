import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectBriefRequest {
  projectId: string;
  includeWeather?: boolean;
  tier?: "free" | "pro" | "premium" | "enterprise";
}

interface WeatherAlert {
  type: string;
  severity: "warning" | "danger" | "info";
  message: string;
}

// Tiered Model Selection for Cost Optimization
const AI_MODELS = {
  FREE: "google/gemini-2.5-flash-lite",      // Cheapest - basic reports
  PRO: "google/gemini-2.5-flash",            // Balanced - good quality
  PREMIUM: "google/gemini-3-flash-preview",  // Best - full features
} as const;

const TOKEN_LIMITS = {
  FREE: 1500,     // Limited tokens for free tier
  PRO: 3500,      // Extended for M.E.S.S.A. Audit Report
  PREMIUM: 4500,  // Full engineering report
} as const;

function selectModelForTier(tier: string): { model: string; maxTokens: number } {
  switch (tier) {
    case "premium":
    case "enterprise":
      return { model: AI_MODELS.PREMIUM, maxTokens: TOKEN_LIMITS.PREMIUM };
    case "pro":
      return { model: AI_MODELS.PRO, maxTokens: TOKEN_LIMITS.PRO };
    default:
      return { model: AI_MODELS.FREE, maxTokens: TOKEN_LIMITS.FREE };
  }
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
    const { projectId, includeWeather = true, tier = "free" } = await req.json() as ProjectBriefRequest;
    
    // Select model based on subscription tier
    const { model: selectedModel, maxTokens } = selectModelForTier(tier);
    console.log(`[Tiered AI] Using ${selectedModel} with ${maxTokens} tokens for tier: ${tier}`);

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

    // Extract text from uploaded PDF documents (added later to project)
    let uploadedDocumentsSummary = "";
    if (documents.length > 0) {
      const pdfDocuments = documents.filter((d: any) => 
        d.file_name?.toLowerCase().endsWith('.pdf')
      );
      
      // Try to get extracted text from PDFs via extract-pdf-text function
      const documentExtracts: string[] = [];
      for (const doc of pdfDocuments.slice(0, 5)) { // Limit to 5 PDFs to avoid timeout
        try {
          const pdfResponse = await supabase.functions.invoke("extract-pdf-text", {
            body: { filePath: doc.file_path, bucketName: "project-documents" },
          });
          if (!pdfResponse.error && pdfResponse.data?.text) {
            documentExtracts.push(`📄 ${doc.file_name}:\n${pdfResponse.data.text.substring(0, 1500)}...`);
          }
        } catch (pdfError) {
          console.warn(`PDF extraction failed for ${doc.file_name}:`, pdfError);
        }
      }
      
      if (documentExtracts.length > 0) {
        uploadedDocumentsSummary = `
== UPLOADED DOCUMENTS CONTENT (Added Later) ==
${documentExtracts.join("\n\n")}
`;
      }
      
      // Also list non-PDF documents
      const otherDocs = documents.filter((d: any) => 
        !d.file_name?.toLowerCase().endsWith('.pdf')
      );
      if (otherDocs.length > 0) {
        uploadedDocumentsSummary += `
Other Uploaded Files: ${otherDocs.map((d: any) => d.file_name).join(", ")}
`;
      }
    }

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
${uploadedDocumentsSummary}
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

    // M.E.S.S.A. (Multi-Engine Structural Site Analysis) Audit Report Prompt
    const aiPrompt = `You are a Senior Construction Engineer performing a **M.E.S.S.A. AUDIT REPORT** (Multi-Engine Structural Site Analysis) for BuildUnion. This is an engineering-grade project integrity assessment.

## YOUR ROLE
You are conducting a ZERO-TOLERANCE engineering audit. Every data point must be verified. Conflicts must be flagged. Missing information must be explicitly stated. Do NOT assume compliance - verify it.

## PROJECT DATA - ${weatherData ? "17" : "16"} VERIFIED SOURCES
${projectContext}

## AUDIT METHODOLOGY
This analysis follows the M.E.S.S.A. Protocol:
- **PHASE 1**: Data Completeness Verification (8 Pillars + 8 Workflow Sources)
- **PHASE 2**: Cross-Reference Validation (detect conflicts between sources)
- **PHASE 3**: Regulatory Alignment Check (OBC Preliminary Assessment)
- **PHASE 4**: Operational Readiness Score Calculation

---

Generate a professional **M.E.S.S.A. AUDIT REPORT** with the following structure:

# 🔬 M.E.S.S.A. AUDIT REPORT
**Project:** [Project Name]
**Audit Date:** [Today]
**Classification:** [VERIFIED | CONDITIONAL | INCOMPLETE]

---

## 1. EXECUTIVE AUDIT SUMMARY
| Metric | Status |
|--------|--------|
| Data Completeness | [X/16 sources verified] |
| Operational Readiness | [X%] |
| Risk Classification | [LOW/MEDIUM/HIGH/CRITICAL] |
| Audit Verdict | [PASS/CONDITIONAL/FAIL] |

**Summary Statement:** (2-3 sentences with engineering precision about project state)

---

## 2. OPERATIONAL TRUTH VERIFICATION (8 Pillars)

### ✅ Confirmed Data Points
(List verified pillars with values and confidence)

### ⚠️ Pending Verification
(List pillars needing manual validation)

### ❌ Missing/Conflicting Data
(List any data gaps or conflicts detected)

---

## 3. WORKFLOW STATUS MATRIX

| Data Source | Status | Last Updated | Notes |
|-------------|--------|--------------|-------|
| Tasks | [Complete/Partial/Missing] | [Date] | [Details] |
| Documents | [X files] | [Date] | [Types] |
| Contracts | [Draft/Sent/Signed] | [Date] | [Client Status] |
| Team | [X members] | [Date] | [Roles] |
| Timeline | [Set/Pending] | [Date] | [Duration] |
| Client Info | [Complete/Partial] | [Date] | [Contact Status] |
| Site Map | [Available/Missing] | [Date] | [Address] |
| Budget | [$X CAD] | [Date] | [Breakdown] |

---

## 4. STRUCTURAL ANALYSIS

### 4.1 Area & Material Assessment
- **Confirmed Area:** [Value with confidence %]
- **Material Count:** [X items verified]
- **Cost Estimate Basis:** [Source of truth]

### 4.2 Blueprint/Document Analysis
- **Blueprint Status:** [Analyzed/Pending/None]
- **Document Integration:** [X documents contributing to analysis]

---

## 5. REGULATORY ALIGNMENT (OBC Preliminary)

**OBC Status:** [PASS | CONDITIONAL | REQUIRES REVIEW]
**Risk Level:** [LOW | MEDIUM | HIGH]

### Compliance Notes:
(Based on project scope, flag any OBC-relevant considerations)

### Requires Professional Review If:
(List conditions requiring licensed professional sign-off)

---

## 6. CONFLICT DETECTION LOG

${weatherData && weatherData.alerts && weatherData.alerts.length > 0 ? `### ⚠️ ACTIVE WEATHER CONFLICTS
${weatherData.alerts.map(a => `- **[${a.severity.toUpperCase()}]** ${a.type}: ${a.message}`).join("\n")}
` : ""}
### Data Consistency Check:
(Flag any mismatches between sources - e.g., task costs vs budget, timeline vs contract dates)

---

## 7. RISK ASSESSMENT MATRIX

| Risk Factor | Severity | Impact | Mitigation |
|-------------|----------|--------|------------|
| [Risk 1] | [H/M/L] | [Description] | [Action] |
| [Risk 2] | [H/M/L] | [Description] | [Action] |

---

${weatherData ? `## 8. ENVIRONMENTAL IMPACT ANALYSIS

**Current Conditions:** ${weatherData.temperature ?? "N/A"}°C - ${weatherData.description || "N/A"}

### Weather Risk Assessment:
- Construction Impact: [Analysis of current/forecast conditions]
- Schedule Risk: [Weather-related delays potential]
- Safety Considerations: [Worker safety factors]

### 3-Day Operational Forecast:
${weatherData.forecast?.slice(0, 3).map(f => `- **${f.date}:** ${f.temp_min}°C to ${f.temp_max}°C - ${f.description}`).join("\n") || "Forecast unavailable"}

---

` : ""}
## 9. ACTIONABLE RECOMMENDATIONS

### Immediate Actions (Next 24-48h):
1. [Critical action 1]
2. [Critical action 2]

### Short-Term Actions (This Week):
1. [Action with specific deliverable]
2. [Action with specific deliverable]

### Documentation Gaps to Address:
- [Missing document/verification 1]
- [Missing document/verification 2]

---

## 10. AUDIT CONCLUSION

**Final Verdict:** [VERIFIED | CONDITIONAL | INCOMPLETE]

**Confidence Level:** [X% based on data completeness]

**Next Audit Recommended:** [Date or trigger condition]

---
*M.E.S.S.A. Audit Report generated by BuildUnion AI Engine*
*Report Classification: Engineering-Grade Project Intelligence*

---

**IMPORTANT GUIDELINES:**
- Use Canadian English and CAD currency
- Be precise with numbers - no rounding without noting it
- Flag ALL missing data explicitly
- If data conflicts exist, report them prominently
- Professional engineering tone throughout
- Every claim must trace to a data source`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: "You are a Senior Construction Engineer performing M.E.S.S.A. (Multi-Engine Structural Site Analysis) audits. Generate precise, engineering-grade project intelligence reports. Zero tolerance for assumptions - verify all data, flag all gaps, detect all conflicts. Professional Canadian construction industry standards apply." },
          { role: "user", content: aiPrompt },
        ],
        max_tokens: maxTokens,
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
        tier,
        modelUsed: selectedModel,
        tokensUsed: maxTokens,
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
