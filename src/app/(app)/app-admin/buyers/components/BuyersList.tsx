'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { BuyerApprovalActions } from './BuyerApprovalActions';
import { BuyerActions } from './BuyerActions';

export function BuyersList() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') as 'all' | 'pending' | 'verified' | 'rejected' | null;
  const [status, setStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>(statusParam || 'all');

  useEffect(() => {
    if (statusParam) {
      setStatus(statusParam);
    }
  }, [statusParam]);

  const { data, isLoading, refetch } = trpc.admin.buyers.list.useQuery({
    limit: 20,
    page: 1,
    status,
  });

  const { data: pendingData } = trpc.admin.buyers.pending.useQuery({
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

  const buyers = data?.buyers || [];
  const pendingCount = pendingData?.total || 0;

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <TabsList>
          <TabsTrigger value="all">All Buyers ({data?.total || 0})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-4">
          {buyers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-lg font-semibold text-gray-900">
                {status === 'pending'
                  ? 'No pending buyers'
                  : status === 'verified'
                    ? 'No verified buyers'
                    : status === 'rejected'
                      ? 'No rejected buyers'
                      : 'No buyers found'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {status === 'pending'
                  ? 'All buyer verifications have been reviewed.'
                  : 'No buyers match this filter.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company Type</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((buyer: any) => (
                    <TableRow key={buyer.id}>
                      <TableCell className="font-medium">
                        {buyer.companyName || 'Unnamed Buyer'}
                      </TableCell>
                      <TableCell>
                        {typeof buyer.user === 'object' && buyer.user?.email
                          ? buyer.user.email
                          : buyer.companyEmail || 'No email'}
                      </TableCell>
                      <TableCell>
                        {buyer.companyType
                          ? buyer.companyType
                              .split('_')
                              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(' ')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {buyer.verifiedBuyer || buyer.verificationStatus === 'verified' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Verified
                          </Badge>
                        ) : buyer.verificationStatus === 'pending' ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            Pending
                          </Badge>
                        ) : buyer.verificationStatus === 'rejected' ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{buyer.orderCount || 0}</TableCell>
                      <TableCell>
                        {buyer.createdAt
                          ? format(new Date(buyer.createdAt), 'MMM d, yyyy')
                          : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {buyer.verificationStatus === 'pending' && (
                            <BuyerApprovalActions
                              buyerId={buyer.id}
                              buyerName={buyer.companyName || 'Buyer'}
                              onSuccess={() => {
                                refetch();
                              }}
                            />
                          )}
                          <BuyerActions
                            buyerId={buyer.id}
                            buyerName={buyer.companyName || 'Buyer'}
                            onSuccess={() => {
                              refetch();
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {data && data.totalPages > 1 && (
        <div className="text-center text-sm text-gray-500">
          Showing {buyers.length} of {data.total} buyers
        </div>
      )}
    </div>
  );
}
