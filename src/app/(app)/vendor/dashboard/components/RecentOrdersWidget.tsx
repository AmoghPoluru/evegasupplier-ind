'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function RecentOrdersWidget() {
  const { data, isLoading } = trpc.vendors.orders.list.useQuery({
    page: 1,
    limit: 5,
    sort: '-createdAt',
  });

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Pending</Badge>;
    }
    const statusLower = status.toLowerCase();
    if (statusLower === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">Pending</Badge>;
    }
    if (statusLower === 'confirmed') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">Confirmed</Badge>;
    }
    if (statusLower === 'shipped') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">Shipped</Badge>;
    }
    if (statusLower === 'delivered' || statusLower === 'completed') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">Delivered</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const orders = data?.orders || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Recent Orders
            </CardTitle>
            <CardDescription className="mt-1">
              Your latest orders from buyers
            </CardDescription>
          </div>
          {orders.length > 0 && (
            <Link href="/vendor/orders">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No orders yet</p>
            <p className="text-xs text-gray-400 mt-1">Orders will appear here once buyers place them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => {
              const buyerName = typeof order.buyer === 'object' && order.buyer
                ? (order.buyer.buyer?.companyName || order.buyer.email || 'Unknown Buyer')
                : 'Unknown Buyer';
              
              return (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">#{order.id.slice(0, 8)}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {buyerName} • {order.createdAt ? format(new Date(order.createdAt), 'MMM d, yyyy') : 'Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${order.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
