# Video Analysis Worker

The CV worker lives outside the Vite application at:

`C:\Users\Marouan\Documents\TactiScout-CV`

Run it with explicit inputs:

```powershell
Push-Location C:\Users\Marouan\Documents\TactiScout-CV
python run_pipeline.py `
  --video data\match_5min.mp4 `
  --model models\best.pt `
  --output-dir output\tl06-run-001
Pop-Location
```

The worker writes:

- `run.json`: immutable input checksums, parameters, environment, timings, and quality state;
- `tracks.json`: raw player observations;
- `tracks_with_teams.json`: team-classification output;
- `ball_observations.json`: detector observations only;
- `tracked.mp4`: annotated inspection video.

TactiLens validates `run.json` with `src/domain/tl06/videoObservation.ts`. These outputs are observations only. Calibration is currently a quality signal, event extraction is unavailable, and evidence eligibility is always `candidate-only`. No worker output may be imported as `VERIFIED` evidence.