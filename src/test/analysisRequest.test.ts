import { describe, expect, it } from 'vitest';
import { createAnalysisRequest } from '@/lib/analysis-request';

describe('createAnalysisRequest', () => {
  it('preserves the existing analysis request payload shape', () => {
    const request = createAnalysisRequest({
      messages: [{ role: 'user', content: 'Analyse Real Madrid' }],
      teamData: { selected: { id: 'club:real-madrid' } },
      matchData: [{ id: 'match:one' }],
    });

    expect(request).toEqual({
      messages: [{ role: 'user', content: 'Analyse Real Madrid' }],
      teamData: { selected: { id: 'club:real-madrid' } },
      matchData: [{ id: 'match:one' }],
    });
  });

  it('preserves omitted optional context as undefined', () => {
    expect(createAnalysisRequest({ messages: [] })).toEqual({
      messages: [],
      teamData: undefined,
      matchData: undefined,
    });
  });
});
