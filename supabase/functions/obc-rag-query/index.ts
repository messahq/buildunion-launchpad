import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate embedding for query text
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://ai.lovable.dev/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        input: text,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

interface RAGRequest {
  trade_type?: string;
  query?: string;
  project_context?: string;
  top_k?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RAGRequest = await req.json();
    const { trade_type, query, project_context, top_k = 5 } = body;

    const results: Array<{
      section_number: string;
      section_title: string;
      content: string;
      relevance_score: number;
      source: string;
    }> = [];

    // === Strategy 1: Trade-based mapping (fast, deterministic) ===
    if (trade_type) {
      const { data: mappings, error: mapErr } = await supabase
        .from("trade_obc_mapping")
        .select(`
          relevance_score,
          required,
          obc_section_id,
          obc_sections!inner (
            id,
            section_number,
            section_title,
            content
          )
        `)
        .eq("trade_type", trade_type)
        .order("relevance_score", { ascending: false });

      if (!mapErr && mappings) {
        for (const m of mappings) {
          const section = (m as any).obc_sections;
          if (section) {
            results.push({
              section_number: section.section_number,
              section_title: section.section_title,
              content: section.content || "",
              relevance_score: Number(m.relevance_score),
              source: "trade_mapping",
            });
          }
        }
      }
    }

    // === Strategy 2: Semantic search via embeddings ===
    if (query || project_context) {
      const searchText = [query, project_context].filter(Boolean).join(" — ");
      const embedding = await generateQueryEmbedding(searchText);

      if (embedding) {
        // Use raw SQL for vector similarity search via RPC
        const vectorStr = `[${embedding.join(",")}]`;

        // Query chunks with cosine similarity
        const { data: chunks, error: chunkErr } = await supabase
          .rpc("match_obc_chunks", {
            query_embedding: vectorStr,
            match_threshold: 0.5,
            match_count: top_k,
          });

        if (!chunkErr && chunks) {
          for (const chunk of chunks) {
            // Avoid duplicates from trade mapping
            const exists = results.some(
              (r) => r.section_number === chunk.section_number
            );
            if (!exists) {
              results.push({
                section_number: chunk.section_number,
                section_title: chunk.section_title,
                content: chunk.chunk_text,
                relevance_score: Number(chunk.similarity),
                source: "semantic_search",
              });
            }
          }
        }
      }

      // Fallback: text search on obc_sections if no embeddings available
      if (results.length === 0 && query) {
        const { data: textResults, error: textErr } = await supabase
          .from("obc_sections")
          .select("*")
          .or(`section_title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(top_k);

        if (!textErr && textResults) {
          for (const s of textResults) {
            results.push({
              section_number: s.section_number,
              section_title: s.section_title,
              content: s.content || "",
              relevance_score: 0.5,
              source: "text_search_fallback",
            });
          }
        }
      }
    }

    // Sort by relevance and limit
    results.sort((a, b) => b.relevance_score - a.relevance_score);
    const limited = results.slice(0, top_k);

    // Build combined context string for AI consumption
    const contextString = limited
      .map(
        (r) =>
          `[OBC §${r.section_number} — ${r.section_title}]\n${r.content}`
      )
      .join("\n\n---\n\n");

    return new Response(
      JSON.stringify({
        success: true,
        sections: limited,
        context: contextString,
        total_results: limited.length,
        strategies_used: [...new Set(limited.map((r) => r.source))],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OBC RAG query error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
