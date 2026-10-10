CREATE OR REPLACE FUNCTION public.search_knowledge(query_text text, match_count integer DEFAULT 10, filter_team text DEFAULT NULL::text, filter_source text DEFAULT NULL::text)
 RETURNS TABLE(chunk_id uuid, document_id uuid, content text, title text, source_type text, team_tags text[], rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ts_q tsquery;
  cleaned text;
BEGIN
  -- Build an OR-joined tsquery from the input words so partial matches return results.
  cleaned := regexp_replace(coalesce(query_text, ''), '[^a-zA-Z0-9\s]', ' ', 'g');
  cleaned := trim(regexp_replace(cleaned, '\s+', ' ', 'g'));

  IF cleaned = '' THEN
    RETURN;
  END IF;

  BEGIN
    ts_q := to_tsquery('english', array_to_string(
      ARRAY(
        SELECT word FROM unnest(string_to_array(cleaned, ' ')) AS word
        WHERE length(word) > 1
      ),
      ' | '
    ));
  EXCEPTION WHEN OTHERS THEN
    ts_q := plainto_tsquery('english', cleaned);
  END;

  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.content,
    d.title,
    d.source_type,
    d.team_tags,
    ts_rank(c.search_vector, ts_q) AS rank
  FROM public.rag_chunks c
  JOIN public.rag_documents d ON d.id = c.document_id
  WHERE d.status = 'ready'
    AND c.search_vector @@ ts_q
    AND (filter_team IS NULL OR filter_team = ANY(d.team_tags))
    AND (filter_source IS NULL OR d.source_type = filter_source)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$function$;