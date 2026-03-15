/**
 * Script to check if a user is an admin
 * Run with: npx tsx scripts/check-admin-user.ts <email>
 */

import { getPayload } from 'payload';
import config from '@payload-config';

async function checkAdminUser(email: string) {
  const payload = await getPayload({ config });
  
  const result = await payload.find({
    collection: 'users',
    where: {
      email: { equals: email },
    },
    limit: 1,
  });
  
  if (result.docs.length === 0) {
    console.log(`❌ User with email ${email} not found`);
    return;
  }
  
  const user = result.docs[0];
  console.log('\n📋 User Details:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Role:', (user as any).role);
  console.log('  Is Admin:', (user as any).role === 'admin');
  
  if ((user as any).role !== 'admin') {
    console.log('\n⚠️  User is NOT an admin. To make them an admin:');
    console.log('  1. Go to /admin/collections/users');
    console.log('  2. Find the user with email:', email);
    console.log('  3. Edit the user');
    console.log('  4. Set "Role" field to "Admin"');
    console.log('  5. Save');
  } else {
    console.log('\n✅ User is an admin!');
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: npx tsx scripts/check-admin-user.ts <email>');
  console.log('Example: npx tsx scripts/check-admin-user.ts admin@example.com');
  process.exit(1);
}

checkAdminUser(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
