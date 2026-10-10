
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- RAG Documents table - stores metadata about ingested content
CREATE TABLE public.rag_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'youtube', 'twitter')),
  source_url TEXT,
  team_tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RAG Chunks table - stores text chunks with embeddings and full-text search
CREATE TABLE public.rag_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient search
CREATE INDEX idx_rag_chunks_search ON public.rag_chunks USING gin(search_vector);
CREATE INDEX idx_rag_chunks_embedding ON public.rag_chunks USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_rag_chunks_document_id ON public.rag_chunks(document_id);
CREATE INDEX idx_rag_documents_source_type ON public.rag_documents(source_type);
CREATE INDEX idx_rag_documents_team_tags ON public.rag_documents USING gin(team_tags);

-- RLS: Public read access (global knowledge base), no auth required
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read documents" ON public.rag_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read chunks" ON public.rag_chunks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role can manage documents" ON public.rag_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage chunks" ON public.rag_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to search knowledge base using full-text search
CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_text TEXT,
  match_count INTEGER DEFAULT 10,
  filter_team TEXT DEFAULT NULL,
  filter_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  title TEXT,
  source_type TEXT,
  team_tags TEXT[],
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.content,
    d.title,
    d.source_type,
    d.team_tags,
    ts_rank(c.search_vector, websearch_to_tsquery('english', query_text)) AS rank
  FROM public.rag_chunks c
  JOIN public.rag_documents d ON d.id = c.document_id
  WHERE d.status = 'ready'
    AND c.search_vector @@ websearch_to_tsquery('english', query_text)
    AND (filter_team IS NULL OR filter_team = ANY(d.team_tags))
    AND (filter_source IS NULL OR d.source_type = filter_source)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Storage bucket for uploaded PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('rag-documents', 'rag-documents', false);

-- Storage RLS: anyone can upload, service role manages
CREATE POLICY "Anyone can upload to rag-documents" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'rag-documents');
CREATE POLICY "Service role full access to rag-documents" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'rag-documents') WITH CHECK (bucket_id = 'rag-documents');
CREATE POLICY "Anyone can read rag-documents" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'rag-documents');
