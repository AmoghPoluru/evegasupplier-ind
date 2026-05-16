/**
 * One-off: copy stored `url` into `blobUrl` for Vercel Blob rows so storefront
 * code can prefer `blobUrl` when Payload's `afterRead` rewrites `url` to `/api/media/file/…`.
 *
 * Reads DATABASE_URL from .env.local then .env. Safe to run multiple times.
 */

import path from 'path';
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set (.env.local or .env).');
  process.exit(1);
}

const client = new MongoClient(databaseUrl);

try {
  await client.connect();
  const db = client.db();
  const col = db.collection('media');

  const res = await col.updateMany(
    {
      url: /\.vercel-storage\.com/i,
      $or: [
        { blobUrl: { $exists: false } },
        { blobUrl: null },
        { blobUrl: '' },
      ],
    },
    [{ $set: { blobUrl: '$url' } }],
  );

  console.log(`media: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
} finally {
  await client.close();
}
