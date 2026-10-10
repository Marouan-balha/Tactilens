import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type CaptionTrack = {
  languageCode?: string;
  kind?: string;
  baseUrl?: string;
};

const FOOTBALL_KEYWORDS = [
  'football', 'soccer', 'match', 'goal', 'assist', 'tackle', 'possession',
  'formation', 'tactics', 'manager', 'coach', 'striker', 'midfielder',
  'defender', 'goalkeeper', 'league', 'champions', 'premier', 'la liga',
  'bundesliga', 'serie a', 'ligue 1', 'xg', 'pressing', 'buildup',
  'transition', 'set piece', 'ppda', 'progressive', 'squad', 'lineup',
  'manchester', 'liverpool', 'arsenal', 'chelsea', 'barcelona',
  'real madrid', 'bayern', 'juventus', 'psg', 'dortmund', 'atletico',
  'napoli', 'uefa', 'fifa', 'half-space', 'winger', 'fullback',
  'centre-back', 'clean sheet', 'offside', 'penalty', 'free kick',
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

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\n/g, ' ');
}

async function fetchCaptionTracksViaInnertube(videoId: string): Promise<{ tracks: CaptionTrack[]; title: string }> {
  // Use the ANDROID InnerTube client — it returns captionTracks without consent walls or bot checks
  const body = {
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '19.09.37',
        androidSdkVersion: 30,
        hl: 'en',
        gl: 'US',
        userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
      },
    },
    videoId,
  };
  const resp = await fetch(
    'https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.09.37',
      },
      body: JSON.stringify(body),
    },
  );
  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const title = data?.videoDetails?.title ?? '';
  console.log(`InnerTube: found ${tracks.length} caption tracks, title="${title}"`);
  return { tracks, title };
}

