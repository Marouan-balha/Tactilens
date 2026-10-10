import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const FOOTBALL_KEYWORDS = [
  'football', 'soccer', 'match', 'goal', 'assist', 'tackle', 'possession',
  'formation', 'tactics', 'manager', 'coach', 'striker', 'midfielder',
  'defender', 'goalkeeper', 'league', 'champions', 'premier', 'la liga',
  'bundesliga', 'serie a', 'ligue 1', 'transfer', 'xg', 'expected goals',
  'pressing', 'buildup', 'transition', 'set piece', 'corner', 'free kick',
  'offside', 'penalty', 'clean sheet', 'half-space', 'winger', 'fullback',
  'centre-back', 'pivot', 'ppda', 'progressive', 'dribble', 'cross',
  'shot', 'save', 'aerial', 'duel', 'interception', 'clearance',
  'uefa', 'fifa', 'squad', 'lineup', 'substitution', 'injury',
  // Team names
  'manchester', 'liverpool', 'arsenal', 'chelsea', 'tottenham', 'barcelona',
  'real madrid', 'bayern', 'juventus', 'inter', 'milan', 'psg', 'dortmund',
  'atletico', 'napoli', 'benfica', 'porto', 'ajax', 'celtic', 'rangers',
];

function isFootballContent(text: string): boolean {
  const lower = text.toLowerCase();
  let matches = 0;
  for (const kw of FOOTBALL_KEYWORDS) {
    if (lower.includes(kw)) matches++;
    if (matches >= 3) return true;
  }
  return false;
}

function chunkText(text: string, maxChunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap
      const words = current.split(' ');
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      current = overlapWords.join(' ') + ' ' + sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || 'Untitled Document';
    const teamTags = (formData.get('team_tags') as string) || '';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Simple PDF text extraction (handles most text-based PDFs)
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(uint8Array);
    
    // Extract text between stream/endstream markers and decode
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(rawText)) !== null) {
      // Try to extract readable text
      const streamContent = match[1];
      // Extract text from Tj/TJ operators
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
        text += tjMatch[1] + ' ';
      }
      // Extract from TJ arrays
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrMatch;
      while ((tjArrMatch = tjArrayRegex.exec(streamContent)) !== null) {
        const parts = tjArrMatch[1].match(/\((.*?)\)/g);
        if (parts) {
          text += parts.map(p => p.slice(1, -1)).join('') + ' ';
        }
      }
    }

    // Fallback: ask the AI gateway to recover text from the raw PDF bytes string.
    // We do NOT touch storage here — the bucket may not exist and we only need text.
    if (text.trim().length < 100) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        try {
          const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'Extract all human-readable text from the provided PDF raw bytes. Return only the extracted text, no commentary, no markdown fences.' },
                { role: 'user', content: `PDF raw content (first 12000 chars):\n${rawText.slice(0, 12000)}` }
              ],
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            const extracted = data.choices?.[0]?.message?.content;
            if (extracted && extracted.trim().length > text.trim().length) text = extracted;
          } else {
            console.error('AI fallback failed:', resp.status, await resp.text().catch(() => ''));
          }
        } catch (e) {
          console.error('AI fallback threw:', e);
        }
      }
    }

    // Clean up text
    text = text.replace(/\s+/g, ' ').trim();

    if (!text || text.length < 50) {
      return new Response(JSON.stringify({ error: 'Could not extract sufficient text from the PDF. Try a text-based PDF.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify football content
    if (!isFootballContent(text)) {
      return new Response(JSON.stringify({ error: 'Content does not appear to be football-related. Only football analysis content is accepted.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse team tags
    const tags = teamTags ? teamTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];

    // Create document record
    const { data: doc, error: docErr } = await supabase.from('rag_documents').insert({
      title,
      source_type: 'pdf',
      source_url: null,
      team_tags: tags,
      metadata: { filename: file.name, size: file.size, extractedLength: text.length },
      status: 'processing',
    }).select().single();

    if (docErr) throw docErr;

    // Chunk and store
    const chunks = chunkText(text);
    const chunkRows = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      metadata: { charCount: content.length },
    }));

    const { error: chunkErr } = await supabase.from('rag_chunks').insert(chunkRows);
    if (chunkErr) throw chunkErr;

    // Mark as ready
    await supabase.from('rag_documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({
      success: true,
      document_id: doc.id,
      chunks_created: chunks.length,
      text_length: text.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('ingest-pdf error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
