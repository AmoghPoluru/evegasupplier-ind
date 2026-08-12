"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { Order, User, Vendor } from "@/payload-types";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "in_production",
  "quality_check",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "disputed",
] as const;

function statusBadge(status: string | null | undefined) {
  const s = status || "pending";
  const colors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-800 border-yellow-200",
    confirmed: "bg-blue-50 text-blue-800 border-blue-200",
    shipped: "bg-indigo-50 text-indigo-800 border-indigo-200",
    delivered: "bg-green-50 text-green-800 border-green-200",
    completed: "bg-green-50 text-green-800 border-green-200",
    cancelled: "bg-red-50 text-red-800 border-red-200",
    disputed: "bg-orange-50 text-orange-800 border-orange-200",
  };
  return (
    <Badge variant="outline" className={colors[s] || ""}>
      {s.replace(/_/g, " ")}
    </Badge>
  );
}

function buyerLabel(buyer: Order["buyer"]): string {
  if (!buyer) return "—";
  if (typeof buyer === "string") return buyer;
  return (buyer as User).email || (buyer as User).name || buyer.id;
}

function supplierLabel(supplier: Order["supplier"]): string {
  if (!supplier) return "—";
  if (typeof supplier === "string") return supplier;
  return (supplier as Vendor).companyName || supplier.id;
}

export function AdminOrdersList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const { data, isLoading } = trpc.admin.orders.list.useQuery({
    page,
    limit: 20,
    search: debouncedSearch.trim() || undefined,
    status,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-gray-500">Failed to load orders</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 sm:max-w-md">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <Input
            placeholder="PO number or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="w-full space-y-2 sm:w-48">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <Select
            value={status ?? "all"}
            onValueChange={(v) => setStatus(v === "all" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b p-4 text-sm text-gray-600">
          {data.totalDocs} order{data.totalDocs !== 1 ? "s" : ""} total
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12 text-center">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                data.docs.map((raw) => {
                  const order = raw as Order;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(-8)}
                      </TableCell>
                      <TableCell>{buyerLabel(order.buyer)}</TableCell>
                      <TableCell>{supplierLabel(order.supplier)}</TableCell>
                      <TableCell>{statusBadge(order.status)}</TableCell>
                      <TableCell>
                        $
                        {typeof order.totalAmount === "number"
                          ? order.totalAmount.toFixed(2)
                          : "0.00"}
                      </TableCell>
                      <TableCell>
                        {order.createdAt
                          ? format(new Date(order.createdAt), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/app-admin/orders/${order.id}`}
                            aria-label="View order"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
