import { describe, expect, it, vi } from 'vitest';
import { classifyEvidenceResult, loadEvidenceResult } from '@/domain/opposition/evidence-result';

function bundle(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    synthetic: true,
    videoAssets: [],
    clips: [],
    events: [],
    occurrences: [],
    findings: [],
    briefing: {
      schemaVersion: 1,
      id: 'briefing-1',
      opponentId: 'club:demo',
      findingIds: [],
      generatedAt: '2026-10-06T12:00:00.000Z',
      freshness: 'fresh',
      availability: 'ready',
      sourceRevision: 'revision-1',
      synthetic: true,
      ...overrides,
    },
  };
}

describe('evidence result boundary', () => {
  it.each([
    ['ready', {}, 'ready'],
    ['empty', { availability: 'empty' }, 'empty'],
    ['stale', { freshness: 'stale' }, 'stale'],
    ['unavailable', { availability: 'unavailable' }, 'unavailable'],
  ])('classifies %s bundles', (_label, overrides, status) => {
    expect(classifyEvidenceResult(bundle(overrides)).status).toBe(status);
  });

  it('rejects invalid bundles without exposing partial data', () => {
    const result = classifyEvidenceResult({ ...bundle(), briefing: { availability: 'ready' } });
    expect(result).toEqual({ status: 'invalid', reason: expect.any(String) });
  });

  it('loads and classifies a valid read response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(bundle()), { status: 200 }));
    const result = await loadEvidenceResult('/evidence/demo.json', fetcher);

    expect(result.status).toBe('ready');
    expect(fetcher).toHaveBeenCalledWith('/evidence/demo.json', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  });

  it('maps transport failures to unavailable', async () => {
    const result = await loadEvidenceResult('/evidence/missing.json', vi.fn().mockRejectedValue(new Error('offline')));

    expect(result).toEqual({ status: 'unavailable', reason: 'offline' });
  });
});