import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { resolveMediaDisplayUrl, type MediaLike } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

function permanentRedirect(target: string): NextResponse {
  return NextResponse.redirect(target, 308);
}

/**
 * Compatibility shim for legacy `/api/media/file/<filename>` links.
 * Resolves the media doc and redirects to the absolute blob URL — never reads disk.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await context.params;
    const raw = pathSegments?.join('/') ?? '';
    const filename = decodeURIComponent(raw.trim());

    if (!filename || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const mediaResult = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    });

    if (mediaResult.docs.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const target = resolveMediaDisplayUrl(
      mediaResult.docs[0] as unknown as MediaLike,
      { allowIdProxy: false },
    );

    if (!target) {
      return NextResponse.json({ error: 'No display URL for this media' }, { status: 404 });
    }

    if (/^https?:\/\//i.test(target)) {
      return permanentRedirect(target);
    }

    return NextResponse.json(
      { error: 'Media URL is not an absolute blob URL yet — run backfill or re-upload' },
      { status: 404 },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve media';
    console.error('[Media File Route]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
