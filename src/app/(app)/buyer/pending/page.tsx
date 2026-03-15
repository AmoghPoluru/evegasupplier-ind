import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { getBuyerStatus } from '@/lib/middleware/buyer-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function BuyerPendingPage() {
  const status = await getBuyerStatus();

  // If buyer is approved, redirect to dashboard
  if (status.hasBuyer && status.status === 'approved' && status.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Buyer Profile Active</CardTitle>
            </div>
            <CardDescription>
              Your buyer profile is active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/buyer/dashboard">Go to Buyer Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular pending message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle>Buyer Profile Pending</CardTitle>
          </div>
          <CardDescription>
            Your buyer profile is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            You need to create a buyer profile before accessing the buyer dashboard.
            Please complete your buyer registration or wait for approval.
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
