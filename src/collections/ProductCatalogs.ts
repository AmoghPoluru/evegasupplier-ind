import type { CollectionConfig } from 'payload';

export const ProductCatalogs: CollectionConfig = {
  slug: 'product-catalogs',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'supplier', 'category', 'isPublic', 'createdAt'],
    description: 'Product catalogs from suppliers',
  },
  access: {
    read: ({ req }) => {
      // Public catalogs are visible to all, private ones only to owner and admin
      if (!req.user) {
        return { isPublic: { equals: true } } as any;
      }
      if ((req.user as any).role === 'admin') return true;
      // Vendors can see their own catalogs
      return {
        or: [
          { isPublic: { equals: true } },
          { supplier: { equals: req.user.id } },
        ],
      } as any;
    },
    create: ({ req }) => {
      // Only vendors can create catalogs
      return (req.user as any)?.role === 'vendor';
    },
    update: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      // Only the vendor who created the catalog can update it
      return { supplier: { equals: req.user.id } };
    },
    delete: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      return { supplier: { equals: req.user.id } };
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Catalog name',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Catalog description',
      },
    },
    {
      name: 'supplier',
      type: 'relationship',
      relationTo: 'suppliers',
      required: true,
      admin: {
        description: 'Vendor/supplier who owns this catalog',
      },
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description: 'Products included in this catalog',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Catalog cover image',
      },
    },
    {
      name: 'category',
      type: 'text',
      admin: {
        description: 'Catalog category',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Make catalog publicly visible',
      },
    },
    {
      name: 'downloadUrl',
      type: 'text',
      admin: {
        description: 'URL to download catalog PDF',
      },
    },
  ],
  timestamps: true,
};
