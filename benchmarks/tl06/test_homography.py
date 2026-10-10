import unittest
import numpy as np
from pathlib import Path
import json
import tempfile
import sys
import os

# Add directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))
from homography import HomographyCalibrator, CANONICAL_PITCH_LANDMARKS

class TestHomographyCalibrator(unittest.TestCase):
    def setUp(self):
        self.calibrator = HomographyCalibrator()

    def test_perfect_affine_homography(self):
        # 4 corners of standard pitch mapped from a synthetic camera resolution (1920x1080)
        src_points = [
            (200.0, 150.0),   # Top-left
            (1720.0, 150.0),  # Top-right
            (1900.0, 950.0),  # Bottom-right
            (20.0, 950.0),    # Bottom-left
        ]
        dst_points = [
            (0.0, 0.0),       # Top-left (0, 0)
            (105.0, 0.0),     # Top-right (105, 0)
            (105.0, 68.0),    # Bottom-right (105, 68)
            (0.0, 68.0),      # Bottom-left (0, 68)
        ]

        result = self.calibrator.fit(src_points, dst_points)
        self.assertEqual(result.status, "valid")
        self.assertLess(result.reprojection_error_meters, 0.01)
        self.assertLess(result.reprojection_error_pixels, 0.1)

        # Test forward transform
        pitch_tl = self.calibrator.pixel_to_pitch(200.0, 150.0)
        self.assertIsNotNone(pitch_tl)
        self.assertAlmostEqual(pitch_tl[0], 0.0, delta=0.1)
        self.assertAlmostEqual(pitch_tl[1], 0.0, delta=0.1)

        # Test backward transform
        px_br = self.calibrator.pitch_to_pixel(105.0, 68.0)
        self.assertIsNotNone(px_br)
        self.assertAlmostEqual(px_br[0], 1900.0, delta=0.5)
        self.assertAlmostEqual(px_br[1], 950.0, delta=0.5)

    def test_named_landmarks_fitting(self):
        named_pixel_landmarks = {
            "corner_top_left": (180.0, 120.0),
            "corner_top_right": (1740.0, 120.0),
            "corner_bottom_right": (1880.0, 980.0),
            "corner_bottom_left": (40.0, 980.0),
            "halfway_top": (960.0, 120.0),
            "halfway_bottom": (960.0, 980.0),
            "center_spot": (960.0, 550.0),
        }

        result = self.calibrator.fit_from_named_landmarks(named_pixel_landmarks)
        self.assertIn(result.status, ["valid", "degraded"])
        self.assertEqual(result.num_points_used, 7)

    def test_reject_fewer_than_four_points(self):
        src = [(100.0, 100.0), (200.0, 100.0), (300.0, 200.0)]
        dst = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0)]
        result = self.calibrator.fit(src, dst)
        self.assertEqual(result.status, "rejected")
        self.assertIn("At least 4", result.reason)

    def test_reject_colinear_points(self):
        src = [(100.0, 100.0), (200.0, 100.0), (300.0, 100.0), (400.0, 100.0)]
        dst = [(0.0, 0.0), (10.0, 0.0), (20.0, 0.0), (30.0, 0.0)]
        result = self.calibrator.fit(src, dst)
        self.assertEqual(result.status, "rejected")
        self.assertIn("colinear", result.reason)

    def test_tracking_enrichment(self):
        # Setup valid calibration
        src = [(0, 0), (1000, 0), (1000, 500), (0, 500)]
        dst = [(0, 0), (105, 0), (105, 68), (0, 68)]
        self.calibrator.fit(src, dst)

        raw_observations = [
            {"frame": 10, "track_id": 1, "x": 500.0, "y": 250.0, "team": "team_a"},
            {"frame": 10, "track_id": 2, "x": 1000.0, "y": 500.0, "team": "team_b"},
            {"frame": 10, "track_id": 3, "x": 5000.0, "y": 5000.0, "team": "team_a"}, # out of bounds
        ]

        enriched = self.calibrator.transform_tracking_points(raw_observations)
        self.assertEqual(len(enriched), 3)
        self.assertIn("pitch_x", enriched[0])
        self.assertAlmostEqual(enriched[0]["pitch_x"], 52.5, delta=0.5)
        self.assertAlmostEqual(enriched[0]["pitch_y"], 34.0, delta=0.5)
        self.assertEqual(enriched[2]["calibration_status"], "out_of_bounds")

    def test_save_and_load_calibration(self):
        src = [(100, 100), (900, 100), (950, 600), (50, 600)]
        dst = [(0, 0), (105, 0), (105, 68), (0, 68)]
        res = self.calibrator.fit(src, dst)

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            self.calibrator.save_calibration(tmp_path)
            new_calibrator = HomographyCalibrator()
            loaded_res = new_calibrator.load_calibration(tmp_path)
            self.assertEqual(loaded_res.status, res.status)
            self.assertEqual(loaded_res.num_points_used, res.num_points_used)
            self.assertAlmostEqual(loaded_res.reprojection_error_meters, res.reprojection_error_meters, delta=1e-3)
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

if __name__ == "__main__":
    unittest.main()
