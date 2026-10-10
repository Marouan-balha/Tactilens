# TactiLens foundation audit

Audited 2026-09-22 against application baseline `81c6374a7320283b5b02de24e18cdfa2d0141727` and branding commit `d6f2a05`. This is a source audit, not a claim that hosted services or device behavior were tested. No product implementation is authorized by this document.

Principle: reuse the intelligence, data, domain model, and selected visual components; rebuild the interaction model for television.

## Existing

EXISTS means implemented in source; PARTIAL means only part of the required capability exists; MISSING means absent from the inspected first-party source; UNKNOWN means external verification is needed.

| Capability | Status | Source evidence and limits |
| --- | --- | --- |
| Opponent UI | EXISTS | [Index.tsx](../../src/pages/Index.tsx) selects club/national opponents, runs quick prompts, and shows dashboard/report tabs. Desktop controls do not establish TV compatibility. |
| Tactical maps | EXISTS | [PitchHeatmap.tsx](../../src/components/PitchHeatmap.tsx) renders an SVG pitch. Intensities are normalized keyword boosts, not measured player positions or probabilities. |
| Tactical radar | EXISTS | [TacticalRadar.tsx](../../src/components/dashboard/TacticalRadar.tsx) starts at 50 and adds 12 for matching keywords, capped at 95. It is a heuristic visualization, not a validated tactical score. |
| Match and team data | EXISTS | [data](../../src/data) contains club, match, national-team and World Cup files; [internationalTeams.ts](../../src/lib/internationalTeams.ts) adapts national data into dashboard shapes. Accuracy, freshness and redistribution rights are UNKNOWN. |
| Finding cards | PARTIAL | [AnalysisReport.tsx](../../src/components/AnalysisReport.tsx) renders assistant prose inside cards; [StrengthWeaknessPanel.tsx](../../src/components/dashboard/StrengthWeaknessPanel.tsx) renders string lists. Neither represents a verified finding with occurrences. |
| Video component | MISSING | No video element, iframe, player integration or evidence player found in `src`. [YouTube ingestion](../../supabase/functions/ingest-youtube/index.ts) retrieves captions or stores a reference; this is not playback or footage analysis. |
| Evidence model | PARTIAL | [RagSource](../../src/lib/stream-chat.ts) has document ID, title and source type. [RagDocument](../../src/lib/rag-api.ts) adds URL/metadata. There are no clip bounds, frame provenance, occurrence verification or finding state contracts. |
| API | EXISTS | [stream-chat.ts](../../src/lib/stream-chat.ts) POSTs messages/teamData/matchData to `analyze-opposition`, parses SSE text, source badges and progress steps. [rag-api.ts](../../src/lib/rag-api.ts) wraps ingestion and listing. A versioned persisted briefing API is MISSING. |
| Agent architecture | PARTIAL | [analyze-opposition](../../supabase/functions/analyze-opposition/index.ts) assembles dataset context, performs retrieval, and streams `google/gemini-2.5-flash` through the Lovable gateway. This is one request pipeline, not an autonomous multi-agent or CV system. Progress traces are server instrumentation. |
| Knowledge storage | EXISTS | [migrations](../../supabase/migrations) define documents/chunks, PDF storage, a vector column and full-text search. The active `search_knowledge` query uses PostgreSQL text ranking, not vector similarity. |
| PDF exports | EXISTS | [generateReport.ts](../../src/lib/generateReport.ts), [generateFifaReport.ts](../../src/lib/generateFifaReport.ts) and dashboard export buttons. Keep this desktop workflow. |
| App shell/state | EXISTS | [App.tsx](../../src/App.tsx) exposes `/`, `/knowledge`, fallback; React Query provider plus component state and [useOppositionAnalyst](../../src/hooks/useOppositionAnalyst.ts). No shared persisted briefing state exists. |
| Access control | PARTIAL | Browser uses a public Supabase key; functions use service-role credentials. Migrations restrict search RPC execution and revoke public storage access, while document/chunk read policies are public. User/team isolation and actual deployed policies are UNKNOWN. |
| Fire TV/Vega, remote focus, briefing mode | MISSING | No TV target, packaging, remote input graph, or device validation in the inspected tree. |
| CV and AWS implementation | MISSING | No detection/tracking/calibration/evidence pipeline or AWS runtime integration found. |
| Tests | PARTIAL | [example.test.ts](../../src/test/example.test.ts) only asserts `true`. [Playwright config](../../playwright.config.ts) imports `lovable-agent-playwright-config`, which is not declared in package.json. No substantive browser suite was found. |

