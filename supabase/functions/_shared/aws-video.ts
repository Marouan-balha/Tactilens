import { BatchClient } from 'npm:@aws-sdk/client-batch';
import { S3Client } from 'npm:@aws-sdk/client-s3';

const region = Deno.env.get('AWS_REGION') ?? 'eu-central-1';
const credentials = {
  accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
  secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
  sessionToken: Deno.env.get('AWS_SESSION_TOKEN') || undefined,
};

export const awsS3 = new S3Client({ region, credentials });
export const awsBatch = new BatchClient({ region, credentials });
export const awsRegion = region;

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}