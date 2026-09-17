import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { blobReadWriteToken } from '@/lib/blob-token';
import { BLOB_TOKEN_SETUP_MESSAGE } from '@/lib/blob-setup-message';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Token handoff for `@vercel/blob/client` direct uploads (bypasses the 4.5MB function body limit).
 */
export async function POST(request: Request): Promise<Response> {
  const rwToken = blobReadWriteToken();
  if (!rwToken) {
    return NextResponse.json({ error: BLOB_TOKEN_SETUP_MESSAGE }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const session = await payload.auth({ headers: request.headers });

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized — sign in again' }, { status: 401 });
    }

    const result = await handleUpload({
      body,
      request,
      token: rwToken,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: session.user!.id }),
      }),
      onUploadCompleted: async () => {
        // Media doc is created by the client via POST /api/media/create-from-url.
      },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    console.error('[client-upload]', msg, error);
    const status =
      msg.includes('Unauthorized') || msg.includes('sign in') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
