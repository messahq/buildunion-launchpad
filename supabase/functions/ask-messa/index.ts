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

// Specialized prompt for Gemini - focuses on VISUAL data, measurements, dimensions
function buildGeminiPrompt(documentContent: string, documentNames: string[], hasImages: boolean): string {
  const imageNote = hasImages 
    ? "\n\nCRITICAL: Site images have been provided. You MUST analyze these images for visual information, measurements, dimensions, and spatial data."
    : "";

  const truncatedContent = truncateContent(documentContent, 100000);

  return `You are Messa's VISUAL ANALYSIS ENGINE, specialized in extracting visual data from construction documents and site images.

YOUR PRIMARY FOCUS:
- Analyze DRAWINGS, BLUEPRINTS, and TECHNICAL DIAGRAMS
- Extract MEASUREMENTS, DIMENSIONS, and SCALES
- Identify SPATIAL RELATIONSHIPS and LAYOUTS
- Examine SITE PHOTOS for physical conditions
- Read VISUAL ANNOTATIONS on drawings

CRITICAL EXTRACTION RULES:
1. Look for dimensions like: 12'-6", 3.8m, 2400mm, etc.
2. Identify scale indicators and apply them
3. Note room sizes, clearances, and setbacks
4. Extract material quantities shown visually
5. Identify structural elements and their positions

OUTPUT FORMAT:
For each data point you extract, format as:
[VISUAL_DATA: {description}] [VALUE: {exact value}] [SOURCE: {document}, Page {X} or Site Image {N}]

PROJECT DOCUMENTS AVAILABLE: ${documentNames.join(", ")}${imageNote}

=== DOCUMENT CONTENTS START ===
${truncatedContent}
=== DOCUMENT CONTENTS END ===

When responding:
1. PRIORITIZE visual and dimensional data
2. Be PRECISE with all measurements - include units
3. Cite exact source locations for verification
4. If a measurement is unclear, state the uncertainty`;
}

