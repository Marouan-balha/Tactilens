"""
TactiVision CV — Pitch Calibration & Homography Transformation
Transforms 2D broadcast camera pixel coordinates into metric pitch coordinates (105m x 68m).
Includes RANSAC homography estimation, reprojection error calculation, and validity gating.
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Union
from pathlib import Path
import json
import numpy as np
import cv2

# Canonical FIFA pitch dimensions (meters)
PITCH_LENGTH = 105.0
PITCH_WIDTH = 68.0

# Canonical 2D pitch landmark coordinates (in meters from top-left corner (0,0))
CANONICAL_PITCH_LANDMARKS: Dict[str, Tuple[float, float]] = {
    "corner_top_left": (0.0, 0.0),
    "corner_bottom_left": (0.0, 68.0),
    "corner_top_right": (105.0, 0.0),
    "corner_bottom_right": (105.0, 68.0),
    "halfway_top": (52.5, 0.0),
    "halfway_bottom": (52.5, 68.0),
    "center_spot": (52.5, 34.0),
    "penalty_box_left_top": (16.5, 13.84),
    "penalty_box_left_bottom": (16.5, 54.16),
    "penalty_box_left_goalline_top": (0.0, 13.84),
    "penalty_box_left_goalline_bottom": (0.0, 54.16),
    "penalty_spot_left": (11.0, 34.0),
    "goal_area_left_top": (5.5, 24.84),
    "goal_area_left_bottom": (5.5, 43.16),
    "penalty_box_right_top": (88.5, 13.84),
    "penalty_box_right_bottom": (88.5, 54.16),
    "penalty_box_right_goalline_top": (105.0, 13.84),
    "penalty_box_right_goalline_bottom": (105.0, 54.16),
    "penalty_spot_right": (94.0, 34.0),
    "goal_area_right_top": (99.5, 24.84),
    "goal_area_right_bottom": (99.5, 43.16),
    "goal_left_center": (0.0, 34.0),
    "goal_right_center": (105.0, 34.0),
}


@dataclass
class CalibrationResult:
    status: str  # "valid" | "degraded" | "rejected" | "unavailable"
    homography_matrix: Optional[List[List[float]]]
    inverse_homography_matrix: Optional[List[List[float]]]
    reprojection_error_meters: float
    reprojection_error_pixels: float
    num_points_used: int
    inliers_count: int
    reason: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


class HomographyCalibrator:
    """
    RANSAC-based homography estimator for mapping broadcast camera pixels to metric pitch coordinates.
    """

    def __init__(
        self,
        pitch_length: float = PITCH_LENGTH,
        pitch_width: float = PITCH_WIDTH,
        valid_error_threshold_meters: float = 1.8,
        degraded_error_threshold_meters: float = 3.5,
    ):
        self.pitch_length = pitch_length
        self.pitch_width = pitch_width
        self.valid_error_threshold = valid_error_threshold_meters
        self.degraded_error_threshold = degraded_error_threshold_meters
        
        self.H: Optional[np.ndarray] = None
        self.H_inv: Optional[np.ndarray] = None
        self.last_result: Optional[CalibrationResult] = None

    def fit(
        self,
        src_pixel_points: Union[List[Tuple[float, float]], np.ndarray],
        dst_pitch_points: Union[List[Tuple[float, float]], np.ndarray],
        ransac_reproj_threshold: float = 5.0,
    ) -> CalibrationResult:
        """
        Compute homography H mapping src_pixel_points -> dst_pitch_points.
        """
        src_pts = np.asarray(src_pixel_points, dtype=np.float32).reshape(-1, 2)
        dst_pts = np.asarray(dst_pitch_points, dtype=np.float32).reshape(-1, 2)

        if len(src_pts) < 4 or len(dst_pts) < 4:
            self.last_result = CalibrationResult(
                status="rejected",
                homography_matrix=None,
                inverse_homography_matrix=None,
                reprojection_error_meters=float("inf"),
                reprojection_error_pixels=float("inf"),
                num_points_used=len(src_pts),
                inliers_count=0,
                reason="At least 4 corresponding landmark pairs are required for homography estimation.",
            )
            return self.last_result

        if len(src_pts) != len(dst_pts):
            self.last_result = CalibrationResult(
                status="rejected",
                homography_matrix=None,
                inverse_homography_matrix=None,
                reprojection_error_meters=float("inf"),
                reprojection_error_pixels=float("inf"),
                num_points_used=len(src_pts),
                inliers_count=0,
                reason="Mismatched number of source and destination points.",
            )
            return self.last_result

        # Check for degenerate colinear points in source or destination
        if self._are_points_colinear(src_pts) or self._are_points_colinear(dst_pts):
            self.last_result = CalibrationResult(
                status="rejected",
                homography_matrix=None,
                inverse_homography_matrix=None,
                reprojection_error_meters=float("inf"),
                reprojection_error_pixels=float("inf"),
                num_points_used=len(src_pts),
                inliers_count=0,
                reason="Degenerate landmark geometry: points are colinear.",
            )
            return self.last_result

        H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, ransac_reproj_threshold)

        if H is None or np.isnan(H).any() or np.isinf(H).any():
            self.last_result = CalibrationResult(
                status="rejected",
                homography_matrix=None,
                inverse_homography_matrix=None,
                reprojection_error_meters=float("inf"),
                reprojection_error_pixels=float("inf"),
                num_points_used=len(src_pts),
                inliers_count=0,
                reason="RANSAC failed to compute a stable homography matrix.",
            )
            return self.last_result

        try:
            H_inv = np.linalg.inv(H)
        except np.linalg.LinAlgError:
            self.last_result = CalibrationResult(
                status="rejected",
                homography_matrix=None,
                inverse_homography_matrix=None,
                reprojection_error_meters=float("inf"),
                reprojection_error_pixels=float("inf"),
                num_points_used=len(src_pts),
                inliers_count=0,
                reason="Homography matrix is singular / non-invertible.",
            )
            return self.last_result

        inliers_count = int(mask.sum()) if mask is not None else len(src_pts)

        # 1. Forward Reprojection Error (Meters RMSE)
        src_homo = np.hstack([src_pts, np.ones((len(src_pts), 1))])
        projected_dst_homo = (H @ src_homo.T).T
        projected_dst = projected_dst_homo[:, :2] / (projected_dst_homo[:, 2:3] + 1e-8)
        error_meters = float(np.sqrt(np.mean(np.sum((dst_pts - projected_dst) ** 2, axis=1))))

        # 2. Inverse Reprojection Error (Pixels RMSE)
        dst_homo = np.hstack([dst_pts, np.ones((len(dst_pts), 1))])
        projected_src_homo = (H_inv @ dst_homo.T).T
        projected_src = projected_src_homo[:, :2] / (projected_src_homo[:, 2:3] + 1e-8)
        error_pixels = float(np.sqrt(np.mean(np.sum((src_pts - projected_src) ** 2, axis=1))))

        # Determine status based on thresholds
        if error_meters <= self.valid_error_threshold and inliers_count >= 4:
            status = "valid"
            reason = f"Valid homography calibrated with {error_meters:.2f}m RMSE ({error_pixels:.1f}px)."
        elif error_meters <= self.degraded_error_threshold and inliers_count >= 4:
            status = "degraded"
            reason = f"Degraded calibration precision: {error_meters:.2f}m RMSE exceeds {self.valid_error_threshold}m threshold."
        else:
            status = "rejected"
            reason = f"Rejected: error {error_meters:.2f}m exceeds max allowable tolerance {self.degraded_error_threshold}m."

        self.H = H
        self.H_inv = H_inv
        self.last_result = CalibrationResult(
            status=status,
            homography_matrix=H.tolist(),
            inverse_homography_matrix=H_inv.tolist(),
            reprojection_error_meters=round(error_meters, 3),
            reprojection_error_pixels=round(error_pixels, 2),
            num_points_used=len(src_pts),
            inliers_count=inliers_count,
            reason=reason,
        )
        return self.last_result

    def fit_from_named_landmarks(
        self,
        pixel_landmarks: Dict[str, Tuple[float, float]],
        ransac_reproj_threshold: float = 5.0,
    ) -> CalibrationResult:
        """
        Fit using a dictionary of named pitch landmarks (e.g. {"center_spot": (960, 540)}).
        """
        src_points = []
        dst_points = []

        for name, px_coords in pixel_landmarks.items():
            canonical_name = name.lower().strip()
            if canonical_name in CANONICAL_PITCH_LANDMARKS:
                src_points.append(px_coords)
                dst_points.append(CANONICAL_PITCH_LANDMARKS[canonical_name])

        if len(src_points) < 4:
            self.last_result = CalibrationResult(
                status="rejected",
                homography_matrix=None,
                inverse_homography_matrix=None,
                reprojection_error_meters=float("inf"),
                reprojection_error_pixels=float("inf"),
                num_points_used=len(src_points),
                inliers_count=0,
                reason=f"Only {len(src_points)} matched canonical pitch landmarks found (minimum 4 required).",
            )
            return self.last_result

        return self.fit(src_points, dst_points, ransac_reproj_threshold)

    def pixel_to_pitch(self, pixel_x: float, pixel_y: float) -> Optional[Tuple[float, float]]:
        """
        Transform a single (u, v) pixel coordinate into (X, Y) meters on the pitch.
        """
        if self.H is None:
            return None

        pt = np.array([pixel_x, pixel_y, 1.0], dtype=np.float32)
        proj = self.H @ pt
        if abs(proj[2]) < 1e-7:
            return None

        pitch_x = float(proj[0] / proj[2])
        pitch_y = float(proj[1] / proj[2])

        # Clamping sanity: allow up to 10m buffer outside boundary lines
        if pitch_x < -10.0 or pitch_x > (self.pitch_length + 10.0) or pitch_y < -10.0 or pitch_y > (self.pitch_width + 10.0):
            return None

        return round(pitch_x, 2), round(pitch_y, 2)

    def pitch_to_pixel(self, pitch_x: float, pitch_y: float) -> Optional[Tuple[float, float]]:
        """
        Transform a single (X, Y) meter pitch coordinate back into (u, v) pixel space.
        """
        if self.H_inv is None:
            return None

        pt = np.array([pitch_x, pitch_y, 1.0], dtype=np.float32)
        proj = self.H_inv @ pt
        if abs(proj[2]) < 1e-7:
            return None

        pixel_x = float(proj[0] / proj[2])
        pixel_y = float(proj[1] / proj[2])
        return round(pixel_x, 1), round(pixel_y, 1)

    def transform_tracking_points(
        self,
        tracking_observations: List[dict],
    ) -> List[dict]:
        """
        Add metric 'pitch_x' and 'pitch_y' coordinates to player/ball observations.
        If calibration is invalid or missing, preserves original coordinates without false precision.
        """
        if self.last_result is None or self.last_result.status not in ["valid", "degraded"]:
            return tracking_observations

        transformed = []
        for obs in tracking_observations:
            item = dict(obs)
            x, y = obs.get("x"), obs.get("y")
            if x is not None and y is not None:
                pitch_coords = self.pixel_to_pitch(float(x), float(y))
                if pitch_coords is not None:
                    item["pitch_x"], item["pitch_y"] = pitch_coords
                    item["calibration_status"] = self.last_result.status
                else:
                    item["calibration_status"] = "out_of_bounds"
            transformed.append(item)
        return transformed

    def save_calibration(self, output_path: Union[str, Path]) -> None:
        """Save calibration result to JSON."""
        if self.last_result is None:
            raise ValueError("No calibration result to save.")
        
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.last_result.to_dict(), f, indent=2)

    def load_calibration(self, input_path: Union[str, Path]) -> CalibrationResult:
        """Load calibration result from JSON."""
        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.H = np.array(data["homography_matrix"], dtype=np.float32) if data.get("homography_matrix") else None
        self.H_inv = np.array(data["inverse_homography_matrix"], dtype=np.float32) if data.get("inverse_homography_matrix") else None
        self.last_result = CalibrationResult(**data)
        return self.last_result

    @staticmethod
    def _are_points_colinear(points: np.ndarray, tolerance: float = 1e-4) -> bool:
        """Check if 3 or more points in a set are exactly colinear."""
        if len(points) < 3:
            return True
        p0 = points[0]
        v0 = points[1] - p0
        v0_norm = np.linalg.norm(v0)
        if v0_norm < tolerance:
            return True
        v0_unit = v0 / v0_norm
        
        colinear_count = 2
        for p in points[2:]:
            v = p - p0
            v_norm = np.linalg.norm(v)
            if v_norm < tolerance:
                continue
            cross = abs(v0_unit[0] * (v[1]/v_norm) - v0_unit[1] * (v[0]/v_norm))
            if cross < tolerance:
                colinear_count += 1
        return colinear_count == len(points)
