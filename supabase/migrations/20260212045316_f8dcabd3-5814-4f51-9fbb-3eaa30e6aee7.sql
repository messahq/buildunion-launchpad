-- Create RPC function for vector similarity search on OBC chunks
CREATE OR REPLACE FUNCTION public.match_obc_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (chunk_id uuid, chunk_text text, section_number text, similarity float)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    oe.chunk_id,
    oc.chunk_text,
    os.section_number,
    (1 - (oe.embedding <=> query_embedding))::float as similarity
  FROM public.obc_embeddings oe
  JOIN public.obc_chunks oc ON oc.id = oe.chunk_id
  JOIN public.obc_sections os ON os.id = oc.section_id
  WHERE oe.embedding IS NOT NULL
    AND (1 - (oe.embedding <=> query_embedding)) > match_threshold
  ORDER BY oe.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;