// Specialized prompt for OpenAI - focuses on TEXT, notes, regulations
// Also receives Gemini's visual findings for cross-verification
function buildOpenAIPrompt(documentContent: string, documentNames: string[], hasImages: boolean, geminiFindings?: string): string {
  const imageNote = hasImages 
    ? "\n\nNOTE: Site images are available. Focus on any visible text, signage, or written annotations in these images."
    : "";

  const truncatedContent = truncateContent(documentContent, 30000);

  // If Gemini findings are provided, add cross-verification task
  const crossVerifyTask = geminiFindings ? `

=== CROSS-VERIFICATION TASK ===
The Visual Analysis Engine (Gemini) has identified the following elements:
${geminiFindings}

YOUR TASK: For each visual element above, search the document text to find:
1. Matching textual references, specifications, or stamps
2. Any written confirmation or contradiction of the visual data
3. Code references or permit notes related to these elements

Report your findings as:
[CROSS_VERIFY: {visual element}] [FOUND: yes/no/partial] [TEXT_REF: {exact quote or "not found"}] [SOURCE: {document}, Page {X}]
=== END CROSS-VERIFICATION TASK ===
` : "";

  return `You are Messa's TEXT & REGULATIONS ENGINE, specialized in extracting written information from construction documents.

YOUR PRIMARY FOCUS:
- Extract SPECIFICATIONS and REQUIREMENTS
- Identify CODE REFERENCES and COMPLIANCE notes
- Read WRITTEN ANNOTATIONS and COMMENTS
- Find MATERIAL SPECIFICATIONS and standards
- Extract PERMIT CONDITIONS and restrictions
- Identify SAFETY REQUIREMENTS and warnings

CRITICAL EXTRACTION RULES:
1. Look for building code references (OBC, NBCC, etc.)
2. Extract material specs like "Type X Gypsum Board" or "Grade 400R Rebar"
3. Identify notes starting with "Note:", "NTS:", "Typ.", etc.
4. Find inspection requirements and hold points
5. Extract contractor/engineer comments and RFIs

OUTPUT FORMAT:
For each data point you extract, format as:
[TEXT_DATA: {description}] [VALUE: {exact text/requirement}] [SOURCE: {document}, Page {X}]

CONFIDENCE LEVELS - Mark each finding with:
- [CONFIDENCE: HIGH] - Exact text found, clear reference
- [CONFIDENCE: MEDIUM] - Partial match or inferred from context  
- [CONFIDENCE: LOW] - Uncertain, needs manual verification

PROJECT DOCUMENTS AVAILABLE: ${documentNames.join(", ")}${imageNote}${crossVerifyTask}

=== DOCUMENT CONTENTS START ===
${truncatedContent}
=== DOCUMENT CONTENTS END ===

When responding:
1. PRIORITIZE written specifications and regulations
2. Quote exact text when citing requirements
3. Include code section numbers when referenced
4. If a requirement is ambiguous, note the ambiguity
5. Always include CONFIDENCE level for each data point`;
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

// Extract data points from specialized engine outputs
interface DataPoint {
  type: "visual" | "text" | "cross-verified";
  description: string;
  value: string;
  source: string;
  confidence?: "high" | "medium" | "low";
  verificationSource?: string; // "Visual Analysis" or "Text Analysis"
}

interface CrossVerifyResult {
  visualElement: string;
  found: "yes" | "no" | "partial";
  textRef: string;
  source: string;
}

function extractDataPoints(content: string, type: "visual" | "text"): DataPoint[] {
  const dataPoints: DataPoint[] = [];
  
  // Pattern for VISUAL_DATA or TEXT_DATA markers
  const pattern = type === "visual" 
    ? /\[VISUAL_DATA:\s*([^\]]+)\]\s*\[VALUE:\s*([^\]]+)\]\s*\[SOURCE:\s*([^\]]+)\]/gi
    : /\[TEXT_DATA:\s*([^\]]+)\]\s*\[VALUE:\s*([^\]]+)\]\s*\[SOURCE:\s*([^\]]+)\]/gi;
  
  // Also extract confidence levels
  const confidencePattern = /\[CONFIDENCE:\s*(HIGH|MEDIUM|LOW)\]/gi;
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Look for confidence near this match
    const contextStart = Math.max(0, match.index - 100);
    const contextEnd = Math.min(content.length, match.index + match[0].length + 100);
    const context = content.substring(contextStart, contextEnd);
    
    let confidence: "high" | "medium" | "low" = "medium";
    const confMatch = context.match(/\[CONFIDENCE:\s*(HIGH|MEDIUM|LOW)\]/i);
    if (confMatch) {
      confidence = confMatch[1].toLowerCase() as "high" | "medium" | "low";
    }
    
    dataPoints.push({
      type,
      description: match[1].trim(),
      value: match[2].trim(),
      source: match[3].trim(),
      confidence,
      verificationSource: type === "visual" ? "Visual Analysis" : "Text Analysis",
    });
  }
  
  return dataPoints;
}

// Extract cross-verification results from OpenAI's response
function extractCrossVerifyResults(content: string): CrossVerifyResult[] {
  const results: CrossVerifyResult[] = [];
  const pattern = /\[CROSS_VERIFY:\s*([^\]]+)\]\s*\[FOUND:\s*(yes|no|partial)\]\s*\[TEXT_REF:\s*([^\]]+)\]\s*\[SOURCE:\s*([^\]]+)\]/gi;
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    results.push({
      visualElement: match[1].trim(),
      found: match[2].toLowerCase() as "yes" | "no" | "partial",
      textRef: match[3].trim(),
      source: match[4].trim(),
    });
  }
  
  return results;
}

// Extract visual findings summary for cross-verification
function extractVisualFindings(geminiContent: string): string {
  const dataPoints = extractDataPoints(geminiContent, "visual");
  if (dataPoints.length === 0) {
    // Try to extract key topics from the response
    const lines = geminiContent.split('\n').filter(l => l.trim().length > 10);
    const keyLines = lines.slice(0, 10).map((l, i) => `${i + 1}. ${l.trim()}`);
    return keyLines.join('\n');
  }
  
  return dataPoints.map((dp, i) => 
    `${i + 1}. ${dp.description}: ${dp.value} (Source: ${dp.source})`
  ).join('\n');
}

