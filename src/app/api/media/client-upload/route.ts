import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Token handoff for `@vercel/blob/client` direct uploads (bypasses the 4.5MB function body limit).
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const payload = await getPayload({ config });
        const session = await payload.auth({ headers: request.headers });

        if (!session.user) {
          throw new Error('Unauthorized');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Media doc is created by the client via POST /api/media/create-from-url.
      },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
