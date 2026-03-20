// BuildUnion AI Router — "Operational Truth Router"
// Routes construction tasks to optimal model based on tier, complexity & cost-efficiency
// Phase 2: Unified Gemini + OpenAI routing with tier enforcement

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Server-Side Tier Resolution ───────────────────────────
const PRODUCT_TIERS: Record<string, string> = {
  "prod_Tog02cwkocBGA0": "pro",
  "prod_Tog0mYcKDEXUfl": "premium",
  "prod_Tog7TlfoWskDXG": "pro",
  "prod_Tog8IdlcfqOduT": "premium",
};

async function resolveUserTier(authHeader: string): Promise<{ tier: "free" | "pro" | "premium"; userId: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user) throw new Error("Invalid token");

  const userId = userData.user.id;
  const email = userData.user.email;
  if (!email) return { tier: "free", userId };

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return { tier: "free", userId };

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) return { tier: "free", userId };
    const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, limit: 1 });
    const valid = subs.data.find((s: Stripe.Subscription) => s.status === "active" || s.status === "trialing");
    if (!valid) return { tier: "free", userId };
    const productId = valid.items.data[0].price.product as string;
    const tier = (PRODUCT_TIERS[productId] as "pro" | "premium") || "free";
    return { tier, userId };
  } catch {
    return { tier: "free", userId };
  }
}

// ─── Model Registry (Tiered) ──────────────────────────────
const MODELS = {
  // Gemini (Visual + Multimodal)
  GEMINI_PRO: "google/gemini-2.5-pro",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GEMINI_FLASH_LITE: "google/gemini-2.5-flash-lite",
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",
  // OpenAI (Reasoning + Validation)
  GPT5_2: "openai/gpt-5.2",
  GPT5_MINI: "openai/gpt-5-mini",
  GPT5_NANO: "openai/gpt-5-nano",
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

// High-stakes tasks → stronger models
const ENGINEER_TASKS: TaskCategory[] = [
  "gfa_calculation",
  "obc_interpretation",
  "financial_modeling",
  "risk_analysis",
];

// Structured generation → cheaper models
const ARCHITECT_TASKS: TaskCategory[] = [
  "trade_scope",
  "line_item_generation",
  "template_categorization",
];

// ─── Routing Input/Output ──────────────────────────────────
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
  force_model?: "engineer" | "architect";
  stream?: boolean;
}

interface RoutingDecision {
  model: string;
  engine_label: string;
  reason: string;
  escalated: boolean;
  tier: string;
  max_tokens: number;
}

// ─── Complexity Detection ──────────────────────────────────
function classifyTask(input: RoutingInput): TaskCategory {
  if (input.task_type && input.task_type !== "general") return input.task_type;

  const promptLower = input.prompt.toLowerCase();

  const engineerSignals = [
    /\b(gfa|gross floor area|square\s*f(oo)?t|sq\s*ft|area\s*calc)/i,
    /\b(obc|building code|part\s*9|section\s*9\.\d+|regulation)/i,
    /\b(budget|cost\s*model|contingency|financial|profit\s*margin|markup)/i,
    /\b(risk|structural|load\s*bearing|foundation|permit)/i,
  ];
  const engineerScore = engineerSignals.filter((r) => r.test(promptLower)).length;

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

  const wordCount = promptLower.split(/\s+/).length;
  const hasNumbers = /\d+(\.\d+)?/.test(promptLower);
  if (wordCount > 150 && hasNumbers) return "financial_modeling";

  return "general";
}

