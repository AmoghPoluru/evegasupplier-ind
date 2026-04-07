import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

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
  sharp,
  // Email configuration will be added when @payloadcms/email-nodemailer is installed
  // email: nodemailerAdapter({ ... }),
  plugins: [],
});
