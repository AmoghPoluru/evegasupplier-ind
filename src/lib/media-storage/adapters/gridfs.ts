import type { MediaStorageAdapter } from '../index';

const NOT_IMPLEMENTED =
  'GridFS media storage is not implemented yet. Set MEDIA_STORAGE=vercel-blob.';

/** Stub for a future MongoDB GridFS adapter (see design doc §4). */
export const gridfsAdapter: MediaStorageAdapter = {
  name: 'gridfs',

  async put() {
    throw new Error(NOT_IMPLEMENTED);
  },

  async delete() {
    throw new Error(NOT_IMPLEMENTED);
  },

  streamRoutePath(): string | null {
    return '/api/media/file/gridfs';
  },
};
