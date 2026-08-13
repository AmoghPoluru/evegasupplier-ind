import sharp from 'sharp';

export type EnhanceImageResult = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

/**
 * Light product-photo cleanup: auto-orient, mild sharpen, normalize contrast.
 * Keeps JPEG/WebP/PNG; prefers JPEG for photos.
 */
export async function enhanceProductImageBuffer(
  input: Buffer,
  originalName: string,
): Promise<EnhanceImageResult> {
  const pipeline = sharp(input, { failOn: 'none' })
    .rotate()
    .normalize()
    .sharpen({ sigma: 0.8 });

  const base =
    originalName.replace(/\.[^.]+$/, '').trim() || 'product';
  const enhancedName = `${base}-enhanced.jpg`;

  // Product photos: JPEG is a good default after enhance
  const buffer = await pipeline
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return {
    buffer,
    mimeType: 'image/jpeg',
    filename: enhancedName,
  };
}

/** True when form/query requests enhancement. */
export function wantsImageEnhance(value: FormDataEntryValue | null): boolean {
  if (value == null) return false;
  const s = String(value).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}