// ─── Tier-Aware Model Routing ──────────────────────────────
function routeToModel(input: RoutingInput, tier: "free" | "pro" | "premium"): RoutingDecision {
  const category = classifyTask(input);
  const isEngineerTask = ENGINEER_TASKS.includes(category);
  const isArchitectTask = ARCHITECT_TASKS.includes(category);

  // Non-standard scope → escalation candidate
  const isNonStandard = (input.context?.obc_references?.length ?? 0) > 0
    || (input.context?.dimensions && Object.keys(input.context.dimensions).length > 3)
    || input.prompt.length > 2000;

  // Manual override (respects tier ceiling)
  if (input.force_model === "engineer") {
    const model = tier === "premium" ? MODELS.GPT5_2 : tier === "pro" ? MODELS.GEMINI_FLASH : MODELS.GEMINI_FLASH_LITE;
    return {
      model,
      engine_label: tier === "premium" ? "GPT-5.2 (The Engineer)" : `Gemini ${tier === "pro" ? "Flash" : "Flash-Lite"} (Engineer Mode)`,
      reason: `Manual override: force_model=engineer (tier: ${tier})`,
      escalated: false,
      tier,
      max_tokens: tier === "premium" ? 4096 : tier === "pro" ? 2048 : 1024,
    };
  }
  if (input.force_model === "architect") {
    const model = tier === "premium" ? MODELS.GPT5_MINI : tier === "pro" ? MODELS.GEMINI_FLASH_LITE : MODELS.GEMINI_FLASH_LITE;
    return {
      model,
      engine_label: tier === "premium" ? "GPT-5-mini (Architect's Assistant)" : "Gemini Flash-Lite (Architect Mode)",
      reason: `Manual override: force_model=architect (tier: ${tier})`,
      escalated: false,
      tier,
      max_tokens: tier === "premium" ? 2048 : 1024,
    };
  }

  // ── PREMIUM: Full power ──
  if (tier === "premium") {
    if (isEngineerTask) {
      return {
        model: MODELS.GPT5_2,
        engine_label: "GPT-5.2 (The Engineer)",
        reason: `Task "${category}" — premium high-stakes reasoning`,
        escalated: false,
        tier,
        max_tokens: 4096,
      };
    }
    if (isArchitectTask) {
      if (isNonStandard) {
        return {
          model: MODELS.GEMINI_FLASH,
          engine_label: "Gemini 2.5 Flash (Escalated Architect)",
          reason: `Task "${category}" escalated — non-standard scope`,
          escalated: true,
          tier,
          max_tokens: 2048,
        };
      }
      return {
        model: MODELS.GPT5_MINI,
        engine_label: "GPT-5-mini (Architect's Assistant)",
        reason: `Task "${category}" — structured generation`,
        escalated: false,
        tier,
        max_tokens: 2048,
      };
    }
    return {
      model: MODELS.GEMINI_FLASH,
      engine_label: "Gemini 2.5 Flash (General)",
      reason: "Default premium routing — general task",
      escalated: false,
      tier,
      max_tokens: 2048,
    };
  }

  // ── PRO: Gemini Flash primary, escalate to Flash on complex ──
  if (tier === "pro") {
    if (isEngineerTask) {
      return {
        model: MODELS.GEMINI_FLASH,
        engine_label: "Gemini 2.5 Flash (Engineer Mode)",
        reason: `Task "${category}" — pro-tier reasoning`,
        escalated: false,
        tier,
        max_tokens: 2048,
      };
    }
    if (isArchitectTask && isNonStandard) {
      return {
        model: MODELS.GEMINI_FLASH,
        engine_label: "Gemini 2.5 Flash (Escalated)",
        reason: `Task "${category}" escalated — non-standard scope`,
        escalated: true,
        tier,
        max_tokens: 1500,
      };
    }
    return {
      model: MODELS.GEMINI_FLASH_LITE,
      engine_label: "Gemini 2.5 Flash-Lite (Pro)",
      reason: `Task "${category}" — cost-efficient structured gen`,
      escalated: false,
      tier,
      max_tokens: 1024,
    };
  }

  // ── FREE: Flash-Lite only ──
  return {
    model: MODELS.GEMINI_FLASH_LITE,
    engine_label: "Gemini 2.5 Flash-Lite (Free)",
    reason: `Free tier — "${category}" routed to Flash-Lite`,
    escalated: false,
    tier,
    max_tokens: 800,
  };
}

