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
import { BuyerFilters } from './BuyerFilters';
import { BuyerActions } from './BuyerActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function SupplierBuyersList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<string>('-lastOrderDate');

  const { data, isLoading, refetch } = trpc.vendors.buyers.list.useQuery({
    page,
    limit: 20,
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
        <p className="text-gray-500">Failed to load buyers</p>
      </div>
    );
  }

  const handleFilterChange = (filters: {
    search?: string;
  }) => {
    setSearch(filters.search || '');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <BuyerFilters
        onFilterChange={handleFilterChange}
        initialFilters={{ search }}
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
                <SelectItem value="-lastOrderDate">Most Recent Order</SelectItem>
                <SelectItem value="lastOrderDate">Oldest Order</SelectItem>
                <SelectItem value="-totalSpent">Highest Spender</SelectItem>
                <SelectItem value="totalSpent">Lowest Spender</SelectItem>
                <SelectItem value="companyName">Company Name (A-Z)</SelectItem>
                <SelectItem value="-companyName">Company Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {data.total} buyer{data.total !== 1 ? 's' : ''} total
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.buyers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <p className="text-lg font-semibold text-gray-900">No buyers found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Buyers will appear here once they place orders with you.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.buyers.map((item: any) => {
                const buyer = item.buyer;
                const email = typeof buyer.user === 'object' && buyer.user?.email
                  ? buyer.user.email
                  : buyer.companyEmail || 'No email';
                
                return (
                  <TableRow key={buyer.id}>
                    <TableCell className="font-medium">
                      {buyer.companyName || 'Unnamed Buyer'}
                    </TableCell>
                    <TableCell>{email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.orderCount}</Badge>
                    </TableCell>
                    <TableCell>
                      ${item.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {item.lastOrderDate
                        ? format(new Date(item.lastOrderDate), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <BuyerActions
                        buyerId={buyer.id}
                        buyerName={buyer.companyName || 'Buyer'}
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
            Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total} buyers
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
