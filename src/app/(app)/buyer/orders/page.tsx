import { requireBuyer } from '@/lib/middleware/buyer-auth';
import { BuyerOrdersList } from './components/BuyerOrdersList';

export default async function BuyerOrdersPage() {
  await requireBuyer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-2 text-gray-600">
          View and track all your orders
        </p>
      </div>

      <BuyerOrdersList />
    </div>
  );
}
