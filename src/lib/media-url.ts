/**
 * Payload `media` population can omit `url` or return only IDs.
 * All storefront/admin image reads go through these helpers.
 */
export type MediaLike = Record<string, unknown>;

const MONGO_OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

const SIZE_KEYS = ['card', 'desktop', 'tablet', 'thumbnail'] as const;

function isAbsoluteBlobUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.endsWith('.public.blob.vercel-storage.com') ||
      host.endsWith('.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
}

export function pickMediaDisplayUrl(media: MediaLike | null | undefined): string | null {
  if (!media) return null;

  const raw = media.url;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const u = raw.trim();
    if (isAbsoluteBlobUrl(u)) return u;
  }

  const sizes = media.sizes as
    | Record<string, { url?: string | null } | undefined>
    | undefined;
  if (sizes && typeof sizes === 'object') {
    for (const key of SIZE_KEYS) {
      const u = sizes[key]?.url;
      if (typeof u === 'string' && u.trim() !== '' && isAbsoluteBlobUrl(u.trim())) {
        return u.trim();
      }
    }
  }

  return null;
}

export type ResolveMediaUrlOptions = {
  /** When false, do not return `/api/media/url/:id` (used inside that route). */
  allowIdProxy?: boolean;
};

/**
 * Resolved `src` for `<img>` / `next/image`.
 * Prefers absolute blob URLs; falls back to id proxy for form thumbnails only.
 */
export function resolveMediaDisplayUrl(
  media: MediaLike | null | undefined,
  options?: ResolveMediaUrlOptions,
): string | null {
  const allowIdProxy = options?.allowIdProxy !== false;
  const direct = pickMediaDisplayUrl(media);
  if (direct) return direct;

  if (!allowIdProxy) return null;

  const rawId = media?.id;
  const id =
    typeof rawId === 'string' ? rawId.trim()
    : typeof rawId === 'number' ? String(rawId)
    : '';
  if (id && MONGO_OBJECT_ID_HEX.test(id)) {
    return `/api/media/url/${encodeURIComponent(id)}`;
  }

  return null;
}

export function unwrapPopulatedUploadEntry(entry: unknown): MediaLike | null {
  if (entry == null) return null;
  if (typeof entry === 'object') {
    const o = entry as MediaLike & { relationTo?: string; value?: unknown };
    if (o.relationTo === 'media' && 'value' in o) {
      if (typeof o.value === 'string' && o.value.trim() !== '') {
        return { id: o.value.trim() } as MediaLike;
      }
      if (o.value && typeof o.value === 'object') {
        return o.value as MediaLike;
      }
    }
    return entry as MediaLike;
  }
  return null;
}

/** One `products.images[]` slot → media-like object or null. */
export function productImageEntryAsMedia(entry: unknown): MediaLike | null {
  if (entry == null || entry === '') return null;
  if (typeof entry === 'string') {
    const id = entry.trim();
    return id ? ({ id } as MediaLike) : null;
  }
  return (
    unwrapPopulatedUploadEntry(entry) ??
    (typeof entry === 'object' ? (entry as MediaLike) : null)
  );
}

export function mediaIdFromMediaLike(doc: MediaLike | null | undefined): string | null {
  const rawId = doc?.id;
  if (typeof rawId === 'string' && rawId.trim()) return rawId.trim();
  if (typeof rawId === 'number') return String(rawId);
  return null;
}

export function productImageSrc(entry: unknown): string | null {
  return resolveMediaDisplayUrl(productImageEntryAsMedia(entry));
}

export function productImageMediaIds(images: unknown): string[] {
  if (!images || !Array.isArray(images)) return [];
  const ids: string[] = [];
  for (const img of images) {
    if (typeof img === 'string') {
      const t = img.trim();
      if (t) ids.push(t);
      continue;
    }
    const id = mediaIdFromMediaLike(productImageEntryAsMedia(img));
    if (id) ids.push(id);
  }
  return ids;
}

export function firstProductImageUrl(images: unknown): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  return productImageSrc(images[0]);
}

export function productImageGalleryUrls(images: unknown): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return [];
  const out: string[] = [];
  for (const img of images) {
    const u = productImageSrc(img);
    if (u) out.push(u);
  }
  return out;
}

export function productImagesForCart(images: unknown): {
  id: string;
  url: string;
}[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img) => {
      const doc = productImageEntryAsMedia(img);
      const url = resolveMediaDisplayUrl(doc);
      if (!url) return null;
      const id = mediaIdFromMediaLike(doc) ?? '';
      return { id, url };
    })
    .filter(Boolean) as { id: string; url: string }[];
}
