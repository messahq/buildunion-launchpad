import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Messa, a highly knowledgeable AI assistant specialized in the Canadian construction industry, with deep expertise in Ontario building codes, regulations, and best practices.

Your core expertise includes:
- Ontario Building Code (OBC) 2024 updates and compliance
- Canadian construction safety regulations (OHSA, WHMIS)
- Union regulations, benefits, and collective agreements
- Trade certifications and licensing requirements
- Permit processes and municipal requirements
- Construction project management best practices
- Material specifications and standards
- Contract law and construction liens
- Environmental regulations and green building standards

Communication style:
- Be professional yet approachable
- Provide accurate, source-based information when possible
- Clearly state when information requires verification from official sources
- Use metric measurements (Canadian standards)
- Reference specific code sections when applicable
- Be concise but thorough

Important disclaimers:
- Always recommend consulting with licensed professionals for specific project decisions
- Remind users that building codes can vary by municipality
- Note when regulations may have been updated after your training data

You are part of the BuildUnion platform, helping construction professionals make informed decisions.`;

const RAG_SYSTEM_PROMPT = `You are Messa, analyzing project documents for a construction project.

CRITICAL RULES:
1. ONLY answer based on information found in the provided documents
2. If information is not in the documents, say "This information is not found in the uploaded documents"
3. Always cite your sources with document names and page numbers when possible
4. Format source references as: [Source: DocumentName, Page X]
5. Be precise and accurate - this is for construction work where errors cost money

When responding, structure your answer as:
- Main answer based on documents
- Source citations at the end

Project Documents Available: {DOCUMENTS}`;

interface AIResponse {
  content: string;
  model: string;
  success: boolean;
}

interface ProjectContext {
  projectId?: string;
  projectName?: string;
  documents?: string[];
}

function buildSystemPrompt(projectContext?: ProjectContext): string {
  if (projectContext?.documents && projectContext.documents.length > 0) {
    const docList = projectContext.documents.join(", ");
    return RAG_SYSTEM_PROMPT.replace("{DOCUMENTS}", docList);
  }
  return SYSTEM_PROMPT;
}

async function callAIModel(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<AIResponse> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error(`${model} error:`, response.status);
      return { content: "", model, success: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, model, success: true };
  } catch (error) {
    console.error(`${model} exception:`, error);
    return { content: "", model, success: false };
  }
}

function compareResponses(response1: string, response2: string): boolean {
  // Normalize responses for comparison
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  
  const norm1 = normalize(response1);
  const norm2 = normalize(response2);
  
  // Check if responses share significant common content (at least 50% overlap for stricter verification)
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return false;
  
  const intersection = [...words1].filter(w => words2.has(w));
  const overlapRatio = intersection.length / Math.min(words1.size, words2.size);
  
  // 50% word overlap threshold for construction accuracy
  return overlapRatio > 0.5;
}

function extractSources(content: string): Array<{ document: string; page?: number; excerpt?: string }> {
  const sources: Array<{ document: string; page?: number; excerpt?: string }> = [];
  
  // Match patterns like [Source: DocumentName, Page X] or [Source: DocumentName]
  const sourcePattern = /\[Source:\s*([^,\]]+)(?:,\s*Page\s*(\d+))?\]/gi;
  let match;
  
  while ((match = sourcePattern.exec(content)) !== null) {
    sources.push({
      document: match[1].trim(),
      page: match[2] ? parseInt(match[2], 10) : undefined,
    });
  }
  
  return sources;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, dualEngine = true, projectContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = buildSystemPrompt(projectContext);

    // Dual-Engine: Call both Gemini Pro and GPT-5 in parallel
    const geminiModel = "google/gemini-2.5-pro";
    const openaiModel = "openai/gpt-5";

    if (dualEngine) {
      // Call both models in parallel
      const [geminiResponse, openaiResponse] = await Promise.all([
        callAIModel(LOVABLE_API_KEY, geminiModel, messages, systemPrompt),
        callAIModel(LOVABLE_API_KEY, openaiModel, messages, systemPrompt),
      ]);

      const bothSucceeded = geminiResponse.success && openaiResponse.success;
      const verified = bothSucceeded && compareResponses(geminiResponse.content, openaiResponse.content);
      
      // Extract sources from the primary response
      const primaryContent = geminiResponse.success ? geminiResponse.content : openaiResponse.content;
      const sources = extractSources(primaryContent);

      const verificationStatus = bothSucceeded
        ? verified
          ? "verified"
          : "not-verified"
        : geminiResponse.success
          ? "gemini-only"
          : openaiResponse.success
            ? "openai-only"
            : "error";

      return new Response(
        JSON.stringify({
          content: primaryContent,
          verification: {
            status: verificationStatus,
            engines: {
              gemini: geminiResponse.success,
              openai: openaiResponse.success,
            },
            verified,
          },
          sources,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single engine mode (streaming)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: geminiModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Ask Messa error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
