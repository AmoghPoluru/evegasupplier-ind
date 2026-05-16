/**
 * Vercel Blob read/write token (Payload adapter + `@/lib/vercel-blob-storage` + `/api/media`).
 * Trimmed — avoids silent failure from trailing newline env values.
 *
 * Alternate key: some templates use VERCEL_* (optional).
 */
export function blobReadWriteToken(): string {
  const keys = [
    'BLOB_READ_WRITE_TOKEN',
    'VERCEL_BLOB_READ_WRITE_TOKEN',
  ] as const;

  for (const k of keys) {
    const raw = process.env[k];
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (t) return t;
    }
  }
  return '';
}
