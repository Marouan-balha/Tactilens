"""
Unit tests for Gate 5: Ball Trajectory/Interpolation and Team Classification
Verifies that interpolation is bounded, physical speed limits are enforced,
and raw observations remain strictly isolated from derived estimates.
"""

import sys
from pathlib import Path
import unittest
import numpy as np

# Ensure benchmark directory is on path
BENCHMARK_DIR = Path(__file__).resolve().parent
if str(BENCHMARK_DIR) not in sys.path:
    sys.path.insert(0, str(BENCHMARK_DIR))
WORKSPACE_ROOT = BENCHMARK_DIR.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from ball_interpolation import BallInterpolator
from team_classifier import TeamClassifier


class TestBallInterpolator(unittest.TestCase):
    def setUp(self):
        self.interpolator = BallInterpolator(
            max_gap_frames=10,
            max_speed_px_per_frame=50.0,
            static_threshold_px=5.0,
            static_min_frames=5,
            interpolation_confidence=0.3
        )

    def test_short_gap_linear_interpolation(self):
        """Short gaps (< max_gap_frames) with plausible speed should be filled."""
        detections = [
            {'frame': 0, 'x': 100.0, 'y': 200.0, 'confidence': 0.8},
            {'frame': 4, 'x': 140.0, 'y': 240.0, 'confidence': 0.85},
        ]
        filled = self.interpolator.interpolate(detections)
        self.assertEqual(len(filled), 5)  # frames 0, 1, 2, 3, 4

        # Verify frame 2 (midpoint)
        mid = [d for d in filled if d['frame'] == 2][0]
        self.assertAlmostEqual(mid['x'], 120.0, places=1)
        self.assertAlmostEqual(mid['y'], 220.0, places=1)
        self.assertTrue(mid.get('interpolated', False))
        # Confidence at midpoint (t=0.5) is 0.3 * (1 - 0.5) = 0.15
        self.assertAlmostEqual(mid.get('confidence'), 0.15, places=2)

        # Verify frame 0 is preserved as raw detection
        f0 = [d for d in filled if d['frame'] == 0][0]
        self.assertFalse(f0.get('interpolated', False))
        self.assertEqual(f0.get('confidence'), 0.8)

    def test_excessive_gap_rejected(self):
        """Gaps exceeding max_gap_frames must NOT be interpolated."""
        detections = [
            {'frame': 0, 'x': 100.0, 'y': 200.0, 'confidence': 0.8},
            {'frame': 20, 'x': 200.0, 'y': 300.0, 'confidence': 0.85},  # Gap is 20 > 10
        ]
        filled = self.interpolator.interpolate(detections)
        self.assertEqual(len(filled), 2)  # No points added

    def test_excessive_speed_rejected(self):
        """Teleportations exceeding max_speed_px_per_frame must NOT be interpolated."""
        detections = [
            {'frame': 0, 'x': 100.0, 'y': 100.0, 'confidence': 0.8},
            {'frame': 2, 'x': 500.0, 'y': 500.0, 'confidence': 0.8},  # Speed ~282 px/frame > 50
        ]
        filled = self.interpolator.interpolate(detections)
        self.assertEqual(len(filled), 2)  # Speed violation rejected

    def test_static_false_positive_rejection(self):
        """Static detections (e.g. penalty spot) should be pruned."""
        detections = [
            {'frame': 0, 'x': 100.0, 'y': 100.0, 'confidence': 0.8},
            {'frame': 1, 'x': 100.5, 'y': 100.2, 'confidence': 0.8},
            {'frame': 2, 'x': 100.1, 'y': 100.0, 'confidence': 0.8},
            {'frame': 3, 'x': 100.2, 'y': 100.3, 'confidence': 0.8},
            {'frame': 4, 'x': 100.0, 'y': 100.1, 'confidence': 0.8},
            {'frame': 5, 'x': 100.4, 'y': 100.0, 'confidence': 0.8},
            {'frame': 10, 'x': 300.0, 'y': 300.0, 'confidence': 0.9},
        ]
        # First 6 frames are static within 5px threshold (>= 5 frames)
        filtered = self.interpolator._remove_static_detections(detections)
        self.assertTrue(len(filtered) < len(detections))
        # Ensure only the moving detection remains
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]['frame'], 10)


class TestTeamClassifier(unittest.TestCase):
    def test_uncalibrated_returns_unknown(self):
        classifier = TeamClassifier()
        dummy_frame = np.zeros((480, 854, 3), dtype=np.uint8)
        result = classifier.classify(dummy_frame, [10, 10, 50, 100])
        self.assertEqual(result, 'unknown')

    def test_empty_crop_handling(self):
        classifier = TeamClassifier()
        dummy_frame = np.zeros((480, 854, 3), dtype=np.uint8)
        color = classifier.get_jersey_color(dummy_frame, [0, 0, 0, 0])
        np.testing.assert_array_equal(color, np.array([0, 0, 0]))

    def test_synthetic_calibration_and_classification(self):
        classifier = TeamClassifier()
        # Create synthetic image with 3 color blocks
        frame = np.zeros((400, 600, 3), dtype=np.uint8)
        # Red region: BGR = [0, 0, 255]
        frame[0:100, 0:100] = [0, 0, 255]
        # Blue region: BGR = [255, 0, 0]
        frame[100:200, 0:100] = [255, 0, 0]
        # Green region: BGR = [0, 255, 0]
        frame[200:300, 0:100] = [0, 255, 0]

        bboxes = [
            [0, 0, 100, 100], [0, 10, 100, 100],
            [0, 100, 100, 200], [0, 110, 100, 200],
            [0, 200, 100, 300], [0, 210, 100, 300]
        ]
        calibrated = classifier.calibrate(frame, bboxes)
        self.assertTrue(calibrated)
        self.assertTrue(classifier.calibrated)


if __name__ == '__main__':
    unittest.main()
