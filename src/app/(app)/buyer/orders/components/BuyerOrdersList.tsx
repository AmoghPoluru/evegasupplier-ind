'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { OrderFilters } from './OrderFilters';
import { OrderActions } from './OrderActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function BuyerOrdersList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<string>('-createdAt');

  const { data, isLoading, refetch } = trpc.buyers.orders.list.useQuery({
    page,
    limit: 20,
    status,
    search: search || undefined,
    sort: sort as any,
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
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load orders</p>
      </div>
    );
  }

  const handleFilterChange = (filters: {
    status?: string;
    search?: string;
  }) => {
    setStatus(filters.status);
    setSearch(filters.search || '');
    setPage(1);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
    }
    const statusLower = status.toLowerCase();
    if (statusLower === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
    }
    if (statusLower === 'confirmed') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Confirmed</Badge>;
    }
    if (statusLower === 'shipped') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Shipped</Badge>;
    }
    if (statusLower === 'delivered' || statusLower === 'completed') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Delivered</Badge>;
    }
    if (statusLower === 'cancelled') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Cancelled</Badge>;
    }
    if (statusLower === 'disputed') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Disputed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <OrderFilters
        onFilterChange={handleFilterChange}
        initialFilters={{ status, search }}
      />

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              Sort by:
            </span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-createdAt">Newest First</SelectItem>
                <SelectItem value="createdAt">Oldest First</SelectItem>
                <SelectItem value="-totalAmount">Highest Amount</SelectItem>
                <SelectItem value="totalAmount">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {data.total} order{data.total !== 1 ? 's' : ''} total
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <p className="text-lg font-semibold text-gray-900">No orders found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try adjusting your filters or browse products to place your first order.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.orders.map((order: any) => {
                const supplierName = typeof order.supplier === 'object' && order.supplier
                  ? (order.supplier.companyName || 'Unknown Supplier')
                  : 'Unknown Supplier';
                
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{supplierName}</TableCell>
                    <TableCell>
                      {order.createdAt
                        ? format(new Date(order.createdAt), 'MMM d, yyyy')
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      ${order.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      <OrderActions
                        orderId={order.id}
                        onSuccess={() => {
                          refetch();
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {page} of {data.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
