import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { extractTeamTags } from '../_shared/team-normalize.ts';

// Ingests a Kaggle kernel (notebook narrative + its output files) into the RAG
// knowledge base, mirroring the sync-football-stats ingestion flow.
//
// Default target: `swaptr/fifa-world-cup-2026-exploratory-data-analysis`
// (equivalent to `kaggle kernels pull swaptr/fifa-world-cup-2026-...`).

const KAGGLE_API = 'https://www.kaggle.com/api/v1';
const DEFAULT_USER = 'swaptr';
const DEFAULT_SLUG = 'fifa-world-cup-2026-exploratory-data-analysis';

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

// Turn a raw CSV string into a compact, human-readable markdown summary so the
// RAG chunks stay factual and small (header + capped rows).
function csvToMarkdown(fileName: string, csv: string, maxRows = 120): string {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return `### ${fileName}\n_(empty file)_`;
  const header = lines[0];
  const rows = lines.slice(1, 1 + maxRows);
  const more = lines.length - 1 - rows.length;
  let out = `### ${fileName}\nColumns: ${header}\n\n`;
  out += rows.join('\n');
  if (more > 0) out += `\n\n_(+${more} more rows omitted)_`;
  return out;
}

function stripNotebook(source: string): string {
  // Kaggle kernel "blob.source" for notebooks is JSON (ipynb). Pull markdown +
  // code cell text out into a readable narrative; fall back to raw for scripts.
  try {
    const nb = JSON.parse(source);
    if (Array.isArray(nb?.cells)) {
      const parts: string[] = [];
      for (const cell of nb.cells) {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source ?? '');
        if (!src.trim()) continue;
        if (cell.cell_type === 'markdown') parts.push(src);
        else if (cell.cell_type === 'code') parts.push('```\n' + src.trim() + '\n```');
      }
      return parts.join('\n\n');
    }
  } catch (_) { /* not JSON — treat as plain script */ }
  return source;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const KAGGLE_USERNAME = Deno.env.get('KAGGLE_USERNAME');
  const KAGGLE_KEY = Deno.env.get('KAGGLE_KEY');
  if (!KAGGLE_USERNAME || !KAGGLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Kaggle credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const auth = 'Basic ' + btoa(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`);
  const kHeaders = { Authorization: auth };

  let userName = DEFAULT_USER;
  let kernelSlug = DEFAULT_SLUG;
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.user_name) userName = String(body.user_name);
    if (body?.kernel_slug) kernelSlug = String(body.kernel_slug);
    if (body?.force) force = true;
    if (body?.ref && String(body.ref).includes('/')) {
      const [u, s] = String(body.ref).split('/');
      userName = u; kernelSlug = s;
    }
  } catch (_) { /* use defaults */ }

  const ref = `${userName}/${kernelSlug}`;
  const results: { part: string; status: string; chunks?: number; error?: string }[] = [];
  const today = new Date().toISOString().slice(0, 10);

  async function ingestDoc(title: string, sourceUrl: string, body: string, extraMeta: Record<string, unknown>) {
    if (body.trim().length < 100) {
      results.push({ part: title, status: 'empty' });
      return;
    }
    const teamTags = extractTeamTags(body).slice(0, 12);
    const { data: doc, error } = await supabase.from('rag_documents').insert({
      title,
      source_type: 'article',
      source_url: sourceUrl,
      team_tags: teamTags,
      metadata: { date: today, source: 'kaggle', kernel_ref: ref, ...extraMeta },
      status: 'processing',
    }).select().single();
    if (error || !doc) {
      results.push({ part: title, status: 'insert failed', error: error?.message });
      return;
    }
    const chunks = chunkText(body).map((c, i) => ({
      document_id: doc.id, chunk_index: i, content: c,
      metadata: { date: today, source: 'kaggle', kernel_ref: ref },
    }));
    const { error: chunkErr } = await supabase.from('rag_chunks').insert(chunks);
    if (chunkErr) {
      await supabase.from('rag_documents').update({ status: 'error', error_message: chunkErr.message }).eq('id', doc.id);
      results.push({ part: title, status: 'chunk error', error: chunkErr.message });
      return;
    }
    await supabase.from('rag_documents').update({ status: 'ready' }).eq('id', doc.id);
    results.push({ part: title, status: 'ingested', chunks: chunks.length });
  }

  try {
    // Daily dedupe on the kernel ref
    const kernelUrl = `https://www.kaggle.com/code/${ref}`;
    const { data: existing } = await supabase
      .from('rag_documents').select('id').eq('source_url', kernelUrl)
      .gte('created_at', today + 'T00:00:00Z').limit(1);
    if (existing?.length && !force) {
      return new Response(JSON.stringify({ success: true, ref, status: 'skipped (already today)', results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Notebook narrative + code (kernels pull)
    let datasetRefsFromNotebook: string[] = [];
    try {
      const pull = await fetch(`${KAGGLE_API}/kernels/pull?user_name=${userName}&kernel_slug=${kernelSlug}`, { headers: kHeaders });
      if (!pull.ok) {
        results.push({ part: 'notebook', status: 'fetch failed', error: `${pull.status} ${await pull.text().catch(() => '')}`.slice(0, 300) });
      } else {
        const data = await pull.json();
        const meta = data?.metadata ?? {};
        const inputSources = [
          ...(meta?.datasetDataSources ?? []),
          ...(meta?.competitionDataSources ?? []),
        ].filter((s: string) => s && s.trim().length > 0);
        datasetRefsFromNotebook = inputSources;
        const narrative = stripNotebook(data?.blob?.source ?? '');
        const title = `Kaggle: ${meta?.title ?? kernelSlug} — analysis`;
        const body = `# ${meta?.title ?? kernelSlug}\nAuthor: ${userName}\nSource: ${kernelUrl}\n\n${narrative.slice(0, 40000)}`;
        await ingestDoc(title, kernelUrl, body, { part: 'notebook', kernel_title: meta?.title, input_sources: inputSources });
      }
    } catch (e) {
      results.push({ part: 'notebook', status: 'error', error: e instanceof Error ? e.message : String(e) });
    }

    // 1b) Input dataset files referenced by the kernel (the source data)
    for (const dref of datasetRefsFromNotebook) {
      const [dOwner, dSlug] = dref.split('/');
      if (!dOwner || !dSlug) continue;
      try {
        const listResp = await fetch(`${KAGGLE_API}/datasets/list/files/${dOwner}/${dSlug}`, { headers: kHeaders });
        const listData = listResp.ok ? await listResp.json() : null;
        const dsFiles: { name?: string; nameNullable?: string }[] = listData?.datasetFiles ?? listData?.files ?? [];
        const sections: string[] = [];
        for (const df of dsFiles.slice(0, 20)) {
          const name = df.name ?? df.nameNullable;
          if (!name) continue;
          try {
            const dl = await fetch(`${KAGGLE_API}/datasets/download/${dOwner}/${dSlug}?file_name=${encodeURIComponent(name)}`, { headers: kHeaders });
            if (!dl.ok) { sections.push(`### ${name}\n_(download failed: ${dl.status})_`); continue; }
            if (/\.csv$/i.test(name)) sections.push(csvToMarkdown(name, await dl.text()));
            else if (/\.(json|txt|md)$/i.test(name)) sections.push(`### ${name}\n${(await dl.text()).slice(0, 8000)}`);
            else sections.push(`### ${name}\n_(binary file — skipped)_`);
          } catch (e) {
            sections.push(`### ${name}\n_(error: ${e instanceof Error ? e.message : String(e)})_`);
          }
        }
        if (sections.length) {
          const dUrl = `https://www.kaggle.com/datasets/${dref}`;
          const body = `# Input dataset ${dref} (${today})\nSource: ${dUrl}\n\n${sections.join('\n\n---\n\n')}`;
          await ingestDoc(`Kaggle dataset: ${dref}`, dUrl, body, { part: 'input_dataset', dataset_ref: dref });
        } else {
          results.push({ part: `dataset ${dref}`, status: 'no readable files' });
        }
      } catch (e) {
        results.push({ part: `dataset ${dref}`, status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }

    // 2) Kernel output files (data + results)
    try {
      const out = await fetch(`${KAGGLE_API}/kernels/output?user_name=${userName}&kernel_slug=${kernelSlug}`, { headers: kHeaders });
      if (!out.ok) {
        results.push({ part: 'output', status: 'fetch failed', error: `${out.status} ${await out.text().catch(() => '')}`.slice(0, 300) });
      } else {
        const data = await out.json();
        
        const files: { fileName?: string; url?: string }[] = data?.files ?? [];
        const dataSections: string[] = [];
        for (const f of files.slice(0, 20)) {
          const name = f.fileName ?? 'file';
          if (!f.url) continue;
          try {
            const dl = await fetch(f.url, { headers: kHeaders });
            if (!dl.ok) { dataSections.push(`### ${name}\n_(download failed: ${dl.status})_`); continue; }
            if (/\.csv$/i.test(name)) {
              const csv = await dl.text();
              dataSections.push(csvToMarkdown(name, csv));
            } else if (/\.(json|txt|md)$/i.test(name)) {
              const txt = await dl.text();
              dataSections.push(`### ${name}\n${txt.slice(0, 8000)}`);
            } else {
              dataSections.push(`### ${name}\n_(binary output file — skipped)_`);
            }
          } catch (e) {
            dataSections.push(`### ${name}\n_(error: ${e instanceof Error ? e.message : String(e)})_`);
          }
        }
        if (dataSections.length) {
          const body = `# ${kernelSlug} — dataset outputs (${today})\nSource: ${kernelUrl}\n\n${dataSections.join('\n\n---\n\n')}`;
          await ingestDoc(`Kaggle: ${kernelSlug} — match & prediction data`, kernelUrl + '#output', body, { part: 'output', file_count: files.length });
        } else {
          results.push({ part: 'output', status: 'no readable files' });
        }
      }
    } catch (e) {
      results.push({ part: 'output', status: 'error', error: e instanceof Error ? e.message : String(e) });
    }

    return new Response(JSON.stringify({ success: true, ref, date: today, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e), results }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
