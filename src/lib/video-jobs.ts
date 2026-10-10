import { supabase } from '@/integrations/supabase/client';

export type VideoJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type VideoJob = {
  jobId: string;
  status: VideoJobStatus;
  message?: string;
  outputUrl?: string;
  outputKey?: string;
};

type UploadSession = {
  jobId: string;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
};

async function invoke<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message || `Failed to call ${functionName}`);
  if (!data) throw new Error(`Empty response from ${functionName}`);
  return data as T;
}

export async function createVideoUpload(file: File): Promise<UploadSession> {
  return invoke<UploadSession>('create-video-job', {
    fileName: file.name,
    contentType: file.type || 'video/mp4',
    sizeBytes: file.size,
  });
}

export async function uploadVideoFile(file: File, uploadUrl: string, onProgress: (value: number) => void): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type || 'video/mp4');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Video upload failed with status ${request.status}`));
    };
    request.onerror = () => reject(new Error('Video upload failed'));
    request.onabort = () => reject(new Error('Video upload was cancelled'));
    request.send(file);
  });
}

export function startVideoJob(jobId: string, objectKey: string): Promise<VideoJob> {
  return invoke<VideoJob>('start-video-job', { jobId, objectKey });
}

export function getVideoJob(jobId: string, outputKey?: string): Promise<VideoJob> {
  return invoke<VideoJob>('get-video-job', { jobId, outputKey });
}