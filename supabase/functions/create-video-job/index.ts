import { PutObjectCommand } from 'npm:@aws-sdk/client-s3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner';
import { awsS3, corsJson, requiredEnv } from '../_shared/aws-video.ts';

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsJson({ ok: true });
  if (req.method !== 'POST') return corsJson({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const fileName = typeof body.fileName === 'string' ? body.fileName : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType : 'video/mp4';
    const sizeBytes = Number(body.sizeBytes);
    if (!fileName || !contentType.startsWith('video/')) return corsJson({ error: 'A video file is required' }, 400);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_VIDEO_BYTES) {
      return corsJson({ error: 'Video must be between 1 byte and 5 GB' }, 400);
    }

    const jobId = crypto.randomUUID();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-160) || 'footage.mp4';
    const objectKey = `uploads/${jobId}/${safeName}`;
    const bucket = requiredEnv('VIDEO_INPUT_BUCKET');
    const uploadUrl = await getSignedUrl(awsS3, new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }), { expiresIn: 900 });

    return corsJson({ jobId, objectKey, uploadUrl, expiresIn: 900 });
  } catch (error) {
    console.error('create-video-job error', error);
    return corsJson({ error: error instanceof Error ? error.message : 'Could not create upload' }, 500);
  }
});