async function fetchTranscript(videoId: string): Promise<{ transcript: string; title: string }> {
  // Primary: InnerTube API (reliable, no consent wall)
  let title = '';
  let transcript = '';
  try {
    const { tracks, title: itTitle } = await fetchCaptionTracksViaInnertube(videoId);
    title = itTitle;
    if (tracks.length > 0) {
      const track =
        tracks.find((t: CaptionTrack) => t.languageCode === 'en' && !t.kind) ||
        tracks.find((t: CaptionTrack) => t.languageCode === 'en') ||
        tracks.find((t: CaptionTrack) => t.languageCode?.startsWith('en')) ||
        tracks[0];
      if (track?.baseUrl) {
        let url = track.baseUrl.replace(/\\u0026/g, '&');
        if (!url.includes('fmt=')) url += '&fmt=srv3';
        const xml = await (await fetch(url)).text();
        const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
        const parts: string[] = [];
        let m;
        while ((m = textRegex.exec(xml)) !== null) parts.push(decodeHtmlEntities(m[1]));
        transcript = parts.join(' ');
        if (transcript.trim().length > 50) {
          console.log(`Extracted transcript via InnerTube: ${transcript.length} chars`);
          return { transcript: transcript.replace(/\s+/g, ' ').trim(), title };
        }
      }
    }
  } catch (e) {
    console.error('InnerTube fetch failed:', e);
  }

  // Fallback: scrape watch page
  const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  const pageHtml = await pageResp.text();

  // Extract title
  const titleMatch = pageHtml.match(/"title":"(.*?)"/);
  if (titleMatch) {
    title = JSON.parse(`"${titleMatch[1]}"`);
  } else {
    const ogTitle = pageHtml.match(/<meta property="og:title" content="(.*?)"/);
    if (ogTitle) title = decodeHtmlEntities(ogTitle[1]);
  }

  // Method 1: Extract from captionTracks in ytInitialPlayerResponse

  // Try multiple patterns to find caption data
  const captionPatterns = [
    /"captionTracks":\s*(\[.*?\])/s,
    /captionTracks":\s*(\[.*?\])\s*,/s,
    /"captions":\s*\{.*?"captionTracks":\s*(\[.*?\])/s,
  ];
  
  for (const pattern of captionPatterns) {
    const match = pageHtml.match(pattern);
    if (!match) continue;
    
    try {
      const tracks = JSON.parse(match[1]) as CaptionTrack[];
      // Prefer English, then auto-generated English, then any
      const track = 
        tracks.find((t: CaptionTrack) => t.languageCode === 'en' && !t.kind) ||
        tracks.find((t: CaptionTrack) => t.languageCode === 'en') ||
        tracks.find((t: CaptionTrack) => t.languageCode?.startsWith('en')) ||
        tracks[0];
      
      if (track?.baseUrl) {
        let captionUrl = track.baseUrl;
        // Ensure we get srv3 (XML) format
        if (!captionUrl.includes('fmt=')) {
          captionUrl += '&fmt=srv3';
        }
        // Unescape the URL
        captionUrl = captionUrl.replace(/\\u0026/g, '&');
        
        console.log('Fetching captions from:', captionUrl.substring(0, 100) + '...');
        const captionResp = await fetch(captionUrl);
        const captionXml = await captionResp.text();
        
        // Parse XML captions
        const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
        let m;
        const parts: string[] = [];
        while ((m = textRegex.exec(captionXml)) !== null) {
          parts.push(decodeHtmlEntities(m[1]));
        }
        transcript = parts.join(' ');
        
        if (transcript.trim().length > 50) {
          console.log(`Extracted transcript: ${transcript.length} chars from captionTracks`);
          break;
        }
      }
    } catch (e) {
      console.error('Caption track parse attempt failed:', e);
    }
  }

  // Method 2: Try timedtext API directly
  if (!transcript.trim() || transcript.trim().length < 50) {
    console.log('Trying timedtext API...');
    const timedtextUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`,
    ];
    
    for (const ttUrl of timedtextUrls) {
      try {
        const resp = await fetch(ttUrl);
        const xml = await resp.text();
        if (xml.includes('<text')) {
          const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
          let m;
          const parts: string[] = [];
          while ((m = textRegex.exec(xml)) !== null) {
            parts.push(decodeHtmlEntities(m[1]));
          }
          const result = parts.join(' ').trim();
          if (result.length > 50) {
            transcript = result;
            console.log(`Extracted transcript: ${result.length} chars from timedtext API`);
            break;
          }
        }
      } catch { /* continue */ }
    }
  }

  // Method 3: Extract from ytInitialPlayerResponse serialized captions
  if (!transcript.trim() || transcript.trim().length < 50) {
    console.log('Trying playerResponse extraction...');
    const playerRespMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
    if (playerRespMatch) {
      try {
        // This is a large JSON, parse carefully
        const playerJson = JSON.parse(playerRespMatch[1]);
        const captionRenderer = playerJson?.captions?.playerCaptionsTracklistRenderer;
        if (captionRenderer?.captionTracks) {
          const track = 
            captionRenderer.captionTracks.find((t: CaptionTrack) => t.languageCode === 'en') ||
            captionRenderer.captionTracks[0];
          if (track?.baseUrl) {
            let url = track.baseUrl;
            if (!url.includes('fmt=')) url += '&fmt=srv3';
            const resp = await fetch(url);
            const xml = await resp.text();
            const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
            let m;
            const parts: string[] = [];
            while ((m = textRegex.exec(xml)) !== null) {
              parts.push(decodeHtmlEntities(m[1]));
            }
            transcript = parts.join(' ');
            if (transcript.trim().length > 50) {
              console.log(`Extracted transcript: ${transcript.length} chars from playerResponse`);
            }
          }
        }
      } catch (e) {
        console.error('playerResponse parse failed:', e);
      }
    }
  }

  return { transcript: transcript.replace(/\s+/g, ' ').trim(), title };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { url, title: userTitle, team_tags } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'YouTube URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing YouTube video: ${videoId}`);
    const { transcript, title: autoTitle } = await fetchTranscript(videoId);
    const videoTitle = userTitle || autoTitle || `YouTube Video ${videoId}`;
    const tags = team_tags ? (Array.isArray(team_tags) ? team_tags : team_tags.split(',').map((t: string) => t.trim().toLowerCase())).filter(Boolean) : [];
    const hasTranscript = transcript.length >= 100;
    const fallbackContent = [videoTitle, tags.join(' '), url].join(' ');

    if (hasTranscript && !isFootballContent(transcript)) {
      return new Response(JSON.stringify({ error: 'Video content does not appear to be football-related. Only football content is accepted.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!hasTranscript && tags.length === 0 && !isFootballContent(fallbackContent)) {
      return new Response(JSON.stringify({ error: 'No transcript was available, so please add football team tags or a football-specific title before ingesting this video.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: doc, error: docErr } = await supabase.from('rag_documents').insert({
      title: videoTitle,
      source_type: 'youtube',
      source_url: `https://www.youtube.com/watch?v=${videoId}`,
      team_tags: tags,
      metadata: { videoId, transcriptLength: transcript.length, transcriptAvailable: hasTranscript, ingestionMode: hasTranscript ? 'transcript' : 'video_reference' },
      status: 'processing',
    }).select().single();

    if (docErr) throw docErr;

    const ingestibleText = hasTranscript
      ? transcript
      : `Video reference: ${videoTitle}. Source URL: https://www.youtube.com/watch?v=${videoId}. Team tags: ${tags.join(', ') || 'not specified'}. Transcript was not available from YouTube captions, so this item is stored as a video reference for the analyst knowledge base. Use the source link for manual video review and tag-based retrieval.`;
    const chunks = chunkText(ingestibleText);
    const chunkRows = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      metadata: { charCount: content.length, transcriptAvailable: hasTranscript },
    }));

    const { error: chunkErr } = await supabase.from('rag_chunks').insert(chunkRows);
    if (chunkErr) throw chunkErr;

    await supabase.from('rag_documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({
      success: true,
      document_id: doc.id,
      title: videoTitle,
      chunks_created: chunks.length,
      transcript_length: transcript.length,
      transcript_available: hasTranscript,
      ingestion_mode: hasTranscript ? 'transcript' : 'video_reference',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('ingest-youtube error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
