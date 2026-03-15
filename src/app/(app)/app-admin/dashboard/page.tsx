import { requireAdmin } from '@/lib/middleware/admin-auth';
import { Suspense } from 'react';
import { StatsCards } from './components/StatsCards';
import { PendingVendorsCard } from './components/PendingVendorsCard';
import { PendingBuyersCard } from './components/PendingBuyersCard';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { DashboardSkeleton } from './components/DashboardSkeleton';

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of platform statistics and recent activity
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Suspense fallback={<div className="h-32 bg-gray-200 rounded animate-pulse" />}>
          <PendingVendorsCard />
        </Suspense>
        <Suspense fallback={<div className="h-32 bg-gray-200 rounded animate-pulse" />}>
          <PendingBuyersCard />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="h-64 bg-gray-200 rounded animate-pulse" />}>
          <RecentOrdersWidget />
        </Suspense>
      </div>
    </div>
  );
}
