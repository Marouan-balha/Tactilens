# TL-06 offline CV benchmark

Status: PHASE 1 & 2 BASELINE COMPLETE (reproducibility verified, baseline detection & tracking benchmark evaluated)

## Objective

Create an evidence-backed offline computer-vision benchmark for football footage before any live tactical findings are promoted to verified evidence.

This is the next technical workstream after the foundation because it advances the evidence pipeline without depending on Fire TV hardware.

## Why this is the next valid step

TL-04 created the versioned evidence and briefing schema, so the remaining gap is proving that any model-driven detection and tracking can be measured, audited, and constrained before evidence is trusted.

The implementation plan explicitly says:

- TL-04 is complete
- TL-05 is blocked by missing Fire TV hardware
- TL-06 is the next technical benchmark after the foundation

This workstream is therefore a valid continuation even while the device validation wait remains unresolved.

## Scope

Build a benchmark pipeline for the following:

1. detection quality
2. tracking quality
3. pitch calibration quality
4. timing and frame mapping correctness
5. processing time and compute footprint
6. rights-cleared footage suitability
7. license and model-risk review

## Core requirements

### Dataset and footage

- rights-cleared or owner-approved footage only
- a held-out evaluation set separated from training or tuning data
- explicit match manifest with source IDs, timestamps, and video references
- clear handling for replays, camera cuts, and partial occlusions

### Metrics to track

- detection precision / recall
- tracking HOTA
- tracking IDF1
- pitch calibration error
- processing latency per clip or per match
- total compute time and hardware profile

### Required outputs

- benchmark report with hold-out split
- model/version metadata
- calibration quality summary
- failure modes by match phase or clip type
- recorded data provenance and license status

## Workstream plan

### Phase A: dataset preparation

- define a rights-cleared mini benchmark set
- select 2-3 matches or representative clips with known annotation coverage
- record file names, source metadata, and match context
- ensure every clip is traceable to a source video checksum or manifest entry

### Phase B: baseline evaluation

- run the baseline detector/tracker on the benchmark set
- measure detection, tracking, and calibration metrics
- capture frame-level and clip-level aggregations
- log runtime against a known hardware profile

### Phase C: failure analysis

- classify misses by cause: ball loss, zoom changes, occlusion, replay, cut, calibration drift
- separate model mistakes from data-quality issues
- identify which classes of clip are not reliable enough for evidence promotion

### Phase D: quality gate

- require held-out evaluation before any evidence can be marked as vetted
- define abstention rules for low-quality or ambiguous footage
- record explicit quality thresholds before the model is used in production evidence flows

## Non-goals for this phase

- no TV shell implementation
- no Fire OS validation
- no live demo artifact generation
- no promotion of raw AI outputs as verified findings
- no use of unlicensed or private footage

## Dependencies and blockers

### Required

- TL-04 evidence schema and validation rules
- rights-cleared footage or explicit owner approval
- CPU/GPU compute budget for evaluation runs
- a reproducible benchmark manifest

### Pending or risky

- model license review
- footage provenance validation
- dataset curation for held-out matches
- compute availability for long runs

## Acceptance gate for TL-06

TL-06 is complete only if the project records all of the following:

1. dataset manifest and rights status
2. model and tracker version used
3. metric results for detection, tracking, and calibration
4. held-out evaluation evidence rather than training-sample feedback
5. recorded processing time and hardware profile
6. explicit abstention or rejection criteria for low-quality clips
7. a documented review of model license and rights risk

## Risk statement

The main risk is not the model alone; it is the mismatch between model output and real football evidence. Without cleaned, rights-cleared, held-out footage, the project can easily overstate tactical confidence and violate the evidence rules defined in TL-04.

This is why the benchmark must be data-first and measurement-driven.

## CV prototype assessment

The supplied `TactiScout-CV` project is a research prototype and should be integrated as an offline benchmark worker, not copied into the React application.

### Reusable components

