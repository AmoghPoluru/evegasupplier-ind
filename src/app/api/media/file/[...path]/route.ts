import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function remoteServeUrl(media: {
  blobUrl?: unknown;
  url?: unknown;
}): string | null {
  for (const u of [media.blobUrl, media.url]) {
    if (typeof u !== 'string' || !u.startsWith('http')) continue;
    if (u.includes('/api/media/file/')) continue;
    return u;
  }
  return null;
}

/**
 * Serves or redirects media: prefer Vercel Blob / absolute URL from DB,
 * otherwise read from local `media/` (dev machines only).
 *
 * Production on Vercel has no durable disk for `staticDir`; Blob + this redirect is required for prod.
 */
export async function GET(
  _req: NextRequest,
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
      where: {
        filename: {
          equals: filename,
        },
      },
      limit: 1,
    });

    if (mediaResult.docs.length > 0) {
      const media = mediaResult.docs[0];
      const remote = remoteServeUrl({
        blobUrl: media.blobUrl,
        url: media.url,
      });
      if (remote) {
        return NextResponse.redirect(remote);
      }

      const mediaDir = join(process.cwd(), 'media');
      const filePath = join(mediaDir, filename);

      if (existsSync(filePath)) {
        const fileBuffer = await readFile(filePath);
        const mimeType = media.mimeType || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(fileBuffer.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    const mediaDir = join(process.cwd(), 'media');
    const filePath = join(mediaDir, filename);

    if (existsSync(filePath)) {
      const fileBuffer = await readFile(filePath);
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
      };
      const mimeType =
        ext ? mimeTypes[ext] ?? 'application/octet-stream' : 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(fileBuffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to serve file';
    console.error('[Media File Route]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
