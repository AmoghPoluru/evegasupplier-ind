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
import { Building2, Mail, Calendar, Package, ShoppingCart } from 'lucide-react';

interface SupplierDetailModalProps {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierDetailModal({
  supplierId,
  open,
  onOpenChange,
}: SupplierDetailModalProps) {
  const { data: supplier, isLoading } = trpc.admin.vendors.getOne.useQuery(
    { vendorId: supplierId },
    { enabled: open && !!supplierId }
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Details</DialogTitle>
          <DialogDescription>
            View complete information about this supplier
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : supplier ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Company Name</label>
                  <p className="text-sm font-medium">{supplier.companyName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Company Type</label>
                  <p className="text-sm">{supplier.companyType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="text-sm flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {typeof supplier.user === 'object' && supplier.user?.email
                      ? supplier.user.email
                      : 'No email'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {(() => {
                      const status = (supplier as any).status;
                      if (status === 'pending') {
                        return (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            Pending
                          </Badge>
                        );
                      } else if (status === 'approved') {
                        return (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Approved
                          </Badge>
                        );
                      } else if (status === 'rejected') {
                        return (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            Rejected
                          </Badge>
                        );
                      } else if (status === 'suspended') {
                        return (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                            Suspended
                          </Badge>
                        );
                      } else {
                        return <Badge variant="outline">Unknown</Badge>;
                      }
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Active</label>
                  <div className="mt-1">
                    {(supplier as any).isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                        Inactive
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
                    {supplier.createdAt
                      ? format(new Date(supplier.createdAt), 'MMM d, yyyy')
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Products</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {(supplier as any).productCount || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Orders</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {(supplier as any).orderCount || 0}
                </p>
              </div>
            </div>

            {supplier.companyWebsite && (
              <div>
                <label className="text-xs font-medium text-gray-500">Website</label>
                <p className="text-sm">
                  <a
                    href={supplier.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {supplier.companyWebsite}
                  </a>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Supplier not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
