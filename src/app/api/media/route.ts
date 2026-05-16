import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { uploadToBlob, deleteFromBlob } from '@/lib/vercel-blob-storage';

export const maxDuration = 120;
export const runtime = 'nodejs';

function vercelBlobObjectUrl(media: {
  url?: unknown;
  blobUrl?: unknown;
}): string | null {
  const candidates = [media.blobUrl, media.url];
  for (const u of candidates) {
    if (
      typeof u === 'string' &&
      u.length > 0 &&
      u.includes('.vercel-storage.com')
    ) {
      return u;
    }
  }
  return null;
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();
    const session = await payload.auth({ headers: headersList });

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
          // ignore
        }
      }
    }

    if (ids.length === 0) {
      console.error(
        'No IDs found in DELETE request. Query params:',
        Array.from(searchParams.entries()),
      );
      return NextResponse.json({ error: 'No IDs found in request' }, {
        status: 400,
      });
    }

    ids = [...new Set(ids)];

    const deleted: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        const media = await payload.findByID({
          collection: 'media',
          id,
        });

        const blobObjectUrl = vercelBlobObjectUrl(media);
        if (blobObjectUrl) {
          try {
            await deleteFromBlob(blobObjectUrl);
          } catch (blobError: unknown) {
            const msg =
              blobError instanceof Error ? blobError.message : String(blobError);
            console.warn(`Could not delete from Blob (continuing): ${msg}`);
          }
        }

        await payload.delete({
          collection: 'media',
          id,
        });
        deleted.push(id);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Delete failed';
        console.error(`Failed to delete media ${id}:`, msg);
        errors.push({ id, error: msg });
      }
    }

    if (errors.length > 0 && deleted.length === 0) {
      return NextResponse.json(
        {
          errors,
          message: 'Failed to delete media items',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: `Deleted ${deleted.length} media item(s)`,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete media';
    console.error('Media delete error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();
    const session = await payload.auth({ headers: headersList });

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

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`Uploading ${file.type} file: ${file.name} (${fileSizeMB} MB)`);

    if (file.size > 100 * 1024 * 1024) {
      console.warn(`Large file detected: ${fileSizeMB} MB. Upload may take longer.`);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let blobUrl: string | null = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blobResult = await uploadToBlob(buffer, file.name, file.type);
        blobUrl = blobResult.url;
        console.log(`Uploaded to Vercel Blob: ${blobUrl}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Vercel Blob upload error:', error);
        console.warn('Blob upload failed, attempting local fallback:', msg);
      }
    }

    let media;
    if (blobUrl) {
      const db = payload.db;
      const blobPathname = blobUrl.split('/').pop() || file.name;
      const mediaDoc = {
        alt: file.name,
        blobUrl,
        filename: blobPathname,
        mimeType: file.type,
        filesize: file.size,
        url: blobUrl,
      };

      const result = await db.create({
        collection: 'media',
        data: mediaDoc,
      });

      if (!result?.id) {
        throw new Error('Failed to create media document: No ID returned');
      }

      media = await payload.findByID({
        collection: 'media',
        id: result.id,
      });
    } else {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            error:
              'BLOB_READ_WRITE_TOKEN is required for file uploads in production. Configure it in Vercel environment variables.',
          },
          { status: 500 },
        );
      }

      media = await payload.create({
        collection: 'media',
        data: {
          alt: file.name,
        },
        file: {
          data: buffer,
          mimetype: file.type,
          name: file.name,
          size: file.size,
        },
      });
      console.log(`Saved locally (development): ${media.filename || file.name}`);
    }

    return NextResponse.json({ doc: media });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to upload media';
    console.error('Media upload error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
