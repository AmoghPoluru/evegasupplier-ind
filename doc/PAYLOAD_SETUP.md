# How to Setup Payload CMS

This guide will walk you through setting up Payload CMS in a Next.js project from scratch.

## Prerequisites

- Node.js 18+ installed
- MongoDB database (local or MongoDB Atlas)
- A Next.js project initialized

## Step 1: Install Dependencies

Install the required Payload packages:

```bash
npm install payload @payloadcms/next @payloadcms/db-mongodb @payloadcms/richtext-lexical sharp
```

**Package explanations:**
- `payload`: Core Payload CMS package
- `@payloadcms/next`: Next.js integration
- `@payloadcms/db-mongodb`: MongoDB database adapter
- `@payloadcms/richtext-lexical`: Rich text editor
- `sharp`: Image processing library

## Step 2: Create Environment Variables

Create a `.env.local` file in your project root (if it doesn't exist) and add:

```env
PAYLOAD_SECRET=your-super-secret-key-here-min-32-characters
DATABASE_URL=mongodb://localhost:27017/evegasupply
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:**
- `PAYLOAD_SECRET`: Generate a strong random string (minimum 32 characters). You can use: `openssl rand -base64 32`
- `DATABASE_URL`: Your MongoDB connection string. For MongoDB Atlas, use: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
- `NEXT_PUBLIC_APP_URL`: Your app’s public origin (used for OAuth redirect URIs and Payload **`serverURL`**). Use `http://localhost:3000` in **`.env.local`**. On **Vercel → Project → Settings → Environment Variables**, set **`NEXT_PUBLIC_APP_URL`** for **Production** to your live URL, e.g. **`https://evegasupplier-ind.vercel.app`** (omit trailing slash unless your OAuth provider expects it—match exactly what you register in Google/Facebook).

A fuller template (including optional **Vercel Blob** for production media uploads) lives in **`.env.example`** at the project root.

**Vercel Blob (production uploads):** When using Vercel Blob for `media` (see `doc/TODO_2026-05-15.md`), set **`BLOB_READ_WRITE_TOKEN`** on the Vercel project (Storage → Blob). Same variable name as **`@vercel/blob`** / the **`evega`** repo. Do not commit the real token—set it only in Vercel env and `.env.local` for local testing.

## Step 3: Create Payload Configuration File

Create `src/payload.config.ts`:

```typescript
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [],
});
```

## Step 4: Create Collections Directory

Create the `src/collections` directory:

```bash
mkdir -p src/collections
```

## Step 5: Create Users Collection

Create `src/collections/Users.ts`:

```typescript
import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
};
```

**What this does:**
- Creates a Users collection with authentication enabled
- Uses email as the display field in admin panel
- Adds a custom `name` field

## Step 6: Create Admin Route & API

Create the Payload admin and API routes (see `src/app/(payload)/`):

- **Admin page** `admin/[[...segments]]/page.tsx`: Uses `RootPage` and `generatePageMetadata` from `@payloadcms/next/views`
- **API route** `api/[...slug]/route.ts`: Exports REST handlers (`REST_GET`, `REST_POST`, etc.) from `@payloadcms/next/routes`
- **Layout** `layout.tsx`: Uses `RootLayout` and `handleServerFunctions` from `@payloadcms/next/layouts`

**Note:** The `(payload)` folder is a route group in Next.js, so it won't appear in the URL. Use `withPayload()` in `next.config.ts` for proper Payload bundling.

## Step 7: Update TypeScript Configuration

Add Payload path alias to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@payload-config": ["./src/payload.config.ts"]
    }
  }
}
```

## Step 8: Add Scripts to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "generate:types": "payload generate:types"
  }
}
```

## Step 9: Generate TypeScript Types

Run the type generation command:

```bash
npm run generate:types
```

This creates `src/payload-types.ts` with all your collection types.

## Step 10: Start Your Development Server

```bash
npm run dev
```

## Step 11: Access the Admin Panel

1. Open your browser and navigate to: `http://localhost:3000/admin`
2. You'll be prompted to create your first admin user
3. Fill in the form and create your account
4. You'll be logged in and can access the admin panel

## Step 12: Verify Setup

- ✅ Admin panel accessible at `/admin`
- ✅ Can create users in the admin panel
- ✅ MongoDB connection working
- ✅ TypeScript types generated

## Adding More Collections

To add a new collection (e.g., Products):

1. Create `src/collections/Products.ts`:

```typescript
import type { CollectionConfig } from 'payload';

export const Products: CollectionConfig = {
  slug: 'products',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
    },
  ],
};
```

2. Import and add to `payload.config.ts`:

```typescript
import { Products } from './collections/Products';

export default buildConfig({
  // ... other config
  collections: [Users, Products], // Add Products here
});
```

3. Regenerate types:

```bash
npm run generate:types
```

## Troubleshooting

### MongoDB Connection Error
- Verify `DATABASE_URL` is correct
- Ensure MongoDB is running (if local)
- Check network/firewall settings (if using Atlas)

### Payload Secret Error
- Ensure `PAYLOAD_SECRET` is at least 32 characters
- Restart your dev server after adding environment variables

### Type Generation Fails
- Make sure all collections are properly imported
- Check for TypeScript errors in collection files
- Verify `tsconfig.json` paths are correct

## Next Steps

- Customize collections with more fields
- Add access control policies
- Set up file uploads
- Add hooks for custom logic
- Install Payload plugins

## Resources

- [Payload Documentation](https://payloadcms.com/docs)
- [Payload Collections Guide](https://payloadcms.com/docs/collections/overview)
- [Payload Next.js Integration](https://payloadcms.com/docs/getting-started/installation#nextjs)
