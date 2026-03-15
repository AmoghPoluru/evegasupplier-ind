'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export function PendingVendorsCard() {
  const { data: stats, isLoading } = trpc.admin.dashboard.stats.useQuery();
  const pendingCount = stats?.vendors.pending || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={pendingCount > 0 ? 'border-yellow-300 border-2' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${pendingCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              Pending Supplier Approvals
            </CardTitle>
            <CardDescription className="mt-1">
              {pendingCount === 0
                ? 'No suppliers pending approval'
                : `${pendingCount} supplier${pendingCount !== 1 ? 's' : ''} waiting for approval`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-4xl font-bold text-gray-900">{pendingCount}</div>
          {pendingCount > 0 && (
            <Link href="/app-admin/vendors/pending">
              <Button variant="default" className="flex items-center gap-2">
                Review Suppliers
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
