import { requireBuyer } from '@/lib/middleware/buyer-auth';
import { StatsCards } from './components/StatsCards';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function BuyerDashboardPage() {
  const buyer = await requireBuyer();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {buyer.companyName || 'Buyer'}!
        </p>
      </div>

      <StatsCards buyerId={buyer.id} />

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
                href="/buyer/orders"
                className="block text-sm text-blue-600 hover:underline"
              >
                View All Orders
              </Link>
              <Link
                href="/products"
                className="block text-sm text-blue-600 hover:underline"
              >
                Browse Products
              </Link>
              <Link
                href="/buyer/rfqs/new"
                className="block text-sm text-blue-600 hover:underline"
              >
                Create RFQ
              </Link>
              <Link
                href="/buyer/inquiries/new"
                className="block text-sm text-blue-600 hover:underline"
              >
                Send Inquiry
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