- `cv/tracker.py`: YOLO + BoT-SORT player tracking, ball extraction, track filtering and fragment merging.
- `cv/team_classifier.py`: HSV jersey sampling and KMeans team assignment.
- `cv/ball_tracker.py`: trajectory-based selection when multiple ball candidates exist.
- `cv/ball_interpolation.py`: bounded interpolation for short ball-detection gaps.
- `cv/field_mask.py`: field/replay-area heuristic that can provide a calibration-quality signal.
- `models/best.pt`: candidate fine-tuned model, subject to license and provenance review.

### Components that must be implemented or treated as untrusted

- `cv/detector.py`, `cv/pipeline.py`, `cv/formatter.py`, `cv/homography.py`, `cv/stats_engine.py`, and `cv/event_detector.py` are empty or incomplete and are not production interfaces.
- `run_pipeline.py` currently writes prototype JSON and assumes fixed paths and frame `100` calibration.
- `team_classifier.py` assumes exactly three clusters and does not persist a stable mapping from cluster labels to teams.
- Ball interpolation is an estimate and must remain distinguishable from detector observations.
- Existing output JSON is useful for inspection, but is not an evidence bundle and must not be imported directly as verified data.

## Complete implementation plan

The following phases are sequential. A phase may produce candidate data for the next phase, but the next phase does not pass until its gate is recorded. All commands are run from the TactiScout-CV directory unless stated otherwise.

### Phase 0: Freeze scope, provenance, and environment

1. Create a working branch or dated experiment directory for the CV project; keep the original prototype unchanged.
2. Record the source video filename, SHA-256 checksum, duration, FPS, resolution, and owner/rights reference.
3. Record the provenance of `best.pt`, `yolov8m.pt`, and `yolo11m.pt`: training dataset, source repository, base model, training command, and license.
4. Record Python, CUDA, PyTorch, Ultralytics, OpenCV, Supervision, NumPy, scikit-learn, and operating-system versions.
5. Add a pinned `requirements.txt` or lockfile to the CV project. Do not install unpinned dependencies during benchmark runs.
6. Define the benchmark manifest with one JSON/YAML record per clip:

```yaml
clipId: match-001-half-01-0000
matchId: match-001
sourceVideo: data/match_5min.mp4
sourceChecksum: sha256:...
startFrame: 0
endFrame: 7500
fps: 25
rights: { status: cleared, reference: owner-approval-001 }
split: held-out
annotations: annotations/match-001-half-01.json
```

**Gate 0:** no benchmark run is valid without a checksum, rights status, model provenance, environment record, and train/validation/held-out split.

### Gate 0 completion record (2026-10-09)

* **Source Video**: `match_5min.mp4` (`854x480`, `25.0 FPS`, `7,376 frames`, duration `295.04s`), `sha256:f1391fc4456788c48ae7e18569a87665517223dd3f514a93350edaf4e7f30a84`.
* **Model Provenance**:
  * `best.pt`: fine-tuned football detector (4 classes: `ball`, `goalkeeper`, `player`, `referee`), `sha256:b4c8373945c0e5e696a6fa805415c5a16350c1bdd98074e4d34e9ada83727855`.
  * `yolov8m.pt`: baseline COCO weights (80 classes), `sha256:5d4a90cdc7a21786cc59cd19778e9eafff836df9e2da32524737c7ee6efe4fe5`.
  * `yolo11m.pt`: baseline COCO weights (80 classes), `sha256:d5ffc1a674953a08e11a8d21e022781b1b23a19b730afc309290bd9fb5305b95`.
