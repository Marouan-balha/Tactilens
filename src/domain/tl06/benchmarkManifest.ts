import { z } from "zod";

const checksumSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/, "Expected a SHA-256 checksum");

const rightsSchema = z.object({
  status: z.enum(["cleared", "owner-approved", "pending", "rejected"]),
  reference: z.string().min(1),
});

const clipSchema = z.object({
  clipId: z.string().min(1),
  matchId: z.string().min(1),
  sourceVideo: z.string().min(1),
  sourceChecksum: checksumSchema,
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  fps: z.number().positive(),
  rights: rightsSchema,
  split: z.enum(["train", "validation", "held-out"]),
  annotations: z.string().min(1),
  labels: z.array(z.enum(["normal-play", "replay", "camera-cut", "occlusion", "zoom", "partial-view"])),
}).superRefine((clip, context) => {
  if (clip.endFrame <= clip.startFrame) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endFrame"],
      message: "endFrame must be greater than startFrame",
    });
  }
});

const modelSchema = z.object({
  modelId: z.string().min(1),
  weights: z.string().min(1),
  weightsChecksum: checksumSchema,
  sourceRepository: z.string().min(1),
  trainingDataset: z.string().min(1),
  baseModel: z.string().min(1),
  trainingCommand: z.string().min(1),
  license: z.string().min(1),
});

const environmentSchema = z.object({
  recordedAt: z.string().datetime({ offset: true }),
  operatingSystem: z.string().min(1),
  python: z.string().min(1),
  pytorch: z.string().min(1),
  ultralytics: z.string().min(1),
  opencv: z.string().min(1),
  numpy: z.string().min(1),
  scikitLearn: z.string().min(1),
  hardware: z.string().min(1),
});

export const benchmarkManifestSchema = z.object({
  schemaVersion: z.literal(1),
  benchmarkId: z.string().min(1),
  status: z.enum(["pending", "ready", "executed"]),
  clips: z.array(clipSchema).min(1),
  models: z.array(modelSchema).min(1),
  environment: environmentSchema,
  scoring: z.object({
    detection: z.array(z.enum(["precision", "recall", "f1"])).min(1),
    tracking: z.array(z.enum(["hota", "idf1", "id-switches", "fragmentations"])).min(1),
    calibration: z.array(z.enum(["reprojection-error", "valid-frame-coverage"])).min(1),
    runtime: z.array(z.enum(["wall-clock", "fps", "peak-memory"])).min(1),
  }),
});

export type BenchmarkManifest = z.infer<typeof benchmarkManifestSchema>;

export function parseBenchmarkManifest(input: unknown): BenchmarkManifest {
  return benchmarkManifestSchema.parse(input);
}