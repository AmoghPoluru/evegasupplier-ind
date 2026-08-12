import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { blobReadWriteToken } from '@/lib/blob-token';
import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Vendors } from './collections/Vendors';
import { Buyers } from './collections/Buyers';
import { Products } from './collections/Products';
import { ProductCatalogs } from './collections/ProductCatalogs';
import { Orders } from './collections/Orders';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/** Payload compares `Origin` to `csrf` entries exactly — no trailing slash. */
function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Cookie JWT is only accepted when `Origin` matches `csrf` (sanitizer appends `serverURL`).
 * Wrong `NEXT_PUBLIC_APP_URL`, a trailing slash, or visiting a different host than `serverURL`
 * breaks client POSTs (`/api/media`, tRPC) with 401 while SSR may still work.
 */
function resolvedServerURL(): string {
  const primary =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();
  if (primary) return normalizeOrigin(primary);
  if (process.env.VERCEL_URL?.trim()) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`);
  }
  return 'http://localhost:3000';
}

/** Extra allowed origins (comma-separated), e.g. alternate deployment URL + custom domain. */
function extraCsrfOrigins(): string[] {
  const raw = process.env.PAYLOAD_CSRF_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map((s) => normalizeOrigin(s)).filter(Boolean);
}

/**
 * Vercel sets these per deployment so the browser Origin always matches csrf somewhere,
 * even when `NEXT_PUBLIC_APP_URL` points at a different canonical host (SSR still works → confused “I’m logged in”).
 */
function vercelAutoCsrfOrigins(): string[] {
  const urls: string[] = [];
  const hostToOrigin = (h: string) => {
    const t = h.trim();
    if (!t) return;
    if (/^https?:\/\//i.test(t)) urls.push(normalizeOrigin(t));
    else urls.push(normalizeOrigin(`https://${t}`));
  };

  hostToOrigin(process.env.VERCEL_URL || '');
  const branch = process.env.VERCEL_BRANCH_URL?.trim();
  if (branch) hostToOrigin(branch);
  hostToOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL || '');

  return [...new Set(urls)];
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Vendors,
    Buyers,
    Products,
    ProductCatalogs,
    Orders,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  // Payload cookie JWT checks `csrf.indexOf(Request Origin)` exactly; sanitize also appends `serverURL`.
  csrf: [...extraCsrfOrigins(), ...vercelAutoCsrfOrigins()],
  serverURL: resolvedServerURL(),
  sharp,
  // Email configuration will be added when @payloadcms/email-nodemailer is installed
  // email: nodemailerAdapter({ ... }),
  plugins: [
    // When `BLOB_READ_WRITE_TOKEN` is set (Vercel), uploads go to Blob and local `media/` is disabled.
    // Without a token (typical local dev), the plugin no-ops and `staticDir: 'media'` still applies.
    vercelBlobStorage({
      collections: {
        media: true,
      },
      // Missing/blank → plugin no-ops; Vercel then warns: uploads need `upload.adapter`.
      token: blobReadWriteToken(),
    }),
  ],
});
