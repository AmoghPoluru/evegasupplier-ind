import { requireVendor } from '@/lib/middleware/vendor-auth';
import { SupplierBuyersList } from './components/SupplierBuyersList';

export default async function SupplierBuyersPage() {
  await requireVendor();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buyers</h1>
        <p className="mt-2 text-gray-600">
          View all buyers who have placed orders with you
        </p>
      </div>

      <SupplierBuyersList />
    </div>
  );
}
