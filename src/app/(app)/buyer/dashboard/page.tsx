import { requireBuyer } from '@/lib/middleware/buyer-auth';
import { StatsCards } from './components/StatsCards';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function BuyerDashboardPage() {
  const buyer = await requireBuyer();
  const b =
    buyer as {
      companyName?: string;
      bdo?: { id: string; name?: string | null; email?: string | null } | string | null;
    };
  const bdo = b.bdo && typeof b.bdo === 'object' ? b.bdo : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {buyer.companyName || 'Buyer'}!
        </p>
      </div>

      {bdo ? (
        <Card className="mb-6 border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your coordinator</CardTitle>
            <CardDescription>Platform BDO contact for onboarding and support.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium text-gray-900">Name:</span>{' '}
              {bdo.name?.trim() || '—'}
            </p>
            <p>
              <span className="font-medium text-gray-900">Email:</span>{' '}
              {bdo.email?.trim() || '—'}
            </p>
          </CardContent>
        </Card>
      ) : null}

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
