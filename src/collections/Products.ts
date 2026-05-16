import type { CollectionConfig } from 'payload';

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'supplier', 'unitPrice', 'moq', 'validatedOn', 'createdAt'],
    description: 'B2B product catalog',
  },
  access: {
    read: () => true, // Public read for marketplace
    create: ({ req }) => !!req.user,
    update: async ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      const vendors = await req.payload.find({
        collection: 'vendors',
        where: { user: { equals: req.user!.id } },
        limit: 1000,
      });
      const vendorIds = vendors.docs.map((v) => v.id);
      return vendorIds.length > 0 ? { supplier: { in: vendorIds } } : false;
    },
    delete: async ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      const vendors = await req.payload.find({
        collection: 'vendors',
        where: { user: { equals: req.user!.id } },
        limit: 1000,
      });
      const vendorIds = vendors.docs.map((v) => v.id);
      return vendorIds.length > 0 ? { supplier: { in: vendorIds } } : false;
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Product name/title',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Product description',
      },
    },
    // Task 137: supplier (relationship to Vendors)
    {
      name: 'supplier',
      type: 'relationship',
      relationTo: 'vendors',
      required: true,
      admin: {
        description: 'Vendor/supplier offering this product',
      },
    },
    {
      name: 'actualSupplierUrl',
      type: 'text',
      admin: {
        description:
          'Public URL for the real upstream supplier or product source. The linked Vendor is the platform “super supplier”.',
      },
    },
    // Task 124: moq - Minimum Order Quantity
    {
      name: 'moq',
      type: 'number',
      min: 0,
      admin: {
        description: 'Minimum order quantity',
      },
    },
    // Task 125: bulkPricingTiers
    {
      name: 'bulkPricingTiers',
      type: 'array',
      fields: [
        {
          name: 'minQuantity',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'unit',
          type: 'text',
          admin: {
            description: 'Price unit (e.g., USD, EUR)',
          },
        },
      ],
      admin: {
        description: 'Bulk pricing tiers (quantity breaks)',
      },
    },
    // Task 126: unitPrice
    {
      name: 'unitPrice',
      type: 'number',
      min: 0,
      admin: {
        description: 'Price per unit',
      },
    },
    // Task 127: sampleAvailable
    {
      name: 'sampleAvailable',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Samples available for this product',
      },
    },
    // Task 128: samplePrice
    {
      name: 'samplePrice',
      type: 'number',
      min: 0,
      admin: {
        description: 'Price for sample order',
        condition: (data) => data.sampleAvailable === true,
      },
    },
    // Task 129: customizationAvailable
    {
      name: 'customizationAvailable',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Custom/OEM orders accepted',
      },
    },
    // Task 130: leadTime
    {
      name: 'leadTime',
      type: 'text',
      admin: {
        description: 'Production/delivery lead time (e.g., 7-14 days)',
      },
    },
    // Task 131: packagingOptions
    {
      name: 'packagingOptions',
      type: 'array',
      fields: [
        {
          name: 'option',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Available packaging options',
      },
    },
    // Task 132: shippingTerms
    {
      name: 'shippingTerms',
      type: 'array',
      fields: [
        {
          name: 'term',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Shipping terms (FOB, CIF, etc.)',
      },
    },
    // Task 133: paymentTerms
    {
      name: 'paymentTerms',
      type: 'array',
      fields: [
        {
          name: 'term',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Accepted payment terms',
      },
    },
    // Task 134: productCertifications
    {
      name: 'productCertifications',
      type: 'array',
      fields: [
        {
          name: 'certification',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Product certifications (CE, FDA, etc.)',
      },
    },
    // Task 135: hsCode
    {
      name: 'hsCode',
      type: 'text',
      admin: {
        description: 'Harmonized System (HS) tariff code',
      },
    },
    // Task 136: originCountry
    {
      name: 'originCountry',
      type: 'text',
      admin: {
        description: 'Country of origin',
      },
    },
    // Product images
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Product images',
      },
    },
    {
      name: 'category',
      type: 'text',
      admin: {
        description: 'Product category',
      },
    },
    {
      name: 'validatedOn',
      type: 'date',
      label: 'Validated on',
      admin: {
        description:
          'Date an admin validated this product listing (optional). Clear in admin UI to unset.',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
  ],
};
