import { validateEvidenceBundle, type EvidenceBundle } from './evidence';

export type EvidenceResultStatus = 'ready' | 'empty' | 'stale' | 'unavailable' | 'invalid';

export type EvidenceResult = {
  status: EvidenceResultStatus;
  bundle?: EvidenceBundle;
  reason?: string;
};

export function classifyEvidenceResult(input: unknown): EvidenceResult {
  const parsed = validateEvidenceBundle(input);
  if (!parsed.success) {
    return { status: 'invalid', reason: parsed.error.issues[0]?.message ?? 'Invalid evidence bundle' };
  }

  const bundle = parsed.data;
  if (bundle.briefing.availability === 'unavailable') {
    return { status: 'unavailable', reason: 'Evidence briefing is unavailable' };
  }
  if (bundle.briefing.availability === 'empty') {
    return { status: 'empty', bundle, reason: 'No evidence findings are available' };
  }
  if (bundle.briefing.freshness === 'stale') {
    return { status: 'stale', bundle, reason: 'Evidence briefing is stale' };
  }
  return { status: 'ready', bundle };
}

export async function loadEvidenceResult(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<EvidenceResult> {
  try {
    const response = await fetcher(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { status: 'unavailable', reason: `Evidence request failed with status ${response.status}` };
    }
    return classifyEvidenceResult(await response.json());
  } catch (error) {
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'Evidence request failed',
    };
  }
}