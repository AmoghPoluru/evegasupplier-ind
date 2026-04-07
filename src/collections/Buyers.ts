import type { CollectionConfig } from 'payload';

export const Buyers: CollectionConfig = {
  slug: 'buyers',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'user', 'bdo', 'companyType', 'verifiedBuyer', 'createdAt'],
    description: 'B2B buyer/company profiles',
  },
  access: {
    read: () => true, // Public read for marketplace
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      return { user: { equals: req.user!.id } };
    },
    delete: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      return { user: { equals: req.user!.id } };
    },
  },
  fields: [
    // Owner / User link
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      admin: {
        description: 'User account linked to this buyer profile',
      },
    },
    {
      name: 'bdo',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: {
        role: { in: ['admin', 'bdo'] },
      },
      admin: {
        description: 'Platform BDO (Business Development) coordinating this buyer.',
      },
      access: {
        read: ({ req, doc }) => {
          if (!req?.user) return false;
          const role = (req.user as { role?: string }).role;
          if (role === 'admin' || role === 'bdo') return true;
          const uid = (req.user as { id: string }).id;
          const ownerId =
            typeof doc?.user === 'object' && doc?.user != null
              ? (doc.user as { id: string }).id
              : (doc?.user as string | undefined);
          if (ownerId && ownerId === uid) return true;
          const bdoId =
            typeof doc?.bdo === 'object' && doc?.bdo != null
              ? (doc.bdo as { id: string }).id
              : (doc?.bdo as string | undefined);
          if (bdoId && bdoId === uid) return true;
          return false;
        },
        update: ({ req }) => (req.user as { role?: string } | undefined)?.role === 'admin',
      },
    },
    {
      name: 'bdoAssignedAt',
      type: 'date',
      admin: {
        description: 'When the current BDO was assigned.',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      access: {
        read: ({ req, doc }) => {
          if (!req?.user) return false;
          const role = (req.user as { role?: string }).role;
          if (role === 'admin' || role === 'bdo') return true;
          const uid = (req.user as { id: string }).id;
          const ownerId =
            typeof doc?.user === 'object' && doc?.user != null
              ? (doc.user as { id: string }).id
              : (doc?.user as string | undefined);
          if (ownerId && ownerId === uid) return true;
          const bdoId =
            typeof doc?.bdo === 'object' && doc?.bdo != null
              ? (doc.bdo as { id: string }).id
              : (doc?.bdo as string | undefined);
          if (bdoId && bdoId === uid) return true;
          return false;
        },
        update: ({ req }) => (req.user as { role?: string } | undefined)?.role === 'admin',
      },
    },
    {
      name: 'companyName',
      type: 'text',
      required: true,
      admin: {
        description: 'Legal or trading name of the company',
      },
    },
    {
      name: 'companyType',
      type: 'select',
      options: [
        { label: 'Retailer', value: 'retailer' },
        { label: 'Wholesaler', value: 'wholesaler' },
        { label: 'Distributor', value: 'distributor' },
        { label: 'Manufacturer', value: 'manufacturer' },
        { label: 'E-commerce', value: 'ecommerce' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Type of business entity',
      },
    },
    {
      name: 'businessRegistrationNumber',
      type: 'text',
      admin: {
        description: 'Business registration number',
      },
    },
    {
      name: 'taxId',
      type: 'text',
      admin: {
        description: 'Tax identification number',
      },
    },
    {
      name: 'companyWebsite',
      type: 'text',
      admin: {
        description: 'Company website URL',
      },
    },
    {
      name: 'annualPurchaseVolume',
      type: 'select',
      options: [
        { label: 'Under $100K', value: 'under_100k' },
        { label: '$100K - $500K', value: '100k_500k' },
        { label: '$500K - $1M', value: '500k_1m' },
        { label: '$1M - $5M', value: '1m_5m' },
        { label: '$5M - $10M', value: '5m_10m' },
        { label: 'Over $10M', value: 'over_10m' },
      ],
      admin: {
        description: 'Annual purchase volume range',
      },
    },
    {
      name: 'mainBusiness',
      type: 'text',
      admin: {
        description: 'Main business description',
      },
    },
    {
      name: 'targetMarkets',
      type: 'array',
      fields: [
        {
          name: 'market',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Target markets served',
      },
    },
    {
      name: 'verifiedBuyer',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Platform-verified buyer',
      },
    },
    {
      name: 'preferredPaymentTerms',
      type: 'array',
      fields: [
        {
          name: 'term',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Preferred payment terms',
      },
    },
    {
      name: 'shippingPreferences',
      type: 'array',
      fields: [
        {
          name: 'preference',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Shipping preferences',
      },
    },
    {
      name: 'companyAddress',
      type: 'textarea',
      admin: {
        description: 'Company address',
      },
    },
    {
      name: 'companyPhone',
      type: 'text',
      admin: {
        description: 'Company phone number',
      },
    },
    {
      name: 'companyEmail',
      type: 'email',
      admin: {
        description: 'Company email address',
      },
    },
    {
      name: 'companyLogo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Company logo',
      },
    },
    {
      name: 'companyDescription',
      type: 'textarea',
      admin: {
        description: 'Company description',
      },
    },
    {
      name: 'numberOfEmployees',
      type: 'select',
      options: [
        { label: '1-10', value: '1_10' },
        { label: '11-50', value: '11_50' },
        { label: '51-200', value: '51_200' },
        { label: '201-500', value: '201_500' },
        { label: '501-1000', value: '501_1000' },
        { label: 'Over 1000', value: 'over_1000' },
      ],
      admin: {
        description: 'Number of employees',
      },
    },
    {
      name: 'yearEstablished',
      type: 'number',
      min: 1900,
      max: new Date().getFullYear(),
      admin: {
        description: 'Year the company was established',
      },
    },
    {
      name: 'businessLicense',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Business license document',
      },
    },
    {
      name: 'taxDocuments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Tax documents',
      },
    },
    {
      name: 'verificationStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Verification status',
      },
    },
    {
      name: 'verificationDocuments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Verification documents',
      },
    },
    {
      name: 'isArchived',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Archive this buyer profile',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data && (data.user === undefined || data.user === null || data.user === '')) {
          throw new Error('A buyer profile must be linked to a user (user field is required).');
        }
        return data;
      },
      async ({ data, req }) => {
        if (!req?.payload || !data) return data;
        const bdoRef = data.bdo;
        if (bdoRef === undefined || bdoRef === null || bdoRef === '') return data;
        const id = typeof bdoRef === 'string' ? bdoRef : (bdoRef as { id: string }).id;
        const u = await req.payload.findByID({ collection: 'users', id });
        const role = (u as { role?: string }).role;
        if (role !== 'admin' && role !== 'bdo') {
          throw new Error('BDO field must reference a user with role Admin or BDO.');
        }
        return data;
      },
    ],
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data;
        const isAdmin = (req.user as { role?: string } | undefined)?.role === 'admin';
        const hasUser = !!req.user;
        if (hasUser && !isAdmin) {
          if (originalDoc) {
            data.bdo = originalDoc.bdo;
            data.bdoAssignedAt = originalDoc.bdoAssignedAt;
          } else {
            data.bdo = null;
            data.bdoAssignedAt = null;
          }
        }
        if (isAdmin && originalDoc) {
          const oldBdo =
            typeof originalDoc.bdo === 'object' && originalDoc.bdo != null
              ? (originalDoc.bdo as { id: string }).id
              : (originalDoc.bdo as string | null | undefined);
          const newBdo =
            typeof data.bdo === 'object' && data.bdo != null
              ? (data.bdo as { id: string }).id
              : (data.bdo as string | null | undefined);
          if (oldBdo !== newBdo) {
            if (newBdo) {
              data.bdoAssignedAt = data.bdoAssignedAt ?? new Date().toISOString();
            } else {
              data.bdoAssignedAt = null;
            }
          }
        }
        if (isAdmin && !originalDoc && data.bdo) {
          data.bdoAssignedAt = data.bdoAssignedAt ?? new Date().toISOString();
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
