import { upload } from '@vercel/blob/client';
import { isBlobTokenError } from '@/lib/blob-setup-message';

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
  const newId = rawId !== undefined && rawId !== null ? String(rawId) : "";
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
 * Prefers Vercel client blob upload (works for large files on Vercel).
 * Falls back to server POST only for small files (e.g. local dev).
 */
export async function uploadMediaFile(
  file: File,
  enhance = false,
): Promise<string> {
  let clientError: Error | null = null;

  try {
    return await uploadViaClientBlob(file);
  } catch (err: unknown) {
    clientError = err instanceof Error ? err : new Error('Direct blob upload failed');
  }

  if (file.size > SERVER_MAX_BYTES) {
    throw clientError;
  }

  try {
    return await uploadViaServer(file, enhance);
  } catch (serverErr: unknown) {
    const serverMsg =
      serverErr instanceof Error ? serverErr.message : 'Upload failed';

    if (clientError && !isBlobTokenError(clientError.message)) {
      throw clientError;
    }

    throw serverErr instanceof Error ? serverErr : new Error(serverMsg);
  }
}
