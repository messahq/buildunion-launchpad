import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
// INSTANT DOCUMENT CLASSIFIER
// Called immediately after file upload to verify
// whether a document is a legitimate regulatory/permit
// document or irrelevant (CV, recipe, etc.)
// ============================================

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CLASSIFY-DOC] ${step}`, details ? JSON.stringify(details) : '');
};

// ============================================
// PDF TEXT EXTRACTION
// ============================================
async function extractPdfText(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient.storage
      .from('project-documents')
      .download(filePath);

    if (error || !data) {
      log('Failed to download PDF', { filePath, error: error?.message });
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(uint8);

    let text = '';

    // Extract from stream blocks
    const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = streamPattern.exec(raw)) !== null) {
      const printable = m[1].replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (printable.length > 20) text += printable + ' ';
    }

    // Extract from BT...ET text objects
    const textPattern = /BT([\s\S]*?)ET/g;
    while ((m = textPattern.exec(raw)) !== null) {
      const strPattern = /\(([^)]{1,200})\)/g;
      let s;
      while ((s = strPattern.exec(m[1])) !== null) {
        const clean = s[1].replace(/[^\x20-\x7E]/g, ' ').trim();
        if (clean.length > 2) text += clean + ' ';
      }
    }

    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 6000) text = text.substring(0, 6000) + '...';
    log('PDF text extracted', { filePath, chars: text.length });
    return text.length > 30 ? text : null;
  } catch (err) {
    log('PDF extraction error', { filePath, error: String(err) });
    return null;
  }
}

// ============================================
// IMAGE-BASED DOCUMENT VERIFICATION (Gemini Vision)
// For scanned permits, photographed documents, etc.
// ============================================
async function fetchImageAsBase64(filePath: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const { data, error } = await supabaseClient.storage
      .from('project-documents')
      .download(filePath);

    if (error || !data) return null;

    const arrayBuffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    
    // Size limit: 1.5MB base64
    if (uint8.length > 1.5 * 1024 * 1024) {
      log('Image too large for classification', { filePath, sizeKB: Math.round(uint8.length / 1024) });
      return null;
    }

    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);
    
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp',
    };
    return { base64, mimeType: mimeMap[ext] || 'image/jpeg' };
  } catch {
    return null;
  }
}

// ============================================
// CORE CLASSIFICATION — AI-powered
// Handles both PDFs (text) and Images (vision)
// ============================================
async function classifyDocument(
  fileName: string,
  filePath: string,
  mimeType: string,
): Promise<{
  is_regulatory: boolean;
  doc_type: string;
  confidence: string;
  key_details: string;
  classification_method: string;
}> {
  if (!LOVABLE_API_KEY) {
    return { is_regulatory: false, doc_type: 'Unverified — no API key', confidence: 'none', key_details: '', classification_method: 'none' };
  }

  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

  // ── PDF: Extract text → Gemini text classification ──
  if (isPdf) {
    const pdfText = await extractPdfText(filePath);
    
    if (!pdfText || pdfText.length < 30) {
      // No extractable text → try vision on first page would be ideal,
      // but for now mark as unverifiable
      return {
        is_regulatory: false,
        doc_type: 'Unreadable PDF — no extractable text',
        confidence: 'low',
        key_details: 'Could not extract text from this PDF. Re-upload a text-based PDF or a clear scan.',
        classification_method: 'text_extraction_failed',
      };
    }

    const systemPrompt = `You are a senior Canadian construction compliance officer and forensic document analyst.
Your job is to determine if uploaded documents are LEGITIMATE regulatory/construction documents.

LEGITIMATE documents include ONLY:
- Building permits (municipal, provincial)
- Inspection reports (framing, plumbing, electrical, fire, final)
- Certificate of Occupancy (CO)
- Structural/civil/geotechnical engineer reports
- Zoning certificates, variance approvals
- Site plan approvals, grading plans
- OBC compliance certificates
- Demolition permits, septic permits
- Conservation authority approvals
- BCIN, TSSA, ESA certifications
- Approved construction drawings/specs
- Environmental assessments
- Insurance certificates (liability, WSIB)
- Trade licenses

