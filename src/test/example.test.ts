import { describe, expect, it, vi } from 'vitest';
import { streamAnalysis } from '@/lib/stream-chat';
import { internationalMatches, internationalTeams } from '@/lib/internationalTeams';
import { generateReport } from '@/lib/generateReport';
import { generateFifaReport } from '@/lib/generateFifaReport';
import { getFifaProfile } from '@/data/fifaTacticalProfiles';
import teamsData from '@/data/teams.json';
import matchesData from '@/data/matches.json';

describe('international data adapter', () => {
  it('exposes stable team ids and derives recent form from the team perspective', () => {
    const spain = internationalTeams.find((team) => team.id === 'intl_esp');

    expect(spain).toBeDefined();
    expect(spain?.name).toBe('Spain');
    expect(spain?.isInternational).toBe(true);
    expect(spain?.recent_form).toHaveLength(5);
    expect(spain?.key_players[0].number).toBe(1);
  });

  it('preserves the analysed team id and records unavailable match metrics as zero', () => {
    const spainMatch = internationalMatches.find(
      (match) => match.home_team === 'intl_esp' || match.away_team === 'intl_esp'
    );

    expect(spainMatch).toBeDefined();
    expect([spainMatch?.home_team, spainMatch?.away_team]).toContain('intl_esp');
    expect(spainMatch?.possession.away).toBe(0);
    expect(spainMatch?.xg.away).toBe(0);
  });
});

describe('streamAnalysis', () => {
  it('parses split SSE events for thinking, sources, text, and completion', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const chunks = [
              'data: {"thinking":[{"step":"Retrieving","ts":1}]}\n',
              'data: {"rag_sources":[{"title":"Match report","source_type":"pdf","document_id":"doc-1"}]}\n',
              'data: {"choices":[{"delta":{"content":"Press "}}]}\n',
              'data: {"choices":[{"delta":{"content":"the left side"}}]}\n\n',
              'data: [DONE]\n\n',
            ];
            controller.enqueue(encoder.encode(chunks[0]));
            controller.enqueue(encoder.encode(chunks.slice(1).join('')));
            controller.close();
          },
        })
      )
    );
    const deltas: string[] = [];
    const thinking: unknown[] = [];
    const sources: unknown[] = [];
    const done = vi.fn();
    const error = vi.fn();

    await streamAnalysis({
      messages: [{ role: 'user', content: 'Analyse Spain' }],
      onDelta: (text) => deltas.push(text),
      onThinking: (steps) => thinking.push(steps),
      onRagSources: (items) => sources.push(items),
      onDone: done,
      onError: error,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(deltas.join('')).toBe('Press the left side');
    expect(thinking).toHaveLength(1);
    expect(sources).toHaveLength(1);
    expect(done).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('reports provider errors without calling completion', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Provider unavailable' }), { status: 503 })
    );
    const done = vi.fn();
    const error = vi.fn();

    await streamAnalysis({
      messages: [{ role: 'user', content: 'Analyse Spain' }],
      onDelta: vi.fn(),
      onDone: done,
      onError: error,
    });

    expect(error).toHaveBeenCalledWith('Provider unavailable');
    expect(done).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('completes when a stream ends with malformed or incomplete data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\ndata: {"choices":', {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    const done = vi.fn();
    const error = vi.fn();
    const deltas: string[] = [];

    await streamAnalysis({
      messages: [{ role: 'user', content: 'Analyse Spain' }],
      onDelta: (text) => deltas.push(text),
      onDone: done,
      onError: error,
    });

    expect(deltas).toEqual(['partial']);
    expect(done).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});

describe('report exports', () => {
  it('creates both report types without throwing for existing data', () => {
    const team = teamsData[0];
    const profile = getFifaProfile('intl_eng');

    expect(() => generateReport(team, matchesData, 'summary')).not.toThrow();
    expect(() => generateReport(internationalTeams[0], internationalMatches, 'summary')).not.toThrow();
    expect(profile).toBeDefined();
    expect(() => generateFifaReport(profile!)).not.toThrow();
  }, 15000);
});
