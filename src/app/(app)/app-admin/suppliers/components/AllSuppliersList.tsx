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
import { SupplierActions } from './SupplierActions';
import { SupplierFilters } from './SupplierFilters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AllSuppliersList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [companyType, setCompanyType] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<string>('-createdAt');
  
  // Internal filter state (using "all" instead of empty strings)
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIsActive, setFilterIsActive] = useState<string>('all');
  const [filterCompanyType, setFilterCompanyType] = useState<string>('all');

  const { data, isLoading, refetch } = trpc.admin.vendors.list.useQuery({
    page,
    limit: 20,
    status: status as any,
    isActive,
    companyType,
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
        <p className="text-gray-500">Failed to load suppliers</p>
      </div>
    );
  }

  const handleFilterChange = (filters: {
    status?: string;
    isActive?: boolean;
    companyType?: string;
    search?: string;
  }) => {
    setStatus(filters.status);
    setIsActive(filters.isActive);
    setCompanyType(filters.companyType);
    setSearch(filters.search || '');
    setPage(1); // Reset to first page when filters change
    
    // Update internal filter state for display
    setFilterStatus(filters.status || 'all');
    setFilterIsActive(filters.isActive !== undefined ? String(filters.isActive) : 'all');
    setFilterCompanyType(filters.companyType || 'all');
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status || status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
    }
    if (status === 'suspended') {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Suspended</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-4">
      <SupplierFilters
        onFilterChange={handleFilterChange}
        initialFilters={{ 
          status: filterStatus !== 'all' ? filterStatus : undefined, 
          isActive: filterIsActive !== 'all' ? filterIsActive === 'true' : undefined, 
          companyType: filterCompanyType !== 'all' ? filterCompanyType : undefined, 
          search 
        }}
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
                <SelectItem value="companyName">Company Name (A-Z)</SelectItem>
                <SelectItem value="-companyName">Company Name (Z-A)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {data.total} supplier{data.total !== 1 ? 's' : ''} total
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <p className="text-lg font-semibold text-gray-900">No suppliers found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try adjusting your filters to see more results.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.vendors.map((vendor: any) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    {vendor.companyName || 'Unnamed Supplier'}
                  </TableCell>
                  <TableCell>
                    {typeof vendor.user === 'object' && vendor.user?.email
                      ? vendor.user.email
                      : 'No email'}
                  </TableCell>
                  <TableCell>{vendor.companyType || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell>
                    {vendor.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{vendor.productCount || 0}</TableCell>
                  <TableCell>{vendor.orderCount || 0}</TableCell>
                  <TableCell>
                    {vendor.createdAt
                      ? format(new Date(vendor.createdAt), 'MMM d, yyyy')
                      : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <SupplierActions
                      supplierId={vendor.id}
                      supplierName={vendor.companyName || 'Supplier'}
                      onSuccess={() => {
                        refetch();
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total} suppliers
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
