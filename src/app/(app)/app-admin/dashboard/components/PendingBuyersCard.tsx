'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/trpc/client';
import { ArrowRight, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export function PendingBuyersCard() {
  const { data, isLoading } = trpc.admin.buyers.pending.useQuery({
    limit: 1,
    page: 1,
  });

  const pendingCount = data?.total || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Pending Buyer Verifications
            </CardTitle>
            <CardDescription className="mt-1">
              Buyers awaiting verification approval
            </CardDescription>
          </div>
          {pendingCount > 0 && (
            <Badge variant="default" className="text-lg px-3 py-1">
              {pendingCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingCount > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {pendingCount} buyer{pendingCount !== 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} verification
            </p>
            <Link href="/app-admin/buyers?status=pending">
              <Button variant="default" className="flex items-center gap-2">
                Review Buyers
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-gray-500">All buyer verifications are complete</p>
        )}
      </CardContent>
    </Card>
  );
}