NOT LEGITIMATE (must be REJECTED):
- Resumes / CVs / cover letters
- Personal documents (passports, driver's licenses)  
- Marketing materials, brochures
- Recipes, articles, blog posts
- Academic papers unrelated to construction
- Random photographs not of a construction site
- Financial statements not project-related
- Any document clearly unrelated to construction regulatory compliance

Be STRICT. If in doubt, reject. We protect the integrity of the compliance system.`;

    const userPrompt = `Analyze this document and classify it.

Filename: "${fileName}"
Extracted text (first 4000 chars):
${pdfText.substring(0, 4000)}

Respond in EXACTLY this format (no extra text):
IS_REGULATORY_DOC: YES or NO
DOC_TYPE: [exact type or "Not a regulatory document - [what it actually is]"]
CONFIDENCE: HIGH or MEDIUM or LOW
KEY_DETAILS: [permit#, dates, authority, scope if found — or explain why rejected]
REJECTION_REASON: [if NO: specific reason like "This is a resume/CV" or "This is a cooking recipe" — or "N/A" if YES]`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        log('AI classification failed', { status: response.status });
        return { is_regulatory: false, doc_type: 'Classification unavailable', confidence: 'none', key_details: '', classification_method: 'ai_error' };
      }

      const result = await response.json();
      const text = result.choices?.[0]?.message?.content || '';
      return parseClassificationResponse(text, 'pdf_text_ai');
    } catch (err) {
      log('PDF classification error', { error: String(err) });
      return { is_regulatory: false, doc_type: 'Classification error', confidence: 'none', key_details: '', classification_method: 'error' };
    }
  }

  // ── IMAGE: Gemini Vision classification ──
  if (isImage) {
    const imageData = await fetchImageAsBase64(filePath);
    if (!imageData) {
      return { is_regulatory: false, doc_type: 'Image not readable', confidence: 'low', key_details: '', classification_method: 'image_fetch_failed' };
    }

    const systemPrompt = `You are a forensic construction document analyst with computer vision expertise.
You must determine if this image is a LEGITIMATE construction regulatory document.

ACCEPT ONLY:
- Photographs/scans of building permits, inspection reports, certificates
- Construction site photos showing actual construction work
- Blueprint pages, architectural drawings, engineering diagrams
- Scanned insurance certificates, trade licenses
- Photos of permit boards posted on construction sites

REJECT:
- Selfies, portraits, personal photos
- Screenshots of websites, social media
- Photos of food, animals, landscapes (non-construction)
- Scanned resumes, CVs, personal documents
- Marketing materials, logos, branding
- Memes, artwork, illustrations unrelated to construction
- Photos of random objects unrelated to construction
- Stock photos

Be STRICT. Construction site photos are acceptable. Everything else must be construction-related or regulatory.`;

    const userPrompt = `Analyze this uploaded image. Filename: "${fileName}"

Is this a legitimate construction/regulatory document or site photo?

Respond in EXACTLY this format:
IS_REGULATORY_DOC: YES or NO
DOC_TYPE: [e.g. "Building Permit Scan", "Construction Site Photo", "Blueprint Page", "Not regulatory - [what it actually is]"]
CONFIDENCE: HIGH or MEDIUM or LOW
KEY_DETAILS: [what you see — permit details, construction phase, or why rejected]
REJECTION_REASON: [if NO: specific reason — or "N/A" if YES]`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } },
            ]},
          ],
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        log('Vision classification failed', { status: response.status });
        // For images, default to accepting site photos but mark low confidence
        return { is_regulatory: true, doc_type: 'Unverified image', confidence: 'low', key_details: 'Vision API unavailable', classification_method: 'vision_error' };
      }

      const result = await response.json();
      const text = result.choices?.[0]?.message?.content || '';
      return parseClassificationResponse(text, 'image_vision_ai');
    } catch (err) {
      log('Vision classification error', { error: String(err) });
      return { is_regulatory: true, doc_type: 'Unverified image', confidence: 'low', key_details: '', classification_method: 'error' };
    }
  }

  // Unknown file type
  return { is_regulatory: false, doc_type: 'Unsupported file type', confidence: 'low', key_details: '', classification_method: 'unsupported' };
}

function parseClassificationResponse(text: string, method: string) {
  const isRegMatch = text.match(/IS_REGULATORY_DOC:\s*(YES|NO)/i);
  const docTypeMatch = text.match(/DOC_TYPE:\s*(.+)/i);
  const confidenceMatch = text.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
  const keyDetailsMatch = text.match(/KEY_DETAILS:\s*(.+)/i);
  const rejectionMatch = text.match(/REJECTION_REASON:\s*(.+)/i);

  const isRegulatory = isRegMatch?.[1]?.toUpperCase() === 'YES';
  const rejectionReason = rejectionMatch?.[1]?.trim();

  return {
    is_regulatory: isRegulatory,
    doc_type: docTypeMatch?.[1]?.trim() || 'Unknown',
    confidence: (confidenceMatch?.[1]?.toLowerCase() || 'low') as string,
    key_details: isRegulatory 
      ? (keyDetailsMatch?.[1]?.trim() || '')
      : (rejectionReason && rejectionReason !== 'N/A' ? rejectionReason : keyDetailsMatch?.[1]?.trim() || 'Document not recognized as construction-related'),
    classification_method: method,
  };
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Authentication ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    log("Authenticated user", { userId });

    const { documentId, fileName, filePath, mimeType } = await req.json();

    if (!documentId || !fileName || !filePath) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentId, fileName, filePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Authorization: verify document belongs to user's project ───
    const { data: doc, error: docError } = await supabaseClient
      .from("project_documents")
      .select("project_id")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user is owner or member of the project
    const { data: canView } = await supabaseAuth.rpc("can_view_all_project_data", {
      _project_id: doc.project_id,
      _user_id: userId,
    });

    if (!canView) {
      return new Response(
        JSON.stringify({ error: "Forbidden — no access to this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Starting classification", { documentId, fileName, mimeType, userId });

    const result = await classifyDocument(fileName, filePath, mimeType || '');

    log("Classification complete", { 
      documentId, 
      fileName, 
      is_regulatory: result.is_regulatory, 
      doc_type: result.doc_type,
      confidence: result.confidence,
      method: result.classification_method,
    });

    // Persist to database
    const analysisResult = {
      ...result,
      analyzed_at: new Date().toISOString(),
      analyzer: 'instant_classify_v1',
    };

    const { error: updateError } = await supabaseClient
      .from('project_documents')
      .update({
        ai_analysis_result: analysisResult,
        ai_analysis_status: result.is_regulatory ? 'verified_regulatory' : 'rejected_non_regulatory',
      })
      .eq('id', documentId);

    if (updateError) {
      log("Failed to persist classification", { documentId, error: updateError.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        ...result,
        ai_analysis_status: result.is_regulatory ? 'verified_regulatory' : 'rejected_non_regulatory',
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    log("Handler error", { error: String(err) });
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
