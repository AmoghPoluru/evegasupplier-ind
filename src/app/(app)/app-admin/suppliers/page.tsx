import { requireAdmin } from '@/lib/middleware/admin-auth';
import { AllSuppliersList } from './components/AllSuppliersList';

export default async function AllSuppliersPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Suppliers</h1>
        <p className="mt-2 text-gray-600">
          View, edit, and manage all supplier accounts
        </p>
      </div>

      <AllSuppliersList />
    </div>
  );
}
