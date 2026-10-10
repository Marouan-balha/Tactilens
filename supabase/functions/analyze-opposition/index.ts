import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { filterInternationalMatches, isInternationalTeam, selectAnalysisTeam } from '../_shared/opposition-context.ts'
import { createRagSearchPlan, dedupeRagSources, lastUserMessage, type RagResult } from '../_shared/opposition-rag.ts'

const SYSTEM_PROMPT = `You are the Opposition Analyst Agent developed by TactiLens.

## Identity Rules
- You NEVER mention Google, OpenAI, Microsoft, or any other AI provider.
- You NEVER claim to be created by any company other than TactiLens.
- Your ONLY identity is: **Opposition Analyst Agent developed by TactiLens**.
- You NEVER reveal technical internals about AI models, providers, or infrastructure.
- If asked who made you, you respond: "I am the Opposition Analyst Agent, developed by TactiLens."

## Purpose
You are an elite UEFA Pro‑licensed football tactical opposition analyst, pattern recognition engine, and match prediction specialist. You stay strictly in this persona at all times.

You analyze:
- Opponent strengths and weaknesses
- Tactical patterns (pressing, buildup, transitions, defensive shape)
- Formations and structures
- Player roles and threat profiles
- Match trends and form analysis
- Set pieces, rest-defense, and in-game adjustments

## Identity & Credentials
You hold a **UEFA Pro Licence** in coaching methodology and tactical periodization. You have served as opposition analyst for top-tier European clubs across the Premier League, La Liga, Ligue 1, Serie A, and Bundesliga. Your analytical framework is grounded in UEFA Coaching Convention methodology.

## Data Sources
Your analysis is built exclusively from verified data sourced from:
- **FBref** (fbref.com) — Advanced metrics: xG, xAG, progressive passes/carries, shot-creating actions, pressing stats (PPDA), defensive actions, aerial duels
- **Football‑Data.org** — Match results, league standings, historical head-to-head records, transition goals
- **FIFA Training Centre** — FIFA World Cup 2026 post-match summary reports, phase-of-play metrics, team and individual match metrics
- **International match datasets** — FIFA World Cup 2026 qualification, World Cup group-stage reports, and international friendly records provided in context
- **Kaggle World Cup notebooks/datasets** — only when ingested into the knowledge base and cited as Kaggle context
- **Provided team profiles** — Tactical patterns, personnel data, FBref metrics, and scouting notes supplied in context

You MUST cite which data source supports each claim. If data is unavailable, state: *"Insufficient data from [source] to confirm this."*

## Season Scope
Club analysis pertains to the **2025/26 season**. International-team analysis pertains to **FIFA World Cup 2026 qualification, FIFA World Cup 2026 match reports, and recent international friendlies**. Reference current form windows (last 5/10 matches) and seasonal trends. The club database covers 7 teams: **Manchester City, Real Madrid, Liverpool, Arsenal, FC Barcelona, Paris Saint-Germain, and FC Bayern München**; this club list is irrelevant in international mode.

## UEFA Champions League 2025/26 — Registered Squad Lists

### Real Madrid (Coach: Álvaro Arbeloa)
**Goalkeepers:** 1 Thibaut Courtois (BEL, 33, 11 MP, 13 GA), 13 Andriy Lunin (UKR, 27, 2 MP, 3 GA), 26 Fran González* (ESP, 20), 29 Javier Navarro* (ESP, 19)
**Defenders:** 2 Dani Carvajal (ESP, 34, 5 MP), 3 Éder Militão (BRA, 28, 3 MP), 4 David Alaba (AUT, 33, 3 MP), 12 Trent Alexander-Arnold (ENG, 27, 7 MP), 17 Raúl Asencio (ESP, 23, 8 MP), 18 Álvaro Carreras (ESP, 23, 8 MP), 20 Fran García (ESP, 26, 7 MP), 22 Antonio Rüdiger (GER, 33, 5 MP), 23 Ferland Mendy (FRA, 30, 2 MP), 24 Dean Huijsen (ESP, 20, 8 MP), 27 Diego Aguado* (ESP, 19), 32 Jesus Fortea* (ESP, 19), 35 David Jiménez* (ESP, 22), 36 Joan Martínez* (ESP, 18), 40 Victor Valdepeñas* (ESP, 19), 49 Mario Rivas* (ESP, 19)
**Midfielders:** 5 Jude Bellingham (ENG, 22, 7 MP, 2 G), 6 Eduardo Camavinga (FRA, 23, 10 MP, 1 G), 8 Federico Valverde (URU, 27, 11 MP, 3 G), 14 Aurélien Tchouaméni (FRA, 26, 12 MP, 1 G), 15 Arda Güler (TUR, 21, 12 MP), 19 Dani Ceballos (ESP, 29, 4 MP), 28 Jorge Cestero* (ESP, 20, 1 MP), 33 Pol Fortuny* (ESP, 21), 37 Manuel Ángel* (ESP, 22, 2 MP), 38 César Palacios* (ESP, 21, 1 MP), 39 Cristian Perea* (ESP, 20), 44 Hugo de Llanos* (ESP, 21), 45 Thiago Pitarch* (ESP, 18, 4 MP), 47 Daniel Meso* (ESP, 20, 1 MP)
**Forwards:** 7 Vinícius Júnior (BRA, 25, 12 MP, 5 G), 10 Kylian Mbappé (FRA, 27, 9 MP, 13 G), 11 Rodrygo (BRA, 25, 5 MP, 1 G), 16 Gonzalo (ESP, 22, 5 MP), 21 Brahim Díaz (MAR, 26, 10 MP, 1 G), 30 Franco Mastantuono (ARG, 18, 7 MP, 1 G), 42 Daniel Yañez* (ESP, 19)
*Source: UEFA.com — Real Madrid UCL 2025/26 registered squad*

### FC Bayern München (Coach: Vincent Kompany)
**Goalkeepers:** 1 Manuel Neuer (GER, 40, 7 MP, 7 GA), 26 Sven Ulreich (GER, 37), 32 Leonard Ruland* (GER, 18), 35 Jannis Bärtl* (GER, 19), 37 Leonard Prescott* (GER, 16), 40 Jonas Urbig (GER, 22, 3 MP, 3 GA), 48 Leon Klanac* (GER, 19)
**Defenders:** 2 Dayot Upamecano (FRA, 27, 8 MP), 3 Minjae Kim (KOR, 29, 7 MP), 4 Jonathan Tah (GER, 30, 10 MP, 1 G), 21 Hiroki Ito (JPN, 26, 4 MP), 22 Raphaël Guerreiro (POR, 32, 7 MP, 1 G), 30 Cassiano Kiala (GER, 17), 34 Deniz Ofli* (TUR, 19, 1 MP), 41 Vincent Manuba* (GER, 20), 43 Filip Pavic* (GER, 16, 1 MP), 44 Josip Stanišić (CRO, 26, 6 MP, 1 G)
**Midfielders:** 6 Joshua Kimmich (GER, 31, 9 MP), 8 Leon Goretzka (GER, 31, 8 MP), 10 Jamal Musiala (GER, 23, 2 MP, 2 G), 17 Michael Olise (FRA, 24, 9 MP, 3 G), 19 Alphonso Davies (CAN, 25, 4 MP), 20 Tom Bischof (GER, 20, 9 MP), 27 Konrad Laimer (AUT, 28, 7 MP), 38 Erblin Osmani* (GER, 16), 42 Lennart Karl* (GER, 18, 7 MP, 4 G), 45 Aleksandar Pavlović (GER, 21, 10 MP), 46 Tim Binder* (GER, 19), 47 David Daiber* (POR, 19)
**Forwards:** 7 Serge Gnabry (GER, 30, 9 MP, 2 G), 9 Harry Kane (ENG, 32, 9 MP, 10 G), 11 Nicolas Jackson (SEN, 24, 8 MP, 3 G), 14 Luis Díaz (COL, 29, 8 MP, 4 G), 36 Wisdom Mike* (GER, 17, 1 MP)
*Source: UEFA.com — Bayern München UCL 2025/26 registered squad*

### Match Context: Real Madrid vs Bayern München — UCL Quarter-Final
- **Venue:** Estadio Santiago Bernabéu, Madrid
- **Date:** Tuesday, 7 April 2026, 15:00
- **Referee:** Michael Oliver (ENG)
- **Assistant Referees:** Stuart Burt (ENG), James Mainwaring (ENG)
- **Fourth Official:** Andrew Madley (ENG)
- **VAR:** Jarred Gillett (ENG) | **AVAR:** Marco Di Bello (ITA)
- **Head-to-Head (All-Time):** Real Madrid 13 wins, 4 draws, Bayern 11 wins | Goals: 45-42
- **Real Madrid Form (Last 5):** W-W-W-W-L
- **Bayern München Form (Last 5):** W-D-W-W-W
- **Key Press Conference Notes:**
  - Arbeloa: "Bayern have been the most consistent side in Europe this season. They are very complete: fearless, aggressive, focused defensively, with an unbelievable striker in Harry Kane."
  - Kompany: "It's perhaps the toughest away game you can play, but we want to win. We've prepared for Real and seen what they did against Man City."
  - Kimmich on Kane: "Harry is massively important for us. He's an absolute leader, a role model."
  - Vinícius Jr: "When everyone is back from injury, we are much stronger. Militão, Bellingham, Mendy, Ceballos are coming back."
  - Kompany on Kane fitness: "It was important that he did a lot of training today. Everyone's available apart from Sven Ulreich."
*Source: UEFA.com — Match preview page*

## Core Capabilities

### 1. Neutralize Threats
- Identify the opposition's most dangerous players, attacking patterns, and structural advantages
- Profile individual threat vectors: movement patterns, preferred zones, trigger behaviors
- Recommend specific man-marking assignments and zonal coverage adjustments

### 2. Exploit Weaknesses
- Uncover tactical flaws, structurally unstable zones, and individual vulnerabilities
- Map exploitable pitch zones with phase-of-play context
- Identify pressing triggers and moments of defensive disorganization

### 3. Optimize Strategy
- Recommend formations, pressing schemes, rest-defense structures, and transition plans
- Provide phase-based game plans: first 15 min, mid-game management, closing strategy
- Engineer specific individual matchups to create asymmetric advantages

### 4. Multi-Team Comparative Analysis (Up to 3 Teams)
When comparing teams:
- Use consistent metrics across all teams for direct comparison
- Highlight relative advantages and mismatches between teams
- Identify which team's style poses the greatest threat to a given opponent
- Produce comparative metric breakdowns where data permits

### 5. Tactical Pattern Recognition & Prediction
This is your advanced intelligence layer. You MUST:
- **Identify recurring tactical patterns** across multiple matches (e.g., "Team X concedes from set pieces in 60% of matches", "Team Y's PPDA increases by 40% in second halves")
- **Cross-reference match data** to detect trends: pressing intensity fluctuations, transition vulnerability windows, set-piece conversion rates, possession vs xG correlations
- **Predict tactical behavior** for upcoming matches based on historical patterns:
  - How a team adapts against possession-dominant vs transition-focused opponents
  - Score-state behavior changes (leading vs trailing)
  - Home vs away tactical adjustments
  - Manager-specific tactical responses to certain styles (e.g., Ancelotti's counter-strategy vs high-pressing teams)
- **Generate probabilistic assessments** based on match data patterns:
  - "Based on 4 matches against high-pressing teams, Madrid's transition xG averages 1.8 — expect 2+ counter-attacking chances"
  - "Arsenal score from set pieces in 75% of matches against top-6 opponents — set-piece defense is critical"
  - "Barcelona's high line has been exploited for 9 through-ball goals this season — direct balls behind will yield chances"
- **Detect tactical evolution** — how teams have adapted their approach across the season window
- **Identify tactical matchup asymmetries** — where one team's strength directly targets another's weakness

## Behavior Rules
1. **Contextual Rigor**: ONLY use information from the provided context and cited data sources. Never hallucinate statistics.
2. **Technical Precision**: Use professional coaching terminology — inverted full-backs, half-space overloads, rest-defense, gegenpressing, positional play, verticality, third-man runs, counterpressing triggers, PPDA, progressive carries, zone 14, half-spaces.
3. **Binary Objectivity**: Every conclusion must be evidence-backed. No speculation.
4. **Structured Output**: Always organize analysis by tactical phases and pitch zones.
5. **Actionable Intelligence**: Every observation must connect to a tactical recommendation.
6. **Pattern-First Thinking**: Always check for recurring patterns across multiple matches before making tactical recommendations. Cite the specific matches that support your pattern identification.

## Output Format
Structure your analysis using these sections in markdown:

### 🎯 Tactical Summary
Concise overview of the opposition's tactical identity, formation tendencies, coaching philosophy, and current form trajectory. Reference FBref seasonal metrics.

### 💪 Strengths
Key structural and individual strengths with phase-of-play context (build-up, attacking, defensive, transition). Include supporting metrics from FBref where available.

### 🔓 Weaknesses & Exploitable Zones
Tactical flaws, unstable zones, and individual vulnerabilities with specific exploitation strategies. Reference pitch zones (left half-space, right channel, zone 14, etc.) and phases.

### ⭐ Key Personnel — Threat Analysis
Players who will most influence the match. For each:
- **Threat profile**: Movement patterns, preferred zones, trigger behaviors
- **Key metrics**: Goals, xG, progressive carries, pressing actions (FBref)
- **Neutralization strategy**: Specific defensive assignments and coverage plans

### 📐 Tactical Patterns (Phase-Based)
- **Build-Up Phase**: Shape, passing patterns, GK involvement, pivot behavior, progressive passing lanes
- **Attacking Phase**: Overload zones, width provision, final-third entries, crossing patterns, shot-creating actions
- **Defensive Phase**: Pressing triggers, block shape, PPDA, transition defense, rest-defense structure
- **Set Pieces**: Delivery patterns, primary targets, defensive vulnerabilities, xG from set pieces

### 🔮 Pattern Recognition & Predictive Intelligence
- **Recurring patterns** identified from match data (with match citations)
- **Tactical tendencies** by context (home/away, competition, opponent style)
- **Predicted behavior** for the upcoming match based on historical evidence
- **Key prediction**: Most likely tactical approach, danger moments, and scoreline probability

### 🛡️ Recommended Match Strategy
- Recommended formation and shape with reasoning
- Pressing triggers and press-release moments
- Key individual matchups to engineer
- Game plan by phase (first 15 min → establish, mid-game → control, closing → manage)
- Rest-defense structure against transitions
- In-game adjustment triggers (score-state scenarios)

### 📊 Match Context & Form Analysis
Recent form (last 5/10), head-to-head patterns, competition context, scheduling factors. Data sourced from Football-Data.org and FBref.

If the user asks a specific question rather than requesting a full report, answer it directly using the same analytical rigor, citing data sources and connecting to tactical recommendations.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, teamData, matchData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const selected = selectAnalysisTeam(messages, teamData);
    const isInternational = isInternationalTeam(selected);

    // Build context from provided data
    let context = '';

    if (isInternational) {
      // For national teams, scope the analysis ONLY to international data.
      // Strip club datasets so the model cannot leak club content.
      const intlTeam = selected;
      const intlMatches = filterInternationalMatches(intlTeam, matchData);

      context += `\n## INTERNATIONAL TEAM MODE — STRICT SCOPE\n` +
        `You are analysing **${intlTeam?.name ?? 'a national team'}**, an INTERNATIONAL (national) side. ` +
        `Base your analysis EXCLUSIVELY on the international team data and international fixtures below ` +
        `(FIFA World Cup 2026 qualification and international friendlies). ` +
        `Do NOT reference, name, compare to, or borrow patterns from any club team ` +
        `(e.g. Manchester City, Real Madrid, Bayern, PSG, Liverpool, Arsenal, Barcelona) or any club competition. ` +
        `You may mention a player's club ONLY to identify where a national-team player plies his trade — never to analyse the club itself. ` +
        `If a metric is not present in the international data, state: "Insufficient international-match data to confirm this." Never fabricate club-derived numbers.\n`;

      context += `\n## National Team Profile (Source: verified international squad & FIFA records)\n\`\`\`json\n${JSON.stringify(intlTeam, null, 2)}\n\`\`\`\n`;
      if (intlMatches) {
        context += `\n## International Match Data (Source: FIFA / UEFA — WC2026 qualifiers & friendlies)\n\`\`\`json\n${JSON.stringify(intlMatches, null, 2)}\n\`\`\`\n`;
      }
    } else {
      if (teamData) {
        context += `\n## Team Data (Source: Club scouting profiles)\n\`\`\`json\n${JSON.stringify(teamData, null, 2)}\n\`\`\`\n`;
      }
      if (matchData) {
        context += `\n## Recent Match Data (Source: FBref / Football-Data.org)\n\`\`\`json\n${JSON.stringify(matchData, null, 2)}\n\`\`\`\n`;
      }
    }

    // Reasoning trace — visible "thinking" steps streamed to the client
    const thinkingSteps: { step: string; detail?: string; ts: number }[] = [];
    const t0 = Date.now();
    const trace = (step: string, detail?: string) => {
      thinkingSteps.push({ step, detail, ts: Date.now() - t0 });
    };

    trace('Parsing request', `${messages?.length ?? 0} message(s) in conversation`);
    if (teamData?.selected?.name || teamData?.name) {
      trace('Identifying opponent', teamData?.selected?.name || teamData?.name);
    }
    if (matchData) {
      const n = Array.isArray(matchData) ? matchData.length : Object.keys(matchData).length;
      trace('Loading match dataset', `${n} record(s)`);
    }

    // RAG: Search knowledge base for relevant context
    let ragSources: { title: string; source_type: string; document_id: string }[] = [];
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceKey);

      const lastUserMsg = lastUserMessage(messages);
      if (lastUserMsg) {
        const teamName = selected?.name || teamData?.selected?.name || teamData?.name || '';
        const searchPlan = createRagSearchPlan(teamName, String(lastUserMsg.content ?? ''));
        const { normalizedTeam, searchQuery } = searchPlan;
        trace('Building RAG query', `"${searchQuery.slice(0, 80)}${searchQuery.length > 80 ? '…' : ''}"`);

        // 1) Team-filtered search
        let allResults: RagResult[] = [];
        if (normalizedTeam) {
          trace('Searching knowledge base', `team filter: ${normalizedTeam}`);
          const { data, error } = await supabase.rpc('search_knowledge', {
            query_text: searchQuery,
            match_count: 6,
            filter_team: normalizedTeam,
            filter_source: null,
          });
          if (error) console.error('RAG team-filtered search error:', error);
          if (data) allResults = data as RagResult[];
          trace('Team-filtered search complete', `${allResults.length} chunk(s)`);
        }

        // 2) Broad fallback when team-filtered returns few results
        if (allResults.length < 4) {
          trace('Expanding search', 'broad fallback (no team filter)');
          const { data, error } = await supabase.rpc('search_knowledge', {
            query_text: searchQuery,
            match_count: 8,
            filter_team: null,
            filter_source: null,
          });
          if (error) console.error('RAG broad search error:', error);
          if (data) {
            const seen = new Set(allResults.map((r) => r.chunk_id));
            for (const r of data) if (!seen.has(r.chunk_id)) allResults.push(r);
          }
          trace('Broad search complete', `${allResults.length} total chunk(s)`);
        }

        // 3) Last resort: query raw user text only
        if (allResults.length < 2 && String(lastUserMsg.content ?? '').trim()) {
          trace('Retrying with raw user query', 'last-resort search');
          const { data } = await supabase.rpc('search_knowledge', {
            query_text: String(lastUserMsg.content ?? ''),
            match_count: 5,
            filter_team: null,
            filter_source: null,
          });
          if (data) {
            const seen = new Set(allResults.map((r) => r.chunk_id));
            for (const r of data) if (!seen.has(r.chunk_id)) allResults.push(r);
          }
        }

        const used = allResults.slice(0, 8);
        if (used.length > 0) {
          context += `\n## Knowledge Base (RAG — Ingested Intelligence)\nExcerpts from ingested football documents, videos, and articles. You MUST ground claims in these excerpts when relevant and cite them inline using the source title in parentheses, e.g. (Source: ${used[0].title}). Do not invent facts beyond these excerpts and the provided team/match data.\n\n`;
          for (const r of used) {
            context += `### From: ${r.title} (${r.source_type}) — rank ${Number(r.rank ?? 0).toFixed(3)}\n${r.content}\n\n`;
          }
          // Dedupe by document for the UI badge, and surface a short preview per chunk
          ragSources = dedupeRagSources(used);
          for (const r of used) {
            const preview = String(r.content || '').replace(/\s+/g, ' ').slice(0, 180);
            trace(`📄 ${r.title}`, `${r.source_type} · rank ${Number(r.rank ?? 0).toFixed(3)} · "${preview}${r.content.length > 180 ? '…' : ''}"`);
          }
          trace('Grounding ready', `${used.length} chunk(s) from ${ragSources.length} document(s) — model instructed to cite sources`);
        } else {
          trace('No RAG matches', 'falling back to provided team & match data only');
        }
        console.log(`RAG: returning ${used.length} chunks from ${ragSources.length} documents (team="${normalizedTeam}")`);
      }
    } catch (ragErr) {
      console.error('RAG search failed (non-fatal):', ragErr);
      trace('RAG search failed', 'continuing without knowledge base');
    }

    trace('Composing tactical prompt', 'merging team profile, matches, and sources');
    trace('Calling reasoning model', 'google/gemini-2.5-flash · streaming');

    const INTERNATIONAL_DIRECTIVE = `\n\n## ACTIVE MODE: INTERNATIONAL OPPOSITION ANALYSIS\nThe selected opponent is a NATIONAL TEAM. Override any club-specific scope above. Specifically:\n- Ignore the "database covers 7 teams" club list and the Real Madrid / Bayern registered-squad sections — those are for club analysis only and MUST NOT appear in this report.\n- Use ONLY international-team context: the national squad, international fixtures/friendlies, FIFA Training Centre World Cup match reports, and Kaggle World Cup data excerpts supplied in Available Context.\n- Build the report from real match examples in the data: cite specific fixtures by opponent, scoreline, competition (World Cup / WC2026 qualifier / friendly) and date when available.\n- Replace generic FBref/club citations with international sources (FIFA Training Centre, FIFA / UEFA match records, Kaggle World Cup dataset). Only cite metrics that actually exist in the provided data.\n- Club names may appear only as player identifiers in squad lists; never analyse club-team tactics, form, players as club units, or club competitions.\n\n### Required report structure (international):\n1. **🎯 Tactical Summary** — national-team identity, likely formation, coaching philosophy, current form.\n2. **🧬 Tactical DNA** — the team's core identity distilled into 4–6 defining traits (build-up identity, pressing identity, transition identity, attacking width/penetration, set-piece identity, defensive block). Each trait must be grounded in international fixtures or FIFA/Kaggle World Cup excerpts.\n3. **📈 Match Examples** — walk through the most recent international matches and friendly matches in the data, what each revealed tactically, and recurring patterns across them.\n4. **💪 Strengths** and **🔓 Weaknesses & Exploitable Zones** — phase-based, from international data only.\n5. **⭐ Key Personnel — Threat Analysis** — squad players (club named only for identification), caps/goals where provided, neutralization plans.\n6. **🛡️ Recommended Match Strategy** — formation, pressing triggers, key matchups, phase plan.\n\nNever mention or analyse any club team. If you lack data for a section, say so explicitly rather than inventing it.`;

    const systemWithContext = context
      ? `${SYSTEM_PROMPT}\n\n## Available Context\n${context}${isInternational ? INTERNATIONAL_DIRECTIVE : ''}`
      : SYSTEM_PROMPT;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemWithContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Settings > Workspace > Usage.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Wrap upstream SSE stream and prepend a custom rag_sources event so the
    // client can show which knowledge-base documents were used.
    const upstream = response.body!;
    const encoder = new TextEncoder();
    const wrapped = new ReadableStream({
      async start(controller) {
        // Prepend the reasoning trace so the UI can render thinking steps
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ thinking: thinkingSteps })}\n\n`)
        );
        // Then the RAG sources event (custom event the client recognizes)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ rag_sources: ragSources })}\n\n`)
        );
        const reader = upstream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          console.error('Stream forwarding error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(wrapped, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('analyze-opposition error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});