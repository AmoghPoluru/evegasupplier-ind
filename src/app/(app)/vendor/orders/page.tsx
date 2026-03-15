import { requireVendor } from '@/lib/middleware/vendor-auth';
import { SupplierOrdersList } from './components/SupplierOrdersList';

export default async function SupplierOrdersPage() {
  await requireVendor();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-2 text-gray-600">
          View and manage all orders from your buyers
        </p>
      </div>

      <SupplierOrdersList />
    </div>
  );
}
