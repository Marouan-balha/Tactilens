import { describe, expect, it, vi } from 'vitest';
import { loadLocalEvidence, LOCAL_EVIDENCE_PATH } from '@/lib/local-evidence';

describe('local evidence source', () => {
  it('reads the local precomputed evidence path', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      schemaVersion: 1,
      synthetic: true,
      videoAssets: [],
      clips: [],
      events: [],
      occurrences: [],
      findings: [],
      briefing: {
        schemaVersion: 1,
        id: 'briefing-local',
        opponentId: 'club:demo',
        findingIds: [],
        generatedAt: '2026-10-06T00:00:00.000Z',
        freshness: 'fresh',
        availability: 'ready',
        sourceRevision: 'local-v1',
        synthetic: true,
      },
    }), { status: 200 }));

    const result = await loadLocalEvidence(fetcher);

    expect(result.status).toBe('ready');
    expect(fetcher).toHaveBeenCalledWith(LOCAL_EVIDENCE_PATH, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  });
});