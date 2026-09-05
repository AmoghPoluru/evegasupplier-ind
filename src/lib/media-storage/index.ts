import { gridfsAdapter } from './adapters/gridfs';
import { vercelBlobAdapter } from './adapters/vercel-blob';

export interface StoredObject {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface MediaStorageAdapter {
  readonly name: 'vercel-blob' | 'gridfs';
  put(bytes: Buffer, filename: string, mimeType: string): Promise<StoredObject>;
  delete(ref: { url: string; key?: string }): Promise<void>;
  /** null = adapter URLs are public; no app byte-serving route in the hot path */
  streamRoutePath(): string | null;
}

export type MediaStorageName = MediaStorageAdapter['name'];

function resolveStorageName(): MediaStorageName {
  const raw = process.env.MEDIA_STORAGE?.trim().toLowerCase();
  if (raw === 'gridfs') return 'gridfs';
  return 'vercel-blob';
}

export function mediaStorage(): MediaStorageAdapter {
  const name = resolveStorageName();
  if (name === 'gridfs') return gridfsAdapter;
  return vercelBlobAdapter;
}

/** Hostnames allowed for create-from-url and stored media URLs. */
export function isAllowedBlobHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith('.public.blob.vercel-storage.com') ||
    h.endsWith('.blob.vercel-storage.com')
  );
}

export function isAllowedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return isAllowedBlobHost(parsed.hostname);
  } catch {
    return false;
  }
}
