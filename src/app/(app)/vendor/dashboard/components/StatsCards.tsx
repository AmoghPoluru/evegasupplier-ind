'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, Package, FileText, MessageSquare, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardsProps {
  vendorId: string;
}

export function StatsCards({ vendorId }: StatsCardsProps) {
  const { data: products, isLoading: productsLoading } = trpc.products.getByVendor.useQuery(
    { vendorId, limit: 1 },
    { enabled: !!vendorId }
  );

  const { data: orderStats, isLoading: orderStatsLoading } = trpc.vendors.orders.stats.useQuery();
  const { data: buyerStats, isLoading: buyerStatsLoading } = trpc.vendors.buyers.stats.useQuery();

  const stats = [
    {
      title: 'Total Revenue',
      value: orderStats?.totalRevenue
        ? `$${orderStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00',
      icon: DollarSign,
      description: 'All time revenue',
      isLoading: orderStatsLoading,
    },
    {
      title: 'Total Orders',
      value: orderStats?.totalOrders?.toString() || '0',
      icon: ShoppingCart,
      description: 'Total orders received',
      isLoading: orderStatsLoading,
    },
    {
      title: 'Active Products',
      value: products?.totalDocs?.toString() || '0',
      icon: Package,
      description: 'Products in catalog',
      isLoading: productsLoading,
    },
    {
      title: 'Total Buyers',
      value: buyerStats?.totalBuyers?.toString() || '0',
      icon: Users,
      description: 'Buyers who ordered',
      isLoading: buyerStatsLoading,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
