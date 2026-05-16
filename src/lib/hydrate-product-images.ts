import type { Payload } from 'payload';
import {
  resolveMediaDisplayUrl,
  productImageEntryAsMedia,
  mediaIdFromMediaLike,
  type MediaLike,
} from '@/lib/media-url';

/**
 * Ensure `product.images[]` carries full-ish `media` docs with resolvable URLs
 * (`url` or `sizes.*`) so storefront UIs do not rely on fragile depth population.
 */
export async function hydrateProductImages(
  payload: Payload,
  product: unknown,
): Promise<void> {
  if (!product || typeof product !== 'object') return;
  const p = product as Record<string, unknown>;
  const raw = p.images;
  if (!Array.isArray(raw) || raw.length === 0) return;

  const resolved = await Promise.all(
    raw.map(async (entry) => {
      if (typeof entry === 'string') {
        try {
          const mediaRaw = await payload.findByID({
            collection: 'media',
            id: entry,
            depth: 0,
          });
          const m = mediaRaw as unknown as MediaLike | null;
          return m ?? null;
        } catch {
          return null;
        }
      }

      const mediaDoc = productImageEntryAsMedia(entry);
      if (mediaDoc && resolveMediaDisplayUrl(mediaDoc)) return mediaDoc;

      const id = mediaIdFromMediaLike(mediaDoc);
      if (!id) return null;

      try {
        const mediaRaw = await payload.findByID({
          collection: 'media',
          id,
          depth: 0,
        });
        const m = mediaRaw as unknown as MediaLike | null;
        return m ?? null;
      } catch {
        return null;
      }
    }),
  );

  p.images = resolved.filter(Boolean);
}
