
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- OBC Sections Reference Table
CREATE TABLE IF NOT EXISTS public.obc_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number TEXT NOT NULL UNIQUE,
  section_title TEXT NOT NULL,
  part_number INT NOT NULL,
  subsection_number TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- OBC Chunks Table - Text segments from OBC for RAG
CREATE TABLE IF NOT EXISTS public.obc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.obc_sections(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  char_count INT,
  token_estimate INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- OBC Embeddings Table - Vector embeddings for chunks
CREATE TABLE IF NOT EXISTS public.obc_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.obc_chunks(id) ON DELETE CASCADE,
  embedding vector(768),
  embedding_model TEXT DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trade to OBC Section Mapping
CREATE TABLE IF NOT EXISTS public.trade_obc_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_type TEXT NOT NULL,
  obc_section_id UUID NOT NULL REFERENCES public.obc_sections(id) ON DELETE CASCADE,
  relevance_score NUMERIC DEFAULT 1.0,
  required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(trade_type, obc_section_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_obc_chunks_section_id ON public.obc_chunks(section_id);
CREATE INDEX IF NOT EXISTS idx_obc_embeddings_chunk_id ON public.obc_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_obc_embeddings_vector ON public.obc_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_trade_obc_mapping_trade ON public.trade_obc_mapping(trade_type);

-- Enable RLS on all tables
ALTER TABLE public.obc_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obc_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_obc_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public Read Access for OBC Reference Data
CREATE POLICY "OBC sections are public" ON public.obc_sections FOR SELECT USING (true);
CREATE POLICY "OBC chunks are public" ON public.obc_chunks FOR SELECT USING (true);
CREATE POLICY "OBC embeddings are public" ON public.obc_embeddings FOR SELECT USING (true);
CREATE POLICY "Trade OBC mapping is public" ON public.trade_obc_mapping FOR SELECT USING (true);

-- Admin-only write access (via edge functions with service key)
CREATE POLICY "Admins can insert OBC sections" ON public.obc_sections FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can insert OBC chunks" ON public.obc_chunks FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can insert OBC embeddings" ON public.obc_embeddings FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can insert trade mappings" ON public.trade_obc_mapping FOR INSERT WITH CHECK (is_admin(auth.uid()));
