import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';
import { ProfilePage } from './components/ProfilePage';

export default async function ProfileRoute() {
  const payload = await getPayload({ config });
  const headersList = await headers();
  const session = await payload.auth({ headers: headersList });

  if (!session.user) {
    redirect('/sign-in?redirect=/profile');
  }

  return <ProfilePage />;
}
