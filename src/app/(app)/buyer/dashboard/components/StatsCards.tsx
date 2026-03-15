'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileCheck, ShoppingCart, MessageSquare, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardsProps {
  buyerId: string;
}

export function StatsCards({ buyerId }: StatsCardsProps) {
  const { data: rfqCount, isLoading: rfqLoading } = trpc.buyers.rfqs.count.useQuery();
  const { data: quoteCount, isLoading: quoteLoading } = trpc.buyers.quotes.count.useQuery();
  const { data: orderStats, isLoading: orderStatsLoading } = trpc.buyers.orders.stats.useQuery();
  const { data: inquiryCount, isLoading: inquiryLoading } = trpc.buyers.inquiries.count.useQuery();

  const stats = [
    {
      title: 'Total Orders',
      value: orderStats?.totalOrders || 0,
      description: 'All your orders',
      icon: ShoppingCart,
      isLoading: orderStatsLoading,
    },
    {
      title: 'Total Spent',
      value: orderStats?.totalSpent
        ? `$${orderStats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00',
      description: 'All time spending',
      icon: DollarSign,
      isLoading: orderStatsLoading,
    },
    {
      title: 'Active RFQs',
      value: rfqCount?.count || 0,
      description: 'RFQs you\'ve created',
      icon: FileText,
      isLoading: rfqLoading,
    },
    {
      title: 'Pending Quotes',
      value: quoteCount?.count || 0,
      description: 'Quotes awaiting your review',
      icon: FileCheck,
      isLoading: quoteLoading,
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
