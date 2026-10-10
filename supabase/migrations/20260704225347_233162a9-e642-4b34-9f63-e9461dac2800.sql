DELETE FROM public.rag_documents a
USING public.rag_documents b
WHERE a.metadata->>'source' = 'kaggle'
  AND b.metadata->>'source' = 'kaggle'
  AND a.source_url = b.source_url
  AND a.created_at < b.created_at;