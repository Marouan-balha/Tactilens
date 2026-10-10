import { DescribeJobsCommand } from 'npm:@aws-sdk/client-batch';
import { GetObjectCommand } from 'npm:@aws-sdk/client-s3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner';
import { awsBatch, awsRegion, awsS3, corsJson, requiredEnv } from '../_shared/aws-video.ts';

const statusMap: Record<string, 'queued' | 'running' | 'succeeded' | 'failed'> = {
  SUBMITTED: 'queued', PENDING: 'queued', RUNNABLE: 'queued', STARTING: 'running', RUNNING: 'running', SUCCEEDED: 'succeeded', FAILED: 'failed',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsJson({ ok: true });
  if (req.method !== 'POST') return corsJson({ error: 'Method not allowed' }, 405);

  try {
    const { jobId, outputKey } = await req.json();
    if (typeof jobId !== 'string' || typeof outputKey !== 'string') return corsJson({ error: 'jobId and outputKey are required' }, 400);
    const response = await awsBatch.send(new DescribeJobsCommand({ jobs: [jobId] }));
    const job = response.jobs?.[0];
    if (!job) return corsJson({ jobId, status: 'failed', message: 'GPU job was not found' }, 404);

    const status = statusMap[job.status ?? ''] ?? 'failed';
    if (status !== 'succeeded') {
      return corsJson({ jobId, status, message: job.statusReason ?? job.status });
    }

    const outputUrl = await getSignedUrl(awsS3, new GetObjectCommand({ Bucket: requiredEnv('VIDEO_OUTPUT_BUCKET'), Key: outputKey }), { expiresIn: 900 });
    return corsJson({ jobId, status, outputUrl, region: awsRegion });
  } catch (error) {
    console.error('get-video-job error', error);
    return corsJson({ error: error instanceof Error ? error.message : 'Could not read GPU job' }, 500);
  }
});