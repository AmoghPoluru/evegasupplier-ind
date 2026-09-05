"use client";

import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Order, Product, User, Supplier } from "@/payload-types";

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

type Props = { orderId: string };

export function AdminOrderDetail({ orderId }: Props) {
  const utils = trpc.useUtils();
  const { data: order, isLoading, isError } =
    trpc.admin.orders.getById.useQuery({ id: orderId });

  const updateMutation = trpc.admin.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated");
      void utils.admin.orders.getById.invalidate({ id: orderId });
      void utils.admin.orders.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        Order not found.
      </div>
    );
  }

  const o = order as Order;
  const buyer =
    typeof o.buyer === "object" && o.buyer
      ? (o.buyer as User).email || (o.buyer as User).name
      : o.buyer;
  const supplier =
    typeof o.supplier === "object" && o.supplier
      ? (o.supplier as Supplier).companyName
      : o.supplier;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/app-admin/orders">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to orders
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Order #{o.id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Created{" "}
            {o.createdAt
              ? format(new Date(o.createdAt), "MMM d, yyyy HH:mm")
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Status</span>
          <Select
            value={o.status || "pending"}
            disabled={updateMutation.isPending}
            onValueChange={(status) =>
              updateMutation.mutate({
                id: o.id,
                status: status as (typeof ORDER_STATUSES)[number],
              })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Buyer</p>
          <p className="mt-1 text-sm text-gray-900">{buyer || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">
            Supplier
          </p>
          <p className="mt-1 text-sm text-gray-900">{supplier || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Phone</p>
          <p className="mt-1 text-sm text-gray-900">{o.phoneNumber || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">
            Total amount
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            $
            {typeof o.totalAmount === "number"
              ? o.totalAmount.toFixed(2)
              : "0.00"}
          </p>
        </div>
        {o.poNumber ? (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">PO</p>
            <p className="mt-1 text-sm text-gray-900">{o.poNumber}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Type</p>
          <Badge variant="outline" className="mt-1">
            {o.orderType || "standard"}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b p-4 font-medium text-gray-900">Line items</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(o.products ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No line items
                </TableCell>
              </TableRow>
            ) : (
              (o.products ?? []).map((line, i) => {
                const product = line.product;
                const title =
                  typeof product === "object" && product
                    ? (product as Product).title
                    : product;
                return (
                  <TableRow key={line.id ?? i}>
                    <TableCell>{title || "—"}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>${line.unitPrice?.toFixed(2) ?? "0.00"}</TableCell>
                    <TableCell>
                      ${line.totalPrice?.toFixed(2) ?? "0.00"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
