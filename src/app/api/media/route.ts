import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { REST_GET } from '@payloadcms/next/routes';
import { createMediaFromBlob } from '@/lib/create-media-from-blob';
import { mediaStorage } from '@/lib/media-storage';
import { resolveMediaDisplayUrl, type MediaLike } from '@/lib/media-url';
import {
  enhanceProductImageBuffer,
  wantsImageEnhance,
} from '@/lib/enhance-product-image';

export const maxDuration = 120;
export const runtime = 'nodejs';

/** Payload REST list/read — custom POST/DELETE below handle uploads. */
export const GET = REST_GET(config);

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function mediaDeleteUrl(media: MediaLike): string | null {
  const url = resolveMediaDisplayUrl(media, { allowIdProxy: false });
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const session = await payload.auth({ headers: req.headers });

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let ids: string[] = [];

    const whereKeys = Array.from(searchParams.keys()).filter((key) =>
      key.startsWith('where'),
    );
    if (whereKeys.length > 0) {
      whereKeys.forEach((key) => {
        const match = key.match(/where\[and\]\[0\]\[id\]\[in\]\[(\d+)\]/);
        if (match) {
          const id = searchParams.get(key);
          if (id) ids.push(id);
        }
      });
    }

    if (ids.length === 0) {
      const idParam = searchParams.get('id');
      if (idParam) ids = [idParam];
    }

    if (ids.length === 0) {
      const whereParam = searchParams.get('where');
      if (whereParam) {
        try {
          const where = JSON.parse(decodeURIComponent(whereParam));
          if (where.and && Array.isArray(where.and)) {
            const idIn = where.and.find(
              (item: { id?: { in?: string[] } }) => item.id?.in,
            );
            if (idIn?.id?.in) {
              ids = Array.isArray(idIn.id.in) ? idIn.id.in : [idIn.id.in];
            }
          }
        } catch {
          // ignore malformed where
        }
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No IDs found in request' }, { status: 400 });
    }

    ids = [...new Set(ids)];
    const storage = mediaStorage();
    const deleted: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const media = await payload.findByID({
          collection: 'media',
          id,
          depth: 0,
        });

        const blobUrl = mediaDeleteUrl(media as unknown as MediaLike);
        if (blobUrl) {
          try {
            await storage.delete({ url: blobUrl, key: media.filename ?? undefined });
          } catch (blobError: unknown) {
            const msg =
              blobError instanceof Error ? blobError.message : String(blobError);
            console.warn(`Could not delete blob (continuing): ${msg}`);
          }
        }

        await payload.delete({ collection: 'media', id });
        deleted.push(id);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Delete failed';
        errors.push({ id, error: msg });
      }
    }

    if (errors.length > 0 && deleted.length === 0) {
      return NextResponse.json({ errors, message: 'Failed to delete media items' }, {
        status: 400,
      });
    }

    return NextResponse.json({
      message: `Deleted ${deleted.length} media item(s)`,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete media';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const session = await payload.auth({ headers: req.headers });

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image uploads are allowed for this collection' },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB server upload limit. Use direct blob upload for larger files.`,
        },
        { status: 413 },
      );
    }

    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let filename = file.name;
    let mimeType = file.type;

    if (wantsImageEnhance(formData.get('enhance'))) {
      try {
        const enhanced = await enhanceProductImageBuffer(buffer, file.name);
        buffer = Buffer.from(enhanced.buffer);
        filename = enhanced.filename;
        mimeType = enhanced.mimeType;
      } catch (enhanceErr) {
        console.warn('Image enhance failed; uploading original:', enhanceErr);
      }
    }

    const stored = await mediaStorage().put(buffer, filename, mimeType);
    const media = await createMediaFromBlob(payload, stored, file.name);

    return NextResponse.json({ doc: media });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to upload media';
    console.error('Media upload error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
