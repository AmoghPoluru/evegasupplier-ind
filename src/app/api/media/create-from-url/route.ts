import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { z } from 'zod';
import { createMediaFromBlob } from '@/lib/create-media-from-blob';
import { isAllowedBlobUrl } from '@/lib/media-storage';

export const runtime = 'nodejs';

const bodySchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1).optional(),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  alt: z.string().optional(),
});

/**
 * Register a browser-direct Vercel Blob upload as a Payload media doc.
 * Validates the blob host before writing metadata to MongoDB.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const session = await payload.auth({ headers: req.headers });

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { url, filename, mimeType, size, alt } = parsed.data;

    if (!isAllowedBlobUrl(url)) {
      return NextResponse.json({ error: 'URL is not from an allowed blob store' }, {
        status: 400,
      });
    }

    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image MIME types are allowed' }, {
        status: 400,
      });
    }

    let key = filename?.trim();
    if (!key) {
      try {
        key = new URL(url).pathname.replace(/^\//, '');
      } catch {
        key = 'upload';
      }
    }

    const media = await createMediaFromBlob(
      payload,
      { url, key, size, mimeType },
      alt,
    );

    return NextResponse.json({ doc: media });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create media';
    console.error('create-from-url error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
