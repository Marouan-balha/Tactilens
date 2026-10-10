import { describe, expect, it } from 'vitest';
import { validateEvidenceBundle } from '@/domain/opposition/evidence';

function validBundle() {
  return {
    schemaVersion: 1,
    synthetic: true,
    videoAssets: [{
      schemaVersion: 1,
      id: 'video-1',
      matchId: 'match:demo',
      sourceChecksum: 'sha256:demo',
      durationMs: 60000,
      presentationTimebase: 'milliseconds',
      rights: { status: 'cleared', reference: 'fixture-license' },
      mediaRef: 'fixture://match-demo',
      synthetic: true,
    }],
    clips: [{
      schemaVersion: 1,
      id: 'clip-1',
      videoId: 'video-1',
      interval: { startMs: 1000, endMs: 5000 },
      mediaRef: 'fixture://clip-1',
      sourceChecksum: 'sha256:demo',
      access: 'available',
      synthetic: true,
    }],
    events: [{
      schemaVersion: 1,
      id: 'event-1',
      videoId: 'video-1',
      interval: { startMs: 1500, endMs: 3000 },
      observationIds: ['observation-1'],
      algorithmVersion: 'fixture-detector-1',
      synthetic: true,
    }],
    occurrences: [{
      schemaVersion: 1,
      id: 'occurrence-1',
      eventIds: ['event-1'],
      interval: { startMs: 1500, endMs: 3000 },
      clipId: 'clip-1',
      synthetic: true,
    }],
    findings: [{
      schemaVersion: 1,
      id: 'finding-1',
      opponentId: 'club:demo',
      statement: 'Synthetic fixture finding',
      state: 'CANDIDATE',
      occurrenceIds: ['occurrence-1'],
      qualitySignals: { evidenceCoverage: null, calibrationError: null },
      reasonCodes: ['synthetic-fixture'],
      synthetic: true,
    }],
    briefing: {
      schemaVersion: 1,
      id: 'briefing-1',
      opponentId: 'club:demo',
      findingIds: ['finding-1'],
      generatedAt: '2026-09-30T12:00:00.000Z',
      freshness: 'fresh',
      availability: 'ready',
      sourceRevision: 'fixture-revision-1',
      synthetic: true,
    },
  };
}

describe('evidence bundle validation', () => {
  it('accepts an explicitly synthetic, linked fixture with unknown quality values', () => {
    const result = validateEvidenceBundle(validBundle());

    expect(result.success).toBe(true);
  });

  it('rejects broken references and intervals outside the source video', () => {
    const fixture = validBundle();
    fixture.clips[0].interval.endMs = 70000;
    fixture.occurrences[0].clipId = 'missing-clip';

    const result = validateEvidenceBundle(fixture);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('video duration'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.message.includes('Unknown clip'))).toBe(true);
    }
  });

  it('rejects invalid intervals and VERIFIED findings without coach review', () => {
    const fixture = validBundle();
    fixture.events[0].interval = { startMs: 3000, endMs: 1500 };
    fixture.findings[0].state = 'VERIFIED';

    const result = validateEvidenceBundle(fixture);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('endMs must be greater'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.message.includes('coach-reviewed'))).toBe(true);
    }
  });

  it('requires a reason when a finding abstains', () => {
    const fixture = validBundle();
    fixture.findings[0].state = 'ABSTAINED';
    fixture.findings[0].reasonCodes = [];

    const result = validateEvidenceBundle(fixture);

    expect(result.success).toBe(false);
  });
});
