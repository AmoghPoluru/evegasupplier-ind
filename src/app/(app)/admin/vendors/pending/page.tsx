import { requireAdmin } from '@/lib/middleware/admin-auth';
import { PendingVendorsList } from './components/PendingVendorsList';

export default async function PendingVendorsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pending Vendor Approvals</h1>
        <p className="mt-2 text-gray-600">
          Review and approve vendor registration requests
        </p>
      </div>

      <PendingVendorsList />
    </div>
  );
}
