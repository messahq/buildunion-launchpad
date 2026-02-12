import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

function chunkText(text: string, maxChars = 1200, overlap = 150): string[] {
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

// @ts-ignore - Supabase.ai is available in edge runtime
const model = new Supabase.ai.Session('gte-small');

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const embedding = await model.run(text, { mean_pool: true, normalize: true });
    return Array.from(embedding);
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support batch processing: ?offset=0&limit=5
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "5");

    const { data: sections, error: secErr } = await supabase
      .from("obc_sections")
      .select("*")
      .order("section_number")
      .range(offset, offset + limit - 1);

    if (secErr) throw secErr;
    if (!sections?.length) {
      return new Response(
        JSON.stringify({ done: true, message: "No more sections" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let chunksCreated = 0;
    let embeddingsCreated = 0;

    for (const section of sections) {
      // Check if chunks already exist for this section
      const { count } = await supabase
        .from("obc_chunks")
        .select("id", { count: "exact", head: true })
        .eq("section_id", section.id);

      if (count && count > 0) {
        console.log(`Skipping ${section.section_number} - already has chunks`);
        continue;
      }

      const fullText = `OBC 2024 - ${section.section_number} ${section.section_title}\n\n${section.content || ""}`;
      const textChunks = chunkText(fullText);

      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];

        const { data: chunk, error: chunkErr } = await supabase
          .from("obc_chunks")
          .insert({
            section_id: section.id,
            chunk_index: i,
            chunk_text: chunkContent,
            char_count: chunkContent.length,
            token_estimate: Math.ceil(chunkContent.length / 4),
          })
          .select("id")
          .single();

        if (chunkErr) {
          console.error(`Chunk error ${section.section_number}:`, chunkErr);
          continue;
        }
        chunksCreated++;

        const embedding = await generateEmbedding(chunkContent);
        if (embedding) {
          const vectorStr = `[${embedding.join(",")}]`;
          const { error: embErr } = await supabase
            .from("obc_embeddings")
            .insert({
              chunk_id: chunk.id,
              embedding: vectorStr,
              embedding_model: "gte-small",
            });

          if (!embErr) embeddingsCreated++;
          else console.error("Embedding insert error:", embErr);
        }
      }
    }

    const totalSections = (await supabase.from("obc_sections").select("id", { count: "exact", head: true })).count || 0;
    const nextOffset = offset + limit;

    return new Response(
      JSON.stringify({
        success: true,
        batch: { offset, limit, processed: sections.length },
        chunks_created: chunksCreated,
        embeddings_created: embeddingsCreated,
        next: nextOffset < totalSections ? `?offset=${nextOffset}&limit=${limit}` : null,
        total_sections: totalSections,
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
