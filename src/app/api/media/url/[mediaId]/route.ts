import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { resolveMediaDisplayUrl, type MediaLike } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

/**
 * Stable same-origin thumbnail URL for <img src="..." /> when the form only
 * stores media IDs (admin ImageUpload).
 */
export async function GET(
  request: NextRequest,
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
      return NextResponse.json({ error: 'No display URL for this media' }, {
        status: 404,
      });
    }

    const absolute =
      /^https?:\/\//i.test(target) ?
        target
      : new URL(target.startsWith('/') ? target : `/${target}`, request.nextUrl.origin)
            .href;

    return NextResponse.redirect(absolute);
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
}
