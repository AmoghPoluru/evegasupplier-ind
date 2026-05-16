import { requireAdmin } from '@/lib/middleware/admin-auth';
import { AdminProductsList } from './components/AdminProductsList';

export default async function AdminProductsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="mt-2 text-gray-600">
          Browse the catalog and edit price, MOQ, listing fields, and upstream URLs.
        </p>
      </div>

      <AdminProductsList />
    </div>
  );
}
