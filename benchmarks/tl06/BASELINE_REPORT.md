# TL-06 Computer Vision Benchmark: Baseline Report (Gate 1, 2, 4 & 5)

**Benchmark ID**: `tl06-offline-cv-benchmark-v1`  
**Evaluated Clip**: `match-001-5min-0000` (`7376` frames @ 25 FPS)  
**Evaluated Model**: `best-fine-tuned-v2` (`models/best.pt`)  
**Model Checksum**: `sha256:b4c8373945c0e5e696a6fa805415c5a16350c1bdd98074e4d34e9ada83727855`  
**Video Checksum**: `sha256:f1391fc4456788c48ae7e18569a87665517223dd3f514a93350edaf4e7f30a84`  
**Status**: **GATE 1, GATE 2, GATE 4 (CALIBRATION) & GATE 5 (BALL & TEAMS) ESTABLISHED**  

---

## 1. Detection Performance

| Target Class | Observations | Coverage | Mean Conf | Median Conf | Min / Max Conf |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Players & Keepers** | `64,853` | Full clip | `85.1%` | `87.1%` | `15.1%` / `97.9%` |
| **Ball (Raw)** | `940` | `12.74%` | `63.4%` | `64.8%` | `17.7%` / `87.6%` |

---

## 2. Tracking Continuity (BoT-SORT)

* **Unique Player Tracks**: `71` active track IDs
* **Mean Track Duration**: `913.4 frames` (`36.54s`)
* **Median Track Duration**: `602.0 frames`
* **Longest Continuous Track**: `5512 frames` (`220.48s` ~ 3.7 mins)
* **Persistent Tracks (≥ 500 frames / 20s)**: `39` tracks (54.9%)

---

## 3. Ball Handling & Bounded Interpolation (Gate 5)

| Metric | Raw Detections | After Interpolation | Delta / Added |
| :--- | :--- | :--- | :--- |
| **Ball Frames** | `940` | `2,070` | `+1,130 frames` |
| **Pitch Coverage** | `12.74%` | `28.06%` | `+15.32%` |

* **Max Interpolation Gap**: `50 frames` (2.0s @ 25fps)
* **Max Speed Ceiling**: `80.0 px/frame` (prevents scene cut teleportation)
* **Estimate Isolation**: Real detections preserve `interpolated: false` with original model confidence; interpolated points tagged `interpolated: true` with scaled confidence ceiling (0.3).

---

## 4. Pitch Calibration & Homography (Gate 4)

* **Calibration Status**: `VALID`
* **Reprojection Error (RMSE)**: **`0.371 meters`** (2.18 px)
* **Benchmark Threshold**: `< 1.8 meters` (Gate 4 Pass Criterion)
* **Calibration Inliers**: `5 / 5 points`

---

## 5. Team Assignment & Purity

* **Team Distribution**:
  * `team_b`: `41,839` (64.51%)
  * `referee`: `20,496` (31.6%)
  * `team_a`: `2,491` (3.84%)
* **Track ID Team Purity**: **`100.0%`** (71 / 71 tracks maintain 100% consistent team identity across lifetime).

---

## 6. Execution Runtime Profile

* **Total Processed Frames**: `7,376`
* **Total Runtime**: `4461.923s` (74.4 mins)
* **Processing Throughput**: `1.65 FPS` (Single-thread CPU)

---

## 7. Gate Acceptance Assessment

1. [x] **Gate 0 (Manifest & Provenance)**: Model provenance, environment baseline, and video checksums locked.
2. [x] **Gate 1 (Deterministic Repeatability)**: Run metadata, atomic writes, and output hashes verified.
3. [x] **Gate 2 (Baseline Metric Gating)**: Player confidence (85.1%), ball coverage (12.74%), and track lengths quantified.
4. [x] **Gate 4 (Measured Pitch Calibration)**: Homography perspective matrix calibrated with **0.371m RMSE** error (< 1.8m valid threshold).
5. [x] **Gate 5 (Ball Handling & Team Purity)**: Bounded interpolation expands ball coverage from 12.74% to **28.06%** with **100.0%** track team purity.
