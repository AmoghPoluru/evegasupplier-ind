import type { CollectionConfig } from 'payload';
import { getVendorMirrorFromUser } from '@/lib/sync-vendor-account-mirror';

export const Vendors: CollectionConfig = {
  slug: 'vendors',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'user', 'bdo', 'accountEmail', 'companyType', 'verifiedSupplier', 'createdAt'],
    description: 'B2B supplier/vendor profiles',
  },
  access: {
    read: () => true, // Public read for marketplace browsing
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      // Restrict to docs where user matches current user (Payload combines with id query)
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
        description: 'User account linked to this vendor profile',
      },
    },
    // Denormalized from linked users — synced on save and when the user is updated (see hooks).
    {
      name: 'accountName',
      type: 'text',
      admin: {
        description: 'Mirrors linked user name (synced from users collection).',
      },
    },
    {
      name: 'accountEmail',
      type: 'email',
      admin: {
        description: 'Mirrors linked user email (synced from users collection).',
      },
    },
    {
      name: 'oauthProvider',
      type: 'select',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Google', value: 'google' },
        { label: 'Facebook', value: 'facebook' },
      ],
      defaultValue: 'email',
      admin: {
        description: 'Mirrors linked user sign-in method (synced from users collection).',
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
        description: 'Platform BDO (Business Development) coordinating this supplier.',
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
    // Task 98: companyType
    {
      name: 'companyType',
      type: 'select',
      options: [
        { label: 'Manufacturer', value: 'manufacturer' },
        { label: 'Trading Company', value: 'trading' },
        { label: 'Agent', value: 'agent' },
        { label: 'Distributor', value: 'distributor' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Type of business entity',
      },
    },
    // Task 99: yearEstablished
    {
      name: 'yearEstablished',
      type: 'number',
      min: 1900,
      max: new Date().getFullYear(),
      admin: {
        description: 'Year the company was established',
      },
    },
    // Task 100: annualRevenue
    {
      name: 'annualRevenue',
      type: 'select',
      options: [
        { label: 'Under $1M', value: 'under_1m' },
        { label: '$1M - $5M', value: '1m_5m' },
        { label: '$5M - $10M', value: '5m_10m' },
        { label: '$10M - $50M', value: '10m_50m' },
        { label: '$50M - $100M', value: '50m_100m' },
        { label: 'Over $100M', value: 'over_100m' },
      ],
      admin: {
        description: 'Annual revenue range',
      },
    },
    // Task 101: employeeCount
    {
      name: 'employeeCount',
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
    // Task 102: mainMarkets
    {
      name: 'mainMarkets',
      type: 'array',
      fields: [
        {
          name: 'market',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Primary markets served (e.g., North America, Europe)',
      },
    },
    // Task 103: mainProducts
    {
      name: 'mainProducts',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Main product categories',
      },
    },
    // Task 104: factoryLocation
    {
      name: 'factoryLocation',
      type: 'text',
      admin: {
        description: 'Location/country of main factory',
      },
    },
    // Task 105: factorySize
    {
      name: 'factorySize',
      type: 'select',
      options: [
        { label: 'Under 1,000 sqm', value: 'under_1000' },
        { label: '1,000 - 5,000 sqm', value: '1000_5000' },
        { label: '5,000 - 10,000 sqm', value: '5000_10000' },
        { label: '10,000 - 50,000 sqm', value: '10000_50000' },
        { label: 'Over 50,000 sqm', value: 'over_50000' },
      ],
      admin: {
        description: 'Factory size in square meters',
      },
    },
    // Task 106: productionCapacity
    {
      name: 'productionCapacity',
      type: 'text',
      admin: {
        description: 'Production capacity description (e.g., units per month)',
      },
    },
    // Task 107: qualityCertifications
    {
      name: 'qualityCertifications',
      type: 'array',
      fields: [
        {
          name: 'certification',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Quality certifications (ISO, CE, etc.)',
      },
    },
    // Task 108: tradeAssurance
    {
      name: 'tradeAssurance',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Enrolled in trade assurance program',
      },
    },
    // Task 109: verifiedSupplier
    {
      name: 'verifiedSupplier',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Platform-verified supplier',
      },
    },
    // Task 110: goldSupplier
    {
      name: 'goldSupplier',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Gold supplier status',
      },
    },
    // Task 111: responseTime
    {
      name: 'responseTime',
      type: 'select',
      options: [
        { label: 'Within 24 hours', value: '24h' },
        { label: 'Within 12 hours', value: '12h' },
        { label: 'Within 6 hours', value: '6h' },
        { label: 'Within 2 hours', value: '2h' },
        { label: 'Within 1 hour', value: '1h' },
      ],
      admin: {
        description: 'Typical response time for inquiries',
      },
    },
    // Task 112: acceptSampleOrders
    {
      name: 'acceptSampleOrders',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Accepts sample orders',
      },
    },
    // Task 113: acceptCustomOrders
    {
      name: 'acceptCustomOrders',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Accepts custom/OEM orders',
      },
    },
    // Task 114: paymentTerms
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
        description: 'Accepted payment terms (e.g., T/T, L/C, PayPal)',
      },
    },
    // Task 115: businessRegistrationNumber
    {
      name: 'businessRegistrationNumber',
      type: 'text',
      admin: {
        description: 'Official business registration number',
      },
    },
    // Task 116: taxId
    {
      name: 'taxId',
      type: 'text',
      admin: {
        description: 'Tax identification number',
      },
    },
    // Task 117: businessLicense upload
    {
      name: 'businessLicense',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Upload business license document',
      },
    },
    // Task 118: companyWebsite
    {
      name: 'companyWebsite',
      type: 'text',
      admin: {
        description: 'Company website URL',
      },
    },
    // Task 119: socialMediaLinks
    {
      name: 'socialMediaLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'Twitter/X', value: 'twitter' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Other', value: 'other' },
          ],
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Social media profile links',
      },
    },
    // Task 120: companyVideo
    {
      name: 'companyVideo',
      type: 'text',
      admin: {
        description: 'URL to company introduction video (YouTube, Vimeo, etc.)',
      },
    },
    // Task 121: companyPhotos gallery
    {
      name: 'companyPhotos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Company photos gallery',
      },
    },
    // Task 122: keyPersonnel
    {
      name: 'keyPersonnel',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'email',
          type: 'text',
        },
      ],
      admin: {
        description: 'Key personnel/contact persons',
      },
    },
    // Task 123: companyHistory
    {
      name: 'companyHistory',
      type: 'textarea',
      admin: {
        description: 'Company history and background',
      },
    },
    // Task 124: factoryPhotos gallery
    {
      name: 'factoryPhotos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Factory photos gallery',
      },
    },
    // Task 125: productionLinesCount
    {
      name: 'productionLinesCount',
      type: 'number',
      min: 0,
      admin: {
        description: 'Number of production lines',
      },
    },
    // Task 126: qualityControlProcess
    {
      name: 'qualityControlProcess',
      type: 'textarea',
      admin: {
        description: 'Quality control process description',
      },
    },
    // Task 127: rndCapability
    {
      name: 'rndCapability',
      type: 'textarea',
      admin: {
        description: 'R&D and innovation capabilities',
      },
    },
    // Task 128: warehouseInformation
    {
      name: 'warehouseInformation',
      type: 'textarea',
      admin: {
        description: 'Warehouse and storage information',
      },
    },
    // Task 129: shippingCapabilities
    {
      name: 'shippingCapabilities',
      type: 'textarea',
      admin: {
        description: 'Shipping and logistics capabilities',
      },
    },
    // Vendor approval status
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Suspended', value: 'suspended' },
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Vendor approval status',
      },
    },
    // Vendor active status
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Active vendors can sell products. Vendors must be approved and active to appear in the marketplace.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data && (data.user === undefined || data.user === null || data.user === '')) {
          throw new Error('A supplier profile must be linked to a user (user field is required).');
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
        if (!req?.payload) return data;
        const userRef = data?.user ?? originalDoc?.user;
        const userId =
          typeof userRef === 'string' ? userRef : (userRef as { id?: string } | undefined)?.id;
        if (!userId) return data;
        const mirror = await getVendorMirrorFromUser(req.payload, userId);
        if (!mirror) return data;
        return {
          ...data,
          accountName: mirror.accountName,
          accountEmail: mirror.accountEmail,
          oauthProvider: mirror.oauthProvider,
        };
      },
    ],
  },
  timestamps: true,
};
