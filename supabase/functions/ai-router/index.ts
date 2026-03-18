// BuildUnion AI Router — "Operational Truth Router"
// Routes construction tasks to optimal GPT model based on complexity & cost-efficiency
// Phase 1: GPT-5.2 (Engineer) + GPT-5-mini (Architect's Assistant)
// Phase 2: Gemini routing (coming next)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Model Registry ────────────────────────────────────────
const MODELS = {
  ENGINEER: "openai/gpt-5.2",    // High-stakes reasoning: GFA, OBC, financials, risk
  ARCHITECT: "openai/gpt-5-mini", // Structured generation: trade scopes, line items, templates
} as const;

// ─── Task Classification ───────────────────────────────────
type TaskCategory =
  | "gfa_calculation"
  | "obc_interpretation"
  | "financial_modeling"
  | "risk_analysis"
  | "trade_scope"
  | "line_item_generation"
  | "template_categorization"
  | "general";

// Engineer tasks (GPT-5.2): numerical consistency & regulatory compliance critical
const ENGINEER_TASKS: TaskCategory[] = [
  "gfa_calculation",
  "obc_interpretation",
  "financial_modeling",
  "risk_analysis",
];

// Architect tasks (GPT-5-mini): repetitive, high-volume structured text
const ARCHITECT_TASKS: TaskCategory[] = [
  "trade_scope",
  "line_item_generation",
  "template_categorization",
];

// ─── Complexity Detection ──────────────────────────────────
interface RoutingInput {
  task_type: TaskCategory;
  prompt: string;
  context?: {
    trade?: string;
    dimensions?: Record<string, number>;
    financials?: Record<string, number>;
    obc_references?: string[];
    project_id?: string;
  };
  force_model?: "engineer" | "architect"; // Manual override
  stream?: boolean;
}

interface RoutingDecision {
  model: string;
  engine_label: string;
  reason: string;
  escalated: boolean;
}

function classifyTask(input: RoutingInput): TaskCategory {
  if (input.task_type && input.task_type !== "general") return input.task_type;

  const promptLower = input.prompt.toLowerCase();

  // Auto-detect Engineer tasks
  const engineerSignals = [
    /\b(gfa|gross floor area|square\s*f(oo)?t|sq\s*ft|area\s*calc)/i,
    /\b(obc|building code|part\s*9|section\s*9\.\d+|regulation)/i,
    /\b(budget|cost\s*model|contingency|financial|profit\s*margin|markup)/i,
    /\b(risk|structural|load\s*bearing|foundation|permit)/i,
  ];

  const engineerScore = engineerSignals.filter((r) => r.test(promptLower)).length;

  // Auto-detect Architect tasks
  const architectSignals = [
    /\b(trade\s*scope|scope\s*of\s*work|work\s*breakdown)/i,
    /\b(line\s*item|material\s*list|bill\s*of\s*materials)/i,
    /\b(template|categori[sz]|classify|label|tag)/i,
  ];

  const architectScore = architectSignals.filter((r) => r.test(promptLower)).length;

  if (engineerScore >= 2) return "gfa_calculation";
  if (engineerScore >= 1 && /obc|code/i.test(promptLower)) return "obc_interpretation";
  if (engineerScore >= 1 && /budget|cost|financ/i.test(promptLower)) return "financial_modeling";
  if (architectScore >= 2) return "trade_scope";
  if (architectScore >= 1) return "line_item_generation";

  // Escalation heuristic: complex prompts go to Engineer
  const wordCount = promptLower.split(/\s+/).length;
  const hasNumbers = /\d+(\.\d+)?/.test(promptLower);
  if (wordCount > 150 && hasNumbers) return "financial_modeling";

  return "general";
}

