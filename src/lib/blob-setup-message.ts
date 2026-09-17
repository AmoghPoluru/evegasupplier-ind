/** Shared message when Vercel Blob is not configured. */
export const BLOB_TOKEN_SETUP_MESSAGE =
  'BLOB_READ_WRITE_TOKEN is required. In Vercel: Project → Storage → Blob → Create store → Connect to this project, then redeploy. Or add BLOB_READ_WRITE_TOKEN under Settings → Environment Variables.';

export function isBlobTokenError(message: string): boolean {
  return /BLOB_READ_WRITE_TOKEN|blob.*token/i.test(message);
}
