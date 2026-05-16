import type { CollectionConfig } from 'payload';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Payload AccessArgs typing
const participantRead = ({ req }: any) => {
  if (!req?.user) return false;
  if ((req.user as { role?: string }).role === 'admin') return true;
  const uid = req.user.id;
  return {
    or: [{ ownerUser: { equals: uid } }, { bdo: { equals: uid } }],
  } as any;
};

export const BdoConversations: CollectionConfig = {
  slug: 'bdo-conversations',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['profileKind', 'bdo', 'ownerUser', 'lastMessageAt', 'status', 'createdAt'],
    description: 'BDO chat threads (buyer or vendor profile ↔ assigned BDO)',
  },
  access: {
    read: participantRead,
    create: ({ req }) => !!req?.user,
    update: ({ req }) => {
      if (!req?.user) return false;
      if ((req.user as { role?: string }).role === 'admin') return true;
      return participantRead({ req });
    },
    delete: ({ req }) => (req?.user as { role?: string } | undefined)?.role === 'admin',
  },
  fields: [
    {
      name: 'profileKind',
      type: 'select',
      required: true,
      options: [
        { label: 'Buyer', value: 'buyer' },
        { label: 'Vendor', value: 'vendor' },
      ],
    },
    {
      name: 'buyer',
      type: 'relationship',
      relationTo: 'buyers',
      admin: {
        condition: (data) => data?.profileKind === 'buyer',
      },
    },
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      admin: {
        condition: (data) => data?.profileKind === 'vendor',
      },
    },
    {
      name: 'bdo',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: {
        role: { in: ['admin', 'bdo'] },
      },
      admin: {
        description: 'Assigned BDO (platform staff)',
      },
    },
    {
      name: 'ownerUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Buyer or vendor owner login (buyers.user / vendors.user)',
      },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'lastMessageSender',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who sent the latest message (denormalized for BDO unread UI)',
      },
    },
    {
      name: 'bdoLastReadAt',
      type: 'date',
      admin: {
        description: 'When the assigned BDO last opened this thread (for unread highlight)',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Archived', value: 'archived' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        if (data.profileKind === 'buyer') {
          if (!data.buyer) throw new Error('buyer is required when profileKind is buyer');
          if (data.vendor) throw new Error('vendor must be empty when profileKind is buyer');
        }
        if (data.profileKind === 'vendor') {
          if (!data.vendor) throw new Error('vendor is required when profileKind is vendor');
          if (data.buyer) throw new Error('buyer must be empty when profileKind is vendor');
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
