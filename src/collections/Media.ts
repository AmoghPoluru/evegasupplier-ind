import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'filename',
  },
  access: {
    read: () => true, // Public read access
    create: () => true, // Allow authenticated users to upload
    update: () => true,
    delete: () => true,
  },
  upload: {
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'centre',
      },
      {
        name: 'tablet',
        width: 1024,
        height: undefined,
        position: 'centre',
      },
      {
        name: 'desktop',
        width: 1920,
        height: undefined,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'blobUrl',
      type: 'text',
      admin: {
        hidden: true,
        description:
          'Original public URL when file is hosted on Vercel Blob (Payload upload `url` may be rewritten to a local `/api/media/file/` path)',
      },
    },
    {
      name: 'alt',
      type: 'text',
      label: 'Alt Text',
      admin: {
        description: 'Alternative text for accessibility',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create') {
          // Add metadata when creating
          return {
            ...data,
            createdAt: new Date().toISOString(),
          };
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc, req, operation }) => {
        // Log media upload
        if (operation === 'create') {
          console.log(`Media uploaded: ${doc.filename}`);
        }
        return doc;
      },
    ],
  },
};
