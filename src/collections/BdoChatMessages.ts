import type { CollectionConfig } from 'payload';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Payload AccessArgs typing
const canAccessMessage = ({ req }: any) => {
  if (!req?.user) return false;
  if ((req.user as { role?: string }).role === 'admin') return true;
  const uid = req.user.id;
  return {
    or: [
      { sender: { equals: uid } },
      { conversation: { bdo: { equals: uid } } },
      { conversation: { ownerUser: { equals: uid } } },
    ],
  } as any;
};

export const BdoChatMessages: CollectionConfig = {
  slug: 'bdo-chat-messages',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['conversation', 'sender', 'kind', 'createdAt'],
    description: 'Messages within BDO conversations',
  },
  access: {
    read: canAccessMessage,
    create: ({ req }) => !!req?.user,
    update: ({ req }) => {
      if (!req?.user) return false;
      if ((req.user as { role?: string }).role === 'admin') return true;
      return { sender: { equals: req.user.id } };
    },
    delete: ({ req }) => (req?.user as { role?: string } | undefined)?.role === 'admin',
  },
  fields: [
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'bdo-conversations',
      required: true,
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'System', value: 'system' },
        { label: 'AI', value: 'ai' },
      ],
    },
    {
      name: 'attachments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'readAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
  timestamps: true,
};
