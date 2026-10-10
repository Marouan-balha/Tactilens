import { describe, expect, it } from 'vitest';
import { validateVideoWorkerRun } from '@/domain/tl06/videoObservation';

const run = {
  schemaVersion: 1,
  runId: '20261003T120000Z',
  status: 'observations-only',
  startedAt: '2026-10-03T12:00:00Z',
  finishedAt: '2026-10-03T12:30:00Z',
  durationSeconds: 1800,
  command: 'python run_pipeline.py --video data/match.mp4 --model models/best.pt --output-dir output/run-1',
  python: '3.12.0',
  operatingSystem: 'Windows',
  video: { path: 'data/match.mp4', checksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  model: { path: 'models/best.pt', checksum: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  parameters: { confidence: 0.15, sampleFrames: 25, calibrationFrame: 100 },
  outputs: {
    tracks: 'tracks.json',
    tracksWithTeams: 'tracks_with_teams.json',
    ballObservations: 'ball_observations.json',
    annotatedVideo: 'tracked.mp4',
  },
  quality: {
    teamCalibration: 'available',
    pitchCalibration: 'unavailable',
    events: 'unavailable',
    evidenceEligibility: 'candidate-only',
  },
};

describe('TL06 video worker contract', () => {
  it('accepts an observations-only worker run', () => {
    expect(validateVideoWorkerRun(run).success).toBe(true);
  });

  it('rejects a run that claims verified evidence', () => {
    const result = validateVideoWorkerRun({ ...run, status: 'verified' });
    expect(result.success).toBe(false);
  });
});