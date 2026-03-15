'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export function RecentOrdersWidget() {
  const { data: orders, isLoading } = trpc.admin.orders.recent.useQuery({ limit: 10 });

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
      confirmed: 'secondary',
      shipped: 'outline',
      delivered: 'secondary',
      cancelled: 'destructive',
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
              <ShoppingCart className="w-5 h-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest orders placed</CardDescription>
          </div>
          <Link href="/app-admin/orders">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!orders || orders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <Link
                key={order.id}
                href={`/app-admin/orders/${order.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      Order #{order.id.slice(-8)}
                    </p>
                    {getStatusBadge(order.status || 'pending')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: ${typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {order.createdAt
                      ? format(new Date(order.createdAt), 'MMM d, yyyy')
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
