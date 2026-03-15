'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export function RecentVendorsWidget() {
  const { data: vendors, isLoading } = trpc.admin.vendors.recent.useQuery({ limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'default',
      approved: 'secondary',
      rejected: 'destructive',
      suspended: 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Vendors
            </CardTitle>
            <CardDescription>Latest vendor registrations</CardDescription>
          </div>
          <Link href="/app-admin/vendors/pending">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              View Pending
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!vendors || vendors.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No vendors yet</p>
        ) : (
          <div className="space-y-3">
            {vendors.map((vendor: any) => (
              <Link
                key={vendor.id}
                href={`/app-admin/vendors/${vendor.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {vendor.name || vendor.companyName || 'Unnamed Vendor'}
                    </p>
                    {getStatusBadge(vendor.status || 'pending')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {vendor.email || 'No email'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {vendor.createdAt
                      ? format(new Date(vendor.createdAt), 'MMM d, yyyy')
                      : 'Unknown date'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
