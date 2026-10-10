## Goal

Build a daily auto-ingestion pipeline that scrapes football data from two sources, joins them by team name, and feeds the result into the existing RAG knowledge base so the analyst agent can cite live fixtures, results, and standings.

## Sources

- **statshub.com** — today's fixtures, team form, betting/stat snippets (free-text scrape)
- **native-stats.org** — for each competition `CL`, `PL`, `BL1`, `SA`, `PD`, `FL1`:
  - Recent matches (date, teams, score, odds)
  - Next matches (date, teams, odds)
  - Standings (pos, team, matches, points, +/-, goals)
  - Top scorers (player, team, goals, assists)

## Architecture

```text
   pg_cron (daily 06:00 UTC)
            |
            v
   sync-football-stats (new edge fn)
       |          |
       v          v
   statshub   native-stats  (Deno fetch + regex)
       \         /
        v       v
   normalize team names (shared helper)
        |
        v
   join: per team -> { fixtures, recent_results, standing, top_scorers }
        |
        v
   one rag_document per competition + one per featured team
        |
        v
   chunkText() -> rag_chunks  (existing RAG flow)
```

## Files

**New**
- `supabase/functions/sync-football-stats/index.ts` — main scraper + ingester. Reuses `chunkText`, `extractTeamTags` patterns from `fetch-football-content`.
- `supabase/functions/_shared/team-normalize.ts` — shared normalizer (lowercase, strip "FC"/"CF", map "Bayern München" -> "bayern munich", "Atlético" -> "atletico madrid", etc.). Also used by `analyze-opposition` to fix the existing fuzzy-match issue.

**Edited**
- `src/lib/rag-api.ts` — add `syncFootballStats()` calling the new function.
- `src/pages/KnowledgeBase.tsx` — add a small "Last sync" indicator + manual "Sync now" button next to Auto-Fetch (cron is the primary trigger; button is for testing).
- `supabase/functions/analyze-opposition/index.ts` — import the shared `normalizeTeam` helper instead of its inline version, so newly-ingested standings match team filters.

## Cron setup

Enable `pg_cron` + `pg_net` (idempotent), then schedule via `supabase--insert` (not migration — contains anon key):

```sql
select cron.schedule(
  'sync-football-stats-daily',
  '0 6 * * *',  -- 06:00 UTC daily
  $$ select net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/sync-football-stats',
       headers := '{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
```

## Scrape details

**native-stats.org** (per competition path `/competition/{code}/`):
- Page is server-rendered HTML; tables follow `Recent matches:` / `Next matches:` / `Standings:` / `Scorers` headings.
- Parse with regex over `<table>...</table>` blocks. Each match row has team names visible twice (full + tricode) — take the full name. Score format `N:N`; odds format `a / b / c`.
- Standings rows: `Pos | crest+name+tricode | matches | points | +/- | goals`.

**statshub.com**:
- Homepage lists today's fixtures and a "Community Tweets" snapshot. Take only the fixtures block + any tagged team-stat lines. Skip the tip-style tweets to keep content factual.
- Same regex/HTML strip approach as `fetch-football-content/fetchArticleContent`.

## Document shape

Per run, insert into `rag_documents`:

- 6 competition docs:
  - `title`: "UEFA Champions League — daily snapshot 2026-05-02"
  - `source_type`: `'article'`
  - `source_url`: `https://native-stats.org/competition/CL/`
  - `team_tags`: top-8 normalized team names from the standings
  - Body: human-readable markdown — standings table, recent results, upcoming fixtures, top 10 scorers
- 1 statshub doc:
  - `title`: "StatsHub fixtures — 2026-05-02"
  - `source_url`: `https://www.statshub.com/`
  - Body: today's fixtures grouped by league

**Deduplication**: skip insert if `source_url + DATE(created_at) = today`. Existing snapshots from prior days are kept (gives the agent historical context).

## Team-name join

The shared `normalizeTeam(name)` produces the same canonical key for both sources, e.g.:
- "FC Bayern München" / "Bayern" / "FCB" -> `bayern munich`
- "Club Atlético de Madrid" / "Atleti" / "ATL" -> `atletico madrid`
- "Paris Saint-Germain FC" / "PSG" -> `psg`

Used to (a) tag documents with consistent `team_tags`, (b) attach statshub fixture lines to the right competition doc when a team appears in both, (c) fix the analyst's existing team-filter mismatch on `Bayern Munich` vs `FC Bayern München`.

## Out of scope

- No new tables — everything goes into the existing `rag_documents` / `rag_chunks` per the user's choice.
- No JS rendering / Firecrawl — direct fetch only.
- No backfill of historical seasons; only current-season pages.
- No UI changes beyond the small sync indicator.

## Risks

- Either site may block `Deno fetch` UA or change layout. Mitigation: realistic browser UA, per-source try/catch, partial success allowed (one failed competition does not abort others), error rows captured in `rag_documents.error_message`.
- statshub.com may not be reachable / may return JS-only shell — if scrape returns < 200 chars, skip the statshub doc rather than insert noise.
