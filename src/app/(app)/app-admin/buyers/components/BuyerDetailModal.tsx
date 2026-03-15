'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Building2, Mail, Calendar, ShoppingCart, CheckCircle2 } from 'lucide-react';

interface BuyerDetailModalProps {
  buyerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyerDetailModal({
  buyerId,
  open,
  onOpenChange,
}: BuyerDetailModalProps) {
  const { data: buyer, isLoading } = trpc.admin.buyers.getOne.useQuery(
    { buyerId },
    { enabled: open && !!buyerId }
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buyer Details</DialogTitle>
          <DialogDescription>
            View complete information about this buyer
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : buyer ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Company Name</label>
                  <p className="text-sm font-medium">{buyer.companyName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Company Type</label>
                  <p className="text-sm">{buyer.companyType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="text-sm flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {typeof buyer.user === 'object' && buyer.user?.email
                      ? buyer.user.email
                      : buyer.companyEmail || 'No email'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Verified</label>
                  <div className="mt-1">
                    {buyer.verifiedBuyer || buyer.verificationStatus === 'verified' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Registered
                  </label>
                  <p className="text-sm">
                    {buyer.createdAt
                      ? format(new Date(buyer.createdAt), 'MMM d, yyyy')
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Orders</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {buyer.orderCount || 0}
              </p>
            </div>

            {buyer.companyWebsite && (
              <div>
                <label className="text-xs font-medium text-gray-500">Website</label>
                <p className="text-sm">
                  <a
                    href={buyer.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {buyer.companyWebsite}
                  </a>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Buyer not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
