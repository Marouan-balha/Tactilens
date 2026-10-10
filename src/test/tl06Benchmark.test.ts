import { describe, expect, it } from "vitest";
import { parseBenchmarkManifest } from "@/domain/tl06/benchmarkManifest";

const validManifest = {
  schemaVersion: 1,
  benchmarkId: "tl06-initial-benchmark",
  status: "pending",
  clips: [
    {
      clipId: "match-001-half-01-0000",
      matchId: "match-001",
      sourceVideo: "data/rights-cleared/match-001.mp4",
      sourceChecksum: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      startFrame: 0,
      endFrame: 7500,
      fps: 25,
      rights: { status: "cleared", reference: "owner-approval-001" },
      split: "held-out",
      annotations: "annotations/match-001-half-01.json",
      labels: ["normal-play"],
    },
  ],
  models: [
    {
      modelId: "baseline-model",
      weights: "models/baseline.pt",
      weightsChecksum: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      sourceRepository: "pending-provenance-review",
      trainingDataset: "pending-provenance-review",
      baseModel: "pending-provenance-review",
      trainingCommand: "pending-provenance-review",
      license: "pending-license-review",
    },
  ],
  environment: {
    recordedAt: "2026-10-03T00:00:00Z",
    operatingSystem: "pending",
    python: "pending",
    pytorch: "pending",
    ultralytics: "pending",
    opencv: "pending",
    numpy: "pending",
    scikitLearn: "pending",
    hardware: "pending",
  },
  scoring: {
    detection: ["precision", "recall", "f1"],
    tracking: ["hota", "idf1", "id-switches", "fragmentations"],
    calibration: ["reprojection-error", "valid-frame-coverage"],
    runtime: ["wall-clock", "fps", "peak-memory"],
  },
};

describe("TL06 benchmark manifest", () => {
  it("accepts a pending manifest with Gate 0 provenance fields", () => {
    expect(parseBenchmarkManifest(validManifest)).toEqual(validManifest);
  });

  it.each([
    ["source checksum", { clips: [{ ...validManifest.clips[0], sourceChecksum: "unknown" }] }],
    ["rights reference", { clips: [{ ...validManifest.clips[0], rights: { status: "pending", reference: "" } }] }],
    ["split", { clips: [{ ...validManifest.clips[0], split: "unassigned" }] }],
    ["model license", { models: [{ ...validManifest.models[0], license: "" }] }],
  ])("rejects missing %s", (_field, override) => {
    expect(() => parseBenchmarkManifest({ ...validManifest, ...override })).toThrow();
  });

  it("rejects inverted frame intervals", () => {
    expect(() => parseBenchmarkManifest({
      ...validManifest,
      clips: [{ ...validManifest.clips[0], startFrame: 100, endFrame: 100 }],
    })).toThrow("endFrame must be greater than startFrame");
  });

  it("successfully parses the real Gate 0 benchmarks/tl06/manifest.json", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const raw = fs.readFileSync(path.resolve(__dirname, "../../benchmarks/tl06/manifest.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = parseBenchmarkManifest(parsed);
    expect(validated.benchmarkId).toBe("tl06-offline-cv-benchmark-v1");
    expect(validated.clips.length).toBeGreaterThanOrEqual(1);
    expect(validated.models.length).toBe(3);
    expect(validated.clips[0].fps).toBe(25);
  });

  it("successfully parses and validates benchmarks/tl06/baseline_report.json Gate 1, 4, and 5", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const raw = fs.readFileSync(path.resolve(__dirname, "../../benchmarks/tl06/baseline_report.json"), "utf-8");
    const report = JSON.parse(raw);

    expect(report.gate1Status).toBe("PASSED");
    expect(report.gate4Status).toBe("PASSED");
    expect(report.gate5Status).toBe("PASSED");

    // Gate 4 Calibration accuracy check
    expect(report.calibration.status).toBe("valid");
    expect(report.calibration.reprojectionErrorMeters).toBeLessThan(1.8);

    // Gate 5 Ball handling and interpolation check
    expect(report.ballInterpolation.postInterpolationCoveragePercent).toBeGreaterThan(
      report.ballInterpolation.rawCoveragePercent
    );
    expect(report.teamClassification.trackPurity.trackPurityPercent).toBe(100);
  });
});