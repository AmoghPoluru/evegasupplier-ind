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
import { RFQs } from './collections/RFQs';
import { Quotes } from './collections/Quotes';
import { Inquiries } from './collections/Inquiries';
import { Messages } from './collections/Messages';
import { SampleRequests } from './collections/SampleRequests';
import { ProductCatalogs } from './collections/ProductCatalogs';
import { Orders } from './collections/Orders';
import { BdoConversations } from './collections/BdoConversations';
import { BdoChatMessages } from './collections/BdoChatMessages';

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
    RFQs,
    Quotes,
    Inquiries,
    Messages,
    SampleRequests,
    ProductCatalogs,
    Orders,
    BdoConversations,
    BdoChatMessages,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  // Exact-match CSRF list; `sanitize` also appends `serverURL`
  csrf: extraCsrfOrigins(),
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
