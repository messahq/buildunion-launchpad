import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an Ontario Building Code (OBC) 2024 compliance analyst for residential construction projects (Part 9).

Your task is to produce a DETAILED compliance analysis with:
1. Specific OBC section references (e.g., "Section 9.23.17.2")
2. Concrete requirements per section
3. PASS/WARNING/FAIL status for each check
4. Actionable steps when issues are found
5. Contact information for relevant municipal authorities
6. Timelines for permit processing
7. Penalties for non-compliance

You must base your reasoning only on the provided project data.
If information is missing, explicitly state what is missing and what action is needed.
Do not assume compliance.

Required Output Format (STRICT JSON only, no markdown):
{
  "obc_status": "PASS" | "CONDITIONAL" | "FAIL",
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "complianceChecklist": [
    {
      "code": "OBC Section X.XX.XX",
      "requirement": "What is required",
      "status": "PASS" | "WARNING" | "FAIL",
      "issueDescription": "What the problem is (if not PASS)",
      "actionRequired": "Specific steps to resolve",
      "contactInfo": "Who to contact (phone, dept)",
      "timeline": "Expected processing time",
      "penalty": "Consequences if ignored",
      "notes": "Additional context"
    }
  ],
  "permitStatus": {
    "required": true | false,
    "obtained": false,
    "permitSection": "OBC Section 1.3.1.2",
    "applicationSteps": ["Step 1", "Step 2"],
    "documentsNeeded": ["Document 1", "Document 2"],
    "contactInfo": "Municipal building dept phone/address",
    "processingTime": "2-4 weeks",
    "penalty": "$5,000-$50,000 fine + Stop Work Order",
    "notes": "Additional context"
  },
  "materialChecks": [
    {
      "material": "Material name",
      "obcSection": "Section reference",
      "requirement": "What code requires",
      "status": "PASS" | "WARNING" | "FAIL",
      "specification": "Required specification detail"
    }
  ],
  "safetyChecks": [
    {
      "category": "Fire Resistance | Scaffolding | Moisture | Vapor | Structural",
      "regulation": "OBC or OHSA reference",
      "requirement": "What is required",
      "status": "PASS" | "WARNING" | "FAIL",
      "actionRequired": "Steps if not compliant"
    }
  ],
  "recommendations": ["Actionable recommendation strings"],
  "overallStatus": "COMPLIANT | CONDITIONAL | NON-COMPLIANT",
  "reasoning": ["Short concrete explanation bullets"],
  "missing_information": ["List of missing items"],
  "requires_professional_review": true | false,
  "legalDisclaimer": "This is an automated preliminary analysis only."
}

IMPORTANT CONTEXT:
- Location is always Ontario, Canada
- For Toronto/GTA projects, the municipal contact is Toronto Building at 416-338-2220
- For Etobicoke, use City of Toronto - Etobicoke Civic Centre at 416-338-2220
- Building permits under OBC Section 1.3.1.2 are required for most structural/mechanical work
- OHSA Regulation 213/91 covers construction safety (scaffolding, fall protection)
- Fire resistance ratings per OBC Part 3 and Part 9
- Moisture/vapor barriers per OBC 9.25.3
- Structural requirements per OBC 9.23

Be as specific as possible with section numbers, phone numbers, and timelines.`;

interface OBCCheckInput {
  project_type?: string;
  scope_of_work?: string;
  confirmed_area_sqft?: number;
  materials?: string[] | { item?: string; name?: string }[];
  blueprint_status?: "none" | "uploaded" | "manually_verified";
  structural_changes?: boolean | null;
  mechanical_changes?: boolean | null;
  electrical_changes?: boolean | null;
  load_bearing_work?: boolean | null;
  project_mode?: "solo" | "team";
  conflict_status?: "none" | "detected" | "ignored";
  data_confidence?: "low" | "medium" | "high";
  location?: string;
  trade_type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData } = await req.json() as { projectData: OBCCheckInput };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const materialsArr = Array.isArray(projectData.materials) ? projectData.materials : [];
    const materialsStr = materialsArr.length > 0
      ? materialsArr.map(m => typeof m === 'string' ? m : (m.item || m.name || 'Unknown')).join(", ")
      : "Not specified";

    const userPrompt = JSON.stringify({
      project_type: projectData.project_type || "unknown",
      scope_of_work: projectData.scope_of_work || "Not specified",
      location: projectData.location || "Ontario, Canada",
      trade_type: projectData.trade_type || "general_contractor",
      confirmed_area_sqft: projectData.confirmed_area_sqft || 0,
      materials: materialsStr,
      blueprint_status: projectData.blueprint_status || "none",
      structural_changes: projectData.structural_changes ?? "unknown",
      mechanical_changes: projectData.mechanical_changes ?? "unknown",
      electrical_changes: projectData.electrical_changes ?? "unknown",
      load_bearing_work: projectData.load_bearing_work ?? "unknown",
      project_mode: projectData.project_mode || "solo",
      conflict_status: projectData.conflict_status || "none",
      data_confidence: projectData.data_confidence || "medium"
    }, null, 2);

    console.log("OBC Check input:", userPrompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
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
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("OBC Check AI response:", content);

    let result: any;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse OBC response:", parseError);
      result = {
        obc_status: "CONDITIONAL",
        risk_level: "MEDIUM",
        complianceChecklist: [
          {
            code: "OBC Section 1.3.1.2",
            requirement: "Building permit required for construction work",
            status: "WARNING",
            issueDescription: "Unable to verify permit status",
            actionRequired: "Contact municipal building department to verify permit requirements",
            contactInfo: "Toronto Building: 416-338-2220",
            timeline: "2-4 weeks processing",
            penalty: "$5,000-$50,000 fine + Stop Work Order",
            notes: "AI analysis returned partial results"
          }
        ],
        permitStatus: {
          required: true,
          obtained: false,
          permitSection: "OBC Section 1.3.1.2",
          applicationSteps: ["Submit application to municipal building department", "Provide required documentation", "Pay application fee", "Wait for review and approval"],
          documentsNeeded: ["Site plan", "Structural drawings", "WSIB certificate", "Proof of insurance"],
          contactInfo: "Toronto Building: 416-338-2220",
          processingTime: "2-4 weeks",
          penalty: "$5,000-$50,000 fine + Stop Work Order"
        },
        materialChecks: [],
        safetyChecks: [],
        recommendations: ["Verify building permit status before starting work", "Consult a professional engineer for structural assessments"],
        overallStatus: "CONDITIONAL",
        reasoning: ["Partial analysis completed"],
        missing_information: ["Complete AI analysis unavailable"],
        requires_professional_review: true,
        legalDisclaimer: "This is an automated preliminary analysis only."
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        rawResponse: content
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OBC Status Check error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        result: {
          obc_status: "CONDITIONAL",
          risk_level: "MEDIUM",
          complianceChecklist: [],
          permitStatus: { required: true, obtained: false, permitSection: "OBC Section 1.3.1.2", contactInfo: "Toronto Building: 416-338-2220", processingTime: "2-4 weeks", penalty: "$5,000-$50,000 fine + Stop Work Order" },
          materialChecks: [],
          safetyChecks: [],
          recommendations: ["Error during analysis. Consult a professional."],
          overallStatus: "CONDITIONAL",
          reasoning: ["Error during compliance check"],
          missing_information: [],
          requires_professional_review: true
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
