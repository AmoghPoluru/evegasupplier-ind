import { upload } from '@vercel/blob/client';

/** Server POST /api/media body limit (enhance path). */
const SERVER_MAX_BYTES = 4 * 1024 * 1024;

async function parseMediaUploadResponse(response: Response): Promise<string> {
  let payloadUnknown: unknown;
  try {
    payloadUnknown = await response.json();
  } catch {
    payloadUnknown = null;
  }

  if (!response.ok) {
    const errMsg =
      payloadUnknown &&
      typeof payloadUnknown === 'object' &&
      'error' in payloadUnknown &&
      typeof (payloadUnknown as { error: unknown }).error === 'string'
        ? (payloadUnknown as { error: string }).error
        : `Upload failed (${response.status})`;
    throw new Error(errMsg);
  }

  const data = payloadUnknown as { doc?: { id?: unknown } } | null;
  const rawId = data?.doc?.id;
  const newId = rawId !== undefined && rawId !== null ? String(rawId) : '';
  if (!newId) {
    throw new Error('Upload succeeded but no media id returned');
  }
  return newId;
}

async function registerBlobMedia(input: {
  url: string;
  filename?: string;
  mimeType: string;
  size: number;
  alt: string;
}): Promise<string> {
  const response = await fetch('/api/media/create-from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return parseMediaUploadResponse(response);
}

async function uploadViaServer(file: File, enhance: boolean): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  if (enhance) formData.append('enhance', '1');

  const response = await fetch('/api/media', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  return parseMediaUploadResponse(response);
}

async function uploadViaClientBlob(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/media/client-upload',
  });

  return registerBlobMedia({
    url: blob.url,
    filename: blob.pathname,
    mimeType: file.type,
    size: file.size,
    alt: file.name,
  });
}

/**
 * Upload a product image and return Payload media id.
 * Uses Vercel client blob upload for large files (recommended on Vercel).
 * Optional server-side enhance for files within the 4MB POST limit.
 */
export async function uploadMediaFile(
  file: File,
  enhance = false,
): Promise<string> {
  if (enhance && file.size <= SERVER_MAX_BYTES) {
    try {
      return await uploadViaServer(file, true);
    } catch (serverErr) {
      console.warn(
        'Server enhance upload failed; trying direct blob upload',
        serverErr,
      );
    }
  }

  try {
    return await uploadViaClientBlob(file);
  } catch (clientErr) {
    if (file.size <= SERVER_MAX_BYTES) {
      return uploadViaServer(file, false);
    }
    throw clientErr instanceof Error
      ? clientErr
      : new Error('Direct blob upload failed');
  }
}
