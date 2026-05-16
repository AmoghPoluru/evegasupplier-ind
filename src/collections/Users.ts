import type { CollectionConfig } from 'payload';
import { syncAllVendorProfilesForUser } from '@/lib/sync-vendor-account-mirror';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  /** Only `role: admin` may use Payload at `/admin`. BDO, buyers, vendors, etc. are denied. */
  access: {
    admin: ({ req: { user } }) => (user as { role?: string } | undefined)?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Vendor', value: 'vendor' },
        { label: 'Buyer', value: 'buyer' },
        { label: 'Admin', value: 'admin' },
        { label: 'BDO', value: 'bdo' },
      ],
      defaultValue: 'user',
      required: true,
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
        description: 'Authentication method used by this user',
      },
    },
    {
      name: 'oauthId',
      type: 'text',
      admin: {
        description: 'OAuth provider user ID',
        condition: (data) => data.oauthProvider !== 'email',
      },
    },
    {
      name: 'avatar',
      type: 'text',
      admin: {
        description: 'User avatar URL (from OAuth or uploaded)',
      },
    },
    // Inverse links: every vendor/buyer profile stores `user`; these joins surface them on the user record in admin.
    {
      name: 'supplierProfile',
      type: 'join',
      collection: 'vendors',
      on: 'user',
      admin: {
        description:
          'Supplier/vendor company profile where this user is the owner (vendors.user → this user). At most one per user.',
      },
    },
    {
      name: 'buyerCompanyProfile',
      type: 'join',
      collection: 'buyers',
      on: 'user',
      admin: {
        description:
          'Buyer company profile where this user is the owner (buyers.user → this user). At most one per user.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        // Validate email format before saving
        if (data && data.email && operation === 'create') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.email as string)) {
            throw new Error('Invalid email format');
          }
        }
        // Make password optional for OAuth users
        if (data && data.oauthProvider && data.oauthProvider !== 'email') {
          // Password not required for OAuth users
          if (!data.password) {
            data.password = undefined;
          }
        }
        return data;
      },
    ],
    beforeChange: [
      ({ data, operation, req }) => {
        // Add timestamps and metadata
        if (operation === 'create') {
          return {
            ...data,
            createdAt: new Date().toISOString(),
          };
        }
        if (operation === 'update') {
          return {
            ...data,
            updatedAt: new Date().toISOString(),
          };
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc, operation, req }) => {
        // Log user creation/updates
        if (operation === 'create') {
          console.log(`New user created: ${doc.email}`);
          // Here you could send a welcome email
          // await req.payload.sendEmail({
          //   to: doc.email,
          //   subject: 'Welcome to EvegaSupply',
          //   html: '<h1>Welcome!</h1>',
          // });
        }
        if (operation === 'update') {
          console.log(`User updated: ${doc.email}`);
        }
        return doc;
      },
      async ({ doc, req }) => {
        if (!req?.payload) return doc;
        const u = doc as {
          id?: string;
          name?: string | null;
          email?: string | null;
          oauthProvider?: string | null;
        };
        if (!u.id) return doc;
        await syncAllVendorProfilesForUser(req.payload, u.id, {
          name: u.name,
          email: u.email,
          oauthProvider: u.oauthProvider,
        });
        return doc;
      },
    ],
    afterLogin: [
      ({ user, req }) => {
        // Log successful login
        console.log(`User logged in: ${user.email}`);
        return user;
      },
    ],
  },
};
