'use client';

import { trpc } from '@/trpc/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { VendorApprovalActions } from './VendorApprovalActions';
import { useRouter } from 'next/navigation';

export function PendingVendorsList() {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.admin.vendors.pending.useQuery({
    limit: 20,
    page: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.vendors.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-lg font-semibold text-gray-900">No pending vendors</p>
        <p className="text-sm text-gray-500 mt-2">
          All vendor registrations have been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.vendors.map((vendor: any) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  {vendor.name || vendor.companyName || 'Unnamed Vendor'}
                </TableCell>
                <TableCell>{vendor.email || 'No email'}</TableCell>
                <TableCell>{vendor.companyName || 'N/A'}</TableCell>
                <TableCell>
                  {vendor.createdAt
                    ? format(new Date(vendor.createdAt), 'MMM d, yyyy')
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <Badge variant="default">Pending</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <VendorApprovalActions
                    vendorId={vendor.id}
                    vendorName={vendor.name || vendor.companyName || 'Vendor'}
                    onSuccess={() => {
                      refetch();
                      router.refresh();
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data.totalPages > 1 && (
        <div className="text-center text-sm text-gray-500">
          Showing {data.vendors.length} of {data.total} pending vendors
        </div>
      )}
    </div>
  );
}
