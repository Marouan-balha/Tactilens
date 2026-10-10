import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { normalizeTeam, extractTeamTags } from '../_shared/team-normalize.ts';

// Official league/competition sources. Firecrawl handles JS rendering + bot walls.
interface Source {
  code: string;
  name: string;
  pages: { label: string; url: string }[];
}

const SOURCES: Source[] = [
  {
    code: 'CL', name: 'UEFA Champions League',
    pages: [
      { label: 'Standings', url: 'https://www.uefa.com/uefachampionsleague/standings/' },
      { label: 'Fixtures & Results', url: 'https://www.uefa.com/uefachampionsleague/fixtures-results/' },
    ],
  },
  {
    code: 'PL', name: 'Premier League',
    pages: [
      { label: 'Table', url: 'https://www.premierleague.com/tables' },
      { label: 'Results', url: 'https://www.premierleague.com/results' },
      { label: 'Fixtures', url: 'https://www.premierleague.com/fixtures' },
    ],
  },
  {
    code: 'BL1', name: 'Bundesliga',
    pages: [
      { label: 'Table', url: 'https://www.bundesliga.com/en/bundesliga/table' },
      { label: 'Matchday', url: 'https://www.bundesliga.com/en/bundesliga/matchday' },
    ],
  },
  {
    code: 'SA', name: 'Serie A',
    pages: [
      { label: 'Standings', url: 'https://www.legaseriea.it/en/serie-a/classifica' },
      { label: 'Results', url: 'https://www.legaseriea.it/en/serie-a/risultati-classifiche' },
    ],
  },
  {
    code: 'PD', name: 'LaLiga',
    pages: [
      { label: 'Standings', url: 'https://www.laliga.com/en-GB/laliga-easports/standing' },
      { label: 'Results', url: 'https://www.laliga.com/en-GB/laliga-easports/results' },
    ],
  },
  {
    code: 'FL1', name: 'Ligue 1',
    pages: [
      { label: 'Ranking', url: 'https://www.ligue1.com/ranking' },
      { label: 'Matches', url: 'https://www.ligue1.com/matches' },
    ],
  },
];

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

function chunkText(text: string, maxChunkSize = 1500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function firecrawlScrape(apiKey: string, url: string): Promise<string | null> {
  try {
    const r = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      console.log(`firecrawl ${url} -> ${r.status}`, data?.error);
      return null;
    }
    // v2 may return markdown at top-level or under data
    const md = data?.markdown ?? data?.data?.markdown ?? null;
    if (!md || md.length < 200) return null;
    return md as string;
  } catch (e) {
    console.log(`firecrawl ${url} error:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const results: { competition: string; status: string; chunks?: number; error?: string }[] = [];

  try {
    for (const src of SOURCES) {
      try {
        // Per-competition daily dedupe (one doc combining all pages of that source)
        const compositeUrl = src.pages[0].url;
        const { data: existing } = await supabase
          .from('rag_documents').select('id').eq('source_url', compositeUrl)
          .gte('created_at', today + 'T00:00:00Z').limit(1);
        if (existing?.length) {
          results.push({ competition: src.name, status: 'skipped (already today)' });
          continue;
        }

        // Scrape every page sequentially via Firecrawl
        const sections: string[] = [];
        for (const page of src.pages) {
          const md = await firecrawlScrape(FIRECRAWL_API_KEY, page.url);
          if (md) {
            sections.push(`## ${page.label}\nSource: ${page.url}\n\n${md.slice(0, 8000)}`);
          } else {
            sections.push(`## ${page.label}\nSource: ${page.url}\n\n_(fetch failed)_`);
          }
        }

        const body = `# ${src.name} — official snapshot ${today}\n\n${sections.join('\n\n---\n\n')}`;
        if (body.length < 400) {
          results.push({ competition: src.name, status: 'empty scrape' });
          continue;
        }

        const teamTags = extractTeamTags(body).slice(0, 12);

        const { data: doc, error } = await supabase.from('rag_documents').insert({
          title: `${src.name} — official snapshot ${today}`,
          source_type: 'article',
          source_url: compositeUrl,
          team_tags: teamTags,
          metadata: {
            date: today, competition_code: src.code,
            pages: src.pages.map(p => p.url),
            sources: ['uefa.com', 'premierleague.com', 'bundesliga.com', 'legaseriea.it', 'laliga.com', 'ligue1.com'],
          },
          status: 'processing',
        }).select().single();

        if (error || !doc) {
          results.push({ competition: src.name, status: 'insert failed', error: error?.message });
          continue;
        }

        const chunks = chunkText(body).map((c, i) => ({
          document_id: doc.id, chunk_index: i, content: c,
          metadata: { date: today, competition: src.code },
        }));
        const { error: chunkErr } = await supabase.from('rag_chunks').insert(chunks);
        if (chunkErr) {
          await supabase.from('rag_documents').update({ status: 'error', error_message: chunkErr.message }).eq('id', doc.id);
          results.push({ competition: src.name, status: 'chunk error', error: chunkErr.message });
          continue;
        }

        await supabase.from('rag_documents').update({ status: 'ready' }).eq('id', doc.id);
        results.push({ competition: src.name, status: 'ingested', chunks: chunks.length });
      } catch (e) {
        results.push({ competition: src.name, status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, date: today, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e), results }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
