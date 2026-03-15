import { requireVendor } from '@/lib/middleware/vendor-auth';
import { StatsCards } from './components/StatsCards';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function VendorDashboardPage() {
  const vendor = await requireVendor();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {vendor.companyName || 'Supplier'}!
        </p>
      </div>

      <StatsCards vendorId={vendor.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RecentOrdersWidget />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/vendor/products/new"
                className="block text-sm text-blue-600 hover:underline"
              >
                Add New Product
              </Link>
              <Link
                href="/vendor/orders"
                className="block text-sm text-blue-600 hover:underline"
              >
                View All Orders
              </Link>
              <Link
                href="/vendor/buyers"
                className="block text-sm text-blue-600 hover:underline"
              >
                View All Buyers
              </Link>
              <Link
                href="/vendor/rfqs"
                className="block text-sm text-blue-600 hover:underline"
              >
                View RFQs
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