function routeToModel(input: RoutingInput): RoutingDecision {
  // Manual override
  if (input.force_model === "engineer") {
    return {
      model: MODELS.ENGINEER,
      engine_label: "GPT-5.2 (The Engineer)",
      reason: "Manual override: force_model=engineer",
      escalated: false,
    };
  }
  if (input.force_model === "architect") {
    return {
      model: MODELS.ARCHITECT,
      engine_label: "GPT-5-mini (The Architect's Assistant)",
      reason: "Manual override: force_model=architect",
      escalated: false,
    };
  }

  const category = classifyTask(input);

  // Check for non-standard scope → escalate Architect to Engineer
  const isNonStandard = input.context?.obc_references?.length
    || (input.context?.dimensions && Object.keys(input.context.dimensions).length > 3)
    || (input.prompt.length > 2000);

  if (ENGINEER_TASKS.includes(category)) {
    return {
      model: MODELS.ENGINEER,
      engine_label: "GPT-5.2 (The Engineer)",
      reason: `Task classified as "${category}" — high-stakes reasoning required`,
      escalated: false,
    };
  }

  if (ARCHITECT_TASKS.includes(category)) {
    if (isNonStandard) {
      return {
        model: MODELS.ENGINEER,
        engine_label: "GPT-5.2 (The Engineer)",
        reason: `Task "${category}" escalated — non-standard scope detected`,
        escalated: true,
      };
    }
    return {
      model: MODELS.ARCHITECT,
      engine_label: "GPT-5-mini (The Architect's Assistant)",
      reason: `Task classified as "${category}" — structured generation`,
      escalated: false,
    };
  }

  // Default: Architect for cost efficiency
  return {
    model: MODELS.ARCHITECT,
    engine_label: "GPT-5-mini (The Architect's Assistant)",
    reason: "Default routing — general task",
    escalated: false,
  };
}

// ─── System Prompts per Engine ──────────────────────────────
function getSystemPrompt(decision: RoutingDecision, context?: RoutingInput["context"]): string {
  const base = `You are BuildUnion's "${decision.engine_label}", part of the Operational Truth system for construction project management in Ontario, Canada.

OPERATIONAL CONSTRAINTS:
- DETERMINISTIC FIRST: Never use AI for basic arithmetic (addition, multiplication, percentages). Only reason about logic and interpretation.
- NO HALLUCINATIONS: If data is missing (e.g., specific OBC rule number), return: "ERROR: Missing Project Data — [specify what's needed]"
- VALIDATION: All financial totals must be cross-verified before output.
- OUTPUT: Always respond in Strict Structured JSON unless explicitly asked otherwise.
- CURRENCY: CAD ($). Tax: 13% HST (Ontario).
- REGULATIONS: Ontario Building Code (OBC), Part 9 for residential.`;

  if (decision.model === MODELS.ENGINEER) {
    return `${base}

ENGINEER SPECIALIZATION:
- GFA & Area calculations with waste factor validation
- OBC (Building Code) interpretation with section references
- Complex financial modeling: budgets, contingencies, profit margins
- Risk assessment and regulatory compliance checks
- When calculating areas: show formula, inputs, and result separately
- Cross-reference all numbers against provided project data`;
  }

  return `${base}

ARCHITECT'S ASSISTANT SPECIALIZATION:
- Trade scope creation with standardized descriptions
- Line item generation with quantity/unit/price structure
- Template-based categorization (Materials, Labor, Demolition, Equipment)
- Efficient, high-volume structured text generation
- Follow BuildUnion's item naming conventions
- Group items by trade category`;
}

// ─── Main Handler ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const input: RoutingInput = await req.json();

    // Validate input
    if (!input.prompt || typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "ERROR: Missing Project Data — 'prompt' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route decision
    const decision = routeToModel(input);
    const systemPrompt = getSystemPrompt(decision, input.context);

    console.log(`[AI-Router] ${decision.engine_label} | Escalated: ${decision.escalated} | Reason: ${decision.reason}`);

    // Build messages
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: input.prompt },
    ];

    // If context provided, inject as structured data
    if (input.context) {
      const contextMsg = `PROJECT CONTEXT (verified data):\n${JSON.stringify(input.context, null, 2)}`;
      messages.splice(1, 0, { role: "system", content: contextMsg });
    }

    const shouldStream = input.stream === true;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: decision.model,
        messages,
        stream: shouldStream,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly.", routing: decision }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Workspace Settings.", routing: decision }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error(`[AI-Router] Gateway error ${aiResponse.status}:`, errText);
      throw new Error(`AI Gateway returned ${aiResponse.status}`);
    }

    // Streaming response
    if (shouldStream) {
      return new Response(aiResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-BU-Engine": decision.engine_label,
          "X-BU-Escalated": String(decision.escalated),
        },
      });
    }

    // Non-streaming: enrich response with routing metadata
    const result = await aiResponse.json();

    return new Response(
      JSON.stringify({
        routing: {
          model: decision.model,
          engine: decision.engine_label,
          reason: decision.reason,
          escalated: decision.escalated,
        },
        result: result.choices?.[0]?.message?.content ?? null,
        usage: result.usage ?? null,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI-Router] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown router error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
