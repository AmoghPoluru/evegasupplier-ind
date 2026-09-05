"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ShoppingCart,
  UserCircle,
  Package,
  DollarSign,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsCards() {
  const {
    data: stats,
    isLoading,
    error,
  } = trpc.admin.dashboard.stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600">Error loading statistics</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Suppliers",
      value: stats.vendors.total,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/app-admin/suppliers",
    },
    {
      title: "Buyers",
      value: stats.buyers.total,
      sub: `${stats.buyers.pending} pending verification`,
      icon: UserCircle,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      link: "/app-admin/buyers",
    },
    {
      title: "Products",
      value: stats.products.total,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      link: "/app-admin/products",
    },
    {
      title: "Orders",
      value: stats.orders.total,
      sub: `${stats.orders.open} open`,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/app-admin/orders",
    },
    {
      title: "Revenue (30d)",
      value: `$${stats.revenue.last30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Revenue (all time)",
      value: `$${stats.revenue.allTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const CardWrapper = stat.link ? "a" : "div";

        return (
          <CardWrapper
            key={stat.title}
            href={stat.link}
            className={
              stat.link ? "block hover:shadow-md transition-shadow" : "block"
            }
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                {'sub' in stat && stat.sub ? (
                  <p className="mt-1 text-xs text-gray-500">{stat.sub}</p>
                ) : null}
              </CardContent>
            </Card>
          </CardWrapper>
        );
      })}
    </div>
  );
}
