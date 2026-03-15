import { requireAdmin } from '@/lib/middleware/admin-auth';
import { Suspense } from 'react';
import { BuyersList } from './components/BuyersList';
import { Skeleton } from '@/components/ui/skeleton';

export default async function BuyersPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Buyers</h1>
        <p className="mt-2 text-gray-600">
          View, edit, and manage all buyer accounts
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      }>
        <BuyersList />
      </Suspense>
    </div>
  );
}
