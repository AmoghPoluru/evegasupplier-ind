/**
 * Payload `media` / upload population can omit `url` or return only IDs.
 * Normalize to a usable `src` for <img /> / next/image.
 */
export type MediaLike = Record<string, unknown>;

const MONGO_OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

export function pickMediaDisplayUrl(media: MediaLike | null | undefined): string | null {
  if (!media) return null;
  const blobStored = media.blobUrl;
  if (typeof blobStored === 'string' && blobStored.trim() !== '') return blobStored.trim();
  const raw = media.url;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  const sizes = media.sizes as
    | Record<string, { url?: string | null } | undefined>
    | undefined;
  if (!sizes || typeof sizes !== 'object') return null;
  for (const key of ['card', 'desktop', 'tablet', 'thumbnail'] as const) {
    const u = sizes[key]?.url;
    if (typeof u === 'string' && u.trim() !== '') return u.trim();
  }
  return null;
}

export type ResolveMediaUrlOptions = {
  /** When false, do not return `/api/media/url/:id` (avoids redirect loops in that route). */
  allowIdProxy?: boolean;
};

/**
 * Resolved `src` for `<img>` / `next/image`: direct URLs, Payload file route, or id proxy.
 */
export function resolveMediaDisplayUrl(
  media: MediaLike | null | undefined,
  options?: ResolveMediaUrlOptions,
): string | null {
  const allowIdProxy = options?.allowIdProxy !== false;
  const direct = pickMediaDisplayUrl(media);
  if (direct) return direct;
  const fn = typeof media?.filename === 'string' ? media.filename.trim() : '';
  if (fn) {
    return `/api/media/file/${encodeURIComponent(fn)}`;
  }
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

/** One `products.images[]` slot → `{ id?, url?, filename?, … }` or null (string IDs become `{ id }`). */
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

/** Stable id for Payload lookups / forms (string or numeric doc id). */
export function mediaIdFromMediaLike(doc: MediaLike | null | undefined): string | null {
  const rawId = doc?.id;
  if (typeof rawId === 'string' && rawId.trim()) return rawId.trim();
  if (typeof rawId === 'number') return String(rawId);
  return null;
}

/** Resolved image URL for one gallery slot (cart cards, PDP, vendor views). */
export function productImageSrc(entry: unknown): string | null {
  return resolveMediaDisplayUrl(productImageEntryAsMedia(entry));
}

/** Ids only (save shapes / admin). Preserves trimmed string refs; unwraps `{ relationTo, value }`. */
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

/**
 * `next/image` optimization often fails for same-origin routes that 302 to blobs
 * or Payload file handlers. Use `unoptimized` for those `src` values.
 */
export function nextImageUnoptimizedForSrc(
  src: string | null | undefined,
): boolean {
  if (!src || typeof src !== 'string') return false;
  let path = src;
  try {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      path = new URL(src).pathname;
    }
  } catch {
    return true;
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return (
    path.startsWith('/api/media/url/') || path.startsWith('/api/media/file/')
  );
}

/** First image `src` for cards / thumbnails. */
export function firstProductImageUrl(images: unknown): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  return productImageSrc(images[0]);
}

/** Gallery URLs for PDP (all images). */
export function productImageGalleryUrls(images: unknown): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return [];
  const out: string[] = [];
  for (const img of images) {
    const u = productImageSrc(img);
    if (u) out.push(u);
  }
  return out;
}

/** Cart line items: `{ id, url }`. */
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
