import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Chunk text into ~500 token segments with overlap
function chunkText(text: string, maxChars = 1500, overlap = 200): string[] {
  if (!text || text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length - overlap) break;
  }
  return chunks;
}

// Generate embedding using Supabase built-in gte-small model (384 dimensions)
// @ts-ignore - Supabase.ai is available in edge runtime
const model = new Supabase.ai.Session('gte-small');

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const embedding = await model.run(text, {
      mean_pool: true,
      normalize: true,
    });
    // Convert Float32Array or similar to regular array
    return Array.from(embedding);
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Fetch all OBC sections
    const { data: sections, error: secErr } = await supabase
      .from("obc_sections")
      .select("*")
      .order("section_number");

    if (secErr) throw secErr;
    if (!sections?.length) {
      return new Response(
        JSON.stringify({ error: "No OBC sections found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let chunksCreated = 0;
    let embeddingsCreated = 0;

    for (const section of sections) {
      const fullText = `OBC 2024 - ${section.section_number} ${section.section_title}\n\n${section.content || ""}`;
      const textChunks = chunkText(fullText);

      for (let i = 0; i < textChunks.length; i++) {
        const chunkText_ = textChunks[i];

        // Insert chunk
        const { data: chunk, error: chunkErr } = await supabase
          .from("obc_chunks")
          .insert({
            section_id: section.id,
            chunk_index: i,
            chunk_text: chunkText_,
            char_count: chunkText_.length,
            token_estimate: Math.ceil(chunkText_.length / 4),
          })
          .select()
          .single();

        if (chunkErr) {
          console.error(`Chunk insert error for ${section.section_number}:`, chunkErr);
          continue;
        }
        chunksCreated++;

        // Generate and store embedding
        const embedding = await generateEmbedding(chunkText_);
        if (embedding) {
          const vectorStr = `[${embedding.join(",")}]`;
          const { error: embErr } = await supabase
            .from("obc_embeddings")
            .insert({
              chunk_id: chunk.id,
              embedding: vectorStr,
              embedding_model: "gte-small",
            });

          if (embErr) {
            console.error(`Embedding insert error:`, embErr);
          } else {
            embeddingsCreated++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sections_processed: sections.length,
        chunks_created: chunksCreated,
        embeddings_created: embeddingsCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OBC embedding pipeline error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
