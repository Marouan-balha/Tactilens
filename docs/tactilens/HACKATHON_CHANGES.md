# Hackathon change record

Keep pre-existing TactiVision work separate from work performed during the hackathon. Source presence is not a claim of deployed functionality or independently verified football data.

## Pre-existing baseline

Commit `81c6374a7320283b5b02de24e18cdfa2d0141727` (2026-07-06): React/Vite web app, Opposition Analyst hook and Supabase endpoint, bundled club/international datasets, dashboard/keyword visualizations, knowledge ingestion/full-text retrieval, PDF exports and test configuration. See [source audit](FOUNDATION_AUDIT.md) for capability limits.

## Actual foundation changes

| Date | Evidence | Change | Validation / limitation |
| --- | --- | --- | --- |
| 2026-09-22 (Europe/Budapest) | `d6f2a05`, [PR #1](https://github.com/ousssamarahmani/TactiLens/pull/1) | TactiLens logo/README/page metadata, npm package name, environment example and synchronized lockfile | Build and one placeholder test passed; lint had 25 errors/7 warnings. This was branding/setup, not a TV or CV implementation. |
| 2026-09-22 | GitHub repository metadata, outside Git history | Renamed repository to TactiLens; updated description/topics | Previously verified through GitHub API; no product capability added. |
| 2026-09-22 | Four documents in this directory; commit containing this entry | Source-backed reuse audit, architecture, gated implementation plan and this change record | Documentation/link/whitespace checks; no runtime files changed in this increment. |

The foundation PR records proposed changes; this log does not imply it has been merged. Dates use local time; the first branding commit is 2026-09-21 in UTC.

## Implementation status

Presentation follow-up, 2026-09-22: replaced the original orange artwork with the owner's green logo, simplified the repository landing page, added contribution guidance and a PR template, and corrected the setup prerequisite to Node.js 22+. This is documentation/branding work; no product capability added.

Shared-core extraction, new Opposition API, CV, evidence validation/player, Fire TV shell, remote navigation, briefing mode, Vega validation and AWS integration: **NOT STARTED**.

## TL-01 characterization work

2026-09-30: Added local Vitest characterization coverage for the existing international adapter, SSE transport, opposition hook reset/concurrency behavior, and club/international PDF exports. The suite passes 8 tests without live provider calls. The tests record current zero fallbacks for unavailable international metrics, malformed-stream completion behavior, and the possibility that an older concurrent response overwrites a newer response. Browser characterization remains blocked by the undeclared `lovable-agent-playwright-config` dependency.

2026-09-30: Added the TL-02 normalized opposition contracts and tests. The additive boundary preserves legacy aliases, resolves home/away opponent ids, derives deterministic match ids without array positions, and represents unavailable metrics as nullable values with reasons. Existing web data shapes were not changed.

2026-09-30: Completed TL-03 extraction of pure request, SSE transport, opposition context, and RAG helper boundaries. Existing endpoint payloads, RPC fallback behavior, provider calls, and streamed browser reports remain compatible. Validation passed with 25 tests and a production build; the live Real Madrid Full Report flow returned reasoning and RAG results without a fetch error.

2026-09-30: Completed TL-04 with versioned evidence and briefing schemas plus cross-reference validators. Synthetic fixtures are explicitly labeled; invalid intervals, broken references, unsupported VERIFIED states, and missing abstention reasons are rejected. No existing AI prose was relabeled as verified evidence. Validation passed with 29 tests and a production build.

2026-10-01: Started the TL-05 platform spike. Repo inspection confirms the current product is a Vite/React web app with no native Vega or Fire OS project files, no `manifest.toml`, no `build.gradle`, and no `@amazon-devices/*` runtime packages. The current state is a product-intent Fire TV story and a validated web foundation, not a proven native TV runtime.

2026-10-01: Started TL-06 as the next technical workstream. The project continues with an offline CV benchmark plan because the Fire TV device validation is still pending and the CV benchmark is the next technical dependency for evidence quality and rights-cleared evaluation.
2026-10-03: Started TL-06 Phase 0 with a versioned benchmark manifest contract, Gate 0 validation tests, and a pending example manifest. No footage, model provenance, or benchmark result is claimed until the external CV worker and rights records are supplied.
2026-10-06: Added the read-only evidence result boundary. Validated bundles are classified as ready, empty, stale, unavailable, or invalid; transport failures and malformed bundles cannot enter the application as partial evidence. No CV execution or verified finding promotion was added.
2026-10-06: Added the first asynchronous footage workflow: browser upload UI, presigned S3 upload contract, AWS Batch job submission/status contracts, and deployment documentation. AWS resources and credentials are not provisioned in the repository; output remains candidate-only until the CV benchmark gates pass.
2026-10-09: Completed TL-06 Phase 0 Gate 0. Extracted and recorded exact SHA-256 checksums for source video (match_5min.mp4) and candidate models (best.pt, yolov8m.pt, yolo11m.pt), pinned execution environment baseline (Python 3.11.9, PyTorch 2.0.1+cpu, Ultralytics 8.4.115, Supervision 0.25.1), and committed the validated benchmark manifest in benchmarks/tl06/manifest.json with full Vitest schema coverage.
2026-10-09: Completed TL-06 Phase 1 & 2 baseline evaluation (Gate 1 & Gate 2). Implemented benchmarks/tl06/evaluate_baseline.py to evaluate detection confidence distributions, tracking continuity, ball frame coverage (12.74%), and team classification shares from normalized run outputs. Generated baseline_report.json and BASELINE_REPORT.md.

## Future entry template

Copy only when work actually occurs; never manufacture feedback or demo evidence.

```text
Date/time and timezone:
Task ID and author:
Baseline -> resulting commit / PR:
What changed and why:
Pre-existing modules reused:
New capability delivered (or documentation only):
Setup/run changes:
Tests, target device/runtime and observed results:
Evidence links (clips/screenshots/logs):
Limitations, failures and remaining work:
Tools/APIs/SDKs actually used and purpose:
Onboarding experience; what worked; what needs work:
Would use again and why:
Optional friction: task, steps, expected/actual, severity, workaround, suggestion:
```
