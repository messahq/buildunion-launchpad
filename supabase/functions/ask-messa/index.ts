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

// Truncate content to fit within model context limits
function truncateContent(content: string, maxChars: number = 50000): string {
  if (content.length <= maxChars) return content;
  
  // Truncate and add notice
  return content.substring(0, maxChars) + 
    "\n\n[... Document content truncated due to length. Focus on the content above for your analysis. ...]";
}

function buildRAGPrompt(documentContent: string, documentNames: string[], hasImages: boolean, forOpenAI: boolean = false): string {
  const imageNote = hasImages 
    ? "\n\nNOTE: Site images have been provided. You can analyze and reference visual information from these images when answering questions."
    : "";

  // OpenAI has smaller context, so truncate more aggressively
  const maxChars = forOpenAI ? 30000 : 100000;
  const truncatedContent = truncateContent(documentContent, maxChars);

  return `You are Messa, analyzing project documents for a construction project.

CRITICAL RULES:
1. ONLY answer based on information found in the provided documents and images below
2. If information is not in the documents or images, clearly state: "This information is not found in the uploaded materials."
3. Always cite your sources with document names and page numbers
4. Format citations as: [Source: DocumentName, Page X] or [Source: Site Image X]
5. Be precise and accurate - this is for construction work where errors cost money
6. If documents are empty or unreadable, inform the user
7. When analyzing images, describe what you see and how it relates to the project

PROJECT DOCUMENTS AVAILABLE: ${documentNames.join(", ")}${imageNote}

=== DOCUMENT CONTENTS START ===
${truncatedContent}
=== DOCUMENT CONTENTS END ===

When responding:
1. Answer based ONLY on the document content and images above
2. Include source citations with page numbers or image references
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
  siteImages?: string[];
}

interface ExtractedContent {
  textContent: string;
  imageUrls: string[];
  documents: string[];
}

async function extractDocumentContent(projectId: string, siteImagePaths: string[] = []): Promise<ExtractedContent> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project documents
    const { data: documents, error: docsError } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId);

    const documentNames: string[] = [];
    let allContent = "";
    const imageUrls: string[] = [];

    // Process PDF documents
    if (!docsError && documents && documents.length > 0) {
      for (const doc of documents) {
        documentNames.push(doc.file_name);

        // Only process PDF files
        if (!doc.file_name.toLowerCase().endsWith(".pdf")) {
          allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Non-PDF file - content not extracted]\n`;
          continue;
        }

        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("project-documents")
            .download(doc.file_path);

          if (downloadError) {
            console.error(`Error downloading ${doc.file_name}:`, downloadError);
            allContent += `\n=== DOCUMENT: ${doc.file_name} ===\n[Error: Could not download file]\n`;
            continue;
          }

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
    }

    // Process site images - get public URLs for vision analysis
    if (siteImagePaths && siteImagePaths.length > 0) {
      console.log(`Processing ${siteImagePaths.length} site images`);
      for (let i = 0; i < siteImagePaths.length; i++) {
        const path = siteImagePaths[i];
        const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(path);
        if (urlData?.publicUrl) {
          imageUrls.push(urlData.publicUrl);
          documentNames.push(`[Site Image ${i + 1}]`);
        }
      }
      
      if (imageUrls.length > 0) {
        allContent += `\n=== SITE IMAGES ===\n${imageUrls.length} site images are attached for visual analysis.\n`;
      }
    }

    return { textContent: allContent, imageUrls, documents: documentNames };
  } catch (error) {
    console.error("Error extracting document content:", error);
    return { textContent: "", imageUrls: [], documents: [] };
  }
}

// Simple PDF text extraction
async function extractPDFText(pdfData: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(pdfData);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    
    const textContent: string[] = [];
    
    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches) {
      for (const match of textMatches) {
        const inner = match.slice(1, -1);
        const cleaned = inner.replace(/[\x00-\x1F\x7F-\xFF]/g, " ").trim();
        if (cleaned.length > 2 && !/^[\d\s.]+$/.test(cleaned)) {
          textContent.push(cleaned);
        }
      }
    }

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

interface MessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

