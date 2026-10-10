import { z } from 'zod';

const checksumSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Expected a SHA-256 checksum');

export const trackObservationSchema = z.object({
  frame: z.number().int().nonnegative(),
  track_id: z.number().int().nonnegative(),
  class_id: z.number().int().nonnegative(),
  class_name: z.enum(['player', 'goalkeeper']),
  x: z.number().finite(),
  y: z.number().finite(),
  bbox: z.tuple([z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite()]),
  confidence: z.number().finite().min(0).max(1),
});

export const teamObservationSchema = trackObservationSchema.extend({
  team: z.enum(['team_a', 'team_b', 'referee', 'unknown']),
});

export const ballObservationSchema = z.object({
  frame: z.number().int().nonnegative(),
  x: z.number().finite(),
  y: z.number().finite(),
  confidence: z.number().finite().min(0).max(1),
});

export const videoWorkerRunSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().min(1),
  status: z.literal('observations-only'),
  startedAt: z.string().datetime({ offset: true }),
  finishedAt: z.string().datetime({ offset: true }),
  durationSeconds: z.number().finite().nonnegative(),
  command: z.string().min(1),
  python: z.string().min(1),
  operatingSystem: z.string().min(1),
  video: z.object({ path: z.string().min(1), checksum: checksumSchema }),
  model: z.object({ path: z.string().min(1), checksum: checksumSchema }),
  parameters: z.object({
    confidence: z.number().finite().min(0).max(1),
    sampleFrames: z.number().int().positive(),
    calibrationFrame: z.number().int().nonnegative(),
  }),
  outputs: z.object({
    tracks: z.string().min(1),
    tracksWithTeams: z.string().min(1),
    ballObservations: z.string().min(1),
    annotatedVideo: z.string().min(1),
  }),
  quality: z.object({
    teamCalibration: z.enum(['available', 'unavailable']),
    pitchCalibration: z.literal('unavailable'),
    events: z.literal('unavailable'),
    evidenceEligibility: z.literal('candidate-only'),
  }),
});

export type TrackObservation = z.infer<typeof trackObservationSchema>;
export type TeamObservation = z.infer<typeof teamObservationSchema>;
export type BallObservation = z.infer<typeof ballObservationSchema>;
export type VideoWorkerRun = z.infer<typeof videoWorkerRunSchema>;

export function validateVideoWorkerRun(input: unknown) {
  return videoWorkerRunSchema.safeParse(input);
}