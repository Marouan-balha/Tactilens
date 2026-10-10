import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// RSS feeds and sources for football content
const FOOTBALL_SOURCES = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', name: 'BBC Sport Football', type: 'rss' },
  { url: 'https://www.theguardian.com/football/rss', name: 'The Guardian Football', type: 'rss' },
  { url: 'https://www.espn.com/espn/rss/soccer/news', name: 'ESPN FC', type: 'rss' },
  { url: 'https://theathletic.com/football/rss/', name: 'The Athletic Football', type: 'rss' },
  { url: 'https://www.skysports.com/rss/12040', name: 'Sky Sports Football', type: 'rss' },
  { url: 'https://totalfootballanalysis.com/feed', name: 'Total Football Analysis', type: 'rss' },
  { url: 'https://statsbomb.com/feed/', name: 'StatsBomb', type: 'rss' },
  { url: 'https://spielverlagerung.com/feed/', name: 'Spielverlagerung', type: 'rss' },
];

const FOOTBALL_KEYWORDS = [
  'football', 'soccer', 'match', 'goal', 'assist', 'tackle', 'possession',
  'formation', 'tactics', 'manager', 'coach', 'striker', 'midfielder',
  'defender', 'goalkeeper', 'league', 'champions', 'premier', 'la liga',
  'bundesliga', 'serie a', 'ligue 1', 'xg', 'pressing', 'buildup',
  'transition', 'set piece', 'ppda', 'progressive', 'squad', 'lineup',
  'transfer', 'penalty', 'offside', 'half-space', 'winger',
];

function isFootballContent(text: string): boolean {
  const lower = text.toLowerCase();
  let matches = 0;
  for (const kw of FOOTBALL_KEYWORDS) {
    if (lower.includes(kw)) matches++;
    if (matches >= 2) return true;
  }
  return false;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

function parseRssItems(xml: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = decodeHtmlEntities(itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    const link = decodeHtmlEntities(itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '');
    const description = stripHtml(decodeHtmlEntities(
      itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] ||
      itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1] || ''
    ));
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
    
    if (title && link) {
      items.push({ title: stripHtml(title), link: stripHtml(link), description, pubDate, source: sourceName });
    }
  }
  
  return items;
}

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!resp.ok) return '';
    const html = await resp.text();
    
    // Try to extract article body content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const contentMatch = html.match(/class="[^"]*(?:article|content|story|post)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|article)>/i);
    
    const rawContent = articleMatch?.[1] || mainMatch?.[1] || contentMatch?.[1] || '';
    const text = stripHtml(rawContent);
    
    // Return only if we got meaningful content
    return text.length > 200 ? text : '';
  } catch {
    return '';
  }
}

function chunkText(text: string, maxChunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
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

function extractTeamTags(text: string): string[] {
  const teams: Record<string, string[]> = {
    'manchester united': ['manchester united', 'man utd', 'man united'],
    'manchester city': ['manchester city', 'man city'],
    'liverpool': ['liverpool', 'liverpool fc'],
    'arsenal': ['arsenal', 'gunners'],
    'chelsea': ['chelsea'],
    'tottenham': ['tottenham', 'spurs'],
    'barcelona': ['barcelona', 'barça', 'barca'],
    'real madrid': ['real madrid'],
    'bayern munich': ['bayern', 'bayern munich', 'bayern münchen'],
    'juventus': ['juventus', 'juve'],
    'psg': ['psg', 'paris saint-germain', 'paris saint germain'],
    'dortmund': ['dortmund', 'borussia dortmund', 'bvb'],
    'atletico madrid': ['atletico', 'atletico madrid', 'atlético'],
    'napoli': ['napoli'],
    'inter milan': ['inter milan', 'inter', 'internazionale'],
    'ac milan': ['ac milan', 'milan'],
    'newcastle': ['newcastle'],
    'aston villa': ['aston villa'],
    'brighton': ['brighton'],
    'west ham': ['west ham'],
  };
  
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [tag, aliases] of Object.entries(teams)) {
    if (aliases.some(a => lower.includes(a))) {
      found.push(tag);
    }
  }
  return found.slice(0, 5); // Max 5 tags
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const maxArticles = body.max_articles || 10;
    const sourcesFilter: string[] | null = body.sources || null;

    // Get existing source URLs to avoid duplicates
    const { data: existingDocs } = await supabase
      .from('rag_documents')
      .select('source_url')
      .not('source_url', 'is', null);
    
    const existingUrls = new Set((existingDocs || []).map(d => d.source_url));

    const results: { title: string; source: string; chunks: number }[] = [];
    let totalIngested = 0;

    // Fetch RSS feeds in parallel
    const sources = sourcesFilter 
      ? FOOTBALL_SOURCES.filter(s => sourcesFilter.some(f => s.name.toLowerCase().includes(f.toLowerCase())))
      : FOOTBALL_SOURCES;

    const feedPromises = sources.map(async (source) => {
      try {
        const resp = await fetch(source.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 Football Analysis Bot' },
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) {
          console.log(`Failed to fetch ${source.name}: ${resp.status}`);
          return [];
        }
        const xml = await resp.text();
        return parseRssItems(xml, source.name);
      } catch (e) {
        console.log(`Error fetching ${source.name}:`, e);
        return [];
      }
    });

    const allFeeds = await Promise.all(feedPromises);
    const allItems = allFeeds.flat();
    
    console.log(`Found ${allItems.length} total RSS items from ${sources.length} sources`);

    // Filter to new football content and limit
    const newItems = allItems
      .filter(item => !existingUrls.has(item.link))
      .filter(item => isFootballContent(item.title + ' ' + item.description))
      .slice(0, maxArticles);

    console.log(`${newItems.length} new football articles to ingest`);

    // Process each article
    for (const item of newItems) {
      try {
        // Try to fetch full article content
        let content = await fetchArticleContent(item.link);
        
        // Fall back to RSS description if full article fetch failed
        if (!content && item.description.length > 100) {
          content = item.description;
        }
        
        if (!content || content.length < 100) {
          // Use title + description as minimal content
          content = `${item.title}. ${item.description}`;
        }
        
        if (content.length < 50) continue;

        const teamTags = extractTeamTags(item.title + ' ' + content);

        // Create document
        const { data: doc, error: docErr } = await supabase.from('rag_documents').insert({
          title: item.title,
          source_type: 'article',
          source_url: item.link,
          team_tags: teamTags,
          metadata: { source: item.source, pubDate: item.pubDate, contentLength: content.length },
          status: 'processing',
        }).select().single();

        if (docErr) {
          console.error(`Failed to create doc for ${item.title}:`, docErr);
          continue;
        }

        // Chunk and store
        const chunks = chunkText(content);
        const chunkRows = chunks.map((c, i) => ({
          document_id: doc.id,
          chunk_index: i,
          content: c,
          metadata: { charCount: c.length },
        }));

        const { error: chunkErr } = await supabase.from('rag_chunks').insert(chunkRows);
        if (chunkErr) {
          console.error(`Failed to insert chunks for ${item.title}:`, chunkErr);
          await supabase.from('rag_documents').update({ status: 'error', error_message: chunkErr.message }).eq('id', doc.id);
          continue;
        }

        await supabase.from('rag_documents').update({ status: 'ready' }).eq('id', doc.id);
        results.push({ title: item.title, source: item.source, chunks: chunks.length });
        totalIngested++;
      } catch (e) {
        console.error(`Error processing article ${item.title}:`, e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      articles_found: allItems.length,
      articles_ingested: totalIngested,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('fetch-football-content error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
