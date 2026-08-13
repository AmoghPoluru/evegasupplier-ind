import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { resolveMediaDisplayUrl, type MediaLike } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

/**
 * Stable same-origin URL for admin forms that store media ids.
 * Redirects permanently to the absolute blob URL.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ mediaId: string }> },
) {
  try {
    const { mediaId } = await context.params;
    if (!mediaId?.trim()) {
      return NextResponse.json({ error: 'Missing media id' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const doc = await payload.findByID({
      collection: 'media',
      id: decodeURIComponent(mediaId),
      depth: 0,
    });

    const target = resolveMediaDisplayUrl(doc as unknown as MediaLike, {
      allowIdProxy: false,
    });

    if (!target) {
      return NextResponse.json({ error: 'No display URL for this media' }, { status: 404 });
    }

    if (/^https?:\/\//i.test(target)) {
      return NextResponse.redirect(target, 308);
    }

    return NextResponse.json(
      { error: 'Media URL is not an absolute blob URL yet — run backfill or re-upload' },
      { status: 404 },
    );
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
}
