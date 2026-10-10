# AWS Video Processing Pipeline

The browser must not run CV or receive AWS credentials. Video processing is an asynchronous job:

```text
Browser
  -> Supabase create-video-job
  -> presigned S3 PUT
  -> Supabase start-video-job
  -> AWS Batch GPU worker
  -> S3 run.json and observation outputs
  -> Supabase get-video-job
  -> browser opens signed output
```

## Frontend contract

The upload panel calls these Supabase Edge Functions:

- `create-video-job`: validates file metadata and returns a short-lived S3 upload URL;
- `start-video-job`: verifies the uploaded object and submits AWS Batch;
- `get-video-job`: maps Batch status to `queued`, `running`, `succeeded`, or `failed` and signs the output URL.

The first path accepts video files up to 5 GB. Larger footage requires S3 multipart upload before production use.

## AWS resources

Create these resources in one region, currently `eu-central-1`:

1. Private S3 input bucket for `uploads/`.
2. Private S3 output bucket for `results/`.
3. AWS Batch managed GPU compute environment using `g4dn.xlarge` or `g5.xlarge`.
4. Batch job queue attached to that compute environment.
5. Batch job definition for the TactiScout-CV container.
6. Job execution role and instance role with least-privilege S3 read/write access.

The Batch container must read:

- `VIDEO_INPUT_S3_URI`;
- `VIDEO_OUTPUT_S3_URI`;
- `MODEL_S3_URI`;
- `TACTILENS_JOB_ID`.

It must download the input, run the CV worker with `--device cuda:0`, and upload the run metadata and observation outputs to `VIDEO_OUTPUT_S3_URI`. The current first-stage result is `run.json` and remains `candidate-only` until calibration, held-out metrics, and review gates pass.

## Supabase secrets

Set these as server-side Supabase secrets. Never put them in `VITE_*` variables:

```text
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
VIDEO_INPUT_BUCKET=...
VIDEO_OUTPUT_BUCKET=...
AWS_BATCH_JOB_QUEUE=...
AWS_BATCH_JOB_DEFINITION=...
MODEL_S3_URI=s3://your-model-bucket/models/best.pt
```

Deploy the three functions after setting the secrets:

```powershell
supabase functions deploy create-video-job
supabase functions deploy start-video-job
supabase functions deploy get-video-job
```

For production, prefer an AWS role or short-lived credentials over a long-lived IAM user key. Restrict the uploader to `s3:PutObject` under `uploads/*`, the worker to read `uploads/*` and write `results/*`, and the control functions to submit/describe only the configured Batch resources.

## Output boundary

The frontend opens the signed `run.json` result only after the job succeeds. TactiLens validates evidence bundles with the existing evidence schema when they are produced by a later adapter and classifies them as `ready`, `empty`, `stale`, `unavailable`, or `invalid`. A failed or malformed output is never presented as verified evidence.