/**
 * One-off: rewrite `media.url` to absolute Vercel Blob URLs.
 *
 * Usage:
 *   npx tsx scripts/backfill-media-urls.ts --dry
 *   npx tsx scripts/backfill-media-urls.ts
 *
 * Reads DATABASE_URL from .env.local then .env.
 */

import path from 'path';
import { config as loadEnv } from 'dotenv';
import { MongoClient, type Document } from 'mongodb';
import { head } from '@vercel/blob';
import { blobReadWriteToken } from '../src/lib/blob-token';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });
loadEnv({ path: path.resolve(process.cwd(), '.env') });

const dryRun = process.argv.includes('--dry');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set (.env.local or .env).');
  process.exit(1);
}

const token = blobReadWriteToken();
if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN is required for backfill head() checks.');
  process.exit(1);
}

type MediaDoc = Document & {
  _id: unknown;
  filename?: string | null;
  url?: string | null;
  blobUrl?: string | null;
  sizes?: Record<string, { url?: string | null } | undefined> | null;
};

function isBlobUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.endsWith('.public.blob.vercel-storage.com') ||
      host.endsWith('.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
}

function candidateBlobUrls(doc: MediaDoc): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim() && isBlobUrl(v.trim())) {
      out.push(v.trim());
    }
  };

  push(doc.blobUrl);
  push(doc.url);

  if (doc.sizes && typeof doc.sizes === 'object') {
    for (const size of Object.values(doc.sizes)) {
      push(size?.url);
    }
  }

  return [...new Set(out)];
}

async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url, { token });
    return true;
  } catch {
    return false;
  }
}

async function deriveBlobUrlFromFilename(filename: string): Promise<string | null> {
  const trimmed = filename.trim();
  if (!trimmed) return null;

  const encoded = encodeURIComponent(trimmed);
  const storeHint = process.env.BLOB_STORE_ID?.trim();
  const candidates: string[] = [];

  if (storeHint) {
    candidates.push(`https://${storeHint}.public.blob.vercel-storage.com/${encoded}`);
    candidates.push(`https://${storeHint}.public.blob.vercel-storage.com/${trimmed}`);
  }

  for (const url of candidates) {
    if (await blobExists(url)) return url;
  }

  return null;
}

async function main() {
  const client = new MongoClient(databaseUrl!);
  await client.connect();
  const col = client.db().collection<MediaDoc>('media');
  const productsCol = client.db().collection('products');

  let updated = 0;
  let alreadyOk = 0;
  const flagged: Array<{ id: string; filename?: string | null; reason: string }> = [];

  const cursor = col.find({});
  for await (const doc of cursor) {
    const id = String(doc._id);
    const existingCandidates = candidateBlobUrls(doc);
    let resolved: string | null = null;

    for (const candidate of existingCandidates) {
      if (await blobExists(candidate)) {
        resolved = candidate;
        break;
      }
    }

    if (!resolved && typeof doc.filename === 'string') {
      resolved = await deriveBlobUrlFromFilename(doc.filename);
    }

    if (resolved && doc.url === resolved && !doc.blobUrl) {
      alreadyOk++;
      continue;
    }

    if (resolved) {
      if (!dryRun) {
        await col.updateOne(
          { _id: doc._id },
          {
            $set: { url: resolved },
            $unset: { blobUrl: '' },
          },
        );
      }
      updated++;
      console.log(`${dryRun ? '[dry-run] ' : ''}updated ${id} → ${resolved}`);
      continue;
    }

    flagged.push({
      id,
      filename: doc.filename,
      reason: 'No blob object found — re-upload required',
    });
  }

  console.log('\n--- summary ---');
  console.log(`already ok: ${alreadyOk}`);
  console.log(`${dryRun ? 'would update' : 'updated'}: ${updated}`);
  console.log(`flagged (missing blob): ${flagged.length}`);

  if (flagged.length > 0) {
    console.log('\nFlagged media docs:');
    for (const row of flagged) {
      console.log(`  ${row.id}  filename=${row.filename ?? '—'}  ${row.reason}`);
      const refs = await productsCol
        .find({ images: row.id })
        .project({ _id: 1, title: 1 })
        .limit(10)
        .toArray();
      for (const p of refs) {
        console.log(`    product ${String(p._id)}  ${(p as { title?: string }).title ?? ''}`);
      }
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