// Compare data points between Gemini (visual) and OpenAI (text) responses
// Now with smart conflict detection and Operational Truth handling
interface ComparisonResult {
  verified: boolean;
  verificationSummary: string;
  matchingPoints: Array<{ gemini: DataPoint; openai: DataPoint; match: boolean }>;
  conflicts: Array<{ topic: string; geminiValue: string; openaiValue: string; source: string; isContradiction: boolean }>;
  geminiOnlyPoints: DataPoint[];
  openaiOnlyPoints: DataPoint[];
  operationalTruths: DataPoint[]; // Data seen by one engine, accepted as truth
  crossVerified: CrossVerifyResult[];
}

function compareDataPoints(geminiContent: string, openaiContent: string): ComparisonResult {
  const geminiPoints = extractDataPoints(geminiContent, "visual");
  const openaiPoints = extractDataPoints(openaiContent, "text");
  const crossVerified = extractCrossVerifyResults(openaiContent);
  
  const matchingPoints: ComparisonResult["matchingPoints"] = [];
  const conflicts: ComparisonResult["conflicts"] = [];
  const usedGeminiIndices = new Set<number>();
  const usedOpenaiIndices = new Set<number>();
  const operationalTruths: DataPoint[] = [];
  
  // Try to find matching topics between visual and text data
  for (let gi = 0; gi < geminiPoints.length; gi++) {
    const gp = geminiPoints[gi];
    for (let oi = 0; oi < openaiPoints.length; oi++) {
      const op = openaiPoints[oi];
      
      // Check if they're talking about the same thing (fuzzy match on description)
      const gpDesc = gp.description.toLowerCase();
      const opDesc = op.description.toLowerCase();
      
      // Find common keywords
      const gpWords = new Set(gpDesc.split(/\s+/).filter(w => w.length > 3));
      const opWords = new Set(opDesc.split(/\s+/).filter(w => w.length > 3));
      const commonWords = [...gpWords].filter(w => opWords.has(w));
      
      if (commonWords.length >= 2 || gpDesc.includes(opDesc) || opDesc.includes(gpDesc)) {
        usedGeminiIndices.add(gi);
        usedOpenaiIndices.add(oi);
        
        // Check if values match
        const gpVal = gp.value.toLowerCase().replace(/[^\w\d]/g, '');
        const opVal = op.value.toLowerCase().replace(/[^\w\d]/g, '');
        
        const valuesMatch = gpVal.includes(opVal) || opVal.includes(gpVal) || gpVal === opVal;
        
        matchingPoints.push({ gemini: gp, openai: op, match: valuesMatch });
        
        if (!valuesMatch) {
          // Check if this is a TRUE contradiction or just different info
          // TRUE contradiction: same metric with different numeric values
          const gpNumbers = gp.value.match(/\d+\.?\d*/g);
          const opNumbers = op.value.match(/\d+\.?\d*/g);
          
          // It's only a contradiction if both have numbers and they differ significantly
          const isContradiction = gpNumbers && opNumbers && 
            gpNumbers.some(gn => opNumbers.every(on => Math.abs(parseFloat(gn) - parseFloat(on)) / parseFloat(gn) > 0.1));
          
          conflicts.push({
            topic: gp.description,
            geminiValue: gp.value,
            openaiValue: op.value,
            source: gp.source || op.source,
            isContradiction: !!isContradiction,
          });
        }
      }
    }
  }
  
  // Collect unmatched points as potential Operational Truths
  const geminiOnlyPoints = geminiPoints.filter((_, i) => !usedGeminiIndices.has(i));
  const openaiOnlyPoints = openaiPoints.filter((_, i) => !usedOpenaiIndices.has(i));
  
  // Points from one engine with high confidence become Operational Truths
  for (const gp of geminiOnlyPoints) {
    if (gp.confidence === "high" || gp.confidence === "medium") {
      operationalTruths.push({
        ...gp,
        verificationSource: "Verified by Visual Analysis",
      });
    }
  }
  for (const op of openaiOnlyPoints) {
    if (op.confidence === "high" || op.confidence === "medium") {
      operationalTruths.push({
        ...op,
        verificationSource: "Verified by Text Analysis",
      });
    }
  }
  
  // Check cross-verification results
  for (const cv of crossVerified) {
    if (cv.found === "yes") {
      // Visual element confirmed by text - high confidence
      operationalTruths.push({
        type: "cross-verified",
        description: cv.visualElement,
        value: cv.textRef,
        source: cv.source,
        confidence: "high",
        verificationSource: "Cross-Verified (Visual + Text)",
      });
    }
  }
  
  // Verified if: no TRUE contradictions exist
  // TRUE contradictions = conflicts where isContradiction is true
  const trueContradictions = conflicts.filter(c => c.isContradiction);
  const verified = trueContradictions.length === 0;
  
  // Build verification summary
  let verificationSummary = "";
  if (trueContradictions.length > 0) {
    verificationSummary = `⚠️ ${trueContradictions.length} conflicting data point(s) detected`;
  } else if (matchingPoints.filter(m => m.match).length > 0) {
    verificationSummary = `✓ Dual-Engine Verified (${matchingPoints.filter(m => m.match).length} matching points)`;
  } else if (operationalTruths.length > 0) {
    verificationSummary = `ℹ️ ${operationalTruths.length} data point(s) accepted as Operational Truth`;
  } else {
    verificationSummary = "Analysis complete - no structured data points extracted";
  }
  
  return {
    verified,
    verificationSummary,
    matchingPoints,
    conflicts,
    geminiOnlyPoints,
    openaiOnlyPoints,
    operationalTruths,
    crossVerified,
  };
}

