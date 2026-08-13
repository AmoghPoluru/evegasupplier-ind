import type { Payload } from 'payload';
import type { StoredObject } from '@/lib/media-storage';

/**
 * Single writer for `media` docs — absolute blob URL only, never an app hostname.
 */
export async function createMediaFromBlob(
  payload: Payload,
  obj: StoredObject,
  alt?: string,
) {
  const result = await payload.db.create({
    collection: 'media',
    data: {
      alt: alt?.trim() || obj.key.split('/').pop() || 'image',
      filename: obj.key,
      mimeType: obj.mimeType,
      filesize: obj.size,
      url: obj.url,
    },
  });

  if (!result?.id) {
    throw new Error('Failed to create media document: no id returned');
  }

  return payload.findByID({
    collection: 'media',
    id: result.id,
    depth: 0,
  });
}
