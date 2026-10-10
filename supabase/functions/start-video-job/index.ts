import { HeadObjectCommand } from 'npm:@aws-sdk/client-s3';
import { SubmitJobCommand } from 'npm:@aws-sdk/client-batch';
import { awsBatch, awsS3, corsJson, requiredEnv } from '../_shared/aws-video.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsJson({ ok: true });
  if (req.method !== 'POST') return corsJson({ error: 'Method not allowed' }, 405);

  try {
    const { jobId, objectKey } = await req.json();
    if (typeof jobId !== 'string' || typeof objectKey !== 'string') return corsJson({ error: 'jobId and objectKey are required' }, 400);

    const inputBucket = requiredEnv('VIDEO_INPUT_BUCKET');
    const outputBucket = requiredEnv('VIDEO_OUTPUT_BUCKET');
    await awsS3.send(new HeadObjectCommand({ Bucket: inputBucket, Key: objectKey }));

    const outputPrefix = `results/${jobId}`;
    const response = await awsBatch.send(new SubmitJobCommand({
      jobName: `tactilens-${jobId.slice(0, 12)}`,
      jobQueue: requiredEnv('AWS_BATCH_JOB_QUEUE'),
      jobDefinition: requiredEnv('AWS_BATCH_JOB_DEFINITION'),
      containerOverrides: {
        environment: [
          { name: 'VIDEO_INPUT_S3_URI', value: `s3://${inputBucket}/${objectKey}` },
          { name: 'VIDEO_OUTPUT_S3_URI', value: `s3://${outputBucket}/${outputPrefix}` },
          { name: 'MODEL_S3_URI', value: requiredEnv('MODEL_S3_URI') },
          { name: 'TACTILENS_JOB_ID', value: jobId },
        ],
      },
      tags: { TactiLensJobId: jobId },
    }));

    return corsJson({ jobId: response.jobId, status: 'queued', outputKey: `${outputPrefix}/run.json` });
  } catch (error) {
    console.error('start-video-job error', error);
    return corsJson({ error: error instanceof Error ? error.message : 'Could not start GPU job' }, 500);
  }
});