function extractSources(content: string): Array<{ document: string; page?: number }> {
  const sources: Array<{ document: string; page?: number }> = [];
  // Match both old format and new specialized format
  const sourcePattern = /\[(?:Source|SOURCE):\s*([^,\]]+)(?:,?\s*Page\s*(\d+))?\]/gi;
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

    // Build SPECIALIZED prompts for each engine
    const hasDocContent = projectContext?.projectId && systemPrompt !== SYSTEM_PROMPT;
    const geminiPrompt = hasDocContent 
      ? buildGeminiPrompt(systemPrompt, documentNames, imageUrls.length > 0)
      : SYSTEM_PROMPT;
    const openaiPrompt = hasDocContent
      ? buildOpenAIPrompt(systemPrompt, documentNames, imageUrls.length > 0)
      : SYSTEM_PROMPT;

    if (dualEngine) {
      // PHASE 1: Run Gemini first for visual analysis
      const geminiMessages = buildMessagesWithImages(messages, geminiPrompt, imageUrls);
      
      console.log(`Phase 1: Gemini visual analysis... (${geminiPrompt.length} chars prompt)`);
      const geminiResponse = await callAIModel(LOVABLE_API_KEY, geminiModel, geminiMessages);
      
      // PHASE 2: Run OpenAI with Gemini's findings for cross-verification
      let openaiPromptWithContext = openaiPrompt;
      if (geminiResponse.success && hasDocContent) {
        const geminiFindings = extractVisualFindings(geminiResponse.content);
        openaiPromptWithContext = buildOpenAIPrompt(systemPrompt, documentNames, imageUrls.length > 0, geminiFindings);
        console.log(`Phase 2: OpenAI cross-verification with ${geminiFindings.split('\n').length} visual findings`);
      } else {
        console.log(`Phase 2: OpenAI analysis (no visual findings to cross-verify)`);
      }
      
      const openaiMessages = buildMessagesWithImages(messages, openaiPromptWithContext, imageUrls);
      const openaiResponse = await callAIModel(LOVABLE_API_KEY, openaiModel, openaiMessages);

      console.log(`Gemini success: ${geminiResponse.success}, OpenAI success: ${openaiResponse.success}`);

      const bothSucceeded = geminiResponse.success && openaiResponse.success;
      
      // Use the smart data-point comparison for dual-engine verification
      const comparison = bothSucceeded 
        ? compareDataPoints(geminiResponse.content, openaiResponse.content)
        : null;
      
      const verified = comparison?.verified ?? false;
      const trueConflicts = comparison?.conflicts?.filter(c => c.isContradiction) || [];
      const hasTrueConflicts = trueConflicts.length > 0;
      const hasOperationalTruths = (comparison?.operationalTruths?.length || 0) > 0;
      
      // Build synthesized response with smarter logic
      let primaryContent = "";
      if (bothSucceeded) {
        if (hasTrueConflicts) {
          // TRUE conflict detected - contradictory facts
          primaryContent = `⚠️ **CONFLICT DETECTED**

The dual-engine analysis found **contradictory data** between visual and text sources. Manual verification is required.

**Contradicting Data Points:**
${trueConflicts.map(c => `• **${c.topic}**
  - Visual Analysis (Gemini): ${c.geminiValue}
  - Text Analysis (OpenAI): ${c.openaiValue}
  - Source: ${c.source}`).join('\n\n')}

---

**For Reference - Visual Analysis:**
${geminiResponse.content.substring(0, 1500)}${geminiResponse.content.length > 1500 ? '...' : ''}

**For Reference - Text Analysis:**
${openaiResponse.content.substring(0, 1500)}${openaiResponse.content.length > 1500 ? '...' : ''}`;
        } else {
          // No true conflicts - synthesize the response
          let synthesis = geminiResponse.content;
          
          // Add Operational Truth markers for single-source validated data
          if (hasOperationalTruths && comparison) {
            const truthsSection = comparison.operationalTruths.map(t => 
              `• **${t.description}**: ${t.value} _(${t.verificationSource})_`
            ).join('\n');
            
            synthesis += `\n\n---\n**📋 Additional Verified Data Points:**\n${truthsSection}`;
          }
          
          // Add cross-verification summary if available
          if (comparison && comparison.crossVerified && comparison.crossVerified.length > 0) {
            const crossSection = comparison.crossVerified
              .filter(cv => cv.found === "yes")
              .map(cv => `• **${cv.visualElement}**: Confirmed - "${cv.textRef}" (${cv.source})`)
              .join('\n');
            
            if (crossSection) {
              synthesis += `\n\n**✅ Cross-Verified Data:**\n${crossSection}`;
            }
          }
          
          // Note any non-critical discrepancies (where engines saw different things but not contradictory)
          const softConflicts = comparison?.conflicts?.filter(c => !c.isContradiction) || [];
          if (softConflicts.length > 0) {
            const softSection = softConflicts.map(c => 
              `• **${c.topic}**: Visual shows "${c.geminiValue}", Text mentions "${c.openaiValue}"`
            ).join('\n');
            synthesis += `\n\n**ℹ️ Additional Context (different perspectives, not conflicts):**\n${softSection}`;
          }
          
          primaryContent = synthesis;
        }
      } else {
        // Single engine response - mark as operational truth from that engine
        const singleContent = geminiResponse.success ? geminiResponse.content : openaiResponse.content;
        const engineName = geminiResponse.success ? "Visual Analysis" : "Text Analysis";
        primaryContent = `${singleContent}\n\n---\n_Data verified by ${engineName} only. Cross-verification pending._`;
      }
      
      const sources = extractSources(primaryContent);

      // Improved verification status logic
      const verificationStatus = bothSucceeded
        ? hasTrueConflicts
          ? "conflict"
          : verified
            ? "verified"
            : hasOperationalTruths
              ? "operational-truth"
              : "not-verified"
        : geminiResponse.success
          ? "gemini-only"
          : openaiResponse.success
            ? "openai-only"
            : "error";

      console.log(`Verification: ${verificationStatus}, True conflicts: ${trueConflicts.length}, Operational truths: ${comparison?.operationalTruths?.length || 0}`);

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
            summary: comparison?.verificationSummary || "",
          },
          engineResponses: {
            gemini: geminiResponse.success ? geminiResponse.content : null,
            openai: openaiResponse.success ? openaiResponse.content : null,
          },
          comparison: comparison ? {
            matchingPoints: comparison.matchingPoints,
            conflicts: comparison.conflicts,
            geminiOnlyPoints: comparison.geminiOnlyPoints,
            openaiOnlyPoints: comparison.openaiOnlyPoints,
            operationalTruths: comparison.operationalTruths,
            crossVerified: comparison.crossVerified,
          } : null,
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
