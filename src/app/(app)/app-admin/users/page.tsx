import { requireAdmin } from '@/lib/middleware/admin-auth';
import { Suspense } from 'react';
import { UsersList } from './components/UsersList';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="mt-2 text-gray-600">
          Manage login accounts, roles, and access for the platform
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        }
      >
        <UsersList />
      </Suspense>
    </div>
  );
}
