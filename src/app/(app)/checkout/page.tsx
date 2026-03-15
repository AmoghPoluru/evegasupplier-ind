import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';
import { requireBuyer } from '@/lib/middleware/buyer-auth';
import { CheckoutView } from '@/modules/checkout/ui/views/checkout-view';

export default async function CheckoutPage() {
  // Require buyer authentication
  await requireBuyer();

  return <CheckoutView />;
}
