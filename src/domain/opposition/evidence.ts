import { z } from 'zod';
import { OPPOSITION_SCHEMA_VERSION } from './contracts';

export const EVIDENCE_SCHEMA_VERSION = 1 as const;

const nonEmptyId = z.string().min(1);
const intervalSchema = z.object({
  startMs: z.number().finite().nonnegative(),
  endMs: z.number().finite().positive(),
}).superRefine((interval, context) => {
  if (interval.endMs <= interval.startMs) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'endMs must be greater than startMs', path: ['endMs'] });
  }
});

const sourceReferenceSchema = z.object({
  source: z.string().min(1),
  locator: z.string().min(1).optional(),
});

export const videoAssetSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: nonEmptyId,
  matchId: nonEmptyId,
  sourceChecksum: nonEmptyId,
  durationMs: z.number().finite().positive(),
  presentationTimebase: z.enum(['milliseconds', 'microseconds']),
  rights: z.object({
    status: z.enum(['cleared', 'restricted', 'unknown']),
    reference: z.string().min(1).optional(),
  }),
  mediaRef: z.string().min(1),
  synthetic: z.boolean(),
});

export const evidenceClipSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: nonEmptyId,
  videoId: nonEmptyId,
  interval: intervalSchema,
  mediaRef: z.string().min(1),
  sourceChecksum: nonEmptyId,
  access: z.enum(['available', 'expired', 'unavailable']),
  synthetic: z.boolean(),
});

export const tacticalEventSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: nonEmptyId,
  videoId: nonEmptyId,
  interval: intervalSchema,
  observationIds: z.array(nonEmptyId).min(1),
  algorithmVersion: nonEmptyId,
  synthetic: z.boolean(),
});

export const patternOccurrenceSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: nonEmptyId,
  eventIds: z.array(nonEmptyId).min(1),
  interval: intervalSchema,
  clipId: nonEmptyId,
  excludedReason: z.string().min(1).optional(),
  synthetic: z.boolean(),
});

const validationSchema = z.object({
  validationVersion: nonEmptyId,
  decision: z.enum(['coach-reviewed', 'automated']),
  reviewedAt: z.string().datetime().optional(),
});

export const tacticalFindingSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: nonEmptyId,
  opponentId: nonEmptyId,
  statement: z.string().min(1),
  state: z.enum(['CANDIDATE', 'VERIFIED', 'ABSTAINED']),
  occurrenceIds: z.array(nonEmptyId),
  validation: validationSchema.optional(),
  qualitySignals: z.object({
    evidenceCoverage: z.number().finite().min(0).max(1).nullable(),
    calibrationError: z.number().finite().nonnegative().nullable(),
  }),
  reasonCodes: z.array(z.string().min(1)),
  synthetic: z.boolean(),
}).superRefine((finding, context) => {
  if (finding.state === 'VERIFIED') {
    if (finding.occurrenceIds.length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'VERIFIED findings require occurrences', path: ['occurrenceIds'] });
    }
    if (!finding.validation || finding.validation.decision !== 'coach-reviewed') {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'VERIFIED findings require coach-reviewed validation', path: ['validation'] });
    }
  }
  if (finding.state === 'ABSTAINED' && finding.reasonCodes.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'ABSTAINED findings require reason codes', path: ['reasonCodes'] });
  }
});

export const oppositionBriefingSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  id: nonEmptyId,
  opponentId: nonEmptyId,
  findingIds: z.array(nonEmptyId),
  generatedAt: z.string().datetime(),
  freshness: z.enum(['fresh', 'stale']),
  availability: z.enum(['ready', 'empty', 'unavailable']),
  sourceRevision: nonEmptyId,
  synthetic: z.boolean(),
});

export const evidenceBundleSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  synthetic: z.boolean(),
  videoAssets: z.array(videoAssetSchema),
  clips: z.array(evidenceClipSchema),
  events: z.array(tacticalEventSchema),
  occurrences: z.array(patternOccurrenceSchema),
  findings: z.array(tacticalFindingSchema),
  briefing: oppositionBriefingSchema,
}).superRefine((bundle, context) => {
  const videos = new Map(bundle.videoAssets.map((video) => [video.id, video]));
  const clips = new Map(bundle.clips.map((clip) => [clip.id, clip]));
  const events = new Map(bundle.events.map((event) => [event.id, event]));
  const occurrences = new Map(bundle.occurrences.map((occurrence) => [occurrence.id, occurrence]));
  const findings = new Map(bundle.findings.map((finding) => [finding.id, finding]));

  bundle.clips.forEach((clip, index) => {
    const video = videos.get(clip.videoId);
    if (!video) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown video ${clip.videoId}`, path: ['clips', index, 'videoId'] });
    } else if (clip.interval.endMs > video.durationMs) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Clip interval exceeds video duration', path: ['clips', index, 'interval'] });
    }
  });

  bundle.occurrences.forEach((occurrence, index) => {
    if (!clips.has(occurrence.clipId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown clip ${occurrence.clipId}`, path: ['occurrences', index, 'clipId'] });
    }
    occurrence.eventIds.forEach((eventId) => {
      if (!events.has(eventId)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown event ${eventId}`, path: ['occurrences', index, 'eventIds'] });
      }
    });
  });

  bundle.findings.forEach((finding, index) => {
    finding.occurrenceIds.forEach((occurrenceId) => {
      if (!occurrences.has(occurrenceId)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown occurrence ${occurrenceId}`, path: ['findings', index, 'occurrenceIds'] });
      }
    });
  });

  bundle.briefing.findingIds.forEach((findingId, index) => {
    if (!findings.has(findingId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown finding ${findingId}`, path: ['briefing', 'findingIds', index] });
    }
  });

  if (bundle.synthetic !== bundle.briefing.synthetic) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Bundle and briefing synthetic flags must match', path: ['briefing', 'synthetic'] });
  }
});

export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;

export function validateEvidenceBundle(input: unknown) {
  return evidenceBundleSchema.safeParse(input);
}

export { OPPOSITION_SCHEMA_VERSION };
