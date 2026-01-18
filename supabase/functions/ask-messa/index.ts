import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function buildRAGPrompt(documentContent: string, documentNames: string[]): string {
  return `You are Messa, analyzing project documents for a construction project.

CRITICAL RULES:
1. ONLY answer based on information found in the provided documents below
2. If information is not in the documents, clearly state: "This information is not found in the uploaded documents."
3. Always cite your sources with document names and page numbers
4. Format citations as: [Source: DocumentName, Page X]
5. Be precise and accurate - this is for construction work where errors cost money
6. If documents are empty or unreadable, inform the user

PROJECT DOCUMENTS AVAILABLE: ${documentNames.join(", ")}

=== DOCUMENT CONTENTS START ===
${documentContent}
=== DOCUMENT CONTENTS END ===

When responding:
1. Answer based ONLY on the document content above
2. Include source citations with page numbers
3. If you cannot find relevant information, say so clearly`;
}

interface AIResponse {
  content: string;
  model: string;
  success: boolean;
}

interface ProjectContext {
  projectId?: string;
  projectName?: string;
  documents?: string[];
  documentContent?: string;
}

async function extractDocumentContent(projectId: string): Promise<{ content: string; documents: string[] }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project documents
    const { data: documents, error: docsError } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId);

    if (docsError || !documents || documents.length === 0) {
      console.log("No documents found for project:", projectId);
      return { content: "", documents: [] };
    }

    const documentNames: string[] = [];
    let allContent = "";

    for (const doc of documents) {
      documentNames.push(doc.file_name);

      // Only process PDF files
      if (!doc.file_name.toLowerCase().endsWith(".pdf")) {
        allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Non-PDF file - content not extracted]\n`;
        continue;
      }

      try {
        // Download the file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("project-documents")
          .download(doc.file_path);

        if (downloadError) {
          console.error(`Error downloading ${doc.file_name}:`, downloadError);
          allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Error: Could not download file]\n`;
          continue;
        }

        // Extract text using simple text extraction
        const arrayBuffer = await fileData.arrayBuffer();
        const text = await extractPDFText(arrayBuffer);
        
        if (text) {
          allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n${text}\n`;
          console.log(`Extracted ${text.length} chars from ${doc.file_name}`);
        } else {
          allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Could not extract text from PDF]\n`;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing ${doc.file_name}:`, err);
        allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Error: ${errorMsg}]\n`;
      }
    }

    return { content: allContent, documents: documentNames };
  } catch (error) {
    console.error("Error extracting document content:", error);
    return { content: "", documents: [] };
  }
}

// Simple PDF text extraction - extracts raw text from PDF
async function extractPDFText(pdfData: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(pdfData);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    
    // Extract text between stream markers (simplified extraction)
    const textContent: string[] = [];
    
    // Look for text in parentheses (PDF text operators)
    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches) {
      for (const match of textMatches) {
        const inner = match.slice(1, -1);
        // Filter out binary/control characters
        const cleaned = inner.replace(/[\x00-\x1F\x7F-\xFF]/g, " ").trim();
        if (cleaned.length > 2 && !/^[\d\s.]+$/.test(cleaned)) {
          textContent.push(cleaned);
        }
      }
    }

    // Also try to find Tj/TJ text operators
    const tjMatches = text.match(/\[([^\]]+)\]\s*TJ/g);
    if (tjMatches) {
      for (const match of tjMatches) {
        const innerMatches = match.match(/\(([^)]+)\)/g);
        if (innerMatches) {
          for (const inner of innerMatches) {
            const cleaned = inner.slice(1, -1).replace(/[\x00-\x1F\x7F-\xFF]/g, " ").trim();
            if (cleaned.length > 2) {
              textContent.push(cleaned);
            }
          }
        }
      }
    }

    const result = textContent.join(" ").replace(/\s+/g, " ").trim();
    return result || "[PDF text could not be extracted - may be scanned/image-based]";
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return "[Error extracting PDF text]";
  }
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
        max_tokens: 4096,
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
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  
  const norm1 = normalize(response1);
  const norm2 = normalize(response2);
  
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return false;
  
  const intersection = [...words1].filter(w => words2.has(w));
  const overlapRatio = intersection.length / Math.min(words1.size, words2.size);
  
  return overlapRatio > 0.5;
}

function extractSources(content: string): Array<{ document: string; page?: number }> {
  const sources: Array<{ document: string; page?: number }> = [];
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

    // Extract document content if projectId is provided
    let systemPrompt = SYSTEM_PROMPT;
    let documentNames: string[] = [];

    if (projectContext?.projectId) {
      console.log("Extracting documents for project:", projectContext.projectId);
      const { content, documents } = await extractDocumentContent(projectContext.projectId);
      documentNames = documents;
      
      if (content && content.length > 100) {
        systemPrompt = buildRAGPrompt(content, documents);
        console.log(`Built RAG prompt with ${content.length} characters from ${documents.length} documents`);
      } else {
        console.log("No substantial document content found, using standard prompt");
      }
    }

    const geminiModel = "google/gemini-2.5-pro";
    const openaiModel = "openai/gpt-5";

    if (dualEngine) {
      const [geminiResponse, openaiResponse] = await Promise.all([
        callAIModel(LOVABLE_API_KEY, geminiModel, messages, systemPrompt),
        callAIModel(LOVABLE_API_KEY, openaiModel, messages, systemPrompt),
      ]);

      const bothSucceeded = geminiResponse.success && openaiResponse.success;
      const verified = bothSucceeded && compareResponses(geminiResponse.content, openaiResponse.content);
      
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
          documentsAnalyzed: documentNames,
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Ask Messa error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
