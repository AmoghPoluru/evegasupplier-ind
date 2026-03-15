import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getVendorStatus } from '@/lib/middleware/vendor-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function VendorPendingPage() {
  const status = await getVendorStatus();

  // If vendor is approved and active, redirect to dashboard
  if (status.hasVendor && status.status === 'approved' && status.isActive) {
    redirect('/vendor/dashboard');
  }

  // If no vendor profile exists
  if (!status.hasVendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle>Vendor Profile Required</CardTitle>
            </div>
            <CardDescription>
              You need to create a vendor profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              You need to create a vendor profile before accessing the vendor dashboard.
              Please complete your vendor registration.
            </p>
            <div className="flex gap-2">
              <Link
                href="/profile"
                className="text-sm text-blue-600 hover:underline"
              >
                Register as Supplier
              </Link>
              <span className="text-sm text-gray-400">|</span>
              <Link
                href="/"
                className="text-sm text-blue-600 hover:underline"
              >
                Return to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If vendor is suspended
  if (status.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle>Vendor Account Suspended</CardTitle>
            </div>
            <CardDescription>
              Your vendor account has been suspended
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Your vendor account is currently suspended. Please contact support for more information.
            </p>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:underline"
            >
              Return to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vendor exists but is pending approval
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle>Vendor Profile Pending</CardTitle>
          </div>
          <CardDescription>
            Your vendor profile is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Your vendor registration has been submitted and is currently under review.
            You will be notified once your profile has been approved.
          </p>
          {status.vendor && (
            <div className="mb-4 space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Company Name:</p>
                <p className="text-sm font-medium">{(status.vendor as any).companyName || 'N/A'}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800 mb-2">Status Information:</p>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">Status Field:</span> {(status.vendor as any).status || 'null/undefined'}</p>
                  <p><span className="font-medium">isActive:</span> {(status.vendor as any).isActive ? 'true' : 'false'}</p>
                  <p><span className="font-medium">Computed Status:</span> {status.status || 'null'}</p>
                  <p><span className="font-medium">Computed isActive:</span> {status.isActive ? 'true' : 'false'}</p>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  For approval: Status must be "approved" AND isActive must be "true"
                </p>
              </div>
            </div>
          )}
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            Return to Home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
