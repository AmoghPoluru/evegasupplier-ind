import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';
import { CheckoutView } from '@/modules/checkout/ui/views/checkout-view';

export default async function CheckoutPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) {
    redirect('/login');
  }

  return <CheckoutView />;
}