## Reuse

| Existing source | Proposed consumer | Reuse boundary |
| --- | --- | --- |
| `src/lib/internationalTeams.ts`: DashboardTeam/DashboardMatch | Shared opponent/match adapters | Preserve existing IDs; explicitly translate nullable metrics, home/away semantics and source references. Do not clone datasets into TV. |
| `src/data/*.json`, `src/data/fifaTacticalProfiles.ts` | One shared dataset entry point | Preserve originals; attach provenance and distinguish qualitative editorial profiles from measurements. |
| `supabase/functions/_shared/team-normalize.ts` | Retrieval and domain identity adapters | Reuse normalization; aliases are not globally unique entity IDs. |
| `supabase/functions/analyze-opposition/index.ts` | Future Opposition API application service | Characterize existing retrieval and report behavior before extracting pure context/retrieval helpers. Preserve the current HTTP endpoint. |
| `src/lib/stream-chat.ts` | Existing web analyst transport adapter | Keep SSE compatibility; TV consumes persisted briefings rather than requiring live generation. |
| `src/components/PitchHeatmap.tsx` | TV pitch renderer candidate | Reuse pitch geometry and visual language after coordinate mapping tests; never promote keyword percentages to evidence. |
| Dashboard KPI, form and strength/weakness components | TV presentation candidates | Reuse value formatting and semantics; adapt density/type sizes. DOM/Recharts/Radix components are not automatically portable to a native TV runtime. |
| `src/lib/generateReport.ts`, `generateFifaReport.ts` | Existing desktop reports | Preserve exports and caller contracts. Share domain adapters later, not duplicate report code. |
| Supabase schema and ingestion | Existing knowledge workflow | Keep current storage and import responsibilities; new video artifacts are a separate evidence boundary. |

## Change, after approval

| Desktop behavior | Television behavior |
| --- | --- |
| Dropdown, tabs, text entry and mouse actions | Opponent tiles and a predictable D-pad focus graph; keyboard-free primary flow |
| Dense dashboard and long scrolling prose | Readable overview, concise finding cards, detail and briefing sequence |
| Hover/chart tooltips | Selected/focused explanations with persistent labels |
| Browser history | Explicit BACK hierarchy and restored focus on return from evidence playback |
| Live report generation | Precomputed, versioned briefing with loading, empty, stale, unavailable and abstention states |
| Implicit zero values | Explicit unknown values in the shared contract; preserve legacy presentation through an adapter |

## New, all NOT STARTED

Fire TV shell/packaging; remote input and focus restoration; briefing mode; validated finding cards; evidence player; video artifact/provenance contracts; offline CV jobs; validation/abstention engine; persisted Opposition API; AWS integration; Vega compatibility and target-device tests.

## Findings that constrain reuse

1. International adapters replace unavailable metrics with zero, mix dashboard IDs and opponent names, assign squad numbers from array indexes, and generate match IDs from sorted positions. Shared adapters must preserve legacy IDs as aliases while introducing stable identity, unknown semantics and explicit team perspective. Index-derived numbers must not be represented as verified jersey numbers.
2. Heatmap axes and overlays need a known-position alignment test before spatial reuse. Keyword scores and normalized percentages cannot establish measured geometry or confidence.
3. The analyst accepts client-supplied context, uses loosely typed payloads and falls back without retrieval. Source citations are prompt instructions, not a server-enforced verification gate. Its persona also asserts coaching credentials; these are not evidence of actual qualifications.
4. Stream parsing has no explicit cancellation signal or request ownership. Concurrent generation/reset and truncated streams need characterization before shared extraction.
5. Hosted credentials, deployed functions, footage rights, actual device, clip codecs and device performance are UNKNOWN. Do not infer these from source names or setup files.

## Validation baseline

Earlier branding validation on this checkout: production build passed; the single placeholder Vitest test passed; lint reported 25 errors and 7 warnings in unchanged application files. npm reported 22 vulnerabilities. No dependency remediation, meaningful regression coverage, hosted backend verification or TV certification is claimed here. See [implementation gates](IMPLEMENTATION_PLAN.md) before extracting code.
