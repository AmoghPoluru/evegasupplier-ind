import { uploadToBlob, deleteFromBlob } from '@/lib/vercel-blob-storage';
import type { MediaStorageAdapter, StoredObject } from '../index';

export const vercelBlobAdapter: MediaStorageAdapter = {
  name: 'vercel-blob',

  async put(
    bytes: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<StoredObject> {
    const result = await uploadToBlob(bytes, filename, mimeType);
    return {
      url: result.url,
      key: result.pathname,
      size: bytes.length,
      mimeType,
    };
  },

  async delete(ref: { url: string; key?: string }): Promise<void> {
    await deleteFromBlob(ref.url);
  },

  streamRoutePath(): string | null {
    return null;
  },
};
