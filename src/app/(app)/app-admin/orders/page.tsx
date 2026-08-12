import { requireAdmin } from '@/lib/middleware/admin-auth';
import { AdminOrdersList } from './components/AdminOrdersList';

export default async function AdminOrdersPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-2 text-gray-600">
          View and manage platform orders
        </p>
      </div>

      <AdminOrdersList />
    </div>
  );
}
