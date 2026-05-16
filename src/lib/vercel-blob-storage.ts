/**
 * Vercel Blob Storage — upload/delete helpers for media (metadata stays in Payload / MongoDB).
 */

import { put, head, del } from '@vercel/blob';
import { blobReadWriteToken } from '@/lib/blob-token';

export interface BlobUploadResult {
  url: string;
  pathname: string;
}

/**
 * Upload a file to Vercel Blob Storage
 */
export async function uploadToBlob(
  file: Buffer | Uint8Array | ArrayBuffer,
  filename: string,
  contentType?: string,
): Promise<BlobUploadResult> {
  const token = blobReadWriteToken();
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required. ' +
        'Get it from: Vercel Dashboard → Storage → Blob → Create Token',
    );
  }

  try {
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (file instanceof ArrayBuffer) {
      buffer = Buffer.from(file);
    } else {
      buffer = Buffer.from(file.buffer || file);
    }

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream',
      token,
      addRandomSuffix: true,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Vercel Blob upload error:', error);
    throw new Error(`Failed to upload to Vercel Blob: ${message}`);
  }
}

/**
 * Check if a file exists in Vercel Blob Storage
 */
export async function checkBlobExists(url: string): Promise<boolean> {
  const token = blobReadWriteToken();
  if (!token) {
    return false;
  }

  try {
    await head(url, {
      token,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from Vercel Blob Storage
 */
export async function deleteFromBlob(url: string): Promise<void> {
  const token = blobReadWriteToken();
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required. ' +
        'Get it from: Vercel Dashboard → Storage → Blob → Create Token',
    );
  }

  try {
    await del(url, {
      token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Vercel Blob delete error:', error);
    if (!message.includes('not found') && !message.includes('404')) {
      throw new Error(`Failed to delete from Vercel Blob: ${message}`);
    }
  }
}
