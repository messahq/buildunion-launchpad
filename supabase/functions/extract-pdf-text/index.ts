import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID validation regex (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid);
}

// Simple PDF text extraction using pdf.js compatible approach
async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  try {
    // Import pdfjs-dist for text extraction
    const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs");
    
    // Disable worker for edge function environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += `\n[Page ${i}]\n${pageText}\n`;
    }
    
    return fullText.trim();
  } catch (err) {
    console.error("PDF extraction error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Failed to extract text from PDF: ${errorMsg}`);
  }
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidUUID(projectId)) {
      return new Response(
        JSON.stringify({ error: "Project ID must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Authorization: verify user has access to project ───
    const { data: canView } = await supabaseAuth.rpc("can_view_all_project_data", {
      _project_id: projectId,
      _user_id: userId,
    });

    if (!canView) {
      return new Response(
        JSON.stringify({ error: "Forbidden — no access to this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for storage/document access
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project documents
    const { data: documents, error: docsError } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      throw new Error("Failed to fetch project documents");
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          documents: [],
          totalText: "",
          message: "No documents found for this project" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedDocuments: Array<{
      fileName: string;
      text: string;
      pageCount?: number;
      error?: string;
    }> = [];

    // Process each document
    for (const doc of documents) {
      try {
        // Only process PDF files
        if (!doc.file_name.toLowerCase().endsWith(".pdf")) {
          extractedDocuments.push({
            fileName: doc.file_name,
            text: `[Non-PDF file: ${doc.file_name}]`,
          });
          continue;
        }

        // Download the file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("project-documents")
          .download(doc.file_path);

        if (downloadError) {
          console.error(`Error downloading ${doc.file_name}:`, downloadError);
          extractedDocuments.push({
            fileName: doc.file_name,
            text: "",
            error: "Failed to download file",
          });
          continue;
        }

        // Extract text from PDF
        const arrayBuffer = await fileData.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        
        extractedDocuments.push({
          fileName: doc.file_name,
          text: text,
        });

        console.log(`Extracted ${text.length} characters from ${doc.file_name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing ${doc.file_name}:`, err);
        extractedDocuments.push({
          fileName: doc.file_name,
          text: "",
          error: errorMsg,
        });
      }
    }

    // Combine all text with document headers
    const totalText = extractedDocuments
      .filter(d => d.text && !d.error)
      .map(d => `=== DOCUMENT: ${d.fileName} ===\n${d.text}`)
      .join("\n\n");

    return new Response(
      JSON.stringify({
        success: true,
        documents: extractedDocuments.map(d => ({
          fileName: d.fileName,
          textLength: d.text?.length || 0,
          error: d.error,
        })),
        totalText,
        totalCharacters: totalText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Extract PDF error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});