// ─── System Prompts ────────────────────────────────────────
function getSystemPrompt(decision: RoutingDecision, context?: RoutingInput["context"]): string {
  const base = `You are BuildUnion's "${decision.engine_label}", part of the Operational Truth system for construction project management in Ontario, Canada.

OPERATIONAL CONSTRAINTS:
- DETERMINISTIC FIRST: Never use AI for basic arithmetic. Only reason about logic and interpretation.
- NO HALLUCINATIONS: If data is missing, return: "ERROR: Missing Project Data — [specify what's needed]"
- VALIDATION: All financial totals must be cross-verified before output.
- OUTPUT: Respond in Strict Structured JSON unless explicitly asked otherwise.
- CURRENCY: CAD ($). Tax: 13% HST (Ontario).
- REGULATIONS: Ontario Building Code (OBC), Part 9 for residential.`;

  if (decision.model.startsWith("openai/gpt-5.2")) {
    return `${base}

ENGINEER SPECIALIZATION:
- GFA & Area calculations with waste factor validation
- OBC interpretation with section references
- Complex financial modeling: budgets, contingencies, profit margins
- Risk assessment and regulatory compliance
- Show formula, inputs, and result separately
- Cross-reference all numbers against provided project data`;
  }

  if (decision.model.startsWith("openai/gpt-5-mini")) {
    return `${base}

ARCHITECT'S ASSISTANT SPECIALIZATION:
- Trade scope creation with standardized descriptions
- Line item generation with quantity/unit/price structure
- Template-based categorization (Materials, Labor, Demolition, Equipment)
- Efficient, high-volume structured text generation
- Follow BuildUnion's item naming conventions`;
  }

  // Gemini models — universal construction prompt
  return `${base}

GEMINI ENGINE SPECIALIZATION:
- Visual & multimodal analysis of construction documents
- Dimensional extraction, area calculation, material identification
- Trade scope generation and line item structuring
- OBC compliance flagging based on project context
- Cross-verify all extracted values against project data`;
}

// ─── Main Handler ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — missing or invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side tier resolution
    const { tier, userId } = await resolveUserTier(authHeader);
    console.log(`[AI-Router] User: ${userId}, Tier: ${tier}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const input: RoutingInput = await req.json();

    if (!input.prompt || typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "ERROR: Missing Project Data — 'prompt' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tier-aware routing
    const decision = routeToModel(input, tier);
    const systemPrompt = getSystemPrompt(decision, input.context);

    console.log(`[AI-Router] ${decision.engine_label} | Tier: ${tier} | Escalated: ${decision.escalated} | Reason: ${decision.reason}`);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: input.prompt },
    ];

    if (input.context) {
      const contextMsg = `PROJECT CONTEXT (verified data):\n${JSON.stringify(input.context, null, 2)}`;
      messages.splice(1, 0, { role: "system", content: contextMsg });
    }

    const shouldStream = input.stream === true;

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
        max_tokens: decision.max_tokens,
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

    if (shouldStream) {
      return new Response(aiResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-BU-Engine": decision.engine_label,
          "X-BU-Tier": tier,
          "X-BU-Escalated": String(decision.escalated),
        },
      });
    }

    const result = await aiResponse.json();

    // Log usage
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("ai_model_usage").insert({
        user_id: userId,
        function_name: "ai-router",
        model_used: decision.model,
        tier,
        tokens_used: result.usage?.total_tokens ?? null,
        success: true,
      });
    } catch (logErr) {
      console.warn("[AI-Router] Usage logging failed:", logErr);
    }

    return new Response(
      JSON.stringify({
        routing: {
          model: decision.model,
          engine: decision.engine_label,
          reason: decision.reason,
          escalated: decision.escalated,
          tier,
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
