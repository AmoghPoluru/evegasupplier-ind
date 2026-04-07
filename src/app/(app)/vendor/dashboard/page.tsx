import { requireVendor } from '@/lib/middleware/vendor-auth';
import { StatsCards } from './components/StatsCards';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { BdoChatOpenLink } from '@/components/bdo/BdoChatOpenLink';

export default async function VendorDashboardPage() {
  const vendor = await requireVendor();

  const v = vendor as {
    companyName?: string;
    accountName?: string | null;
    accountEmail?: string | null;
    oauthProvider?: string | null;
    bdo?: { id: string; name?: string | null; email?: string | null } | string | null;
  };
  const bdo = v.bdo && typeof v.bdo === 'object' ? v.bdo : null;
  const signInLabel =
    v.oauthProvider === 'google'
      ? 'Google'
      : v.oauthProvider === 'facebook'
        ? 'Facebook'
        : 'Email & password';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back, {v.companyName || 'Supplier'}!
        </p>
      </div>

      <Card className="mb-6 border-blue-100 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account on file</CardTitle>
          <CardDescription>
            Details synced from your login (stored on your supplier profile).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-medium text-gray-900">Name:</span>{' '}
            {v.accountName?.trim() || '—'}
          </p>
          <p>
            <span className="font-medium text-gray-900">Email:</span>{' '}
            {v.accountEmail?.trim() || '—'}
          </p>
          <p>
            <span className="font-medium text-gray-900">Sign-in:</span> {signInLabel}
          </p>
        </CardContent>
      </Card>

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
              <BdoChatOpenLink />
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