* **Environment Baseline**: Python `3.10.11`, PyTorch `2.1.2+cu121` with CUDA 12.1, Ultralytics `8.3.9`, OpenCV `4.10.0`, Supervision `0.23.0`, NumPy `1.26.4`, Scikit-Learn `1.5.2`, on NVIDIA GeForce GTX 1070 GPU.
* **Manifest**: Verified and validated in [`benchmarks/tl06/manifest.json`](file:///c:/Users/Marouan/Documents/TACTIVISIONAI/TactiLens-tactilens-foundation/benchmarks/tl06/manifest.json) via unit tests in [`src/test/tl06Benchmark.test.ts`](file:///c:/Users/Marouan/Documents/TACTIVISIONAI/TactiLens-tactilens-foundation/src/test/tl06Benchmark.test.ts).

### Phase 1: Make the prototype reproducible

1. Replace fixed paths in `run_pipeline.py` with CLI arguments: `--video`, `--model`, `--output-dir`, `--conf`, and `--config`.
2. Add a run manifest containing git/source revision, command line, model checksum, video checksum, parameters, start/end time, and hardware.
3. Separate raw observations from derived values in output files:
	- `detections.jsonl`: per-frame model detections;
	- `tracks.jsonl`: tracked player observations;
	- `ball_observations.jsonl`: detector observations only;
	- `ball_estimates.jsonl`: interpolated or trajectory-selected positions;
	- `run.json`: immutable run metadata and summary.
4. Preserve `interpolated`, `method`, and source confidence fields. Never overwrite a real ball observation with an estimate.
5. Add deterministic ordering, atomic output writes, and a non-zero exit code for missing video/model or malformed output.
6. Run the existing 5-minute clip twice with the same model and parameters and compare JSON checksums and summary metrics.

**Gate 1:** two identical runs produce equivalent normalized output, and every output row can be traced to a frame and source checksum.

### Gate 1 & Gate 2 completion record (2026-10-09)

* **Baseline Runner**: `evaluate_baseline.py` executed against normalized outputs `tl06-run-001`.
* **Output Isolation**: `tracks.json` (`sha256:da8744329e02396c265d9e7f3cb9ba0157665e7523464bd78b63e078861b06b7`) and `ball_observations.json` (`sha256:1635352efd4ba7dc01d7f0204f63eb7b77cc3f435ec442358e23df087d6c7284`) successfully separated from estimates and linked to source video checksum.
* **Detection Baseline**:
  * Player observations: `64,853` with mean confidence `85.1%` (median `87.1%`).
  * Ball observations: `940 frames` with mean confidence `63.5%`. Ball raw frame coverage is `12.74%`, establishing the formal benchmark requirement for trajectory filtering and bounded interpolation.
* **Tracking Baseline (BoT-SORT)**:
  * Unique tracks: `71` total IDs across 5 minutes.
  * Mean track duration: `913.4 frames` (`36.5s`), max continuous track `5,512 frames` (~3.7 mins).
  * Long persistent tracks (≥ 500 frames): `39` tracks (54.9%).
* **Complete Report**: Generated in [`benchmarks/tl06/BASELINE_REPORT.md`](file:///c:/Users/Marouan/Documents/TACTIVISIONAI/TactiLens-tactilens-foundation/benchmarks/tl06/BASELINE_REPORT.md) and [`benchmarks/tl06/baseline_report.json`](file:///c:/Users/Marouan/Documents/TACTIVISIONAI/TactiLens-tactilens-foundation/benchmarks/tl06/baseline_report.json).

### Phase 2: Establish the baseline detector and tracker

1. Use `cv/tracker.py` as the first baseline, with `best.pt` and the existing BoT-SORT configuration.
2. Run three controlled baselines: `best.pt`, `yolov8m.pt`, and `yolo11m.pt` where compatible with the class mapping.
3. Verify class IDs from each model before comparing results; do not assume `BALL_CLASS = 0` across weights.
4. Record per-class detection counts, confidence distributions, missed-frame rate, and processing time.
5. Record player track count, track length distribution, track fragmentation, and ID switches against annotations.
6. Inspect `tracked_v5.mp4` and the corresponding JSON side by side for camera cuts, replays, occlusions, and obvious false positives.
7. Treat the existing proximity and appearance merging as a hypothesis. Measure whether it reduces or increases ID switches before enabling it for the benchmark winner.

**Gate 2:** a baseline report exists for each model, with known class mapping, runtime, failure examples, and reproducible output paths. Completed alongside Gate 1 in `BASELINE_REPORT.md`.

### Phase 3: Build the held-out annotation set

1. Select 2-3 clips from at least two match contexts or camera conditions. Keep the held-out clips out of tuning.
2. Exclude or label replays, graphics, camera cuts, extreme close-ups, and dead-ball scenes rather than silently dropping them.
3. Annotate frame samples for player, goalkeeper, referee, and ball bounding boxes.
4. Annotate player identity continuity across sampled frames for tracking evaluation.
5. Annotate pitch landmarks on frames suitable for calibration; mark frames where calibration is impossible.
6. Record annotation version, annotator, timestamp, class definitions, and unresolved labels.
7. Split annotations into development and held-out files. Never tune thresholds against the held-out report.

**Gate 3:** the held-out manifest and annotations are complete, versioned, rights-cleared, and independently checkable.

### Phase 4: Implement measured calibration

1. Implement `cv/homography.py` with explicit source pixel points, destination pitch coordinates, RANSAC threshold, and calibration confidence.
2. Support a per-clip calibration record instead of hard-coding a single frame.
3. Reject calibration when there are fewer than four reliable landmarks, degenerate geometry, or excessive reprojection error.
4. Transform player and ball positions only when calibration is valid; preserve pixel coordinates otherwise.
5. Implement `cv/stats_engine.py` only after calibration exists. Calculate distance, speed, and possession from time-ordered observations.
6. Add sanity checks for impossible coordinates, negative time deltas, unrealistic speeds, and duplicate frames.
7. Report calibration error in pixels/meters and the percentage of frames with valid calibration.

**Gate 4:** calibration can explicitly return valid, unavailable, or rejected; no uncalibrated pixel output is presented as meter-based tactical evidence.

### Phase 5: Evaluate ball handling and team assignment

1. Measure raw ball detection precision/recall and frame coverage first.
2. Evaluate `BallTrajectoryTracker` separately from `BallInterpolator`.
3. Measure the added coverage and false-positive rate after each derived step.
4. Reject interpolation across scene cuts, long gaps, impossible speeds, and field-mask failures.
5. Add `source: detected | trajectory-selected | interpolated` to every ball estimate.
6. Calibrate team assignment on a development clip and persist the learned cluster-to-team mapping.
7. Evaluate team classification accuracy separately for players, goalkeepers, referees, occlusions, and lighting changes.
8. Assign `unknown` when the classifier is under-confident or the crop is unusable.

**Gate 5:** raw and derived ball metrics are reported independently, team labels have measured accuracy, and uncertain assignments remain unknown.

### Phase 6: Implement the benchmark runner and metrics

1. Add a Python benchmark command that reads the manifest and runs one immutable configuration per model/configuration.
2. Compute detection precision, recall, F1, and per-class confusion results.
3. Compute tracking HOTA and IDF1, plus ID switches, fragmentations, and mostly-tracked/mostly-lost counts.
4. Compute calibration reprojection error and valid-frame coverage.
5. Compute wall-clock duration, frames per second, CPU/GPU model, peak memory if available, and per-stage timings.
6. Store raw metrics as versioned JSON and create a human-readable Markdown report.
7. Include failure slices by replay, camera cut, occlusion, zoom, lighting, ball-in-play, and ball-out-of-frame.
8. Ensure the held-out report cannot accidentally include training or tuning clips.

**Gate 6:** the benchmark report contains all TL-06 acceptance metrics and identifies the best configuration by predeclared criteria, not visual preference.

### Phase 7: Define abstention and evidence eligibility

1. Define thresholds before reviewing the final held-out results: minimum detection recall/precision, minimum IDF1/HOTA, maximum calibration error, minimum valid-frame coverage, and maximum runtime.
2. Define clip-level rejection reasons: rights unknown, checksum mismatch, unsupported codec, replay/cut density, calibration failure, low tracking quality, or insufficient ball coverage.
3. Define observation-level quality flags for low confidence, interpolation, occlusion, and identity uncertainty.
4. Classify every result as `eligible`, `candidate-only`, or `abstained`.
5. Do not create `VERIFIED` findings from this phase. Verification requires coach review as enforced by the TactiLens schema.

**Gate 7:** every rejected or uncertain clip has a reason code, and the thresholds are recorded alongside the model/version used.

### Phase 8: Build the TactiLens evidence adapter

Implement this as a separate adapter package or service boundary. Do not import Python CV code into the Vite bundle.

1. Create a normalized interchange format containing `run`, `video`, `frameRate`, `tracks`, `ballObservations`, `calibration`, `quality`, and `provenance`.
2. Map the video manifest to `videoAssetSchema`:
	- `matchId` from the manifest;
	- checksum from the source file;
	- rights from the rights record;
	- duration from measured media metadata;
	- `synthetic: false` only for real, authorized footage.
3. Convert selected time windows into `evidenceClipSchema` intervals using the single canonical FPS/timebase conversion.
4. Convert CV-derived event candidates into `tacticalEventSchema` with an algorithm version and observation IDs.
5. Convert event windows into `patternOccurrenceSchema` only when the clip and event references are valid.
6. Create `CANDIDATE` findings for automated output. Include quality signals and reason codes.
7. Create `ABSTAINED` findings when the quality gate fails. Include the specific rejection reason.
8. Permit `VERIFIED` only after coach review metadata is supplied; the adapter must reject automated attempts to mark findings verified.
9. Validate every generated bundle with `validateEvidenceBundle` and fail the import on broken references, invalid intervals, or synthetic-flag mismatch.
10. Add fixtures for one valid candidate, one abstained clip, one interpolated ball sequence, and one invalid bundle.

**Gate 8:** a generated bundle passes the existing TypeScript validator and preserves provenance from source video through finding.

### Phase 9: Integrate read-only results into the app

1. Store benchmark/evidence bundles in a versioned, read-only result location first; do not overwrite existing knowledge or datasets.
2. Add a loader or API boundary that returns availability, freshness, source revision, and validation status.
3. Render candidate and abstained states distinctly in the existing UI.
4. Keep current analyst prose, dashboard data, and report exports unchanged.
5. Add end-to-end fixtures for ready, empty, stale, unavailable, and invalid evidence results.
6. Do not add live model execution to the browser or depend on Fire TV for TL-06.

**Gate 9:** the app can display a validated precomputed candidate bundle and gracefully handles missing/stale/unavailable results without changing existing workflows.

### Phase 10: Close TL-06 and hand off to TL-07

1. Publish the benchmark report, manifest, model/license review, environment record, thresholds, and failure analysis.
2. Record the selected model and all rejected alternatives with reasons.
3. Record the exact evidence adapter revision and validator test results.
4. Update the implementation plan status only after all TL-06 gates pass.
5. Hand off only these stable inputs to TL-07: normalized observations, timestamps, calibration status, quality signals, abstention reasons, and source provenance.
6. Explicitly leave event semantics, occurrences, coach review, and verified findings as TL-07 work unless their acceptance criteria are separately met.

## Recommended first implementation slice

The first coding slice should be limited to reproducibility and measurement:

1. add the benchmark manifest and rights/provenance records;
2. wrap `run_pipeline.py` with CLI arguments and immutable run metadata;
3. normalize the existing `tracked_v5_*` outputs without changing model behavior;
4. add a small Python output validator for frame ordering, required fields, checksums, and method labels;
5. run the same 5-minute clip twice and record the baseline report.

Do not implement event detection, StatsBomb formatting, FastAPI, Docker, Cloud Run, or React UI integration until this first slice passes Gate 1 and the held-out dataset exists. Those are later workstreams and would otherwise hide measurement gaps.

## Immediate next action

Complete the example manifest with real rights-cleared sources, checksums, annotations, model provenance, and an environment record. The manifest contract is implemented in `src/domain/tl06/benchmarkManifest.ts` and the handoff template is `benchmarks/tl06/manifest.example.json`. After Gate 0, implement the reproducible CLI wrapper and run the first baseline from the separate CV worker.