function buildMessagesWithImages(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  imageUrls: string[]
): Array<{ role: string; content: string | MessageContent[] }> {
  const result: Array<{ role: string; content: string | MessageContent[] }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add messages, but for the last user message, include images if available
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (i === messages.length - 1 && msg.role === "user" && imageUrls.length > 0) {
      // Build multimodal content for the last user message
      const content: MessageContent[] = [
        { type: "text", text: msg.content }
      ];
      
      // Add up to 4 images to avoid token limits
      const imagesToAdd = imageUrls.slice(0, 4);
      for (const url of imagesToAdd) {
        content.push({
          type: "image_url",
          image_url: { url }
        });
      }
      
      result.push({ role: "user", content });
    } else {
      result.push(msg);
    }
  }

  return result;
}

async function callAIModel(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string | MessageContent[] }>,
): Promise<AIResponse> {
  try {
    console.log(`Calling ${model} with ${messages.length} messages`);
    
    // Use max_completion_tokens for OpenAI models, max_tokens for others
    const isOpenAI = model.startsWith("openai/");
    const tokenParam = isOpenAI 
      ? { max_completion_tokens: 4096 }
      : { max_tokens: 4096 };
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...tokenParam,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${model} error:`, response.status, errorText);
      return { content: "", model, success: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`${model} responded with ${content.length} chars`);
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

    let systemPrompt = SYSTEM_PROMPT;
    let documentNames: string[] = [];
    let imageUrls: string[] = [];

    // Extract document content and site images if projectId is provided
    if (projectContext?.projectId) {
      console.log("Extracting documents for project:", projectContext.projectId);
      console.log("Site images provided:", projectContext.siteImages?.length || 0);
      
      const extracted = await extractDocumentContent(
        projectContext.projectId,
        projectContext.siteImages || []
      );
      
      documentNames = extracted.documents;
      imageUrls = extracted.imageUrls;
      
      if (extracted.textContent && extracted.textContent.length > 100) {
        // Store raw content for building model-specific prompts
        systemPrompt = extracted.textContent;
        console.log(`Extracted ${extracted.textContent.length} chars, ${imageUrls.length} images`);
      } else if (imageUrls.length > 0) {
        systemPrompt = "[No text documents uploaded]";
        console.log("Using image-only analysis mode");
      } else {
        console.log("No substantial document content found, using standard prompt");
      }
    }

    const geminiModel = "google/gemini-2.5-pro";
    const openaiModel = "openai/gpt-5";

    // Build prompts - use different truncation limits for each model
    const hasDocContent = projectContext?.projectId && systemPrompt !== SYSTEM_PROMPT;
    const geminiPrompt = hasDocContent 
      ? buildRAGPrompt(systemPrompt, documentNames, imageUrls.length > 0, false)
      : SYSTEM_PROMPT;
    const openaiPrompt = hasDocContent
      ? buildRAGPrompt(systemPrompt, documentNames, imageUrls.length > 0, true)
      : SYSTEM_PROMPT;

    if (dualEngine) {
      // Build messages with images for vision-capable models, using model-specific prompts
      const geminiMessages = buildMessagesWithImages(messages, geminiPrompt, imageUrls);
      const openaiMessages = buildMessagesWithImages(messages, openaiPrompt, imageUrls);

      console.log(`Starting dual engine analysis... Gemini prompt: ${geminiPrompt.length} chars, OpenAI prompt: ${openaiPrompt.length} chars`);
      
      const [geminiResponse, openaiResponse] = await Promise.all([
        callAIModel(LOVABLE_API_KEY, geminiModel, geminiMessages),
        callAIModel(LOVABLE_API_KEY, openaiModel, openaiMessages),
      ]);

      console.log(`Gemini success: ${geminiResponse.success}, OpenAI success: ${openaiResponse.success}`);

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

      console.log(`Verification status: ${verificationStatus}`);

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
          engineResponses: {
            gemini: geminiResponse.success ? geminiResponse.content : null,
            openai: openaiResponse.success ? openaiResponse.content : null,
          },
          sources,
          documentsAnalyzed: documentNames,
          imagesAnalyzed: imageUrls.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single engine mode (streaming) - text only
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
