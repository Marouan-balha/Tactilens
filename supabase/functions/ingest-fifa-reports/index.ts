import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { normalizeTeam } from '../_shared/team-normalize.ts';

const FIFA_BASE = 'https://www.fifatrainingcentre.com';
const GROUP_HUB = `${FIFA_BASE}/en/fifa-world-cup-2026/match-report-hub.php`;
const KNOCKOUT_HUB = `${FIFA_BASE}/en/fifa-world-cup-2026/match-report-hub-knockout-stage.php`;
const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

type ParsedReport = {
  stage: 'group' | 'knockout';
  group: string;
  matchNo: string;
  href: string;
  url: string;
  home: string;
  away: string;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: string;
  awayScore: string;
  tags: string[];
};

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function chunkText(text: string, maxChunkSize = 1800): string[] {
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

function parseHub(html: string, stage: 'group' | 'knockout'): ParsedReport[] {
  const reports: ParsedReport[] = [];
  const anchorRegex = /<a\s+([^>]*href=["'][^"']+\.pdf[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const attrs = match[1];
    const body = match[2];
    const href = attrs.match(/href=["']([^"']+)/i)?.[1];
    if (!href) continue;

    const names = Array.from(body.matchAll(/<span class="name">\s*([^<]+?)\s*<\/span>/gi)).map((m) => stripTags(m[1]));
    const abbrs = Array.from(body.matchAll(/<span class="abbr"[^>]*>\s*([^<]+?)\s*<\/span>/gi)).map((m) => stripTags(m[1]));
    const scores = Array.from(body.matchAll(/<span class="main(?: winner)?">\s*([^<]+?)\s*<\/span>/gi)).map((m) => stripTags(m[1]));
    if (names.length < 2) continue;

    const before = html.slice(0, match.index);
    const headings = Array.from(before.matchAll(/<h2[^>]*data-anchortitle="([^"]+)"[^>]*>\s*([^<]*)/gi));
    const group = stripTags(headings.at(-1)?.[1] || headings.at(-1)?.[2] || (stage === 'group' ? 'Group stage' : 'Knockout stage'));
    const matchNo = decodeURIComponent(href).match(/PMSR-M(\d+)/i)?.[1] ?? `${reports.length + 1}`;
    const url = href.startsWith('http') ? href : `${FIFA_BASE}${href}`.replace(/ /g, '%20');
    const home = names[0].trim();
    const away = names[1].trim();
    const tags = Array.from(new Set([normalizeTeam(home), normalizeTeam(away)].filter(Boolean)));

    reports.push({
      stage,
      group,
      matchNo,
      href,
      url,
      home,
      away,
      homeAbbr: abbrs[0] ?? '',
      awayAbbr: abbrs[1] ?? '',
      homeScore: scores[0] ?? '',
      awayScore: scores[1] ?? '',
      tags,
    });
  }

  return reports;
}

async function fetchText(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 Tactivision Opposition Analyst',
      Accept: 'text/html,application/xhtml+xml,application/pdf',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  return await resp.text();
}

async function firecrawlScrape(apiKey: string | undefined, url: string): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const resp = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 1000 }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      console.log(`Firecrawl failed for ${url}: ${resp.status}`, data?.error);
      return null;
    }
    const markdown = data?.markdown ?? data?.data?.markdown ?? '';
    return typeof markdown === 'string' && markdown.trim().length > 100 ? markdown : null;
  } catch (e) {
    console.log(`Firecrawl error for ${url}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body = await req.json().catch(() => ({}));
  const requestedStages = Array.isArray(body?.stages) ? body.stages : ['group'];
  const stages = requestedStages.includes('knockout') ? ['group', 'knockout'] as const : ['group'] as const;
  const teamFilter = typeof body?.team === 'string' && body.team.trim() ? normalizeTeam(body.team) : '';
  const maxReports = Math.max(0, Math.min(Number(body?.max_reports ?? (teamFilter ? 8 : 16)), 72));
  const force = !!body?.force;
  const today = new Date().toISOString().slice(0, 10);
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const results: { report: string; status: string; chunks?: number; error?: string }[] = [];

  async function ingestDoc(title: string, sourceUrl: string, tags: string[], content: string, metadata: Record<string, unknown>) {
    if (!force) {
      const { data: existing } = await supabase.from('rag_documents').select('id').eq('source_url', sourceUrl).limit(1);
      if (existing?.length) {
        results.push({ report: title, status: 'skipped (already ingested)' });
        return;
      }
    }

    const { data: doc, error } = await supabase.from('rag_documents').insert({
      title,
      source_type: 'article',
      source_url: sourceUrl,
      team_tags: tags,
      metadata: { source: 'fifa_training_centre', date: today, ...metadata },
      status: 'processing',
    }).select().single();

    if (error || !doc) {
      results.push({ report: title, status: 'insert failed', error: error?.message });
      return;
    }

    const chunks = chunkText(content).map((chunk, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content: chunk,
      metadata: { source: 'fifa_training_centre', date: today, ...metadata },
    }));

    const { error: chunkErr } = await supabase.from('rag_chunks').insert(chunks);
    if (chunkErr) {
      await supabase.from('rag_documents').update({ status: 'error', error_message: chunkErr.message }).eq('id', doc.id);
      results.push({ report: title, status: 'chunk error', error: chunkErr.message });
      return;
    }

    await supabase.from('rag_documents').update({ status: 'ready' }).eq('id', doc.id);
    results.push({ report: title, status: 'ingested', chunks: chunks.length });
  }

  try {
    const allReports: ParsedReport[] = [];
    for (const stage of stages) {
      const hubUrl = stage === 'group' ? GROUP_HUB : KNOCKOUT_HUB;
      try {
        const html = await fetchText(hubUrl);
        allReports.push(...parseHub(html, stage));
      } catch (e) {
        results.push({ report: `${stage} hub`, status: 'fetch failed', error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (!allReports.length) {
      return new Response(JSON.stringify({ success: false, error: 'No FIFA reports found', results }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const indexLines = allReports.map((r) => (
      `- Match ${r.matchNo} (${r.group}): ${r.home} ${r.homeScore || '?'}-${r.awayScore || '?'} ${r.away} — report: ${r.url}`
    ));
    const indexTags = Array.from(new Set(allReports.flatMap((r) => r.tags)));
    await ingestDoc(
      `FIFA World Cup 2026 Match Report Hub — ${today}`,
      `${GROUP_HUB}#index`,
      indexTags,
      `# FIFA World Cup 2026 Match Report Hub\nSource: ${GROUP_HUB}\n\nOfficial FIFA Training Centre post-match summary reports. Each report presents key phases of play, in-possession and out-of-possession data, team metrics, and individual metrics.\n\n${indexLines.join('\n')}`,
      { part: 'hub_index', report_count: allReports.length },
    );

    let selected = teamFilter
      ? allReports.filter((r) => r.tags.includes(teamFilter))
      : allReports;
    selected = selected.slice(0, maxReports);

    for (const report of selected) {
      const title = `FIFA WC2026 PMSR M${report.matchNo} — ${report.home} ${report.homeScore || '?'}-${report.awayScore || '?'} ${report.away}`;
      const scraped = await firecrawlScrape(firecrawlKey, report.url);
      const fallback = `Detailed PDF text could not be extracted automatically. Use the official PDF source for the full post-match summary. Parsed match metadata: ${report.home} ${report.homeScore || '?'}-${report.awayScore || '?'} ${report.away}, ${report.group}, FIFA World Cup 2026.`;
      const content = `# ${title}\nSource: ${report.url}\nCompetition: FIFA World Cup 2026\nStage: ${report.stage}\nGroup/Round: ${report.group}\nTeams: ${report.home} (${report.homeAbbr}) vs ${report.away} (${report.awayAbbr})\nScore: ${report.homeScore || '?'}-${report.awayScore || '?'}\n\n${scraped ?? fallback}`;

      await ingestDoc(title, report.url, report.tags, content.slice(0, 50000), {
        part: 'post_match_summary_report',
        competition: 'FIFA World Cup 2026',
        stage: report.stage,
        group: report.group,
        match_no: report.matchNo,
        home: report.home,
        away: report.away,
        score: `${report.homeScore || '?'}-${report.awayScore || '?'}`,
        pdf_text_extracted: !!scraped,
      });
    }

    return new Response(JSON.stringify({ success: true, date: today, total_reports: allReports.length, imported_reports: selected.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e), results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});